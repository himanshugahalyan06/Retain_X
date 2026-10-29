import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.fixture
def high_risk_customer_payload():
    return {
        "customer": {
            "gender": "Female",
            "SeniorCitizen": 0,
            "Partner": "No",
            "Dependents": "No",
            "tenure": 1,
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
            "MonthlyCharges": 98.5,
            "TotalCharges": 98.5,
            "login_frequency": 1.0,
            "feature_usage_count": 3,
            "total_tickets": 5,
            "last_csat_score": 1,
            "failed_payments_count": 2
        }
    }

def test_simulate_unauthenticated_rejected(high_risk_customer_payload):
    """Verify simulate endpoint rejects unauthenticated requests."""
    response = client.post("/api/simulate", json=high_risk_customer_payload)
    assert response.status_code == 401

def test_simulate_risk_reduction(auth_headers, high_risk_customer_payload):
    """
    Verify that applying risk-reducing modifications (e.g. 2-year contract,
    lower monthly charges, higher usage/CSAT) lowers simulated churn probability.
    """
    payload = {
        **high_risk_customer_payload,
        "modifications": {
            "Contract": "Two year",
            "MonthlyCharges": 45.0,
            "tenure": 24,
            "login_frequency": 7.0,
            "last_csat_score": 5,
            "total_tickets": 0,
            "failed_payments_count": 0
        }
    }
    response = client.post("/api/simulate", json=payload, headers=auth_headers)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "original_probability" in data
    assert "simulated_probability" in data
    assert "delta_probability" in data
    assert "impact_direction" in data
    assert "summary" in data

    # Verify risk reduction
    assert data["simulated_probability"] < data["original_probability"]
    assert data["delta_probability"] < 0
    assert data["impact_direction"] == "REDUCED_RISK"
    assert data["modified_features"]["Contract"] == "Two year"

def test_simulate_risk_increase(auth_headers):
    """
    Verify that applying risk-increasing modifications (e.g. Month-to-month,
    higher pricing, payment failures) increases simulated churn probability.
    """
    payload = {
        "customer": {
            "gender": "Male",
            "SeniorCitizen": 0,
            "Partner": "Yes",
            "Dependents": "Yes",
            "tenure": 48,
            "PhoneService": "Yes",
            "MultipleLines": "Yes",
            "InternetService": "DSL",
            "OnlineSecurity": "Yes",
            "OnlineBackup": "Yes",
            "DeviceProtection": "Yes",
            "TechSupport": "Yes",
            "StreamingTV": "No",
            "StreamingMovies": "No",
            "Contract": "Two year",
            "PaperlessBilling": "No",
            "PaymentMethod": "Bank transfer (automatic)",
            "MonthlyCharges": 35.0,
            "TotalCharges": 1680.0,
            "login_frequency": 9.0,
            "last_csat_score": 5,
            "failed_payments_count": 0
        },
        "modifications": {
            "Contract": "Month-to-month",
            "MonthlyCharges": 110.0,
            "failed_payments_count": 4,
            "last_csat_score": 1,
            "login_frequency": 0.5
        }
    }
    response = client.post("/api/simulate", json=payload, headers=auth_headers)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["simulated_probability"] > data["original_probability"]
    assert data["delta_probability"] > 0
    assert data["impact_direction"] == "INCREASED_RISK"

def test_simulate_no_change(auth_headers, high_risk_customer_payload):
    """
    Verify simulate endpoint with empty modifications returns zero delta.
    """
    payload = {
        **high_risk_customer_payload,
        "modifications": {}
    }
    response = client.post("/api/simulate", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert abs(data["delta_probability"]) < 0.001
    assert data["impact_direction"] == "NO_CHANGE"
