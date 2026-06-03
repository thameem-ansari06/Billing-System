import os
from sqlalchemy import text, inspect
from app.database.db import engine

# Connect to the DB engine directly to inject database alterations safely
with engine.connect() as conn:
    inspector = inspect(engine)
    
    # --- 1. Alter customers table ---
    columns_customers = [c["name"] for c in inspector.get_columns("customers")]
    
    if "city" in columns_customers:
        try:
            conn.execute(text("ALTER TABLE customers RENAME COLUMN city TO district;"))
            print("[SUCCESS] Renamed city to district in customers table")
        except Exception as e:
            print("[ERROR] Failed renaming city in customers:", e)
    elif "district" not in columns_customers:
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN district VARCHAR;"))
            print("[SUCCESS] Added district column to customers table")
        except Exception as e:
            print("[ERROR] Failed adding district column to customers:", e)
            
    if "billing_city" in columns_customers:
        try:
            conn.execute(text("ALTER TABLE customers RENAME COLUMN billing_city TO billing_district;"))
            print("[SUCCESS] Renamed billing_city to billing_district in customers table")
        except Exception as e:
            print("[ERROR] Failed renaming billing_city in customers:", e)
            
    if "shipping_city" in columns_customers:
        try:
            conn.execute(text("ALTER TABLE customers RENAME COLUMN shipping_city TO shipping_district;"))
            print("[SUCCESS] Renamed shipping_city to shipping_district in customers table")
        except Exception as e:
            print("[ERROR] Failed renaming shipping_city in customers:", e)

    # --- 2. Alter invoices table ---
    columns_invoices = [c["name"] for c in inspector.get_columns("invoices")]
    if "customer_city" in columns_invoices:
        try:
            conn.execute(text("ALTER TABLE invoices RENAME COLUMN customer_city TO customer_district;"))
            print("[SUCCESS] Renamed customer_city to customer_district in invoices table")
        except Exception as e:
            print("[ERROR] Failed renaming customer_city in invoices:", e)
    elif "customer_district" not in columns_invoices:
        try:
            conn.execute(text("ALTER TABLE invoices ADD COLUMN customer_district VARCHAR;"))
            print("[SUCCESS] Added customer_district column to invoices table")
        except Exception as e:
            print("[ERROR] Failed adding customer_district column to invoices:", e)

    # --- 3. Alter delivery_tasks table ---
    columns_delivery = [c["name"] for c in inspector.get_columns("delivery_tasks")]
    if "customer_city" in columns_delivery:
        try:
            conn.execute(text("ALTER TABLE delivery_tasks RENAME COLUMN customer_city TO customer_district;"))
            print("[SUCCESS] Renamed customer_city to customer_district in delivery_tasks table")
        except Exception as e:
            print("[ERROR] Failed renaming customer_city in delivery_tasks:", e)
    elif "customer_district" not in columns_delivery:
        try:
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN customer_district VARCHAR;"))
            print("[SUCCESS] Added customer_district column to delivery_tasks table")
        except Exception as e:
            print("[ERROR] Failed adding customer_district column to delivery_tasks:", e)

    # --- 4. Alter users table ---
    columns_users = [c["name"] for c in inspector.get_columns("users")]
    if "city" in columns_users:
        try:
            conn.execute(text("ALTER TABLE users RENAME COLUMN city TO district;"))
            print("[SUCCESS] Renamed city to district in users table")
        except Exception as e:
            print("[ERROR] Failed renaming city in users:", e)
    elif "district" not in columns_users:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN district VARCHAR;"))
            print("[SUCCESS] Added district column to users table")
        except Exception as e:
            print("[ERROR] Failed adding district column to users:", e)

    conn.commit()

print("Database successfully patched with district formatting!")
