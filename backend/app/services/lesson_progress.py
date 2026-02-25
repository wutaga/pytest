from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.content import Exercise, Lesson
from app.models.gamification import Event, UserProgress
from app.models.user import User


def _payload_lesson_id(payload: object) -> int | None:
    if not isinstance(payload, dict):
        return None
    try:
        return int(payload.get("lesson_id"))
    except (TypeError, ValueError):
        return None


def is_lesson_completed(db: Session, user_id: int, lesson_id: int) -> bool:
    events = (
        db.query(Event.payload)
        .filter(
            Event.user_id == user_id,
            Event.type.in_(["lesson_completed", "lesson_theory_completed"]),
        )
        .all()
    )
    return any(_payload_lesson_id(row[0]) == lesson_id for row in events)


def is_lesson_completed_for_user(db: Session, user_id: int, lesson_id: int) -> bool:
    # Для практических уроков считаем completion по факту выполненных заданий,
    # чтобы старые/ошибочные события не показывали ложный completed.
    if has_exercises(db, lesson_id):
        return are_all_lesson_exercises_completed(db, user_id, lesson_id)
    return is_lesson_completed(db, user_id, lesson_id)


def has_exercises(db: Session, lesson_id: int) -> bool:
    return (
        db.query(Exercise.id)
        .filter(Exercise.lesson_id == lesson_id, Exercise.deleted_at.is_(None))
        .first()
        is not None
    )


def are_all_lesson_exercises_completed(db: Session, user_id: int, lesson_id: int) -> bool:
    exercise_rows = (
        db.query(Exercise.id)
        .filter(Exercise.lesson_id == lesson_id, Exercise.deleted_at.is_(None))
        .all()
    )
    exercise_ids = [int(row[0]) for row in exercise_rows if row[0] is not None]
    if not exercise_ids:
        return False

    completed_count = (
        db.query(func.count(UserProgress.id))
        .filter(
            UserProgress.user_id == user_id,
            UserProgress.exercise_id.in_(exercise_ids),
            UserProgress.status == "completed",
        )
        .scalar()
        or 0
    )
    return int(completed_count) >= len(exercise_ids)


def complete_lesson_if_eligible(db: Session, user: User, lesson: Lesson) -> int:
    if is_lesson_completed(db, user.id, lesson.id):
        return 0

    lesson_has_exercises = has_exercises(db, lesson.id)
    if lesson_has_exercises and not are_all_lesson_exercises_completed(
        db, user.id, lesson.id
    ):
        return 0

    db.add(
        Event(
            user_id=user.id,
            type="lesson_completed",
            payload={"lesson_id": lesson.id},
        )
    )
    user.xp += lesson.xp_reward
    return lesson.xp_reward
