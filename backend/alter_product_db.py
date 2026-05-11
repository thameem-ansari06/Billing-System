from sqlalchemy import text
from app.database.db import engine

def add_column_if_not_exists(table, column, col_type, default=None):
    with engine.connect() as conn:
        try:
            # We use distinct transactions for each check to avoid aborted transaction errors
            default_clause = f"DEFAULT {default}" if default else ""
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} {default_clause};"))
            conn.commit()
            print(f"Added {column} to {table}")
        except Exception as e:
            conn.rollback()
            if "already exists" in str(e).lower():
                print(f"Column {column} already exists in {table}, skipping.")
            else:
                print(f"Error adding {column}: {e}")

add_column_if_not_exists("products", "description", "TEXT")
add_column_if_not_exists("products", "image_url", "VARCHAR")
add_column_if_not_exists("products", "image_urls", "JSONB", default="'[]'")

print("Database product schema successfully patched!")
