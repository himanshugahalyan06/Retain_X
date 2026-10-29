"""
Authentication Endpoints for Multi-Tenant SaaS.
Provides Signup, Login, and Profile (/me) endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, Union

from api.dependencies import get_db
from api.schemas import UserSignupRequest, UserLoginRequest, TokenResponse, UserOut, CompanyOut
from churnguard.database.models import User, Company
from churnguard.auth.security import (
    hash_password,
    verify_password,
    create_access_token
)
from churnguard.auth.dependencies import get_current_active_user

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(request: UserSignupRequest, db: Session = Depends(get_db)):
    """
    Register a new tenant user and company.
    """
    clean_email = request.email.strip().lower()
    clean_company = request.company_name.strip()

    if not clean_email or not request.password or not clean_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email, password, and company name are required."
        )

    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Check if company already exists to prevent unauthorized tenant hijacking
    existing_company = db.query(Company).filter(Company.name == clean_company).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An organization named '{clean_company}' already exists. To join an existing organization, an invitation from an organization administrator is required."
        )

    # Create new isolated company tenant
    company = Company(
        name=clean_company,
        plan="ENTERPRISE"
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # Create new initial organization administrator
    new_user = User(
        email=clean_email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name or clean_email.split("@")[0].capitalize(),
        company_id=company.id,
        role="ADMIN",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)


    access_token = create_access_token(
        data={
            "sub": new_user.email,
            "user_id": new_user.id,
            "company_id": company.id,
            "company_name": company.name,
            "role": new_user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "company_id": company.id,
            "company_name": company.name,
            "created_at": new_user.created_at
        },
        "company": {
            "id": company.id,
            "name": company.name,
            "plan": company.plan,
            "created_at": company.created_at
        }
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user via JSON body or standard OAuth2 password form.
    """
    email = None
    password = None

    # Check content type to handle JSON or Form data seamlessly
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
        except Exception:
            pass
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form = await request.form()
            email = form.get("username") or form.get("email")
            password = form.get("password")
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid email and password must be provided."
        )

    clean_email = str(email).strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user or not verify_password(str(password), user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    company = user.company
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "company_id": user.company_id,
            "company_name": company.name if company else None,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": company.name if company else None,
            "created_at": user.created_at
        },
        "company": {
            "id": company.id if company else 0,
            "name": company.name if company else "Default",
            "plan": company.plan if company else "ENTERPRISE",
            "created_at": company.created_at if company else None
        }
    }


@router.get("/me", response_model=UserOut)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get profile information of the currently authenticated tenant user.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "company_id": current_user.company_id,
        "company_name": current_user.company.name if current_user.company else None,
        "created_at": current_user.created_at
    }
