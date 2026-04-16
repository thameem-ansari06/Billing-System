from fastapi import APIRouter, HTTPException
from app.database.db import get_db, get_next_id          # Database connection
from app.models.schemas import CustomerCreate    # Puthu schema file
import sqlite3
import time

# Router define panrom (prefix kuduthaa aduthu path-la "/api/customers" poda thevaiyillai)
router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("/")
def get_all_customers():
    conn = get_db()
    customers = conn.execute("SELECT * FROM customers").fetchall()
    conn.close()
    return {"customers": [dict(c) for c in customers]}

@router.post("/")
def create_customer(cust: CustomerCreate):
    conn = get_db()
    c = conn.cursor()
    cust_id = get_next_id("CUST", "customers", "customer_id")
    
    try:
        c.execute('''INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', 
                  (cust_id, cust.customer_type, cust.salutation, cust.first_name, cust.last_name,
                   cust.company_name, cust.display_name, cust.currency, cust.email,
                   cust.phone_work, cust.phone_mobile, cust.gst_treatment, 
                   cust.place_of_supply, cust.pan, cust.tax_preference, cust.payment_terms,
                   cust.billing_attention, cust.billing_country, cust.billing_address_1, cust.billing_address_2,
                   cust.billing_city, cust.billing_state, cust.billing_pincode, cust.billing_phone, cust.billing_fax,
                   cust.shipping_attention, cust.shipping_country, cust.shipping_address_1, cust.shipping_address_2,
                   cust.shipping_city, cust.shipping_state, cust.shipping_pincode, cust.shipping_phone, cust.shipping_fax))
        conn.commit()
        return {"message": "Success", "id": cust_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()