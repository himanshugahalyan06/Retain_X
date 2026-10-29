"""
Company Dataset Service.

Manages tenant-isolated dataset upload, schema inspection, validation,
data profiling, and dynamic EDA chart aggregation.
"""

import os
import uuid
import io
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from churnguard.config import ARTIFACTS_DIR
from churnguard.database.models import CompanyDataset

logger = logging.getLogger(__name__)

DATASETS_STORAGE_DIR = Path("/tmp/artifacts/datasets") if os.getenv("VERCEL") else (ARTIFACTS_DIR / "datasets")
try:
    DATASETS_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass


def save_and_inspect_dataset(
    company_id: int,
    file_bytes: bytes,
    filename: str,
    db: Session
) -> CompanyDataset:
    """
    Save uploaded CSV file securely, inspect schema, missingness, and data types,
    and persist a CompanyDataset record.
    """
    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty.")
    if len(file_bytes) > 50 * 1024 * 1024:
        raise ValueError("File exceeds maximum allowed size of 50MB.")

    # 1. Parse CSV safely
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Failed to parse CSV: {str(e)}")

    if len(df) < 5:
        raise ValueError("Dataset must contain at least 5 rows.")
    if len(df.columns) < 2:
        raise ValueError("Dataset must contain at least 2 columns.")

    # 2. Save file to tenant-isolated storage
    tenant_dir = DATASETS_STORAGE_DIR / str(company_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex
    safe_path = tenant_dir / f"{file_id}.csv"

    with open(safe_path, "wb") as f:
        f.write(file_bytes)

    # 3. Analyze Schema & Columns
    columns_info = []
    suggested_target = None
    suggested_id = None

    for col in df.columns:
        col_type = "numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical"
        missing_count = int(df[col].isna().sum())
        unique_count = int(df[col].nunique(dropna=True))
        unique_sample = [str(v) for v in df[col].dropna().unique()[:6].tolist()]

        col_lower = str(col).lower().strip()

        # Heuristic for ID column
        if col_lower in ("customerid", "customer_id", "id", "user_id", "userid", "account_id") or (unique_count == len(df) and col_type == "categorical"):
            if not suggested_id:
                suggested_id = col

        # Heuristic for Binary Target column
        if unique_count == 2 and col != suggested_id:
            if col_lower in ("churn", "target", "label", "exited", "is_churn", "churned", "status") or not suggested_target:
                suggested_target = col

        columns_info.append({
            "name": str(col),
            "type": col_type,
            "missing_count": missing_count,
            "missing_pct": round((missing_count / len(df)) * 100, 1),
            "unique_count": unique_count,
            "sample_values": unique_sample
        })

    duplicate_rows = int(df.duplicated().sum())

    # Detect positive class heuristic for suggested target
    suggested_positive_class = None
    if suggested_target and suggested_target in df.columns:
        uvals = [str(x).strip() for x in df[suggested_target].dropna().unique()]
        for u in uvals:
            if u.lower() in ("yes", "1", "true", "churn", "churned", "positive", "y"):
                suggested_positive_class = u
                break
        if not suggested_positive_class and len(uvals) >= 2:
            suggested_positive_class = uvals[1]

    schema_metadata = {
        "columns": columns_info,
        "duplicate_rows": duplicate_rows,
        "suggested_target": suggested_target,
        "suggested_positive_class": suggested_positive_class,
        "suggested_id": suggested_id
    }

    # 4. Create and persist CompanyDataset record
    dataset_record = CompanyDataset(
        company_id=company_id,
        name=filename or "Uploaded Dataset",
        file_path=str(safe_path),
        file_size_bytes=len(file_bytes),
        row_count=len(df),
        col_count=len(df.columns),
        status="UPLOADED",
        target_column=suggested_target,
        positive_class=suggested_positive_class,
        id_column=suggested_id,
        schema_json=schema_metadata,
        profile_json=None
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return dataset_record


def profile_dataset(
    dataset_id: int,
    company_id: int,
    target_column: Optional[str] = None,
    positive_class: Optional[str] = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Generate deep profiling statistics and dynamic visualization data for an uploaded dataset.
    """
    dataset = db.query(CompanyDataset).filter(
        CompanyDataset.id == dataset_id,
        CompanyDataset.company_id == company_id
    ).first()

    if not dataset:
        raise ValueError("Dataset not found or access denied.")

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise ValueError("Dataset file is missing from storage.")

    df = pd.read_csv(file_path)
    target = target_column or dataset.target_column

    if target and target not in df.columns:
        raise ValueError(f"Target column '{target}' not found in dataset.")

    profile: Dict[str, Any] = {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "total_rows": len(df),
        "row_count": len(df),
        "total_columns": len(df.columns),
        "col_count": len(df.columns),
        "target_column": target,
        "target_profile": None,
        "target_distribution": [],
        "numerical_stats": [],
        "numerical_summaries": [],
        "categorical_distributions": [],
        "category_churn_rates": [],
        "churn_by_categorical": [],
        "numerical_churn_bins": [],
        "churn_by_numerical": [],
        "correlation_heatmap": {"columns": [], "matrix": {}, "pairs": []},
        "data_warnings": []
    }

    # 1. Target column mapping & analysis
    if target:
        target_series = df[target].dropna()
        unique_vals = target_series.unique().tolist()

        if len(unique_vals) != 2:
            profile["data_warnings"].append(
                f"Target column '{target}' has {len(unique_vals)} unique values ({unique_vals[:5]}). Binary classification requires exactly 2 classes."
            )
        else:
            # Map positive class intelligently
            str_unique = [str(x).strip() for x in unique_vals]
            pos = None
            if positive_class is not None and str(positive_class).strip():
                req_pos = str(positive_class).strip().lower()
                for u in str_unique:
                    if u.lower() == req_pos:
                        pos = u
                        break
            if not pos:
                for u in str_unique:
                    if u.lower() in ("yes", "1", "true", "churn", "churned", "positive", "y"):
                        pos = u
                        break
            if not pos:
                pos = str_unique[1] if len(str_unique) > 1 else str_unique[0]

            val_counts = target_series.astype(str).str.strip().value_counts()
            pos_count = int(val_counts.get(pos, 0))
            neg_count = len(target_series) - pos_count
            pos_pct = round((pos_count / max(len(target_series), 1)) * 100, 1)

            profile["positive_class"] = pos
            profile["target_distribution"] = [
                {"name": f"Churn ({pos})", "count": pos_count, "pct": pos_pct, "fill": "#DC2626"},
                {"name": "Retained", "count": neg_count, "pct": round(100 - pos_pct, 1), "fill": "#059669"}
            ]
            profile["target_profile"] = {
                "positive_rate": pos_pct,
                "positive_class": pos,
                "distribution": [
                    {"class": f"Churn ({pos})", "count": pos_count, "percentage": pos_pct, "is_positive": True},
                    {"class": "Retained", "count": neg_count, "percentage": round(100 - pos_pct, 1), "is_positive": False}
                ]
            }

            if pos_pct < 5.0 or pos_pct > 95.0:
                profile["data_warnings"].append(
                    f"Severe class imbalance: Positive class is {pos_pct}%. Model training will apply balanced weighting."
                )

            # Map target to binary 0/1 for correlation & group analysis
            binary_target = (df[target].astype(str).str.strip().str.lower() == pos.lower()).astype(int)
    else:
        binary_target = None

    # 2. Numerical Features Profiling & Correlations
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if target and target in num_cols:
        num_cols.remove(target)

    for col in num_cols[:15]:
        series = df[col].dropna()
        if len(series) == 0:
            continue

        q25, q50, q75 = np.percentile(series, [25, 50, 75])
        profile["numerical_stats"].append({
            "feature": col,
            "min": round(float(series.min()), 2),
            "max": round(float(series.max()), 2),
            "mean": round(float(series.mean()), 2),
            "median": round(float(q50), 2),
            "std": round(float(series.std()), 2) if len(series) > 1 else 0.0,
            "q25": round(float(q25), 2),
            "q75": round(float(q75), 2)
        })

        # If binary target is available, bin numerical feature into 4 quartiles to show churn rate
        if binary_target is not None and series.nunique() > 5:
            try:
                bins = pd.qcut(series, q=4, duplicates='drop')
                binned_churn = binary_target.groupby(bins, observed=False).agg(['mean', 'count'])
                bin_items = [
                    {
                        "bin": str(idx),
                        "churn_rate": round(float(row['mean']) * 100, 1),
                        "count": int(row['count']),
                        "total": int(row['count']),
                        "churn_count": int(round(float(row['mean']) * row['count']))
                    }
                    for idx, row in binned_churn.iterrows()
                ]
                profile["numerical_churn_bins"].append({
                    "feature": col,
                    "bins": bin_items
                })
                profile["churn_by_numerical"].append({
                    "column": col,
                    "bins": bin_items
                })
            except Exception:
                pass

    profile["numerical_summaries"] = profile["numerical_stats"]

    # 3. Correlation Heatmap
    if len(num_cols) >= 2:
        corr_cols = num_cols[:8]
        if binary_target is not None:
            df_temp = df[corr_cols].copy()
            df_temp["Churn"] = binary_target
            corr_matrix = df_temp.corr().round(2).fillna(0)
        else:
            corr_matrix = df[corr_cols].corr().round(2).fillna(0)

        pairs = []
        for r_name in corr_matrix.index:
            for c_name in corr_matrix.columns:
                pairs.append({
                    "x": str(c_name),
                    "y": str(r_name),
                    "value": float(corr_matrix.loc[r_name, c_name])
                })

        profile["correlation_heatmap"] = {
            "columns": [str(c) for c in corr_matrix.columns],
            "matrix": corr_matrix.to_dict(),
            "pairs": pairs
        }

    # 4. Categorical Features & Churn Rates by Category
    cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    if target and target in cat_cols:
        cat_cols.remove(target)
    if dataset.id_column and dataset.id_column in cat_cols:
        cat_cols.remove(dataset.id_column)

    for col in cat_cols[:8]:
        val_counts = df[col].value_counts().head(6)
        dist = [{"category": str(k), "count": int(v)} for k, v in val_counts.items()]
        profile["categorical_distributions"].append({
            "feature": col,
            "distribution": dist
        })

        if binary_target is not None:
            group_churn = binary_target.groupby(df[col]).agg(['mean', 'count']).loc[val_counts.index]
            cat_breakdown = [
                {
                    "category": str(idx),
                    "churn_rate": round(float(row['mean']) * 100, 1),
                    "count": int(row['count']),
                    "total": int(row['count']),
                    "churn_count": int(round(float(row['mean']) * row['count']))
                }
                for idx, row in group_churn.iterrows()
            ]
            profile["category_churn_rates"].append({
                "feature": col,
                "breakdown": cat_breakdown
            })
            profile["churn_by_categorical"].append({
                "column": col,
                "categories": cat_breakdown
            })

    # Update dataset record
    dataset.target_column = target
    if positive_class:
        dataset.positive_class = str(positive_class)
    dataset.profile_json = profile
    dataset.status = "VALIDATED"
    db.commit()

    return profile


def get_dataset_preview(
    dataset_id: int,
    company_id: int,
    limit: int = 20,
    db: Session = None
) -> Dict[str, Any]:
    """
    Return first N rows of the dataset for UI preview.
    """
    dataset = db.query(CompanyDataset).filter(
        CompanyDataset.id == dataset_id,
        CompanyDataset.company_id == company_id
    ).first()

    if not dataset:
        raise ValueError("Dataset not found or access denied.")

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise ValueError("Dataset file missing.")

    df = pd.read_csv(file_path, nrows=limit)
    return {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "row_count": dataset.row_count,
        "col_count": dataset.col_count,
        "columns": df.columns.tolist(),
        "rows": df.fillna("").to_dict(orient="records"),
        "target_column": dataset.target_column,
        "positive_class": dataset.positive_class,
        "status": dataset.status
    }
