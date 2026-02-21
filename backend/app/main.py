from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.lessons import router as lessons_router
from app.api.auth import router as auth_router

app = FastAPI(title="DevDrill API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lessons_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
