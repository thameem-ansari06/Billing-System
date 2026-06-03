from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import json
import random
from datetime import datetime
from app.database.db import get_db
from app.models.orm import DeliveryTask, User, UserRole, DeliveryStatus, Invoice, Order, ActivityLog, DeliveryBatch
from sqlalchemy.orm import joinedload
from app.utils.auth import get_current_active_user
from app.models.schemas import DeliveryTaskRead, DeliveryTaskAdminRead, UserRead, BulkAssignRequest, BatchVerifyRequest, DeliveryBatchRead
from fastapi import BackgroundTasks
from app.utils.email import send_otp_email

router = APIRouter(prefix="/delivery-tasks", tags=["Delivery Tasks"])

@router.post("/batch-verify")
async def verify_batch_pickup(
    req: BatchVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify a batch OTP to mark all tasks as PICKED_UP."""
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.batch_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid Batch OTP")
    
    if batch.status == "PICKED_UP":
         raise HTTPException(status_code=400, detail="Batch already picked up")

    # 1. Bulk Update Tasks (Performance Optimized)
    db.query(DeliveryTask).filter(DeliveryTask.batch_id == req.batch_id).update({
        DeliveryTask.status: DeliveryStatus.PICKED_UP
    }, synchronize_session=False)

    # 2. Update Batch Status
    batch.status = "PICKED_UP"
    
    # 3. Activity Log
    db.add(ActivityLog(
        action=f"Batch #{batch.id} Picked Up (OTP Verified)",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()

    # 4. Broadcast via WebSocket (Broadcast first 5 for notification, or generic message)
    from app.utils.websocket_manager import manager
    await manager.broadcast_to_admin({
        "type": "status_update", 
        "batch_id": batch.id, 
        "status": "PICKED_UP",
        "message": f"Batch #{batch.id} has been picked up."
    })

    return {"message": "Batch pickup verified", "batch_id": batch.id}

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

def map_task_to_dict(task: DeliveryTask, include_otp: bool = False) -> Optional[dict]:
    """
    Manually serialize a DeliveryTask to a dictionary to break circular ORM references
    (such as task.batch.tasks) that trigger infinite Pydantic recursion loops.
    """
    if not task:
        return None
        
    invoice_number = task.invoice_number or (task.invoice.invoice_number if task.invoice else None)
    order_reference = task.order_reference or (str(task.invoice.order_id) if (task.invoice and task.invoice.order_id) else None)
    
    task_dict = {
        "id": task.id,
        "invoice_id": task.invoice_id,
        "driver_id": task.driver_id,
        "customer_name": task.customer_name,
        "customer_address": task.customer_address,
        "customer_district": task.customer_district,
        "assignment_status_or_zone": task.assignment_status_or_zone,
        "contact_number": task.contact_number,
        "status": task.status.value if hasattr(task.status, "value") else task.status,
        "timestamp_logs": task.timestamp_logs,
        "challan_url": task.challan_url,
        "signature_url": task.signature_url,
        "delivery_photo_url": task.delivery_photo_url,
        "latitude": task.latitude,
        "longitude": task.longitude,
        "invoice_number": invoice_number,
        "order_reference": order_reference,
        "batch_id": task.batch_id,
        "created_at": task.created_at,
        
        "driver": {
            "id": task.driver.id,
            "username": task.driver.username,
            "role": task.driver.role.value if hasattr(task.driver.role, "value") else task.driver.role,
            "full_name": task.driver.full_name,
            "email": task.driver.email,
            "phone": task.driver.phone,
            "address_line": task.driver.address_line,
            "district": task.driver.district,
            "state": task.driver.state,
            "pincode": task.driver.pincode,
            "gstin": task.driver.gstin,
            "account_type": task.driver.account_type,
            "company_name": task.driver.company_name,
            "gst_no": task.driver.gst_no,
            "pan_no": task.driver.pan_no,
            "business_address": task.driver.business_address,
            "document_url": task.driver.document_url,
            "wallet_balance": task.driver.wallet_balance,
            "created_at": task.driver.created_at
        } if task.driver else None,
        
        # Flat batch serialization without tasks list to bypass circular ORM references
        "batch": {
            "id": task.batch.id,
            "driver_id": task.batch.driver_id,
            "batch_otp": task.batch.batch_otp,
            "status": task.batch.status,
            "created_at": task.batch.created_at
        } if task.batch else None
    }
    
    if include_otp:
        task_dict["pickup_otp"] = task.pickup_otp
        task_dict["delivery_otp"] = task.delivery_otp
        
    return task_dict

@router.get("/")
def get_delivery_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve all delivery tasks for admin or specific tasks for delivery personnel."""
    query = db.query(DeliveryTask).options(
        joinedload(DeliveryTask.invoice).joinedload(Invoice.order),
        joinedload(DeliveryTask.batch)
    ).order_by(DeliveryTask.id.desc())
    
    if current_user.role in [UserRole.admin, UserRole.ceo, UserRole.sales, UserRole.delivery_management]:
        tasks = query.all()
    elif current_user.role == UserRole.delivery or current_user.role == "driver":
        tasks = query.filter(DeliveryTask.driver_id == current_user.id).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    include_otp = current_user.role in [UserRole.admin, UserRole.ceo, UserRole.sales, UserRole.delivery_management]
    return [map_task_to_dict(t, include_otp=include_otp) for t in tasks]

@router.get("/drivers", response_model=List[UserRead])
def get_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch all users with role 'delivery' or 'driver'."""
    if current_user.role not in [UserRole.admin, UserRole.ceo, UserRole.delivery_management]:
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
        
    return [map_task_to_dict(t) for t in tasks]

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
    
    return map_task_to_dict(task)

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
    
    return map_task_to_dict(task)

@router.get("/{task_id}")
def get_task_detail(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch details for a specific task."""
    task = db.query(DeliveryTask)\
        .options(
            joinedload(DeliveryTask.invoice).joinedload(Invoice.order),
            joinedload(DeliveryTask.batch)
        )\
        .filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    include_otp = current_user.role in [UserRole.admin, UserRole.ceo, UserRole.sales]
    return map_task_to_dict(task, include_otp=include_otp)

@router.put("/{task_id}/assign")
def assign_driver(
    task_id: int,
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign a driver to a task and generate a pickup code."""
    if current_user.role not in [UserRole.admin, UserRole.ceo, UserRole.delivery_management]:
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
    # Normalize incoming parameter arrays for string matches comparison variables
    clean_otp = str(otp).strip()

    task = db.query(DeliveryTask).options(
        joinedload(DeliveryTask.batch)
    ).filter(DeliveryTask.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if the OTP matches either the task's pickup_otp or the batch's batch_otp
    is_valid = False
    used_batch_otp = False
    
    if task.pickup_otp == clean_otp:
        is_valid = True
    elif task.batch and task.batch.batch_otp == clean_otp:
        is_valid = True
        used_batch_otp = True
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Pickup OTP")
    
    if used_batch_otp:
        # Mark all tasks in the same batch as PICKED_UP
        for t in task.batch.tasks:
            log_status_change(t, DeliveryStatus.PICKED_UP)
        task.batch.status = "PICKED_UP"
        
        # Log Activity
        db.add(ActivityLog(
            action=f"Batch #{task.batch_id} Picked Up (OTP Verified via Task #{task.id})",
            category="Logistics",
            user_id=current_user.id
        ))
    else:
        log_status_change(task, DeliveryStatus.PICKED_UP)
        
        # Log Activity
        db.add(ActivityLog(
            action=f"Order #{task.invoice_number} Picked Up (OTP Verified)",
            category="Logistics",
            user_id=current_user.id
        ))
    
    db.commit()

    from app.utils.websocket_manager import manager
    if used_batch_otp:
        await manager.broadcast_to_admin({
            "type": "status_update", 
            "batch_id": task.batch_id, 
            "status": "PICKED_UP",
            "message": f"Batch #{task.batch_id} has been picked up."
        })
    else:
        await manager.broadcast_to_admin({"type": "status_update", "invoice": task.invoice_number, "status": "PICKED_UP"})

    return {"status": "success", "message": "Pickup successfully authenticated"}

@router.post("/bulk-assign", response_model=DeliveryBatchRead)
def bulk_assign(
    req: BulkAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Group multiple tasks into a batch and assign to a driver."""
    if current_user.role not in [UserRole.admin, UserRole.ceo, UserRole.delivery_management]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # 1. Validation
    tasks = db.query(DeliveryTask).filter(DeliveryTask.id.in_(req.task_ids)).all()
    if len(tasks) != len(req.task_ids):
        raise HTTPException(status_code=400, detail="One or more tasks not found")
    
    for t in tasks:
        if t.batch_id:
            raise HTTPException(status_code=400, detail=f"Task #{t.invoice_number} is already in a batch (Batch ID: {t.batch_id})")
        if t.status in [DeliveryStatus.PICKED_UP, DeliveryStatus.DELIVERED]:
            raise HTTPException(status_code=400, detail=f"Task #{t.invoice_number} has already been {t.status}")

    # 2. Create Batch
    otp = str(random.randint(100000, 999999))
    batch = DeliveryBatch(
        driver_id=req.driver_id,
        batch_otp=otp,
        status="PENDING"
    )
    db.add(batch)
    db.flush() # Get batch.id

    # 3. Bulk Update Tasks (Performance Optimized)
    db.query(DeliveryTask).filter(DeliveryTask.id.in_(req.task_ids)).update({
        DeliveryTask.batch_id: batch.id,
        DeliveryTask.driver_id: req.driver_id,
        DeliveryTask.status: DeliveryStatus.ASSIGNED
    }, synchronize_session=False)

    # 4. Activity Log
    db.add(ActivityLog(
        action=f"Bulk Assigned {len(req.task_ids)} tasks to Batch #{batch.id}",
        category="Logistics",
        user_id=current_user.id
    ))
    
    db.commit()
    db.refresh(batch)
    
    # Map tasks to a flat dictionary format to break the circular batch <-> task reference
    safe_tasks = []
    for task in tasks:
        # Resolve invoice_number and order_reference to ensure they exist for the frontend
        invoice_number = task.invoice_number or (task.invoice.invoice_number if task.invoice else None)
        order_reference = task.order_reference or (str(task.invoice.order_id) if (task.invoice and task.invoice.order_id) else None)
        
        safe_tasks.append({
            "id": task.id,
            "invoice_id": task.invoice_id,
            "driver_id": task.driver_id,
            "customer_name": task.customer_name,
            "customer_address": task.customer_address,
            "customer_district": task.customer_district,
            "assignment_status_or_zone": task.assignment_status_or_zone,
            "contact_number": task.contact_number,
            "status": task.status,
            "timestamp_logs": task.timestamp_logs,
            "challan_url": task.challan_url,
            "signature_url": task.signature_url,
            "delivery_photo_url": task.delivery_photo_url,
            "latitude": task.latitude,
            "longitude": task.longitude,
            "invoice_number": invoice_number,
            "order_reference": order_reference,
            "batch_id": task.batch_id,
            "created_at": task.created_at,
            "driver": {
                "id": task.driver.id,
                "username": task.driver.username,
                "role": task.driver.role,
                "full_name": task.driver.full_name,
                "email": task.driver.email,
                "phone": task.driver.phone,
                "address_line": task.driver.address_line,
                "district": task.driver.district,
                "state": task.driver.state,
                "pincode": task.driver.pincode,
                "gstin": task.driver.gstin,
                "account_type": task.driver.account_type,
                "company_name": task.driver.company_name,
                "gst_no": task.driver.gst_no,
                "pan_no": task.driver.pan_no,
                "business_address": task.driver.business_address,
                "document_url": task.driver.document_url,
                "wallet_balance": task.driver.wallet_balance,
                "created_at": task.driver.created_at
            } if task.driver else None,
            "batch": None
        })

    return {
        "id": batch.id,
        "driver_id": batch.driver_id,
        "batch_otp": batch.batch_otp,
        "status": batch.status,
        "created_at": batch.created_at,
        "tasks": safe_tasks,
        "driver": {
            "id": batch.driver.id,
            "username": batch.driver.username,
            "role": batch.driver.role,
            "full_name": batch.driver.full_name,
            "email": batch.driver.email,
            "phone": batch.driver.phone,
            "address_line": batch.driver.address_line,
            "district": batch.driver.district,
            "state": batch.driver.state,
            "pincode": batch.driver.pincode,
            "gstin": batch.driver.gstin,
            "account_type": batch.driver.account_type,
            "company_name": batch.driver.company_name,
            "gst_no": batch.driver.gst_no,
            "pan_no": batch.driver.pan_no,
            "business_address": batch.driver.business_address,
            "document_url": batch.driver.document_url,
            "wallet_balance": batch.driver.wallet_balance,
            "created_at": batch.driver.created_at
        } if batch.driver else None
    }



@router.put("/{task_id}/status")
def update_task_status(
    task_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update the status of a delivery task with logging."""
    if current_user.role not in [UserRole.admin, UserRole.delivery, "driver", UserRole.delivery_management]:
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
