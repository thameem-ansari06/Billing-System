import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from app.database.db import SessionLocal
from app.models.orm import User, ZoneRegistry, DistrictZoneMapping, DeliveryTask

def check_data():
    db = SessionLocal()
    try:
        print("--- Registered Zones ---")
        zones = db.query(ZoneRegistry).all()
        for z in zones:
            print(f"ID: {z.id}, Code: {z.zone_code}, Name: {z.zone_name}")
            
        print("\n--- Available & Online Delivery Agents ---")
        agents = db.query(User).filter(
            User.role.in_(["delivery", "delivery_agent"]),
        ).all()
        for a in agents:
            print(f"ID: {a.id}, Username: {a.username}, Role: {a.role}, Assigned Zone: {a.assigned_zone_code}, Available: {a.is_available}")

        print("\n--- Pending Pooling Delivery Tasks ---")
        tasks = db.query(DeliveryTask).filter(DeliveryTask.assignment_status == "Pending_Pooling").all()
        for t in tasks:
            print(f"ID: {t.id}, Order ID: {t.order_id}, Zone ID: {t.zone_id}, Status: {t.assignment_status}, Assignment Status Or Zone: {t.assignment_status_or_zone}")
            
    except Exception as e:
        print(f"Error checking database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
