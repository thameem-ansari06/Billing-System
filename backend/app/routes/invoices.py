from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List
import os
from datetime import datetime
from app.database.db import get_db, get_next_id
from app.models.orm import Invoice, InvoiceItem, DeliveryTask, ActivityLog, DistrictZoneMapping, Order
from app.models.schemas import InvoiceCreate, InvoiceRead
from app.utils.invoice_maker import generate_pdf_invoice
# from app.utils.email_bot import send_invoice_mail # Commented out as in original

from app.utils.calculations import calculate_gst_totals
from app.utils.auth import get_current_active_user
from app.models.orm import User, Advance
from app.models.enums import OrderStatus, DeliveryStatus

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

def generate_invoice_pdf_internal(invoice_number: str, db: Session):
    """
    Helper function to generate PDF invoice file and save it to the static/invoices directory.
    """
    db_invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found.")

    safe_filename = invoice_number.replace("/", "_").replace("\\", "_") + ".pdf"
    output_dir = os.path.join(os.getcwd(), "static", "invoices")
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, safe_filename)

    from app.utils.calculations import calculate_gst_totals
    from app.utils.invoice_maker import generate_pdf_invoice
    
    items_list = [{
        "Item Name": item.item_details,
        "Quantity": item.quantity,
        "Price": item.rate,
        "Amount": item.amount
    } for item in db_invoice.items]

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

@router.get("/view/{invoice_number:path}")
def view_invoice_pdf(
    invoice_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Serves the invoice PDF document stream. If the physical file is missing but the entity
    exists in the database, it self-heals by regenerating the missing PDF.
    """
    invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if current_user.role not in ["admin", "ceo", "sales"] and invoice.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    safe_filename = invoice_number.replace("/", "_").replace("\\", "_") + ".pdf"
    file_path = os.path.join(os.getcwd(), "static", "invoices", safe_filename)

    if not os.path.exists(file_path):
        # Self-healing hook: Trigger the generator pipeline dynamically to recreate the missing file asset
        try:
            generate_invoice_pdf_internal(invoice_number, db)
        except Exception as e:
            print(f"[PDF SELF-HEALING GENERATION ERROR] {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

    return FileResponse(file_path, media_type="application/pdf", filename=safe_filename)

@router.post("/generate/{invoice_id:path}/")
def generate_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Triggers PDF generation if missing, and returns a static JSON URL.
    Migrated from dynamic streaming to Save-to-Disk model with robust guardrails.
    """
    if current_user.role not in ["admin", "ceo", "sales"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Fetch Invoice Data from DB with Validation Guardrail
    db_invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found.")

    safe_filename = invoice_id.replace("/", "_").replace("\\", "_") + ".pdf"
    output_dir = os.path.join(os.getcwd(), "static", "invoices")
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, safe_filename)
    file_url = f"/static/invoices/{safe_filename}"

    # Check if file exists, if not generate it safely
    if not os.path.exists(file_path):
        try:
            generate_invoice_pdf_internal(invoice_id, db)
        except Exception as e:
            print(f"[PDF GENERATION ERROR] {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

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
        full_address = f"{customer.address_line}, {customer.district}, {customer.state} - {customer.pincode}" if (customer and customer.address_line) else invoice.place_of_supply
        
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

        # Resolve parent order_id to satisfy strict NOT NULL constraint on DeliveryTask
        resolved_order_id = invoice.order_id
        if not resolved_order_id:
            # Query orders table using user_id fallback
            fallback_order = db.query(Order).filter(
                Order.user_id == invoice.user_id,
                Order.is_deleted == False
            ).order_by(Order.created_at.desc()).first()
            if fallback_order:
                resolved_order_id = fallback_order.id
                invoice.order_id = resolved_order_id
                db.flush()
                
        if not resolved_order_id:
            # Spawn a lightweight shell order fallback to satisfy NOT NULL constraint
            shell_order = Order(
                user_id=invoice.user_id,
                status=OrderStatus.Placed,
                total_amount=invoice.grand_total,
                origin="invoice_fallback"
            )
            db.add(shell_order)
            db.flush() # Populate shell_order.id
            resolved_order_id = shell_order.id
            invoice.order_id = resolved_order_id
            db.flush()

        # Populate customer_district on invoice if missing
        if customer and not invoice.customer_district:
            invoice.customer_district = customer.district
            db.flush()

        # Resolve District Zone mapping
        customer_district_var = invoice.customer_district.strip().upper() if invoice.customer_district else "COIMBATORE"

        # Fetch zone code assignment mapping based on sanitized customer district name text strings
        zone_lookup_query = text("""
            SELECT z.id, UPPER(TRIM(z.zone_code)) 
            FROM zone_registry z
            JOIN district_zone_mapping m ON z.id = m.zone_id
            WHERE UPPER(TRIM(m.district_name)) = UPPER(TRIM(:customer_district)) LIMIT 1;
        """)
        result = db.execute(zone_lookup_query, {"customer_district": customer_district_var}).first()
        
        if result:
            resolved_zone_id = result[0]
            resolved_zone = result[1]
        else:
            # Fallback to ZONE_2
            fallback_query = text("SELECT id, UPPER(TRIM(zone_code)) FROM zone_registry WHERE UPPER(TRIM(zone_code)) = 'ZONE_2' LIMIT 1;")
            fb_res = db.execute(fallback_query).first()
            if fb_res:
                resolved_zone_id = fb_res[0]
                resolved_zone = fb_res[1]
            else:
                resolved_zone_id = None
                resolved_zone = "ZONE_2"

        new_task = DeliveryTask(
            order_id=resolved_order_id,
            invoice_id=invoice.id,
            invoice_number=invoice.invoice_number,
            order_reference=str(resolved_order_id),
            customer_name=invoice.customer_name,
            customer_address=full_address,
            customer_district=invoice.customer_district.strip().upper() if invoice.customer_district else "COIMBATORE",
            zone_id=resolved_zone_id,
            assignment_status_or_zone=resolved_zone,
            contact_number=contact_phone,
            challan_url=challan_url,
            status=DeliveryStatus.PENDING,
            timestamp_logs={DeliveryStatus.PENDING.value: datetime.now().isoformat()}
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