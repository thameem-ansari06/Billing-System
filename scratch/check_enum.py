import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from app.database.db import SessionLocal
from sqlalchemy import text

def check():
    db = SessionLocal()
    try:
        # Get list of all enums in PostgreSQL
        enums = db.execute(text("SELECT typname FROM pg_type WHERE typtype = 'e';")).fetchall()
        print("All database enums:")
        for e in enums:
            enum_name = e[0]
            print(f"\n--- Enum: {enum_name} ---")
            labels = db.execute(text(f"SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = '{enum_name}';")).fetchall()
            for l in labels:
                print(f"  {l[0]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
