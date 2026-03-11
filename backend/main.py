from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.models.models import Base
from app.database import engine
from app.routes.users import router as auth_router
from app.routes.tasks import router as tasks_router
from app.routes.profile import router as profile_router
from app.routes.groups import router as groups_router
from app.routes.notifications import router as notifications_router
from dotenv import load_dotenv
import os
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

# Canlı DB'ye eksik kolonları ekle (idempotent migration)
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE"))
    conn.commit()

app = FastAPI(title="PledgePay API", version="1.1.0")

allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://pledge-pay.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Sunucu hatası oluştu"})

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(profile_router)
app.include_router(groups_router)
app.include_router(notifications_router)

@app.get("/")
def root():
    return {"message": "PledgePay API çalışıyor 🚀"}