import uuid
import pytest
from fastapi.testclient import TestClient
from api.main import app
from churnguard.auth.security import create_access_token, decode_access_token, hash_password, verify_password


@pytest.fixture
def client():
    return TestClient(app)


def test_password_hashing_and_verification():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    data = {"sub": "test@company.com", "user_id": 42, "company_id": 7, "role": "ADMIN"}
    token = create_access_token(data)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "test@company.com"
    assert payload["company_id"] == 7
    assert payload["role"] == "ADMIN"


def test_signup_creates_new_company_and_user(client):
    unique_email = f"user_{id(client)}@saastest.com"
    payload = {
        "email": unique_email,
        "password": "Password123!",
        "company_name": f"Tenant Corp {id(client)}",
        "full_name": "Tenant Admin"
    }

    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"] == "ADMIN"
    assert data["company"]["name"] == f"Tenant Corp {id(client)}"


def test_signup_duplicate_email_fails(client):
    uid = uuid.uuid4().hex[:8]
    email = f"dup_{uid}@saastest.com"
    company = f"Unique Co {uid}"
    payload = {
        "email": email,
        "password": "Password123!",
        "company_name": company
    }
    r1 = client.post("/api/auth/signup", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/api/auth/signup", json=payload)
    assert r2.status_code == 400
    assert "already exists" in r2.json()["detail"]


def test_signup_company_hijacking_fails(client):
    uid = uuid.uuid4().hex[:8]
    company = f"Protected Enterprise {uid}"

    # 1. First user legitimately registers the company
    r1 = client.post("/api/auth/signup", json={
        "email": f"owner_{uid}@enterprise.com",
        "password": "Password123!",
        "company_name": company
    })
    assert r1.status_code == 201

    # 2. Unrelated user tries to self-register into the existing company
    r2 = client.post("/api/auth/signup", json={
        "email": f"attacker_{uid}@other.com",
        "password": "Password123!",
        "company_name": company
    })
    assert r2.status_code == 409
    assert "invitation from an organization administrator is required" in r2.json()["detail"]


def test_login_success_and_invalid_credentials(client):
    uid = uuid.uuid4().hex[:8]
    email = f"login_test_{uid}@saastest.com"
    password = "CorrectPassword123"
    client.post("/api/auth/signup", json={
        "email": email,
        "password": password,
        "company_name": f"Login Corp {uid}"
    })

    # 1. Invalid password
    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword"
    })
    assert bad_login.status_code == 401

    # 2. Correct password
    good_login = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert good_login.status_code == 200
    token_data = good_login.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. Test /me profile endpoint with Bearer token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email


def test_unauthenticated_request_to_protected_endpoints(client):
    # Calls without token should return 401
    r_predict = client.post("/predict", json={"Contract": "Month-to-month"})
    assert r_predict.status_code == 401

    r_explain = client.post("/explain", json={"Contract": "Month-to-month"})
    assert r_explain.status_code == 401

    r_metrics = client.get("/metrics")
    assert r_metrics.status_code == 401


def test_tenant_isolation_data_separation(client, monkeypatch):
    class MockPredictor:
        def predict(self, df):
            return {"probability": 0.80, "prediction": 1, "threshold": 0.5}

    monkeypatch.setattr("api.routes.predict.predictor", MockPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.ChurnPredictor", lambda *args, **kwargs: MockPredictor())

    # Tenant A Signup & Predict
    res_a = client.post("/api/auth/signup", json={
        "email": f"tenant_a_{id(client)}@corp-a.com",
        "password": "PasswordA!",
        "company_name": f"Company A {id(client)}"
    })
    token_a = res_a.json()["access_token"]
    cid_a = res_a.json()["company"]["id"]

    cust_a_id = f"CUST-A-{id(client)}"
    pred_a = client.post(
        "/predict",
        json={"customer_id": cust_a_id, "Contract": "Month-to-month", "MonthlyCharges": 99.0},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert pred_a.status_code == 200
    pred_a_id = pred_a.json()["prediction_id"]

    # Tenant B Signup
    res_b = client.post("/api/auth/signup", json={
        "email": f"tenant_b_{id(client)}@corp-b.com",
        "password": "PasswordB!",
        "company_name": f"Company B {id(client)}"
    })
    token_b = res_b.json()["access_token"]
    cid_b = res_b.json()["company"]["id"]
    assert cid_a != cid_b

    # Tenant B tries to retrieve Tenant A's prediction -> Must be 404 (isolated)
    pred_lookup_b = client.get(
        f"/v1/predictions/{pred_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert pred_lookup_b.status_code == 404

    # Tenant B tries to view Tenant A's customer details -> Must be 404 (isolated)
    cust_lookup_b = client.get(
        f"/v1/retention/customers/{cust_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert cust_lookup_b.status_code == 404

    # Tenant A can retrieve their own prediction & customer
    pred_lookup_a = client.get(
        f"/v1/predictions/{pred_a_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert pred_lookup_a.status_code == 200
    assert pred_lookup_a.json()["customer_id"] == cust_a_id
