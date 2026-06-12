"""WebSocket manager for real-time events broadcast."""
from fastapi import WebSocket
from typing import List, Dict, Any
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, data: Dict[str, Any]):
        message = json.dumps(data, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for ws in disconnected:
            self.disconnect(ws)

manager = ConnectionManager()

async def emit_event(event_type: str, data: Dict[str, Any]):
    """Emit event to all connected WebSocket clients."""
    await manager.broadcast({
        "type": event_type,
        "data": data,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    })
