"""
Authentication and Cryptographic Utilities.
Handles bcrypt password hashing and JWT token creation/decoding.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt

# Secret key and algorithm configuration
ENV = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
DEFAULT_INSECURE_SECRET = "churnguard-jwt-secret-key-development-testing-only-2026"
SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not SECRET_KEY:
    if ENV in ("production", "prod"):
        raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY environment variable is mandatory in production mode.")
    SECRET_KEY = DEFAULT_INSECURE_SECRET
elif ENV in ("production", "prod") and SECRET_KEY == DEFAULT_INSECURE_SECRET:
    raise RuntimeError("CRITICAL SECURITY ERROR: Insecure default JWT_SECRET_KEY detected in production.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours

import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using native bcrypt.
    Safely truncates to 72 bytes to respect bcrypt boundary.
    """
    pwd_bytes = str(password).encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.
    """
    try:
        pwd_bytes = str(plain_password).encode("utf-8")[:72]
        hash_bytes = str(hashed_password).encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate an encoded JWT access token with payload and expiration claim.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT access token.
    Returns payload dictionary if valid, or None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
