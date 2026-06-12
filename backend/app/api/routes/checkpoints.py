from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.database import get_db
from app.models import Checkpoint, Order, Vehicle, Slot
from app.schemas import CheckpointOut
from app.core.security import get_current_user
from app.models import User

router = APIRouter()

@router.get("/", response_model=List[CheckpointOut])
async def list_checkpoints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Checkpoint).all()

@router.get("/{checkpoint_id}", response_model=CheckpointOut)
async def get_checkpoint(checkpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    return cp

@router.get("/{checkpoint_id}/status")
async def get_checkpoint_status(checkpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    active_orders = db.query(func.count(Order.id)).filter(
        Order.dest_checkpoint_id == checkpoint_id,
        Order.status.in_(["in_transit", "checkpoint_processing"])
    ).scalar() or 0
    active_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.current_checkpoint_id == checkpoint_id
    ).scalar() or 0
    available_slots = db.query(func.count(Slot.id)).filter(
        Slot.checkpoint_id == checkpoint_id,
        Slot.status == "available"
    ).scalar() or 0
    return {
        "id": cp.id,
        "name": cp.name,
        "code": cp.code,
        "status": cp.status,
        "current_load": cp.current_load,
        "capacity": cp.capacity,
        "utilization": round(cp.current_load / max(cp.capacity, 1) * 100, 1),
        "avg_wait_minutes": cp.avg_wait_minutes,
        "efficiency_score": cp.efficiency_score,
        "active_orders": int(active_orders),
        "active_vehicles": int(active_vehicles),
        "available_slots": int(available_slots)
    }

@router.put("/{checkpoint_id}/status")
async def update_checkpoint_status(
    checkpoint_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    cp.status = status
    db.commit()
    return {"message": f"Checkpoint {cp.name} status updated to {status}"}
