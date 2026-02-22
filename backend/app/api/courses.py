from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.content import Course

router = APIRouter(prefix="/courses", tags=["courses"])


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
def get_course(slug: str, db: Session = Depends(get_db)):
    course = (
        db.query(Course)
        .filter(
            Course.slug == slug,
            Course.is_published.is_(True),
            Course.deleted_at.is_(None),
        )
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")
    return _serialize_course(course)

