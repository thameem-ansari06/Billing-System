import os
import hmac
import hashlib
import json
import traceback
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
import razorpay

from typing import List, Optional
from fastapi.responses import FileResponse
from app.database.db import get_db
from app.models.orm import Invoice, Payment, User, DeliveryTask, ActivityLog, Advance
from app.models.enums import PaymentMethod, PaymentStatus, DeliveryStatus
from app.models.schemas import (
    PaymentCreate, PaymentVerify, AdvanceCreate, 
    PaymentRecordRequest, PaymentRead, PaymentStats, PaymentResponse
)
from app.utils.auth import get_current_active_user, RoleChecker
from app.utils.websocket_manager import manager
from app.utils.challan_maker import generate_delivery_challan
import random
from datetime import datetime, timedelta

# PDF Generation imports
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

router = APIRouter(prefix="/payments", tags=["Payments"])
allow_admin = RoleChecker(["admin", "ceo"])

@router.post("/advance")
def record_advance_payment(data: AdvanceCreate, db: Session = Depends(get_db), admin: User = Depends(allow_admin)):
    new_advance = Advance(
        customer_id=data.customer_id,
        amount=data.amount,
        payment_mode=data.payment_mode,
        date=data.date or datetime.now().strftime("%Y-%m-%d")
    )
    db.add(new_advance)
    db.commit()
    return {"message": "Advance recorded successfully", "id": new_advance.id}

@router.post("/record", response_model=PaymentResponse)
def record_payment(data: PaymentRecordRequest, db: Session = Depends(get_db), admin: User = Depends(allow_admin)):
    """Record a payment with automated user mapping and atomic transaction."""
    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    user_id = invoice.user_id
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer associated with this invoice not found")

    balance_due = invoice.grand_total - invoice.amount_paid
    is_overpayment = False
    surplus = 0.0
    amount_to_invoice = data.amount

    try:
        with db.begin_nested():
            if data.payment_method == PaymentMethod.Wallet:
                if user.wallet_balance < data.amount:
                    raise HTTPException(status_code=400, detail="Insufficient wallet balance")
                user.wallet_balance -= data.amount
            
            if data.amount > balance_due:
                is_overpayment = True
                surplus = data.amount - balance_due
                amount_to_invoice = balance_due
                user.wallet_balance += surplus
                db.add(ActivityLog(
                    action=f"Wallet Credit of ₹{surplus} applied for #{invoice.invoice_number} due to overpayment",
                    category="Finance",
                    user_id=admin.id
                ))

            new_payment = Payment(
                invoice_id=invoice.id,
                invoice_number=invoice.invoice_number,
                user_id=user.id,
                amount=data.amount,
                payment_method=data.payment_method,
                status=PaymentStatus.SUCCESS,
                transaction_id=data.transaction_id,
                is_overpayment=is_overpayment,
                payment_date=datetime.strptime(data.date, "%Y-%m-%d") if data.date else datetime.now()
            )
            db.add(new_payment)

            invoice.amount_paid += amount_to_invoice
            if invoice.amount_paid >= invoice.grand_total:
                invoice.payment_status = "Paid"
                invoice.status = "Paid"
            elif invoice.amount_paid > 0:
                invoice.payment_status = "Partially Paid"
            
            db.add(ActivityLog(
                action=f"Payment of ₹{data.amount} recorded for #{invoice.invoice_number} via {data.payment_method}",
                category="Finance",
                user_id=admin.id
            ))
            
            db.commit()
            return {
                "message": "Payment recorded successfully",
                "payment_id": new_payment.id,
                "invoice_status": invoice.payment_status,
                "amount_to_invoice": amount_to_invoice,
                "surplus_to_wallet": surplus,
                "new_wallet_balance": user.wallet_balance,
                "customer_name": user.full_name or "Walk-in/Direct",
                "invoice_number": invoice.invoice_number
            }
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{payment_id}/void")
def void_payment(payment_id: int, db: Session = Depends(get_db), admin: User = Depends(allow_admin)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status == PaymentStatus.VOIDED:
        raise HTTPException(status_code=400, detail="Payment is already voided")

    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
    user = db.query(User).filter(User.id == payment.user_id).first()

    try:
        with db.begin_nested():
            if invoice:
                invoice.amount_paid -= payment.amount 
                if invoice.amount_paid < 0: invoice.amount_paid = 0
                if invoice.amount_paid <= 0:
                    invoice.payment_status = "Unpaid"
                    invoice.status = "Approved"
                else:
                    invoice.payment_status = "Partially Paid"
            
            if payment.payment_method == PaymentMethod.Wallet:
                user.wallet_balance += payment.amount

            payment.status = PaymentStatus.VOIDED
            db.add(ActivityLog(
                action=f"Payment ID {payment.id} was VOIDED",
                category="Finance",
                user_id=admin.id
            ))
        db.commit()
        return {"message": "Payment voided successfully"}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

@router.get("/stats", response_model=PaymentStats)
def get_payment_stats(db: Session = Depends(get_db)):
    try:
        total_billed = db.query(func.sum(Invoice.grand_total)).scalar() or 0.0
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        received_today = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_date >= today_start,
            Payment.status == PaymentStatus.SUCCESS
        ).scalar() or 0.0

        received_mtd = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_date >= month_start,
            Payment.status == PaymentStatus.SUCCESS
        ).scalar() or 0.0

        invoiced_today = db.query(func.sum(Invoice.grand_total)).filter(
            Invoice.created_at >= today_start
        ).scalar() or 0.0
        
        velocity = (received_today / invoiced_today * 100) if invoiced_today > 0 else 0.0
        total_pending = total_billed - (db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.SUCCESS).scalar() or 0.0)

        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        total_last_month = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_date >= last_month_start,
            Payment.payment_date < month_start,
            Payment.status == PaymentStatus.SUCCESS
        ).scalar() or 0.0
        
        trend = ((received_mtd - total_last_month) / total_last_month * 100) if total_last_month > 0 else 0.0

        methods = db.query(Payment.payment_method, func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.SUCCESS
        ).group_by(Payment.payment_method).all()
        
        method_breakdown = {m[0].value if m[0] else "ONLINE": float(m[1] or 0) for m in methods}
        if not method_breakdown: method_breakdown = {"ONLINE": 0.0}

        return {
            "total_billed": total_billed,
            "total_received": received_mtd,
            "total_pending": max(total_pending, 0.0),
            "received_today": received_today,
            "collection_velocity": min(round(velocity, 2), 100.0),
            "trend_month_vs_last": round(trend, 2),
            "method_breakdown": method_breakdown
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drilldown/{category}")
def get_drilldown_details(category: str, db: Session = Depends(get_db)):
    """Granular analytics drill-down with identity fallbacks and detailed error logging."""
    try:
        now = datetime.now()
        today_date = now.date()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        if category == "today":
            # Successful payments today
            payments = db.query(
                Payment, 
                func.coalesce(User.full_name, 'Walk-in/Direct').label('customer_name')
            ).outerjoin(User, Payment.user_id == User.id).filter(
                cast(Payment.payment_date, Date) == today_date,
                Payment.status == PaymentStatus.SUCCESS
            ).all()
            
            return [{
                "customer_name": p.customer_name,
                "amount": p.Payment.amount,
                "method": p.Payment.payment_method.value if p.Payment.payment_method else "ONLINE",
                "time": p.Payment.payment_date.strftime("%H:%M %p"),
                "invoice": p.Payment.invoice_number
            } for p in payments]

        elif category == "pending":
            # Invoices where amount_paid < grand_total and not voided
            invoices = db.query(
                Invoice, 
                func.coalesce(User.full_name, 'Walk-in/Direct').label('customer_name')
            ).outerjoin(User, Invoice.user_id == User.id).filter(
                Invoice.amount_paid < Invoice.grand_total,
                Invoice.status != "VOIDED",
                Invoice.status != "Voided"
            ).order_by((Invoice.grand_total - Invoice.amount_paid).desc()).all()
            
            return [{
                "id": inv.Invoice.id,
                "invoice_number": inv.Invoice.invoice_number,
                "customer_name": inv.customer_name,
                "total_amount": inv.Invoice.grand_total,
                "amount_paid": inv.Invoice.amount_paid,
                "amount_due": inv.Invoice.grand_total - inv.Invoice.amount_paid,
                "due_date": inv.Invoice.due_date if inv.Invoice.due_date else "N/A"
            } for inv in invoices]

        elif category == "mtd":
            # Successful payments this month
            payments = db.query(
                Payment, 
                func.coalesce(User.full_name, 'Walk-in/Direct').label('customer_name')
            ).outerjoin(User, Payment.user_id == User.id).filter(
                Payment.payment_date >= month_start,
                Payment.status == PaymentStatus.SUCCESS
            ).all()
            
            return [{
                "customer_name": p.customer_name,
                "amount": p.Payment.amount,
                "date": p.Payment.payment_date.strftime("%d %b"),
                "method": p.Payment.payment_method.value if p.Payment.payment_method else "ONLINE"
            } for p in payments]

        return []
    except Exception as e:
        # Crucial for debugging: log the full traceback to terminal
        print("CRITICAL: DRILLDOWN ENDPOINT CRASHED")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/ledger", response_model=List[PaymentRead])
def get_payment_ledger(
    customer_name: Optional[str] = None,
    payment_method: Optional[PaymentMethod] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(allow_admin)
):
    query = db.query(
        Payment, 
        func.coalesce(User.full_name, 'Walk-in/Direct').label('customer_name')
    ).outerjoin(User, Payment.user_id == User.id)
    
    if customer_name:
        query = query.filter(User.full_name.ilike(f"%{customer_name}%"))
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)
    if start_date:
        query = query.filter(Payment.payment_date >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(Payment.payment_date <= datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
        
    results = query.order_by(Payment.payment_date.desc()).all()
    ledger_entries = []
    for payment, c_name in results:
        entry = PaymentRead.model_validate(payment)
        entry.customer_name = c_name
        ledger_entries.append(entry)
    return ledger_entries

@router.get("/{payment_id}/receipt")
def get_payment_receipt(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment: raise HTTPException(status_code=404, detail="Payment not found")
    save_folder = os.path.join("static", "receipts")
    os.makedirs(save_folder, exist_ok=True)
    file_name = f"Receipt_{payment.id}.pdf"
    pdf_path = os.path.join(save_folder, file_name)
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    elements.append(Paragraph("<b>PAYMENT RECEIPT</b>", styles['Title']))
    elements.append(Spacer(1, 20))
    data = [
        ["Receipt ID:", str(payment.id), "Date:", payment.payment_date.strftime("%Y-%m-%d")],
        ["Customer:", payment.user.full_name if payment.user else "N/A", "Method:", payment.payment_method.value],
        ["Invoice Ref:", payment.invoice_number or "N/A", "Status:", payment.status.value],
        ["Amount Paid:", f"INR {payment.amount:,.2f}", "", ""]
    ]
    table = Table(data, colWidths=[100, 150, 100, 150])
    table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
    ]))
    elements.append(table)
    doc.build(elements)
    return FileResponse(pdf_path, media_type='application/pdf', filename=file_name)

@router.post("/create-order")
def create_payment_order(data: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not razorpay_client: raise HTTPException(status_code=500, detail="Razorpay is not configured")
    invoice = db.query(Invoice).filter(Invoice.invoice_number == data.invoice_number).first()
    if not invoice: raise HTTPException(status_code=404, detail="Invoice not found")
    try:
        order = razorpay_client.order.create(data={
            "amount": int(invoice.grand_total * 100),
            "currency": "INR",
            "receipt": invoice.invoice_number,
            "payment_capture": 1,
            "notes": {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number
            }
        })
        return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key_id": RAZORPAY_KEY_ID}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

async def process_successful_payment(invoice_number: str, payment_id: str, signature: str, order_id: str, amount: float, db: Session, invoice_id: Optional[int] = None):
    if invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    else:
        invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    
    if not invoice or invoice.payment_status == "Paid": return
    try:
        payment = Payment(
            razorpay_order_id=order_id, razorpay_payment_id=payment_id,
            razorpay_signature=signature, amount=amount,
            invoice_id=invoice.id, invoice_number=invoice_number,
            user_id=invoice.user_id, payment_method=PaymentMethod.UPI,
            status=PaymentStatus.SUCCESS
        )
        db.add(payment)
        
        # 2. Update Invoice Status
        invoice.status = "Paid"
        invoice.payment_status = "Paid"
        invoice.amount_paid = invoice.grand_total


        # 🚚 3. AUTO-DELIVERY HANDSHAKE & CHALLAN GENERATION (Wrapped in try-except for robustness)
        try:
            # Fetch customer's full profile for logistics
            customer = db.query(User).filter(User.id == invoice.user_id).first()
            full_address = f"{customer.address_line}, {customer.city}, {customer.state} - {customer.pincode}" if (customer and customer.address_line) else invoice.place_of_supply
            
            # Pull contact from User profile or fallback to a placeholder
            contact_phone = customer.phone if (customer and customer.phone) else "Not Provided"
    
            # Prepare items for challan PDF
            items_for_challan = [{"Item Name": item.item_details, "Quantity": item.quantity} for item in (invoice.items or [])]
    
            # Generate Challan PDF
            print(f"DEBUG: Generating Challan for {invoice.invoice_number}")
            challan_url = generate_delivery_challan(
                invoice_id=invoice.invoice_number,
                customer_name=invoice.customer_name or "Customer",
                customer_address=full_address or "No Address Provided",
                contact_number=contact_phone or "N/A",
                items_list=items_for_challan
            )
    
            invoice.challan_url = challan_url
    
            # Create Delivery Task
            new_task = DeliveryTask(
                invoice_id=invoice.id,
                invoice_number=invoice.invoice_number,
                order_reference=str(invoice.order_id) if invoice.order_id else invoice.reference_number,
                customer_name=invoice.customer_name or "Customer",
                customer_address=full_address or "No Address Provided",
                contact_number=contact_phone or "N/A",
                challan_url=challan_url,
                status=DeliveryStatus.PENDING,
                timestamp_logs={DeliveryStatus.PENDING.value: datetime.now().isoformat()}
            )
            db.add(new_task)
            print(f"DEBUG: Delivery Task created for {invoice.invoice_number} with status PENDING")
        except Exception as delivery_err:
            print(f"WARNING: Delivery task creation failed for {invoice.invoice_number}: {delivery_err}")
            # We don't raise here because we want to ensure the payment is still recorded
        
        # Log Activity
        db.add(ActivityLog(
            action=f"Payment Received & Delivery Triggered for #{invoice.invoice_number}",
            category="Finance",
            user_id=invoice.user_id
        ))
    
        db.commit()
        await manager.broadcast_to_admin({"type": "payment_received", "invoice": invoice.invoice_number})
    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR in process_successful_payment: {e}")
        import traceback
        traceback.print_exc()
        raise e

@router.post("/verify")
async def verify_payment(
    request: Request,
    db: Session = Depends(get_db)
):
    print("DEBUG: /verify endpoint triggered")
    
    # 1. Extract Data (Handle JSON or Form)
    content_type = request.headers.get("content-type", "")
    data = {}
    
    if "application/json" in content_type:
        data = await request.json()
    else:
        # Handle Form Data from Razorpay callback_url
        form_data = await request.form()
        data = dict(form_data)
        # Get invoice_number from query params if missing in form
        if "invoice_number" not in data:
            data["invoice_number"] = request.query_params.get("invoice_number")

    print(f"DEBUG: Data received for verification: {data}")

    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    invoice_number = data.get("invoice_number")
    invoice_id = data.get("invoice_id")

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        print(f"ERROR: Missing required fields. Data: {data}")
        # If it's a form callback, they might be cancelled?
        if not "application/json" in content_type:
             return RedirectResponse(url="https://ar-automation-thameem.vercel.app/customer/invoices?payment=failed")
        raise HTTPException(status_code=400, detail="Missing required fields")

    # 2. Verify Signature
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay config missing")
        
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        print(f"DEBUG: Signature verified for {invoice_number}")
    except Exception as e:
        print(f"ERROR: Signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 3. Process Success
    try:
        invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
        if not invoice:
            print(f"ERROR: Invoice {invoice_number} not found during verification")
            raise HTTPException(status_code=404, detail="Invoice not found")

        await process_successful_payment(invoice_number, razorpay_payment_id, razorpay_signature, razorpay_order_id, invoice.grand_total, db, invoice_id=invoice_id)
        
        # 4. Response / Redirect
        if "application/json" in content_type:
            return {"status": "success"}
        else:
            # Browser callback: Redirect to frontend
            return RedirectResponse(url=f"https://ar-automation-thameem.vercel.app/customer/invoices/{invoice_number}?payment=success")
            
    except Exception as e:
        print(f"CRITICAL ERROR in verify_payment flow: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
