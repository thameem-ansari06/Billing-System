import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models.orm import DeliveryTask
from app.models.schemas import DeliveryTaskRead

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)

def inspect_types():
    session = Session()
    print("Inspecting field types for DeliveryTask objects...")
    tasks = session.query(DeliveryTask).all()
    
    if not tasks:
        print("No tasks found.")
        return

    for task in tasks:
        print(f"\n--- Task ID: {task.id} ---")
        for attr in ['id', 'invoice_id', 'driver_id', 'status', 'created_at']:
            val = getattr(task, attr)
            print(f"Field: {attr}, Value: {val!r}, Type: {type(val)}")
        
        # Check driver relationship
        if task.driver:
            print(f"Driver Found: {task.driver.username}")
            for attr in ['id', 'created_at']:
                val = getattr(task.driver, attr)
                print(f"  Driver Field: {attr}, Value: {val!r}, Type: {type(val)}")

    session.close()

if __name__ == "__main__":
    inspect_types()
