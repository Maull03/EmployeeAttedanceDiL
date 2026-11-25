"""Tests for employee CRUD endpoints."""
from __future__ import annotations

from fastapi.testclient import TestClient


def _create_emp(client, auth_headers, code="E001", name="Budi Santoso", position="Staff"):
    return client.post(
        "/api/v1/employees",
        json={"employee_code": code, "full_name": name, "position": position},
        headers=auth_headers,
    )


def test_create_employee(client: TestClient, auth_headers: dict):
    resp = _create_emp(client, auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["employee_code"] == "E001"
    assert body["full_name"] == "Budi Santoso"
    assert body["position"] == "Staff"
    assert body["is_active"] is True
    assert body["face_registered"] is False
    assert body["face_samples"] == 0


def test_create_employee_no_position(client: TestClient, auth_headers: dict):
    resp = client.post(
        "/api/v1/employees",
        json={"employee_code": "E002", "full_name": "Sari"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    # position must always be string, never null
    assert isinstance(resp.json()["position"], str)
    assert resp.json()["position"] == ""


def test_create_duplicate_code(client: TestClient, auth_headers: dict):
    _create_emp(client, auth_headers, code="E003")
    resp = _create_emp(client, auth_headers, code="E003", name="Lain")
    assert resp.status_code == 409
    body = resp.json()
    assert isinstance(body["detail"], str)
    assert body["code"] == "EMPLOYEE_CODE_EXISTS"


def test_list_employees(client: TestClient, auth_headers: dict):
    _create_emp(client, auth_headers, code="E010", name="Andi")
    _create_emp(client, auth_headers, code="E011", name="Bowo")
    resp = client.get("/api/v1/employees", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


def test_list_employees_filter_active(client: TestClient, auth_headers: dict):
    _create_emp(client, auth_headers, code="E020")
    resp = client.get("/api/v1/employees?active=true", headers=auth_headers)
    assert resp.status_code == 200
    for emp in resp.json():
        assert emp["is_active"] is True


def test_list_employees_search(client: TestClient, auth_headers: dict):
    _create_emp(client, auth_headers, code="E030", name="Zulkifli")
    resp = client.get("/api/v1/employees?search=Zulkifli", headers=auth_headers)
    assert resp.status_code == 200
    assert any("Zulkifli" in e["full_name"] for e in resp.json())


def test_get_employee(client: TestClient, auth_headers: dict):
    r = _create_emp(client, auth_headers, code="E040")
    emp_id = r.json()["id"]
    resp = client.get(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == emp_id


def test_get_employee_not_found(client: TestClient, auth_headers: dict):
    resp = client.get("/api/v1/employees/999999", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["code"] == "NOT_FOUND"


def test_patch_employee(client: TestClient, auth_headers: dict):
    r = _create_emp(client, auth_headers, code="E050", name="Old Name")
    emp_id = r.json()["id"]
    resp = client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"full_name": "New Name", "position": "Manager"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "New Name"
    assert resp.json()["position"] == "Manager"


def test_patch_position_to_empty(client: TestClient, auth_headers: dict):
    r = _create_emp(client, auth_headers, code="E051", position="Staff")
    emp_id = r.json()["id"]
    resp = client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"position": ""},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # position always string
    assert isinstance(resp.json()["position"], str)


def test_delete_employee_soft(client: TestClient, auth_headers: dict):
    r = _create_emp(client, auth_headers, code="E060")
    emp_id = r.json()["id"]
    resp = client.delete(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_active"] is False
    # Must return the employee object
    assert body["id"] == emp_id


def test_reactivate_employee(client: TestClient, auth_headers: dict):
    r = _create_emp(client, auth_headers, code="E070")
    emp_id = r.json()["id"]
    client.delete(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    resp = client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"is_active": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True


def test_employees_require_auth(client: TestClient):
    resp = client.get("/api/v1/employees")
    assert resp.status_code == 401
