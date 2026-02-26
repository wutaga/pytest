from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from app.database import get_db
from app.models.content import Lesson, Exercise
from app.models.gamification import UserProgress
from app.api.deps import get_current_user, get_optional_user
from app.services.lesson_progress import (
    complete_lesson_if_eligible,
    is_lesson_completed,
    is_lesson_completed_for_user,
)

router = APIRouter()


# --- Схемы ---

class SubmitAnswer(BaseModel):
    answer: str  # для quiz — выбранный вариант, для gap_fill/terminal_command — введённый текст

    @field_validator("answer")
    @classmethod
    def validate_answer(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) > 300:
            raise ValueError("Ответ слишком длинный")
        if any(ord(ch) < 32 and ch not in ("\t", "\n", "\r") for ch in cleaned):
            raise ValueError("Ответ содержит недопустимые символы")
        return cleaned


class SubmitResult(BaseModel):
    correct: bool
    xp_earned: int
    explanation: str
    correct_answer: str


class LessonProgressResponse(BaseModel):
    completed_exercise_ids: list[int]
    lesson_completed: bool


# --- Роуты ---

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
        lesson_completed = is_lesson_completed_for_user(db, current_user.id, lesson_id)
        if not lesson_completed:
            # Теория (без заданий) завершается на открытии.
            # Для практики это станет true только когда все задания completed.
            xp_earned_on_open = complete_lesson_if_eligible(db, current_user, lesson)
            lesson_completed = xp_earned_on_open > 0 or is_lesson_completed_for_user(
                db, current_user.id, lesson_id
            )
            if xp_earned_on_open > 0:
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
            for ex in sorted(
                lesson.exercises,
                key=lambda ex: (ex.order_index, ex.id),
            )
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
            lesson_completed=is_lesson_completed_for_user(
                db, current_user.id, lesson_id
            ),
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
        lesson_completed=is_lesson_completed_for_user(db, current_user.id, lesson_id),
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

    elif exercise.type in {"gap_fill", "terminal_command"}:
        answer_value = exercise.content.get("answer", "")
        explanation = exercise.content.get("hint", "")
        user_answer = payload.answer.strip().lower()
        if isinstance(answer_value, list):
            normalized_answers = [
                str(item).strip().lower() for item in answer_value if str(item).strip()
            ]
            correct_answer = normalized_answers[0] if normalized_answers else ""
            correct = user_answer in normalized_answers
        else:
            correct_answer = str(answer_value)
            correct = user_answer == correct_answer.strip().lower()

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

    lesson = db.query(Lesson).filter(Lesson.id == exercise.lesson_id).first()
    if lesson:
        complete_lesson_if_eligible(db, current_user, lesson)

    db.commit()

    return SubmitResult(
        correct=correct,
        xp_earned=xp_earned,
        explanation=explanation,
        correct_answer=correct_answer,
    )
