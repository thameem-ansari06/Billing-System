import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models.orm import DeliveryTask
from app.models.schemas import DeliveryTaskRead
from pydantic import ValidationError

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)

def test_serialization():
    session = Session()
    print("Testing DeliveryTask serialization...")
    tasks = session.query(DeliveryTask).all()
    
    for task in tasks:
        try:
            # Simulate what FastAPI does
            DeliveryTaskRead.model_validate(task)
        except ValidationError as e:
            print(f"\n[ERROR] Task ID {task.id} failed validation!")
            print(f"Status in DB: '{task.status}'")
            print(f"Validation Errors: {e.json(indent=2)}")
            # We don't break, check others too
        except Exception as e:
            print(f"\n[CRITICAL] Unexpected error for Task ID {task.id}: {e}")
            
    print("\nSerialization test complete.")
    session.close()

if __name__ == "__main__":
    test_serialization()
