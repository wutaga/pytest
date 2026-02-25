from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(subject: str | int) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {"sub": str(subject), "exp": expire_at, "type": "access"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def create_refresh_token(subject: str | int) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(
        days=settings.jwt_refresh_token_expire_days
    )
    payload = {"sub": str(subject), "exp": expire_at, "type": "refresh"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
        exp = payload.get("exp")
        if exp is None:
            raise ValueError("Недействительный токен")
        if datetime.now(timezone.utc).timestamp() >= float(exp):
            raise ValueError("Токен истек")
        if payload.get("type") != "access":
            raise ValueError("Недействительный токен")
        return payload
    except JWTError as exc:
        raise ValueError("Недействительный токен") from exc

def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
        exp = payload.get("exp")
        if exp is None:
            raise ValueError("Недействительный токен")
        if datetime.now(timezone.utc).timestamp() >= float(exp):
            raise ValueError("Токен истек")
        if payload.get("type") != "refresh":
            raise ValueError("Недействительный токен")
        return payload
    except JWTError as exc:
        raise ValueError("Недействительный токен") from exc
