from fastapi import APIRouter, HTTPException
from app.database.db import get_db, get_next_id
from app.models.schemas import InvoiceRequest
from app.utils.invoice_maker import generate_pdf_invoice
from app.utils.email_bot import send_invoice_mail

router = APIRouter(prefix="/api", tags=["Invoices"])

@router.post("/generate_invoice")
def generate_invoice(req: InvoiceRequest):
    # ... unga existing invoice generation logic ...
    # (subtotal, taxable_value, cgst, sgst calculation)
    # pdf_path, _ = generate_pdf_invoice(...)
    return {"message": "Invoice Generated!"}

@router.get("/dashboard")
def get_dashboard_data():
    conn = get_db()
    invoices = conn.execute("SELECT * FROM invoices ORDER BY invoice_id DESC").fetchall()
    conn.close()
    
    total_revenue = sum(inv['grand_total'] for inv in invoices)
    total_pending = sum(inv['grand_total'] for inv in invoices if 'Awaiting' in inv['status'])
    
    return {
        "total_invoices": len(invoices),
        "total_revenue": total_revenue,
        "total_pending": total_pending,
        "recent": [dict(inv) for inv in invoices[:5]] 
    }