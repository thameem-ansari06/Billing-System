from app.database.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Running migration: Adding is_deleted to products...")
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
        conn.commit()
        print("Migration Success!")

if __name__ == "__main__":
    migrate()
