import sqlite3
import os

db_path = "backend/data/ar_system.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", [row[0] for row in cursor.fetchall()])

# Check schema for delivery_tasks if it exists
try:
    cursor.execute("PRAGMA table_info(delivery_tasks)")
    print("delivery_tasks columns:", cursor.fetchall())
except Exception as e:
    print("Error checking delivery_tasks:", e)

conn.close()
