"""
Database seeder for KaspiTransit - generates realistic Mangystau region data.
Produces 5000 shipments, 1000 vehicles, 120 days of history.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import datetime, timedelta
import random
import string
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.models import (
    User, Checkpoint, Vehicle, Order, Slot, Notification,
    Event, Prediction, TransitStatistic, WeatherCondition, Simulation
)
from app.core.security import get_password_hash

random.seed(42)

CHECKPOINTS_DATA = [
    {"name": "Aktau Sea Port", "code": "AKP", "type": "port", "lat": 43.6543, "lon": 51.1978, "capacity": 120},
    {"name": "Kuryk Port", "code": "KRP", "type": "port", "lat": 43.1861, "lon": 51.6578, "capacity": 80},
    {"name": "Beineu Junction", "code": "BNJ", "type": "hub", "lat": 45.3142, "lon": 55.0983, "capacity": 60},
    {"name": "Zhanaozen Terminal", "code": "ZNT", "type": "hub", "lat": 43.3447, "lon": 52.8604, "capacity": 70},
    {"name": "Temir-Baba Border", "code": "TMB", "type": "border", "lat": 41.3456, "lon": 56.1234, "capacity": 50},
]

CARGO_TYPES = ["crude_oil", "dry_goods", "chemicals", "grain", "machinery", "containers", "steel", "fertilizer", "consumer_goods", "coal"]
ORIGINS = ["Aktau Port", "Kuryk Port", "Beineu", "Zhanaozen", "Temir-Baba", "Almaty", "Nur-Sultan", "Atyrau", "Shymkent"]
VEHICLE_TYPES = ["truck", "trailer", "tanker", "flatbed", "refrigerated"]
WEATHER_CONDITIONS = ["clear", "foggy", "storm", "wind", "sandstorm"]
EVENT_TYPES = ["shipment_created", "slot_booked", "congestion_increased", "checkpoint_reopened", "shipment_completed", "delay_detected", "vehicle_arrived", "inspection_required"]

def random_plate():
    letters = "ABCDEKMNPRSTX"
    return f"{random.choice(letters)}{random.choice(letters)}{random.randint(100,999)}{random.choice(letters)}{random.choice(letters)}{random.choice(letters)}"

def random_order_number():
    return "KT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

def random_booking_number():
    return "BK-" + "".join(random.choices(string.digits, k=10))

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        if db.query(User).count() > 10:
            print("Database already seeded, skipping.")
            return

        print("Seeding database...")

        # ---- Users ----
        print("Creating users...")
        admin = User(
            email="admin@kaspitransit.kz",
            full_name="Akimat Administrator",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            company="Mangystau Akimat",
            phone="+7 7292 100000"
        )
        db.add(admin)

        operator = User(
            email="operator@kaspitransit.kz",
            full_name="Logistics Operator",
            hashed_password=get_password_hash("operator123"),
            role="operator",
            company="KaspiTransit Operations",
            phone="+7 7292 200000"
        )
        db.add(operator)

        analyst = User(
            email="analyst@kaspitransit.kz",
            full_name="Regional Analyst",
            hashed_password=get_password_hash("analyst123"),
            role="analyst",
            company="Mangystau Akimat Analytics",
            phone="+7 7292 300000"
        )
        db.add(analyst)

        shipper = User(
            email="shipper@kaspitransit.kz",
            full_name="Cargo Shipper",
            hashed_password=get_password_hash("shipper123"),
            role="shipper",
            company="KazMunayGaz Logistics",
            phone="+7 7292 400000"
        )
        db.add(shipper)

        driver = User(
            email="driver@kaspitransit.kz",
            full_name="Truck Driver",
            hashed_password=get_password_hash("driver123"),
            role="driver",
            company="TransLogistica KZ",
            phone="+7 7292 500000"
        )
        db.add(driver)

        companies = [
            "KazMunayGaz", "KazTransOil", "Mangystau Transport", "Aktau Freight",
            "Caspian Logistics", "Trans-KZ", "Silk Road Cargo", "KazExport",
            "Aktau Port Services", "BeineuTrans", "ZhanaOzen Oil", "CaspianTrade"
        ]
        extra_shippers = []
        for i in range(20):
            u = User(
                email=f"shipper{i+2}@kaspitransit.kz",
                full_name=f"Shipper {i+2}",
                hashed_password=get_password_hash("shipper123"),
                role="shipper",
                company=random.choice(companies),
                phone=f"+7 7292 {500000+i}"
            )
            db.add(u)
            extra_shippers.append(u)

        extra_drivers = []
        for i in range(50):
            u = User(
                email=f"driver{i+2}@kaspitransit.kz",
                full_name=f"Driver {i+2}",
                hashed_password=get_password_hash("driver123"),
                role="driver",
                company=random.choice(companies),
                phone=f"+7 7292 {600000+i}"
            )
            db.add(u)
            extra_drivers.append(u)

        db.flush()

        # ---- Checkpoints ----
        print("Creating checkpoints...")
        checkpoints = []
        for cp in CHECKPOINTS_DATA:
            c = Checkpoint(
                name=cp["name"],
                code=cp["code"],
                type=cp["type"],
                latitude=cp["lat"],
                longitude=cp["lon"],
                capacity=cp["capacity"],
                current_load=random.randint(5, cp["capacity"] - 5),
                status=random.choice(["operational", "operational", "operational", "congested"]),
                avg_wait_minutes=random.uniform(15, 90),
                efficiency_score=random.uniform(60, 95),
                is_active=True
            )
            db.add(c)
            checkpoints.append(c)
        db.flush()

        # ---- Vehicles ----
        print("Creating 1000 vehicles...")
        vehicles = []
        all_drivers = [driver] + extra_drivers
        for i in range(1000):
            assigned_driver = random.choice(all_drivers) if random.random() > 0.3 else None
            cp = random.choice(checkpoints) if random.random() > 0.4 else None
            base_lat = 43.6 + random.uniform(-2, 2)
            base_lon = 51.5 + random.uniform(-4, 4)
            v = Vehicle(
                plate_number=random_plate(),
                vehicle_type=random.choice(VEHICLE_TYPES),
                capacity_tons=random.choice([10, 20, 40, 60, 80]),
                driver_id=assigned_driver.id if assigned_driver else None,
                current_checkpoint_id=cp.id if cp else None,
                status=random.choice(["idle", "idle", "in_transit", "in_transit", "at_checkpoint", "maintenance"]),
                latitude=base_lat,
                longitude=base_lon,
                last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 1440))
            )
            db.add(v)
            vehicles.append(v)
        db.flush()

        # ---- Orders (5000) ----
        print("Creating 5000 orders...")
        all_shippers = [shipper] + extra_shippers
        order_statuses = [
            "created", "created",
            "approved", "approved",
            "slot_assigned",
            "in_transit", "in_transit", "in_transit",
            "checkpoint_processing",
            "arrived",
            "completed", "completed", "completed",
            "cancelled"
        ]

        orders = []
        for i in range(5000):
            owner = random.choice(all_shippers)
            origin_cp = random.choice(checkpoints)
            dest_cp = random.choice([c for c in checkpoints if c.id != origin_cp.id])
            days_ago = random.randint(0, 120)
            created_at = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
            desired_date = created_at + timedelta(days=random.randint(1, 5))
            status = random.choice(order_statuses)
            delay = 0
            if status in ["in_transit", "checkpoint_processing", "arrived", "completed"]:
                delay = random.randint(0, 180)
            actual_arrival = None
            if status in ["arrived", "completed"]:
                actual_arrival = desired_date + timedelta(minutes=delay)

            order_number = random_order_number()
            o = Order(
                order_number=order_number,
                user_id=owner.id,
                company=owner.company or "Unknown Co",
                cargo_type=random.choice(CARGO_TYPES),
                cargo_weight=random.choice([10, 20, 30, 40, 50, 60, 80]),
                origin=origin_cp.name,
                destination=dest_cp.name,
                origin_checkpoint_id=origin_cp.id,
                dest_checkpoint_id=dest_cp.id,
                desired_date=desired_date,
                status=status,
                vehicle_id=random.choice(vehicles).id if status not in ["created", "approved"] else None,
                delay_minutes=delay,
                actual_arrival=actual_arrival,
                estimated_arrival=desired_date + timedelta(hours=random.randint(6, 48)),
                ai_extracted=random.random() > 0.7,
                created_at=created_at
            )
            db.add(o)
            orders.append(o)

            if i % 500 == 0:
                print(f"  {i}/5000 orders created...")
                db.flush()

        db.flush()

        # ---- Slots (for recent orders) ----
        print("Creating slots...")
        for i, order in enumerate(orders[:1500]):
            if order.status in ["slot_assigned", "in_transit", "checkpoint_processing", "arrived", "completed"]:
                cp = db.query(Checkpoint).filter(Checkpoint.id == order.origin_checkpoint_id).first()
                if cp:
                    slot_time = order.desired_date
                    slot_status = "used" if order.status in ["in_transit", "arrived", "completed"] else "active"
                    bn = random_booking_number()
                    s = Slot(
                        checkpoint_id=cp.id,
                        slot_time=slot_time,
                        slot_date=slot_time.strftime("%Y-%m-%d"),
                        duration_minutes=30,
                        status=slot_status,
                        booking_number=bn,
                        vehicle_type="truck",
                        order_id=order.id,
                        expires_at=slot_time + timedelta(hours=2)
                    )
                    db.add(s)
        db.flush()

        # Generate future available slots
        now = datetime.utcnow()
        for cp in checkpoints:
            for day_offset in range(7):
                for hour in range(6, 22):
                    for minute in [0, 30]:
                        slot_time = now + timedelta(days=day_offset, hours=hour, minutes=minute)
                        if random.random() > 0.3:  # 70% availability
                            s = Slot(
                                checkpoint_id=cp.id,
                                slot_time=slot_time,
                                slot_date=slot_time.strftime("%Y-%m-%d"),
                                duration_minutes=30,
                                status="available",
                                vehicle_type=random.choice(VEHICLE_TYPES),
                                expires_at=slot_time + timedelta(hours=2)
                            )
                            db.add(s)
        db.flush()

        # ---- Notifications ----
        print("Creating notifications...")
        notification_templates = [
            ("Order Approved", "Your shipment {order_number} has been approved.", "success"),
            ("Slot Assigned", "Slot booked for {order_number} at checkpoint.", "info"),
            ("Congestion Alert", "High congestion detected at Aktau Port.", "warning"),
            ("Shipment Delayed", "Your shipment {order_number} is delayed by {delay} min.", "error"),
            ("Checkpoint Open", "Temir-Baba border checkpoint is operational.", "success"),
        ]
        for order in random.sample(orders, min(500, len(orders))):
            tmpl = random.choice(notification_templates)
            n = Notification(
                user_id=order.user_id,
                title=tmpl[0],
                message=tmpl[1].format(order_number=order.order_number, delay=order.delay_minutes),
                type=tmpl[2],
                is_read=random.random() > 0.4,
                related_order_id=order.id
            )
            db.add(n)
        db.flush()

        # ---- Events (live feed) ----
        print("Creating events...")
        event_templates = [
            ("shipment_created", "New shipment created", "Cargo shipment {order_number} registered in system", "info"),
            ("slot_booked", "Slot reserved", "Slot booked at {checkpoint}", "info"),
            ("congestion_increased", "Congestion Alert", "{checkpoint} congestion reached critical level", "warning"),
            ("checkpoint_reopened", "Checkpoint Operational", "{checkpoint} has resumed normal operations", "success"),
            ("shipment_completed", "Delivery Complete", "Shipment {order_number} delivered successfully", "success"),
            ("delay_detected", "Delay Detected", "Shipment {order_number} delayed by {delay} minutes", "warning"),
            ("vehicle_arrived", "Vehicle Arrived", "Vehicle arrived at {checkpoint}", "info"),
            ("inspection_required", "Inspection Required", "Cargo inspection required at {checkpoint}", "warning"),
        ]
        for i in range(2000):
            tmpl = random.choice(event_templates)
            order = random.choice(orders)
            cp = random.choice(checkpoints)
            e = Event(
                event_type=tmpl[0],
                title=tmpl[1],
                description=tmpl[2].format(
                    order_number=order.order_number,
                    checkpoint=cp.name,
                    delay=order.delay_minutes
                ),
                checkpoint_id=cp.id,
                order_id=order.id,
                severity=tmpl[3],
                event_metadata={"order_number": order.order_number, "cargo_type": order.cargo_type},
                created_at=datetime.utcnow() - timedelta(minutes=random.randint(0, 10080))
            )
            db.add(e)
        db.flush()

        # ---- Weather Conditions ----
        print("Creating weather data...")
        for cp in checkpoints:
            for days_ago in range(120):
                dt = datetime.utcnow() - timedelta(days=days_ago)
                w = WeatherCondition(
                    checkpoint_id=cp.id,
                    condition=random.choice(WEATHER_CONDITIONS),
                    severity=random.randint(0, 4),
                    temperature=random.uniform(-10, 40),
                    wind_speed=random.uniform(0, 80),
                    visibility=random.uniform(0.2, 10.0),
                    recorded_at=dt
                )
                db.add(w)
        db.flush()

        # ---- Transit Statistics ----
        print("Creating transit statistics (120 days)...")
        for cp in checkpoints:
            for days_ago in range(120):
                date_str = (datetime.utcnow() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
                for hour in range(0, 24, 2):
                    peak_factor = 1.5 if 8 <= hour <= 18 else 0.7
                    ts = TransitStatistic(
                        checkpoint_id=cp.id,
                        date=date_str,
                        hour=hour,
                        vehicles_processed=int(random.uniform(5, 40) * peak_factor),
                        total_cargo_tons=random.uniform(100, 2000) * peak_factor,
                        avg_wait_minutes=random.uniform(10, 90),
                        congestion_level=random.uniform(0.1, 0.9),
                        throughput_score=random.uniform(50, 100)
                    )
                    db.add(ts)
            if days_ago % 30 == 0:
                db.flush()

        db.flush()

        # ---- Predictions ----
        print("Creating initial predictions...")
        for cp in checkpoints:
            load_ratio = cp.current_load / cp.capacity
            p = Prediction(
                checkpoint_id=cp.id,
                predicted_wait_minutes=cp.avg_wait_minutes * (1 + load_ratio),
                predicted_congestion=load_ratio,
                risk_score=min(100, load_ratio * 100 * random.uniform(0.8, 1.2)),
                features_used={"checkpoint": cp.code, "load_ratio": load_ratio},
                valid_for=datetime.utcnow() + timedelta(hours=1),
                created_at=datetime.utcnow()
            )
            db.add(p)
        db.flush()

        # ---- Simulations ----
        print("Creating simulation templates...")
        sim_scenarios = [
            {"name": "Caspian Storm Impact", "scenario": "caspian_storm"},
            {"name": "Temir-Baba Closure", "scenario": "border_closure"},
            {"name": "+30% Transit Growth", "scenario": "traffic_surge"},
            {"name": "Road Maintenance", "scenario": "maintenance"},
        ]
        for s in sim_scenarios:
            sim = Simulation(
                name=s["name"],
                scenario=s["scenario"],
                status="completed",
                parameters={"duration_hours": 24, "affected_checkpoints": ["AKP", "TMB"]},
                results={"delay_increase_pct": random.uniform(10, 50), "affected_vehicles": random.randint(50, 300)},
                impact_summary=f"Simulation '{s['name']}' completed. Expected significant impact on transit flow.",
                created_by=admin.id,
                completed_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            )
            db.add(sim)

        db.commit()
        print("✅ Database seeding complete!")
        print(f"  Users: {db.query(User).count()}")
        print(f"  Checkpoints: {db.query(Checkpoint).count()}")
        print(f"  Vehicles: {db.query(Vehicle).count()}")
        print(f"  Orders: {db.query(Order).count()}")
        print(f"  Slots: {db.query(Slot).count()}")
        print(f"  Events: {db.query(Event).count()}")

    except Exception as e:
        db.rollback()
        print(f"Seeding error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
