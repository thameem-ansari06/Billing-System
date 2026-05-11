import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.db import SessionLocal
from app.models.orm import DeliveryTask, User, UserRole, DeliveryStatus
from sqlalchemy import or_

def cleanup_tasks():
    db = SessionLocal()
    try:
        # Find tasks that are Picked Up or further but have no driver_id
        # OR tasks that are Assigned but have no driver_id (though that shouldn't happen with new logic)
        tasks = db.query(DeliveryTask).filter(
            DeliveryTask.driver_id == None,
            DeliveryTask.status != DeliveryStatus.ASSIGNED # If it's Assigned and no driver, it's pending assignment
        ).all()
        
        print(f"Found {len(tasks)} inconsistent tasks.")
        
        if not tasks:
            print("No cleanup needed.")
            return

        # Find a default driver if possible, or ask for one
        drivers = db.query(User).filter(User.role.in_([UserRole.delivery, "driver"])).all()
        if not drivers:
            print("No drivers found in the system. Cannot link tasks.")
            return
        
        default_driver = drivers[0]
        print(f"Linking tasks to default driver: {default_driver.username} (ID: {default_driver.id})")
        
        for task in tasks:
            task.driver_id = default_driver.id
            print(f"Updated Task #{task.id} (Status: {task.status})")
        
        db.commit()
        print("Cleanup completed successfully.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_tasks()
