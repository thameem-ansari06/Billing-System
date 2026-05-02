import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def add_column_if_missing(table, column, type):
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns(table)]
    if column not in columns:
        print(f"Adding {column} to {table}...")
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type}"))
            conn.commit()
    else:
        print(f"{column} already exists in {table}.")

add_column_if_missing("delivery_tasks", "driver_id", "INTEGER REFERENCES users(id)")
add_column_if_missing("delivery_tasks", "signature_url", "TEXT")
add_column_if_missing("delivery_tasks", "delivery_photo_url", "TEXT")
# Just in case these are missing in some environments
add_column_if_missing("delivery_tasks", "latitude", "FLOAT")
add_column_if_missing("delivery_tasks", "longitude", "FLOAT")

print("Migration completed.")
