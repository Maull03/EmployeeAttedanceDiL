"""In-memory embedding cache for fast nearest-neighbour lookup.

Stored in app.state.embedding_cache.
"""
from __future__ import annotations

import numpy as np
from sqlalchemy.orm import Session

from app.db.models import Employee, FaceEmbedding


class EmbeddingCache:
    """Holds a matrix of all embeddings for active employees."""

    def __init__(self) -> None:
        # (N, 512) float32 matrix
        self._matrix: np.ndarray = np.zeros((0, 512), dtype=np.float32)
        # Parallel list of employee IDs
        self._employee_ids: list[int] = []

    def refresh(self, db: Session) -> None:
        """Reload all embeddings from DB for active employees."""
        rows = (
            db.query(FaceEmbedding)
            .join(Employee, FaceEmbedding.employee_id == Employee.id)
            .filter(Employee.is_active.is_(True))
            .all()
        )
        if not rows:
            self._matrix = np.zeros((0, 512), dtype=np.float32)
            self._employee_ids = []
            return

        embeddings = []
        ids = []
        for row in rows:
            emb = np.frombuffer(row.embedding, dtype=np.float32).copy()
            embeddings.append(emb)
            ids.append(row.employee_id)

        self._matrix = np.array(embeddings, dtype=np.float32)
        self._employee_ids = ids

    @property
    def size(self) -> int:
        return len(self._employee_ids)

    def find_best_match(
        self, query: np.ndarray, threshold: float
    ) -> tuple[int | None, float | None]:
        """Return (employee_id, distance) of best match, or (None, None) if below threshold."""
        if self._matrix.shape[0] == 0:
            return None, None

        # Euclidean distances to all stored embeddings
        diffs = self._matrix - query  # (N, 512)
        dists = np.linalg.norm(diffs, axis=1)  # (N,)

        best_idx = int(np.argmin(dists))
        best_dist = float(dists[best_idx])

        if best_dist < threshold:
            return self._employee_ids[best_idx], best_dist
        return None, best_dist
