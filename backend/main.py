from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.models import Base
from app.database import engine
from app.routes.users import router as auth_router
from app.routes.tasks import router as tasks_router
from app.routes.profile import router as profile_router
from app.routes.groups import router as groups_router
from app.routes.notifications import router as notifications_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PledgePay API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(profile_router)
app.include_router(groups_router)
app.include_router(notifications_router)

@app.get("/")
def root():
    return {"message": "PledgePay API çalışıyor 🚀"}