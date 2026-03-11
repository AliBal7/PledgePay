from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Task, Transaction, TaskStatus, VerificationMethod
from app.routes.users import get_current_user
from app.models.models import User
from app.utils import calculate_distance
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    verification_method: str = "manual"
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_radius: Optional[float] = 200.0
    deadline: datetime
    stake_amount: float

    @field_validator("stake_amount")
    @classmethod
    def validate_stake(cls, v):
        if v <= 0:
            raise ValueError("Taahhüt miktarı 0'dan büyük olmalı")
        return v

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Başlık boş olamaz")
        return v

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    verification_method: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_radius: Optional[float]
    deadline: datetime
    stake_amount: float
    status: str
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=TaskResponse)
def create_task(task_data: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.balance < task_data.stake_amount:
        raise HTTPException(status_code=400, detail="Yetersiz bakiye")
    if task_data.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Deadline bugünden sonra olmalı")

    task = Task(
        user_id=current_user.id,
        title=task_data.title,
        description=task_data.description,
        verification_method=VerificationMethod(task_data.verification_method),
        location_lat=task_data.location_lat,
        location_lng=task_data.location_lng,
        location_radius=task_data.location_radius,
        deadline=task_data.deadline,
        stake_amount=task_data.stake_amount,
    )

    current_user.balance -= task_data.stake_amount
    transaction = Transaction(
        user_id=current_user.id,
        amount=-task_data.stake_amount,
        type="deposit",
        description=f"Görev taahhüdü: {task_data.title}"
    )

    db.add(task)
    db.add(transaction)
    db.commit()
    db.refresh(task)
    return task

@router.get("/archived", response_model=list[TaskResponse])
def get_archived_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.is_archived == True
    ).order_by(Task.created_at.desc()).all()

@router.get("/", response_model=list[TaskResponse])
def get_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.is_archived == False
    ).all()

@router.post("/{task_id}/verify")
def verify_task(task_id: int, user_lat: float, user_lng: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    if task.status != TaskStatus.active:
        raise HTTPException(status_code=400, detail="Görev zaten tamamlanmış veya başarısız")
    if datetime.utcnow() > task.deadline:
        task.status = TaskStatus.failed
        transaction = Transaction(
            user_id=current_user.id,
            task_id=task.id,
            amount=-task.stake_amount,
            type="commission",
            description=f"Deadline aşıldı: {task.title}"
        )
        db.add(transaction)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Görev süresi doldu. {task.stake_amount} token kaybedildi.")

    if task.verification_method == VerificationMethod.gps:
        distance = calculate_distance(user_lat, user_lng, task.location_lat, task.location_lng)
        if distance > task.location_radius:
            raise HTTPException(status_code=400, detail=f"Hedefe çok uzaksın! Mesafe: {int(distance)}m")

    task.status = TaskStatus.completed
    current_user.balance += task.stake_amount
    transaction = Transaction(
        user_id=current_user.id,
        task_id=task.id,
        amount=task.stake_amount,
        type="refund",
        description=f"Görev tamamlandı: {task.title}"
    )

    db.add(transaction)
    db.commit()
    return {"message": "Tebrikler! Görev tamamlandı 🎉", "balance": current_user.balance}

@router.post("/{task_id}/forfeit")
def forfeit_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    if task.status != TaskStatus.active:
        raise HTTPException(status_code=400, detail="Görev zaten tamamlanmış veya başarısız")

    task.status = TaskStatus.failed
    transaction = Transaction(
        user_id=current_user.id,
        task_id=task.id,
        amount=-task.stake_amount,
        type="commission",
        description=f"Görevden vazgeçildi: {task.title}"
    )
    db.add(transaction)
    db.commit()

    return {
        "message": f"Görevden vazgeçildi. {task.stake_amount} token kaybedildi.",
        "balance": current_user.balance
    }

@router.post("/{task_id}/archive")
def archive_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    if task.status == TaskStatus.active:
        raise HTTPException(status_code=400, detail="Aktif görevler arşivlenemez")
    task.is_archived = True
    db.commit()
    return {"message": "Görev arşivlendi"}