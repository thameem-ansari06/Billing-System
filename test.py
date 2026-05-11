# Create a file named 'hash_gen.py' and run it:
from passlib.context import CryptContext

# FastAPI apps-la 99% intha logic dhaan use aagum
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password_to_hash = "Thameem@123"  # Ungalukku thevaiyaana password-a inga podunga
hashed_password = pwd_context.hash(password_to_hash)

print(f"Your Hashed Password: {hashed_password}")