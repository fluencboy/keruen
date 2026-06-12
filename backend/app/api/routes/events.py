from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.db.database import get_db
from app.models import Event, User
from app.schemas import EventOut
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[EventOut])
async def list_events(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    checkpoint_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Event)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    if severity:
        q = q.filter(Event.severity == severity)
    if checkpoint_id:
        q = q.filter(Event.checkpoint_id == checkpoint_id)
    return q.order_by(desc(Event.created_at)).offset(skip).limit(limit).all()

@router.get("/feed")
async def get_live_feed(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    events = db.query(Event).order_by(desc(Event.created_at)).limit(limit).all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "title": e.title,
            "description": e.description,
            "severity": e.severity,
            "checkpoint_id": e.checkpoint_id,
            "order_id": e.order_id,
            "metadata": e.event_metadata,
            "created_at": e.created_at.isoformat()
        }
        for e in events
    ]
