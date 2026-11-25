"""Employee CRUD endpoints and face registration (Fase 1 + 2)."""
from __future__ import annotations

import io
from datetime import datetime, timezone

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import require_admin
from app.db.models import Employee, FaceEmbedding
from app.db.session import get_db
from app.schemas.employees import (
    CreateEmployeeRequest,
    EmployeeResponse,
    FaceInfoResponse,
    FaceResultItem,
    RegisterFaceResponse,
    UpdateEmployeeRequest,
)

router = APIRouter(prefix="/employees", tags=["employees"])

# ---------------------------------------------------------------------------
# Pose normalisation helpers
# ---------------------------------------------------------------------------

_POSE_MAP: dict[str, str] = {
    "depan": "front",
    "front": "front",
    "sedikit ke kiri": "left",
    "left": "left",
    "kiri": "left",
    "sedikit ke kanan": "right",
    "right": "right",
    "kanan": "right",
    "sedikit ke atas": "up",
    "up": "up",
    "atas": "up",
    "sedikit ke bawah": "down",
    "down": "down",
    "bawah": "down",
}


def _normalise_pose(label: str) -> str:
    return _POSE_MAP.get(label.strip().lower(), "front")


# ---------------------------------------------------------------------------
# Employee helpers
# ---------------------------------------------------------------------------


def _employee_response(emp: Employee) -> EmployeeResponse:
    face_count = len(emp.face_embeddings)
    return EmployeeResponse(
        id=emp.id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        position=emp.position or "",
        is_active=emp.is_active,
        face_registered=face_count > 0,
        face_samples=face_count,
        created_at=emp.created_at.astimezone(timezone.utc).isoformat(),
        updated_at=emp.updated_at.astimezone(timezone.utc).isoformat(),
    )


def _get_employee_or_404(db: Session, employee_id: int) -> Employee:
    emp = db.get(Employee, employee_id)
    if emp is None:
        raise AppError(404, "NOT_FOUND", "Karyawan tidak ditemukan.")
    return emp


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.get("", response_model=list[EmployeeResponse])
def list_employees(
    search: str = Query(default=""),
    active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> list[EmployeeResponse]:
    q = db.query(Employee)
    if active is not None:
        q = q.filter(Employee.is_active.is_(active))
    if search:
        like = f"%{search}%"
        q = q.filter(
            Employee.full_name.ilike(like) | Employee.employee_code.ilike(like)
        )
    return [_employee_response(e) for e in q.all()]


@router.post("", response_model=EmployeeResponse, status_code=201)
def create_employee(
    body: CreateEmployeeRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> EmployeeResponse:
    if db.query(Employee).filter_by(employee_code=body.employee_code).first():
        raise AppError(409, "EMPLOYEE_CODE_EXISTS", "Kode karyawan sudah digunakan.")
    emp = Employee(
        employee_code=body.employee_code,
        full_name=body.full_name,
        position=body.position or None,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _employee_response(emp)


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> EmployeeResponse:
    emp = _get_employee_or_404(db, employee_id)
    return _employee_response(emp)


@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    body: UpdateEmployeeRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> EmployeeResponse:
    emp = _get_employee_or_404(db, employee_id)

    if body.employee_code is not None:
        conflict = (
            db.query(Employee)
            .filter(Employee.employee_code == body.employee_code, Employee.id != employee_id)
            .first()
        )
        if conflict:
            raise AppError(409, "EMPLOYEE_CODE_EXISTS", "Kode karyawan sudah digunakan.")
        emp.employee_code = body.employee_code

    if body.full_name is not None:
        emp.full_name = body.full_name
    if body.position is not None:
        emp.position = body.position or None
    if body.is_active is not None:
        emp.is_active = body.is_active

    emp.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(emp)
    return _employee_response(emp)


@router.delete("/{employee_id}", response_model=EmployeeResponse)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> EmployeeResponse:
    emp = _get_employee_or_404(db, employee_id)
    emp.is_active = False
    emp.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(emp)
    return _employee_response(emp)


# ---------------------------------------------------------------------------
# Face registration (heavy — sync def for threadpool)
# ---------------------------------------------------------------------------


def _validate_image(
    img_rgb: np.ndarray,
    detector,
    min_face_px: int,
    blur_var_min: float,
) -> tuple[bool, str, object | None]:
    """Returns (ok, reason, best_box). reason in {NO_FACE, MULTIPLE_FACES, FACE_TOO_SMALL, IMAGE_BLURRY}."""
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if laplacian_var < blur_var_min:
        return False, "IMAGE_BLURRY", None

    boxes = detector.detect(img_rgb)
    if len(boxes) == 0:
        return False, "NO_FACE", None
    if len(boxes) > 1:
        return False, "MULTIPLE_FACES", None

    box = boxes[0]
    if box.min_side < min_face_px:
        return False, "FACE_TOO_SMALL", None

    return True, "", box


@router.post("/{employee_id}/face", response_model=RegisterFaceResponse)
def register_face(
    employee_id: int,
    request: Request,
    images: list[UploadFile] = File(...),
    poses: list[str] = Form(...),
    replace: str = Form(default="true"),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> RegisterFaceResponse:
    from app.core.config import settings

    emp = _get_employee_or_404(db, employee_id)

    do_replace = replace.lower() in ("true", "1", "yes")

    if len(images) != len(poses):
        raise AppError(
            422,
            "VALIDATION_ERROR",
            f"Jumlah images ({len(images)}) tidak sama dengan jumlah poses ({len(poses)}).",
        )

    detector = request.app.state.detector
    recognizer = request.app.state.recognizer
    embedding_cache = request.app.state.embedding_cache

    if detector is None or recognizer is None:
        raise AppError(503, "INTERNAL_ERROR", "Model belum siap. Jalankan download_model.py terlebih dahulu.")

    results: list[FaceResultItem] = []
    valid_embeddings: list[tuple[np.ndarray, str]] = []

    for img_file, pose_label in zip(images, poses):
        raw = img_file.file.read()
        try:
            from PIL import Image as PILImage
            from PIL import ImageOps
            pil_img = PILImage.open(io.BytesIO(raw)).convert("RGB")
            pil_img = ImageOps.exif_transpose(pil_img)
        except Exception:
            results.append(FaceResultItem(pose=pose_label, ok=False, reason="NO_FACE"))
            continue

        img_rgb = np.array(pil_img, dtype=np.uint8)

        ok, reason, box = _validate_image(
            img_rgb, detector, settings.MIN_FACE_PX, settings.BLUR_VAR_MIN
        )
        if not ok:
            results.append(FaceResultItem(pose=pose_label, ok=False, reason=reason))
            continue

        try:
            emb = recognizer.embed_face(img_rgb, box, margin=settings.FACE_CROP_MARGIN)
        except Exception:
            results.append(FaceResultItem(pose=pose_label, ok=False, reason="NO_FACE"))
            continue

        canonical = _normalise_pose(pose_label)
        valid_embeddings.append((emb, canonical))
        results.append(FaceResultItem(pose=pose_label, ok=True))

    valid_count = len(valid_embeddings)
    registered = valid_count >= settings.REGISTER_MIN_VALID_IMAGES

    if registered and do_replace:
        db.query(FaceEmbedding).filter_by(employee_id=employee_id).delete()
        for emb_arr, canonical_pose in valid_embeddings:
            fe = FaceEmbedding(
                employee_id=employee_id,
                embedding=emb_arr.tobytes(),
                pose=canonical_pose,
            )
            db.add(fe)
        emp.updated_at = datetime.now(tz=timezone.utc)
        db.commit()
        db.refresh(emp)
        embedding_cache.refresh(db)

    return RegisterFaceResponse(registered=registered, valid_count=valid_count, results=results)


@router.get("/{employee_id}/face", response_model=FaceInfoResponse)
def get_face_info(
    employee_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> FaceInfoResponse:
    emp = _get_employee_or_404(db, employee_id)
    embeddings = emp.face_embeddings

    if embeddings:
        latest = max(embeddings, key=lambda e: e.created_at)
        updated_at = latest.created_at.astimezone(timezone.utc).isoformat()
        poses = [e.pose for e in embeddings]
    else:
        updated_at = emp.updated_at.astimezone(timezone.utc).isoformat()
        poses = []

    return FaceInfoResponse(count=len(embeddings), updated_at=updated_at, poses=poses)


@router.delete("/{employee_id}/face", status_code=200)
def delete_face(
    employee_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    emp = _get_employee_or_404(db, employee_id)
    db.query(FaceEmbedding).filter_by(employee_id=employee_id).delete()
    emp.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    request.app.state.embedding_cache.refresh(db)
    return {"ok": True}
