"""
FastAPI Authentication & Multi-Tenancy Dependencies.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from churnguard.database.db import get_db
from churnguard.auth.security import decode_access_token
from churnguard.database.models import User, Company

# Supports both OAuth2 standard authorization header and HTTPBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


def get_token_from_header(
    oauth_token: Optional[str] = Depends(oauth2_scheme),
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer)
) -> Optional[str]:
    """
    Extract token from either OAuth2 Bearer or HTTP Bearer header.
    """
    if bearer_auth and bearer_auth.credentials:
        return bearer_auth.credentials
    if oauth_token:
        return oauth_token
    return None


def get_current_user(
    token: Optional[str] = Depends(get_token_from_header),
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
            detail="Inactive user account"
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
