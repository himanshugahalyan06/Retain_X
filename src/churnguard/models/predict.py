import os
import json
import joblib
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List, Union

import mlflow

from churnguard.config import (
    MODEL_DIR,
    ENCODER_DIR,
    SCHEMA_DIR,
    THRESHOLD_DIR,
    MLFLOW_TRACKING_URI
)
from churnguard.data.clean import clean_data
from churnguard.features.build_features import create_features, get_training_median_monthly_charges

logger = logging.getLogger(__name__)

class Predictor:
    """
    Handles loading the trained calibrated model, pipeline, and threshold to make predictions.
    Supports single-row customer scoring and multi-row batch scoring.
    """

    def __init__(self):
        logger.info("Initializing Predictor...")
        
        use_mlflow = os.getenv("ENABLE_MLFLOW", "false").lower() == "true"
        self.model = None

        if use_mlflow:
            mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
            try:
                logger.info("Attempting to load model from MLflow registry...")
                self.model = mlflow.sklearn.load_model("models:/ChurnGuardModel/latest")
                logger.info("Loaded model from MLflow registry successfully.")
            except Exception as e:
                logger.warning(f"Could not load model from MLflow registry: {e}. Falling back to local joblib.")
        
        # Prefer calibrated model if available, fallback to base random forest
        if self.model is None:
            calibrated_path = MODEL_DIR / "calibrated_model.joblib"
            rf_path = MODEL_DIR / "random_forest.joblib"
            if calibrated_path.exists():
                try:
                    self.model = joblib.load(calibrated_path)
                    logger.info("Loaded calibrated model from local joblib successfully.")
                except Exception as e:
                    logger.warning(f"Failed loading calibrated model: {e}")

            if self.model is None and rf_path.exists():
                try:
                    self.model = joblib.load(rf_path)
                    logger.info("Loaded base Random Forest model from local joblib.")
                except Exception as e:
                    logger.error(f"Failed loading base model: {e}")
                    self.model = None

        # Preprocessing pipeline
        try:
            self.pipeline = joblib.load(ENCODER_DIR / "pipeline.joblib")
        except Exception as e:
            logger.error(f"Missing pipeline artifact: {e}")
            self.pipeline = None

        # Feature schema
        try:
            schema_file = SCHEMA_DIR / "feature_schema.json"
            if schema_file.exists():
                with open(schema_file) as f:
                    self.schema = json.load(f)
            else:
                self.schema = []
        except Exception as e:
            logger.error(f"Failed loading schema: {e}")
            self.schema = []

        # Decision threshold
        try:
            threshold_file = THRESHOLD_DIR / "best_threshold.json"
            if threshold_file.exists():
                with open(threshold_file) as f:
                    threshold_data = json.load(f)
                self.threshold = float(threshold_data.get("best_threshold", 0.50))
            else:
                self.threshold = 0.50
        except Exception as e:
            logger.error(f"Failed loading threshold: {e}")
            self.threshold = 0.50

        # Training statistics (no train/serve skew)
        self.median_monthly_charges = get_training_median_monthly_charges()
        logger.info(f"Predictor initialized with threshold: {self.threshold:.2f}, median monthly charges: {self.median_monthly_charges}")

    def _preprocess_input(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply identical clean, feature creation, encoding, and schema alignment.
        """
        if self.pipeline is None or not self.schema:
            raise RuntimeError("Predictor pipeline or schema is not loaded.")

        cleaned_df = clean_data(df, is_training=False)
        featured_df = create_features(cleaned_df, median_monthly_charges=self.median_monthly_charges)
        transformed = self.pipeline.transform(featured_df)

        transformed_df = pd.DataFrame(
            transformed,
            columns=self.pipeline.named_steps["preprocessor"].get_feature_names_out()
        )
        final_df = transformed_df.reindex(columns=self.schema, fill_value=0)
        return final_df

    def predict(self, customer: pd.DataFrame) -> Dict[str, Any]:
        """
        Make a prediction for a given customer.

        Parameters
        ----------
        customer : pd.DataFrame
            Single customer (or 1-row DataFrame).

        Returns
        -------
        Dict[str, Any]
            Contains probability, binary prediction, threshold, risk_score, and risk_tier.
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded. Please train or provide model artifacts.")

        final_df = self._preprocess_input(customer)
        proba_matrix = self.model.predict_proba(final_df)
        probability = float(proba_matrix[0][1])

        prediction = int(probability >= self.threshold)
        risk_score = int(round(probability * 100))

        if probability >= 0.70:
            risk_tier = "High Risk"
        elif probability >= self.threshold:
            risk_tier = "Medium Risk"
        else:
            risk_tier = "Low Risk"

        return {
            "probability": probability,
            "prediction": prediction,
            "threshold": self.threshold,
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "model_version": "v2.0.0"
        }

    def predict_batch(self, customers: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Batch prediction for multiple customers.
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded.")

        final_df = self._preprocess_input(customers)
        proba_matrix = self.model.predict_proba(final_df)
        probabilities = proba_matrix[:, 1]

        results = []
        for i, prob in enumerate(probabilities):
            prob_float = float(prob)
            pred = int(prob_float >= self.threshold)
            score = int(round(prob_float * 100))
            if prob_float >= 0.70:
                tier = "High Risk"
            elif prob_float >= self.threshold:
                tier = "Medium Risk"
            else:
                tier = "Low Risk"

            results.append({
                "probability": prob_float,
                "prediction": pred,
                "threshold": self.threshold,
                "risk_score": score,
                "risk_tier": tier,
                "model_version": "v2.0.0"
            })

        return results


# Alias for backward compatibility
ChurnPredictor = Predictor