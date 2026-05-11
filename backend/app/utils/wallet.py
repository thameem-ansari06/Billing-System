from sqlalchemy.orm import Session
from app.models.orm import Advance, Invoice, ActivityLog
from datetime import datetime

def settle_invoice_from_advances(db: Session, invoice: Invoice):
    """
    Automated Advance Settlement (Wallet) Logic.
    Deducts available advances from the invoice grand total.
    """
    if not invoice.user_id:
        return
        
    # 1. Fetch unadjusted advances
    advances = db.query(Advance).filter(
        Advance.customer_id == invoice.user_id,
        Advance.is_adjusted == False
    ).all()
    
    total_available = sum(adv.amount for adv in advances)
    if total_available <= 0:
        return
        
    # 2. Smart Deduction Logic
    grand_total = invoice.grand_total
    # If the invoice already has some paid amount (e.g. manual payment before settlement), 
    # we only settle the remaining part.
    remaining_to_pay = grand_total - invoice.amount_paid
    
    if remaining_to_pay <= 0:
        return
        
    settlement_amount = min(total_available, remaining_to_pay)
    
    # 3. Mark advances as adjusted and handle remainder
    # Strategy: Mark all current unadjusted as adjusted. 
    # If there's a leftover after settlement, create ONE new advance record for the balance.
    for adv in advances:
        adv.is_adjusted = True
        
    if total_available > settlement_amount:
        remainder = total_available - settlement_amount
        new_balance_adv = Advance(
            customer_id=invoice.user_id,
            amount=round(remainder, 2),
            payment_mode="Wallet Adjustment",
            date=datetime.now().strftime("%Y-%m-%d"),
            is_adjusted=False
        )
        db.add(new_balance_adv)
        
    # 4. Update Invoice
    invoice.amount_paid += settlement_amount
    invoice.settled_amount = settlement_amount
    
    if invoice.amount_paid >= grand_total:
        invoice.payment_status = "Paid"
        invoice.status = "Paid"
    else:
        invoice.payment_status = "Partially Paid"
        
    # 5. Log the settlement
    db.add(ActivityLog(
        action=f"Wallet Settlement: ₹{settlement_amount:.2f} applied to Invoice #{invoice.invoice_number}",
        category="Finance",
        user_id=invoice.user_id
    ))
    
    return settlement_amount
