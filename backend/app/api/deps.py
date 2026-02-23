from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.database import get_db
from app.services.auth import get_user_by_id

COOKIE_NAME = "access_token"


def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)):
    """Возвращает пользователя если авторизован, иначе None."""
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None