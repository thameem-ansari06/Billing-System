from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import json
import random
from datetime import datetime
from app.database.db import get_db
from app.models.orm import DeliveryTask, User, UserRole, DeliveryStatus, Invoice, Order, ActivityLog
from sqlalchemy.orm import joinedload
from app.utils.auth import get_current_active_user
from app.models.schemas import DeliveryTaskRead, DeliveryTaskAdminRead, UserRead
from fastapi import BackgroundTasks
from app.utils.email import send_otp_email

router = APIRouter(prefix="/delivery-tasks", tags=["Delivery Tasks"])

UPLOAD_DIR = "static/uploads/proofs"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

def log_status_change(task: DeliveryTask, new_status: str):
    """Utility to append status change timestamps to JSON logs."""
    logs = task.timestamp_logs.copy() if task.timestamp_logs else {}
    status_str = new_status.value if hasattr(new_status, "value") else str(new_status)
    logs[status_str] = datetime.now().isoformat()
    task.timestamp_logs = logs
    task.status = new_status

@router.get("/")
def get_delivery_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve all delivery tasks for admin or specific tasks for delivery personnel."""
    query = db.query(DeliveryTask).options(
        joinedload(DeliveryTask.invoice).joinedload(Invoice.order)
    ).order_by(DeliveryTask.id.desc())
    
    if current_user.role in [UserRole.admin, UserRole.ceo, UserRole.sales]:
        tasks = query.all()
    elif current_user.role == UserRole.delivery or current_user.role == "driver":
        tasks = query.filter(DeliveryTask.driver_id == current_user.id).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    for task in tasks:
        if not task.invoice_number and task.invoice:
            task.invoice_number = task.invoice.invoice_number
        if not task.order_reference and task.invoice:
            task.order_reference = str(task.invoice.order_id) if task.invoice.order_id else task.invoice.reference_number
            
    if current_user.role in [UserRole.admin, UserRole.ceo, UserRole.sales]:
        return [DeliveryTaskAdminRead.model_validate(t) for t in tasks]
    return [DeliveryTaskRead.model_validate(t) for t in tasks]

@router.get("/drivers", response_model=List[UserRead])
def get_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch all users with role 'delivery' or 'driver'."""
    if current_user.role not in [UserRole.admin, UserRole.ceo]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return db.query(User).filter(User.role.in_([UserRole.delivery, "driver"])).all()    

@router.get("/my-tasks", response_model=List[DeliveryTaskRead])
def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Returns only tasks assigned to the current driver."""
    tasks = db.query(DeliveryTask)\
        .options(joinedload(DeliveryTask.invoice).joinedload(Invoice.order))\
        .filter(DeliveryTask.driver_id == current_user.id)\
        .order_by(DeliveryTask.id.desc())\
        .all()
        
    for task in tasks:
        if not task.invoice_number and task.invoice:
            task.invoice_number = task.invoice.invoice_number
        if not task.order_reference and task.invoice:
            task.order_reference = str(task.invoice.order_id) if task.invoice.order_id else task.invoice.reference_number
            
    return tasks

@router.get("/latest-for-customer", response_model=Optional[DeliveryTaskRead])
def get_latest_customer_task(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve the most recent delivery task for the logged-in customer."""
    task = db.query(DeliveryTask)\
        .join(Invoice, DeliveryTask.invoice_id == Invoice.id)\
        .options(joinedload(DeliveryTask.invoice).joinedload(Invoice.order))\
        .filter(Invoice.user_id == current_user.id)\
        .order_by(DeliveryTask.id.desc())\
        .first()
    
    if task:
        if not task.invoice_number and task.invoice:
            task.invoice_number = task.invoice.invoice_number
        if not task.order_reference and task.invoice:
            task.order_reference = str(task.invoice.order_id) if task.invoice.order_id else task.invoice.reference_number
            
    return task

@router.get("/by-order/{order_id}", response_model=Optional[DeliveryTaskRead])
def get_task_by_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch delivery task details for a specific order."""
    from app.models.orm import Invoice
    
    task = db.query(DeliveryTask)\
        .join(Invoice, DeliveryTask.invoice_id == Invoice.id)\
        .filter(Invoice.order_id == order_id)\
        .first()
    
    return task

@router.get("/{task_id}")
def get_task_detail(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch details for a specific task."""
    task = db.query(DeliveryTask)\
        .options(joinedload(DeliveryTask.invoice).joinedload(Invoice.order))\
        .filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if not task.invoice_number and task.invoice:
        task.invoice_number = task.invoice.invoice_number
    if not task.order_reference and task.invoice:
        task.order_reference = str(task.invoice.order_id) if task.invoice.order_id else task.invoice.reference_number
        
    if current_user.role in [UserRole.admin, UserRole.ceo, UserRole.sales]:
        return DeliveryTaskAdminRead.model_validate(task)
    return DeliveryTaskRead.model_validate(task)

@router.put("/{task_id}/assign")
def assign_driver(
    task_id: int,
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign a driver to a task and generate a pickup code."""
    if current_user.role not in [UserRole.admin, UserRole.ceo]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.driver_id = driver_id
    log_status_change(task, DeliveryStatus.ASSIGNED)
    
    # Force generate pickup OTP if missing
    if not task.pickup_otp:
        task.pickup_otp = str(random.randint(100000, 999999))
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Driver Assigned to Task #{task.invoice_number}",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()
    db.refresh(task)
    return {"message": "Driver assigned successfully", "pickup_otp": task.pickup_otp}

@router.post("/{task_id}/verify-pickup")
async def verify_pickup(
    task_id: int,
    otp: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Driver enters code at warehouse to pick up items."""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.pickup_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid Pickup OTP")
    
    log_status_change(task, DeliveryStatus.PICKED_UP)
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Order #{task.invoice_number} Picked Up (OTP Verified)",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()

    from app.utils.websocket_manager import manager
    await manager.broadcast_to_admin({"type": "status_update", "invoice": task.invoice_number, "status": "PICKED_UP"})

    return {"message": "Pickup verified", "status": task.status}

@router.put("/{task_id}/status")
def update_task_status(
    task_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update the status of a delivery task with logging."""
    if current_user.role not in [UserRole.admin, UserRole.delivery, "driver"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_status = status.upper()
    if new_status not in DeliveryStatus.__members__:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    log_status_change(task, DeliveryStatus[new_status])
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Task #{task.invoice_number} status: {new_status}",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()
    return {"message": "Status updated", "new_status": task.status}

@router.post("/{task_id}/arrive")
async def mark_arrived(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Driver marks task as arrived and triggers email."""
    # Use joinedload to fetch associated invoice to get email
    task = db.query(DeliveryTask).options(
        joinedload(DeliveryTask.invoice).joinedload(Invoice.user)
    ).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status not in [DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT, DeliveryStatus.ARRIVED]:
        raise HTTPException(status_code=400, detail=f"Cannot transition to ARRIVED from {task.status}")

    log_status_change(task, DeliveryStatus.ARRIVED)
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Order #{task.invoice_number} Arrived at Destination",
        category="Logistics",
        user_id=current_user.id
    ))
    db.commit()

    # Fetch customer email
    customer_email = None
    if task.invoice:
        customer_email = task.invoice.email
        if not customer_email and task.invoice.user:
            customer_email = task.invoice.user.email

    # Auto-generate if missing for backward compatibility
    if not task.delivery_otp:
        task.delivery_otp = str(random.randint(100000, 999999))
        db.commit()
        print(f"[DEBUG] /arrive - Auto-generated missing delivery OTP for task {task_id}")

    if not customer_email:
        print(f"ERROR: Missing customer email for Task {task_id}")
        raise HTTPException(status_code=400, detail="Incomplete delivery data: Missing customer email.")
        
    background_tasks.add_task(send_otp_email, email_to=customer_email, otp=task.delivery_otp)

    # Broadcast status change
    from app.utils.websocket_manager import manager
    await manager.broadcast_to_admin({"type": "status_update", "invoice": task.invoice_number, "status": "ARRIVED"})

    return {"message": "Task marked arrived and OTP queued"}

@router.post("/{task_id}/resend-otp")
def resend_otp(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Resend the delivery OTP email."""
    task = db.query(DeliveryTask).options(
        joinedload(DeliveryTask.invoice).joinedload(Invoice.user)
    ).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    print(f"[DEBUG] /resend-otp - Task {task_id} status: {task.status}")

    if task.status not in [DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT, DeliveryStatus.ARRIVED]:
        raise HTTPException(status_code=400, detail="Task must be PICKED_UP, IN_TRANSIT, or ARRIVED to resend OTP")

    customer_email = None
    if task.invoice:
        customer_email = task.invoice.email
        if not customer_email and task.invoice.user:
            customer_email = task.invoice.user.email
            
    print(f"[DEBUG] /resend-otp - Task {task_id} customer_email fetched: {customer_email}")

    if not customer_email:
        raise HTTPException(status_code=400, detail="Missing customer email. Cannot resend OTP.")

    # Auto-generate if missing for backward compatibility
    if not task.delivery_otp:
        task.delivery_otp = str(random.randint(100000, 999999))
        db.commit()
        print(f"[DEBUG] /resend-otp - Auto-generated missing delivery OTP for task {task_id}")

    background_tasks.add_task(send_otp_email, email_to=customer_email, otp=task.delivery_otp)
    return {"message": "OTP resend queued"}

@router.post("/verify-delivery/{task_id}")
async def verify_delivery_and_complete(
    task_id: int,
    otp: str = Form(...),
    signature: str = Form(...), # Base64
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify Delivery OTP and save e-proof to complete delivery."""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != DeliveryStatus.ARRIVED:
        raise HTTPException(status_code=400, detail=f"Task must be ARRIVED, current status: {task.status}")

    if task.delivery_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid Delivery OTP")
    
    # Save Photo
    if photo:
        file_ext = os.path.splitext(photo.filename)[1]
        file_name = f"photo_{task_id}_{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as f:
            f.write(await photo.read())
        task.delivery_photo_url = f"/static/uploads/proofs/{file_name}"
    
    # Save Signature
    if signature:
        import base64
        try:
            if "," in signature:
                header, encoded = signature.split(",", 1)
            else:
                encoded = signature
            sig_data = base64.b64decode(encoded)
            sig_name = f"sig_{task_id}_{uuid.uuid4().hex}.png"
            sig_path = os.path.join(UPLOAD_DIR, sig_name)
            with open(sig_path, "wb") as f:
                f.write(sig_data)
            task.signature_url = f"/static/uploads/proofs/{sig_name}"
        except Exception as e:
            print(f"Error saving signature: {e}")

    log_status_change(task, DeliveryStatus.DELIVERED)
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Order #{task.invoice_number} Delivered (OTP Verified)",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()

    from app.utils.websocket_manager import manager
    await manager.broadcast_to_admin({"type": "status_update", "invoice": task.invoice_number, "status": "DELIVERED"})

    return {"message": "Delivery completed successfully", "status": task.status}
