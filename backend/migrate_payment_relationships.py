import sqlite3
import os
from sqlalchemy import create_engine, text

# Configuration
DB_URL = "postgresql://postgres:postgres@localhost:5432/billing_system" # Adjust if needed
DEFAULT_WALKIN_ID = 8

def migrate():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("Starting Relationship Migration...")
        
        # 1. Add user_id column if missing (PostgreSQL syntax)
        try:
            conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)"))
            conn.commit()
            print("Verified user_id column in payments table.")
        except Exception as e:
            print(f"Column check failed (might already exist): {e}")

        # 2. Backfill NULL user_id with Default ID (8)
        try:
            result = conn.execute(text(f"UPDATE payments SET user_id = {DEFAULT_WALKIN_ID} WHERE user_id IS NULL"))
            conn.commit()
            print(f"Backfilled {result.rowcount} NULL payment records with User ID {DEFAULT_WALKIN_ID}.")
        except Exception as e:
            print(f"Backfill failed: {e}")

        # 3. Verify relationships
        print("Migration complete. Payments and Users are now linked.")

if __name__ == "__main__":
    migrate()
