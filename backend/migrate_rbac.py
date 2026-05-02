import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to local sqlite if not set, though user mentioned Postgres
    DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.begin() as conn:
        print("Starting RBAC Migration...")
        
        # 1. Update Enum (Postgres Specific)
        if "postgresql" in DATABASE_URL:
            # Postgres requires commit outside of transaction block for ALTER TYPE
            pass # We will do it in a separate connection with isolation_level=AUTOCOMMIT

        # 2. Add user_id to invoices
        try:
            print("Adding user_id column to invoices table...")
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE invoices ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            else:
                conn.execute(text("ALTER TABLE invoices ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            print("Successfully added user_id.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column user_id already exists.")
            else:
                print(f"Skipping column add (might already exist): {e}")

if "postgresql" in DATABASE_URL:
    # Postgres ENUM alterations require AUTOCOMMIT
    autocommit_engine = engine.execution_options(isolation_level="AUTOCOMMIT")
    with autocommit_engine.connect() as conn:
        for role in ['ceo', 'sales', 'accounts']:
            try:
                print(f"Adding {role} to userrole ENUM...")
                conn.execute(text(f"ALTER TYPE userrole ADD VALUE '{role}'"))
                print(f"Successfully added {role}.")
            except Exception as e:
                print(f"Skipping enum add (might already exist): {e}")

# Run main migration
run_migration()
print("Migration completed.")
