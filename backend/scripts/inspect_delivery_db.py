import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def inspect_db():
    with engine.connect() as conn:
        print("Checking delivery_tasks table structure and data...")
        
        # Check columns
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'delivery_tasks';"))
        for row in res:
            print(f"Column: {row[0]}, Type: {row[1]}")
            
        # Check for NULLs
        critical_fields = ['id', 'invoice_id', 'customer_name', 'customer_address', 'status', 'created_at']
        for field in critical_fields:
            res = conn.execute(text(f"SELECT count(*) FROM delivery_tasks WHERE {field} IS NULL;"))
            print(f"Tasks with NULL {field}: {res.scalar()}")
        
        # Check status conformity
        valid = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED', 'REJECTED']
        valid_str = "', '".join(valid)
        query = text(f"SELECT id, status FROM delivery_tasks WHERE status NOT IN ('{valid_str}');")
        res = conn.execute(query)
        invalid_rows = res.fetchall()
        if invalid_rows:
            print(f"Non-conforming records found: {len(invalid_rows)}")
            for row in invalid_rows:
                print(f"ID: {row[0]}, Status: '{row[1]}'")
        else:
            print("All status values conform to the Enum.")

if __name__ == "__main__":
    inspect_db()
