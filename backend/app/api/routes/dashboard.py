from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models import Order, Checkpoint, Vehicle, Prediction, User
from app.schemas import DashboardKPIs
from app.core.security import get_current_user
from app.services.health import calculate_corridor_health

router = APIRouter()

@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    active_shipments = db.query(func.count(Order.id)).filter(
        Order.status.in_(["in_transit", "checkpoint_processing", "slot_assigned"])
    ).scalar() or 0

    active_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.status.in_(["in_transit", "at_checkpoint"])
    ).scalar() or 0

    total_cargo = db.query(func.sum(Order.cargo_weight)).filter(
        Order.status.in_(["in_transit", "checkpoint_processing"]),
        Order.created_at >= last_24h
    ).scalar() or 0

    avg_wait = db.query(func.avg(Order.delay_minutes)).filter(
        Order.status.in_(["in_transit", "checkpoint_processing"]),
        Order.created_at >= last_24h
    ).scalar() or 0

    health = calculate_corridor_health(db)

    congested = db.query(func.count(Checkpoint.id)).filter(
        Checkpoint.status == "congested"
    ).scalar() or 0

    completed_today = db.query(func.count(Order.id)).filter(
        Order.status == "completed",
        Order.actual_arrival >= last_24h
    ).scalar() or 0

    pending = db.query(func.count(Order.id)).filter(
        Order.status == "created"
    ).scalar() or 0

    return DashboardKPIs(
        active_shipments=int(active_shipments),
        active_vehicles=int(active_vehicles),
        total_cargo_volume=float(total_cargo),
        avg_waiting_time=float(avg_wait),
        corridor_health_score=health["score"],
        congested_checkpoints=int(congested),
        completed_today=int(completed_today),
        pending_approval=int(pending)
    )

@router.get("/checkpoints-map")
async def get_checkpoints_map(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    checkpoints = db.query(Checkpoint).all()
    result = []
    for cp in checkpoints:
        active_v = db.query(func.count(Vehicle.id)).filter(Vehicle.current_checkpoint_id == cp.id).scalar() or 0
        pred = db.query(Prediction).filter(
            Prediction.checkpoint_id == cp.id
        ).order_by(desc(Prediction.created_at)).first()

        result.append({
            "id": cp.id,
            "name": cp.name,
            "code": cp.code,
            "type": cp.type,
            "latitude": cp.latitude,
            "longitude": cp.longitude,
            "status": cp.status,
            "current_load": cp.current_load,
            "capacity": cp.capacity,
            "utilization_pct": round(cp.current_load / max(cp.capacity, 1) * 100, 1),
            "avg_wait_minutes": cp.avg_wait_minutes,
            "efficiency_score": cp.efficiency_score,
            "active_vehicles": int(active_v),
            "predicted_congestion": pred.predicted_congestion if pred else 0,
            "risk_score": pred.risk_score if pred else 0
        })
    return result

@router.get("/corridor-health")
async def get_corridor_health(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return calculate_corridor_health(db)

@router.get("/recent-activity")
async def get_recent_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    last_24h = datetime.utcnow() - timedelta(hours=24)
    orders_by_hour = []
    for h in range(24):
        start = last_24h + timedelta(hours=h)
        end = start + timedelta(hours=1)
        count = db.query(func.count(Order.id)).filter(
            Order.created_at >= start,
            Order.created_at < end
        ).scalar() or 0
        completed = db.query(func.count(Order.id)).filter(
            Order.actual_arrival >= start,
            Order.actual_arrival < end,
            Order.status == "completed"
        ).scalar() or 0
        orders_by_hour.append({"hour": h, "created": int(count), "completed": int(completed)})
    return orders_by_hour

@router.get("/cargo-by-type")
async def get_cargo_by_type(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(
        Order.cargo_type,
        func.count(Order.id).label("count"),
        func.sum(Order.cargo_weight).label("total_weight")
    ).group_by(Order.cargo_type).order_by(desc("count")).all()
    return [{"type": r.cargo_type, "count": int(r.count), "total_weight": float(r.total_weight or 0)} for r in rows]
