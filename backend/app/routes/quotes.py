from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db, get_next_id
from app.models.orm import Quote, QuoteItem, User, Order, OrderStatus, Advance
from app.models.schemas import QuoteCreate, QuoteRead
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/quotes", tags=["Quotes"])

@router.get("/notifications/count")
def get_notification_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Returns badge counts for the Admin sidebar."""
    if current_user.role not in ["admin", "ceo"]:
        return {"pending_quotes": 0, "new_invoices": 0, "total": 0}
    
    pending_quotes = db.query(Quote).filter(Quote.status == "pending_approval").count()
    
    from app.models.orm import Invoice
    # Auto-generated invoices = invoices that were created from an order (have order_id)
    new_auto_invoices = db.query(Invoice).filter(
        Invoice.order_id != None,
        Invoice.status == "Draft"
    ).count()
    
    return {
        "pending_quotes": pending_quotes,
        "new_invoices": new_auto_invoices,
        "total": pending_quotes + new_auto_invoices
    }

@router.get("/")
def get_all_quotes(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from sqlalchemy.orm import joinedload
    if current_user.role in ["admin", "ceo"]:
        quotes = db.query(Quote).options(joinedload(Quote.items)).order_by(Quote.created_at.desc()).all()
    else:
        quotes = db.query(Quote).options(joinedload(Quote.items)).filter(Quote.user_id == current_user.id).order_by(Quote.created_at.desc()).all()
    
    # Serialize explicitly so items[] is always present in the JSON
    result = []
    for q in quotes:
        result.append({
            "id": q.id,
            "quote_number": q.quote_number,
            "customer_name": q.customer_name,
            "place_of_supply": q.place_of_supply,
            "reference_number": q.reference_number,
            "quote_date": q.quote_date,
            "expiry_date": q.expiry_date,
            "subtotal": q.subtotal,
            "cgst": q.cgst,
            "sgst": q.sgst,
            "igst": q.igst,
            "grand_total": q.grand_total,
            "status": q.status,
            "order_id": q.order_id,
            "user_id": q.user_id,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "items": [
                {
                    "id": item.id,
                    "item_details": item.item_details,
                    "quantity": item.quantity,
                    "rate": item.rate,
                    "amount": item.amount
                }
                for item in q.items
            ],
            "is_bulk_request": len(q.items) > 5
        })
    
    return {"quotes": result}


@router.get("/user", response_model=List[QuoteRead])
def get_user_quotes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import joinedload
    return db.query(Quote).options(joinedload(Quote.items))\
             .filter(Quote.user_id == current_user.id)\
             .filter(Quote.status != "Draft")\
             .order_by(Quote.created_at.desc()).all()

@router.get("/{quote_id}/detail")
def get_quote_detail(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Admin/CEO/Sales can view full quote details with all line items."""
    from sqlalchemy.orm import joinedload
    if current_user.role in ["admin", "ceo", "sales"]:
        quote = db.query(Quote).options(joinedload(Quote.items)).filter(Quote.id == quote_id).first()
    else:
        quote = db.query(Quote).options(joinedload(Quote.items)).filter(
            Quote.id == quote_id,
            Quote.user_id == current_user.id
        ).first()

    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    return {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "customer_name": quote.customer_name,
        "place_of_supply": quote.place_of_supply,
        "reference_number": quote.reference_number,
        "quote_date": quote.quote_date,
        "expiry_date": quote.expiry_date,
        "subtotal": quote.subtotal,
        "cgst": quote.cgst,
        "sgst": quote.sgst,
        "igst": quote.igst,
        "grand_total": quote.grand_total,
        "status": quote.status,
        "order_id": quote.order_id,
        "user_id": quote.user_id,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
        "is_bulk_request": len(quote.items) > 5,
        "items": [
            {
                "id": item.id,
                "item_details": item.item_details,
                "quantity": item.quantity,
                "rate": item.rate,
                "discount_amount": item.discount_amount,
                "tax_type": item.tax_type,
                "amount": item.amount,
            }
            for item in quote.items
        ],
    }

@router.get("/{quote_id}/pdf")
def get_quote_pdf(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate and serve a PDF bill for a quote (Admin/CEO/Sales only)."""
    from fastapi.responses import FileResponse
    from sqlalchemy.orm import joinedload
    from app.utils.invoice_maker import generate_pdf_invoice
    import os

    if current_user.role not in ["admin", "ceo", "sales"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    quote = db.query(Quote).options(joinedload(Quote.items)).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    items_list = [
        {
            "Item Name": item.item_details,
            "Quantity": item.quantity,
            "Price": item.rate,
            "Amount": item.amount,
        }
        for item in quote.items
    ]

    tax_data = {
        "cgst": quote.cgst or 0,
        "sgst": quote.sgst or 0,
        "igst": quote.igst or 0,
        "grand_total": quote.grand_total or 0,
    }

    # Path & Filename logic (matching invoice_maker.py)
    safe_filename = quote.quote_number.replace("/", "_").replace("\\", "_") + ".pdf"
    file_path = os.path.join("static", "invoices", safe_filename)
    file_url = f"/static/invoices/{safe_filename}"

    # Check if file exists, if not generate it
    if not os.path.exists(file_path):
        from app.utils.invoice_maker import generate_pdf_invoice
        generate_pdf_invoice(
            invoice_id=quote.quote_number,
            customer_email=quote.email or "N/A",
            items_list=items_list,
            tax_data=tax_data,
            terms="Quote valid until expiry date. Subject to admin approval.",
            customer_company_name=quote.customer_company_name,
            customer_gst_no=quote.customer_gst_no
        )

    return {"file_url": file_url}



@router.put("/{quote_id}/status")
def update_quote_status(
    quote_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 1. User Role Check
    if current_user.role in ["admin", "ceo"]:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
    else:
        quote = db.query(Quote).filter(Quote.id == quote_id, Quote.user_id == current_user.id).first()
        
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # 2. Database Sync - Use Title Case if needed, or keep it consistent with DB
    # If your DB has "Quoted", "Approved", use that exact string.
    new_status = status.capitalize() # Converts 'approved' -> 'Approved'
    quote.status = new_status
    
    order_updated = False
    order_id_for_log = None

    # 3. Order Status Sync Logic
    if new_status == 'Approved' and quote.order_id:
        order = db.query(Order).filter(Order.id == quote.order_id).first()
        if order:
            # FIX: Use the exact Enum member name from your orm.py
            # Since your DB has 'Quoted', moving it to Quoted state
            order.status = OrderStatus.Quoted 
            order_id_for_log = order.id
            order_updated = True
            
    try:
        db.commit()
        if order_id_for_log:
            print(f"✅ Order {order_id_for_log} status updated successfully")
            
        return {
            "message": f"Quote {new_status} successfully", 
            "status": quote.status,
            "order_synced": order_updated
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Commit Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Database Error: {str(e)}")

@router.put("/{quote_id}/approve")
def approve_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import joinedload
    from app.models.orm import Invoice, InvoiceItem, ActivityLog
    from app.database.db import get_next_id
    from datetime import datetime, timedelta
    from app.utils.invoice_maker import generate_pdf_invoice
    from app.utils.calculations import calculate_gst_totals

    try:
        quote = db.query(Quote).options(joinedload(Quote.items)).filter(Quote.id == quote_id, Quote.user_id == current_user.id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        quote.status = "Approved"

        # Fetch customer email for the invoice
        customer = db.query(User).filter(User.id == quote.user_id).first()
        customer_email = customer.email if customer else "customer@example.com"

        # Auto-Invoice Generation
        invoice_number = get_next_id("INV-B", "invoices", "invoice_number")
        new_invoice = Invoice(
            invoice_number=invoice_number,
            order_id=quote.order_id,
            user_id=quote.user_id,
            customer_name=quote.customer_name,
            email=customer_email,
            place_of_supply=quote.place_of_supply,
            invoice_date=datetime.now().strftime("%Y-%m-%d"),
            due_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            subtotal=quote.subtotal,
            cgst=quote.cgst,
            sgst=quote.sgst,
            igst=quote.igst,
            grand_total=quote.grand_total,
            customer_company_name=customer.company_name if customer else None,
            customer_gst_no=customer.gst_no if customer else None,
            status="Sent" # Automatically 'Sent' as requested
        )
        db.add(new_invoice)
        db.flush()

        for item in quote.items:
            inv_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_details=item.item_details,
                quantity=item.quantity,
                rate=item.rate,
                discount_amount=item.discount_amount,
                discount_type=item.discount_type,
                tax_type=item.tax_type,
                amount=item.amount
            )
            db.add(inv_item)

        # 💰 AUTOMATION: Apply Customer Advances (Wallet Settlement)
        from app.utils.wallet import settle_invoice_from_advances
        settle_invoice_from_advances(db, new_invoice)

        # Flag associated order
        if quote.order_id:
            order = db.query(Order).filter(Order.id == quote.order_id).first()
            if order:
                order.origin = "quote_derived"
                order.status = OrderStatus.Invoiced

        db.commit()

        # Trigger PDF Generation immediately for the 'Sent' invoice
        try:
            items_for_pdf = [{
                "Item Name": item.item_details,
                "Quantity": item.quantity,
                "Price": item.rate,
                "Amount": item.amount
            } for item in quote.items]

            tax_data = {
                "cgst": quote.cgst,
                "sgst": quote.sgst,
                "igst": quote.igst,
                "grand_total": quote.grand_total,
                "subtotal": quote.subtotal,
                "settled_amount": new_invoice.settled_amount,
                "amount_paid": new_invoice.amount_paid
            }

            generate_pdf_invoice(
                invoice_id=invoice_number,
                customer_email=customer_email or "N/A",
                items_list=items_for_pdf,
                tax_data=tax_data,
                terms="Bulk Order Invoice generated from approved quote. Please make payment to initiate fulfillment.",
                customer_company_name=new_invoice.customer_company_name,
                customer_gst_no=new_invoice.customer_gst_no
            )
            
            # Log the automated activity
            db.add(ActivityLog(
                action=f"Automated: Generated & Sent Invoice #{invoice_number} from Quote #{quote.quote_number}",
                category="Finance",
                user_id=current_user.id
            ))
            db.commit()
        except Exception as pdf_err:
            print(f"⚠️ PDF generation or logging failed: {str(pdf_err)}")
            # Don't fail the whole transaction if just PDF/Log fails

        return {"message": "Quote approved, invoice generated and sent to your portal successfully", "status": quote.status, "invoice_number": invoice_number}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to process quote approval: {str(e)}")

@router.post("/", response_model=QuoteRead)
def create_quote(
    quote_data: QuoteCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "ceo", "sales"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Generate Quote ID
    quote_id = get_next_id("QUOTE", "quotes", "quote_number")
    
    try:
        # Sanitize the payload: remove 'user_id' to avoid multiple values conflict
        quote_dict = quote_data.model_dump(exclude={"items", "quote_number"})
        customer_user_id = quote_dict.pop("user_id", None)

        # Ensure the quote belongs to the targeted customer, not the admin creating it
        assigned_user_id = customer_user_id if customer_user_id else current_user.id
        assigned_customer = db.query(User).filter(User.id == assigned_user_id).first()

        # Create Quote Header
        db_quote = Quote(
            quote_number=quote_id,
            user_id=assigned_user_id,
            customer_company_name=assigned_customer.company_name if assigned_customer else None,
            customer_gst_no=assigned_customer.gst_no if assigned_customer else None,
            email=assigned_customer.email if assigned_customer else None,
            **quote_dict
        )
        db.add(db_quote)
        db.flush() # Get the quote.id
        
        # Create Quote Items
        for item_data in quote_data.items:
            db_item = QuoteItem(
                quote_id=db_quote.id,
                **item_data.model_dump()
            )
            db.add(db_item)
            
        db.commit()
        db.refresh(db_quote)
        
        # Explicitly load items for the response model
        from sqlalchemy.orm import joinedload
        return db.query(Quote).options(joinedload(Quote.items)).filter(Quote.id == db_quote.id).first()
        
    except Exception as e:
        db.rollback()
        print(f"❌ Quote Creation Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Database Error: {str(e)}")

