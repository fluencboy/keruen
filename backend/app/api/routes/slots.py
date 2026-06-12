from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import random, string

from app.db.database import get_db
from app.models import Slot, Checkpoint, Order, Event, Notification
from app.schemas import SlotCreate, SlotBook, SlotOut
from app.core.security import get_current_user
from app.models import User
from app.services.qr import generate_qr_code, get_qr_path
from app.services.websocket_manager import emit_event

router = APIRouter()

def generate_booking_number():
    return "BK-" + "".join(random.choices(string.digits, k=10))

@router.get("/", response_model=List[SlotOut])
async def list_slots(
    checkpoint_id: Optional[int] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Slot)
    if checkpoint_id:
        q = q.filter(Slot.checkpoint_id == checkpoint_id)
    if date:
        q = q.filter(Slot.slot_date == date)
    if status:
        q = q.filter(Slot.status == status)
    else:
        q = q.filter(Slot.status == "available")
    return q.order_by(Slot.slot_time).offset(skip).limit(limit).all()

@router.get("/available")
async def get_available_slots(
    checkpoint_id: int,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date or datetime.utcnow().strftime("%Y-%m-%d")
    slots = db.query(Slot).filter(
        Slot.checkpoint_id == checkpoint_id,
        Slot.slot_date == target_date,
        Slot.status == "available"
    ).order_by(Slot.slot_time).all()
    checkpoint = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    return {
        "checkpoint": {"id": checkpoint.id, "name": checkpoint.name, "code": checkpoint.code} if checkpoint else None,
        "date": target_date,
        "slots": [{"id": s.id, "slot_time": s.slot_time, "duration_minutes": s.duration_minutes, "vehicle_type": s.vehicle_type} for s in slots],
        "total_available": len(slots)
    }

@router.post("/book", response_model=SlotOut)
async def book_slot(data: SlotBook, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    slot = db.query(Slot).filter(Slot.id == data.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.status != "available":
        raise HTTPException(status_code=400, detail=f"Slot is not available (status: {slot.status})")

    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    checkpoint = db.query(Checkpoint).filter(Checkpoint.id == slot.checkpoint_id).first()
    booking_number = generate_booking_number()

    qr_data = {
        "checkpoint": checkpoint.name if checkpoint else "Unknown",
        "slot_time": slot.slot_time.isoformat(),
        "order_id": order.id
    }
    qr_b64 = generate_qr_code(booking_number, qr_data)

    slot.status = "active"
    slot.booking_number = booking_number
    slot.qr_code_path = get_qr_path(booking_number)
    slot.order_id = data.order_id

    order.slot_id = slot.id
    order.status = "slot_assigned"

    notif = Notification(
        user_id=current_user.id,
        title="Slot Booked",
        message=f"Slot booked at {checkpoint.name if checkpoint else 'checkpoint'} for order {order.order_number}. Booking: {booking_number}",
        type="success",
        related_order_id=order.id
    )
    db.add(notif)

    evt = Event(
        event_type="slot_booked",
        title="Slot Reserved",
        description=f"Slot booked at {checkpoint.name if checkpoint else 'unknown'} for order {order.order_number}",
        checkpoint_id=slot.checkpoint_id,
        order_id=order.id,
        severity="info",
        event_metadata={"booking_number": booking_number, "order_number": order.order_number}
    )
    db.add(evt)
    db.commit()
    db.refresh(slot)

    await emit_event("slot_booked", {
        "booking_number": booking_number,
        "checkpoint": checkpoint.name if checkpoint else "Unknown",
        "order_number": order.order_number,
        "qr_code": qr_b64
    })
    return slot

@router.get("/{slot_id}", response_model=SlotOut)
async def get_slot(slot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot

@router.get("/{slot_id}/qr")
async def get_slot_qr(slot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot or not slot.booking_number:
        raise HTTPException(status_code=404, detail="Slot or QR code not found")
    checkpoint = db.query(Checkpoint).filter(Checkpoint.id == slot.checkpoint_id).first()
    qr_data = {
        "checkpoint": checkpoint.name if checkpoint else "Unknown",
        "slot_time": slot.slot_time.isoformat(),
        "order_id": slot.order_id
    }
    qr_b64 = generate_qr_code(slot.booking_number, qr_data)
    return {"booking_number": slot.booking_number, "qr_code": qr_b64, "qr_path": slot.qr_code_path}

@router.post("/")
async def create_slot(data: SlotCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Only operators can create slots")
    slot = Slot(
        checkpoint_id=data.checkpoint_id,
        slot_time=data.slot_time,
        slot_date=data.slot_time.strftime("%Y-%m-%d"),
        duration_minutes=data.duration_minutes,
        vehicle_type=data.vehicle_type,
        status="available",
        expires_at=data.slot_time + timedelta(hours=2)
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot
