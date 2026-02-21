from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.content import Lesson

router = APIRouter()

@router.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Урок не найден")

    return {
        "id": lesson.id,
        "title": lesson.title,
        "theory": lesson.theory,
        "exercises": [
            {
                "id": ex.id,
                "type": ex.type,
                "content": ex.content,
                "xp_reward": ex.xp_reward
            }
            for ex in lesson.exercises
        ]
    }