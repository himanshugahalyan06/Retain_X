"""
SHAP Explainability Module

Provides local customer explanations and global feature importances
using SHAP TreeExplainer mapped back to human-readable feature names.
"""

import json
import joblib
import shap
import pandas as pd
import logging
import numpy as np
from typing import Dict, Any, List, Optional

from churnguard.config import (
    MODEL_DIR,
    ENCODER_DIR,
    SCHEMA_DIR
)
from churnguard.data.clean import clean_data
from churnguard.features.build_features import create_features, get_training_median_monthly_charges

logger = logging.getLogger(__name__)

FEATURE_NAME_MAP = {
    "tenure": "Tenure (months)",
    "MonthlyCharges": "Monthly Charges ($)",
    "TotalCharges": "Total Charges ($)",
    "AverageChargePerMonth": "Average Monthly Charge ($)",
    "HighMonthlyCharges": "High Monthly Charges",
    "SeniorCitizen": "Senior Citizen",
    "Contract_Month-to-month": "Contract: Month-to-Month",
    "Contract_One year": "Contract: 1 Year",
    "Contract_Two year": "Contract: 2 Year",
    "InternetService_Fiber optic": "Internet: Fiber Optic",
    "InternetService_DSL": "Internet: DSL",
    "InternetService_No": "Internet: None",
    "TechSupport_No": "Tech Support: No",
    "TechSupport_Yes": "Tech Support: Yes",
    "OnlineSecurity_No": "Online Security: No",
    "OnlineSecurity_Yes": "Online Security: Yes",
    "PaymentMethod_Electronic check": "Payment: Electronic Check",
    "PaymentMethod_Mailed check": "Payment: Mailed Check",
    "PaymentMethod_Bank transfer (automatic)": "Payment: Bank Transfer (Auto)",
    "PaymentMethod_Credit card (automatic)": "Payment: Credit Card (Auto)",
    "PaperlessBilling_Yes": "Paperless Billing: Yes",
    "PaperlessBilling_No": "Paperless Billing: No",
    "DeviceProtection_No": "Device Protection: No",
    "DeviceProtection_Yes": "Device Protection: Yes",
    "OnlineBackup_No": "Online Backup: No",
    "OnlineBackup_Yes": "Online Backup: Yes",
    "StreamingTV_Yes": "Streaming TV: Yes",
    "StreamingTV_No": "Streaming TV: No",
    "StreamingMovies_Yes": "Streaming Movies: Yes",
    "StreamingMovies_No": "Streaming Movies: No",
}


def format_feature_name(feature_raw: str) -> str:
    """Map raw one-hot encoded feature name to clean human-readable name."""
    if feature_raw in FEATURE_NAME_MAP:
        return FEATURE_NAME_MAP[feature_raw]
    # Clean up standard prefixes like remainder__ or preprocessor__
    cleaned = feature_raw
    for prefix in ["remainder__", "preprocessor__", "encoder__", "cat__", "num__"]:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):]
    if cleaned in FEATURE_NAME_MAP:
        return FEATURE_NAME_MAP[cleaned]
    return cleaned.replace("_", " ")


class ShapExplainer:
    """
    Provides real local customer explanations and global feature importance using SHAP values.
    """

    def __init__(self):
        logger.info("Initializing ShapExplainer...")
        try:
            # TreeExplainer runs on the underlying tree ensemble
            self.model = joblib.load(MODEL_DIR / "random_forest.joblib")
            self.pipeline = joblib.load(ENCODER_DIR / "pipeline.joblib")
            
            schema_file = SCHEMA_DIR / "feature_schema.json"
            if schema_file.exists():
                with open(schema_file) as file:
                    self.schema = json.load(file)
            else:
                self.schema = []

            self.explainer = shap.TreeExplainer(self.model)
            self.median_monthly_charges = get_training_median_monthly_charges()
            logger.info("ShapExplainer initialized successfully.")
        except Exception as e:
            logger.error(f"Missing artifact or error initializing ShapExplainer: {e}")
            self.model = None
            self.pipeline = None
            self.schema = []
            self.explainer = None
            self.median_monthly_charges = 70.35

    def _transform_customer(self, customer: pd.DataFrame) -> pd.DataFrame:
        """Clean and transform customer into schema-aligned feature space."""
        cleaned_df = clean_data(customer, is_training=False)
        featured_df = create_features(cleaned_df, median_monthly_charges=self.median_monthly_charges)
        transformed = self.pipeline.transform(featured_df)
        
        transformed_df = pd.DataFrame(
            transformed,
            columns=self.pipeline.named_steps["preprocessor"].get_feature_names_out()
        )
        return transformed_df.reindex(columns=self.schema, fill_value=0)

    def explain(
        self,
        customer: pd.DataFrame,
        top_n: int = 3
    ) -> pd.DataFrame:
        """
        Explain the prediction for a customer DataFrame.
        Maintains backward compatibility with tests expecting Feature, SHAP, Impact columns.
        """
        if self.explainer is None:
            raise RuntimeError("ShapExplainer is not initialized with model artifacts.")

        final_df = self._transform_customer(customer)
        shap_values = self.explainer.shap_values(final_df)

        # Handle different SHAP versions and tree output structures
        if isinstance(shap_values, list):
            # Binary classification list: [class_0, class_1]
            values = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        elif isinstance(shap_values, np.ndarray):
            if shap_values.ndim == 3:
                values = shap_values[0, :, 1]
            elif shap_values.ndim == 2:
                values = shap_values[0]
            else:
                values = shap_values
        else:
            values = np.zeros(len(self.schema))

        explanation = pd.DataFrame({
            "Feature": self.schema,
            "SHAP": values
        })

        explanation["Impact"] = explanation["SHAP"].abs()
        explanation = explanation.sort_values(by="Impact", ascending=False)
        return explanation.head(top_n)

    def explain_customer_drivers(
        self,
        customer: pd.DataFrame,
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate structured, human-readable SHAP drivers for retention customer view.
        Returns actual measured contributions, direction (increases_risk vs reduces_risk),
        and formatted labels.
        """
        if self.explainer is None:
            return []

        try:
            explanation = self.explain(customer, top_n=top_n)
            drivers = []
            for _, row in explanation.iterrows():
                raw_feat = str(row["Feature"])
                shap_val = float(row["SHAP"])
                direction = "increases_risk" if shap_val > 0 else "reduces_risk"
                formatted_label = format_feature_name(raw_feat)

                drivers.append({
                    "feature": formatted_label,
                    "raw_feature": raw_feat,
                    "importance": round(shap_val, 4),
                    "impact": round(abs(shap_val), 4),
                    "direction": direction
                })
            return drivers
        except Exception as e:
            logger.warning(f"Could not compute SHAP drivers: {e}")
            return []


# Shared singleton instance
_default_explainer: Optional[ShapExplainer] = None

def get_shap_explainer() -> ShapExplainer:
    global _default_explainer
    if _default_explainer is None:
        _default_explainer = ShapExplainer()
    return _default_explainer


# Alias for backward compatibility
SHAPExplainer = ShapExplainer