import pytest
from churnguard.retention.intervention_engine import (
    InterventionEngine,
    InterventionRule,
    default_intervention_engine,
    get_recommended_action
)
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture
def engine():
    """Create a fresh instance of the InterventionEngine with default rules."""
    return InterventionEngine()


# --- Scenario 1: Month-to-Month Contract + High Risk -> Annual Plan Discount ---
def test_scenario_contract_month_to_month_high_risk(engine):
    shap_input = [
        {"feature": "categorical__Contract_Month-to-month", "impact": 0.35},
        {"feature": "numerical__MonthlyCharges", "impact": 0.10}
    ]
    action = engine.recommend(shap_values=shap_input, risk_badge="High")
    assert action == "Offer annual plan discount"

    # Also test with exact string naming and critical risk
    action_crit = engine.recommend(shap_values="contract_type=month-to-month", risk_badge="CRITICAL")
    assert action_crit == "Offer annual plan discount"


# --- Scenario 2: High Monthly Charges + High Risk -> Loyalty Discount ---
def test_scenario_high_monthly_charges_high_risk(engine):
    shap_input = {
        "numerical__MonthlyCharges": 0.28,
        "numerical__tenure": -0.15
    }
    action = engine.recommend(shap_values=shap_input, risk_badge="HIGH")
    assert action == "Offer loyalty discount"

    # Also test with formatted feature name
    action_str = engine.recommend(shap_values="high monthly_charges", risk_badge="High")
    assert action_str == "Offer loyalty discount"


# --- Scenario 3: Low Login Frequency -> Re-engagement Email ---
def test_scenario_low_login_frequency(engine):
    shap_input = [
        {"feature": "numerical__login_frequency", "impact": 0.22},
        {"feature": "numerical__tenure", "impact": 0.05}
    ]
    # Works across risk levels
    action_medium = engine.recommend(shap_values=shap_input, risk_badge="MEDIUM")
    assert action_medium == "Send re-engagement email"

    action_high = engine.recommend(shap_values="low login_frequency", risk_badge="HIGH")
    assert action_high == "Send re-engagement email"


# --- Scenario 4: High Support Tickets -> Escalate to Senior CS Agent ---
def test_scenario_high_support_tickets(engine):
    shap_input = [
        {"feature": "numerical__total_tickets", "impact": 0.31},
        {"feature": "numerical__MonthlyCharges", "impact": 0.12}
    ]
    action = engine.recommend(shap_values=shap_input, risk_badge="HIGH")
    assert action == "Escalate to senior CS agent"

    # Also test with support phrase
    action_phrase = engine.recommend(shap_values="high support tickets", risk_badge="MEDIUM")
    assert action_phrase == "Escalate to senior CS agent"


# --- Scenario 5: Payment Friction -> Payment Method Assistance ---
def test_scenario_payment_friction(engine):
    shap_input = [
        {"feature": "numerical__failed_payments_count", "impact": 0.29},
        {"feature": "numerical__days_since_last_login", "impact": 0.08}
    ]
    action = engine.recommend(shap_values=shap_input, risk_badge="HIGH")
    assert action == "Assist with payment method & flexible billing"


# --- Scenario 6: Low Risk Default / Risk-Gated Rules ---
def test_scenario_low_risk_fallback(engine):
    # Contract discount requires HIGH/CRITICAL risk; for LOW risk with contract driver, default low risk applies
    shap_input = [{"feature": "categorical__Contract_Month-to-month", "impact": 0.20}]
    action_low = engine.recommend(shap_values=shap_input, risk_badge="LOW")
    assert action_low == "No action needed - standard monitoring"

    # Empty SHAP drivers on low risk
    action_empty = engine.recommend(shap_values=[], risk_badge="LOW")
    assert action_empty == "No action needed - standard monitoring"


# --- Scenario 7: Extensible Custom Rule Addition and Removal ---
def test_custom_rule_extension(engine):
    custom_rule = InterventionRule(
        rule_id="vip_executive_outreach",
        feature_patterns=["vip_risk", "executive_flag"],
        recommended_action="Assign VIP Executive Sponsor",
        allowed_risk_levels=["CRITICAL"],
        priority=200,
        description="Immediate VIP concierge escalation"
    )
    engine.register_rule(custom_rule)

    assert engine.get_rule("vip_executive_outreach") is not None
    action = engine.recommend(shap_values="vip_risk", risk_badge="CRITICAL")
    assert action == "Assign VIP Executive Sponsor"

    # Test removing rule
    engine.remove_rule("vip_executive_outreach")
    assert engine.get_rule("vip_executive_outreach") is None


# --- Scenario 8: Integration with /predict Endpoint ---
def test_predict_endpoint_includes_recommended_action(monkeypatch, auth_headers):
    class MockPredictor:
        def predict(self, df):
            return {"probability": 0.85, "prediction": 1, "threshold": 0.5}

    class MockExplainer:
        def explain(self, df):
            import pandas as pd
            return pd.DataFrame([
                {"Feature": "categorical__Contract_Month-to-month", "SHAP": 0.40, "Impact": 0.40},
                {"Feature": "numerical__MonthlyCharges", "SHAP": 0.15, "Impact": 0.15}
            ])

    monkeypatch.setattr("api.routes.predict.predictor", MockPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.ChurnPredictor", lambda *args, **kwargs: MockPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.SHAPExplainer", lambda *args, **kwargs: MockExplainer())

    client = TestClient(app)
    response = client.post("/predict", json={
        "Contract": "Month-to-month",
        "MonthlyCharges": 95.0,
        "tenure": 3
    }, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "recommended_action" in data
    assert isinstance(data["recommended_action"], str)
    assert data["recommended_action"] == "Offer annual plan discount"
