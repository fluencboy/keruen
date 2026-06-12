from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
import random
import asyncio

from app.db.database import get_db
from app.models import Simulation, Checkpoint, Order, Vehicle, Event, Notification, Prediction, User
from app.schemas import SimulationCreate, SimulationOut
from app.core.security import get_current_user
from app.services.websocket_manager import emit_event

router = APIRouter()

SCENARIO_CONFIGS = {
    "caspian_storm": {
        "name": "Caspian Storm",
        "description": "Severe weather event affecting coastal ports",
        "affected_checkpoints": ["AKP", "KRP"],
        "delay_multiplier": 3.5,
        "congestion_increase": 0.4,
        "capacity_reduction": 0.6,
        "duration_hours": 48
    },
    "border_closure": {
        "name": "Temir-Baba Closure",
        "description": "Border checkpoint temporary closure due to inspection",
        "affected_checkpoints": ["TMB"],
        "delay_multiplier": 5.0,
        "congestion_increase": 0.0,
        "capacity_reduction": 0.0,
        "duration_hours": 12
    },
    "traffic_surge": {
        "name": "+30% Transit Growth",
        "description": "Seasonal surge in cargo volume across all corridors",
        "affected_checkpoints": ["AKP", "KRP", "BNJ", "ZNT", "TMB"],
        "delay_multiplier": 1.8,
        "congestion_increase": 0.3,
        "capacity_reduction": 1.0,
        "duration_hours": 72
    },
    "maintenance": {
        "name": "Road Maintenance",
        "description": "Scheduled maintenance on primary transit routes",
        "affected_checkpoints": ["BNJ", "ZNT"],
        "delay_multiplier": 2.0,
        "congestion_increase": 0.2,
        "capacity_reduction": 0.8,
        "duration_hours": 24
    }
}

async def run_simulation(simulation_id: int, scenario: str, params: dict, db_url: str):
    """Background task to run simulation."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if not sim:
            return
        sim.status = "running"
        db.commit()

        config = SCENARIO_CONFIGS.get(scenario, SCENARIO_CONFIGS["traffic_surge"])
        affected_codes = config["affected_checkpoints"]

        # Simulate effects
        affected_checkpoints = db.query(Checkpoint).filter(Checkpoint.code.in_(affected_codes)).all()
        results = {
            "affected_checkpoints": [],
            "total_delayed_orders": 0,
            "avg_delay_increase_pct": 0,
            "congestion_changes": {},
            "capacity_changes": {},
            "predicted_impacts": []
        }

        delay_sum = 0
        for cp in affected_checkpoints:
            old_load = cp.current_load
            old_wait = cp.avg_wait_minutes
            old_status = cp.status

            if scenario == "border_closure":
                cp.status = "closed"
                cp.current_load = 0
                new_wait = 0
            else:
                new_load = min(int(old_load * config["delay_multiplier"]), cp.capacity)
                cp.current_load = new_load
                new_wait = old_wait * config["delay_multiplier"]
                cp.avg_wait_minutes = new_wait
                if new_load / cp.capacity > 0.8:
                    cp.status = "congested"

            results["affected_checkpoints"].append({
                "id": cp.id,
                "name": cp.name,
                "old_status": old_status,
                "new_status": cp.status,
                "old_wait_minutes": old_wait,
                "new_wait_minutes": new_wait if scenario != "border_closure" else 0,
                "delay_increase_pct": ((new_wait - old_wait) / max(old_wait, 1)) * 100 if scenario != "border_closure" else 100
            })
            delay_sum += ((new_wait - old_wait) / max(old_wait, 1)) * 100

        if affected_checkpoints:
            results["avg_delay_increase_pct"] = round(delay_sum / len(affected_checkpoints), 1)

        # Count affected orders
        affected_order_count = db.query(func.count(Order.id)).filter(
            Order.status.in_(["in_transit", "slot_assigned", "approved"]),
            Order.origin_checkpoint_id.in_([cp.id for cp in affected_checkpoints])
        ).scalar() or 0
        results["total_delayed_orders"] = int(affected_order_count)

        # Create delay notifications for in-transit orders
        affected_orders = db.query(Order).filter(
            Order.status.in_(["in_transit", "slot_assigned"]),
            Order.origin_checkpoint_id.in_([cp.id for cp in affected_checkpoints])
        ).limit(50).all()

        for order in affected_orders:
            delay_increase = int(order.delay_minutes * (config["delay_multiplier"] - 1))
            order.delay_minutes += delay_increase
            n = Notification(
                user_id=order.user_id,
                title=f"Simulation Alert: {config['name']}",
                message=f"Your shipment {order.order_number} may be affected by {config['name']}. Expected additional delay: {delay_increase} minutes.",
                type="warning",
                related_order_id=order.id
            )
            db.add(n)

        # Create system event
        evt = Event(
            event_type="simulation_completed",
            title=f"Simulation: {config['name']}",
            description=f"Scenario '{config['name']}' simulated. {len(affected_checkpoints)} checkpoints affected, {affected_order_count} orders impacted.",
            severity="warning",
            event_metadata=results
        )
        db.add(evt)

        # Update simulation record
        sim.status = "completed"
        sim.results = results
        sim.impact_summary = (
            f"Simulation '{config['name']}' completed. "
            f"{len(affected_checkpoints)} checkpoints affected. "
            f"Average delay increase: {results['avg_delay_increase_pct']:.1f}%. "
            f"Estimated {affected_order_count} orders impacted. "
            f"Duration: {config['duration_hours']} hours."
        )
        sim.completed_at = datetime.utcnow()
        db.commit()

        await emit_event("simulation_completed", {
            "simulation_id": simulation_id,
            "scenario": scenario,
            "results": results
        })

    except Exception as e:
        db.rollback()
        sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if sim:
            sim.status = "failed"
            sim.impact_summary = f"Simulation failed: {str(e)}"
            db.commit()
    finally:
        db.close()

@router.get("/", response_model=List[SimulationOut])
async def list_simulations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Simulation).order_by(Simulation.created_at.desc()).limit(20).all()

@router.get("/scenarios")
async def get_scenarios(current_user: User = Depends(get_current_user)):
    return [{"key": k, "name": v["name"], "description": v["description"], "affected": v["affected_checkpoints"], "duration_hours": v["duration_hours"]}
            for k, v in SCENARIO_CONFIGS.items()]

@router.post("/", response_model=SimulationOut)
async def create_simulation(
    data: SimulationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operator", "analyst"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if data.scenario not in SCENARIO_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario. Valid: {list(SCENARIO_CONFIGS.keys())}")

    sim = Simulation(
        name=data.name,
        scenario=data.scenario,
        status="pending",
        parameters=data.parameters or {},
        created_by=current_user.id
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)

    from app.core.config import settings
    background_tasks.add_task(run_simulation, sim.id, data.scenario, data.parameters or {}, settings.DATABASE_URL)
    return sim

@router.get("/{simulation_id}", response_model=SimulationOut)
async def get_simulation(simulation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim
