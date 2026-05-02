from sqlalchemy import text
from app.database.db import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN description TEXT;"))
        print("✅ Added description to products")
    except Exception as e:
        print("Skip products.description:", e)
        
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN image_url VARCHAR;"))
        print("✅ Added image_url to products")
    except Exception as e:
        print("Skip products.image_url:", e)
        
    conn.commit()

print("Database product schema successfully patched!")
