"""Application settings loaded from .env via pydantic-settings."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_ENV: str = "dev"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    TIMEZONE: str = "Asia/Jakarta"
    CORS_ORIGINS: str = "*"

    # Auth
    JWT_SECRET: str = "change-me"
    JWT_EXPIRE_MINUTES: int = 480
    DEVICE_API_KEY: str = "change-me-device-key"

    # YOLO
    YOLO_REPO_ID: str = "arnabdhar/YOLOv8-Face-Detection"
    YOLO_FILENAME: str = "model.pt"
    YOLO_CONF: float = 0.5
    YOLO_IMGSZ: int = 640
    YOLO_STRIDE: int = 3
    MIN_FACE_PX: int = 100
    FACE_CROP_MARGIN: float = 0.1

    # Liveness
    CHALLENGE_MODE: str = "random"
    CHALLENGE_TTL_SECONDS: int = 30
    LIVENESS_WINDOW_SECONDS: float = 5.0
    WINDOW_TOLERANCE_SECONDS: float = 0.3
    EAR_THRESHOLD: float = 0.2
    EAR_MIN_FRAMES: int = 2
    EAR_MAX_FRAMES: int = 15
    YAW_THRESHOLD_DEG: float = 25.0
    YAW_SIGN: int = 1
    FRONTAL_YAW_MAX_DEG: float = 10.0

    # Face recognition
    FACE_MATCH_THRESHOLD: float = 1.0
    REGISTER_MIN_VALID_IMAGES: int = 3
    BLUR_VAR_MIN: float = 60.0

    # Upload
    MAX_VIDEO_MB: int = 15
    FRAME_MAX_SIDE: int = 720
    VERIFY_RATE_LIMIT_PER_MIN: int = 10

    # Debug
    SAVE_DEBUG_VIDEOS: bool = False
    DEBUG_VIDEO_DIR: str = "./data/debug_clips"

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
