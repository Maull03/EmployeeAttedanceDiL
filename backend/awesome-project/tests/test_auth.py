"""Tests for auth endpoints: login, /me, token validation."""
from __future__ import annotations

from fastapi.testclient import TestClient


def _create_admin(username="admin1", password="pass1234"):
    from app.core.security import hash_password
    from app.db.models import Admin
    from tests.conftest import TestSessionLocal

    db = TestSessionLocal()
    try:
        admin = Admin(username=username, password_hash=hash_password(password))
        db.add(admin)
        db.commit()
    finally:
        db.close()


def test_login_success(client: TestClient):
    _create_admin("alice", "secret123")
    resp = client.post("/api/v1/auth/login", json={"username": "alice", "password": "secret123"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert isinstance(body["expires_in"], int)


def test_login_wrong_password(client: TestClient):
    _create_admin("bob", "correct")
    resp = client.post("/api/v1/auth/login", json={"username": "bob", "password": "wrong"})
    assert resp.status_code == 401
    body = resp.json()
    assert isinstance(body["detail"], str)
    assert body["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_user(client: TestClient):
    resp = client.post("/api/v1/auth/login", json={"username": "ghost", "password": "x"})
    assert resp.status_code == 401
    assert resp.json()["code"] == "INVALID_CREDENTIALS"


def test_me_with_valid_token(client: TestClient, auth_headers: dict):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "testadmin"
    assert isinstance(body["id"], int)


def test_me_without_token(client: TestClient):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    body = resp.json()
    assert isinstance(body["detail"], str)
    assert body["code"] in ("TOKEN_INVALID", "TOKEN_EXPIRED")


def test_me_with_bad_token(client: TestClient):
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer badtoken"})
    assert resp.status_code == 401
    assert resp.json()["code"] in ("TOKEN_INVALID", "TOKEN_EXPIRED")
