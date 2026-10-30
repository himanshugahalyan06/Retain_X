import os
import time
import secrets
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
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
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")) # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7")) # 7 days


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


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Ensure password meets minimum enterprise SaaS security policy:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit or symbol
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() or not c.isalnum() for c in password):
        return False, "Password must contain at least one number or special symbol."
    return True, None


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate an encoded JWT access token with payload and expiration claim.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate an encoded JWT refresh token with longer expiration claim.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": secrets.token_hex(16)
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


def generate_secure_token() -> str:
    """Generate a high-entropy URL-safe token for email verification, reset, and invitations."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """SHA-256 hash a raw verification/reset token before storing in database."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class LoginRateLimiter:
    """
    In-memory rate limiter to protect against brute-force credential stuffing.
    Allows 5 failed attempts per key within a 5-minute sliding window.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: Dict[str, list] = {}

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        timestamps = self.attempts.get(key, [])
        # Keep only timestamps in the current window
        valid_timestamps = [t for t in timestamps if now - t < self.window_seconds]
        self.attempts[key] = valid_timestamps
        return len(valid_timestamps) >= self.max_attempts

    def record_failure(self, key: str) -> None:
        now = time.time()
        if key not in self.attempts:
            self.attempts[key] = []
        self.attempts[key].append(now)

    def record_success(self, key: str) -> None:
        if key in self.attempts:
            del self.attempts[key]


login_rate_limiter = LoginRateLimiter()
