import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Checking for wallet_balance in users...")
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_balance';")
    if not cur.fetchone():
        print("Adding wallet_balance to users...")
        cur.execute("ALTER TABLE users ADD COLUMN wallet_balance FLOAT DEFAULT 0.0;")
    else:
        print("wallet_balance already exists in users.")

    print("Checking for new columns in payments...")
    columns_to_add = {
        "invoice_id": "INTEGER REFERENCES invoices(id)",
        "user_id": "INTEGER REFERENCES users(id)",
        "payment_method": "VARCHAR", # We'll use VARCHAR for now to avoid ENUM complexities in migration, ORM will handle enum
        "status": "VARCHAR DEFAULT 'SUCCESS'",
        "transaction_id": "VARCHAR",
        "is_overpayment": "BOOLEAN DEFAULT FALSE",
        "payment_date": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
    }

    for col, definition in columns_to_add.items():
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='payments' AND column_name='{col}';")
        if not cur.fetchone():
            print(f"Adding {col} to payments...")
            cur.execute(f"ALTER TABLE payments ADD COLUMN {col} {definition};")
        else:
            print(f"{col} already exists in payments.")

    # Update existing status column if it was VARCHAR but had different default or values
    # In my ORM change, I used Enum(PaymentStatus). 
    # If the existing status was 'pending'/'captured', we might want to map them.
    print("Updating existing payment statuses...")
    cur.execute("UPDATE payments SET status = 'SUCCESS' WHERE status IN ('captured', 'pending');")

    # Make razorpay_order_id nullable if it wasn't
    cur.execute("ALTER TABLE payments ALTER COLUMN razorpay_order_id DROP NOT NULL;")

    conn.commit()
    cur.close()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
