"""
train.py

Train the ChurnGuard Random Forest model with leakage-safe splits,
probability calibration, validation-based cost threshold optimization,
and test-set evaluation.
"""

import json
import joblib
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Any

from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    log_loss,
    confusion_matrix,
    classification_report
)

from churnguard.data.load import load_data
from churnguard.data.clean import clean_data
from churnguard.data.split import split_data_train_val_test
from churnguard.features.build_features import create_features
from churnguard.preprocessing.pipeline import build_pipeline
from churnguard.models.cost_matrix import calculate_cost
from churnguard.models.threshold_optimizer import optimize_threshold
from churnguard.models.mlflow_logger import MLflowLogger

from churnguard.config import (
    MODEL_DIR,
    ENCODER_DIR,
    SCHEMA_DIR,
    THRESHOLD_DIR,
    RANDOM_STATE,
    N_ESTIMATORS,
    MAX_DEPTH,
    MLFLOW_TRACKING_URI,
    MLFLOW_EXPERIMENT
)

logger = logging.getLogger(__name__)


def train_model() -> Tuple[RandomForestClassifier, pd.DataFrame, pd.Series, np.ndarray, np.ndarray, Dict[str, float], float, float]:
    """
    Complete Leakage-Free Training Pipeline:
    1. Load & clean data.
    2. Split into stratified 60% Train, 20% Validation, 20% Test before feature learning.
    3. Calculate and persist training population statistics (median MonthlyCharges).
    4. Fit preprocessing pipeline strictly on X_train.
    5. Train RandomForest with class-weight balancing.
    6. Calibrate probabilities using the Validation set.
    7. Optimize decision threshold using Validation predictions and cost matrix.
    8. Evaluate final calibrated model on untouched Test set at the chosen threshold.
    9. Persist model artifacts, feature schema, best threshold, and full metadata.
    """

    logger.info("=" * 60)
    logger.info("STEP 1 : Loading Dataset")
    logger.info("=" * 60)
    df = load_data()

    logger.info("=" * 60)
    logger.info("STEP 2 : Cleaning Dataset")
    logger.info("=" * 60)
    df = clean_data(df, is_training=True)

    logger.info("=" * 60)
    logger.info("STEP 3 : Stratified Train / Val / Test Split (60 / 20 / 20)")
    logger.info("=" * 60)
    X_train, X_val, X_test, y_train, y_val, y_test = split_data_train_val_test(df)

    logger.info("=" * 60)
    logger.info("STEP 4 : Computing & Persisting Training Statistics (No Train/Serve Skew)")
    logger.info("=" * 60)
    train_median_charges = float(X_train["MonthlyCharges"].median())
    training_stats = {
        "median_monthly_charges": train_median_charges,
        "train_samples": int(len(X_train)),
        "val_samples": int(len(X_val)),
        "test_samples": int(len(X_test)),
        "train_churn_rate": float(y_train.mean()),
        "computed_at": datetime.utcnow().isoformat()
    }
    stats_file = SCHEMA_DIR / "training_stats.json"
    with open(stats_file, "w") as f:
        json.dump(training_stats, f, indent=4)
    logger.info(f"Saved training stats to {stats_file} (Median MonthlyCharges = {train_median_charges})")

    logger.info("=" * 60)
    logger.info("STEP 5 : Feature Engineering on Splits")
    logger.info("=" * 60)
    X_train_feat = create_features(X_train, median_monthly_charges=train_median_charges)
    X_val_feat = create_features(X_val, median_monthly_charges=train_median_charges)
    X_test_feat = create_features(X_test, median_monthly_charges=train_median_charges)

    logger.info("=" * 60)
    logger.info("STEP 6 : Fitting Preprocessing Pipeline on Training Data Only")
    logger.info("=" * 60)
    pipeline = build_pipeline(X_train_feat)
    X_train_encoded = pipeline.transform(X_train_feat)
    X_val_encoded = pipeline.transform(X_val_feat)
    X_test_encoded = pipeline.transform(X_test_feat)

    logger.info("=" * 60)
    logger.info("STEP 7 : Saving Feature Schema")
    logger.info("=" * 60)
    feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out().tolist()
    schema_file = SCHEMA_DIR / "feature_schema.json"
    with open(schema_file, "w") as f:
        json.dump(feature_names, f, indent=4)
    logger.info(f"Saved {len(feature_names)} features to {schema_file}")

    logger.info("=" * 60)
    logger.info("STEP 8 : Training Random Forest Estimator")
    logger.info("=" * 60)
    max_depth_val = 12 if MAX_DEPTH is None else MAX_DEPTH
    base_model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=max_depth_val,
        min_samples_leaf=4,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    base_model.fit(X_train_encoded, y_train)
    logger.info("Base Random Forest Training Completed")

    logger.info("=" * 60)
    logger.info("STEP 9 : Probability Calibration (Sigmoid on Validation Split)")
    logger.info("=" * 60)
    calibrated_model = CalibratedClassifierCV(
        estimator=base_model,
        method="sigmoid",
        cv="prefit"
    )
    calibrated_model.fit(X_val_encoded, y_val)
    logger.info("Probability Calibration Completed")

    # Persist base model (for SHAP TreeExplainer) and calibrated model (for predictions)
    joblib.dump(base_model, MODEL_DIR / "random_forest.joblib")
    joblib.dump(calibrated_model, MODEL_DIR / "calibrated_model.joblib")
    logger.info(f"Saved models to {MODEL_DIR}")

    logger.info("=" * 60)
    logger.info("STEP 10 : Threshold Optimization on Validation Set (No Leakage)")
    logger.info("=" * 60)
    val_probabilities = calibrated_model.predict_proba(X_val_encoded)[:, 1]
    best_threshold, best_val_cost, threshold_table = optimize_threshold(y_val, val_probabilities)

    logger.info(f"Best Threshold (Validation) : {best_threshold:.2f}")
    logger.info(f"Minimum Cost (Validation)   : ₹{best_val_cost:,}")

    threshold_table.to_csv(THRESHOLD_DIR / "threshold_results.csv", index=False)
    threshold_file = THRESHOLD_DIR / "best_threshold.json"
    with open(threshold_file, "w") as f:
        json.dump(
            {
                "best_threshold": float(best_threshold),
                "minimum_cost": int(best_val_cost),
                "optimization_split": "validation",
                "calibration_method": "sigmoid"
            },
            f,
            indent=4
        )
    logger.info(f"Saved threshold metadata to {threshold_file}")

    logger.info("=" * 60)
    logger.info("STEP 11 : Final Evaluation on Held-Out Test Set")
    logger.info("=" * 60)
    test_probabilities = calibrated_model.predict_proba(X_test_encoded)[:, 1]
    test_predictions_opt = (test_probabilities >= best_threshold).astype(int)
    test_predictions_def = (test_probabilities >= 0.50).astype(int)

    test_accuracy = accuracy_score(y_test, test_predictions_opt)
    test_precision = precision_score(y_test, test_predictions_opt, zero_division=0)
    test_recall = recall_score(y_test, test_predictions_opt)
    test_f1 = f1_score(y_test, test_predictions_opt)
    test_roc_auc = roc_auc_score(y_test, test_probabilities)
    test_pr_auc = average_precision_score(y_test, test_probabilities)
    test_brier = brier_score_loss(y_test, test_probabilities)
    test_logloss = log_loss(y_test, test_probabilities)

    test_cost_opt = calculate_cost(y_test, test_predictions_opt)
    test_cost_def = calculate_cost(y_test, test_predictions_def)
    business_savings = test_cost_def["Total Cost"] - test_cost_opt["Total Cost"]

    logger.info(f"Test Set Metrics (Evaluated with Frozen Threshold {best_threshold:.2f}):")
    logger.info(f"  ROC-AUC       : {test_roc_auc:.4f}")
    logger.info(f"  PR-AUC        : {test_pr_auc:.4f}")
    logger.info(f"  Brier Score   : {test_brier:.4f}")
    logger.info(f"  Log Loss      : {test_logloss:.4f}")
    logger.info(f"  Accuracy      : {test_accuracy:.4f}")
    logger.info(f"  Precision     : {test_precision:.4f}")
    logger.info(f"  Recall        : {test_recall:.4f}")
    logger.info(f"  F1 Score      : {test_f1:.4f}")
    logger.info(f"  Cost @ 0.50   : ₹{test_cost_def['Total Cost']:,}")
    logger.info(f"  Cost @ {best_threshold:.2f} : ₹{test_cost_opt['Total Cost']:,}")
    logger.info(f"  Savings       : ₹{business_savings:,} ({(business_savings / test_cost_def['Total Cost'] * 100):.1f}%)")

    cm = confusion_matrix(y_test, test_predictions_opt)
    logger.info(f"Confusion Matrix (Test Set @ {best_threshold:.2f}):\n{cm}")
    report = classification_report(y_test, test_predictions_opt)
    logger.info(f"Classification Report (Test Set):\n{report}")

    metrics = {
        "accuracy": float(test_accuracy),
        "precision": float(test_precision),
        "recall": float(test_recall),
        "f1_score": float(test_f1),
        "roc_auc": float(test_roc_auc),
        "pr_auc": float(test_pr_auc),
        "brier_score": float(test_brier),
        "log_loss": float(test_logloss),
        "cost_at_threshold": int(test_cost_opt["Total Cost"]),
        "cost_at_default": int(test_cost_def["Total Cost"]),
        "business_savings": int(business_savings)
    }

    # Save comprehensive model metadata
    model_metadata = {
        "model_version": "v2.0.0",
        "algorithm": "RandomForestClassifier+SigmoidCalibration",
        "trained_at": datetime.utcnow().isoformat(),
        "random_state": RANDOM_STATE,
        "hyperparameters": {
            "n_estimators": N_ESTIMATORS,
            "max_depth": max_depth_val,
            "min_samples_leaf": 4,
            "class_weight": "balanced_subsample"
        },
        "split_strategy": "stratified_60_20_20",
        "split_sizes": {
            "train": len(X_train),
            "val": len(X_val),
            "test": len(X_test)
        },
        "selected_threshold": float(best_threshold),
        "threshold_selection_split": "validation",
        "cost_assumptions": {
            "false_negative_cost": 5000,
            "false_positive_cost": 500
        },
        "test_metrics": metrics
    }
    metadata_file = MODEL_DIR / "model_metadata.json"
    with open(metadata_file, "w") as f:
        json.dump(model_metadata, f, indent=4)
    logger.info(f"Saved full model metadata to {metadata_file}")

    logger.info("=" * 60)
    logger.info("STEP 12 : MLflow Logging")
    logger.info("=" * 60)
    try:
        mlflow_logger = MLflowLogger(
            experiment_name=MLFLOW_EXPERIMENT,
            tracking_uri=MLFLOW_TRACKING_URI
        )
        mlflow_logger.log_model(
            model=calibrated_model,
            metrics=metrics,
            params={
                "model": "RandomForestClassifier",
                "calibration": "sigmoid",
                "n_estimators": N_ESTIMATORS,
                "max_depth": max_depth_val,
                "min_samples_leaf": 4,
                "threshold": best_threshold
            },
            artifacts={
                "schema": str(schema_file),
                "threshold": str(threshold_file),
                "table": str(THRESHOLD_DIR / "threshold_results.csv"),
                "metadata": str(metadata_file)
            }
        )
        logger.info("MLflow Logging Completed")
    except Exception as e:
        logger.warning(f"Could not log to MLflow: {e}")

    return (
        base_model,
        X_test,
        y_test,
        test_predictions_opt,
        test_probabilities,
        metrics,
        best_threshold,
        test_cost_opt["Total Cost"]
    )


if __name__ == "__main__":
    train_model()