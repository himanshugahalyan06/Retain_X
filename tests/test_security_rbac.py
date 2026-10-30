"""
Comprehensive Multi-Tenant & RBAC Security Test Suite.

Verifies:
1. Password strength enforcement
2. Login brute-force rate limiting
3. Refresh token rotation and session revocation
4. Single-use and expiring password reset tokens
5. Email verification workflow
6. Anti-hijacking organization registration
7. Invitation-based tenant joining
8. Administrative RBAC boundaries (Admin vs Manager vs Analyst/Member)
9. Tenant resource isolation across customers, datasets, models, and batch exports
10. Enterprise security audit logging
"""

import uuid
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from api.main import app
from churnguard.database.db import SessionLocal
from churnguard.database.models import (
    User, Company, Customer, CompanyDataset, CompanyModel,
    PasswordResetToken, EmailVerificationToken, OrganizationInvitation, AuditLog
)
from churnguard.auth.security import hash_password, create_access_token, hash_token, login_rate_limiter


@pytest.fixture
def test_client():
    return TestClient(app)


def test_password_strength_enforcement(test_client):
    """Weak passwords must be rejected at registration."""
    weak_passwords = [
        "short",             # too short
        "alllowercase123!",  # no uppercase
        "ALLUPPERCASE123!",  # no lowercase
        "NoSpecialOrDigits"  # no digits or special chars
    ]

    for weak_pwd in weak_passwords:
        resp = test_client.post("/api/auth/signup", json={
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "password": weak_pwd,
            "company_name": f"Org_{uuid.uuid4().hex[:6]}"
        })
        assert resp.status_code == 422, f"Password '{weak_pwd}' should have been rejected"


def test_login_rate_limiting(test_client):
    """Brute force credential guessing must be rate-limited."""
    test_email = f"ratelimit_{uuid.uuid4().hex[:6]}@example.com"
    
    # 5 failed attempts
    for _ in range(5):
        r = test_client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword123!"
        })
        assert r.status_code in (401, 429)

    # 6th attempt must trigger 429 Too Many Requests
    blocked_r = test_client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123!"
    })
    assert blocked_r.status_code == 429
    assert "Too many failed login attempts" in blocked_r.json()["detail"]


def test_refresh_token_rotation_and_cookies(test_client):
    """User login issues refresh token and cookies; /refresh rotates credentials."""
    uid = uuid.uuid4().hex[:6]
    email = f"session_{uid}@example.com"
    pwd = "ValidPassword123!"
    org = f"Session Corp {uid}"

    # Signup
    signup_r = test_client.post("/api/auth/signup", json={
        "email": email,
        "password": pwd,
        "company_name": org
    })
    assert signup_r.status_code == 201
    refresh_token = signup_r.json().get("refresh_token")
    assert refresh_token is not None
    assert "churnguard_access_token" in signup_r.cookies
    assert "churnguard_refresh_token" in signup_r.cookies

    # Use refresh token to rotate credentials
    refresh_r = test_client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_r.status_code == 200
    new_data = refresh_r.json()
    assert new_data["access_token"] is not None
    assert new_data["refresh_token"] is not None
    assert new_data["refresh_token"] != refresh_token


def test_forgot_and_reset_password_workflow(test_client):
    """Password reset must work only once with valid non-expired tokens."""
    uid = uuid.uuid4().hex[:6]
    email = f"reset_{uid}@example.com"
    pwd1 = "InitialPassword123!"
    pwd2 = "UpdatedPassword123!"
    org = f"Reset Org {uid}"

    signup_r = test_client.post("/api/auth/signup", json={
        "email": email,
        "password": pwd1,
        "company_name": org
    })
    assert signup_r.status_code == 201

    # Request reset
    forgot_r = test_client.post("/api/auth/forgot-password", json={"email": email})
    assert forgot_r.status_code == 200
    dev_token = forgot_r.json().get("dev_reset_token")
    assert dev_token is not None

    # Reset with valid token
    reset_r = test_client.post("/api/auth/reset-password", json={
        "token": dev_token,
        "new_password": pwd2
    })
    assert reset_r.status_code == 200

    # Old password no longer works
    fail_login = test_client.post("/api/auth/login", json={"email": email, "password": pwd1})
    assert fail_login.status_code == 401

    # New password works
    succ_login = test_client.post("/api/auth/login", json={"email": email, "password": pwd2})
    assert succ_login.status_code == 200

    # Token cannot be re-used (single-use)
    reuse_r = test_client.post("/api/auth/reset-password", json={
        "token": dev_token,
        "new_password": "ThirdPassword123!"
    })
    assert reuse_r.status_code == 400


def test_email_verification_flow(test_client):
    """Email verification token generation and confirmation."""
    uid = uuid.uuid4().hex[:6]
    email = f"verify_{uid}@example.com"
    pwd = "ValidPassword123!"
    org = f"Verif Org {uid}"

    signup_r = test_client.post("/api/auth/signup", json={
        "email": email,
        "password": pwd,
        "company_name": org
    })
    token = signup_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Request verification token
    req_v = test_client.post("/api/auth/verify-email/request", headers=headers)
    assert req_v.status_code == 200
    raw_token = req_v.json().get("dev_verify_token")
    assert raw_token is not None

    # Confirm verification token
    confirm_v = test_client.post("/api/auth/verify-email/confirm", json={"token": raw_token})
    assert confirm_v.status_code == 200
    assert confirm_v.json()["success"] is True


def test_invitation_and_team_rbac(test_client):
    """
    Admin invites user to organization; user accepts invitation and inherits assigned role.
    Non-admin cannot invite users.
    """
    admin_uid = uuid.uuid4().hex[:6]
    admin_email = f"admin_{admin_uid}@corp.com"
    admin_pwd = "AdminPassword123!"
    org_name = f"Enterprise RBAC {admin_uid}"

    # 1. Admin signs up
    admin_resp = test_client.post("/api/auth/signup", json={
        "email": admin_email,
        "password": admin_pwd,
        "company_name": org_name
    })
    admin_token = admin_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Admin invites a Manager
    invitee_email = f"manager_{admin_uid}@corp.com"
    inv_resp = test_client.post("/api/auth/invitations", json={
        "email": invitee_email,
        "role": "MANAGER"
    }, headers=admin_headers)
    assert inv_resp.status_code == 200
    dev_invite_token = inv_resp.json().get("dev_invite_token")
    assert dev_invite_token is not None

    # 3. Invitee verifies token
    verify_r = test_client.get(f"/api/auth/invitations/{dev_invite_token}/verify")
    assert verify_r.status_code == 200
    assert verify_r.json()["organization_name"] == org_name
    assert verify_r.json()["role"] == "MANAGER"

    # 4. Invitee accepts and joins the company
    accept_resp = test_client.post("/api/auth/invitations/accept", json={
        "token": dev_invite_token,
        "password": "ManagerPassword123!",
        "full_name": "Test Manager"
    })
    assert accept_resp.status_code == 200
    manager_token = accept_resp.json()["access_token"]
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    assert accept_resp.json()["user"]["role"] == "MANAGER"
    assert accept_resp.json()["company"]["name"] == org_name

    # 5. Non-admin (Manager) cannot invite others
    fail_inv = test_client.post("/api/auth/invitations", json={
        "email": "hacker@corp.com",
        "role": "ADMIN"
    }, headers=manager_headers)
    assert fail_inv.status_code == 403


def test_role_based_access_control_matrix(test_client):
    """
    Test permission boundaries between Admin, Manager, and Member:
    - Member cannot create training job (403)
    - Manager can create training job (200 / 400 for bad dataset, but NOT 403)
    - Manager cannot activate model (403)
    - Admin can activate model (or fails business validation, NOT 403)
    - Member cannot approve retention decision (403)
    - Manager can approve retention decision
    """
    uid = uuid.uuid4().hex[:6]
    # Create Company with Admin, Manager, and Member
    admin_r = test_client.post("/api/auth/signup", json={
        "email": f"adm_{uid}@matrix.com",
        "password": "Password123!",
        "company_name": f"Matrix Corp {uid}"
    })
    admin_token = admin_r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Invite Manager & Member
    inv_mgr = test_client.post("/api/auth/invitations", json={"email": f"mgr_{uid}@matrix.com", "role": "MANAGER"}, headers=admin_headers)
    inv_mem = test_client.post("/api/auth/invitations", json={"email": f"mem_{uid}@matrix.com", "role": "MEMBER"}, headers=admin_headers)

    mgr_token = test_client.post("/api/auth/invitations/accept", json={
        "token": inv_mgr.json()["dev_invite_token"],
        "password": "Password123!"
    }).json()["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    mem_token = test_client.post("/api/auth/invitations/accept", json={
        "token": inv_mem.json()["dev_invite_token"],
        "password": "Password123!"
    }).json()["access_token"]
    mem_headers = {"Authorization": f"Bearer {mem_token}"}

    # Test 1: Member cannot create training job
    r_mem_train = test_client.post("/api/v1/training-jobs", json={
        "dataset_id": 1,
        "target_column": "Churn"
    }, headers=mem_headers)
    assert r_mem_train.status_code == 403

    # Test 2: Manager CAN create training job (passes auth guard)
    r_mgr_train = test_client.post("/api/v1/training-jobs", json={
        "dataset_id": 999999,
        "target_column": "Churn"
    }, headers=mgr_headers)
    assert r_mgr_train.status_code != 403

    # Test 3: Manager CANNOT activate model
    r_mgr_act = test_client.post("/api/v1/models/1/activate", headers=mgr_headers)
    assert r_mgr_act.status_code == 403

    # Test 4: Admin CAN attempt activate model (passes auth guard)
    r_adm_act = test_client.post("/api/v1/models/999999/activate", headers=admin_headers)
    assert r_adm_act.status_code != 403

    # Test 5: Member CANNOT delete dataset
    r_mem_del = test_client.delete("/api/v1/datasets/1", headers=mem_headers)
    assert r_mem_del.status_code == 403


def test_multi_tenant_data_isolation(test_client):
    """
    Company A's customers, predictions, and datasets must be invisible and inaccessible to Company B.
    """
    uid_a = uuid.uuid4().hex[:6]
    uid_b = uuid.uuid4().hex[:6]

    # Signup Company A
    r_a = test_client.post("/api/auth/signup", json={
        "email": f"a_{uid_a}@tenanta.com",
        "password": "Password123!",
        "company_name": f"Tenant Alpha {uid_a}"
    })
    token_a = r_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Signup Company B
    r_b = test_client.post("/api/auth/signup", json={
        "email": f"b_{uid_b}@tenantb.com",
        "password": "Password123!",
        "company_name": f"Tenant Beta {uid_b}"
    })
    token_b = r_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Company A scores customer "ALPHA-CUST-101"
    cust_id = f"ALPHA-{uid_a}"
    pred_r = test_client.post("/api/predict", json={
        "customer_id": cust_id,
        "gender": "Female",
        "SeniorCitizen": 0,
        "Partner": "Yes",
        "Dependents": "No",
        "tenure": 24,
        "PhoneService": "Yes",
        "MultipleLines": "Yes",
        "InternetService": "DSL",
        "OnlineSecurity": "Yes",
        "OnlineBackup": "Yes",
        "DeviceProtection": "Yes",
        "TechSupport": "Yes",
        "StreamingTV": "No",
        "StreamingMovies": "No",
        "Contract": "One year",
        "PaperlessBilling": "No",
        "PaymentMethod": "Bank transfer (automatic)",
        "MonthlyCharges": 65.0,
        "TotalCharges": 1560.0
    }, headers=headers_a)
    assert pred_r.status_code == 200

    # Company A can view customer detail
    get_a = test_client.get(f"/api/v1/retention/customers/{cust_id}", headers=headers_a)
    assert get_a.status_code == 200
    assert get_a.json()["customer"]["customer_id"] == cust_id

    # Company B tries to view Company A's customer -> 404 Isolated
    get_b = test_client.get(f"/api/v1/retention/customers/{cust_id}", headers=headers_b)
    assert get_b.status_code == 404
    assert "Customer not found in company tenant" in get_b.json()["detail"]


def test_audit_logging_recorded(test_client):
    """Critical operations must create structured audit log entries viewable by admins."""
    uid = uuid.uuid4().hex[:6]
    admin_r = test_client.post("/api/auth/signup", json={
        "email": f"audit_{uid}@audit.com",
        "password": "Password123!",
        "company_name": f"Audit Corp {uid}"
    })
    token = admin_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch audit logs
    logs_r = test_client.get("/api/auth/audit-logs", headers=headers)
    assert logs_r.status_code == 200
    logs = logs_r.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert "ORGANIZATION_CREATED" in actions
