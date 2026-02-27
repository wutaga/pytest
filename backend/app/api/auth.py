from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.config import settings
from app.database import get_db
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest
from app.services.auth import get_user_by_id, login_user, register_user
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _set_auth_cookies(response: Response, user_id: int) -> None:
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.jwt_access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
    )




@router.post("/register", response_model=MeResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, payload)
    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        xp=user.xp,
        level=user.level,
        is_verified=user.is_verified,
    )


@router.post("/login", response_model=MeResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = login_user(db, payload.email, payload.password)
    _set_auth_cookies(response, user.id)
    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        xp=user.xp,
        level=user.level,
        is_verified=user.is_verified,
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=ACCESS_COOKIE_NAME)
    response.delete_cookie(key=REFRESH_COOKIE_NAME)
    return {"detail": "Вышли из аккаунта"}


@router.post("/refresh")
def refresh(response: Response, request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    try:
        payload = decode_refresh_token(refresh_token)
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh токен",
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    _set_auth_cookies(response, user.id)
    return {"detail": "Сессия обновлена"}


@router.get("/me", response_model=MeResponse)
def me(current_user=Depends(get_current_user)):
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        xp=current_user.xp,
        level=current_user.level,
        is_verified=current_user.is_verified,
    )
