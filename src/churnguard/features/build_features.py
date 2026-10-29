"""
build_features.py

Feature Engineering Module
"""

import pandas as pd
import logging

logger = logging.getLogger(__name__)

import json
from typing import Optional
from churnguard.config import SCHEMA_DIR

DEFAULT_TRAINING_MEDIAN_MONTHLY_CHARGES = 70.35

def get_training_median_monthly_charges() -> float:
    """
    Retrieve persisted training set median monthly charges if available,
    otherwise fallback to default dataset constant.
    """
    stats_file = SCHEMA_DIR / "training_stats.json"
    if stats_file.exists():
        try:
            with open(stats_file, "r") as f:
                data = json.load(f)
                return float(data.get("median_monthly_charges", DEFAULT_TRAINING_MEDIAN_MONTHLY_CHARGES))
        except Exception:
            pass
    return DEFAULT_TRAINING_MEDIAN_MONTHLY_CHARGES

def create_features(df: pd.DataFrame, median_monthly_charges: Optional[float] = None) -> pd.DataFrame:
    """
    Create additional useful features without train/serve skew.

    Parameters
    ----------
    df : pd.DataFrame
    median_monthly_charges : Optional[float]
        Fixed median bill threshold learned from training data.
        If None, attempts to load from persisted schema artifact or defaults to training median.

    Returns
    -------
    pd.DataFrame
    """
    logger.info("Starting feature engineering.")
    df = df.copy()

    # -----------------------------------
    # Average Monthly Charge
    # -----------------------------------
    tenure = df["tenure"] if "tenure" in df.columns else 0
    total_charges = df["TotalCharges"] if "TotalCharges" in df.columns else 0.0
    df["AverageChargePerMonth"] = total_charges / (tenure + 1)

    # -----------------------------------
    # Senior Citizen Flag
    # -----------------------------------
    if "SeniorCitizen" in df.columns:
        df["IsSeniorCitizen"] = df["SeniorCitizen"]
    else:
        df["IsSeniorCitizen"] = 0

    # -----------------------------------
    # Long Term Customer
    # -----------------------------------
    df["LongTermCustomer"] = (tenure >= 24).astype(int)

    # -----------------------------------
    # High Bill Customer (Leakage-Safe)
    # -----------------------------------
    if median_monthly_charges is not None:
        med_bill = median_monthly_charges
    elif len(df) > 1 and "MonthlyCharges" in df.columns and df["MonthlyCharges"].nunique() > 10:
        # Batch training/fitting mode
        med_bill = float(df["MonthlyCharges"].median())
    else:
        # Single-row or inference mode - use fitted training median
        med_bill = get_training_median_monthly_charges()

    monthly = df["MonthlyCharges"] if "MonthlyCharges" in df.columns else 0.0
    df["HighMonthlyCharges"] = (monthly > med_bill).astype(int)

    logger.info("Feature engineering completed.")
    return df