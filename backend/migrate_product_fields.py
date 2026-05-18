from app.database.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Running migration: Adding UI-aligned fields to products...")
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'Goods'"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR DEFAULT 'pcs'"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_preference VARCHAR DEFAULT 'Taxable'"))
        conn.commit()
        print("Migration Success!")

if __name__ == "__main__":
    migrate()
