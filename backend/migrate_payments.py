import sys
import os

# Add the 'app' directory to the path so we can import modules
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database.db import engine
from app.models.orm import Payment

print("Creating payments table...")
Payment.__table__.create(engine, checkfirst=True)
print("Payments table created successfully.")
