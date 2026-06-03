import sys
import os
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from main import app
from app.database.db import SessionLocal
from app.models.orm import User

client = TestClient(app)

def verify():
    print("=== VERIFYING ADMIN STAFF API ===")
    
    # 1. Fetch an admin to get authentication or simulate an admin request
    # Note: TestClient allows us to use dependency_overrides, but since we have real database,
    # let's look up an admin in the database and mock get_current_active_user or use basic authentication if it has a way,
    # or override the dependency.
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    driver = db.query(User).filter(User.role == "delivery").first()
    db.close()
    
    if not admin:
        print("❌ Error: No admin found in database to execute verification!")
        return
        
    if not driver:
        print("❌ Error: No delivery driver found in database to execute verification!")
        return

    print(f"Found Admin: {admin.username} (ID: {admin.id})")
    print(f"Found Driver: {driver.username} (ID: {driver.id}), Current Zone: {driver.assigned_zone_code}, Available: {driver.is_available}")

    # Let's mock authentication by overriding get_current_active_user
    from app.utils.auth import get_current_active_user
    app.dependency_overrides[get_current_active_user] = lambda: admin

    try:
        # Test Case 1: Update driver's zone and availability
        payload = {
            "assigned_zone_code": "ZONE_1",
            "is_available": True
        }
        print(f"Updating driver ID {driver.id} with payload: {payload}")
        response = client.put(f"/api/admin/staff/{driver.id}", json=payload)
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["assigned_zone_code"] == "ZONE_1"
        assert res_data["is_available"] == True
        print("[PASS] Test Case 1 Passed!")

        # Test Case 2: Update driver back to unassigned
        payload2 = {
            "assigned_zone_code": "none",
            "is_available": False
        }
        print(f"Updating driver ID {driver.id} with payload: {payload2}")
        response2 = client.put(f"/api/admin/staff/{driver.id}", json=payload2)
        print(f"Response status: {response2.status_code}")
        print(f"Response body: {response2.json()}")
        
        assert response2.status_code == 200
        res_data2 = response2.json()
        assert res_data2["assigned_zone_code"] is None
        assert res_data2["is_available"] == False
        print("[PASS] Test Case 2 Passed!")

        # Reset driver to original state
        payload_reset = {
            "assigned_zone_code": "none" if driver.assigned_zone_code is None else driver.assigned_zone_code,
            "is_available": driver.is_available
        }
        client.put(f"/api/admin/staff/{driver.id}", json=payload_reset)
        print("Driver restored to original state successfully.")
        
    except Exception as e:
        print(f"[FAIL] Verification failed with error: {e}")
    finally:
        # Clean up dependency overrides
        app.dependency_overrides.clear()

if __name__ == "__main__":
    verify()
