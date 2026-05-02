from sqlalchemy import text
from app.database.db import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN gst_percentage FLOAT DEFAULT 18.0;"))
        print("✅ Added gst_percentage to products")
    except Exception as e:
        print("Skip products.gst_percentage:", e)
        
    conn.commit()

print("Database product schema successfully patched for gst_percentage!")
