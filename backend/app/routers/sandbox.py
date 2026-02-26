import os
import shutil
import subprocess
import tempfile
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from app.api.deps import get_current_user
from app.database import SessionLocal
from app.models.content import Exercise, Lesson
from app.models.gamification import UserProgress
from app.models.user import User
from app.services.lesson_progress import complete_lesson_if_eligible

router = APIRouter()


class RunCodeRequest(BaseModel):
    code: str
    exercise_id: int | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if len(value) > MAX_CODE_CHARS:
            raise ValueError(
                f"Код слишком длинный. Максимум {MAX_CODE_CHARS} символов."
            )
        return value


class RunCodeResponse(BaseModel):
    stdout: str
    stderr: str
    passed: bool
    exit_code: int
    display_passed: bool | None = None
    xp_earned: int = 0


BACKEND_ROOT = Path(__file__).resolve().parents[2]
GRADER_SUITES_ROOT = BACKEND_ROOT / "grader_suites"
MAX_OUTPUT_CHARS = 20_000
MAX_CODE_CHARS = 20_000
RUN_CODE_RATE_LIMIT = 20
RUN_CODE_WINDOW_SECONDS = 60

_rate_lock = threading.Lock()
_rate_bucket: dict[int, deque[datetime]] = defaultdict(deque)


def _truncate_output(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    tail = f"\n\n... [output truncated to {MAX_OUTPUT_CHARS} chars]"
    return text[:MAX_OUTPUT_CHARS] + tail


def _check_rate_limit(user_id: int) -> None:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=RUN_CODE_WINDOW_SECONDS)
    with _rate_lock:
        q = _rate_bucket[user_id]
        while q and q[0] < window_start:
            q.popleft()
        if len(q) >= RUN_CODE_RATE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Слишком много запусков кода. "
                    "Подождите минуту и попробуйте снова."
                ),
            )
        q.append(now)


def _run_pytest_in_sandbox(tmpdir: str, target: str) -> tuple[str, str, int]:
    result = subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "--memory",
            "128m",
            "--cpus",
            "0.5",
            "--pids-limit",
            "128",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--read-only",
            "--tmpfs",
            "/tmp:rw,nosuid,nodev,noexec,size=16m",
            "-v",
            f"{tmpdir}:/code",
            "devdrill-sandbox",
            "pytest",
            target,
            "-v",
            "--tb=short",
            "--no-header",
            "-p",
            "no:cacheprovider",
        ],
        capture_output=True,
        text=True,
        timeout=15,
    )
    return (
        _truncate_output(result.stdout),
        _truncate_output(result.stderr),
        result.returncode,
    )


def _load_grader(exercise_id: int) -> dict[str, Any] | None:
    db = SessionLocal()
    try:
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        if not exercise or exercise.type != "code_runner":
            return None
        content = exercise.content or {}
        grader = content.get("grader")
        return grader if isinstance(grader, dict) else None
    finally:
        db.close()


def _apply_code_runner_progress(user_id: int, exercise_id: int, passed: bool) -> int:
    db = SessionLocal()
    try:
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        if not exercise or exercise.type != "code_runner":
            return 0

        progress = (
            db.query(UserProgress)
            .filter(
                UserProgress.user_id == user_id,
                UserProgress.exercise_id == exercise_id,
            )
            .first()
        )
        was_completed = bool(progress and progress.status == "completed")

        xp_earned = 0
        if passed:
            if was_completed:
                xp_earned = 0
            else:
                xp_earned = exercise.xp_reward

        if progress:
            progress.attempts += 1
            if passed and progress.status != "completed":
                progress.status = "completed"
                progress.xp_earned = xp_earned
                progress.completed_at = datetime.now(timezone.utc)
        else:
            progress = UserProgress(
                user_id=user_id,
                exercise_id=exercise_id,
                status="completed" if passed else "in_progress",
                attempts=1,
                xp_earned=xp_earned,
                completed_at=datetime.now(timezone.utc) if passed else None,
            )
            db.add(progress)

        if xp_earned > 0:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.xp += xp_earned
        else:
            user = db.query(User).filter(User.id == user_id).first()

        if user:
            lesson = db.query(Lesson).filter(Lesson.id == exercise.lesson_id).first()
            if lesson:
                complete_lesson_if_eligible(db, user, lesson)

        db.commit()
        return xp_earned
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _resolve_suite_dir(suite: str) -> Path:
    if not suite:
        raise HTTPException(status_code=400, detail="Не задан grader.suite")

    base = GRADER_SUITES_ROOT.resolve()
    candidate = (base / suite).resolve()
    if not str(candidate).startswith(str(base) + os.sep):
        raise HTTPException(status_code=400, detail="Некорректный путь grader.suite")
    if not candidate.is_dir():
        raise HTTPException(status_code=400, detail="Папка grader.suite не найдена")
    if not (candidate / "test_hidden.py").is_file():
        raise HTTPException(
            status_code=400, detail="В grader.suite отсутствует test_hidden.py"
        )
    return candidate


def _run_default_pytest(student_code: str) -> RunCodeResponse:
    with tempfile.TemporaryDirectory() as tmpdir:
        student_file = os.path.join(tmpdir, "student_solution.py")
        with open(student_file, "w", encoding="utf-8") as f:
            f.write(student_code)

        try:
            stdout, stderr, exit_code = _run_pytest_in_sandbox(
                tmpdir, "student_solution.py"
            )
            return RunCodeResponse(
                stdout=stdout,
                stderr=stderr,
                passed=exit_code == 0,
                exit_code=exit_code,
                display_passed=exit_code == 0,
            )
        except subprocess.TimeoutExpired:
            return RunCodeResponse(
                stdout="",
                stderr="Превышено время выполнения (15 секунд)",
                passed=False,
                exit_code=-1,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc


def _run_pytest_hidden_suite(
    student_code: str, suite: str, grader: dict[str, Any]
) -> RunCodeResponse:
    suite_dir = _resolve_suite_dir(suite)

    with tempfile.TemporaryDirectory() as tmpdir:
        student_file = Path(tmpdir) / "student_solution.py"
        suite_target = Path(tmpdir) / "suite"
        student_file.write_text(student_code, encoding="utf-8")
        shutil.copytree(suite_dir, suite_target)

        try:
            stdout, stderr, exit_code = _run_pytest_in_sandbox(tmpdir, "suite")
            success_message = grader.get("success_message")
            failure_message = grader.get("failure_message")
            show_student_pytest_output = bool(
                grader.get("show_student_pytest_output", True)
            )

            student_stdout = ""
            student_stderr = ""
            student_exit_code = 0
            if show_student_pytest_output:
                student_stdout, student_stderr, student_exit_code = _run_pytest_in_sandbox(
                    tmpdir, "student_solution.py"
                )

            if exit_code == 0 and isinstance(success_message, str):
                return RunCodeResponse(
                    stdout=success_message,
                    stderr=(student_stdout or student_stderr) if show_student_pytest_output else (stdout or stderr),
                    passed=True,
                    exit_code=0,
                    display_passed=True,
                )
            if exit_code != 0 and isinstance(failure_message, str):
                return RunCodeResponse(
                    stdout=failure_message,
                    stderr=(student_stdout or student_stderr) if show_student_pytest_output else (stdout or stderr),
                    passed=False,
                    exit_code=exit_code,
                    display_passed=False,
                )

            return RunCodeResponse(
                stdout=stdout,
                stderr=stderr,
                passed=exit_code == 0,
                exit_code=exit_code,
                display_passed=exit_code == 0,
            )
        except subprocess.TimeoutExpired:
            return RunCodeResponse(
                stdout="",
                stderr="Превышено время выполнения (15 секунд)",
                passed=False,
                exit_code=-1,
                display_passed=False,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/run-code", response_model=RunCodeResponse)
async def run_code(request: RunCodeRequest, current_user=Depends(get_current_user)):
    if len(request.code) > 10_000:
        raise HTTPException(status_code=400, detail="Код слишком длинный")
    _check_rate_limit(current_user.id)

    if request.exercise_id is not None:
        grader = _load_grader(request.exercise_id)
        if grader:
            engine = grader.get("engine")
            if engine == "pytest_hidden":
                suite = grader.get("suite")
                if not isinstance(suite, str):
                    raise HTTPException(
                        status_code=400, detail="Некорректный grader.suite"
                    )
                response = _run_pytest_hidden_suite(request.code, suite, grader)
                response.xp_earned = _apply_code_runner_progress(
                    current_user.id, request.exercise_id, response.passed
                )
                return response
            raise HTTPException(
                status_code=400, detail=f"Неподдерживаемый grader.engine: {engine}"
            )

    response = _run_default_pytest(request.code)
    if request.exercise_id is not None:
        response.xp_earned = _apply_code_runner_progress(
            current_user.id, request.exercise_id, response.passed
        )
    return response
