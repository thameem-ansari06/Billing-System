import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load .env
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is missing!")

engine = create_engine(DATABASE_URL)

def run_migration():
    print("Starting logistics database migration...")
    
    with engine.begin() as conn:
        # 1. Add 'delivery_agent' to userrole enum type
        print("[1] Adding 'delivery_agent' to userrole enum type...")
        try:
            conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'delivery_agent'"))
        except Exception as e:
            print(f"Note on userrole enum alteration: {e} (This is normal if enum exists or doesn't support IF NOT EXISTS in old postgres, or if already added)")

        # 2. Create zone_registry table
        print("[2] Creating zone_registry table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS zone_registry (
                id SERIAL PRIMARY KEY,
                zone_code VARCHAR(50) UNIQUE NOT NULL,
                zone_name VARCHAR(100) NOT NULL
            )
        """))

        # 3. Create district_zone_mapping table
        print("🔹 Creating district_zone_mapping table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS district_zone_mapping (
                id SERIAL PRIMARY KEY,
                district_name VARCHAR(100) UNIQUE NOT NULL,
                zone_id INTEGER NOT NULL REFERENCES zone_registry(id) ON DELETE CASCADE
            )
        """))

        # 4. Add columns to users table
        print("🔹 Adding columns to users table...")
        # Check and add assigned_zone_code
        res = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'assigned_zone_code'
        """)).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE users ADD COLUMN assigned_zone_code VARCHAR(50)"))

        # Check and add is_available
        res = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_available'
        """)).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_available BOOLEAN DEFAULT TRUE"))

        # 5. Add columns to delivery_tasks table
        print("🔹 Adding columns to delivery_tasks table...")
        
        # Check and add zone_id
        res = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'delivery_tasks' AND column_name = 'zone_id'
        """)).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN zone_id INTEGER REFERENCES zone_registry(id) ON DELETE SET NULL"))

        # Check and add delivery_agent_id
        res = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'delivery_tasks' AND column_name = 'delivery_agent_id'
        """)).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN delivery_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))

        # Check and add assignment_status
        res = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'delivery_tasks' AND column_name = 'assignment_status'
        """)).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN assignment_status VARCHAR(50) DEFAULT 'Pending_Pooling'"))

        # Check and add order_id (first as nullable so we can migrate existing data)
        res = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'delivery_tasks' AND column_name = 'order_id'
        """)).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE delivery_tasks ADD COLUMN order_id INTEGER"))

        # 6. Migrate existing data for order_id
        print("🔹 Migrating existing delivery task records to map order_id...")
        conn.execute(text("""
            UPDATE delivery_tasks dt 
            SET order_id = i.order_id 
            FROM invoices i 
            WHERE dt.invoice_id = i.id AND dt.order_id IS NULL
        """))
        
        # In case some tasks are still missing order_id, assign the first available order as fallback
        conn.execute(text("""
            UPDATE delivery_tasks 
            SET order_id = (SELECT id FROM orders LIMIT 1) 
            WHERE order_id IS NULL
        """))

        # 7. Apply NOT NULL and FK constraint with ON DELETE CASCADE to order_id in delivery_tasks
        print("🔹 Applying strictly NOT NULL and CASCADE constraints on order_id...")
        conn.execute(text("ALTER TABLE delivery_tasks ALTER COLUMN order_id SET NOT NULL"))
        
        # Drop constraint if exists to avoid duplication
        conn.execute(text("""
            ALTER TABLE delivery_tasks 
            DROP CONSTRAINT IF EXISTS fk_delivery_tasks_order_id
        """))
        conn.execute(text("""
            ALTER TABLE delivery_tasks 
            ADD CONSTRAINT fk_delivery_tasks_order_id 
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        """))

        # 8. Seed default zones
        print("🔹 Seeding default zones into zone_registry...")
        zones = [
            ("ZONE_1", "Zone 1: North"),
            ("ZONE_2", "Zone 2: West"),
            ("ZONE_3", "Zone 3: South")
        ]
        for code, name in zones:
            conn.execute(text("""
                INSERT INTO zone_registry (zone_code, zone_name)
                VALUES (:code, :name)
                ON CONFLICT (zone_code) DO UPDATE SET zone_name = EXCLUDED.zone_name
            """), {"code": code, "name": name})

        # Get zone IDs
        zone_1_id = conn.execute(text("SELECT id FROM zone_registry WHERE zone_code = 'ZONE_1'")).scalar()
        zone_2_id = conn.execute(text("SELECT id FROM zone_registry WHERE zone_code = 'ZONE_2'")).scalar()
        zone_3_id = conn.execute(text("SELECT id FROM zone_registry WHERE zone_code = 'ZONE_3'")).scalar()

        # 9. Seed default district mappings for Tamil Nadu
        print("🔹 Seeding default Tamil Nadu district mappings...")
        
        # North Districts -> Zone 1
        north_districts = [
            'Chennai', 'Chengalpattu', 'Cuddalore', 'Kanchipuram', 'Kallakurichi',
            'Ranipet', 'Tirupattur', 'Tiruvallur', 'Tiruvannamalai', 'Vellore', 'Viluppuram'
        ]
        
        # West Districts -> Zone 2
        west_districts = [
            'Coimbatore', 'Dharmapuri', 'Erode', 'Krishnagiri', 'Namakkal',
            'Nilgiris', 'Salem', 'Tiruppur', 'Karur'
        ]
        
        # South / Central Districts -> Zone 3
        south_districts = [
            'Dindigul', 'Kanyakumari', 'Madurai', 'Ramanathapuram', 'Sivagangai',
            'Tenkasi', 'Theni', 'Thoothukudi', 'Tirunelveli', 'Virudhunagar',
            'Ariyalur', 'Mayiladuthurai', 'Nagapattinam', 'Perambalur',
            'Pudukkottai', 'Thanjavur', 'Tiruchirappalli', 'Tiruvarur'
        ]

        for dist in north_districts:
            conn.execute(text("""
                INSERT INTO district_zone_mapping (district_name, zone_id)
                VALUES (:dist, :zone_id)
                ON CONFLICT (district_name) DO UPDATE SET zone_id = EXCLUDED.zone_id
            """), {"dist": dist, "zone_id": zone_1_id})

        for dist in west_districts:
            conn.execute(text("""
                INSERT INTO district_zone_mapping (district_name, zone_id)
                VALUES (:dist, :zone_id)
                ON CONFLICT (district_name) DO UPDATE SET zone_id = EXCLUDED.zone_id
            """), {"dist": dist, "zone_id": zone_2_id})

        for dist in south_districts:
            conn.execute(text("""
                INSERT INTO district_zone_mapping (district_name, zone_id)
                VALUES (:dist, :zone_id)
                ON CONFLICT (district_name) DO UPDATE SET zone_id = EXCLUDED.zone_id
            """), {"dist": dist, "zone_id": zone_3_id})

    print("🎉 Migration completed successfully and database is fully configured!")

if __name__ == "__main__":
    run_migration()
