from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db, get_next_id
from app.models.orm import Customer, ContactPerson
from app.models.schemas import CustomerCreate, CustomerRead

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("/")
def get_all_customers(db: Session = Depends(get_db)):
    customers = db.query(Customer).all()
    return {"customers": customers}


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