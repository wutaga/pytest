from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.database import get_db
from app.models.content import Course, Exercise, Lesson, Module
from app.models.gamification import UserProgress
from app.models.user import User
from app.services.access import can_access_module, has_course_purchase, module_lock_reason
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

    paid_access = has_course_purchase(db, user.id if user else None, course.id)
    modules = []
    for module in sorted((m for m in course.modules if m.deleted_at is None), key=lambda m: m.order_index):
        lessons = sorted((l for l in module.lessons if l.deleted_at is None), key=lambda l: l.order_index)
        locked = not can_access_module(db, user.id if user else None, module)
        lock_reason = module_lock_reason(db, user.id if user else None, module)
        modules.append(
            {
                "id": module.id,
                "title": module.title,
                "order_index": module.order_index,
                "is_free": module.is_free,
                "locked": locked,
                "lock_reason": lock_reason,
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

    locked = not can_access_module(db, user.id if user else None, module)
    lock_reason = module_lock_reason(db, user.id if user else None, module)

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
        "lock_reason": lock_reason,
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


@router.get("/{slug}/progress")
def get_course_progress(
    slug: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_current_user_optional(request, db)
    course = (
        db.query(Course)
        .options(
            selectinload(Course.modules)
            .selectinload(Module.lessons)
            .selectinload(Lesson.exercises)
        )
        .filter(
            Course.slug == slug,
            Course.is_published.is_(True),
            Course.deleted_at.is_(None),
        )
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")

    modules = sorted(
        (m for m in course.modules if m.deleted_at is None),
        key=lambda m: m.order_index,
    )
    all_lessons: list[Lesson] = []
    all_exercise_ids: list[int] = []
    module_lessons: dict[int, list[Lesson]] = {}
    module_exercise_ids: dict[int, list[int]] = {}

    for module in modules:
        lessons = sorted(
            (l for l in module.lessons if l.deleted_at is None),
            key=lambda l: l.order_index,
        )
        module_lessons[module.id] = lessons
        all_lessons.extend(lessons)

        exercise_ids: list[int] = []
        for lesson in lessons:
            lesson_exercises = [
                ex for ex in lesson.exercises if ex.deleted_at is None
            ]
            exercise_ids.extend(int(ex.id) for ex in lesson_exercises)
        module_exercise_ids[module.id] = exercise_ids
        all_exercise_ids.extend(exercise_ids)

    completed_exercise_ids: set[int] = set()
    if user and all_exercise_ids:
        rows = (
            db.query(UserProgress.exercise_id)
            .filter(
                UserProgress.user_id == user.id,
                UserProgress.exercise_id.in_(all_exercise_ids),
                UserProgress.status == "completed",
            )
            .all()
        )
        completed_exercise_ids = {
            int(row[0]) for row in rows if row[0] is not None
        }

    completed_lessons_by_id: set[int] = set()
    if user:
        for lesson in all_lessons:
            lesson_ex_ids = [
                int(ex.id)
                for ex in lesson.exercises
                if ex.deleted_at is None
            ]
            if lesson_ex_ids:
                if all(ex_id in completed_exercise_ids for ex_id in lesson_ex_ids):
                    completed_lessons_by_id.add(int(lesson.id))
            elif is_lesson_completed_for_user(db, user.id, lesson.id):
                completed_lessons_by_id.add(int(lesson.id))

    module_progress = []
    for module in modules:
        lessons = module_lessons[module.id]
        exercise_ids = module_exercise_ids[module.id]
        completed_lessons = sum(
            1 for lesson in lessons if int(lesson.id) in completed_lessons_by_id
        )
        completed_exercises = sum(
            1 for ex_id in exercise_ids if ex_id in completed_exercise_ids
        )
        module_progress.append(
            {
                "module_id": module.id,
                "locked": not can_access_module(db, user.id if user else None, module),
                "lock_reason": module_lock_reason(db, user.id if user else None, module),
                "lessons_total": len(lessons),
                "lessons_completed": completed_lessons,
                "exercises_total": len(exercise_ids),
                "exercises_completed": completed_exercises,
            }
        )

    lessons_total = len(all_lessons)
    lessons_completed = len(completed_lessons_by_id)
    exercises_total = len(all_exercise_ids)
    exercises_completed = len(completed_exercise_ids)

    return {
        "course_id": course.id,
        "course_slug": course.slug,
        "lessons_total": lessons_total,
        "lessons_completed": lessons_completed,
        "exercises_total": exercises_total,
        "exercises_completed": exercises_completed,
        "modules": module_progress,
    }
