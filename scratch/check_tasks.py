import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.db import SessionLocal
from backend.app.models.orm import DeliveryTask, Invoice

def check_tasks():
    db = SessionLocal()
    try:
        tasks = db.query(DeliveryTask).order_by(DeliveryTask.id.desc()).limit(5).all()
        print(f"Total tasks found (last 5): {len(tasks)}")
        for task in tasks:
            print(f"ID: {task.id}, Invoice: {task.invoice_number}, Status: {task.status}, Created At: {task.created_at}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_tasks()
