import os
import sys
from pathlib import Path

# Automatically inject repository root and src/ directory into sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
for path in [str(SRC_DIR), str(ROOT_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from churnguard.database.db import SessionLocal
from churnguard.database.models import User, Company, Base
from churnguard.auth.security import create_access_token, hash_password
from churnguard.auth.dependencies import get_current_active_user, get_current_user
from api.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_default_tenant():
    """
    Ensure default company and user exist in the test database session.
    """
    db = SessionLocal()
    try:
        company = db.query(Company).first()
        if not company:
            company = Company(name="Acme Corp", plan="ENTERPRISE")
            db.add(company)
            db.commit()
            db.refresh(company)

        user = db.query(User).filter_by(email="admin@churnguard.ai").first()
        if not user:
            user = User(
                email="admin@churnguard.ai",
                hashed_password=hash_password("password123"),
                full_name="Admin User",
                role="ADMIN",
                company_id=company.id,
                is_active=True
            )
            db.add(user)
            db.commit()
    finally:
        db.close()


@pytest.fixture
def auth_headers():
    """
    Provide valid JWT Authorization header for test requests.
    """
    token = create_access_token({
        "sub": "admin@churnguard.ai",
        "user_id": 1,
        "company_id": 1,
        "role": "ADMIN"
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_client(auth_headers):
    """
    TestClient pre-configured with valid JWT Authorization header.
    """
    client = TestClient(app)
    client.headers.update(auth_headers)
    return client
