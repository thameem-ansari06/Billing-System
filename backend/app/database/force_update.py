import psycopg2
from passlib.context import CryptContext

# 1. Setup Auth & DB Params
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# 🛑 INGA UNGA DB DETAILS-A UPDATE PANNUNGA
db_config = {
    "dbname": "ar_automation_db", 
    "user": "postgres",
    "password": "thameem123",
    "host": "localhost",
    "port": "5432"
}

def change_user_password(username, new_password):
    try:
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()

        # 3. Generate a Fresh, Valid Bcrypt Hash
        hashed_password = pwd_context.hash(new_password)

        # 4. Update the Database
        query = "UPDATE users SET hashed_password = %s WHERE username = %s"
        cur.execute(query, (hashed_password, username))
        
        conn.commit()
        
        if cur.rowcount > 0:
            print(f"✅ Success! Password for '{username}' has been updated.")
            print(f"📦 New Hash: {hashed_password}")
        else:
            print(f"❌ Error: User '{username}' not found.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Database Error: {e}")

if __name__ == "__main__":
    # Inga username and puthu password-a kudunga
    change_user_password("customer_1", "123456")