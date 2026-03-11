from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Task, Transaction, TaskStatus
from app.routes.users import get_current_user
from app.models.models import User
from app.auth import verify_password, hash_password
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/profile", tags=["profile"])

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError("Şifre en az 6 karakter olmalı")
        return v

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(func.count(Task.id)).filter(Task.user_id == current_user.id).scalar()
    completed = db.query(func.count(Task.id)).filter(Task.user_id == current_user.id, Task.status == TaskStatus.completed).scalar()
    failed = db.query(func.count(Task.id)).filter(Task.user_id == current_user.id, Task.status == TaskStatus.failed).scalar()
    active = db.query(func.count(Task.id)).filter(Task.user_id == current_user.id, Task.status == TaskStatus.active).scalar()
    success_rate = round((completed / total * 100), 1) if total > 0 else 0

    return {
        "total_tasks": total,
        "completed": completed,
        "failed": failed,
        "active": active,
        "success_rate": success_rate,
        "balance": current_user.balance
    }

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.created_at.desc()).limit(20).all()
    
    return [
        {
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "created_at": t.created_at
        }
        for t in transactions
    ]

@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
    
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Şifre başarıyla değiştirildi"}