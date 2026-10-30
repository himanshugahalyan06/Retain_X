"""
FastAPI Authentication, Multi-Tenancy & RBAC Dependencies.
"""

from typing import Optional, List, Dict, Any, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from churnguard.database.db import get_db
from churnguard.auth.security import decode_access_token
from churnguard.database.models import User, Company, AuditLog

# Supports both OAuth2 standard authorization header and HTTPBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


def get_token_from_request(
    request: Request,
    oauth_token: Optional[str] = Depends(oauth2_scheme),
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer)
) -> Optional[str]:
    """
    Extract token with priority:
    1. HTTP Bearer authorization header
    2. OAuth2 authorization header
    3. HttpOnly session cookie (churnguard_access_token or access_token)
    """
    if bearer_auth and bearer_auth.credentials:
        return bearer_auth.credentials
    if oauth_token:
        return oauth_token
    # Cookie fallback for secure browser sessions
    cookie_token = request.cookies.get("churnguard_access_token") or request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return None


def get_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate JWT token, extract user email, and retrieve active User object from DB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: Optional[str] = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Please contact your organization administrator."
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency ensuring the user is active.
    """
    return current_user


def get_current_company(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Company:
    """
    Retrieve the Company tenant instance belonging to the authenticated user.
    """
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company tenant not found for user"
        )
    return company


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    RBAC dependency factory.
    Enforces that current_user has one of the allowed roles.
    """
    normalized_roles = [r.upper() for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role = (current_user.role or "MEMBER").upper()
        if user_role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: This operation requires one of the following roles: {', '.join(allowed_roles)}. Your role is '{current_user.role}'."
            )
        return current_user

    return role_checker


# Convenient pre-configured role dependencies
require_admin = require_roles(["ADMIN"])
require_manager = require_roles(["ADMIN", "MANAGER"])
require_member = require_roles(["ADMIN", "MANAGER", "MEMBER", "ANALYST"])


def log_audit_event(
    db: Session,
    company_id: Optional[int],
    action: str,
    resource_type: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Record an enterprise audit log event for security-critical operations.
    Fails gracefully without halting business transaction.
    """
    try:
        entry = AuditLog(
            company_id=company_id,
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            ip_address=ip_address,
            details=details
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # Non-blocking audit failure log
        print(f"Warning: Audit log error: {e}")

