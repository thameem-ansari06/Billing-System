import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def cleanup_data():
    with engine.connect() as conn:
        print("Starting Data Integrity Cleanup...")
        
        # 1. Cast driver_id and invoice_id if they are strings (Safety measure)
        # Note: If already integer, this is a no-op but ensures conformity
        try:
            # We check if columns are VARCHAR first to avoid errors on pure INT columns
            res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'delivery_tasks' AND column_name IN ('driver_id', 'invoice_id');"))
            columns = res.fetchall()
            for col, dtype in columns:
                if dtype != 'integer':
                    print(f"Casting {col} from {dtype} to integer...")
                    conn.execute(text(f"ALTER TABLE delivery_tasks ALTER COLUMN {col} TYPE INTEGER USING {col}::integer;"))
                    conn.commit()
                    print(f"[OK] {col} cast to integer.")
        except Exception as e:
            print(f"[ERROR] ID casting failed: {e}")

        # 2. Align status values
        # If any numeric statuses exist (from legacy), map them to ASSIGNED
        try:
            res = conn.execute(text("UPDATE delivery_tasks SET status = 'ASSIGNED' WHERE status ~ '^[0-9]+$';"))
            conn.commit()
            print(f"[OK] Updated {res.rowcount} numeric statuses to ASSIGNED.")
        except Exception as e:
            print(f"[ERROR] Status alignment failed: {e}")
            
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_data()
