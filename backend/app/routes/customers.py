from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db, get_next_id
from app.models.orm import Customer, ContactPerson, User
from app.models.enums import UserRole
from app.models.schemas import CustomerCreate, CustomerRead

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/")
def get_all_customers(db: Session = Depends(get_db)):
    # 1. Fetch CRM customers
    crm_customers = db.query(Customer).all()
    
    # 2. Fetch User-based customers (who signed up)
    user_customers = db.query(User).filter(User.role.in_([UserRole.user, UserRole.customer])).all()
    
    # 3. Map User records to the CRM structure expected by the frontend
    mapped_users = []
    for u in user_customers:
        mapped_users.append({
            "id": f"U-{u.id}", 
            "customer_id": f"REG-{u.id:03}", # registered user ID format
            "display_name": u.full_name or u.username,
            "company_name": u.company_name,
            "email": u.email,
            "phone_mobile": u.phone,
            "customer_type": "Business" if u.account_type == 'enterprise' else "Individual",
            "gst_treatment": "Registered" if u.gst_no else "Unregistered",
            "place_of_supply": "N/A",
            "billing_address_1": u.business_address or u.address_line,
            "billing_city": u.city,
            "billing_state": u.state,
            "billing_pincode": u.pincode,
            "pan": u.pan_no
        })
    
    # Combine both lists
    all_customers = list(crm_customers) + mapped_users
    return {"customers": all_customers}


@router.post("/", response_model=CustomerRead)
def create_customer(customer_data: CustomerCreate, db: Session = Depends(get_db)):
    # 1. Generate ID
    cust_id = get_next_id("CUST", "customers", "customer_id")
    
    try:
        # 2. Extract contact persons from data
        contact_persons_data = customer_data.contact_persons
        
        # 3. Create Customer object (excluding relationship field initially)
        db_customer = Customer(
            customer_id=cust_id,
            **customer_data.model_dump(exclude={"contact_persons"})
        )
        
        db.add(db_customer)
        db.flush() # Flush to get db_customer.id
        
        # 4. Create ContactPerson objects
        for cp_data in contact_persons_data:
            db_contact = ContactPerson(
                customer_id=db_customer.id,
                **cp_data.model_dump()
            )
            db.add(db_contact)
        
        db.commit()
        db.refresh(db_customer)
        return db_customer
        
    except Exception as e:
        db.rollback()
        print(f"❌ PostgreSQL Insert Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))