import io
import uuid
import pytest
from fastapi.testclient import TestClient

from api.main import app
from churnguard.database.db import SessionLocal
from churnguard.database.models import User, Company, Intervention
from churnguard.auth.security import create_access_token, hash_password


@pytest.fixture
def test_tenants():
    db = SessionLocal()
    try:
        uid = uuid.uuid4().hex[:8]
        comp_a = Company(name=f"Batch Corp A {uid}", plan="ENTERPRISE")
        comp_b = Company(name=f"Batch Corp B {uid}", plan="ENTERPRISE")
        db.add_all([comp_a, comp_b])
        db.commit()
        db.refresh(comp_a)
        db.refresh(comp_b)

        user_a = User(
            email=f"admin_a_{uid}@test.com",
            hashed_password=hash_password("Password123!"),
            full_name="Admin A",
            role="ADMIN",
            company_id=comp_a.id,
            is_active=True
        )
        user_b = User(
            email=f"admin_b_{uid}@test.com",
            hashed_password=hash_password("Password123!"),
            full_name="Admin B",
            role="ADMIN",
            company_id=comp_b.id,
            is_active=True
        )
        db.add_all([user_a, user_b])
        db.commit()
        db.refresh(user_a)
        db.refresh(user_b)

        token_a = create_access_token({"sub": user_a.email, "user_id": user_a.id, "company_id": comp_a.id, "role": "ADMIN"})
        token_b = create_access_token({"sub": user_b.email, "user_id": user_b.id, "company_id": comp_b.id, "role": "ADMIN"})

        client_a = TestClient(app)
        client_a.headers.update({"Authorization": f"Bearer {token_a}"})

        client_b = TestClient(app)
        client_b.headers.update({"Authorization": f"Bearer {token_b}"})

        return {
            "comp_a": comp_a,
            "comp_b": comp_b,
            "client_a": client_a,
            "client_b": client_b
        }
    finally:
        db.close()


def test_batch_csv_upload_and_export_isolation(test_tenants):
    client_a = test_tenants["client_a"]
    client_b = test_tenants["client_b"]

    # Create CSV test buffer with valid customer data
    uid = uuid.uuid4().hex[:6]
    csv_data = (
        "customer_id,gender,SeniorCitizen,Partner,Dependents,tenure,PhoneService,MultipleLines,"
        "InternetService,OnlineSecurity,OnlineBackup,DeviceProtection,TechSupport,StreamingTV,"
        "StreamingMovies,Contract,PaperlessBilling,PaymentMethod,MonthlyCharges,TotalCharges\n"
        f"TEST-CUST-{uid}-01,Female,0,Yes,No,1,No,No phone service,DSL,No,Yes,No,No,No,No,Month-to-month,Yes,Electronic check,29.85,29.85\n"
        f"TEST-CUST-{uid}-02,Male,0,No,No,34,Yes,Yes,Fiber optic,Yes,No,Yes,No,No,No,One year,No,Mailed check,56.95,1889.5\n"
    )
    file_bytes = io.BytesIO(csv_data.encode("utf-8"))

    # Tenant A uploads CSV
    res_a = client_a.post(
        "/api/v1/customers/batch-upload",
        files={"file": ("customers.csv", file_bytes, "text/csv")}
    )
    assert res_a.status_code == 200
    upload_data = res_a.json()
    assert upload_data["total_records"] == 2
    assert "job_id" in upload_data
    job_id = upload_data["job_id"]

    # Tenant A downloads the scored export CSV
    export_a = client_a.get(f"/api/v1/customers/batch-export/{job_id}")
    assert export_a.status_code == 200
    assert "churn_probability" in export_a.text

    # Tenant B tries to download Tenant A's export -> 404 forbidden/not found
    export_b = client_b.get(f"/api/v1/customers/batch-export/{job_id}")
    assert export_b.status_code == 404


def test_recalculate_threshold_endpoint(test_tenants):
    client_a = test_tenants["client_a"]

    # Test dynamic threshold recalibration with business cost inputs
    payload = {
        "cost_fp": 1000.0,
        "cost_fn": 10000.0,
        "min_precision": 0.30,
        "min_recall": 0.50
    }
    res = client_a.post("/api/v1/retention/recalculate-threshold", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "new_threshold" in data
    assert 0.05 <= data["new_threshold"] <= 0.95
    assert data["success"] is True


def test_intervention_delete_and_tenant_scoping(test_tenants):
    client_a = test_tenants["client_a"]
    client_b = test_tenants["client_b"]
    comp_a = test_tenants["comp_a"]

    db = SessionLocal()
    try:
        # Create an intervention for Tenant A
        interv = Intervention(
            name="Test Retention Offer",
            description="Special discount",
            company_id=comp_a.id,
            cost=50.0,
            expected_effectiveness=0.25,
            active=True
        )
        db.add(interv)
        db.commit()
        db.refresh(interv)
        interv_id = interv.id
    finally:
        db.close()

    # Tenant B tries to delete Tenant A's intervention -> 404
    del_b = client_b.delete(f"/api/v1/retention/interventions/{interv_id}")
    assert del_b.status_code == 404

    # Tenant A deletes their own intervention -> 200
    del_a = client_a.delete(f"/api/v1/retention/interventions/{interv_id}")
    assert del_a.status_code == 200
    assert del_a.json()["message"] == f"Intervention {interv_id} deleted successfully"
