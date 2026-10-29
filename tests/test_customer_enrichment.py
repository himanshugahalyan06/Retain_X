import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from churnguard.database.models import (
    Base,
    Customer,
    CustomerBehavioralData,
    CustomerCRMData,
    CustomerSupportData,
    CustomerPaymentData,
    BusinessSettings,
    Intervention
)
from churnguard.database.seed import seed_enriched_customer_data
from api.schemas import (
    CustomerRequest,
    BehavioralDataSchema,
    CRMDataSchema,
    SupportDataSchema,
    PaymentDataSchema
)
from api.main import app

# In-memory SQLite session fixture for isolated model tests
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Initialize basic settings
    settings = BusinessSettings(id=1, optimized_threshold=0.35)
    db.add(settings)
    db.commit()

    try:
        yield db
    finally:
        db.close()

def test_enrichment_models_creation_and_relations(db_session):
    """
    Verify creation of Customer and foreign-key linked Behavioral, CRM, Support, and Payment records.
    """
    cust = Customer(
        customer_id="CG-TEST-001",
        gender="Female",
        SeniorCitizen=0,
        Partner="Yes",
        Dependents="No",
        tenure=24,
        PhoneService="Yes",
        MultipleLines="No",
        InternetService="Fiber optic",
        OnlineSecurity="Yes",
        OnlineBackup="Yes",
        DeviceProtection="Yes",
        TechSupport="Yes",
        StreamingTV="No",
        StreamingMovies="No",
        Contract="One year",
        PaperlessBilling="Yes",
        PaymentMethod="Credit card (automatic)",
        MonthlyCharges=65.5,
        TotalCharges=1572.0
    )
    db_session.add(cust)
    db_session.commit()

    # Add Behavioral record
    beh = CustomerBehavioralData(
        customer_id=cust.customer_id,
        login_frequency=18.5,
        feature_usage_count=120,
        avg_session_duration_minutes=32.0,
        last_active_date=datetime.utcnow(),
        days_since_last_login=1
    )
    # Add CRM record
    crm = CustomerCRMData(
        customer_id=cust.customer_id,
        lifecycle_stage="active",
        account_owner="Sarah Jenkins",
        deal_value=3500.0,
        last_contact_date=datetime.utcnow()
    )
    # Add Support record
    sup = CustomerSupportData(
        customer_id=cust.customer_id,
        total_tickets=1,
        avg_resolution_time_hours=3.5,
        last_csat_score=5
    )
    # Add Payment record
    pay = CustomerPaymentData(
        customer_id=cust.customer_id,
        failed_payments_count=0,
        plan_downgrades_count=0,
        days_since_last_payment_delay=0
    )
    db_session.add_all([beh, crm, sup, pay])
    db_session.commit()

    # Query customer and verify relationships
    queried_cust = db_session.query(Customer).filter_by(customer_id="CG-TEST-001").first()
    assert queried_cust is not None
    assert len(queried_cust.behavioral_data) == 1
    assert queried_cust.behavioral_data[0].feature_usage_count == 120
    assert queried_cust.crm_data[0].account_owner == "Sarah Jenkins"
    assert queried_cust.support_data[0].last_csat_score == 5
    assert queried_cust.payment_data[0].failed_payments_count == 0

def test_seeding_correlation_high_risk_vs_low_risk(db_session):
    """
    Verify that synthetic seeding generates lower usage, more tickets, and payment delays
    for high-risk churn customers compared to low-risk customers.
    """
    high_risk_cust = Customer(
        customer_id="CG-HIGH-01",
        MonthlyCharges=95.0,
        Contract="Month-to-month",
        tenure=4
    )
    low_risk_cust = Customer(
        customer_id="CG-LOW-01",
        MonthlyCharges=60.0,
        Contract="Two year",
        tenure=36
    )
    db_session.add_all([high_risk_cust, low_risk_cust])
    db_session.commit()

    # Seed high risk (prob = 0.85)
    seed_enriched_customer_data(db_session, high_risk_cust, prob=0.85)
    # Seed low risk (prob = 0.10)
    seed_enriched_customer_data(db_session, low_risk_cust, prob=0.10)
    db_session.commit()

    high_beh = db_session.query(CustomerBehavioralData).filter_by(customer_id="CG-HIGH-01").first()
    low_beh = db_session.query(CustomerBehavioralData).filter_by(customer_id="CG-LOW-01").first()
    high_sup = db_session.query(CustomerSupportData).filter_by(customer_id="CG-HIGH-01").first()
    low_sup = db_session.query(CustomerSupportData).filter_by(customer_id="CG-LOW-01").first()
    high_pay = db_session.query(CustomerPaymentData).filter_by(customer_id="CG-HIGH-01").first()
    low_pay = db_session.query(CustomerPaymentData).filter_by(customer_id="CG-LOW-01").first()

    # Behavioral checks: low risk has higher usage and logins
    assert low_beh.login_frequency > high_beh.login_frequency
    assert low_beh.feature_usage_count > high_beh.feature_usage_count
    assert low_beh.avg_session_duration_minutes > high_beh.avg_session_duration_minutes

    # Support checks: high risk has more tickets and lower/equal CSAT
    assert high_sup.total_tickets >= low_sup.total_tickets
    assert high_sup.last_csat_score <= low_sup.last_csat_score

    # Payment checks: high risk has potential failed payments
    assert high_pay.failed_payments_count >= low_pay.failed_payments_count
    assert low_pay.failed_payments_count == 0

def test_pydantic_schema_backward_compatibility():
    """
    Ensure legacy request without any enriched fields still validates seamlessly.
    """
    legacy_payload = {
        "gender": "Male",
        "SeniorCitizen": 0,
        "Partner": "Yes",
        "Dependents": "No",
        "tenure": 12,
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
        "TotalCharges": 1020.0
    }
    req = CustomerRequest(**legacy_payload)
    assert req.tenure == 12
    assert req.login_frequency is None
    assert req.lifecycle_stage is None
    assert req.total_tickets is None
    assert req.failed_payments_count is None

def test_pydantic_schema_with_flat_and_nested_enrichment():
    """
    Ensure request with flat or nested enriched data parses correctly.
    """
    enriched_payload = {
        "tenure": 18,
        "MonthlyCharges": 90.0,
        "login_frequency": 22.0,
        "lifecycle_stage": "active",
        "account_owner": "David Kim",
        "total_tickets": 1,
        "failed_payments_count": 0,
        "behavioral": {
            "feature_usage_count": 140,
            "avg_session_duration_minutes": 28.5
        },
        "support": {
            "avg_resolution_time_hours": 2.4,
            "last_csat_score": 5
        }
    }
    req = CustomerRequest(**enriched_payload)
    assert req.login_frequency == 22.0
    assert req.account_owner == "David Kim"
    assert req.behavioral.feature_usage_count == 140
    assert req.support.last_csat_score == 5

def test_predict_endpoint_backward_compatibility(monkeypatch, auth_headers):
    """
    Test that calling the FastAPI predict endpoint with legacy Telco payload works properly.
    """
    class MockPredictor:
        def predict(self, df):
            return {"probability": 0.65, "prediction": 1, "threshold": 0.35}

    class MockExplainer:
        def explain(self, df):
            import pandas as pd
            return pd.DataFrame([{"Feature": "Contract", "SHAP": 0.25, "Impact": 0.25}])

    monkeypatch.setattr("api.routes.predict.predictor", MockPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.ChurnPredictor", lambda: MockPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.SHAPExplainer", lambda: MockExplainer())

    client = TestClient(app)
    payload = {
        "customer_id": "CG-PRED-TEST-1",
        "gender": "Female",
        "tenure": 6,
        "MonthlyCharges": 75.0,
        "TotalCharges": 450.0,
        "Contract": "Month-to-month",
        "InternetService": "Fiber optic",
        # Enriched fields included
        "login_frequency": 2.0,
        "lifecycle_stage": "at_risk",
        "total_tickets": 5,
        "failed_payments_count": 2
    }
    response = client.post("/api/predict", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "risk" in data
    assert "churn_probability" in data["risk"]
    assert "recommendation" in data
    assert "economics" in data
