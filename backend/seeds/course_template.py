"""
Шаблон сид-файла курса.

Как использовать:
1) Скопируй файл и переименуй, например: backend/seeds/pytest_course.py
2) Заполни структуру COURSE_DATA ниже
3) Запусти:
   cd ~/pytest/backend
   source .venv/bin/activate
   python seeds/pytest_course.py
"""

from app.database import SessionLocal
from app.models.content import Course, Exercise, Lesson, Module


COURSE_DATA = {
    "title": "Название курса",
    "slug": "course-slug",
    "description": "Короткое описание курса",
    "price": 990,  # 0 если бесплатный
    "is_published": True,
    "modules": [
        {
            "title": "Модуль 1 — Введение",
            "order_index": 0,
            "is_free": True,
            "lessons": [
                {
                    "title": "Урок 1 — Тема",
                    "order_index": 0,
                    "xp_reward": 10,
                    "theory": [
                        {"type": "heading", "text": "Заголовок урока"},
                        {"type": "paragraph", "text": "Краткое объяснение темы."},
                        {
                            "type": "code",
                            "language": "python",
                            "text": "def test_example():\n    assert 1 + 1 == 2",
                        },
                        {"type": "callout", "style": "info", "text": "Важная мысль урока."},
                    ],
                    "exercises": [
                        {
                            "type": "quiz",
                            "order_index": 0,
                            "xp_reward": 20,
                            "content": {
                                "question": "Какой вариант верный?",
                                "options": ["a", "b", "c"],
                                "correct": "b",
                                "explanation": "Потому что ...",
                            },
                        }
                    ],
                }
            ],
        },
        {
            "title": "Модуль 2 — Продвинутый",
            "order_index": 1,
            "is_free": False,
            "lessons": [],
        },
    ],
}


def seed_course(data: dict) -> None:
    db = SessionLocal()
    try:
        existing = db.query(Course).filter(Course.slug == data["slug"]).first()
        if existing:
            print(f"Курс со slug='{data['slug']}' уже существует. Пропускаю.")
            return

        course = Course(
            title=data["title"],
            slug=data["slug"],
            description=data.get("description", ""),
            price=data.get("price", 0),
            is_published=data.get("is_published", True),
        )
        db.add(course)
        db.flush()

        for module_data in data.get("modules", []):
            module = Module(
                course_id=course.id,
                title=module_data["title"],
                order_index=module_data.get("order_index", 0),
                is_free=module_data.get("is_free", False),
            )
            db.add(module)
            db.flush()

            for lesson_data in module_data.get("lessons", []):
                lesson = Lesson(
                    module_id=module.id,
                    title=lesson_data["title"],
                    order_index=lesson_data.get("order_index", 0),
                    xp_reward=lesson_data.get("xp_reward", 10),
                    theory=lesson_data.get("theory", []),
                )
                db.add(lesson)
                db.flush()

                for exercise_data in lesson_data.get("exercises", []):
                    exercise = Exercise(
                        lesson_id=lesson.id,
                        order_index=exercise_data.get("order_index", 0),
                        type=exercise_data["type"],
                        content=exercise_data.get("content", {}),
                        xp_reward=exercise_data.get("xp_reward", 10),
                    )
                    db.add(exercise)

        db.commit()
        print(f"✅ Курс '{course.title}' добавлен")
    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed_course(COURSE_DATA)
