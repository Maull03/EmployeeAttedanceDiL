"""Health check endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Request
from sqlalchemy.orm import Session

from app.db.models import Employee
from app.db.session import SessionLocal

router = APIRouter(tags=["health"])


@router.get("/health")
def health(request: Request) -> dict:
    state = request.app.state

    yolo_ok = getattr(state, "detector", None) is not None
    facenet_ok = getattr(state, "recognizer", None) is not None
    landmarks_ok = getattr(state, "landmark_extractor", None) is not None

    db: Session = SessionLocal()
    try:
        registered = (
            db.query(Employee)
            .filter(Employee.is_active.is_(True))
            .filter(Employee.face_embeddings.any())
            .count()
        )
    finally:
        db.close()

    return {
        "status": "ok",
        "models": {
            "yolo": yolo_ok,
            "landmarks": landmarks_ok,
            "facenet": facenet_ok,
        },
        "registered_employees": registered,
    }
