import sqlite3
import os

db_path = "backend/data/ar_system.db" # Standard path based on project structure

if not os.path.exists(db_path):
    # Try alternative path
    db_path = "data/ar_system.db"

if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding driver_id to delivery_tasks...")
    cursor.execute("ALTER TABLE delivery_tasks ADD COLUMN driver_id INTEGER REFERENCES users(id)")
except Exception as e:
    print(f"driver_id already exists or error: {e}")

try:
    print("Adding signature_url to delivery_tasks...")
    cursor.execute("ALTER TABLE delivery_tasks ADD COLUMN signature_url TEXT")
except Exception as e:
    print(f"signature_url already exists or error: {e}")

try:
    print("Adding delivery_photo_url to delivery_tasks...")
    cursor.execute("ALTER TABLE delivery_tasks ADD COLUMN delivery_photo_url TEXT")
except Exception as e:
    print(f"delivery_photo_url already exists or error: {e}")

conn.commit()
conn.close()
print("Migration completed successfully.")
