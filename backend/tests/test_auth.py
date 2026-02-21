import uuid
import sys
from pathlib import Path

from fastapi.testclient import TestClient
import psycopg2
import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import SessionLocal
from app.main import app
from app.models.user import User

try:
    conn = psycopg2.connect(settings.database_url, connect_timeout=2)
    conn.close()
except Exception:
    pytest.skip("PostgreSQL недоступен для auth integration tests", allow_module_level=True)

client = TestClient(app)


def _cleanup_user_by_email(email: str) -> None:
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == email).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _unique_identity() -> tuple[str, str]:
    suffix = uuid.uuid4().hex[:10]
    return f"auth_{suffix}@example.com", f"auth_{suffix}"


def test_register_success():
    email, username = _unique_identity()
    payload = {"email": email, "username": username, "password": "StrongPass123"}

    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert data["username"] == username
    assert data["is_verified"] is False

    _cleanup_user_by_email(email)


def test_register_duplicate_email_or_username():
    email, username = _unique_identity()
    payload = {"email": email, "username": username, "password": "StrongPass123"}

    first = client.post("/api/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/auth/register", json=payload)
    assert second.status_code == 409

    _cleanup_user_by_email(email)


def test_login_success():
    email, username = _unique_identity()
    register_payload = {"email": email, "username": username, "password": "StrongPass123"}
    login_payload = {"email": email, "password": "StrongPass123"}

    client.post("/api/auth/register", json=register_payload)
    response = client.post("/api/auth/login", json=login_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str) and len(data["access_token"]) > 20

    _cleanup_user_by_email(email)


def test_login_wrong_password():
    email, username = _unique_identity()
    register_payload = {"email": email, "username": username, "password": "StrongPass123"}
    login_payload = {"email": email, "password": "WrongPass123"}

    client.post("/api/auth/register", json=register_payload)
    response = client.post("/api/auth/login", json=login_payload)

    assert response.status_code == 401

    _cleanup_user_by_email(email)


def test_me_with_valid_token():
    email, username = _unique_identity()
    register_payload = {"email": email, "username": username, "password": "StrongPass123"}
    login_payload = {"email": email, "password": "StrongPass123"}

    client.post("/api/auth/register", json=register_payload)
    login_response = client.post("/api/auth/login", json=login_payload)
    token = login_response.json()["access_token"]

    me_response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email

    _cleanup_user_by_email(email)


def test_me_with_invalid_token():
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer this.is.invalid"},
    )
    assert response.status_code == 401
