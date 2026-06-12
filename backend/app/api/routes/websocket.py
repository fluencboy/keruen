from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
import json
import asyncio
from datetime import datetime

from app.db.database import get_db, SessionLocal
from app.models import Event, Order, Checkpoint
from app.services.websocket_manager import manager

router = APIRouter()

@router.websocket("/events")
async def websocket_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send recent events on connect
        db = SessionLocal()
        try:
            events = db.query(Event).order_by(desc(Event.created_at)).limit(20).all()
            initial_data = {
                "type": "initial_events",
                "data": [
                    {
                        "id": e.id,
                        "event_type": e.event_type,
                        "title": e.title,
                        "description": e.description,
                        "severity": e.severity,
                        "checkpoint_id": e.checkpoint_id,
                        "order_id": e.order_id,
                        "created_at": e.created_at.isoformat()
                    }
                    for e in events
                ],
                "timestamp": datetime.utcnow().isoformat()
            }
            await websocket.send_text(json.dumps(initial_data))
        finally:
            db.close()

        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.utcnow().isoformat()}))
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping", "timestamp": datetime.utcnow().isoformat()}))

    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=15)
            except asyncio.TimeoutError:
                # Send periodic updates
                db = SessionLocal()
                try:
                    from app.services.health import calculate_corridor_health
                    from sqlalchemy import func
                    health = calculate_corridor_health(db)
                    checkpoints = db.query(Checkpoint).all()
                    cp_data = [{"id": cp.id, "name": cp.name, "status": cp.status, "load": cp.current_load, "capacity": cp.capacity} for cp in checkpoints]
                    await websocket.send_text(json.dumps({
                        "type": "dashboard_update",
                        "data": {"health": health, "checkpoints": cp_data},
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                finally:
                    db.close()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
