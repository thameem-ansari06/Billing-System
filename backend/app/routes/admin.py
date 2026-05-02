from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from app.database.db import get_db
from app.models.orm import User, UserRole, Order, Invoice, DeliveryTask, Product, ActivityLog
from app.models.schemas import UserRead, DashboardStats, ActivityLogRead
from app.utils.auth import get_current_active_user
from sqlalchemy import func
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard-stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # 1. Total Revenue
    total_revenue = db.query(func.sum(Invoice.grand_total)).filter(Invoice.status == "Paid").scalar() or 0.0
    
    # 2. Pending Invoices
    pending_invoices_count = db.query(func.count(Invoice.id)).filter(Invoice.status == "Sent").count()
    
    # 3. Active Delivery Tasks
    active_delivery_tasks_count = db.query(func.count(DeliveryTask.id)).filter(
        DeliveryTask.status.in_(["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"])
    ).count()
    
    # 4. Low Stock Alerts
    low_stock_products_count = db.query(func.count(Product.id)).filter(Product.stock_quantity < 10).count()
    
    # 5. Monthly Sales (Last 6 months)
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly_sales_query = db.query(
        func.to_char(Invoice.created_at, 'Mon').label('month'),
        func.sum(Invoice.grand_total).label('total')
    ).filter(
        Invoice.status == "Paid",
        Invoice.created_at >= six_months_ago
    ).group_by('month').all()
    
    monthly_sales = [{"month": row.month, "sales": row.total} for row in monthly_sales_query]

    return {
        "total_revenue": total_revenue,
        "pending_invoices_count": pending_invoices_count,
        "active_delivery_tasks_count": active_delivery_tasks_count,
        "low_stock_products_count": low_stock_products_count,
        "monthly_sales": monthly_sales
    }

@router.get("/activity-logs", response_model=List[ActivityLogRead])
def get_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return db.query(ActivityLog).options(joinedload(ActivityLog.user)).order_by(ActivityLog.created_at.desc()).limit(20).all()

@router.get("/search")
def global_admin_search(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Search Invoices
    invoices = db.query(Invoice).filter(
        (Invoice.invoice_number.ilike(f"%{q}%")) | 
        (Invoice.email.ilike(f"%{q}%"))
    ).limit(10).all()
    
    # Search Delivery Tasks
    tasks = db.query(DeliveryTask).filter(
        (DeliveryTask.invoice_number.ilike(f"%{q}%")) |
        (DeliveryTask.contact_number.ilike(f"%{q}%"))
    ).limit(10).all()
    
    return {
        "invoices": invoices,
        "delivery_tasks": tasks
    }

@router.get("/customers")
def get_admin_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Subquery for order counts
    order_counts = db.query(
        Order.user_id, 
        func.count(Order.id).label("total_orders")
    ).group_by(Order.user_id).subquery()

    customers = db.query(
        User, 
        func.coalesce(order_counts.c.total_orders, 0).label("total_orders")
    ).outerjoin(
        order_counts, User.id == order_counts.c.user_id
    ).filter(User.role == UserRole.user).all()
    
    result = []
    for user_obj, count in customers:
        user_dict = UserRead.model_validate(user_obj).model_dump()
        user_dict["total_orders"] = count
        result.append(user_dict)

    return result

@router.get("/customers/active")
def get_active_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    customers = db.query(User.id, User.full_name, User.email).filter(User.role == UserRole.user).all()
    return [{"id": c.id, "full_name": c.full_name, "email": c.email} for c in customers]
