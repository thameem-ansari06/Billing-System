from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime
from app.database.db import get_db
from app.models.orm import Order, OrderItem, UserRole, User, Product, Invoice
from app.models.schemas import OrderSubmission, OrderRead
from app.utils.auth import get_current_active_user, RoleChecker
from app.models.orm import Order, OrderStatus

# Removed strict_slashes=False to fix TypeError
router = APIRouter(prefix="/orders", tags=["Orders"])

allow_strict_admin = RoleChecker([UserRole.admin, UserRole.ceo])

# ─── SECTION 1: STATIC ROUTES (PLACED AT TOP) ──────────────────────────────

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
        .filter(Order.is_deleted == False)\
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

@router.get("/bin")
def get_recycle_bin_orders(
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Fetch only orders where is_deleted == True"""
    from sqlalchemy.orm import joinedload
    orders = db.query(Order)\
        .options(joinedload(Order.user))\
        .filter(Order.is_deleted == True)\
        .order_by(desc(Order.deleted_at))\
        .all()
    
    return [{
        "id": o.id,
        "total_amount": o.total_amount,
        "deleted_at": o.deleted_at.isoformat() if o.deleted_at else None,
        "customer": o.user.full_name if o.user else "Unknown"
    } for o in orders]

@router.get("/user/orders", response_model=List[OrderRead])
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """User retrieves their specific orders"""
    from sqlalchemy.orm import joinedload
    return db.query(Order)\
        .options(
            joinedload(Order.order_items).joinedload(OrderItem.product),
            joinedload(Order.invoices).joinedload(Invoice.delivery_tasks)
        )\
        .filter(Order.user_id == current_user.id, Order.is_deleted == False)\
        .order_by(desc(Order.created_at))\
        .all()

@router.get("/", response_model=List[OrderRead])
def get_all_orders_root(
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    from sqlalchemy.orm import joinedload
    return db.query(Order)\
        .options(joinedload(Order.user))\
        .filter(Order.is_deleted == False)\
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

    total_bill = 0.0
    validated_items = []
    
    for item in submission.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} invalid")
            
        line_total = product.price * item.quantity
        total_bill += line_total
        validated_items.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "price_at_order": product.price,
            "product": product
        })
        
    new_order = Order(
        user_id=current_user.id,
        total_amount=total_bill,
        status=OrderStatus.Placed
    )
    db.add(new_order)
    db.commit()
    
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

    # Simple routing logic
    from app.models.orm import Quote, QuoteItem, InvoiceItem
    from app.database.db import get_next_id
    from datetime import timedelta

    item_count = sum(item.quantity for item in submission.items)
    routing_decision = "UNKNOWN"

    if item_count > 5:
        routing_decision = "QUOTE"
        quote_number = get_next_id("QUOTE", "quotes", "quote_number")
        new_quote = Quote(
            quote_number=quote_number,
            order_id=new_order.id,
            user_id=new_order.user_id,
            customer_name=current_user.full_name or current_user.username,
            subtotal=new_order.total_amount,
            grand_total=new_order.total_amount * 1.18,
            status="pending_approval"
        )
        db.add(new_quote)
        new_order.status = OrderStatus.Quoted
    else:
        routing_decision = "INVOICE"
        invoice_number = get_next_id("INV", "invoices", "invoice_number")
        new_invoice = Invoice(
            invoice_number=invoice_number,
            order_id=new_order.id,
            user_id=new_order.user_id,
            customer_name=current_user.full_name or current_user.username,
            subtotal=new_order.total_amount,
            grand_total=new_order.total_amount * 1.18,
            status="Draft"
        )
        db.add(new_invoice)
        new_order.status = OrderStatus.Invoiced

    db.commit()
    return {
        "routing": routing_decision, 
        "order": OrderRead.model_validate(new_order),
        "item_count": item_count
    }

# ─── SECTION 2: DYNAMIC ID ROUTES (PLACED LAST) ──────────────────────────

@router.delete("/{order_id}")
def soft_delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """
    CRITICAL: Placed ABOVE the GET route for the same path.
    Soft Deletes the order.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.is_deleted = True
    order.deleted_at = datetime.now()
    db.commit()
    return {"message": "Order moved to Recycle Bin"}

@router.get("/{order_id}", response_model=OrderRead)
def get_order_by_id(
    order_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role not in [UserRole.admin, UserRole.ceo] and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return order

@router.post("/{order_id}/recover")
def recover_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Restores a soft-deleted order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.is_deleted = False
    order.deleted_at = None
    db.commit()
    return {"message": "Order recovered successfully"}

@router.delete("/{order_id}/permanent")
def permanent_delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    """Physically removes the order from DB"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(order)
    db.commit()
    return {"message": "Order permanently deleted"}

@router.get("/{order_id}/details")
def get_order_details_admin(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    from sqlalchemy.orm import joinedload
    order = db.query(Order)\
        .options(joinedload(Order.user), joinedload(Order.order_items).joinedload(OrderItem.product))\
        .filter(Order.id == order_id).first()
        
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "id": order.id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "status": order.status,
        "total_amount": order.total_amount,
        "customer": order.user.full_name if order.user else "Unknown"
    }

@router.post("/{order_id}/generate-quote")
def generate_quote_from_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_strict_admin)
):
    from app.models.orm import Quote, OrderStatus
    from app.database.db import get_next_id

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    quote_number = get_next_id("QUOTE", "quotes", "quote_number")
    new_quote = Quote(
        quote_number=quote_number,
        order_id=order.id,
        user_id=order.user_id,
        customer_name=order.user.full_name if order.user else "Unknown",
        status="pending_approval"
    )
    db.add(new_quote)
    order.status = OrderStatus.Quoted
    db.commit()
    return {"message": "Quote generated", "quote_id": new_quote.id}
