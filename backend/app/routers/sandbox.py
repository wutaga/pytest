import subprocess
import tempfile
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class RunCodeRequest(BaseModel):
    code: str


class RunCodeResponse(BaseModel):
    stdout: str
    stderr: str
    passed: bool
    exit_code: int


@router.post("/run-code", response_model=RunCodeResponse)
async def run_code(request: RunCodeRequest):
    if len(request.code) > 10_000:
        raise HTTPException(status_code=400, detail="Код слишком длинный")

    with tempfile.TemporaryDirectory() as tmpdir:
        code_file = os.path.join(tmpdir, "test_solution.py")

        with open(code_file, "w") as f:
            f.write(request.code)

        try:
            result = subprocess.run(
                [
                    "docker", "run",
                    "--rm",
                    "--network", "none",          # без сети
                    "--memory", "128m",            # лимит памяти
                    "--cpus", "0.5",               # лимит CPU
                    "-v", f"{tmpdir}:/code",
                    "devdrill-sandbox",
                    "pytest", "test_solution.py", "-v", "--tb=short", "--no-header"
                ],
                capture_output=True,
                text=True,
                timeout=15,                        # максимум 15 секунд
            )

            stdout = result.stdout
            stderr = result.stderr
            exit_code = result.returncode
            passed = exit_code == 0

            return RunCodeResponse(
                stdout=stdout,
                stderr=stderr,
                passed=passed,
                exit_code=exit_code,
            )

        except subprocess.TimeoutExpired:
            return RunCodeResponse(
                stdout="",
                stderr="Превышено время выполнения (15 секунд)",
                passed=False,
                exit_code=-1,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))