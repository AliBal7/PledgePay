from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import GroupChallenge, GroupMember, TaskStatus, VerificationMethod, User, Transaction, Notification
from app.routes.users import get_current_user
from app.utils import calculate_distance, PLATFORM_COMMISSION_RATE
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
import random
import string
import json

router = APIRouter(prefix="/groups", tags=["groups"])

def generate_invite_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class GroupCreate(BaseModel):
    title: str
    description: Optional[str] = None
    verification_method: str = "manual"
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_radius: Optional[float] = 200.0
    stake_amount: float
    deadline: datetime
    max_members: Optional[int] = 10

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

class GroupResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    verification_method: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_radius: Optional[float]
    stake_amount: float
    deadline: datetime
    invite_code: str
    max_members: int
    member_count: int
    created_at: datetime
    creator_id: int
    my_status: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/")
def create_group(data: GroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.balance < data.stake_amount:
        raise HTTPException(status_code=400, detail="Yetersiz bakiye")
    if data.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Deadline bugünden sonra olmalı")
    if data.max_members < 2:
        raise HTTPException(status_code=400, detail="Grup en az 2 kişilik olmalı")

    invite_code = generate_invite_code()
    while db.query(GroupChallenge).filter(GroupChallenge.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    challenge = GroupChallenge(
        title=data.title,
        description=data.description,
        creator_id=current_user.id,
        verification_method=VerificationMethod(data.verification_method),
        location_lat=data.location_lat,
        location_lng=data.location_lng,
        location_radius=data.location_radius,
        stake_amount=data.stake_amount,
        deadline=data.deadline,
        invite_code=invite_code,
        max_members=data.max_members,
    )
    db.add(challenge)
    db.flush()

    member = GroupMember(challenge_id=challenge.id, user_id=current_user.id)
    current_user.balance -= data.stake_amount
    transaction = Transaction(
        user_id=current_user.id,
        amount=-data.stake_amount,
        type="deposit",
        description=f"Grup taahhüdü: {data.title}"
    )
    db.add(member)
    db.add(transaction)
    db.commit()
    db.refresh(challenge)

    members = db.query(GroupMember).filter(GroupMember.challenge_id == challenge.id).all()
    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "verification_method": challenge.verification_method.value,
        "location_lat": challenge.location_lat,
        "location_lng": challenge.location_lng,
        "location_radius": challenge.location_radius,
        "stake_amount": challenge.stake_amount,
        "deadline": challenge.deadline,
        "invite_code": challenge.invite_code,
        "max_members": challenge.max_members,
        "member_count": len(members),
        "created_at": challenge.created_at,
        "creator_id": challenge.creator_id,
        "my_status": "active"
    }

@router.post("/join/{invite_code}")
def join_group(invite_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.query(GroupChallenge).filter(GroupChallenge.invite_code == invite_code).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    if challenge.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Bu grubun süresi dolmuş")

    existing = db.query(GroupMember).filter(
        GroupMember.challenge_id == challenge.id,
        GroupMember.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zaten bu gruba üyesin")

    member_count = db.query(GroupMember).filter(GroupMember.challenge_id == challenge.id).count()
    if member_count >= challenge.max_members:
        raise HTTPException(status_code=400, detail="Grup dolu")

    if current_user.balance < challenge.stake_amount:
        raise HTTPException(status_code=400, detail="Yetersiz bakiye")

    member = GroupMember(challenge_id=challenge.id, user_id=current_user.id)
    current_user.balance -= challenge.stake_amount
    transaction = Transaction(
        user_id=current_user.id,
        amount=-challenge.stake_amount,
        type="deposit",
        description=f"Grup taahhüdü: {challenge.title}"
    )
    db.add(member)
    db.add(transaction)

    # Katılım bildirimi — grup kurucusuna
    notif = Notification(
        user_id=challenge.creator_id,
        type="group_join",
        title="Grubuna biri katıldı!",
        message=f"{current_user.username}, '{challenge.title}' grubuna katıldı.",
        data=json.dumps({"group_id": challenge.id})
    )
    db.add(notif)
    db.commit()

    return {"message": f"'{challenge.title}' grubuna katıldın! {challenge.stake_amount} token yatırıldı."}

@router.post("/{group_id}/invite/{username}")
def invite_by_username(group_id: int, username: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.query(GroupChallenge).filter(GroupChallenge.id == group_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    if challenge.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece grup kurucusu davet edebilir")

    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    existing = db.query(GroupMember).filter(
        GroupMember.challenge_id == group_id,
        GroupMember.user_id == target.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı zaten grupta")

    # Davet bildirimi gönder
    notif = Notification(
        user_id=target.id,
        type="group_invite",
        title="Gruba davet edildin!",
        message=f"{current_user.username} seni '{challenge.title}' grubuna davet etti. {challenge.stake_amount} token taahhüt gerekiyor.",
        data=json.dumps({"invite_code": challenge.invite_code, "group_id": challenge.id, "group_title": challenge.title, "stake_amount": challenge.stake_amount})
    )
    db.add(notif)
    db.commit()

    return {
        "message": f"{username} kullanıcısına davet bildirimi gönderildi.",
        "invite_code": challenge.invite_code
    }

@router.get("/")
def get_my_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.is_archived == False
    ).all()
    result = []
    for m in memberships:
        challenge = m.challenge
        member_count = db.query(GroupMember).filter(GroupMember.challenge_id == challenge.id).count()
        result.append({
            "id": challenge.id,
            "title": challenge.title,
            "description": challenge.description,
            "verification_method": challenge.verification_method.value,
            "location_lat": challenge.location_lat,
            "location_lng": challenge.location_lng,
            "location_radius": challenge.location_radius,
            "stake_amount": challenge.stake_amount,
            "deadline": challenge.deadline,
            "invite_code": challenge.invite_code,
            "max_members": challenge.max_members,
            "member_count": member_count,
            "created_at": challenge.created_at,
            "creator_id": challenge.creator_id,
            "my_status": m.status.value
        })
    return result

@router.post("/{group_id}/archive")
def archive_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(
        GroupMember.challenge_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Bu gruba üye değilsin")
    if membership.status == TaskStatus.active:
        raise HTTPException(status_code=400, detail="Aktif grup arşivlenemez")
    membership.is_archived = True
    db.commit()
    return {"message": "Grup arşivlendi"}

@router.get("/{group_id}")
def get_group_detail(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.query(GroupChallenge).filter(GroupChallenge.id == group_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    membership = db.query(GroupMember).filter(
        GroupMember.challenge_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Bu gruba üye değilsin")

    members = db.query(GroupMember).filter(GroupMember.challenge_id == group_id).all()
    members_data = []
    for m in members:
        members_data.append({
            "user_id": m.user_id,
            "username": m.user.username,
            "status": m.status.value,
            "joined_at": m.joined_at,
            "completed_at": m.completed_at,
        })

    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "verification_method": challenge.verification_method.value,
        "location_lat": challenge.location_lat,
        "location_lng": challenge.location_lng,
        "location_radius": challenge.location_radius,
        "stake_amount": challenge.stake_amount,
        "deadline": challenge.deadline,
        "invite_code": challenge.invite_code,
        "max_members": challenge.max_members,
        "creator_id": challenge.creator_id,
        "my_status": membership.status.value,
        "members": members_data
    }

@router.post("/{group_id}/verify")
def verify_group(group_id: int, user_lat: float = 0, user_lng: float = 0, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.query(GroupChallenge).filter(GroupChallenge.id == group_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    membership = db.query(GroupMember).filter(
        GroupMember.challenge_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Bu gruba üye değilsin")
    if membership.status != TaskStatus.active:
        raise HTTPException(status_code=400, detail="Zaten tamamladın veya başarısız oldun")
    if datetime.utcnow() > challenge.deadline:
        membership.status = TaskStatus.failed
        db.commit()
        raise HTTPException(status_code=400, detail="Süre doldu, görev başarısız.")

    if challenge.verification_method == VerificationMethod.gps:
        distance = calculate_distance(user_lat, user_lng, challenge.location_lat, challenge.location_lng)
        if distance > challenge.location_radius:
            raise HTTPException(status_code=400, detail=f"Hedefe çok uzaksın! Mesafe: {int(distance)}m")

    membership.status = TaskStatus.completed
    membership.completed_at = datetime.utcnow()
    db.commit()

    all_members = db.query(GroupMember).filter(GroupMember.challenge_id == group_id).all()
    all_done = all(m.status != TaskStatus.active for m in all_members)
    if all_done:
        _distribute_rewards(challenge, all_members, db)

    return {"message": "Tebrikler! Grup görevi tamamlandı 🎉"}

@router.post("/{group_id}/forfeit")
def forfeit_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.query(GroupChallenge).filter(GroupChallenge.id == group_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")

    membership = db.query(GroupMember).filter(
        GroupMember.challenge_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Bu gruba üye değilsin")
    if membership.status != TaskStatus.active:
        raise HTTPException(status_code=400, detail="Zaten tamamladın veya başarısız oldun")

    membership.status = TaskStatus.failed
    db.commit()

    # Diğer üyeler hala aktifse henüz ödül dağıtma
    all_members = db.query(GroupMember).filter(GroupMember.challenge_id == group_id).all()
    all_done = all(m.status != TaskStatus.active for m in all_members)
    if all_done:
        _distribute_rewards(challenge, all_members, db)

    return {"message": f"Gruptan vazgeçildi. {challenge.stake_amount} token kaybedildi."}

def _distribute_rewards(challenge: GroupChallenge, members: list, db: Session):
    winners = [m for m in members if m.status == TaskStatus.completed]
    losers = [m for m in members if m.status == TaskStatus.failed]

    if not losers:
        # Herkes tamamladı — token iade
        for m in winners:
            user = db.query(User).filter(User.id == m.user_id).first()
            user.balance += challenge.stake_amount
            db.add(Transaction(
                user_id=user.id,
                amount=challenge.stake_amount,
                type="refund",
                description=f"Grup tamamlandı (herkes başardı): {challenge.title}"
            ))
            db.add(Notification(
                user_id=user.id,
                type="group_result",
                title="Grup tamamlandı! 🎉",
                message=f"Herkes başardı! '{challenge.title}' grubunda {challenge.stake_amount} token iade edildi.",
                data=json.dumps({"group_id": challenge.id})
            ))
    elif not winners:
        # Kimse tamamlamadı — platform komisyon alır
        for m in losers:
            db.add(Notification(
                user_id=m.user_id,
                type="group_result",
                title="Grup başarısız ❌",
                message=f"'{challenge.title}' grubunda kimse görevi tamamlayamadı. {challenge.stake_amount} token kaybedildi.",
                data=json.dumps({"group_id": challenge.id})
            ))
    else:
        # Kazananlar kaybedenlerden pay alır
        total_lost = challenge.stake_amount * len(losers)
        commission = total_lost * PLATFORM_COMMISSION_RATE
        distributable = total_lost - commission
        per_winner = distributable / len(winners)

        for m in winners:
            user = db.query(User).filter(User.id == m.user_id).first()
            user.balance += challenge.stake_amount + per_winner
            db.add(Transaction(
                user_id=user.id,
                amount=challenge.stake_amount + per_winner,
                type="refund",
                description=f"Grup kazanıldı +{round(per_winner, 1)} bonus: {challenge.title}"
            ))
            db.add(Notification(
                user_id=user.id,
                type="group_result",
                title="Grup kazanıldı! 🏆",
                message=f"'{challenge.title}' grubunda kazandın! {challenge.stake_amount} token + {round(per_winner, 1)} bonus iade edildi.",
                data=json.dumps({"group_id": challenge.id})
            ))

        for m in losers:
            db.add(Notification(
                user_id=m.user_id,
                type="group_result",
                title="Grup kaybedildi ❌",
                message=f"'{challenge.title}' grubunda başaramadın. {challenge.stake_amount} token kaybedildi.",
                data=json.dumps({"group_id": challenge.id})
            ))

    db.commit()

@router.post("/{group_id}/finalize")
def finalize_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.query(GroupChallenge).filter(GroupChallenge.id == group_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    if datetime.utcnow() < challenge.deadline:
        raise HTTPException(status_code=400, detail="Deadline henüz gelmedi")

    members = db.query(GroupMember).filter(GroupMember.challenge_id == group_id).all()
    for m in members:
        if m.status == TaskStatus.active:
            m.status = TaskStatus.failed

    _distribute_rewards(challenge, members, db)
    return {"message": "Grup sonuçlandırıldı, ödüller dağıtıldı."}