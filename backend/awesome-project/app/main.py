"""FastAPI application entry point with lifespan model loading."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.db.models import Base
from app.db.session import engine
from app.services.embedding_cache import EmbeddingCache

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    Base.metadata.create_all(bind=engine)

    app.state.detector = None
    app.state.recognizer = None
    app.state.landmark_extractor = None
    app.state.embedding_cache = EmbeddingCache()

    # Load YOLOv8
    model_path = Path("models") / settings.YOLO_FILENAME
    if model_path.exists():
        try:
            from app.services.detector import load_detector
            app.state.detector = load_detector(
                model_path, conf=settings.YOLO_CONF, imgsz=settings.YOLO_IMGSZ
            )
            logger.info("YOLOv8 loaded from %s", model_path)
        except Exception as e:
            logger.warning("Could not load YOLO: %s", e)
    else:
        logger.warning("YOLO model not found at %s — run scripts/download_model.py", model_path)

    # Load FaceNet
    try:
        from app.services.recognizer import load_recognizer
        app.state.recognizer = load_recognizer()
        logger.info("FaceNet loaded (vggface2)")
    except Exception as e:
        logger.warning("Could not load FaceNet: %s", e)

    # Warm up embedding cache
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        app.state.embedding_cache.refresh(db)
        logger.info("Embedding cache: %d embeddings", app.state.embedding_cache.size)
    finally:
        db.close()

    yield

    # --- Shutdown ---
    logger.info("Shutting down...")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Attendance Face Recognition API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    from app.api.v1.router import router
    app.include_router(router)

    return app


app = create_app()
