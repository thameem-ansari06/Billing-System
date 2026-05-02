import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

inspector = inspect(engine)
tables = inspector.get_table_names()
print("Tables:", tables)

if "delivery_tasks" in tables:
    columns = inspector.get_columns("delivery_tasks")
    print("delivery_tasks columns:", [c["name"] for c in columns])
else:
    print("delivery_tasks table does not exist.")
