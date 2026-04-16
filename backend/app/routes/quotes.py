from fastapi import APIRouter, HTTPException
from app.database.db import get_db, get_next_id
from app.models.schemas import QuoteCreate
import time

router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

@router.get("/")
def get_all_quotes():
    conn = get_db()
    quotes = conn.execute("SELECT * FROM quotes").fetchall()
    
    result = []
    for q in quotes:
        quote_dict = dict(q)
        items = conn.execute("SELECT * FROM quote_items WHERE quote_id = ?", (quote_dict['quote_id'],)).fetchall()
        quote_dict['items'] = [dict(i) for i in items]
        result.append(quote_dict)
        
    conn.close()
    return {"quotes": result}

@router.post("/")
def create_quote(quote: QuoteCreate):
    conn = get_db()
    c = conn.cursor()
    quote_id = get_next_id("QUOTE", "quotes", "quote_id")
    
    try:
        c.execute('''INSERT INTO quotes 
                     (quote_id, customer_name, place_of_supply, quote_number, reference_number, quote_date, expiry_date, 
                      subtotal, cgst, sgst, igst, grand_total, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                  (quote_id, quote.customer_name, quote.place_of_supply, quote.quote_number, 
                   quote.reference_number, quote.quote_date, quote.expiry_date, quote.subtotal, 
                   quote.cgst, quote.sgst, quote.igst, quote.grand_total, quote.status))
        
        for item in quote.items:
            c.execute('''INSERT INTO quote_items 
                         (quote_id, item_details, quantity, rate, discount_amount, discount_type, tax_type, amount)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                      (quote_id, item.item_details, item.quantity, item.rate, item.discount_amount, 
                       item.discount_type, item.tax_type, item.amount))
            
        conn.commit()
        return {"message": "Success", "id": quote_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
