from fastapi import APIRouter, HTTPException
from app.database.db import get_db, get_next_id
from app.models.schemas import DeliveryChallanCreate

router = APIRouter(prefix="/api/delivery-challans", tags=["Delivery Challans"])

@router.get("/")
def get_all_challans():
    conn = get_db()
    challans = conn.execute("SELECT * FROM delivery_challans").fetchall()
    
    result = []
    for c in challans:
        c_dict = dict(c)
        items = conn.execute("SELECT * FROM challan_items WHERE challan_id = ?", (c_dict['challan_id'],)).fetchall()
        c_dict['items'] = [dict(i) for i in items]
        result.append(c_dict)
        
    conn.close()
    return {"delivery_challans": result}

@router.post("/")
def create_challan(challan: DeliveryChallanCreate):
    conn = get_db()
    c = conn.cursor()
    challan_id = get_next_id("DC", "delivery_challans", "challan_id")
    
    try:
        c.execute('''INSERT INTO delivery_challans 
                     (challan_id, customer_name, shipping_address, place_of_supply, challan_type, 
                      challan_number, reference_number, challan_date, notes, terms, 
                      subtotal, adjustment, grand_total, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                  (challan_id, challan.customer_name, challan.shipping_address, challan.place_of_supply, 
                   challan.challan_type, challan.challan_number, challan.reference_number, challan.challan_date, 
                   challan.notes, challan.terms, challan.subtotal, challan.adjustment, 
                   challan.grand_total, challan.status))
        
        for item in challan.items:
            c.execute('''INSERT INTO challan_items 
                         (challan_id, item_details, quantity, rate, tax_type, amount)
                         VALUES (?, ?, ?, ?, ?, ?)''',
                      (challan_id, item.item_details, item.quantity, item.rate, item.tax_type, item.amount))
            
        conn.commit()
        return {"message": "Success", "id": challan_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
