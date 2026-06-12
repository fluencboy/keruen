from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

# ---- Auth ----
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "shipper"
    company: Optional[str] = None
    phone: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Orders ----
class OrderCreate(BaseModel):
    company: str
    cargo_type: str
    cargo_weight: float
    origin: str
    destination: str
    desired_date: datetime
    origin_checkpoint_id: Optional[int] = None
    dest_checkpoint_id: Optional[int] = None
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    vehicle_id: Optional[int] = None
    slot_id: Optional[int] = None
    estimated_arrival: Optional[datetime] = None
    delay_minutes: Optional[int] = None
    notes: Optional[str] = None

class OrderOut(BaseModel):
    id: int
    order_number: str
    user_id: int
    company: str
    cargo_type: str
    cargo_weight: float
    origin: str
    destination: str
    origin_checkpoint_id: Optional[int] = None
    dest_checkpoint_id: Optional[int] = None
    desired_date: datetime
    status: str
    vehicle_id: Optional[int] = None
    slot_id: Optional[int] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    delay_minutes: int
    notes: Optional[str] = None
    ai_extracted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ---- Slots ----
class SlotCreate(BaseModel):
    checkpoint_id: int
    slot_time: datetime
    duration_minutes: int = 30
    vehicle_type: Optional[str] = None

class SlotBook(BaseModel):
    slot_id: int
    order_id: int

class SlotOut(BaseModel):
    id: int
    checkpoint_id: int
    slot_time: datetime
    slot_date: str
    duration_minutes: int
    status: str
    booking_number: Optional[str] = None
    qr_code_path: Optional[str] = None
    vehicle_type: Optional[str] = None
    order_id: Optional[int] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ---- Checkpoints ----
class CheckpointOut(BaseModel):
    id: int
    name: str
    code: str
    type: str
    latitude: float
    longitude: float
    capacity: int
    current_load: int
    status: str
    avg_wait_minutes: float
    efficiency_score: float
    is_active: bool
    class Config:
        from_attributes = True

# ---- Vehicles ----
class VehicleOut(BaseModel):
    id: int
    plate_number: str
    vehicle_type: str
    capacity_tons: float
    driver_id: Optional[int] = None
    current_checkpoint_id: Optional[int] = None
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_seen: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Notifications ----
class NotificationOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    message: str
    type: str
    is_read: bool
    related_order_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Events ----
class EventOut(BaseModel):
    id: int
    event_type: str
    title: str
    description: Optional[str] = None
    checkpoint_id: Optional[int] = None
    order_id: Optional[int] = None
    severity: str
    event_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Predictions ----
class PredictionOut(BaseModel):
    id: int
    checkpoint_id: int
    predicted_wait_minutes: float
    predicted_congestion: float
    risk_score: float
    features_used: Optional[Dict] = None
    valid_for: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Simulations ----
class SimulationCreate(BaseModel):
    name: str
    scenario: str
    parameters: Optional[Dict[str, Any]] = None

class SimulationOut(BaseModel):
    id: int
    name: str
    scenario: str
    status: str
    parameters: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    impact_summary: Optional[str] = None
    created_by: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ---- AI ----
class AIOrderExtract(BaseModel):
    prompt: str

class AIOrderExtracted(BaseModel):
    cargo_type: str
    cargo_weight: float
    origin: str
    destination: str
    desired_date: str
    company: Optional[str] = None
    confidence: float

class AIAnalyticsQuery(BaseModel):
    question: str

class AIAnalyticsResponse(BaseModel):
    answer: str
    data_points: Optional[List[Dict]] = None

# ---- Dashboard ----
class DashboardKPIs(BaseModel):
    active_shipments: int
    active_vehicles: int
    total_cargo_volume: float
    avg_waiting_time: float
    corridor_health_score: float
    congested_checkpoints: int
    completed_today: int
    pending_approval: int

class CheckpointStatus(BaseModel):
    id: int
    name: str
    code: str
    latitude: float
    longitude: float
    status: str
    current_load: int
    capacity: int
    avg_wait_minutes: float
    efficiency_score: float
    active_vehicles: int

class CorridorHealth(BaseModel):
    score: float
    label: str
    avg_delay: float
    congestion_index: float
    active_incidents: int
    throughput_24h: int
    trend: str

# ---- Transit Stats ----
class TransitStatOut(BaseModel):
    id: int
    checkpoint_id: int
    date: str
    hour: int
    vehicles_processed: int
    total_cargo_tons: float
    avg_wait_minutes: float
    congestion_level: float
    throughput_score: float
    class Config:
        from_attributes = True

Token.model_rebuild()
