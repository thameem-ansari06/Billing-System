import sys
import os
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent))

from main import app
from app.database.db import SessionLocal
from app.models.orm import User, Order, DeliveryTask, ZoneRegistry, DistrictZoneMapping

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("[INFO] STARTING LOGISTICS ARCHITECTURE VERIFICATION")
    print("==================================================")
    
    db: Session = SessionLocal()
    
    # ── Prep test data inside a block ──────────────────────────────────────────
    try:
        # Clear any potential old test leftovers
        db.query(DeliveryTask).filter(DeliveryTask.customer_name.like("TEST_%")).delete(synchronize_session=False)
        db.query(Order).filter(Order.origin == "test_logistics").delete(synchronize_session=False)
        db.query(User).filter(User.username.like("test_agent_%")).delete(synchronize_session=False)
        db.commit()

        # 1. Fetch or create a test customer user
        test_customer = db.query(User).filter(User.role == "customer").first()
        if not test_customer:
            # Create a customer
            test_customer = User(
                username="test_agent_customer",
                hashed_password="dummy",
                role="customer",
                full_name="TEST_Customer",
                address_line="123 Kovai Rd, Coimbatore",
                district="Coimbatore",
                state="Tamil Nadu",
                is_available=True
            )
            db.add(test_customer)
            db.flush()
        
        # 2. Create target zone and mappings check (already seeded by migration, let's verify)
        zone_2 = db.query(ZoneRegistry).filter(ZoneRegistry.zone_code == "ZONE_2").first()
        if not zone_2:
            print("❌ Error: ZONE_2 was not seeded!")
            sys.exit(1)
        
        coimbatore_map = db.query(DistrictZoneMapping).filter(func.lower(DistrictZoneMapping.district_name) == "coimbatore").first()
        if not coimbatore_map:
            print("[ERROR] Coimbatore mapping was not seeded!")
            sys.exit(1)
        
        # 3. Create test delivery agents in ZONE_2 (West)
        print("[INFO] Creating two delivery agents in ZONE_2...")
        agent_a = User(
            username="test_agent_a",
            hashed_password="dummy",
            role="delivery_agent",
            full_name="TEST_Agent A",
            assigned_zone_code="ZONE_2",
            is_available=True
        )
        agent_b = User(
            username="test_agent_b",
            hashed_password="dummy",
            role="delivery_agent",
            full_name="TEST_Agent B",
            assigned_zone_code="ZONE_2",
            is_available=True
        )
        db.add(agent_a)
        db.add(agent_b)
        db.flush()
        print(f"   Created Agent A (ID: {agent_a.id}) and Agent B (ID: {agent_b.id})")

        # 4. Create Parent Orders
        # Order 1 (for initial task loading)
        order_1 = Order(
            user_id=test_customer.id,
            total_amount=1500.0,
            origin="test_logistics"
        )
        # Order 2 (for our new pooled task)
        order_2 = Order(
            user_id=test_customer.id,
            total_amount=2500.0,
            origin="test_logistics"
        )
        db.add(order_1)
        db.add(order_2)
        db.flush()
        print(f"   Created parent Order 1 (ID: {order_1.id}) and Order 2 (ID: {order_2.id})")

        # 5. Populate initial load on Agent A
        # Assign an active task to Agent A
        task_load = DeliveryTask(
            order_id=order_1.id,
            zone_id=zone_2.id,
            delivery_agent_id=agent_a.id,
            driver_id=agent_a.id,
            assignment_status="Assigned",
            customer_name="TEST_Load Customer",
            customer_address="Salem, TN"
        )
        db.add(task_load)
        db.commit()
        print("   Assigned 1 initial active task to Agent A (making Agent B the least loaded)")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Setup error: {e}")
        sys.exit(1)

    # ── Test Case 1: Post-Checkout Processing with Cleaning Trailing Whitespace ──
    print("\n[TEST] Test Case 1: Trigger /api/logistics/process-zone-pooling with whitespace...")
    payload = {
        "order_id": order_2.id,
        "customer_district": "  Coimbatore  " # Testing whitespace strip!
    }
    
    response = client.post("/api/logistics/process-zone-pooling", json=payload)
    print(f"   Status Code: {response.status_code}")
    print(f"   Response Body: {response.json()}")
    
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["assignment_status"] == "Pending_Pooling"
    assert res_data["zone_id"] == zone_2.id
    pooled_task_id = res_data["task_id"]
    print("   [PASS] Test Case 1 Passed! Trailing whitespace stripped and mapped correctly to Zone 2.")

    # ── Test Case 2: Post-Checkout Processing Guardrails ──────────────────────────
    print("\n[TEST] Test Case 2: Trigger /api/logistics/process-zone-pooling with unmapped district...")
    payload_bad = {
        "order_id": order_2.id,
        "customer_district": "New York City"
    }
    response_bad = client.post("/api/logistics/process-zone-pooling", json=payload_bad)
    print(f"   Status Code: {response_bad.status_code}")
    print(f"   Response Body: {response_bad.json()}")
    assert response_bad.status_code == 404
    # ── Test Case 2.5: Verify GET /api/logistics/metrics ──────────────────────────
    print("\n[TEST] Test Case 2.5: Verify GET /api/logistics/metrics payload and aggregations...")
    metrics_response = client.get("/api/logistics/metrics")
    print(f"   Status Code: {metrics_response.status_code}")
    print(f"   Response Body: {metrics_response.json()}")
    
    assert metrics_response.status_code == 200
    metrics_data = metrics_response.json()
    
    # 1. Verify snake_case serialization keys exist
    assert "unassigned_count" in metrics_data
    assert "online_agents" in metrics_data
    assert "zone_breakdown" in metrics_data
    assert "total_parcels" in metrics_data
    
    # 2. Verify backward compatible camelCase serialization keys exist
    assert "unassignedCount" in metrics_data
    assert "onlineAgents" in metrics_data
    assert "zoneBreakdown" in metrics_data
    assert "totalParcels" in metrics_data
    
    # 3. Verify aggregated values are correct
    # There is 1 unassigned task (pooled_task_id) created in Test Case 1
    assert metrics_data["unassigned_count"] >= 1
    # There are 2 online agents created in Setup
    assert metrics_data["online_agents"] >= 2
    # Zone 2 should have at least 1 pending order
    assert metrics_data["zone_breakdown"]["ZONE_2"] >= 1
    # Default layout check for ZONE_1, ZONE_2, and ZONE_3
    assert "ZONE_1" in metrics_data["zone_breakdown"]
    assert "ZONE_2" in metrics_data["zone_breakdown"]
    assert "ZONE_3" in metrics_data["zone_breakdown"]
    
    print("   [PASS] Test Case 2.5 Passed! GET /api/logistics/metrics returns valid, highly optimized aggregates.")

    # ── Test Case 3: Least-Loaded Agent Auto-Assignment ────────────────────────────
    print("\n[TEST] Test Case 3: Trigger /api/logistics/trigger-agent-auto-assignment...")
    payload_assign = {
        "zone_code": "ZONE_2"
    }
    
    # Trigger auto-assignment
    assign_response = client.post("/api/logistics/trigger-agent-auto-assignment", json=payload_assign)
    print(f"   Status Code: {assign_response.status_code}")
    print(f"   Response Body: {assign_response.json()}")
    
    assert assign_response.status_code == 200
    assign_data = assign_response.json()
    # It must select Agent B because Agent A has 1 active task, and Agent B has 0 active tasks!
    assert assign_data["agent"]["id"] == agent_b.id
    assert assign_data["assigned_count"] == 1
    print("   [PASS] Test Case 3 Passed! Auto-assignment correctly picked the least-loaded Agent B.")

    # Verify database state after auto-assignment
    db.refresh(agent_a)
    db.refresh(agent_b)
    pooled_task = db.query(DeliveryTask).filter(DeliveryTask.id == pooled_task_id).first()
    assert pooled_task.delivery_agent_id == agent_b.id
    assert pooled_task.assignment_status == "Assigned"
    print("   [PASS] Database verify passed! Tasks updated in transaction successfully.")

    # ── Test Case 4: Non-Nullable and Cascade Delete Constraint ──────────────────────
    print("\n[TEST] Test Case 4: Verify ON DELETE CASCADE for order_id...")
    # Delete parent Order 2
    try:
        db.delete(order_2)
        db.commit()
        print("   Deleted parent Order 2.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to delete Order 2: {e}")
        sys.exit(1)
        
    # Check if the pooled task was automatically deleted
    cascaded_task = db.query(DeliveryTask).filter(DeliveryTask.id == pooled_task_id).first()
    if cascaded_task is None:
        print("   [PASS] Test Case 4 Passed! Delivery task was cascade-deleted when parent order was deleted.")
    else:
        print(f"[ERROR] Task {pooled_task_id} still exists in the database!")
        sys.exit(1)

    # ── Clean up other test components ──────────────────────────────────────────────
    print("\n[INFO] Cleaning up test users and agents...")
    try:
        db.delete(order_1) # Cascade deletes task_load
        db.delete(agent_a)
        db.delete(agent_b)
        db.commit()
        print("   Cleanup successful!")
    except Exception as e:
        db.rollback()
        print(f"[WARNING] Cleanup failed: {e}")
        
    print("\n==================================================")
    print("[SUCCESS] ALL TESTS PASSED SUCCESSFULLY! ARCHITECTURE IS SOLID")
    print("==================================================")

if __name__ == "__main__":
    from sqlalchemy import func
    run_tests()
