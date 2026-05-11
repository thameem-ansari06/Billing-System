import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load from the correct .env path
load_dotenv(dotenv_path="../.env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
else:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("Checking/Adding 'date' column to 'advances' table in PostgreSQL...")
            # PostgreSQL syntax to add column if not exists
            conn.execute(text("ALTER TABLE advances ADD COLUMN IF NOT EXISTS date VARCHAR"))
            conn.commit()
            print("Successfully executed migration.")
        except Exception as e:
            print(f"Error during migration: {e}")
