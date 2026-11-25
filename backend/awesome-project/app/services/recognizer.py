"""FaceNet embedding extractor — pure service, no FastAPI imports.

Preprocessing here MUST stay identical to what verification will use (§5 step 7).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    import torch
    from facenet_pytorch import InceptionResnetV1

    from app.services.detector import FaceBox


class FaceRecognizer:
    """Wraps InceptionResnetV1 (FaceNet) to produce L2-normalised 512-d embeddings."""

    def __init__(self, model: "InceptionResnetV1") -> None:
        self._model = model

    # ------------------------------------------------------------------
    # Shared preprocessing (registration & verification must use this)
    # ------------------------------------------------------------------

    @staticmethod
    def preprocess_face(
        img_rgb: np.ndarray,
        box: "FaceBox",
        margin: float = 0.1,
    ) -> "torch.Tensor":
        """Crop bbox + margin, resize to 160×160, normalise to [-1, 1].

        Returns a (1, 3, 160, 160) float32 tensor on CPU.
        This function is shared between registration and verification
        to guarantee identical preprocessing (project_BE.md §5 step 7).
        """
        import torch

        h, w = img_rgb.shape[:2]
        x1, y1, x2, y2 = box.x1, box.y1, box.x2, box.y2
        bw, bh = x2 - x1, y2 - y1

        # Add margin
        mx = int(bw * margin)
        my = int(bh * margin)
        x1c = max(0, x1 - mx)
        y1c = max(0, y1 - my)
        x2c = min(w, x2 + mx)
        y2c = min(h, y2 + my)

        face_crop = img_rgb[y1c:y2c, x1c:x2c]

        # Resize to 160×160 using PIL for quality
        from PIL import Image

        pil_face = Image.fromarray(face_crop).resize((160, 160), Image.BILINEAR)
        arr = np.array(pil_face, dtype=np.float32)  # H×W×3

        # Normalise: (x - 127.5) / 128  → roughly [-1, 1]
        arr = (arr - 127.5) / 128.0

        # (H, W, C) → (C, H, W) → (1, C, H, W)
        tensor = torch.from_numpy(arr.transpose(2, 0, 1)).unsqueeze(0)
        return tensor

    # ------------------------------------------------------------------
    # Embedding
    # ------------------------------------------------------------------

    def get_embedding(self, face_tensor: "torch.Tensor") -> np.ndarray:
        """Return L2-normalised 512-d embedding as float32 numpy array."""
        import torch

        self._model.eval()
        with torch.no_grad():
            emb = self._model(face_tensor)  # (1, 512)
        emb_np = emb.squeeze(0).cpu().numpy().astype(np.float32)
        # L2 normalise
        norm = np.linalg.norm(emb_np)
        if norm > 0:
            emb_np = emb_np / norm
        return emb_np

    def embed_face(self, img_rgb: np.ndarray, box: "FaceBox", margin: float = 0.1) -> np.ndarray:
        """Convenience: preprocess + embed in one call."""
        tensor = self.preprocess_face(img_rgb, box, margin)
        return self.get_embedding(tensor)


def load_recognizer() -> FaceRecognizer:
    """Load InceptionResnetV1 pretrained on vggface2."""
    from facenet_pytorch import InceptionResnetV1

    model = InceptionResnetV1(pretrained="vggface2").eval()
    return FaceRecognizer(model=model)
