from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.api.routes import (
    auth, orders, slots, checkpoints, vehicles,
    notifications, events, predictions, simulations,
    analytics, users, dashboard, websocket
)

app = FastAPI(
    title="Keruen API",
    description="Digital Logistics Control Center for Mangystau Region",
    version="1.0.0",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(slots.router, prefix="/api/slots", tags=["slots"])
app.include_router(checkpoints.router, prefix="/api/checkpoints", tags=["checkpoints"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["vehicles"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["simulations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

os.makedirs("static/qr", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/health")
def health():
    return {"status": "ok", "service": "Keruen API"}
