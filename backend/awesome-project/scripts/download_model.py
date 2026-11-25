"""Download YOLOv8 face detection model from Hugging Face to models/model.pt."""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow running from project root or scripts/ dir
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

MODELS_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODELS_DIR / "model.pt"


def download() -> None:
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("ERROR: huggingface_hub not installed. Run: uv add huggingface_hub")
        sys.exit(1)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if MODEL_PATH.exists():
        print(f"Model already exists at {MODEL_PATH}. Skipping download.")
        return

    repo_id = os.environ.get("YOLO_REPO_ID", "arnabdhar/YOLOv8-Face-Detection")
    filename = os.environ.get("YOLO_FILENAME", "model.pt")

    print(f"Downloading {filename} from {repo_id} ...")
    path = hf_hub_download(repo_id=repo_id, filename=filename, local_dir=str(MODELS_DIR))
    print(f"Saved to {path}")


if __name__ == "__main__":
    download()
