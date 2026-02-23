from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.database import get_db
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest
from app.services.auth import get_user_by_id, login_user, register_user
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "access_token"




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
    token = login_user(db, payload.email, payload.password)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,       # JS не имеет доступа
        secure=False,        # True на проде (только HTTPS)
        samesite="lax",      # защита от CSRF
        max_age=60 * 60 * 24 * 7,  # 7 дней
    )
    user = get_user_by_id(db, int(decode_access_token(token)["sub"]))
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
    response.delete_cookie(key=COOKIE_NAME)
    return {"detail": "Вышли из аккаунта"}


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