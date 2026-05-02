import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models.orm import User
from app.utils.auth import get_password_hash, verify_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_auth():
    db = SessionLocal()
    try:
        # Get a user that is explicitly set to 'customer'
        # Or just verify fetching the first customer works without crashing
        print("Fetching a 'customer' from DB...")
        customer_user = db.query(User).filter(User.role == "customer").first()
        
        if customer_user:
            print(f"Success! Found customer: {customer_user.username}")
            print(f"Role object: {customer_user.role}")
            
            # Test password verification (using a dummy test or existing hash)
            print("Testing password verification logic...")
            # We don't know their actual password, so we just run verify_password on a bad one 
            # to ensure the function itself doesn't crash.
            result = verify_password("wrongpassword123", customer_user.hashed_password)
            print(f"Password verification executed. Result for wrong password: {result}")
        else:
            print("No 'customer' role users found in the DB, but query executed successfully without crashing.")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_auth()
