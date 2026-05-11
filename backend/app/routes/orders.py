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

@router.get("/", response_model=List[OrderRead])
def get_all_orders_admin(
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Admin specifically retrieves all global orders, including user relationship mapped in schemas"""
    from sqlalchemy.orm import joinedload
    orders = db.query(Order)\
        .options(
            joinedload(Order.user),
            joinedload(Order.order_items).joinedload(OrderItem.product),
            joinedload(Order.invoices),
            joinedload(Order.quotes)
        )\
        .order_by(desc(Order.created_at))\
        .all()
    return orders

@router.get("/all")
def get_unified_orders_admin(
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Enhanced endpoint returning unified data for Admin Dashboard"""
    from sqlalchemy.orm import joinedload
    orders = db.query(Order)\
        .options(
            joinedload(Order.user),
            joinedload(Order.order_items).joinedload(OrderItem.product),
            joinedload(Order.invoices),
            joinedload(Order.quotes)
        )\
        .order_by(desc(Order.created_at))\
        .all()
    
    result = []
    for order in orders:
        order_dict = {
            "id": order.id,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "total_amount": order.total_amount,
            "origin": order.origin,
            "order_type": "Bulk Order" if order.origin == "quote_derived" else "Standard Order",
            "customer": {
                "id": order.user.id if order.user else None,
                "full_name": order.user.full_name if order.user else "Unknown",
                "username": order.user.username if order.user else "Unknown",
                "email": order.user.email if order.user else "",
                "phone": order.user.phone if order.user else "",
                "gstin": order.user.gstin if order.user else ""
            },
            "item_count": sum(item.quantity for item in order.order_items),
            "has_quotes": len(order.quotes) > 0,
            "has_invoices": len(order.invoices) > 0,
            "quotes": [{"id": q.id, "quote_number": q.quote_number, "status": q.status} for q in order.quotes],
            "invoices": [{"id": inv.id, "invoice_number": inv.invoice_number, "status": inv.status} for inv in order.invoices]
        }
        result.append(order_dict)
    return result

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
        
        is_enterprise = current_user.account_type == 'enterprise'
        subtotal = new_order.total_amount
        
        if is_enterprise:
            cgst = round(subtotal * 0.09, 2)
            sgst = round(subtotal * 0.09, 2)
            igst = 0.0
        else:
            cgst = 0.0
            sgst = 0.0
            igst = round(subtotal * 0.18, 2)

        new_quote = Quote(
            quote_number=quote_number,
            order_id=new_order.id,
            user_id=new_order.user_id,
            customer_name=current_user.full_name or current_user.username,
            place_of_supply="Default",
            quote_date=datetime.now().strftime("%Y-%m-%d"),
            expiry_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            subtotal=subtotal,
            cgst=cgst,
            sgst=sgst,
            igst=igst,
            grand_total=round(subtotal + cgst + sgst + igst, 2),
            customer_company_name=current_user.company_name,
            customer_gst_no=current_user.gst_no,
            email=current_user.email,
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
        
        is_enterprise = current_user.account_type == 'enterprise'
        subtotal = new_order.total_amount
        
        if is_enterprise:
            cgst = round(subtotal * 0.09, 2)
            sgst = round(subtotal * 0.09, 2)
            igst = 0.0
        else:
            # Fallback to standard 18% IGST for non-enterprise standard orders
            cgst = 0.0
            sgst = 0.0
            igst = round(subtotal * 0.18, 2)

        new_invoice = Invoice(
            invoice_number=invoice_number,
            order_id=new_order.id,
            user_id=new_order.user_id,
            customer_name=current_user.full_name or current_user.username,
            place_of_supply="Default",
            invoice_date=datetime.now().strftime("%Y-%m-%d"),
            due_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            subtotal=subtotal,
            cgst=cgst,
            sgst=sgst,
            igst=igst,
            grand_total=round(subtotal + cgst + sgst + igst, 2),
            customer_company_name=current_user.company_name,
            customer_gst_no=current_user.gst_no,
            email=current_user.email,
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

        # 💰 AUTOMATION: Apply Customer Advances (Wallet Settlement)
        from app.utils.wallet import settle_invoice_from_advances
        settle_invoice_from_advances(db, new_invoice)

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

@router.get("/{order_id}/details")
def get_order_details_admin(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Returns 'Mottha Details' for the OrderDetailModal"""
    from sqlalchemy.orm import joinedload
    order = db.query(Order)\
        .options(
            joinedload(Order.user),
            joinedload(Order.order_items).joinedload(OrderItem.product),
            joinedload(Order.invoices),
            joinedload(Order.quotes)
        )\
        .filter(Order.id == order_id).first()
        
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = []
    for item in order.order_items:
        items.append({
            "id": item.id,
            "product_name": item.product.name if item.product else "Unknown Product",
            "sku": item.product.product_id if item.product else "N/A",
            "quantity": item.quantity,
            "rate": item.price_at_order,
            "gst": item.product.gst_percentage if item.product else 0,
            "amount": item.quantity * item.price_at_order
        })

    timeline = [
        {"stage": "Ordered", "status": "completed", "date": order.created_at.isoformat() if order.created_at else None}
    ]

    # Dynamic Timeline based on Quotes and Invoices
    if order.quotes:
        q = order.quotes[0]
        timeline.append({"stage": "Quoted", "status": "completed", "date": q.created_at.isoformat() if q.created_at else None})
        if q.status.lower() == "approved":
            timeline.append({"stage": "Approved", "status": "completed", "date": None})
        else:
            timeline.append({"stage": "Approval Pending", "status": "current", "date": None})
    
    if order.invoices:
        inv = order.invoices[0]
        timeline.append({"stage": "Invoiced", "status": "completed", "date": inv.created_at.isoformat() if inv.created_at else None})
        if inv.status == "PENDING_ADMIN_SEND":
            timeline.append({"stage": "Pending Send", "status": "current", "date": None})
    
    # Calculate Order-level Tax Summary (assuming 18% GST for simplicity if not per-product)
    # Better: sum from items
    subtotal = sum(item["amount"] for item in items)
    cgst = sum(item["amount"] * (item["gst"]/200) for item in items)
    sgst = sum(item["amount"] * (item["gst"]/200) for item in items)
    igst = 0.0 # Logic can be added for inter-state

    return {
        "id": order.id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "status": order.status.value if hasattr(order.status, "value") else str(order.status),
        "total_amount": order.total_amount,
        "order_type": "Bulk Order" if order.origin == "quote_derived" else "Standard Order",
        "customer": {
            "full_name": order.user.full_name if order.user else "Unknown",
            "gstin": order.user.gstin if order.user else "N/A",
            "phone": order.user.phone if order.user else "N/A",
            "email": order.user.email if order.user else "N/A",
            "address": f"{order.user.address_line}, {order.user.city}, {order.user.state} - {order.user.pincode}" if order.user and order.user.address_line else "No address provided"
        },
        "tax_summary": {
            "subtotal": subtotal,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "grand_total": order.total_amount # Or subtotal + cgst + sgst + igst
        },
        "items": items,
        "timeline": timeline,
        "quotes": [
            {
                "id": q.id, 
                "quote_number": q.quote_number, 
                "status": q.status, 
                "date": q.quote_date,
                "total": q.grand_total
            } for q in order.quotes
        ],
        "invoices": [
            {
                "id": inv.id, 
                "invoice_number": inv.invoice_number, 
                "status": inv.status,
                "date": inv.invoice_date,
                "total": inv.grand_total,
                "paid": inv.amount_paid
            } for inv in order.invoices
        ]
    }

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
        customer_company_name=user.company_name,
        customer_gst_no=user.gst_no,
        email=user.email,
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
