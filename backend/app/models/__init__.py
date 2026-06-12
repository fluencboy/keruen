from app.db.database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

class UserRole(str, enum.Enum):
    shipper = "shipper"
    driver = "driver"
    operator = "operator"
    analyst = "analyst"
    admin = "admin"

class OrderStatus(str, enum.Enum):
    created = "created"
    approved = "approved"
    slot_assigned = "slot_assigned"
    in_transit = "in_transit"
    checkpoint_processing = "checkpoint_processing"
    arrived = "arrived"
    completed = "completed"
    cancelled = "cancelled"

class SlotStatus(str, enum.Enum):
    available = "available"
    active = "active"
    used = "used"
    expired = "expired"
    cancelled = "cancelled"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="shipper", nullable=False)
    company = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Checkpoint(Base):
    __tablename__ = "checkpoints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, default=50)
    current_load = Column(Integer, default=0)
    status = Column(String, default="operational")
    avg_wait_minutes = Column(Float, default=30.0)
    efficiency_score = Column(Float, default=85.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String, unique=True, nullable=False)
    vehicle_type = Column(String, nullable=False)
    capacity_tons = Column(Float, nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    current_checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=True)
    status = Column(String, default="idle")
    latitude = Column(Float)
    longitude = Column(Float)
    last_seen = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company = Column(String, nullable=False)
    cargo_type = Column(String, nullable=False)
    cargo_weight = Column(Float, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    origin_checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=True)
    dest_checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=True)
    desired_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="created")
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=True)
    estimated_arrival = Column(DateTime(timezone=True))
    actual_arrival = Column(DateTime(timezone=True))
    delay_minutes = Column(Integer, default=0)
    notes = Column(Text)
    ai_extracted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Slot(Base):
    __tablename__ = "slots"
    id = Column(Integer, primary_key=True, index=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False)
    slot_time = Column(DateTime(timezone=True), nullable=False)
    slot_date = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=30)
    status = Column(String, default="available")
    booking_number = Column(String, unique=True)
    qr_code_path = Column(String)
    vehicle_type = Column(String)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")
    is_read = Column(Boolean, default=False)
    related_order_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    severity = Column(String, default="info")
    event_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False)
    predicted_wait_minutes = Column(Float, nullable=False)
    predicted_congestion = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    features_used = Column(JSON)
    valid_for = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Simulation(Base):
    __tablename__ = "simulations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    scenario = Column(String, nullable=False)
    status = Column(String, default="pending")
    parameters = Column(JSON)
    results = Column(JSON)
    impact_summary = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String)
    entity_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WeatherCondition(Base):
    __tablename__ = "weather_conditions"
    id = Column(Integer, primary_key=True, index=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=True)
    condition = Column(String, nullable=False)
    severity = Column(Integer, default=0)
    temperature = Column(Float)
    wind_speed = Column(Float)
    visibility = Column(Float)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

class TransitStatistic(Base):
    __tablename__ = "transit_statistics"
    id = Column(Integer, primary_key=True, index=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False)
    date = Column(String, nullable=False)
    hour = Column(Integer, nullable=False)
    vehicles_processed = Column(Integer, default=0)
    total_cargo_tons = Column(Float, default=0.0)
    avg_wait_minutes = Column(Float, default=0.0)
    congestion_level = Column(Float, default=0.0)
    throughput_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

__all__ = [
    "Base", "User", "Checkpoint", "Vehicle", "Order", "Slot",
    "Notification", "Event", "Prediction", "Simulation",
    "AuditLog", "WeatherCondition", "TransitStatistic",
    "UserRole", "OrderStatus", "SlotStatus"
]
