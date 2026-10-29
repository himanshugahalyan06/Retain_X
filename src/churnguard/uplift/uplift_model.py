import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.ensemble import RandomForestClassifier
from churnguard.uplift.uplift_base import UpliftModel, Treatment, Control, Outcome

class TwoModelUplift(UpliftModel):
    """
    Two-Model Uplift Learner (T-Learner).
    Trains separate classifiers for Treatment group and Control group to estimate 
    Individual Treatment Effects (ITE) on Retention Probability:
      Uplift(t) = P(retained | X, Treatment=t) - P(retained | X, Control)
    """
    def __init__(self, n_estimators: int = 100, random_state: int = 42):
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.control_model = RandomForestClassifier(n_estimators=n_estimators, random_state=random_state)
        self.treatment_models: Dict[str, RandomForestClassifier] = {}
        self.feature_names: List[str] = []
        self.is_fitted = False

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract numerical features for ML modeling.
        """
        feature_cols = [c for c in df.columns if c not in ["customer_id", "treatment", "retained", "churned", "campaign_id", "outcome_date", "treatment_date"]]
        df_encoded = pd.get_dummies(df[feature_cols], drop_first=True)
        return df_encoded

    def fit_from_dataframe(self, df: pd.DataFrame, treatment_col: str = "treatment", outcome_col: str = "retained"):
        """
        Fit T-Learner on historical/simulated experiment dataframe containing columns:
        [treatment_col, outcome_col, ...customer_features]
        """
        if df.empty:
            raise ValueError("Training DataFrame is empty.")

        # Features
        ignore_cols = [treatment_col, outcome_col, "customer_id", "campaign_id", "treatment_date", "outcome_date", "churn_probability", "customer_value", "intervention_cost"]
        feature_cols = [c for c in df.columns if c not in ignore_cols]
        
        X = pd.get_dummies(df[feature_cols], drop_first=True)
        self.feature_names = list(X.columns)

        # Split control vs treatments
        is_control = (df[treatment_col] == "CONTROL") | (df[treatment_col] == "NONE")
        X_control = X[is_control]
        y_control = df.loc[is_control, outcome_col].astype(int)

        if len(X_control) > 0:
            self.control_model.fit(X_control, y_control)

        # Fit each treatment group separately
        unique_treatments = [t for t in df[treatment_col].unique() if t not in ["CONTROL", "NONE"]]
        for t_name in unique_treatments:
            is_t = df[treatment_col] == t_name
            X_t = X[is_t]
            y_t = df.loc[is_t, outcome_col].astype(int)
            if len(X_t) >= 10:
                t_model = RandomForestClassifier(n_estimators=self.n_estimators, random_state=self.random_state)
                t_model.fit(X_t, y_t)
                self.treatment_models[t_name] = t_model

        self.is_fitted = True

    def fit_uplift(self, training_data: pd.DataFrame, treatments: List[Treatment], outcomes: List[Outcome]) -> None:
        """
        Implements interface method fit_uplift.
        """
        self.fit_from_dataframe(training_data, treatment_col="treatment", outcome_col="retained")

    def _align_features(self, customer_features: pd.DataFrame) -> pd.DataFrame:
        X = pd.get_dummies(customer_features, drop_first=True)
        for col in self.feature_names:
            if col not in X.columns:
                X[col] = 0
        return X[self.feature_names]

    def predict_control_probability(self, customer_features: pd.DataFrame) -> float:
        """
        Estimate P(retained | customer_features, Control)
        """
        if not self.is_fitted:
            # Domain baseline fallback if not yet fitted
            tenure = customer_features.get("tenure", pd.Series([12])).values[0] if isinstance(customer_features, pd.DataFrame) else 12
            monthly = customer_features.get("MonthlyCharges", pd.Series([70])).values[0] if isinstance(customer_features, pd.DataFrame) else 70
            # Higher tenure, lower charges -> higher control retention
            p_control = 0.50 + min(0.35, tenure * 0.005) - min(0.20, monthly * 0.001)
            return float(np.clip(p_control, 0.10, 0.90))

        X = self._align_features(customer_features)
        probs = self.control_model.predict_proba(X)
        if probs.shape[1] == 2:
            return float(probs[0, 1])
        return float(probs[0, 0])

    def predict_treatment_probability(self, customer_features: pd.DataFrame, treatment: Any) -> float:
        """
        Estimate P(retained | customer_features, Treatment)
        """
        t_name = treatment.name if hasattr(treatment, "name") else str(treatment)
        t_key = t_name.upper().replace(" ", "_")

        if not self.is_fitted or t_name not in self.treatment_models:
            # Baseline domain heuristic fallback if model not trained
            p_control = self.predict_control_probability(customer_features)
            
            # Domain-specific treatment uplift heuristics
            uplift_boost = 0.10
            t_clean = t_name.lower()
            if "discount" in t_clean:
                uplift_boost = 0.18
            elif "tech" in t_clean or "support" in t_clean:
                uplift_boost = 0.22
            elif "vip" in t_clean or "priority" in t_clean:
                uplift_boost = 0.25
            elif "upgrade" in t_clean:
                uplift_boost = 0.15
            elif "loyalty" in t_clean:
                uplift_boost = 0.12

            return float(np.clip(p_control + uplift_boost, 0.05, 0.95))

        X = self._align_features(customer_features)
        t_model = self.treatment_models[t_name]
        probs = t_model.predict_proba(X)
        if probs.shape[1] == 2:
            return float(probs[0, 1])
        return float(probs[0, 0])

    def predict_uplift(self, customer_features: pd.DataFrame, treatment_name: str) -> float:
        """
        Calculate incremental retention uplift score for a treatment vs control:
          Uplift = P(retained | Treatment) - P(retained | Control)
        """
        p_control = self.predict_control_probability(customer_features)
        
        # Domain heuristic adjustment if not fitted
        if not self.is_fitted:
            contract = str(customer_features.get("Contract", pd.Series(["Month-to-month"])).values[0]).lower() if isinstance(customer_features, pd.DataFrame) else ""
            tech_support = str(customer_features.get("TechSupport", pd.Series(["No"])).values[0]).lower() if isinstance(customer_features, pd.DataFrame) else ""
            monthly = float(customer_features.get("MonthlyCharges", pd.Series([70.0])).values[0]) if isinstance(customer_features, pd.DataFrame) else 70.0
            tenure = int(customer_features.get("tenure", pd.Series([12])).values[0]) if isinstance(customer_features, pd.DataFrame) else 12

            t_clean = treatment_name.lower()
            if "discount" in t_clean:
                uplift = 0.20 if "month" in contract or monthly > 70 else 0.08
            elif "technical" in t_clean or "tech" in t_clean:
                uplift = 0.24 if tech_support == "no" or "fiber" in str(customer_features.get("InternetService", "")).lower() else 0.10
            elif "upgrade" in t_clean or "premium" in t_clean:
                uplift = 0.16 if tenure > 6 else 0.05
            elif "loyalty" in t_clean or "reward" in t_clean:
                uplift = 0.14 if tenure >= 12 else -0.02 # Negative uplift for non-loyal short tenure!
            elif "priority" in t_clean:
                uplift = 0.22 if monthly > 90 else 0.10
            else:
                uplift = 0.10

            return float(np.round(uplift, 4))

        p_treatment = self.predict_treatment_probability(customer_features, treatment_name)
        return float(np.round(p_treatment - p_control, 4))
