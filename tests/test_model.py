import os
import json
import pytest
import joblib
import pandas as pd

from churnguard.config import MODEL_DIR, SCHEMA_DIR, THRESHOLD_DIR
from churnguard.models.predict import Predictor
from churnguard.explainability.shap_explainer import SHAPExplainer

@pytest.mark.skipif(not os.path.exists(MODEL_DIR / "random_forest.joblib"), reason="Model not trained yet")
def test_model_exists():
    model = joblib.load(MODEL_DIR / "random_forest.joblib")
    assert model is not None

@pytest.mark.skipif(not os.path.exists(SCHEMA_DIR / "feature_schema.json"), reason="Schema not created yet")
def test_feature_schema():
    with open(SCHEMA_DIR / "feature_schema.json") as f:
        schema = json.load(f)
    assert isinstance(schema, list)
    assert len(schema) > 40

@pytest.mark.skipif(not os.path.exists(THRESHOLD_DIR / "best_threshold.json"), reason="Threshold not optimized yet")
def test_threshold_artifact_valid():
    with open(THRESHOLD_DIR / "best_threshold.json") as f:
        threshold_data = json.load(f)
    assert "best_threshold" in threshold_data
    assert "minimum_cost" in threshold_data
    assert 0.0 < threshold_data["best_threshold"] < 1.0

def test_predictor_and_shap_explainer_on_enriched_input():
    predictor = Predictor()
    explainer = SHAPExplainer()

    customer_data = pd.DataFrame([{
        "gender": "Female",
        "SeniorCitizen": 0,
        "Partner": "No",
        "Dependents": "No",
        "tenure": 3,
        "PhoneService": "Yes",
        "MultipleLines": "No",
        "InternetService": "Fiber optic",
        "OnlineSecurity": "No",
        "OnlineBackup": "No",
        "DeviceProtection": "No",
        "TechSupport": "No",
        "StreamingTV": "Yes",
        "StreamingMovies": "Yes",
        "Contract": "Month-to-month",
        "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check",
        "MonthlyCharges": 85.0,
        "TotalCharges": 255.0,
        "login_frequency": 2.5,
        "feature_usage_count": 15,
        "avg_session_duration_minutes": 5.0,
        "days_since_last_login": 20,
        "lifecycle_stage": "at_risk",
        "account_owner": "Sarah Jenkins",
        "deal_value": 1020.0,
        "total_tickets": 6,
        "avg_resolution_time_hours": 24.0,
        "last_csat_score": 2,
        "failed_payments_count": 2,
        "plan_downgrades_count": 1,
        "days_since_last_payment_delay": 10
    }])

    pred = predictor.predict(customer_data)
    assert "probability" in pred
    assert "prediction" in pred
    assert "threshold" in pred
    assert 0.0 <= pred["probability"] <= 1.0

    shap_df = explainer.explain(customer_data)
    assert isinstance(shap_df, pd.DataFrame)
    assert len(shap_df) == 3
    assert "Feature" in shap_df.columns
    assert "SHAP" in shap_df.columns
    assert "Impact" in shap_df.columns

def test_no_train_serve_skew_batch_vs_single():
    from churnguard.features.build_features import create_features
    
    single_cust = pd.DataFrame([{
        "tenure": 12,
        "MonthlyCharges": 85.0,
        "TotalCharges": 1020.0,
        "SeniorCitizen": 0
    }])
    
    # Feature engineering alone
    feat_single = create_features(single_cust)
    assert feat_single["HighMonthlyCharges"].iloc[0] == 1, "Single customer with 85.0/mo must have HighMonthlyCharges=1"
    
    # Feature engineering in batch
    batch = pd.concat([
        single_cust,
        pd.DataFrame([
            {"tenure": 6, "MonthlyCharges": 20.0, "TotalCharges": 120.0, "SeniorCitizen": 0},
            {"tenure": 24, "MonthlyCharges": 30.0, "TotalCharges": 720.0, "SeniorCitizen": 0}
        ])
    ], ignore_index=True)
    
    feat_batch = create_features(batch)
    assert feat_batch["HighMonthlyCharges"].iloc[0] == feat_single["HighMonthlyCharges"].iloc[0], (
        "Customer features must be identical whether scored alone or inside a batch"
    )