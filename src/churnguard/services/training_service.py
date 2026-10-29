"""
Company Model Training & Registry Service.

Orchestrates tenant-isolated model training, multi-algorithm benchmarking,
probability calibration, cost-sensitive threshold search, evaluation curves,
and model activation.
"""

import os
import uuid
import json
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
    brier_score_loss,
    log_loss,
    confusion_matrix,
    roc_curve,
    precision_recall_curve
)
from sqlalchemy.orm import Session

from churnguard.config import ARTIFACTS_DIR
from churnguard.database.db import SessionLocal
from churnguard.database.models import CompanyDataset, CompanyTrainingJob, CompanyModel

logger = logging.getLogger(__name__)

MODELS_STORAGE_DIR = Path("/tmp/artifacts/company_models") if os.getenv("VERCEL") else (ARTIFACTS_DIR / "company_models")
try:
    MODELS_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass

# Active runtime model predictor cache by company_id
ACTIVE_COMPANY_PREDICTORS: Dict[int, Any] = {}


def _safe_predict_proba_binary(model: Any, X_trans: Any) -> np.ndarray:
    """
    Safely extract positive class posterior probabilities [0.0, 1.0].
    Guarantees a 1D float array of shape (N,) and gracefully handles
    any degenerate case (single class fitted, 1-column array, etc.)
    without raising IndexError.
    """
    try:
        probs = model.predict_proba(X_trans)
        if hasattr(probs, "ndim") and probs.ndim == 2:
            if probs.shape[1] >= 2:
                return probs[:, 1].astype(float)
            elif probs.shape[1] == 1:
                classes = getattr(model, "classes_", [0])
                cls = classes[0] if len(classes) > 0 else 0
                return np.ones(len(X_trans), dtype=float) if cls == 1 else np.zeros(len(X_trans), dtype=float)
        elif hasattr(probs, "ndim") and probs.ndim == 1:
            return probs.astype(float)
    except Exception:
        pass

    if hasattr(model, "decision_function"):
        try:
            df = model.decision_function(X_trans)
            return 1.0 / (1.0 + np.exp(-df))
        except Exception:
            pass

    try:
        preds = model.predict(X_trans)
        return preds.astype(float)
    except Exception:
        return np.zeros(len(X_trans), dtype=float)


def start_company_training_job(
    company_id: int,
    dataset_id: int,
    target_column: str,
    positive_class: str = "1",
    algorithm_preference: Optional[str] = None,
    db: Session = None
) -> str:
    """
    Validate dataset and launch an asynchronous model training job.
    """
    dataset = db.query(CompanyDataset).filter(
        CompanyDataset.id == dataset_id,
        CompanyDataset.company_id == company_id
    ).first()

    if not dataset:
        raise ValueError("Dataset not found or access denied.")

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise ValueError("Dataset file missing from storage.")

    # Validate target column & positive class upfront before queueing
    df_head = pd.read_csv(file_path, nrows=50)
    if target_column not in df_head.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset. Available columns: {list(df_head.columns)}")

    df_target = pd.read_csv(file_path, usecols=[target_column])
    unique_vals = [str(x).strip() for x in df_target[target_column].dropna().unique()]

    if len(unique_vals) < 2:
        raise ValueError(
            f"Target column '{target_column}' contains only {len(unique_vals)} unique value ({unique_vals}). "
            "Supervised binary churn classification requires at least two distinct classes."
        )

    pos_str = str(positive_class).strip()
    matched_pos = None
    for val in unique_vals:
        if val.lower() == pos_str.lower():
            matched_pos = val
            break

    if not matched_pos:
        raise ValueError(
            f"Selected positive churn class '{positive_class}' does not exist in target column '{target_column}'. "
            f"Available classes in this dataset are: {unique_vals}. Please select one of these values as the positive class."
        )

    positive_class = matched_pos

    # Check class sample counts
    y_check = (df_target[target_column].astype(str).str.strip() == positive_class).astype(int)
    pos_count = int(y_check.sum())
    neg_count = len(y_check) - pos_count

    if pos_count == 0 or neg_count == 0:
        raise ValueError(
            f"Target mapping resulted in 0 examples for one class (Positive '{positive_class}': {pos_count}, Other: {neg_count}). "
            f"Available classes are: {unique_vals}."
        )

    if pos_count < 2 or neg_count < 2:
        raise ValueError(
            f"Insufficient samples for training: found only {pos_count} positive and {neg_count} negative examples. "
            "At least 2 examples of each class are required for model training and evaluation."
        )

    job_id = uuid.uuid4().hex
    training_job = CompanyTrainingJob(
        id=job_id,
        company_id=company_id,
        dataset_id=dataset_id,
        status="QUEUED",
        progress=0,
        stage="Job queued",
        target_column=target_column,
        positive_class=positive_class,
        algorithms_evaluated=[],
        best_algorithm=None,
        metrics_json=None,
        error_message=None
    )
    db.add(training_job)
    db.commit()

    # Launch background thread
    worker_thread = threading.Thread(
        target=_run_training_job_worker,
        args=(job_id, company_id, dataset_id, target_column, positive_class, algorithm_preference),
        daemon=True
    )
    worker_thread.start()

    return job_id


def _run_training_job_worker(
    job_id: str,
    company_id: int,
    dataset_id: int,
    target_column: str,
    positive_class: str,
    algorithm_preference: Optional[str]
):
    """
    Background worker executing the complete ML training, benchmarking, calibration,
    and evaluation workflow.
    """
    db = SessionLocal()
    try:
        job = db.query(CompanyTrainingJob).filter(CompanyTrainingJob.id == job_id).first()
        dataset = db.query(CompanyDataset).filter(CompanyDataset.id == dataset_id).first()
        if not job or not dataset:
            return

        # 1. Update job to running
        job.status = "RUNNING"
        job.progress = 10
        job.stage = "Loading and validating dataset"
        db.commit()

        file_path = Path(dataset.file_path)
        if not file_path.exists():
            raise FileNotFoundError("Dataset file missing from storage.")

        df = pd.read_csv(file_path)
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found.")

        # 2. Preprocess Target & Drop Leakage/ID Columns
        job.progress = 20
        job.stage = "Data cleaning and leakage-free splitting"
        db.commit()

        # Map binary target safely
        y_raw = df[target_column].astype(str).str.strip()
        matched_pos = str(positive_class).strip()
        unique_raw = [str(v).strip() for v in df[target_column].dropna().unique()]
        for v in unique_raw:
            if v.lower() == matched_pos.lower():
                matched_pos = v
                break

        y = (y_raw == matched_pos).astype(int)
        pos_count = int(y.sum())
        neg_count = len(y) - pos_count

        if pos_count == 0 or neg_count == 0:
            raise ValueError(
                f"Binary target mapping resulted in 0 examples for one class (Positive '{matched_pos}': {pos_count}, Other: {neg_count}). "
                f"Available classes in this dataset: {unique_raw}."
            )

        # Drop Target, IDs, and empty columns
        drop_cols = [target_column]
        if dataset.id_column and dataset.id_column in df.columns:
            drop_cols.append(dataset.id_column)

        # Identify other ID-like columns (all unique strings)
        for col in df.columns:
            if col not in drop_cols and df[col].nunique() == len(df) and not pd.api.types.is_numeric_dtype(df[col]):
                drop_cols.append(col)

        X = df.drop(columns=drop_cols)

        # Separate numeric and categorical
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()

        # 3. Safe Train / Val / Test Split (60% Train, 20% Val, 20% Test)
        min_class_count = min(pos_count, neg_count)
        use_stratify = min_class_count >= 5

        try:
            X_train, X_temp, y_train, y_temp = train_test_split(
                X, y, test_size=0.40, random_state=42, stratify=y if use_stratify else None
            )
            temp_pos = int(y_temp.sum())
            temp_neg = len(y_temp) - temp_pos
            use_temp_strat = use_stratify and min(temp_pos, temp_neg) >= 2
            X_val, X_test, y_val, y_test = train_test_split(
                X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp if use_temp_strat else None
            )
        except Exception:
            X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.40, random_state=42)
            X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42)

        # 4. Construct Fitted Preprocessor on Train fold
        job.progress = 35
        job.stage = "Fitting preprocessing pipeline on training fold"
        db.commit()

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", Pipeline([
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler())
                ]), numeric_cols),
                ("cat", Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
                ]), categorical_cols)
            ]
        )

        X_train_trans = preprocessor.fit_transform(X_train)
        X_val_trans = preprocessor.transform(X_val)
        X_test_trans = preprocessor.transform(X_test)

        feature_names = preprocessor.get_feature_names_out().tolist()

        # 5. Multi-Model Benchmark on Validation Fold
        job.progress = 50
        job.stage = "Benchmarking candidate algorithms"
        db.commit()

        candidate_models = {
            "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
            "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=10, min_samples_leaf=4, class_weight="balanced_subsample", random_state=42),
            "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
        }

        # Baseline model
        dummy = DummyClassifier(strategy="prior")
        dummy.fit(X_train_trans, y_train)
        dummy_probs = _safe_predict_proba_binary(dummy, X_val_trans)

        val_has_both_classes = len(np.unique(y_val)) >= 2
        dummy_pr_auc = round(float(average_precision_score(y_val, dummy_probs)), 3) if val_has_both_classes else 0.50

        benchmark_results = [{
            "algorithm": "Baseline (Prior)",
            "val_roc_auc": 0.500,
            "val_pr_auc": dummy_pr_auc,
            "val_f1": 0.0
        }]

        best_algo_name = "Random Forest"
        best_algo_score = -1.0
        best_raw_model = None

        for name, model in candidate_models.items():
            model.fit(X_train_trans, y_train)
            probs = _safe_predict_proba_binary(model, X_val_trans)
            if val_has_both_classes:
                try:
                    auc = float(roc_auc_score(y_val, probs))
                except Exception:
                    auc = 0.50
                try:
                    pr_auc = float(average_precision_score(y_val, probs))
                except Exception:
                    pr_auc = float(np.mean(y_val))
                f1 = float(f1_score(y_val, (probs >= 0.5).astype(int), zero_division=0))
            else:
                auc = 0.50
                pr_auc = 0.50
                f1 = 0.0

            benchmark_results.append({
                "algorithm": name,
                "val_roc_auc": round(auc, 4),
                "val_pr_auc": round(pr_auc, 4),
                "val_f1": round(f1, 4)
            })

            # Check algorithm preference or select highest ROC-AUC
            score = (auc + pr_auc) / 2.0
            if (algorithm_preference and algorithm_preference.lower() in name.lower()) or score > best_algo_score:
                best_algo_score = score
                best_algo_name = name
                best_raw_model = model

        # 6. Calibrate Probabilities using Platt Scaling (Sigmoid) on Validation Fold
        job.progress = 70
        job.stage = f"Calibrating probabilities for {best_algo_name}"
        db.commit()

        if val_has_both_classes:
            try:
                calibrated_model = CalibratedClassifierCV(
                    estimator=best_raw_model,
                    cv="prefit",
                    method="sigmoid"
                )
                calibrated_model.fit(X_val_trans, y_val)
            except Exception as e:
                logger.warning(f"CalibratedClassifierCV fallback: {e}")
                calibrated_model = best_raw_model
        else:
            calibrated_model = best_raw_model

        # 7. Cost-Sensitive Threshold Optimization on Validation Fold
        job.progress = 80
        job.stage = "Optimizing decision threshold against business costs"
        db.commit()

        val_cal_probs = _safe_predict_proba_binary(calibrated_model, X_val_trans)
        cost_fp = 500.0
        cost_fn = 5000.0

        threshold_evals = []
        best_threshold = 0.50
        min_cost = float("inf")

        for th in np.arange(0.05, 0.96, 0.05):
            th_round = round(float(th), 2)
            preds_th = (val_cal_probs >= th_round).astype(int)
            tn, fp, fn, tp = confusion_matrix(y_val, preds_th, labels=[0, 1]).ravel()
            cost = (fp * cost_fp) + (fn * cost_fn)
            threshold_evals.append({
                "threshold": th_round,
                "cost": float(cost),
                "recall": round(float(tp / max(tp + fn, 1)) * 100, 1),
                "precision": round(float(tp / max(tp + fp, 1)) * 100, 1)
            })
            if cost < min_cost:
                min_cost = cost
                best_threshold = th_round

        # 8. Honest Final Evaluation on Untouched Held-Out Test Set
        job.progress = 90
        job.stage = "Evaluating performance on held-out test data"
        db.commit()

        test_probs = _safe_predict_proba_binary(calibrated_model, X_test_trans)
        test_preds = (test_probs >= best_threshold).astype(int)
        test_preds_default = (test_probs >= 0.50).astype(int)

        tn, fp, fn, tp = confusion_matrix(y_test, test_preds, labels=[0, 1]).ravel()
        cost_optimized = float((fp * cost_fp) + (fn * cost_fn))

        tn_def, fp_def, fn_def, tp_def = confusion_matrix(y_test, test_preds_default, labels=[0, 1]).ravel()
        cost_default = float((fp_def * cost_fp) + (fn_def * cost_fn))

        test_has_both_classes = len(np.unique(y_test)) >= 2
        test_roc_auc = float(roc_auc_score(y_test, test_probs)) if test_has_both_classes else 0.50
        test_pr_auc = float(average_precision_score(y_test, test_probs)) if test_has_both_classes else float(np.mean(y_test))
        test_f1 = float(f1_score(y_test, test_preds, zero_division=0))
        test_precision = float(precision_score(y_test, test_preds, zero_division=0))
        test_recall = float(recall_score(y_test, test_preds, zero_division=0))
        test_accuracy = float(accuracy_score(y_test, test_preds))
        test_brier = float(brier_score_loss(y_test, test_probs))
        try:
            test_logloss = float(log_loss(y_test, test_probs))
        except Exception:
            test_logloss = 0.50

        # Generate Curve Points for Recharts Visualizations
        fpr_arr, tpr_arr, _ = roc_curve(y_test, test_probs)
        roc_points = [
            {"fpr": round(float(f), 3), "tpr": round(float(t), 3)}
            for f, t in zip(fpr_arr[::max(1, len(fpr_arr) // 25)], tpr_arr[::max(1, len(tpr_arr) // 25)])
        ]
        if not any(p["fpr"] == 1.0 for p in roc_points):
            roc_points.append({"fpr": 1.0, "tpr": 1.0})

        prec_arr, rec_arr, _ = precision_recall_curve(y_test, test_probs)
        pr_points = [
            {"recall": round(float(r), 3), "precision": round(float(p), 3)}
            for r, p in zip(rec_arr[::max(1, len(rec_arr) // 25)], prec_arr[::max(1, len(prec_arr) // 25)])
        ]

        prob_true, prob_pred = calibration_curve(y_test, test_probs, n_bins=5)
        cal_points = [
            {"predicted": round(float(p), 3), "actual": round(float(a), 3)}
            for p, a in zip(prob_pred, prob_true)
        ]

        # Feature Importances (Tree-based or coefficients)
        importances = []
        if hasattr(best_raw_model, "feature_importances_"):
            raw_imp = best_raw_model.feature_importances_
            top_indices = np.argsort(raw_imp)[::-1][:15]
            for idx in top_indices:
                importances.append({
                    "feature": feature_names[idx].replace("num__", "").replace("cat__", ""),
                    "importance": round(float(raw_imp[idx]), 4)
                })
        elif hasattr(best_raw_model, "coef_"):
            raw_imp = np.abs(best_raw_model.coef_[0])
            top_indices = np.argsort(raw_imp)[::-1][:15]
            for idx in top_indices:
                importances.append({
                    "feature": feature_names[idx].replace("num__", "").replace("cat__", ""),
                    "importance": round(float(raw_imp[idx]), 4)
                })

        metrics_summary = {
            "roc_auc": round(test_roc_auc, 4),
            "pr_auc": round(test_pr_auc, 4),
            "f1": round(test_f1, 4),
            "precision": round(test_precision, 4),
            "recall": round(test_recall, 4),
            "accuracy": round(test_accuracy, 4),
            "brier_score": round(test_brier, 4),
            "log_loss": round(test_logloss, 4),
            "threshold": best_threshold,
            "cost_at_threshold": cost_optimized,
            "cost_at_default": cost_default,
            "cost_savings": round(cost_default - cost_optimized, 2),
            "cost_reduction_pct": round(((cost_default - cost_optimized) / max(cost_default, 1)) * 100, 1),
            "confusion_matrix": {
                "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn)
            }
        }

        charts_data = {
            "roc_curve": roc_points,
            "pr_curve": pr_points,
            "calibration_curve": cal_points,
            "threshold_curve": threshold_evals,
            "feature_importance": importances,
            "feature_importances": importances,
            "benchmark_comparison": benchmark_results,
            "confusion_matrix": {
                "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn),
                "threshold": best_threshold
            }
        }

        # 9. Save Artifacts in Company Model Registry
        job.progress = 95
        job.stage = "Registering production model"
        db.commit()

        version_str = f"v{datetime.utcnow().strftime('%Y%m%d%H%M')}"
        model_name = f"{dataset.name.replace('.csv', '')} {best_algo_name}"

        company_model_dir = MODELS_STORAGE_DIR / str(company_id) / version_str
        company_model_dir.mkdir(parents=True, exist_ok=True)

        # Build full prediction pipeline
        full_pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", calibrated_model)
        ])

        artifact_file = company_model_dir / "model_pipeline.joblib"
        joblib.dump(full_pipeline, artifact_file)

        metadata_file = company_model_dir / "metadata.json"
        with open(metadata_file, "w") as f:
            json.dump({
                "job_id": job_id,
                "company_id": company_id,
                "dataset_id": dataset_id,
                "version": version_str,
                "algorithm": best_algo_name,
                "threshold": best_threshold,
                "metrics": metrics_summary,
                "feature_names": feature_names,
                "numeric_cols": numeric_cols,
                "categorical_cols": categorical_cols,
                "target_column": target_column,
                "positive_class": positive_class
            }, f, indent=2)

        # Check if company already has an active model; if not, activate this one
        has_active = db.query(CompanyModel).filter(
            CompanyModel.company_id == company_id,
            CompanyModel.is_active == True
        ).first()

        model_record = CompanyModel(
            company_id=company_id,
            dataset_id=dataset_id,
            job_id=job_id,
            training_job_id=job_id,
            name=model_name,
            version=version_str,
            algorithm=best_algo_name,
            artifact_path=str(artifact_file),
            threshold=best_threshold,
            is_active=(has_active is None),
            feature_schema={"numeric": numeric_cols, "categorical": categorical_cols, "features": feature_names},
            metrics_summary=metrics_summary,
            evaluation_charts_json=charts_data
        )
        db.add(model_record)
        db.flush()

        # Update training job completion
        job.model_id = model_record.id
        job.best_algorithm = best_algo_name
        job.algorithms_evaluated = benchmark_results
        job.metrics_json = metrics_summary
        job.status = "COMPLETED"
        job.progress = 100
        job.stage = "Model trained, calibrated, and registered successfully"
        job.completed_at = datetime.utcnow()

        db.commit()
        logger.info(f"Training job {job_id} completed successfully for company {company_id}.")

    except Exception as e:
        logger.error(f"Training job {job_id} failed: {e}", exc_info=True)
        db.rollback()
        try:
            job = db.query(CompanyTrainingJob).filter(CompanyTrainingJob.id == job_id).first()
            if job:
                job.status = "FAILED"
                job.stage = "Training failed"
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def activate_company_model(company_id: int, model_id: int, db: Session) -> CompanyModel:
    """
    Safely activate a validated company model for production predictions.
    """
    model = db.query(CompanyModel).filter(
        CompanyModel.id == model_id,
        CompanyModel.company_id == company_id
    ).first()

    if not model:
        raise ValueError("Model not found or access denied.")

    if not Path(model.artifact_path).exists():
        raise FileNotFoundError("Model artifact missing from storage. Cannot activate.")

    # Deactivate all other models for this tenant
    db.query(CompanyModel).filter(
        CompanyModel.company_id == company_id
    ).update({"is_active": False})

    model.is_active = True
    db.commit()
    db.refresh(model)

    # Invalidate runtime cache
    if company_id in ACTIVE_COMPANY_PREDICTORS:
        del ACTIVE_COMPANY_PREDICTORS[company_id]

    logger.info(f"Activated model {model.id} ({model.version}) for company {company_id}.")
    return model


def get_active_company_predictor(company_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """
    Retrieve active company-specific model pipeline and metadata for inference.
    """
    if company_id in ACTIVE_COMPANY_PREDICTORS:
        return ACTIVE_COMPANY_PREDICTORS[company_id]

    active_model = db.query(CompanyModel).filter(
        CompanyModel.company_id == company_id,
        CompanyModel.is_active == True
    ).first()

    if not active_model:
        return None

    path = Path(active_model.artifact_path)
    if not path.exists():
        logger.warning(f"Active model artifact {path} missing.")
        return None

    try:
        pipeline = joblib.load(path)
        predictor_bundle = {
            "model_id": active_model.id,
            "version": active_model.version,
            "algorithm": active_model.algorithm,
            "pipeline": pipeline,
            "threshold": float(active_model.threshold or 0.50),
            "schema": active_model.feature_schema or {}
        }
        ACTIVE_COMPANY_PREDICTORS[company_id] = predictor_bundle
        return predictor_bundle
    except Exception as e:
        logger.error(f"Failed to load active company model: {e}")
        return None
