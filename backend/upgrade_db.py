import sqlite3

print("🔧 Upgrading Database Schema...")
try:
    conn = sqlite3.connect('data/ar_system.db')
    c = conn.cursor()
    # Puthu column-a namma existing table-la add panrom
    c.execute("ALTER TABLE invoices ADD COLUMN payment_proof_path TEXT")
    conn.commit()
    print("✅ Success: 'payment_proof_path' column added!")
except sqlite3.OperationalError as e:
    print(f"⚠️ Note: {e} (Maybe column already exists?)")
finally:
    conn.close()