import pytest
import pandas as pd
from churnguard.uplift.uplift_model import TwoModelUplift
from churnguard.uplift.simulator import SyntheticRetentionSimulator
from churnguard.services.uplift_service import UpliftService

def test_uplift_simulator_generation():
    simulator = SyntheticRetentionSimulator()
    df = simulator.generate_experiment_dataset(num_customers=100, control_ratio=0.3)
    assert len(df) == 100
    assert "treatment" in df.columns
    assert "retained" in df.columns
    assert (df["treatment"] == "CONTROL").sum() > 0

def test_two_model_uplift_fitting():
    simulator = SyntheticRetentionSimulator()
    df = simulator.generate_experiment_dataset(num_customers=150, control_ratio=0.3)

    model = TwoModelUplift()
    model.fit_from_dataframe(df, treatment_col="treatment", outcome_col="retained")

    assert model.is_fitted
    customer_sample = df.iloc[0].to_dict()
    uplift = model.calculate_uplift_score(customer_sample, treatment="15% Retention Discount")
    assert -1.0 <= uplift <= 1.0

def test_uplift_service():
    service = UpliftService()
    status = service.get_model_status()
    assert "Two-Model Uplift" in status["model_name"]

    res = service.run_synthetic_simulation(num_customers=200, control_ratio=0.3)
    assert res["status"] == "SUCCESS"
    assert res["num_customers"] == 200
