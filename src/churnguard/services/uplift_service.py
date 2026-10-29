from typing import Dict, Any, List, Optional
import pandas as pd
from churnguard.uplift.uplift_model import TwoModelUplift
from churnguard.uplift.simulator import SyntheticRetentionSimulator

class UpliftService:
    """
    Service layer managing Uplift models, synthetic experiment simulation, and causal metrics.
    """
    def __init__(self, uplift_model: Optional[TwoModelUplift] = None):
        self.model = uplift_model or TwoModelUplift()
        self.simulator = SyntheticRetentionSimulator()

    def get_model_status(self) -> Dict[str, Any]:
        return {
            "model_name": "Two-Model Uplift Learner (T-Learner)",
            "is_fitted": self.model.is_fitted,
            "feature_names": self.model.feature_names,
            "supported_treatments": list(self.model.treatment_models.keys()) if self.model.is_fitted else [
                "15% Retention Discount", "Free Technical Support", "Premium Plan Upgrade", "Loyalty VIP Reward", "Priority Support"
            ],
            "data_mode": "Synthetic / Demonstration Mode",
            "data_label": "Simulation / Demonstration Data"
        }

    def run_synthetic_simulation(self, num_customers: int = 500, control_ratio: float = 0.30) -> Dict[str, Any]:
        """
        Generate synthetic treatment/control dataset, fit the uplift model, and return summary metrics.
        """
        df_sim = self.simulator.generate_experiment_dataset(
            num_customers=num_customers,
            control_ratio=control_ratio
        )
        
        # Fit uplift model on generated simulation data
        self.model.fit_from_dataframe(df_sim, treatment_col="treatment", outcome_col="retained")
        
        # Compute summary metrics
        t_mask = df_sim["treatment"] != "CONTROL"
        c_mask = df_sim["treatment"] == "CONTROL"

        t_rate = float(df_sim.loc[t_mask, "retained"].mean()) if t_mask.sum() > 0 else 0.0
        c_rate = float(df_sim.loc[c_mask, "retained"].mean()) if c_mask.sum() > 0 else 0.0
        ate = float(t_rate - c_rate)

        return {
            "status": "SUCCESS",
            "message": "Synthetic retention experiment generated and uplift model fitted.",
            "data_label": "Simulation / Demonstration Data",
            "is_synthetic": True,
            "num_customers": num_customers,
            "treatment_count": int(t_mask.sum()),
            "control_count": int(c_mask.sum()),
            "observed_treatment_retention": round(t_rate, 4),
            "observed_control_retention": round(c_rate, 4),
            "average_treatment_effect_ate": round(ate, 4),
            "sample_records": df_sim.head(5).to_dict(orient="records")
        }
