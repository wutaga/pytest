from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.content import Lesson, Exercise
from app.models.gamification import Event, UserProgress
from app.api.deps import get_current_user, get_optional_user

router = APIRouter()


# --- Схемы ---

class SubmitAnswer(BaseModel):
    answer: str  # для quiz — выбранный вариант, для gap_fill — введённый текст


class SubmitResult(BaseModel):
    correct: bool
    xp_earned: int
    explanation: str
    correct_answer: str


class LessonProgressResponse(BaseModel):
    completed_exercise_ids: list[int]
    lesson_completed: bool


# --- Роуты ---

def _is_lesson_completed(db: Session, user_id: int, lesson_id: int) -> bool:
    events = (
        db.query(Event)
        .filter(
            Event.user_id == user_id,
            Event.type.in_(["lesson_completed", "lesson_theory_completed"]),
        )
        .all()
    )
    for event in events:
        if not isinstance(event.payload, dict):
            continue
        try:
            event_lesson_id = int(event.payload.get("lesson_id", -1))
        except (TypeError, ValueError):
            event_lesson_id = -1
        if event_lesson_id == lesson_id:
            return True
    return False

@router.get("/lessons/{lesson_id}")
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Урок не найден")

    lesson_completed = False
    xp_earned_on_open = 0
    if current_user:
        lesson_completed = _is_lesson_completed(db, current_user.id, lesson_id)
        if not lesson_completed:
            db.add(
                Event(
                    user_id=current_user.id,
                    type="lesson_completed",
                    payload={"lesson_id": lesson_id},
                )
            )
            current_user.xp += lesson.xp_reward
            xp_earned_on_open = lesson.xp_reward
            lesson_completed = True
            db.commit()

    return {
        "id": lesson.id,
        "title": lesson.title,
        "theory": lesson.theory,
        "xp_reward": lesson.xp_reward,
        "lesson_completed": lesson_completed,
        "xp_earned_on_open": xp_earned_on_open,
        "exercises": [
            {
                "id": ex.id,
                "type": ex.type,
                "content": ex.content,
                "xp_reward": ex.xp_reward,
            }
            for ex in lesson.exercises
        ],
    }


@router.get("/lessons/{lesson_id}/progress", response_model=LessonProgressResponse)
def get_lesson_progress(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    if not current_user:
        return LessonProgressResponse(completed_exercise_ids=[], lesson_completed=False)

    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Урок не найден")

    lesson_exercise_ids = [ex.id for ex in lesson.exercises]
    if not lesson_exercise_ids:
        return LessonProgressResponse(
            completed_exercise_ids=[],
            lesson_completed=_is_lesson_completed(db, current_user.id, lesson_id),
        )

    rows = (
        db.query(UserProgress.exercise_id)
        .filter(
            UserProgress.user_id == current_user.id,
            UserProgress.exercise_id.in_(lesson_exercise_ids),
            UserProgress.status == "completed",
        )
        .all()
    )
    return LessonProgressResponse(
        completed_exercise_ids=[int(row[0]) for row in rows if row[0] is not None],
        lesson_completed=_is_lesson_completed(db, current_user.id, lesson_id),
    )


@router.post("/exercises/{exercise_id}/submit", response_model=SubmitResult)
def submit_answer(
    exercise_id: int,
    payload: SubmitAnswer,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Находим задание
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    # Проверяем ответ в зависимости от типа
    correct = False
    correct_answer = ""
    explanation = ""

    if exercise.type == "quiz":
        correct_answer = exercise.content.get("correct", "")
        explanation = exercise.content.get("explanation", "")
        correct = payload.answer.strip() == correct_answer.strip()

    elif exercise.type == "gap_fill":
        correct_answer = exercise.content.get("answer", "")
        explanation = exercise.content.get("hint", "")
        correct = payload.answer.strip().lower() == correct_answer.strip().lower()

    else:
        raise HTTPException(status_code=400, detail=f"Тип {exercise.type} пока не поддерживается")

    # XP фиксированный: при первом успешном completed — полный xp_reward, повторно — 0
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.exercise_id == exercise_id,
    ).first()

    xp_earned = 0

    if correct:
        if progress and progress.status == "completed":
            # Уже выполнено — XP не начисляем повторно
            xp_earned = 0
        else:
            # Первое успешное выполнение — полный XP
            xp_earned = exercise.xp_reward

    # Обновляем или создаём запись прогресса
    if progress:
        progress.attempts += 1
        if correct and progress.status != "completed":
            progress.status = "completed"
            progress.xp_earned = xp_earned
            progress.completed_at = datetime.now(timezone.utc)
    else:
        progress = UserProgress(
            user_id=current_user.id,
            exercise_id=exercise_id,
            status="completed" if correct else "in_progress",
            attempts=1,
            xp_earned=xp_earned,
            completed_at=datetime.now(timezone.utc) if correct else None,
        )
        db.add(progress)

    # Начисляем XP пользователю
    if xp_earned > 0:
        current_user.xp += xp_earned

    db.commit()

    return SubmitResult(
        correct=correct,
        xp_earned=xp_earned,
        explanation=explanation,
        correct_answer=correct_answer,
    )
