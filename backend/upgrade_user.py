"""
Migration Script: Add full_name, email, phone columns to the users table.
Run from the /backend directory: python upgrade_user.py

Uses the existing DATABASE_URL from .env — works with PostgreSQL.
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("[ERROR] DATABASE_URL not found in .env")
    sys.exit(1)

print(f"Connecting to PostgreSQL...")
engine = create_engine(DATABASE_URL)

migrations = [
    ("full_name", "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR"),
    ("email",     "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR"),
    ("phone",     "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR"),
]

with engine.connect() as conn:
    for col_name, sql in migrations:
        try:
            conn.execute(text(sql))
            print(f"[OK] Column '{col_name}' ensured.")
        except Exception as e:
            print(f"[WARN] '{col_name}': {e}")
    conn.commit()

print("\nMigration complete! Re-start the backend server.")
