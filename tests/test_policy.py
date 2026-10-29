import pytest
from churnguard.retention.policy_engine import RetentionPolicyEngine

def test_policy_engine_validation():
    policy = RetentionPolicyEngine(minimum_roi=0.20, minimum_expected_net_value=100.0)

    intervention = {
        "id": 1,
        "name": "15% Retention Discount",
        "cost": 500.0,
        "category": "Discount"
    }

    cust_data = {
        "Contract": "Month-to-month",
        "TechSupport": "No",
        "tenure": 12,
        "MonthlyCharges": 85.0
    }

    # Case 1: Eligible
    el = policy.check_eligibility(intervention, cust_data, customer_value=10000.0)
    assert el["eligible"] is True

    # Case 2: Ineligible discount on 2-year contract
    cust_2yr = cust_data.copy()
    cust_2yr["Contract"] = "Two year"
    el_2yr = policy.check_eligibility(intervention, cust_2yr, customer_value=10000.0)
    assert el_2yr["eligible"] is False

    # Case 3: Financial constraints
    val_ok = policy.validate_business_constraints(expected_net_value=500.0, roi=0.50, intervention_cost=500.0)
    assert val_ok["valid"] is True

    val_low_roi = policy.validate_business_constraints(expected_net_value=50.0, roi=0.10, intervention_cost=500.0)
    assert val_low_roi["valid"] is False
