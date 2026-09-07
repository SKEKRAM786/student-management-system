import sys
from datetime import date, timedelta
from pathlib import Path

import pytest
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from database import db

VALID_STUDENT = {
    "first_name": "Ada",
    "last_name": "Lovelace",
    "email": "ada@example.com",
    "date_of_birth": "1815-12-10",
    "enrollment_status": "active",
}


@pytest.fixture
def client():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "SQLALCHEMY_ENGINE_OPTIONS": {
                "connect_args": {"check_same_thread": False},
                "poolclass": StaticPool,
            },
        }
    )

    with app.test_client() as test_client:
        yield test_client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_create_student_success(client):
    response = client.post("/students", json=VALID_STUDENT)

    assert response.status_code == 201
    data = response.get_json()
    assert data["first_name"] == VALID_STUDENT["first_name"]
    assert data["last_name"] == VALID_STUDENT["last_name"]
    assert data["email"] == VALID_STUDENT["email"]
    assert data["date_of_birth"] == VALID_STUDENT["date_of_birth"]
    assert data["enrollment_status"] == VALID_STUDENT["enrollment_status"]
    assert data["id"] is not None
    assert data["created_at"]
    assert data["updated_at"]


def test_create_student_missing_required_field(client):
    payload = {key: value for key, value in VALID_STUDENT.items() if key != "first_name"}
    response = client.post("/students", json=payload)

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "first_name"
    assert "message" in data


def test_create_student_duplicate_email(client):
    first_response = client.post("/students", json=VALID_STUDENT)
    assert first_response.status_code == 201

    duplicate = {
        **VALID_STUDENT,
        "first_name": "Ada",
        "last_name": "Byron",
    }
    response = client.post("/students", json=duplicate)

    assert response.status_code == 409
    data = response.get_json()
    assert data["error"] == "email"
    assert "message" in data


def test_create_student_future_date_of_birth(client):
    payload = {
        **VALID_STUDENT,
        "date_of_birth": (date.today() + timedelta(days=1)).isoformat(),
    }
    response = client.post("/students", json=payload)

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "date_of_birth"
    assert "message" in data


def test_create_student_invalid_enrollment_status(client):
    payload = {**VALID_STUDENT, "enrollment_status": "pending"}
    response = client.post("/students", json=payload)

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "enrollment_status"
    assert "message" in data


def test_get_student_not_found(client):
    response = client.get("/students/9999")

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "id"
    assert "message" in data


def test_get_student_success(client):
    created = client.post("/students", json=VALID_STUDENT)
    student_id = created.get_json()["id"]

    response = client.get(f"/students/{student_id}")

    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == student_id
    assert data["first_name"] == VALID_STUDENT["first_name"]
    assert data["last_name"] == VALID_STUDENT["last_name"]
    assert data["email"] == VALID_STUDENT["email"]
    assert data["date_of_birth"] == VALID_STUDENT["date_of_birth"]
    assert data["enrollment_status"] == VALID_STUDENT["enrollment_status"]


def test_update_student_not_found(client):
    response = client.put("/students/9999", json={"first_name": "Grace"})

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "id"
    assert "message" in data


def test_delete_student_success(client):
    created = client.post("/students", json=VALID_STUDENT)
    student_id = created.get_json()["id"]

    delete_response = client.delete(f"/students/{student_id}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/students/{student_id}")
    assert get_response.status_code == 404
