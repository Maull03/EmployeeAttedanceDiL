"""Tests for face registration endpoints with synthetic images."""
from __future__ import annotations

import io
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient


def _make_jpeg_bytes(width=200, height=200) -> bytes:
    """Generate a high-contrast patterned JPEG in memory so Laplacian variance > BLUR_VAR_MIN."""
    from PIL import Image

    # Deterministic checkerboard + noise texture so image is sharp (non-blurry)
    rng = np.random.default_rng(42)
    arr = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def _create_emp(client, auth_headers, code="FE001"):
    r = client.post(
        "/api/v1/employees",
        json={"employee_code": code, "full_name": "Test Face"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    return r.json()["id"]


def _build_parts(poses, width=200, height=200) -> list:
    """Build a single multipart ``files=`` list with images + poses + replace.

    httpx handles ``files=`` and ``data=`` separately, which causes issues when
    posting both simultaneously (some versions of httpx/starlette drop one of
    them or fail to merge list fields).  Sending *everything* as named parts
    inside a single ``files=`` list is the portable approach recognised by
    Starlette's multipart parser.
    """
    parts: list = [
        ("images", (f"face_{p}.jpg", _make_jpeg_bytes(width, height), "image/jpeg"))
        for p in poses
    ]
    # text fields: (field_name, (None, value)) — httpx treats None filename as plain field
    parts += [("poses", (None, p)) for p in poses]
    parts.append(("replace", (None, "true")))
    return parts


def _send_face(client, emp_id, poses, auth_headers, width=200, height=200):
    """POST multipart face-registration request."""
    return client.post(
        f"/api/v1/employees/{emp_id}/face",
        files=_build_parts(poses, width=width, height=height),
        headers=auth_headers,
    )


POSES_ID = ["Depan", "Sedikit ke kiri", "Sedikit ke kanan", "Sedikit ke atas", "Sedikit ke bawah"]


def _mock_detector_ok(app, min_side=200):
    """Make detector return one face box of given min_side."""
    from app.services.detector import FaceBox

    box = FaceBox(x1=0, y1=0, x2=min_side, y2=min_side, conf=0.95)
    app.state.detector.detect.return_value = [box]
    app.state.detector.detect.side_effect = None


def _mock_recognizer_ok(app):
    emb = np.random.randn(512).astype(np.float32)
    emb = emb / np.linalg.norm(emb)
    app.state.recognizer.embed_face.return_value = emb
    app.state.recognizer.embed_face.side_effect = None


def test_register_face_results_same_length_as_images(client: TestClient, auth_headers: dict):
    """results must have same length and order as images (FE maps by index)."""
    emp_id = _create_emp(client, auth_headers, code="FE100")

    _mock_detector_ok(client.app)
    _mock_recognizer_ok(client.app)

    resp = _send_face(client, emp_id, POSES_ID, auth_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert len(body["results"]) == len(POSES_ID)


def test_register_face_pose_echoed_exactly(client: TestClient, auth_headers: dict):
    """results[i].pose must equal the original Indonesian pose string sent by FE."""
    emp_id = _create_emp(client, auth_headers, code="FE101")
    _mock_detector_ok(client.app)
    _mock_recognizer_ok(client.app)

    resp = _send_face(client, emp_id, POSES_ID, auth_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    result_poses = [r["pose"] for r in body["results"]]
    assert result_poses == POSES_ID, f"Expected {POSES_ID}, got {result_poses}"


def test_register_face_blurry_returns_ok_false(client: TestClient, auth_headers: dict):
    """A blurry image must produce ok=False, reason=IMAGE_BLURRY, but results still same length."""
    emp_id = _create_emp(client, auth_headers, code="FE102")

    from app.services.detector import FaceBox
    box = FaceBox(x1=0, y1=0, x2=200, y2=200, conf=0.95)
    emb = np.random.randn(512).astype(np.float32)
    emb /= np.linalg.norm(emb)

    client.app.state.detector.detect.return_value = [box]
    client.app.state.detector.detect.side_effect = None
    client.app.state.recognizer.embed_face.return_value = emb
    client.app.state.recognizer.embed_face.side_effect = None

    # Patch cv2.Laplacian at module level in employees.py so the 5th call returns zero variance
    import cv2 as _cv2
    original_laplacian = _cv2.Laplacian
    laplacian_calls = [0]

    def fake_laplacian(src, ddepth):
        laplacian_calls[0] += 1
        if laplacian_calls[0] == 5:
            return np.zeros_like(src, dtype=np.float64)  # zero variance → blurry
        return original_laplacian(src, ddepth)

    with patch("app.api.v1.employees.cv2.Laplacian", side_effect=fake_laplacian):
        resp = _send_face(client, emp_id, POSES_ID, auth_headers)

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert len(body["results"]) == 5
    # 5th should be blurry
    assert body["results"][4]["ok"] is False
    assert body["results"][4]["reason"] == "IMAGE_BLURRY"


def test_get_face_info_no_embeddings(client: TestClient, auth_headers: dict):
    """GET /employees/{id}/face with no samples must still return valid ISO updated_at."""
    emp_id = _create_emp(client, auth_headers, code="FE200")
    resp = client.get(f"/api/v1/employees/{emp_id}/face", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 0
    assert body["poses"] == []
    # updated_at must be a valid ISO string
    from datetime import datetime
    dt = datetime.fromisoformat(body["updated_at"])
    assert dt is not None


def test_delete_face(client: TestClient, auth_headers: dict):
    emp_id = _create_emp(client, auth_headers, code="FE300")
    _mock_detector_ok(client.app)
    _mock_recognizer_ok(client.app)

    _send_face(client, emp_id, POSES_ID, auth_headers)

    resp = client.delete(f"/api/v1/employees/{emp_id}/face", headers=auth_headers)
    assert resp.status_code == 200

    info = client.get(f"/api/v1/employees/{emp_id}/face", headers=auth_headers)
    assert info.json()["count"] == 0


def test_register_face_not_enough_valid(client: TestClient, auth_headers: dict):
    """If valid_count < REGISTER_MIN_VALID_IMAGES, registered=false, DB unchanged."""
    emp_id = _create_emp(client, auth_headers, code="FE400")

    # Make all detects return NO_FACE
    client.app.state.detector.detect.return_value = []
    client.app.state.detector.detect.side_effect = None

    resp = _send_face(client, emp_id, POSES_ID, auth_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["registered"] is False
    assert body["valid_count"] == 0
    for r in body["results"]:
        assert r["ok"] is False
        assert r["reason"] == "NO_FACE"
