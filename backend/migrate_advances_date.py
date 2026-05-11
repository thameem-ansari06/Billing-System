import sqlite3
import os

# Connect to the SQLite database
# Note: In a production environment, you would use Alembic or similar.
# Since we are using SQLite for local development, we can use a direct script.

db_path = "data/billing.db" # Standard path in this repo

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(advances)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "date" not in columns:
            print("Adding 'date' column to 'advances' table...")
            cursor.execute("ALTER TABLE advances ADD COLUMN date VARCHAR")
            conn.commit()
            print("Successfully added 'date' column.")
        else:
            print("'date' column already exists in 'advances' table.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()
