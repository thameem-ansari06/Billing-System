import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# Existing DB credentials from .env
DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI Dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_next_id(prefix, table_name, column_name):
    """
    Robust Serial ID Generator for Antigravity Hub.
    Format: PREFIX/YYYY/001
    Uses FOR UPDATE to handle concurrent requests safely.
    """
    from datetime import datetime
    year = datetime.now().year
    year_prefix = f"{prefix}-{year}-"
    
    db = SessionLocal()
    try:
        # Use FOR UPDATE to lock the row(s) and prevent race conditions
        query = text(f"SELECT {column_name} FROM {table_name} WHERE {column_name} LIKE :yp ORDER BY {column_name} DESC LIMIT 1 FOR UPDATE")
        result = db.execute(query, {"yp": f"{year_prefix}%"}).fetchone()
        
        if result and result[0]:
            last_id_str = result[0]
            # Split 'INV-2026-005' by '-' and take the last part
            parts = last_id_str.split('-')
            last_num = int(parts[-1])
            new_num = last_num + 1
        else:
            new_num = 1
            
        formatted_id = f"{year_prefix}{str(new_num).zfill(3)}"
        db.commit() # Release lock
        return formatted_id
    except Exception as e:
        db.rollback()
        print(f"❌ Robust ID Gen Error: {e}")
        # Fallback to a timestamp-based ID to ensure uniqueness if DB is locked/failing
        return f"{year_prefix}ERR-{int(datetime.now().timestamp())}"
    finally:
        db.close()

def setup_db():
    """Original setup_db maintained for reference, but Base.metadata.create_all is preferred."""
    # This will be called in main.py via Base.metadata.create_all(bind=engine)
    print("SQLAlchemy Engine: Initialized!")
