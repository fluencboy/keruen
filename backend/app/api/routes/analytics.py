from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models import Order, Checkpoint, Vehicle, TransitStatistic, Event, User
from app.schemas import AIAnalyticsQuery, AIAnalyticsResponse
from app.core.security import get_current_user
from app.services.gemini import analytics_copilot
from app.services.health import calculate_corridor_health

router = APIRouter()

@router.post("/copilot", response_model=AIAnalyticsResponse)
async def analytics_copilot_query(
    data: AIAnalyticsQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Build system state for AI context
    health = calculate_corridor_health(db)
    checkpoints = db.query(Checkpoint).all()
    recent_events = db.query(Event).order_by(desc(Event.created_at)).limit(10).all()

    last_24h = datetime.utcnow() - timedelta(hours=24)
    active_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_(["in_transit", "checkpoint_processing"])
    ).scalar() or 0

    avg_delay = db.query(func.avg(Order.delay_minutes)).filter(
        Order.created_at >= last_24h
    ).scalar() or 0

    system_state = {
        "timestamp": datetime.utcnow().isoformat(),
        "kpis": {
            "corridor_health_score": health["score"],
            "active_shipments": int(active_orders),
            "avg_waiting_time": float(avg_delay),
            "congested_checkpoints": health["congested_checkpoints"]
        },
        "checkpoints": [
            {
                "name": cp.name,
                "status": cp.status,
                "load": f"{cp.current_load}/{cp.capacity}",
                "avg_wait_minutes": cp.avg_wait_minutes,
                "efficiency": cp.efficiency_score
            }
            for cp in checkpoints
        ],
        "recent_events": [
            {"type": e.event_type, "title": e.title, "severity": e.severity}
            for e in recent_events
        ],
        "health_breakdown": health
    }

    answer = await analytics_copilot(data.question, system_state)

    return AIAnalyticsResponse(
        answer=answer,
        data_points=[
            {"metric": "Corridor Health Score", "value": health["score"], "unit": "/100"},
            {"metric": "Active Shipments", "value": active_orders, "unit": "orders"},
            {"metric": "Avg Delay", "value": round(float(avg_delay), 1), "unit": "minutes"},
            {"metric": "Congested Checkpoints", "value": health["congested_checkpoints"], "unit": "locations"}
        ]
    )

@router.get("/cargo-volume")
async def get_cargo_volume(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        func.date(Order.created_at).label("date"),
        func.sum(Order.cargo_weight).label("total_weight"),
        func.count(Order.id).label("count")
    ).filter(Order.created_at >= since).group_by(func.date(Order.created_at)).order_by("date").all()

    return [{"date": str(r.date), "total_weight": float(r.total_weight or 0), "count": int(r.count)} for r in rows]

@router.get("/congestion-heatmap")
async def get_congestion_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checkpoints = db.query(Checkpoint).all()
    result = []
    for cp in checkpoints:
        stats = db.query(
            TransitStatistic.hour,
            func.avg(TransitStatistic.congestion_level).label("avg_congestion")
        ).filter(
            TransitStatistic.checkpoint_id == cp.id
        ).group_by(TransitStatistic.hour).order_by(TransitStatistic.hour).all()

        result.append({
            "checkpoint_id": cp.id,
            "checkpoint_name": cp.name,
            "code": cp.code,
            "hourly_congestion": [{"hour": s.hour, "congestion": float(s.avg_congestion or 0)} for s in stats]
        })
    return result

@router.get("/throughput-trend")
async def get_throughput_trend(
    checkpoint_id: Optional[int] = None,
    days: int = 14,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    q = db.query(
        TransitStatistic.date,
        func.sum(TransitStatistic.vehicles_processed).label("vehicles"),
        func.sum(TransitStatistic.total_cargo_tons).label("cargo_tons"),
        func.avg(TransitStatistic.avg_wait_minutes).label("avg_wait")
    ).filter(TransitStatistic.date >= since)

    if checkpoint_id:
        q = q.filter(TransitStatistic.checkpoint_id == checkpoint_id)

    rows = q.group_by(TransitStatistic.date).order_by(TransitStatistic.date).all()
    return [{"date": r.date, "vehicles": int(r.vehicles or 0), "cargo_tons": float(r.cargo_tons or 0), "avg_wait": float(r.avg_wait or 0)} for r in rows]

@router.get("/corridor-utilization")
async def get_corridor_utilization(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    checkpoints = db.query(Checkpoint).all()
    result = []
    for cp in checkpoints:
        completed = db.query(func.count(Order.id)).filter(
            Order.dest_checkpoint_id == cp.id,
            Order.status == "completed"
        ).scalar() or 0
        in_transit = db.query(func.count(Order.id)).filter(
            Order.dest_checkpoint_id == cp.id,
            Order.status.in_(["in_transit", "checkpoint_processing"])
        ).scalar() or 0
        result.append({
            "name": cp.name,
            "code": cp.code,
            "completed": int(completed),
            "in_transit": int(in_transit),
            "utilization_pct": round(cp.current_load / max(cp.capacity, 1) * 100, 1),
            "efficiency_score": cp.efficiency_score,
            "status": cp.status
        })
    return result

@router.get("/transport-mode")
async def get_transport_mode(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(
        Vehicle.vehicle_type,
        func.count(Vehicle.id).label("count")
    ).group_by(Vehicle.vehicle_type).all()
    return [{"type": r.vehicle_type, "count": int(r.count)} for r in rows]

@router.get("/delay-distribution")
async def get_delay_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    buckets = [
        ("0-15 min", 0, 15),
        ("15-30 min", 15, 30),
        ("30-60 min", 30, 60),
        ("60-120 min", 60, 120),
        ("120+ min", 120, 99999)
    ]
    result = []
    for label, low, high in buckets:
        count = db.query(func.count(Order.id)).filter(
            Order.delay_minutes >= low,
            Order.delay_minutes < high
        ).scalar() or 0
        result.append({"range": label, "count": int(count)})
    return result

@router.get("/top-routes")
async def get_top_routes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(
        Order.origin,
        Order.destination,
        func.count(Order.id).label("count"),
        func.avg(Order.cargo_weight).label("avg_weight"),
        func.avg(Order.delay_minutes).label("avg_delay")
    ).group_by(Order.origin, Order.destination).order_by(desc("count")).limit(10).all()

    return [{"origin": r.origin, "destination": r.destination, "count": int(r.count),
             "avg_weight": round(float(r.avg_weight or 0), 1), "avg_delay": round(float(r.avg_delay or 0), 1)}
            for r in rows]
