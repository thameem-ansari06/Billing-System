from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
from app.database.db import get_db, get_next_id
from app.models.orm import Invoice, InvoiceItem
from app.models.schemas import InvoiceCreate, InvoiceRead
from app.utils.invoice_maker import generate_pdf_invoice
# from app.utils.email_bot import send_invoice_mail # Commented out as in original

from app.utils.calculations import calculate_gst_totals

router = APIRouter(prefix="/api", tags=["Invoices"])

@router.get("/invoices/next-number")
def get_next_invoice_number():
    return {"next_number": get_next_id("INV", "invoices", "invoice_number")}

@router.get("/invoices/")
def get_all_invoices(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).order_by(Invoice.id.desc()).all()
    return {"invoices": invoices}

@router.get("/invoices/{invoice_number:path}", response_model=InvoiceRead)
def get_invoice_by_number(invoice_number: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: str):
    # 1. Database-la irukra ID-la slashes-ah underscores-ah mathunga
    # Example: 'INV/2026/001' -> 'INV_2026_001.pdf'
    safe_filename = invoice_id.replace("/", "_") + ".pdf"
    file_path = f"data/invoices/{safe_filename}"

    # 2. File irukkaa nu check pannunga
    if not os.path.exists(file_path):
        print(f"❌ File not found at: {file_path}") # Debugging-ku ithu help aagum
        raise HTTPException(status_code=404, detail="Invoice PDF not found on server")

    return FileResponse(file_path, media_type='application/pdf', filename=safe_filename)

@router.post("/invoices/", response_model=InvoiceRead)
def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db)):
    # Fetch a fresh number at save time to ensure no race conditions
    gn_invoice_id = get_next_id("INV", "invoices", "invoice_number")
    
    # Recalculate totals on backend to ensure consistency
    items_dicts = [item.model_dump() for item in invoice_data.items]
    # We ignore the grand_total sent from frontend and recalculate
    calc = calculate_gst_totals(items_dicts, invoice_data.place_of_supply, invoice_data.adjustment)
    
    try:
        db_invoice = Invoice(
            invoice_number=gn_invoice_id,
            subtotal=calc["subtotal"],
            cgst=calc["cgst"],
            sgst=calc["sgst"],
            igst=calc["igst"],
            grand_total=calc["grand_total"],
            **invoice_data.model_dump(exclude={"items", "invoice_number", "subtotal", "cgst", "sgst", "igst", "grand_total"})
        )
        db.add(db_invoice)
        db.flush()
        
        for item_data in invoice_data.items:
            db_item = InvoiceItem(
                invoice_id=db_invoice.id,
                **item_data.model_dump()
            )
            db.add(db_item)
            
        db.commit()
        db.refresh(db_invoice)

        if db_invoice.status == "Sent":
            generate_pdf_invoice(
                invoice_id=db_invoice.invoice_number,
                customer_email=db_invoice.email or "customer@example.com",
                items_list=[{
                    "Item Name": item.item_details, 
                    "Quantity": item.quantity,
                    "Price": item.rate,
                    "Amount": item.amount
                } for item in db_invoice.items],
                tax_data=calc,
                terms=db_invoice.terms_conditions
            )

        return db_invoice
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).all()
    
    total_revenue = sum(inv.grand_total for inv in invoices if inv.grand_total)
    total_pending = sum(inv.grand_total for inv in invoices if inv.status and 'Awaiting' in inv.status)
    
    return {
        "total_invoices": len(invoices),
        "total_revenue": total_revenue,
        "total_pending": total_pending,
        "recent": invoices[:5] # SQLAlchemy objects will be serialized by FastAPI
    }