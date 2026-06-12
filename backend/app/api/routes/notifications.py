from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from app.db.database import get_db
from app.models import Notification, User
from app.schemas import NotificationOut
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[NotificationOut])
async def list_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Notification).filter(
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    )
    if unread_only:
        q = q.filter(Notification.is_read == False)
    return q.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

@router.get("/unread-count")
async def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(func.count(Notification.id)).filter(
        (Notification.user_id == current_user.id) | (Notification.user_id == None),
        Notification.is_read == False
    ).scalar() or 0
    return {"count": count}

@router.put("/{notification_id}/read")
async def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.put("/mark-all-read")
async def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
