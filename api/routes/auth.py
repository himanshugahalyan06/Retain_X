"""
Comprehensive Authentication & Identity Management Endpoints.

Provides:
- Multi-Tenant Signup (Creates new isolated Organization & Admin)
- Secure Login (Rate limiting, password verification, Access & Refresh token rotation, HttpOnly Cookies)
- Token Refresh (/refresh)
- Secure Logout (/logout)
- Current Profile (/me)
- Forgot Password & Reset Password workflows (Expiring, single-use tokens, enumeration protection)
- Email Verification workflows
- Organization Invitations & Acceptance (Controlled joining without tenant hijacking)
- Team Management & Role Administration (Admin RBAC)
- Organization Audit Logging
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from sqlalchemy.orm import Session

from api.dependencies import get_db
from api.schemas import (
    UserSignupRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    InviteUserRequest,
    AcceptInviteRequest,
    UpdateUserRoleRequest,
    UserOut,
    CompanyOut
)
from churnguard.database.models import (
    User,
    Company,
    PasswordResetToken,
    EmailVerificationToken,
    OrganizationInvitation,
    AuditLog
)
from churnguard.auth.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    generate_secure_token,
    hash_token,
    login_rate_limiter,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS
)
from churnguard.auth.dependencies import (
    get_current_active_user,
    require_admin,
    require_roles,
    log_audit_event
)

router = APIRouter()

IS_PRODUCTION = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower() in ("production", "prod")


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """
    Set secure HttpOnly cookies on response for browser session persistence.
    """
    # Access token cookie (short-lived)
    response.set_cookie(
        key="churnguard_access_token",
        value=access_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    # Refresh token cookie (7 days)
    response.set_cookie(
        key="churnguard_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )


def clear_auth_cookies(response: Response):
    """Clear session cookies upon logout."""
    response.delete_cookie(key="churnguard_access_token", path="/")
    response.delete_cookie(key="churnguard_refresh_token", path="/")
    response.delete_cookie(key="access_token", path="/")


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    request: UserSignupRequest,
    response: Response,
    req_meta: Request,
    db: Session = Depends(get_db)
):
    """
    Register a new organization and initial administrator account.
    Never adds user to an existing organization; requires invitation for existing tenants.
    """
    clean_email = request.email.strip().lower()
    clean_company = request.company_name.strip()

    if not clean_email or not request.password or not clean_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email, password, and organization name are required."
        )

    # 1. Enforce password complexity
    valid_pwd, pwd_error = validate_password_strength(request.password)
    if not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=pwd_error
        )

    # 2. Check if user email already exists
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Check if company already exists to prevent unauthorized tenant hijacking
    existing_company = db.query(Company).filter(Company.name == clean_company).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An organization named '{clean_company}' already exists. To join an existing organization, an invitation from an organization administrator is required."
        )

    # 4. Create new isolated company tenant
    company = Company(
        name=clean_company,
        plan="ENTERPRISE"
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # 5. Create new organization administrator
    new_user = User(
        email=clean_email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name or clean_email.split("@")[0].capitalize(),
        company_id=company.id,
        role="ADMIN",
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 6. Audit log organization creation
    client_ip = req_meta.client.host if req_meta.client else None
    log_audit_event(
        db=db,
        company_id=company.id,
        user_id=new_user.id,
        user_email=new_user.email,
        action="ORGANIZATION_CREATED",
        resource_type="COMPANY",
        resource_id=str(company.id),
        ip_address=client_ip,
        details={"company_name": company.name, "admin_email": new_user.email}
    )

    # 7. Generate tokens & set cookies
    token_claims = {
        "sub": new_user.email,
        "user_id": new_user.id,
        "company_id": company.id,
        "company_name": company.name,
        "role": new_user.role
    }
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
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
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with rate limiting, password verification, and refresh session generation.
    Supports both JSON and form data seamlessly.
    """
    email = None
    password = None

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
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{clean_email}"

    # Rate limiting check
    if login_rate_limiter.is_rate_limited(rate_limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 5 minutes before trying again."
        )

    user = db.query(User).filter(User.email == clean_email).first()

    # Protect against timing attacks & enumeration with identical failure message
    if not user or not verify_password(str(password), user.hashed_password):
        login_rate_limiter.record_failure(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your organization administrator."
        )

    login_rate_limiter.record_success(rate_limit_key)

    company = user.company
    token_claims = {
        "sub": user.email,
        "user_id": user.id,
        "company_id": user.company_id,
        "company_name": company.name if company else None,
        "role": user.role
    }

    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    set_auth_cookies(response, access_token, refresh_token)

    log_audit_event(
        db=db,
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action="USER_LOGIN",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=client_ip
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
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


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Exchange a valid refresh token for a new access token and rotated refresh token.
    Extracts refresh token from JSON body or HttpOnly cookie.
    """
    token_to_verify = None
    if body and body.refresh_token:
        token_to_verify = body.refresh_token
    elif request.cookies.get("churnguard_refresh_token"):
        token_to_verify = request.cookies.get("churnguard_refresh_token")

    if not token_to_verify:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required."
        )

    payload = decode_access_token(token_to_verify)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account invalid or inactive."
        )

    company = user.company
    token_claims = {
        "sub": user.email,
        "user_id": user.id,
        "company_id": user.company_id,
        "company_name": company.name if company else None,
        "role": user.role
    }

    new_access_token = create_access_token(token_claims)
    new_refresh_token = create_refresh_token(token_claims)

    set_auth_cookies(response, new_access_token, new_refresh_token)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
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


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Invalidate session cookies and record logout audit event.
    """
    clear_auth_cookies(response)
    if current_user:
        log_audit_event(
            db=db,
            company_id=current_user.company_id,
            user_id=current_user.id,
            user_email=current_user.email,
            action="USER_LOGOUT",
            resource_type="USER",
            resource_id=str(current_user.id),
            ip_address=request.client.host if request.client else None
        )
    return {"success": True, "message": "Successfully logged out."}


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


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    req_meta: Request,
    db: Session = Depends(get_db)
):
    """
    Request password reset instructions.
    To prevent account enumeration, always returns an identical success message.
    """
    clean_email = request.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    raw_token = None
    if user and user.is_active:
        # Invalidate existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).update({"used": True})

        raw_token = generate_secure_token()
        hashed = hash_token(raw_token)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hashed,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            used=False
        )
        db.add(reset_token)
        db.commit()

        log_audit_event(
            db=db,
            company_id=user.company_id,
            user_id=user.id,
            user_email=user.email,
            action="PASSWORD_RESET_REQUESTED",
            resource_type="USER",
            resource_id=str(user.id),
            ip_address=req_meta.client.host if req_meta.client else None
        )

    # In development/test mode, return the token in the response payload for easy automated testing
    response_payload = {
        "success": True,
        "message": "If an account matching that email address exists, password reset instructions have been sent."
    }
    if not IS_PRODUCTION and raw_token:
        response_payload["dev_reset_token"] = raw_token
        response_payload["dev_reset_link"] = f"/reset-password?token={raw_token}"

    return response_payload


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    req_meta: Request,
    db: Session = Depends(get_db)
):
    """
    Reset account password using a validated, single-use, non-expired token.
    """
    if not request.token or not request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token and new password are required."
        )

    # Validate password complexity
    valid_pwd, pwd_error = validate_password_strength(request.new_password)
    if not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=pwd_error
        )

    token_hash_val = hash_token(request.token)
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash_val,
        PasswordResetToken.used == False
    ).first()

    if not token_record or token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user = token_record.user
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account associated with this token is invalid or inactive."
        )

    # Update password and invalidate token
    user.hashed_password = hash_password(request.new_password)
    token_record.used = True
    db.commit()

    log_audit_event(
        db=db,
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action="PASSWORD_RESET_COMPLETED",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=req_meta.client.host if req_meta.client else None
    )

    return {
        "success": True,
        "message": "Password has been successfully updated. You may now sign in with your new password."
    }


@router.post("/verify-email/request")
def request_email_verification(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate email verification token for the authenticated user."""
    raw_token = generate_secure_token()
    token_hash_val = hash_token(raw_token)

    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == current_user.id,
        EmailVerificationToken.used == False
    ).update({"used": True})

    verif_token = EmailVerificationToken(
        user_id=current_user.id,
        token_hash=token_hash_val,
        expires_at=datetime.utcnow() + timedelta(days=1),
        used=False
    )
    db.add(verif_token)
    db.commit()

    resp = {
        "success": True,
        "message": "Verification email dispatched."
    }
    if not IS_PRODUCTION:
        resp["dev_verify_token"] = raw_token
        resp["dev_verify_link"] = f"/verify-email?token={raw_token}"
    return resp


@router.post("/verify-email/confirm")
def confirm_email_verification(
    request: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """Confirm email address via valid token."""
    token_hash_val = hash_token(request.token)
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash_val,
        EmailVerificationToken.used == False
    ).first()

    if not token_record or token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token."
        )

    user = token_record.user
    user.is_verified = True
    token_record.used = True
    db.commit()

    return {
        "success": True,
        "message": "Email address verified successfully."
    }


# ----------------------------------------------------
# Organization Team Management & Invitations (RBAC)
# ----------------------------------------------------

@router.post("/invitations")
def invite_user_to_organization(
    request: InviteUserRequest,
    req_meta: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Invite a new team member to the administrator's organization with a specific role.
    Only ADMINs may issue invitations.
    """
    clean_email = request.email.strip().lower()
    role = request.role.upper()
    if role not in ("ADMIN", "MANAGER", "MEMBER", "ANALYST"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: ADMIN, MANAGER, MEMBER, ANALYST"
        )

    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already belongs to an organization."
        )

    raw_token = generate_secure_token()
    token_hash_val = hash_token(raw_token)

    # Invalidate existing pending invites for this email
    db.query(OrganizationInvitation).filter(
        OrganizationInvitation.company_id == current_user.company_id,
        OrganizationInvitation.email == clean_email,
        OrganizationInvitation.accepted == False
    ).delete()

    invitation = OrganizationInvitation(
        company_id=current_user.company_id,
        email=clean_email,
        role=role,
        token_hash=token_hash_val,
        invited_by_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        accepted=False
    )
    db.add(invitation)
    db.commit()

    log_audit_event(
        db=db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="USER_INVITED",
        resource_type="INVITATION",
        details={"invited_email": clean_email, "role": role},
        ip_address=req_meta.client.host if req_meta.client else None
    )

    resp = {
        "success": True,
        "message": f"Invitation created for {clean_email} with role {role}.",
        "invitation_id": invitation.id
    }
    if not IS_PRODUCTION:
        resp["dev_invite_token"] = raw_token
        resp["dev_invite_link"] = f"/invite/accept?token={raw_token}"
    return resp


@router.get("/invitations")
def list_pending_invitations(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List pending invitations for the administrator's organization."""
    invites = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.company_id == current_user.company_id,
        OrganizationInvitation.accepted == False,
        OrganizationInvitation.expires_at > datetime.utcnow()
    ).all()

    return [
        {
            "id": inv.id,
            "email": inv.email,
            "role": inv.role,
            "expires_at": inv.expires_at.isoformat(),
            "created_at": inv.created_at.isoformat()
        }
        for inv in invites
    ]


@router.get("/invitations/{token}/verify")
def verify_invitation_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Public endpoint to verify invitation token validity before presenting accept form."""
    token_hash_val = hash_token(token)
    inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.token_hash == token_hash_val,
        OrganizationInvitation.accepted == False
    ).first()

    if not inv or inv.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid, already accepted, or expired."
        )

    return {
        "valid": True,
        "email": inv.email,
        "organization_name": inv.company.name,
        "role": inv.role
    }


@router.post("/invitations/accept", response_model=TokenResponse)
def accept_invitation(
    request: AcceptInviteRequest,
    response: Response,
    req_meta: Request,
    db: Session = Depends(get_db)
):
    """
    Accept an authorized invitation and establish an account within the inviting organization.
    """
    token_hash_val = hash_token(request.token)
    inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.token_hash == token_hash_val,
        OrganizationInvitation.accepted == False
    ).first()

    if not inv or inv.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid or has expired."
        )

    valid_pwd, pwd_error = validate_password_strength(request.password)
    if not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=pwd_error
        )

    # Create user strictly scoped to the inviter's company
    new_user = User(
        email=inv.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name or inv.email.split("@")[0].capitalize(),
        company_id=inv.company_id,
        role=inv.role,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    inv.accepted = True
    db.commit()
    db.refresh(new_user)

    company = inv.company
    token_claims = {
        "sub": new_user.email,
        "user_id": new_user.id,
        "company_id": company.id,
        "company_name": company.name,
        "role": new_user.role
    }
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    set_auth_cookies(response, access_token, refresh_token)

    log_audit_event(
        db=db,
        company_id=company.id,
        user_id=new_user.id,
        user_email=new_user.email,
        action="INVITATION_ACCEPTED",
        resource_type="USER",
        resource_id=str(new_user.id),
        ip_address=req_meta.client.host if req_meta.client else None
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
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


@router.get("/team/members")
def get_team_members(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all active and inactive users within the authenticated user's organization.
    Tenant-isolated: Cannot view users from other companies.
    """
    members = db.query(User).filter(User.company_id == current_user.company_id).all()
    return [
        {
            "id": m.id,
            "email": m.email,
            "full_name": m.full_name,
            "role": m.role,
            "is_active": m.is_active,
            "is_verified": getattr(m, "is_verified", True),
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in members
    ]


@router.patch("/team/members/{member_id}")
def update_team_member(
    member_id: int,
    request: UpdateUserRoleRequest,
    req_meta: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update member role or active status.
    ADMIN only. Prevents administrator from disabling or demoting themselves.
    """
    member = db.query(User).filter(
        User.id == member_id,
        User.company_id == current_user.company_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found in your organization."
        )

    if member.id == current_user.id:
        if request.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own administrative account."
            )
        if request.role and request.role.upper() != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot demote your own administrator role."
            )

    if request.role:
        new_role = request.role.upper()
        if new_role not in ("ADMIN", "MANAGER", "MEMBER", "ANALYST"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role must be one of: ADMIN, MANAGER, MEMBER, ANALYST"
            )
        member.role = new_role

    if request.is_active is not None:
        member.is_active = request.is_active

    db.commit()

    log_audit_event(
        db=db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="USER_UPDATED",
        resource_type="USER",
        resource_id=str(member.id),
        details={"updated_role": member.role, "is_active": member.is_active},
        ip_address=req_meta.client.host if req_meta.client else None
    )

    return {
        "success": True,
        "member": {
            "id": member.id,
            "email": member.email,
            "full_name": member.full_name,
            "role": member.role,
            "is_active": member.is_active
        }
    }


@router.get("/audit-logs")
def get_organization_audit_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve security audit logs for the authenticated tenant organization.
    ADMIN only.
    """
    logs = db.query(AuditLog).filter(
        AuditLog.company_id == current_user.company_id
    ).order_by(AuditLog.created_at.desc()).limit(100).all()

    return [
        {
            "id": log.id,
            "user_email": log.user_email or "System",
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]
