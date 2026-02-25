from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.database import get_db
from app.models.content import Course, Module
from app.models.user import User
from app.services.lesson_progress import is_lesson_completed_for_user

router = APIRouter(prefix="/courses", tags=["courses"])
COOKIE_NAME = "access_token"


def _get_current_user_optional(request: Request, db: Session) -> User | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        return None
    return db.query(User).filter(User.id == user_id).first()


def _has_paid_access(user: User | None, course_id: int) -> bool:
    if not user:
        return False

    now = datetime.now(timezone.utc)
    has_subscription = any(
        s.status == "active" and s.expires_at and s.expires_at > now for s in user.subscriptions
    )
    if has_subscription:
        return True

    return any(p.course_id == course_id for p in user.purchases)


def _serialize_course(course: Course) -> dict:
    modules = [m for m in course.modules if m.deleted_at is None]
    return {
        "id": course.id,
        "title": course.title,
        "slug": course.slug,
        "description": course.description,
        "price": float(course.price) if isinstance(course.price, Decimal) else course.price,
        "is_published": course.is_published,
        "modules_count": len(modules),
        "free_modules_count": len([m for m in modules if m.is_free]),
    }


@router.get("")
def list_courses(db: Session = Depends(get_db)):
    courses = (
        db.query(Course)
        .filter(Course.is_published.is_(True), Course.deleted_at.is_(None))
        .order_by(Course.created_at.desc())
        .all()
    )
    return [_serialize_course(course) for course in courses]


@router.get("/{slug}")
def get_course(slug: str, request: Request, db: Session = Depends(get_db)):
    user = _get_current_user_optional(request, db)
    course = (
        db.query(Course)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
        .filter(
            Course.slug == slug,
            Course.is_published.is_(True),
            Course.deleted_at.is_(None),
        )
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")

    paid_access = _has_paid_access(user, course.id)
    modules = []
    for module in sorted((m for m in course.modules if m.deleted_at is None), key=lambda m: m.order_index):
        lessons = sorted((l for l in module.lessons if l.deleted_at is None), key=lambda l: l.order_index)
        locked = not module.is_free and not paid_access
        modules.append(
            {
                "id": module.id,
                "title": module.title,
                "order_index": module.order_index,
                "is_free": module.is_free,
                "locked": locked,
                "lessons": [
                    {
                        "id": lesson.id,
                        "title": lesson.title,
                        "order_index": lesson.order_index,
                        "lesson_completed": (
                            is_lesson_completed_for_user(db, user.id, lesson.id)
                            if user
                            else False
                        ),
                    }
                    for lesson in lessons
                ],
            }
        )

    return {
        **_serialize_course(course),
        "user_has_paid_access": paid_access,
        "modules": modules,
    }


@router.get("/{slug}/modules/{module_id}")
def get_course_module(
    slug: str,
    module_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_current_user_optional(request, db)
    course = (
        db.query(Course)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
        .filter(
            Course.slug == slug,
            Course.is_published.is_(True),
            Course.deleted_at.is_(None),
        )
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")

    module = next(
        (m for m in course.modules if m.id == module_id and m.deleted_at is None),
        None,
    )
    if not module:
        raise HTTPException(status_code=404, detail="Модуль не найден")

    paid_access = _has_paid_access(user, course.id)
    locked = not module.is_free and not paid_access

    lessons = sorted(
        (lesson for lesson in module.lessons if lesson.deleted_at is None),
        key=lambda lesson: lesson.order_index,
    )

    return {
        "id": module.id,
        "title": module.title,
        "order_index": module.order_index,
        "is_free": module.is_free,
        "locked": locked,
        "course": {
            "id": course.id,
            "slug": course.slug,
            "title": course.title,
        },
        "lessons": [
            {
                "id": lesson.id,
                "title": lesson.title,
                "order_index": lesson.order_index,
                "lesson_completed": (
                    is_lesson_completed_for_user(db, user.id, lesson.id)
                    if user
                    else False
                ),
            }
            for lesson in lessons
        ],
    }
