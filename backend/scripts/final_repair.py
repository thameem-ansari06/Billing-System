import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def final_repair():
    with engine.connect() as conn:
        print("Repairing legacy status strings...")
        # Specifically target 'Pending Delivery' which caused the LookupError
        try:
            res = conn.execute(text("UPDATE delivery_tasks SET status = 'ASSIGNED' WHERE status IN ('Pending Delivery', 'Pending', 'PENDING');"))
            conn.commit()
            print(f"[SUCCESS] Repaired {res.rowcount} legacy records.")
        except Exception as e:
            print(f"[ERROR] Repair failed: {e}")

if __name__ == "__main__":
    final_repair()
