from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Task, Transaction, TaskStatus
from app.routes.users import get_current_user
from app.models.models import User

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    total = len(tasks)
    completed = len([t for t in tasks if t.status == TaskStatus.completed])
    failed = len([t for t in tasks if t.status == TaskStatus.failed])
    active = len([t for t in tasks if t.status == TaskStatus.active])
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
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import bcrypt
    if not bcrypt.checkpw(old_password.encode('utf-8'), current_user.password_hash.encode('utf-8')):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
    
    current_user.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.commit()
    return {"message": "Şifre başarıyla değiştirildi"}