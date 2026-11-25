"""Auth endpoints: login and me."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import create_access_token, require_admin, verify_password
from app.db.models import Admin
from app.db.session import get_db
from app.schemas.auth import LoginRequest, MeResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    admin = db.query(Admin).filter_by(username=body.username).first()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "Username atau password salah.")

    token = create_access_token({"sub": str(admin.id)})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=MeResponse)
def me(admin: Admin = Depends(require_admin)) -> MeResponse:
    return MeResponse(id=admin.id, username=admin.username)
