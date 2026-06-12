from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
import random, string

from app.db.database import get_db
from app.models import Order, Checkpoint, Vehicle, AuditLog, Event, Notification
from app.schemas import OrderCreate, OrderUpdate, OrderOut, AIOrderExtract, AIOrderExtracted
from app.core.security import get_current_user
from app.models import User
from app.services.gemini import extract_order_from_text
from app.services.websocket_manager import emit_event

router = APIRouter()

def generate_order_number():
    return "KT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

@router.get("/", response_model=List[OrderOut])
async def list_orders(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    cargo_type: Optional[str] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Order)
    if current_user.role == "shipper":
        q = q.filter(Order.user_id == current_user.id)
    if status:
        q = q.filter(Order.status == status)
    if cargo_type:
        q = q.filter(Order.cargo_type == cargo_type)
    if origin:
        q = q.filter(Order.origin.ilike(f"%{origin}%"))
    if destination:
        q = q.filter(Order.destination.ilike(f"%{destination}%"))
    return q.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()

@router.get("/stats")
async def get_order_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Order)
    if current_user.role == "shipper":
        q = q.filter(Order.user_id == current_user.id)
    total = q.count()
    by_status = {}
    for row in db.query(Order.status, func.count(Order.id)).group_by(Order.status).all():
        by_status[row[0]] = row[1]
    by_cargo = {}
    for row in db.query(Order.cargo_type, func.count(Order.id)).group_by(Order.cargo_type).all():
        by_cargo[row[0]] = row[1]
    avg_delay = db.query(func.avg(Order.delay_minutes)).scalar() or 0
    return {"total": total, "by_status": by_status, "by_cargo": by_cargo, "avg_delay_minutes": round(float(avg_delay), 1)}

@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "shipper" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return order

@router.post("/", response_model=OrderOut)
async def create_order(order_data: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = Order(
        order_number=generate_order_number(),
        user_id=current_user.id,
        company=order_data.company or current_user.company or "Unknown",
        cargo_type=order_data.cargo_type,
        cargo_weight=order_data.cargo_weight,
        origin=order_data.origin,
        destination=order_data.destination,
        origin_checkpoint_id=order_data.origin_checkpoint_id,
        dest_checkpoint_id=order_data.dest_checkpoint_id,
        desired_date=order_data.desired_date,
        notes=order_data.notes,
        status="created"
    )
    db.add(order)
    db.flush()

    # Create notification
    notif = Notification(
        user_id=current_user.id,
        title="Order Created",
        message=f"Your order {order.order_number} has been submitted successfully.",
        type="success",
        related_order_id=order.id
    )
    db.add(notif)

    # Create event
    evt = Event(
        event_type="shipment_created",
        title="New Shipment Created",
        description=f"Order {order.order_number}: {order.cargo_weight}t {order.cargo_type} from {order.origin} to {order.destination}",
        order_id=order.id,
        severity="info",
        event_metadata={"order_number": order.order_number, "cargo_type": order.cargo_type, "weight": order.cargo_weight}
    )
    db.add(evt)
    db.commit()
    db.refresh(order)

    await emit_event("shipment_created", {"order_number": order.order_number, "origin": order.origin, "destination": order.destination, "cargo_type": order.cargo_type})
    return order

@router.put("/{order_id}", response_model=OrderOut)
async def update_order(order_id: int, update: OrderUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(order, field, value)

    if update.status == "completed" and not order.actual_arrival:
        order.actual_arrival = datetime.utcnow()

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        order_id=order.id,
        action="update_order",
        entity_type="order",
        entity_id=order.id,
        old_value={"status": old_status},
        new_value={"status": order.status}
    )
    db.add(log)

    if update.status and update.status != old_status:
        evt = Event(
            event_type=f"shipment_{update.status}",
            title=f"Shipment {update.status.replace('_', ' ').title()}",
            description=f"Order {order.order_number} status changed to {update.status}",
            order_id=order.id,
            severity="success" if update.status == "completed" else "info",
            event_metadata={"order_number": order.order_number}
        )
        db.add(evt)
        await emit_event("status_change", {"order_number": order.order_number, "status": update.status})

    db.commit()
    db.refresh(order)
    return order

@router.post("/ai/extract", response_model=AIOrderExtracted)
async def ai_extract_order(data: AIOrderExtract, current_user: User = Depends(get_current_user)):
    result = await extract_order_from_text(data.prompt)
    return AIOrderExtracted(**result)

@router.delete("/{order_id}")
async def cancel_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "shipper" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    order.status = "cancelled"
    db.commit()
    return {"message": "Order cancelled"}
