"""JWT auth, bcrypt password hashing, and FastAPI dependencies."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ALGORITHM = "HS256"


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------


def create_access_token(payload: dict) -> str:
    data = payload.copy()
    expire = datetime.now(tz=timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    data["exp"] = expire
    return jwt.encode(data, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Return decoded payload or raise AppError."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AppError(401, "TOKEN_EXPIRED", "Sesi login telah berakhir. Silakan login ulang.")
    except jwt.PyJWTError:
        raise AppError(401, "TOKEN_INVALID", "Token tidak valid.")


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


def require_admin(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> "Admin":  # type: ignore[name-defined]  # noqa: F821
    from app.db.models import Admin

    if not token:
        raise AppError(401, "TOKEN_INVALID", "Token tidak valid.")
    payload = decode_token(token)
    admin_id = payload.get("sub")
    if admin_id is None:
        raise AppError(401, "TOKEN_INVALID", "Token tidak valid.")
    admin = db.get(Admin, int(admin_id))
    if not admin:
        raise AppError(401, "TOKEN_INVALID", "Token tidak valid.")
    return admin


def require_device_key(x_device_key: str | None = Header(default=None)) -> None:
    """Dependency: validates X-Device-Key header.

    Returns 403 (not 401) on failure — 401 triggers FE token deletion.
    """
    if x_device_key != settings.DEVICE_API_KEY:
        raise AppError(
            403,
            "DEVICE_KEY_INVALID",
            "Device key salah. Periksa Pengaturan aplikasi.",
        )


def try_get_admin(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> "Admin | None":  # type: ignore[name-defined]  # noqa: F821
    """Return Admin if valid JWT present, else None (does NOT raise)."""
    from app.db.models import Admin

    if not token:
        return None
    try:
        payload = decode_token(token)
        admin_id = payload.get("sub")
        return db.get(Admin, admin_id)
    except AppError:
        return None
