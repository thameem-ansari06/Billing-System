import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Updating NULL contact_number in delivery_tasks...")
    result = conn.execute(text("UPDATE delivery_tasks SET contact_number = 'Not Provided' WHERE contact_number IS NULL OR contact_number = ''"))
    conn.commit()
    print(f"Updated {result.rowcount} rows.")

print("Cleanup completed.")
