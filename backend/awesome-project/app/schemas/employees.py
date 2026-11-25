"""Employee request / response schemas."""
from __future__ import annotations

from pydantic import BaseModel, field_validator


class CreateEmployeeRequest(BaseModel):
    employee_code: str
    full_name: str
    position: str = ""


class UpdateEmployeeRequest(BaseModel):
    employee_code: str | None = None
    full_name: str | None = None
    position: str | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    id: int
    employee_code: str
    full_name: str
    position: str  # always string, never null
    is_active: bool
    face_registered: bool
    face_samples: int
    created_at: str
    updated_at: str

    @field_validator("position", mode="before")
    @classmethod
    def coerce_position(cls, v: str | None) -> str:
        return v if v is not None else ""


class FaceInfoResponse(BaseModel):
    count: int
    updated_at: str  # always valid ISO string
    poses: list[str]


class FaceResultItem(BaseModel):
    pose: str
    ok: bool
    reason: str | None = None


class RegisterFaceResponse(BaseModel):
    registered: bool
    valid_count: int
    results: list[FaceResultItem]
