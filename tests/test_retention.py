import pytest
from churnguard.value.value_estimator import ValueEstimator
from churnguard.retention.next_best_action import NextBestActionEngine
from churnguard.retention.decision_engine import RetentionDecisionEngine

def test_value_estimator_defaults():
    estimator = ValueEstimator(None)
    val = estimator.estimate_value(monthly_charges=100.0, contract="Month-to-month")
    assert val == 780.0

    val_one_year = estimator.estimate_value(monthly_charges=100.0, contract="One year")
    assert val_one_year == 1560.0

    val_custom = estimator.estimate_value(monthly_charges=100.0, contract="One year", custom_value=500.0)
    assert val_custom == 500.0

def test_next_best_action_engine():
    nba = NextBestActionEngine(None)
    action = nba.select_next_best_action(churn_probability=0.05, customer_value=1000.0)
    assert action["decision"] == "DO_NOT_INTERVENE"
    assert action["recommended_action"]["name"] in ["NO_ACTION", None]

    action_high = nba.select_next_best_action(churn_probability=0.8, customer_value=20000.0)
    assert action_high["decision"] == "INTERVENE"
    assert action_high["recommended_action"]["name"] in ["Priority Support", "15% Retention Discount", "Free Technical Support"]
    assert action_high["expected_net_value"] > 0

def test_retention_decision_engine():
    engine = RetentionDecisionEngine(None)
    customer_data = {
        "MonthlyCharges": 200.0,
        "Contract": "Two year",
        "tenure": 10
    }
    analysis = engine.analyze_customer(
        customer_data=customer_data,
        churn_probability=0.9,
        threshold=0.1
    )
    assert analysis["customer_value"] == 4680.0
    assert analysis["decision"] in ["INTERVENE", "DO_NOT_INTERVENE"]
    assert "business_explanation" in analysis
