"""Shared pytest fixtures.

Strategy:
- Replace app.db.session.engine and SessionLocal at the MODULE level (not via patch
  context manager) so the replacement stays active for the entire test, including
  inside FastAPI dependency functions that capture the module-level names at import time.
- Use StaticPool so every session/connection shares the same in-memory database.
- Patch app.services.recognizer.load_recognizer to avoid downloading FaceNet weights
  (no internet in sandbox).
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.session as _db_session  # keep reference for monkey-patch
from app.db.models import Base
from app.db.session import get_db

# ---------------------------------------------------------------------------
# In-memory test database
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# ---------------------------------------------------------------------------
# Monkey-patch the db session module so ALL consumers (lifespan, deps, etc.)
# automatically use the test engine for the lifetime of the test session.
# This is done once at import time — before any app code uses the originals.
# ---------------------------------------------------------------------------
_original_engine = _db_session.engine
_original_session_local = _db_session.SessionLocal

_db_session.engine = test_engine
_db_session.SessionLocal = TestSessionLocal


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="function")
def client():
    """TestClient backed by in-memory SQLite (StaticPool).

    Models are mocked so tests run without real YOLO / FaceNet weights.
    """
    from app.main import create_app
    from app.services.embedding_cache import EmbeddingCache

    # Create tables fresh for every test
    Base.metadata.create_all(bind=test_engine)

    mock_recognizer = MagicMock()
    mock_detector = MagicMock()

    with patch("app.services.recognizer.load_recognizer", return_value=mock_recognizer):
        app = create_app()
        app.dependency_overrides[get_db] = override_get_db

        with TestClient(app, raise_server_exceptions=False) as c:
            # Override state after lifespan (guards against partial init)
            app.state.detector = mock_detector
            app.state.recognizer = mock_recognizer
            app.state.landmark_extractor = None
            cache = EmbeddingCache()
            db = TestSessionLocal()
            try:
                cache.refresh(db)
            finally:
                db.close()
            app.state.embedding_cache = cache
            yield c

    app.dependency_overrides.clear()
    # Drop tables so next test starts clean
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def admin_token(client) -> str:
    """Insert an admin row and return a valid JWT."""
    from app.core.security import hash_password
    from app.db.models import Admin

    db = TestSessionLocal()
    try:
        admin = Admin(username="testadmin", password_hash=hash_password("testpass123"))
        db.add(admin)
        db.commit()
    finally:
        db.close()

    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "testadmin", "password": "testpass123"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}
