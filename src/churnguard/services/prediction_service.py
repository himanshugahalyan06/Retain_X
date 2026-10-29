import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from churnguard.models.predict import ChurnPredictor
from churnguard.explainability.shap_explainer import SHAPExplainer
from churnguard.value.value_estimator import ValueEstimator
from churnguard.services.training_service import get_active_company_predictor

class PredictionService:
    """
    Service orchestrator for Churn Prediction, Economics Estimation, and SHAP Explainability.
    """
    def __init__(self, predictor: Optional[ChurnPredictor] = None, explainer: Optional[SHAPExplainer] = None, db_session=None):
        self.predictor = predictor or ChurnPredictor()
        self.explainer = explainer or SHAPExplainer()
        self.db = db_session
        self.val_estimator = ValueEstimator(db_session=db_session)

    def predict_customer(self, customer_data: Dict[str, Any], company_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute prediction pipeline with validation, risk segmentation, economics, and SHAP explanation.
        Supports dynamic company-trained models when active.
        """
        df = pd.DataFrame([customer_data])
        
        # Check for active company-specific trained model (unless custom/mock predictor is explicitly passed)
        active_bundle = None
        is_default_predictor = type(self.predictor).__name__ in ["Predictor", "ChurnPredictor"]
        if company_id and self.db and is_default_predictor:
            active_bundle = get_active_company_predictor(company_id, self.db)

        if active_bundle:
            try:
                pipeline = active_bundle["pipeline"]
                probs = pipeline.predict_proba(df)[:, 1]
                prob = float(probs[0])
                threshold = float(active_bundle["threshold"])
                pred_label = int(prob >= threshold)
                model_ver = f"company-v{active_bundle['version']} ({active_bundle['algorithm']})"
            except Exception:
                pred_result = self.predictor.predict(df)
                prob = float(pred_result["probability"])
                pred_label = int(pred_result["prediction"])
                threshold = float(pred_result["threshold"])
                model_ver = "churn-rf-v1.3"
        else:
            # ML Inference with platform default
            pred_result = self.predictor.predict(df)
            prob = float(pred_result["probability"])
            pred_label = int(pred_result["prediction"])
            threshold = float(pred_result["threshold"])
            model_ver = "churn-rf-v1.3"

        # Risk Segmentation
        if prob >= 0.75:
            risk_segment = "CRITICAL"
        elif prob >= 0.45:
            risk_segment = "HIGH"
        elif prob >= 0.20:
            risk_segment = "MEDIUM"
        else:
            risk_segment = "LOW"

        # Customer Economic Value
        econ_details = self.val_estimator.estimate_value_details(
            monthly_charges=float(customer_data.get("MonthlyCharges", 70.0)),
            contract=str(customer_data.get("Contract", "Month-to-month")),
            tenure=int(customer_data.get("tenure", 12)),
            custom_value=customer_data.get("custom_customer_value"),
            gross_margin=customer_data.get("gross_margin"),
            expected_lifetime=customer_data.get("expected_lifetime")
        )
        econ_val = econ_details["estimated_economic_value"]

        # Value Segment
        if econ_val >= 25000:
            value_segment = "VIP"
        elif econ_val >= 10000:
            value_segment = "HIGH_VALUE"
        elif econ_val >= 4000:
            value_segment = "MEDIUM_VALUE"
        else:
            value_segment = "LOW_VALUE"

        combined_segment = f"{risk_segment}_RISK_{value_segment}"

        # SHAP Explainability
        shap_factors = []
        try:
            explanation_df = self.explainer.explain(df)
            for _, row in explanation_df.iterrows():
                shap_factors.append({
                    "feature": str(row.get("Feature", "")),
                    "impact": float(row.get("Impact", 0.0)),
                    "direction": "RISK_INCREASING" if float(row.get("Impact", 0.0)) > 0 else "PROTECTIVE"
                })
        except Exception:
            # Fallback heuristic drivers
            if customer_data.get("Contract") == "Month-to-month":
                shap_factors.append({"feature": "Contract=Month-to-month", "impact": 0.22, "direction": "RISK_INCREASING"})
            if float(customer_data.get("MonthlyCharges", 0)) > 80:
                shap_factors.append({"feature": "MonthlyCharges>80", "impact": 0.14, "direction": "RISK_INCREASING"})
            if customer_data.get("TechSupport") == "No":
                shap_factors.append({"feature": "TechSupport=No", "impact": 0.10, "direction": "RISK_INCREASING"})

        return {
            "prediction": pred_label,
            "churn_probability": prob,
            "threshold": threshold,
            "risk_segment": risk_segment,
            "value_segment": value_segment,
            "combined_segment": combined_segment,
            "economic_value": econ_details,
            "explanation": {
                "top_risk_factors": [f for f in shap_factors if f["direction"] == "RISK_INCREASING"],
                "protective_factors": [f for f in shap_factors if f["direction"] == "PROTECTIVE"]
            },
            "model_version": model_ver,
            "threshold_version": "cost-policy-v2"
        }
