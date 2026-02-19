# PyTestLab

Интерактивный тренажёр для обучения тестированию на Python.

## 📋 Описание

PyTestLab — платформа где студенты пишут реальные тесты на pytest прямо в браузере. 
Код выполняется на сервере против учебного API, результат возвращается мгновенно.

## 🏗️ Архитектура

```
pytestlab/
├── backend/           # Основной API (FastAPI)
├── frontend/          # React + TypeScript приложение
├── educational_api/   # Учебное API для тестирования
└── infrastructure/    # Docker, Celery, Redis конфигурации
```

## 🚀 Быстрый старт

### Требования
- Docker & Docker Compose
- Python 3.12+

### Запуск разработки

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Backend доступен на http://localhost:8000
# Frontend на http://localhost:3000
# Educational API на http://localhost:8001
```

## 📦 Технологический стек

**Backend:**
- FastAPI
- PostgreSQL + SQLAlchemy + Alembic
- Celery + Redis
- Docker SDK

**Frontend:**
- React + TypeScript
- Tailwind CSS
- Monaco Editor
- WebSocket

**Инфраструктура:**
- Docker & Docker Compose
- Nginx
- GitHub Actions

## 📚 Структура курса

**Бесплатный модуль:**
- Основы pytest (assertions, fixtures, parametrize, markers)
- Тестирование API (GET, POST, PUT, DELETE)

**Premium модуль:**
- Page Object Model
- Моки и стабы
- Интеграция с CI/CD

## 💰 Монетизация

- Бесплатно: базовый модуль
- Premium: 299-499 руб/мес

## 📝 License

MIT
