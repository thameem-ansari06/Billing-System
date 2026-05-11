from app.database.db import SessionLocal
from app.models.orm import Customer, User
from app.models.enums import UserRole

db = SessionLocal()
customers_count = db.query(Customer).count()
users_customers_count = db.query(User).filter(User.role.in_([UserRole.user, UserRole.customer])).count()

print(f"Records in 'customers' table: {customers_count}")
print(f"Users with role 'user' or 'customer': {users_customers_count}")

if users_customers_count > 0:
    print("\nSample Users (Customers):")
    for u in db.query(User).filter(User.role.in_([UserRole.user, UserRole.customer])).limit(5).all():
        print(f"- {u.full_name} ({u.email}) | Role: {u.role} | Company: {u.company_name}")

if customers_count > 0:
    print("\nSample Customers:")
    for c in db.query(Customer).limit(2).all():
        print(f"- {c.display_name} ({c.email}) | Company: {c.company_name}")

db.close()
