import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.db import SessionLocal
from backend.app.models.orm import DeliveryTask, Invoice

def check_paid_invoices():
    db = SessionLocal()
    try:
        invoices = db.query(Invoice).filter(Invoice.status == "Paid").order_by(Invoice.id.desc()).limit(5).all()
        print(f"Total Paid invoices found (last 5): {len(invoices)}")
        for inv in invoices:
            tasks = db.query(DeliveryTask).filter(DeliveryTask.invoice_id == inv.id).all()
            print(f"Invoice ID: {inv.id}, Number: {inv.invoice_number}, Status: {inv.status}, Tasks Count: {len(tasks)}")
            for task in tasks:
                print(f"  - Task ID: {task.id}, Status: {task.status}, Created: {task.created_at}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_paid_invoices()
