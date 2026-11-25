"""YOLOv8 face detector — pure service, no FastAPI imports."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from ultralytics import YOLO


@dataclass
class FaceBox:
    x1: int
    y1: int
    x2: int
    y2: int
    conf: float

    @property
    def width(self) -> int:
        return self.x2 - self.x1

    @property
    def height(self) -> int:
        return self.y2 - self.y1

    @property
    def min_side(self) -> int:
        return min(self.width, self.height)


class FaceDetector:
    """Wraps a YOLOv8 model to detect face bounding boxes."""

    def __init__(self, model: "YOLO", conf: float = 0.5, imgsz: int = 640) -> None:
        self._model = model
        self._conf = conf
        self._imgsz = imgsz

    def detect(self, img: np.ndarray) -> list[FaceBox]:
        """
        Detect faces in an RGB image (H×W×3 uint8).
        Returns list of FaceBox sorted by area descending.
        """
        results = self._model.predict(
            img,
            conf=self._conf,
            imgsz=self._imgsz,
            verbose=False,
        )
        boxes: list[FaceBox] = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                coords = box.xyxy[0].cpu().numpy().astype(int)
                conf = float(box.conf[0].cpu().numpy())
                x1, y1, x2, y2 = coords
                boxes.append(FaceBox(x1=x1, y1=y1, x2=x2, y2=y2, conf=conf))

        # Sort by area descending
        boxes.sort(key=lambda b: b.width * b.height, reverse=True)
        return boxes


def load_detector(model_path: str | Path, conf: float, imgsz: int) -> FaceDetector:
    """Load YOLO model from path and return a FaceDetector."""
    from ultralytics import YOLO

    model = YOLO(str(model_path))
    return FaceDetector(model=model, conf=conf, imgsz=imgsz)
