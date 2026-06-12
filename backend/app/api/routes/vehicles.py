from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.database import get_db
from app.models import Vehicle, User as UserModel
from app.schemas import VehicleOut
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[VehicleOut])
async def list_vehicles(
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    q = db.query(Vehicle)
    if current_user.role == "driver":
        q = q.filter(Vehicle.driver_id == current_user.id)
    if status:
        q = q.filter(Vehicle.status == status)
    if vehicle_type:
        q = q.filter(Vehicle.vehicle_type == vehicle_type)
    return q.offset(skip).limit(limit).all()

@router.get("/stats")
async def get_vehicle_stats(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    total = db.query(func.count(Vehicle.id)).scalar() or 0
    by_status = {}
    for row in db.query(Vehicle.status, func.count(Vehicle.id)).group_by(Vehicle.status).all():
        by_status[row[0]] = row[1]
    by_type = {}
    for row in db.query(Vehicle.vehicle_type, func.count(Vehicle.id)).group_by(Vehicle.vehicle_type).all():
        by_type[row[0]] = row[1]
    return {"total": total, "by_status": by_status, "by_type": by_type}

@router.get("/map")
async def get_vehicles_for_map(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    vehicles = db.query(Vehicle).filter(Vehicle.latitude.isnot(None), Vehicle.longitude.isnot(None)).limit(200).all()
    return [{"id": v.id, "plate": v.plate_number, "type": v.vehicle_type, "status": v.status,
             "lat": v.latitude, "lon": v.longitude, "checkpoint_id": v.current_checkpoint_id} for v in vehicles]

@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v
