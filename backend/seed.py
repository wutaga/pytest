from app.database import SessionLocal
from app.models.content import Course, Module, Lesson, Exercise

db = SessionLocal()

course = Course(
    title="Pytest с нуля",
    slug="pytest",
    description="Интерактивный курс по тестированию на Python. Пишешь реальные тесты прямо в браузере.",
    price=0,
    is_published=True
)
db.add(course)
db.flush()

module = Module(
    course_id=course.id,
    title="Модуль 1 — Основы",
    order_index=0,
    is_free=True
)
db.add(module)
db.flush()

lesson = Lesson(
    module_id=module.id,
    title="Урок 1 — Что такое тест?",
    order_index=0,
    xp_reward=10,
    theory=[
        {"type": "heading", "text": "Что такое тест?"},
        {"type": "paragraph", "text": "Представь что ты написал функцию которая складывает два числа. Как проверяешь что она работает? Запускаешь, смотришь глазами — ну вроде норм. Это ненадёжно."},
        {"type": "paragraph", "text": "Тест — это код который проверяет твой код автоматически. Один раз написал — запускаешь хоть тысячу раз."},
        {"type": "code", "language": "python", "text": "def add(x, y):\n    return x + y\n\ndef test_add():\n    assert add(2, 3) == 5"},
        {"type": "callout", "style": "info", "text": "assert — ключевое слово Python. Ты говоришь: я утверждаю что это правда. Если неправда — тест падает и pytest показывает где именно."},
        {"type": "paragraph", "text": "Pytest сам находит тесты — любая функция начинающаяся с test_ считается тестом."}
    ]
)
db.add(lesson)
db.flush()

exercise = Exercise(
    lesson_id=lesson.id,
    order_index=0,
    type="quiz",
    xp_reward=20,
    content={
        "question": "Какая из этих функций будет найдена pytest автоматически?",
        "options": ["check_user()", "test_user()", "user_test()", "run_test()"],
        "correct": "test_user()",
        "explanation": "pytest ищет функции которые начинаются с test_ — это соглашение об именовании."
    }
)
db.add(exercise)
db.commit()
print("✅ Данные добавлены")
db.close()