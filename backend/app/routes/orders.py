from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.database.db import get_db
from app.models.orm import Order, OrderItem, UserRole, User, Product, Invoice
from app.models.schemas import OrderSubmission, OrderRead
from app.utils.auth import get_current_active_user, RoleChecker
from app.models.orm import Order, OrderStatus

router = APIRouter(prefix="/orders", tags=["Orders"])

allow_strict_admin = RoleChecker([UserRole.admin, UserRole.ceo])

@router.get("/admin", response_model=List[OrderRead])
def get_all_orders_admin(
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Admin specifically retrieves all global orders, including user relationship mapped in schemas"""
    return db.query(Order).order_by(desc(Order.created_at)).all()

@router.get("/user/orders/", response_model=List[OrderRead])
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """User retrieves their specific orders with all bound item arrays linked natively"""
    from sqlalchemy.orm import joinedload
    
    return db.query(Order)\
        .options(
            joinedload(Order.order_items).joinedload(OrderItem.product),
            joinedload(Order.invoices).joinedload(Invoice.delivery_tasks)
        )\
        .filter(Order.user_id == current_user.id)\
        .order_by(desc(Order.created_at))\
        .all()

@router.post("/")
def create_customer_order(
    submission: OrderSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not submission.items:
        raise HTTPException(status_code=400, detail="Cannot place empty order")

    # Native Price Calculation Matrix
    total_bill = 0.0
    validated_items = []
    
    for item in submission.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} invalid or removed")
            
        line_total = product.price * item.quantity
        total_bill += line_total
        
        # Stash tuple to prevent mapping twice
        validated_items.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "price_at_order": product.price,
            "product": product
        })
        
    # Save root Order
    new_order = Order(
        user_id=current_user.id,
        total_amount=total_bill,
        status=OrderStatus.Placed
    )
    db.add(new_order)
    db.commit() # Flush so new_order.id exists
    
    # Save Order Items cascading into the DB
    for v_item in validated_items:
        new_item = OrderItem(
            order_id=new_order.id,
            product_id=v_item["product_id"],
            quantity=v_item["quantity"],
            price_at_order=v_item["price_at_order"]
        )
        db.add(new_item)
        
    db.commit()
    db.refresh(new_order)

    # ── CONDITIONAL ROUTING ENGINE ────────────────────────────────────────────
    # Count TOTAL UNITS across all line items (not just unique product types).
    # e.g. 1 product × qty 6  → item_count = 6  → QUOTE
    #      3 products × qty 2 → item_count = 6  → QUOTE
    #      2 products × qty 2 → item_count = 4  → INVOICE
    from app.models.orm import Quote, QuoteItem, InvoiceItem
    from app.database.db import get_next_id
    from datetime import datetime, timedelta

    item_count = sum(item.quantity for item in submission.items)  # total units
    routing_decision = "UNKNOWN"

    print(f"🔀 Routing Engine: {item_count} total units → {'QUOTE (>5)' if item_count > 5 else 'INVOICE (<=5)'}")

    if item_count > 5:
        routing_decision = "QUOTE"
        quote_number = get_next_id("QUOTE", "quotes", "quote_number")
        new_quote = Quote(
            quote_number=quote_number,
            order_id=new_order.id,
            user_id=new_order.user_id,
            customer_name=current_user.full_name or current_user.username,
            place_of_supply="Default",
            quote_date=datetime.now().strftime("%Y-%m-%d"),
            expiry_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            subtotal=new_order.total_amount,
            cgst=new_order.total_amount * 0.09,
            sgst=new_order.total_amount * 0.09,
            igst=0.0,
            grand_total=new_order.total_amount * 1.18,
            status="pending_approval"
        )
        db.add(new_quote)
        db.flush()

        for v_item in validated_items:
            product = v_item["product"]
            q_item = QuoteItem(
                quote_id=new_quote.id,
                item_details=product.name,
                quantity=v_item["quantity"],
                rate=v_item["price_at_order"],
                discount_amount=0.0,
                discount_type="amount",
                tax_type=f"GST{int(product.gst_percentage)}",
                amount=v_item["price_at_order"] * v_item["quantity"]
            )
            db.add(q_item)

        new_order.status = OrderStatus.Quoted

    else:
        routing_decision = "INVOICE"
        invoice_number = get_next_id("INV", "invoices", "invoice_number")
        new_invoice = Invoice(
            invoice_number=invoice_number,
            order_id=new_order.id,
            user_id=new_order.user_id,
            customer_name=current_user.full_name or current_user.username,
            place_of_supply="Default",
            invoice_date=datetime.now().strftime("%Y-%m-%d"),
            due_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            subtotal=new_order.total_amount,
            cgst=new_order.total_amount * 0.09,
            sgst=new_order.total_amount * 0.09,
            igst=0.0,
            grand_total=new_order.total_amount * 1.18,
            status="Draft"
        )
        db.add(new_invoice)
        db.flush()

        for v_item in validated_items:
            product = v_item["product"]
            inv_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_details=product.name,
                quantity=v_item["quantity"],
                rate=v_item["price_at_order"],
                discount_amount=0.0,
                discount_type="amount",
                tax_type=f"GST{int(product.gst_percentage)}",
                amount=v_item["price_at_order"] * v_item["quantity"]
            )
            db.add(inv_item)

        new_order.status = OrderStatus.Invoiced

    db.commit()
    db.refresh(new_order)

    # Serialize order and return with explicit routing metadata
    order_dict = OrderRead.model_validate(new_order).model_dump()
    print(f"✅ Order #{new_order.id} finalized → routing={routing_decision}")
    return {
        "routing": routing_decision,
        "item_count": item_count,
        "message": "Order processed",
        "order": order_dict
    }

@router.get("/{order_id}", response_model=OrderRead)
def get_order_by_id(
    order_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role not in [UserRole.admin, UserRole.ceo, UserRole.provider] and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
        
    return order

@router.post("/{order_id}/generate-quote")
def generate_quote_from_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    from app.models.orm import Quote, QuoteItem, OrderStatus
    from app.database.db import get_next_id
    from datetime import datetime, timedelta

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 1. Fetch details
    user = order.user
    
    # 2. Create Quote
    quote_number = get_next_id("QUOTE", "quotes", "quote_number")
    new_quote = Quote(
        quote_number=quote_number,
        order_id=order.id,
        user_id=order.user_id,
        customer_name=user.full_name or user.username,
        place_of_supply="Default", # Can be extended
        quote_date=datetime.now().strftime("%Y-%m-%d"),
        expiry_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        subtotal=order.total_amount,
        cgst=order.total_amount * 0.09,
        sgst=order.total_amount * 0.09,
        igst=0.0,
        grand_total=order.total_amount * 1.18,
        status="pending_approval"
    )
    db.add(new_quote)
    db.flush()

    # 3. Migrate Items
    for item in order.order_items:
        product = item.product
        q_item = QuoteItem(
            quote_id=new_quote.id,
            item_details=product.name,
            quantity=item.quantity,
            rate=item.price_at_order,
            discount_amount=0.0,
            discount_type="amount",
            tax_type=f"GST{int(product.gst_percentage)}",
            amount=item.price_at_order * item.quantity
        )
        db.add(q_item)

    # 4. Update Order Status
    order.status = OrderStatus.Quoted
    db.commit()
    
    return {"message": "Quote generated successfully", "quote_id": new_quote.id, "quote_number": quote_number}
