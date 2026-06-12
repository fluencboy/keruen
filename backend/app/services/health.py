"""
Corridor Health Score Calculator.
Score from 0-100 based on delays, congestion, incidents, throughput.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.models import Order, Checkpoint, Event, TransitStatistic

def calculate_corridor_health(db: Session) -> dict:
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    # 1. Average delay score (lower delay = better score)
    avg_delay = db.query(func.avg(Order.delay_minutes)).filter(
        Order.status.in_(["in_transit", "checkpoint_processing", "arrived"]),
        Order.created_at >= last_24h
    ).scalar() or 0
    avg_delay = float(avg_delay)
    delay_score = max(0, 100 - (avg_delay / 3))  # 300min delay = 0 score

    # 2. Congestion score (based on checkpoint load)
    checkpoints = db.query(Checkpoint).all()
    if checkpoints:
        avg_load_ratio = sum(c.current_load / max(c.capacity, 1) for c in checkpoints) / len(checkpoints)
        congestion_score = max(0, 100 - (avg_load_ratio * 100))
    else:
        congestion_score = 75.0

    # 3. Incident score (recent warning/error events reduce score)
    incidents = db.query(func.count(Event.id)).filter(
        Event.severity.in_(["warning", "error"]),
        Event.created_at >= last_24h
    ).scalar() or 0
    incident_score = max(0, 100 - (incidents * 2))

    # 4. Throughput score
    throughput_data = db.query(func.avg(TransitStatistic.throughput_score)).filter(
        TransitStatistic.date >= last_24h.strftime("%Y-%m-%d")
    ).scalar() or 75.0
    throughput_score = float(throughput_data)

    # Weighted average
    score = (
        delay_score * 0.35 +
        congestion_score * 0.30 +
        incident_score * 0.20 +
        throughput_score * 0.15
    )
    score = max(0, min(100, score))

    if score >= 80:
        label = "Excellent"
    elif score >= 60:
        label = "Good"
    elif score >= 40:
        label = "Fair"
    else:
        label = "Critical"

    # Trend: compare to yesterday
    yesterday_24h = last_24h - timedelta(hours=24)
    yesterday_delay = float(db.query(func.avg(Order.delay_minutes)).filter(
        Order.created_at >= yesterday_24h,
        Order.created_at < last_24h
    ).scalar() or avg_delay)
    trend = "up" if yesterday_delay > avg_delay else "down" if yesterday_delay < avg_delay else "stable"

    completed_today = db.query(func.count(Order.id)).filter(
        Order.status == "completed",
        Order.actual_arrival >= last_24h
    ).scalar() or 0

    congested_count = db.query(func.count(Checkpoint.id)).filter(
        Checkpoint.status == "congested"
    ).scalar() or 0

    return {
        "score": round(score, 1),
        "label": label,
        "avg_delay": round(avg_delay, 1),
        "congestion_index": round(avg_load_ratio if checkpoints else 0.3, 3),
        "active_incidents": int(incidents),
        "throughput_24h": int(completed_today),
        "trend": trend,
        "delay_score": round(delay_score, 1),
        "congestion_score": round(congestion_score, 1),
        "incident_score": round(min(100, incident_score), 1),
        "throughput_score": round(throughput_score, 1),
        "congested_checkpoints": int(congested_count)
    }
