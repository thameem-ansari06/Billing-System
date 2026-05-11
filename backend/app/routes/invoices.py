from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
from datetime import datetime
from app.database.db import get_db, get_next_id
from app.models.orm import Invoice, InvoiceItem, DeliveryTask, ActivityLog
from app.models.schemas import InvoiceCreate, InvoiceRead
from app.utils.invoice_maker import generate_pdf_invoice
# from app.utils.email_bot import send_invoice_mail # Commented out as in original

from app.utils.calculations import calculate_gst_totals
from app.utils.auth import get_current_active_user
from app.models.orm import User, Advance

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.get("/next-number")
def get_next_invoice_number():
    return {"next_number": get_next_id("INV", "invoices", "invoice_number")}

@router.get("/")
def get_all_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from sqlalchemy.orm import joinedload
    if current_user.role in ["admin", "ceo", "accounts"]:
        invoices = db.query(Invoice).options(joinedload(Invoice.items)).order_by(Invoice.id.desc()).all()
    else:
        invoices = db.query(Invoice).options(joinedload(Invoice.items)).filter(Invoice.user_id == current_user.id).order_by(Invoice.id.desc()).all()
    
    # Serialize explicitly so order_id is always present in the JSON
    result = []
    for inv in invoices:
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": inv.customer_name,
            "place_of_supply": inv.place_of_supply,
            "reference_number": inv.reference_number,
            "invoice_date": inv.invoice_date,
            "due_date": inv.due_date,
            "subtotal": inv.subtotal,
            "cgst": inv.cgst,
            "sgst": inv.sgst,
            "igst": inv.igst,
            "grand_total": inv.grand_total,
            "customer_company_name": inv.customer_company_name,
            "customer_gst_no": inv.customer_gst_no,
            "amount_paid": inv.amount_paid,
            "email": inv.email,
            "status": inv.status,
            "order_id": inv.order_id,
            "user_id": inv.user_id,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "is_auto_generated": inv.order_id is not None
        })
    return {"invoices": result}

@router.get("/invoices/{invoice_number:path}", response_model=InvoiceRead)
def get_invoice_by_number(invoice_number: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role in ["admin", "ceo", "accounts"]:
        invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    else:
        invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number, Invoice.user_id == current_user.id).first()
        
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/generate/{invoice_id:path}/")
def generate_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Triggers PDF generation if missing, and returns a static JSON URL.
    Migrated from dynamic streaming to Save-to-Disk model.
    """
    if current_user.role not in ["admin", "ceo", "sales"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Fetch Invoice Data from DB
    db_invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found in database")

    # 2. Path & Filename logic (matching invoice_maker.py)
    safe_filename = invoice_id.replace("/", "_").replace("\\", "_") + ".pdf"
    file_path = os.path.join("static", "invoices", safe_filename)
    file_url = f"/static/invoices/{safe_filename}"

    # 3. Check if file exists, if not generate it
    if not os.path.exists(file_path):
        from app.utils.calculations import calculate_gst_totals
        from app.utils.invoice_maker import generate_pdf_invoice
        
        items_list = [{
            "Item Name": item.item_details,
            "Quantity": item.quantity,
            "Price": item.rate,
            "Amount": item.amount
        } for item in db_invoice.items]

        # Use DB values for consistency, especially for B2B Smart Invoicing
        calc = {
            "subtotal": db_invoice.subtotal,
            "cgst": db_invoice.cgst,
            "sgst": db_invoice.sgst,
            "igst": db_invoice.igst,
            "grand_total": db_invoice.grand_total,
            "settled_amount": db_invoice.settled_amount,
            "amount_paid": db_invoice.amount_paid
        }

        generate_pdf_invoice(
            invoice_id=db_invoice.invoice_number,
            customer_email=db_invoice.email or "N/A",
            items_list=items_list,
            tax_data=calc,
            terms=db_invoice.terms_conditions,
            customer_company_name=db_invoice.customer_company_name,
            customer_gst_no=db_invoice.customer_gst_no
        )

    # 4. Return JSON URL instead of FileResponse
    return {"file_url": file_url}

@router.put("/{invoice_id}/send/")
def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Admin marks invoice as Sent to the customer."""
    if current_user.role not in ["admin", "ceo", "sales"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.status = "Sent"
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Admin sent Invoice #{invoice.invoice_number}",
        category="Finance",
        user_id=current_user.id
    ))
    
    db.commit()
    return {"message": "Invoice marked as Sent", "status": "Sent"}

@router.put("/customer/{invoice_id}/decision/")
def customer_invoice_decision(
    invoice_id: int,
    decision: str, # ACCEPTED or REJECTED
    reason: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Customer accepts or rejects the invoice. Triggers auto-delivery on Accept."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    # Security: Only owner or admin
    if current_user.role != "admin" and invoice.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if decision.upper() == "ACCEPTED":
        invoice.status = "Accepted"
        
        # 🚚 AUTO-DELIVERY HANDSHAKE & CHALLAN GENERATION
        # Fetch customer's full profile for logistics
        customer = db.query(User).filter(User.id == invoice.user_id).first()
        full_address = f"{customer.address_line}, {customer.city}, {customer.state} - {customer.pincode}" if (customer and customer.address_line) else invoice.place_of_supply
        
        # Pull contact from User profile or fallback to a placeholder
        contact_phone = customer.phone if (customer and customer.phone) else "Not Provided"

        # Prepare items for challan PDF
        items_for_challan = [{"Item Name": item.item_details, "Quantity": item.quantity} for item in invoice.items]

        # Generate Challan PDF
        from app.utils.challan_maker import generate_delivery_challan
        challan_url = generate_delivery_challan(
            invoice_id=invoice.invoice_number,
            customer_name=invoice.customer_name,
            customer_address=full_address,
            contact_number=contact_phone,
            items_list=items_for_challan
        )

        invoice.challan_url = challan_url

        new_task = DeliveryTask(
            invoice_id=invoice.id,
            invoice_number=invoice.invoice_number,
            order_reference=str(invoice.order_id) if invoice.order_id else invoice.reference_number,
            customer_name=invoice.customer_name,
            customer_address=full_address,
            contact_number=contact_phone,
            challan_url=challan_url,
            status="Pending Delivery"
        )
        db.add(new_task)
        
    elif decision.upper() == "REJECTED":
        if not reason:
            raise HTTPException(status_code=400, detail="Rejection reason mandatory")
        invoice.status = "Rejected"
        invoice.rejection_reason = reason
    # Log Activity
    db.add(ActivityLog(
        action=f"Customer {decision.capitalize()} Invoice #{invoice.invoice_number}",
        category="Logistics" if decision.upper() == "ACCEPTED" else "Finance",
        user_id=current_user.id
    ))

    db.commit()
    return {"message": f"Invoice {decision.lower()} successfully", "status": invoice.status}

@router.get("/customer/")
def get_customer_specific_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve only Sent, Accepted, or Rejected invoices for the current customer."""
    from sqlalchemy.orm import joinedload
    invoices = db.query(Invoice)\
        .options(joinedload(Invoice.items))\
        .filter(Invoice.user_id == current_user.id)\
        .filter(Invoice.status.in_(["Sent", "Accepted", "Rejected", "Paid"]))\
        .order_by(Invoice.id.desc())\
        .all()
    return {"invoices": invoices}

@router.post("/", response_model=InvoiceRead)
def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "ceo", "sales"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Fetch a fresh number at save time to ensure no race conditions
    gn_invoice_id = get_next_id("INV", "invoices", "invoice_number")
    
    # 🔍 Fetch Customer Account Type for B2B Smart Invoicing
    customer = db.query(User).filter(User.id == (invoice_data.user_id or current_user.id)).first()
    is_enterprise = customer and customer.account_type == 'enterprise'
    
    # Recalculate totals on backend to ensure consistency
    items_dicts = [item.model_dump() for item in invoice_data.items]
    
    if is_enterprise:
        # B2B Force 18% split (9% CGST, 9% SGST) as per user request
        subtotal = sum(item['amount'] for item in items_dicts)
        total_tax = subtotal * 0.18
        calc = {
            "subtotal": round(subtotal, 2),
            "cgst": round(total_tax / 2, 2),
            "sgst": round(total_tax / 2, 2),
            "igst": 0.0,
            "adjustment": invoice_data.adjustment,
            "grand_total": round(subtotal + total_tax + invoice_data.adjustment, 2)
        }
    else:
        # Standard calculation
        calc = calculate_gst_totals(items_dicts, invoice_data.place_of_supply, invoice_data.adjustment)
    
    try:
        db_invoice = Invoice(
            invoice_number=gn_invoice_id,
            user_id=invoice_data.user_id or current_user.id,
            subtotal=calc["subtotal"],
            cgst=calc["cgst"],
            sgst=calc["sgst"],
            igst=calc["igst"],
            grand_total=calc["grand_total"],
            customer_company_name=customer.company_name if customer else None,
            customer_gst_no=customer.gst_no if customer else None,
            email=customer.email if customer else invoice_data.email,
            **invoice_data.model_dump(exclude={"items", "invoice_number", "subtotal", "cgst", "sgst", "igst", "grand_total", "customer_company_name", "customer_gst_no", "email"})
        )
        db.add(db_invoice)
        db.flush()
        
        for item_data in invoice_data.items:
            db_item = InvoiceItem(
                invoice_id=db_invoice.id,
                **item_data.model_dump()
            )
            db.add(db_item)
        
        # 💰 AUTOMATION: Apply Customer Advances (Wallet Settlement)
        from app.utils.wallet import settle_invoice_from_advances
        settle_invoice_from_advances(db, db_invoice)
                
        db.commit()
        db.refresh(db_invoice)

        if db_invoice.status == "Sent":
            generate_pdf_invoice(
                invoice_id=db_invoice.invoice_number,
                customer_email=db_invoice.email or "N/A",
                items_list=[{
                    "Item Name": item.item_details, 
                    "Quantity": item.quantity,
                    "Price": item.rate,
                    "Amount": item.amount
                } for item in db_invoice.items],
                tax_data=calc,
                terms=db_invoice.terms_conditions,
                customer_company_name=db_invoice.customer_company_name,
                customer_gst_no=db_invoice.customer_gst_no
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