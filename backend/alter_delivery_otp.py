import os
import sys

# Add the project root to python path to resolve 'app' module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database.db import engine

def migrate_delivery_task_otp():
    try:
        with engine.begin() as conn:
            # Check if columns exist
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='delivery_tasks'"))
            columns = [row[0] for row in result]
            
            if 'pickup_code' in columns:
                print("Renaming pickup_code to pickup_otp...")
                conn.execute(text("ALTER TABLE delivery_tasks RENAME COLUMN pickup_code TO pickup_otp"))
                
            if 'otp_code' in columns:
                print("Renaming otp_code to delivery_otp...")
                conn.execute(text("ALTER TABLE delivery_tasks RENAME COLUMN otp_code TO delivery_otp"))
                
            # If the script is run on a fresh DB where pickup_code never existed, but we still need the new columns
            if 'pickup_otp' not in columns and 'pickup_code' not in columns:
                print("Adding pickup_otp...")
                conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN pickup_otp VARCHAR(6)"))
            if 'delivery_otp' not in columns and 'otp_code' not in columns:
                print("Adding delivery_otp...")
                conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN delivery_otp VARCHAR(6)"))

            print("Database migration successful!")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate_delivery_task_otp()
