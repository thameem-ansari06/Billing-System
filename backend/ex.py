# Unga auth logic-la ulla pwd_context-a import pannunga
from app.utils.auth import pwd_context 

# Inga unga test password-a kudunga
raw_password = "123456"
new_hash = pwd_context.hash(raw_password)

print(f"--- COPY THIS HASH ---")
print(new_hash)
print(f"-----------------------")