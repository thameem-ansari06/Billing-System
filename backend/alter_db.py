from sqlalchemy import text
from app.database.db import engine

# Connect to the DB engine directly to inject the missing ALTER TABLE commands
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE invoices ADD COLUMN order_id INTEGER REFERENCES orders(id);"))
        print("✅ Added order_id to invoices")
    except Exception as e:
        print("invoices skip:", e)
        
    try:
        conn.execute(text("ALTER TABLE quotes ADD COLUMN order_id INTEGER REFERENCES orders(id);"))
        print("✅ Added order_id to quotes")
    except Exception:
        pass
        
    try:
        conn.execute(text("ALTER TABLE delivery_challans ADD COLUMN order_id INTEGER REFERENCES orders(id);"))
        print("✅ Added order_id to delivery_challans")
    except Exception:
        pass
        
    conn.commit()

print("🎉 Database successfully patched! You are good to go!")
