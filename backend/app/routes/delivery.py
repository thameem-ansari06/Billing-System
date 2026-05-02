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
from app.models.schemas import DeliveryTaskRead, UserRead

router = APIRouter(prefix="/api/delivery-tasks", tags=["Delivery Tasks"])

UPLOAD_DIR = "backend/static/uploads/proofs"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

def log_status_change(task: DeliveryTask, new_status: str):
    """Utility to append status change timestamps to JSON logs."""
    logs = task.timestamp_logs.copy() if task.timestamp_logs else {}
    logs[new_status] = datetime.now().isoformat()
    task.timestamp_logs = logs
    task.status = new_status

@router.get("/", response_model=List[DeliveryTaskRead])
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
            
    return tasks

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

@router.get("/{task_id}", response_model=DeliveryTaskRead)
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
        
    return task

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
    # Generate a simple 4-digit pickup code for warehouse verification
    task.pickup_code = str(random.randint(1000, 9999))
    log_status_change(task, DeliveryStatus.ASSIGNED)
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Driver Assigned to Task #{task.invoice_number}",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()
    return {"message": "Driver assigned successfully", "pickup_code": task.pickup_code}

@router.post("/{task_id}/verify-pickup")
def verify_pickup(
    task_id: int,
    pickup_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Driver enters code at warehouse to pick up items."""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.pickup_code != pickup_code:
        raise HTTPException(status_code=400, detail="Invalid Pickup Code")
    
    log_status_change(task, DeliveryStatus.PICKED_UP)
    
    # Log Activity
    db.add(ActivityLog(
        action=f"Order #{task.invoice_number} Picked Up",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()
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

@router.post("/send-otp/{task_id}")
def send_otp(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate 4-digit OTP and 'send' to customer."""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    otp = str(random.randint(1000, 9999))
    task.otp_code = otp
    db.commit()
    
    # MOCK SENDING
    print(f"DEBUG: Sending OTP {otp} to customer for Task #{task_id}")
    
    return {"message": "OTP sent successfully", "otp_debug": otp} # otp_debug for demo


@router.post("/verify-otp/{task_id}")
async def verify_otp_and_complete(
    task_id: int,
    otp_code: str = Form(...),
    signature: str = Form(...), # Base64
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify OTP and save e-proof to complete delivery."""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.otp_code != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP Code")
    
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
        action=f"Order #{task.invoice_number} Delivered",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()
    return {"message": "Delivery completed successfully", "status": task.status}
