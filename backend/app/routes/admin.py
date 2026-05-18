from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from app.database.db import get_db
from sqlalchemy import func, text
from datetime import datetime, timedelta
import os
import uuid
import pandas as pd
import traceback
from app.models.orm import (
    User, UserRole, Order, OrderItem, Customer, ContactPerson, 
    Product, Invoice, InvoiceItem, Advance, DeliveryBatch, 
    DeliveryTask, Quote, QuoteItem, DeliveryChallan, 
    ChallanItem, ActivityLog, Payment
)
from app.models.schemas import UserRead, DashboardStats, ActivityLogRead, StaffCreate, FactoryResetRequest, SelectiveResetRequest
from app.utils.auth import get_current_active_user, get_password_hash, verify_password

router = APIRouter(prefix="/admin", tags=["Admin"])

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
    pending_invoices_count = db.query(Invoice).filter(Invoice.status == "Sent").count()
    
    # 3. Active Delivery Tasks
    active_delivery_tasks_count = db.query(DeliveryTask).filter(
        DeliveryTask.status.in_(["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"])
    ).count()
    
    # 4. Low Stock Alerts
    low_stock_products_count = db.query(Product).filter(Product.stock_quantity < 10).count()
    
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
    
    customers = db.query(User.id, User.full_name, User.email, User.account_type, User.company_name, User.gst_no).filter(User.role == UserRole.user).all()
    return [{"id": c.id, "full_name": c.full_name, "email": c.email, "account_type": c.account_type, "company_name": c.company_name, "gst_no": c.gst_no} for c in customers]

@router.get("/staff", response_model=List[UserRead])
def get_staff_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.admin, UserRole.ceo]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Fetch all users where the role is NOT 'customer' or 'user'
    staff = db.query(User).filter(User.role.notin_([UserRole.user, UserRole.customer])).all()
    return staff

@router.post("/add-staff", response_model=UserRead)
def add_new_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.admin, UserRole.ceo]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Check if username or email exists
    existing = db.query(User).filter((User.username == staff_data.username) | (User.email == staff_data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    new_staff = User(
        username=staff_data.username,
        email=staff_data.email,
        role=staff_data.role,
        hashed_password=get_password_hash(staff_data.password),
        full_name=staff_data.username, # Default
        account_type="staff"
    )
    
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff

@router.post("/factory-reset")
def factory_reset(
    request_data: FactoryResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # 1. Password Verification
    if not verify_password(request_data.admin_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid admin password")

    try:
        # Step A: Archival
        # Filename Format: Backup_DD-MM-YYYY_HH-mm-AM/PM_UUID.xlsx
        unique_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%d-%m-%Y_%I-%M-%p")
        filename = f"Backup_{timestamp}_{unique_id}.xlsx"
        filepath = os.path.join("static", "backups", filename)
        
        # Ensure directory exists
        os.makedirs(os.path.join("static", "backups"), exist_ok=True)
        
        # Tables to export (ALL business critical tables)
        tables = {
            "Orders": Order,
            "OrderItems": OrderItem,
            "Invoices": Invoice,
            "InvoiceItems": InvoiceItem,
            "Quotes": Quote,
            "QuoteItems": QuoteItem,
            "Products": Product,
            "Customers": Customer,
            "Payments": Payment,
            "DeliveryTasks": DeliveryTask,
            "DeliveryChallans": DeliveryChallan,
            "ChallanItems": ChallanItem,
            "Advances": Advance,
            "ActivityLogs": ActivityLog,
            "Users": User
        }

        # Use Pandas for multi-sheet export
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            # 🛡️ SAFETY SHEET: Ensures the workbook always has at least one visible sheet
            # This prevents the "At least one sheet must be visible" error if tables are empty.
            summary_df = pd.DataFrame([{
                "Status": "Full System Reset Archive",
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Administrator": current_user.username,
                "Action": "Permanent Data Wipe"
            }])
            summary_df.to_excel(writer, sheet_name="Reset_Summary", index=False)

            for sheet_name, model in tables.items():
                query = db.query(model)
                df = pd.read_sql(query.statement, db.bind)
                
                # 🚀 MODERN DATETIME HANDLING
                # Excel does not support datetimes with timezones. We must force them to naive.
                for col in df.columns:
                    # Attempt conversion using 'coerce' to handle all string formats
                    temp_col = pd.to_datetime(df[col], errors='coerce')
                    
                    # If the column is legitimately a datetime column (contains at least one valid date),
                    # we update the DataFrame with the naive version.
                    if pd.api.types.is_datetime64_any_dtype(temp_col) and temp_col.notnull().any():
                        # Only apply tz_localize(None) if it's aware, or force it naive
                        try:
                            if hasattr(temp_col.dt, 'tz') and temp_col.dt.tz is not None:
                                df[col] = temp_col.dt.tz_localize(None)
                            else:
                                df[col] = temp_col
                        except:
                            df[col] = temp_col
                    # Otherwise, we leave the original column alone (IDs, names, strings, etc.)

                # Always write the sheet (even if empty) to satisfy Excel requirements
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        # Step B: The Wipe (Atomic)
        # CASCADING TRUNCATE ensures IDs start from 1 and dependencies are handled
        truncate_tables = [
            "orders", "order_items", "invoices", "invoice_items", 
            "quotes", "quote_items", "products", "customers", 
            "payments", "delivery_tasks", "delivery_batches", "delivery_challans", 
            "challan_items", "advances", "activity_logs", "contact_persons"
        ]
        
        sql = text(f"TRUNCATE {', '.join(truncate_tables)} RESTART IDENTITY CASCADE;")
        db.execute(sql)
        
        # 2. Purge users (CRITICAL: Keep ONLY admins)
        db.execute(text("DELETE FROM users WHERE role != 'admin';"))
        
        db.commit()
        
        # Return the download URL
        return {"download_url": f"/api/static/backups/{filename}"}

    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(f"[FATAL] Factory Reset Failed: {error_details}")
        raise HTTPException(status_code=500, detail=f"Factory Reset failed: {str(e)}\n\nTraceback:\n{error_details}")

@router.post("/selective-reset")
def selective_reset(
    request_data: SelectiveResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # 1. Password Verification
    if not verify_password(request_data.admin_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid admin password")

    try:
        tables_to_truncate = []
        
        if request_data.inventory:
            tables_to_truncate.append("products")
            
        if request_data.customers:
            # Customers are parents to many things, CASCADE will handle them
            tables_to_truncate.append("customers")
            tables_to_truncate.append("contact_persons")
            # Note: We also handle 'users' with role='user' separately via DELETE
            
        if request_data.invoices:
            tables_to_truncate.extend(["invoices", "invoice_items"])
            
        if request_data.quotes:
            tables_to_truncate.extend(["quotes", "quote_items"])
            
        if request_data.payments:
            tables_to_truncate.extend(["payments", "advances"])
            
        if request_data.activity_logs:
            tables_to_truncate.append("activity_logs")

        if request_data.delivery_logistics:
            tables_to_truncate.extend(["delivery_tasks", "delivery_batches", "delivery_challans", "challan_items"])

        if not tables_to_truncate and not request_data.customers:
            return {"message": "No categories selected for reset"}

        # Perform Truncate
        if tables_to_truncate:
            sql = text(f"TRUNCATE {', '.join(tables_to_truncate)} RESTART IDENTITY CASCADE;")
            db.execute(sql)
            
        # Special handling for User records (Customers/Staff)
        if request_data.customers:
            db.execute(text("DELETE FROM users WHERE role = 'user';"))

        db.commit()
        return {"message": f"Successfully reset selected categories: {', '.join(tables_to_truncate)}"}

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Selective Reset Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Selective Reset failed: {str(e)}")

@router.get("/backups")
def list_backups(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_dir = os.path.join("static", "backups")
    if not os.path.exists(backup_dir):
        return []
    
    backups = []
    for file in os.listdir(backup_dir):
        if file.endswith(".xlsx"):
            file_path = os.path.join(backup_dir, file)
            stats = os.stat(file_path)
            # Use file modification time for sorting, but filename for display
            backups.append({
                "filename": file,
                "size": f"{stats.st_size / (1024*1024):.2f} MB",
                "created_at": datetime.fromtimestamp(stats.st_mtime).strftime("%Y-%m-%d %I:%M %p"),
                "download_url": f"/api/static/backups/{file}",
                "timestamp": stats.st_mtime
            })
    
    # Sort by timestamp descending
    backups.sort(key=lambda x: x["timestamp"], reverse=True)
    return backups
