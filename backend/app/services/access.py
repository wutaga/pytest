from sqlalchemy.orm import Session

from app.models.content import Module
from app.models.user import CoursePurchase


def has_course_purchase(db: Session, user_id: int | None, course_id: int) -> bool:
    if not user_id:
        return False
    return (
        db.query(CoursePurchase.id)
        .filter(
            CoursePurchase.user_id == user_id,
            CoursePurchase.course_id == course_id,
        )
        .first()
        is not None
    )


def can_access_module(db: Session, user_id: int | None, module: Module) -> bool:
    if module.is_free:
        return True
    return has_course_purchase(db, user_id, module.course_id)


def module_lock_reason(db: Session, user_id: int | None, module: Module) -> str | None:
    if can_access_module(db, user_id, module):
        return None
    return "course_purchase_required"
