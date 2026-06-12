from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models import Prediction, Checkpoint, WeatherCondition, Slot, User
from app.schemas import PredictionOut
from app.core.security import get_current_user
from app.ml.predictor import predict, predict_all_checkpoints

router = APIRouter()

@router.get("/", response_model=List[PredictionOut])
async def get_predictions(
    checkpoint_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Prediction).order_by(desc(Prediction.created_at))
    if checkpoint_id:
        q = q.filter(Prediction.checkpoint_id == checkpoint_id)
    # Return latest per checkpoint
    seen = set()
    results = []
    for p in q.limit(100).all():
        if p.checkpoint_id not in seen:
            results.append(p)
            seen.add(p.checkpoint_id)
    return results

@router.get("/refresh")
async def refresh_predictions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "operator", "analyst"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    checkpoints = db.query(Checkpoint).all()
    predictions_created = []

    for cp in checkpoints:
        now = datetime.utcnow()
        # Get current weather
        weather = db.query(WeatherCondition).filter(
            WeatherCondition.checkpoint_id == cp.id
        ).order_by(desc(WeatherCondition.recorded_at)).first()
        weather_cond = weather.condition if weather else "clear"

        # Calculate slot load
        total_slots = db.query(Slot).filter(Slot.checkpoint_id == cp.id).count()
        active_slots = db.query(Slot).filter(Slot.checkpoint_id == cp.id, Slot.status == "active").count()
        slot_load = active_slots / max(total_slots, 1)

        result = predict(
            checkpoint_code=cp.code,
            weekday=now.weekday(),
            hour=now.hour,
            weather=weather_cond,
            slot_load=slot_load,
            cargo_type="dry_goods"
        )

        pred = Prediction(
            checkpoint_id=cp.id,
            predicted_wait_minutes=result["predicted_wait_minutes"],
            predicted_congestion=result["predicted_congestion"],
            risk_score=result["risk_score"],
            features_used=result["features_used"],
            valid_for=datetime.utcnow().__class__(now.year, now.month, now.day, now.hour + 1, 0, 0) if now.hour < 23 else now,
            created_at=now
        )
        db.add(pred)

        # Update checkpoint avg wait
        cp.avg_wait_minutes = result["predicted_wait_minutes"]
        if result["predicted_congestion"] > 0.8:
            cp.status = "congested"
        elif result["predicted_congestion"] < 0.3:
            cp.status = "operational"

        predictions_created.append({
            "checkpoint": cp.name,
            "predicted_wait": result["predicted_wait_minutes"],
            "congestion": result["predicted_congestion"],
            "risk": result["risk_score"]
        })

    db.commit()
    return {"message": f"Refreshed {len(predictions_created)} predictions", "predictions": predictions_created}

@router.get("/checkpoint/{checkpoint_id}")
async def predict_for_checkpoint(
    checkpoint_id: int,
    hour: Optional[int] = None,
    weather: Optional[str] = "clear",
    slot_load: Optional[float] = 0.5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    now = datetime.utcnow()
    result = predict(
        checkpoint_code=cp.code,
        weekday=now.weekday(),
        hour=hour or now.hour,
        weather=weather,
        slot_load=slot_load,
        cargo_type="dry_goods"
    )
    return {
        "checkpoint_id": cp.id,
        "checkpoint_name": cp.name,
        **result
    }
