from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, String
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database.db import get_db
from app.models.orm import DeliveryTask, User, ZoneRegistry, DistrictZoneMapping, Order, DeliveryStatus

router = APIRouter(prefix="/logistics", tags=["Logistics"])

# ── GET: /api/logistics/metrics ──────────────────────────────────────────────────

@router.get("/metrics")
def get_logistics_metrics(db: Session = Depends(get_db)):
    """
    Aggregates real-time logistics counters:
    - Total unassigned pending pooling tasks (Metric 1).
    - Total online available delivery agents (Metric 2).
    - Regional pending pooling breakdown grouped by zone codes (Metric 3).
    """
    try:
        from app.models.enums import UserRole
        
        # Metric 1 (Unassigned Pool): Scalar aggregation query, counting all Pending_Pooling rows
        unassigned_count = (
            db.query(func.count(DeliveryTask.id))
            .filter(DeliveryTask.assignment_status == "Pending_Pooling")
            .scalar()
        ) or 0
        
        # Metric 2 (Online Operators): Count of profiles matching role='delivery_agent' and is_available=TRUE case-insensitively
        online_agents = (
            db.query(func.count(User.id))
            .filter(
                func.upper(cast(User.role, String)).in_(["DELIVERY", "DELIVERY_AGENT"]),
                User.is_available == True
            )
            .scalar()
        ) or 0
        
        # Metric 3 (Zone-wise Allocation Breakdowns): LEFT JOIN mapping zone_registry against delivery_tasks
        # filtered on assignment_status = 'Pending_Pooling', grouped by zone_registry.zone_code.
        zone_query_results = (
            db.query(
                func.upper(func.trim(ZoneRegistry.zone_code)),
                func.count(DeliveryTask.id).label("pending_count")
            )
            .outerjoin(
                DeliveryTask,
                (func.upper(func.trim(ZoneRegistry.zone_code)) == func.upper(func.trim(DeliveryTask.assignment_status_or_zone))) & 
                (DeliveryTask.assignment_status == "Pending_Pooling")
            )
            .group_by(ZoneRegistry.zone_code)
            .all()
        )
        
        # Initialize the strict structure React expects
        zone_breakdown = {
            "ZONE_1": 0,
            "ZONE_2": 0,
            "ZONE_3": 0
        }
        
        for zone_code, pending_count in zone_query_results:
            if zone_code is not None:
                raw_zone_string = str(zone_code).strip().upper()
                # Force replace spaces with underscores to match React's layout
                formatted_key = raw_zone_string.replace(" ", "_") 
                
                # Safely assign if it matches our expected schema
                if formatted_key in zone_breakdown:
                    zone_breakdown[formatted_key] = pending_count
                # Fallback logic if database uses IDs instead of strings (1 -> ZONE_1)
                elif str(zone_code) == "1": zone_breakdown["ZONE_1"] = pending_count
                elif str(zone_code) == "2": zone_breakdown["ZONE_2"] = pending_count
                elif str(zone_code) == "3": zone_breakdown["ZONE_3"] = pending_count
                
        # Serialization and Payload Interface Structure matching frontend hydration hooks exactly
        return {
            "unassigned_count": unassigned_count,
            "online_agents": online_agents,
            "zone_breakdown": zone_breakdown,
            "total_parcels": unassigned_count,
            
            # Supporting camelCase keys for dual-compatibility with React dashboard components
            "unassignedCount": unassigned_count,
            "onlineAgents": online_agents,
            "zoneBreakdown": zone_breakdown,
            "totalParcels": unassigned_count
        }
    except Exception as e:
        # Resilient Exception Boundaries: print error logs and raise 500 HTTPException
        import logging
        logging.error(f"[LOGISTICS METRICS ERROR] Database layer fault: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to aggregate logistics metrics: {str(e)}"
        )

# ── Pydantic Request & Response Payloads ──────────────────────────────────────────

class OrderPoolingRequest(BaseModel):
    order_id: int
    customer_district: str

class AgentAutoAssignmentRequest(BaseModel):
    zone_code: str

class AgentProfileResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    assigned_zone_code: Optional[str]
    is_available: bool

class AutoAssignmentResponse(BaseModel):
    assigned_count: int
    agent: AgentProfileResponse

# ── POST: /api/logistics/process-zone-pooling ─────────────────────────────────────

@router.post("/process-zone-pooling", status_code=201)
def process_zone_pooling(payload: OrderPoolingRequest, db: Session = Depends(get_db)):
    """
    Classifies a customer's order by their district into a geographic zone
    and inserts a pending delivery task.
    """
    # 1. Refinement 2: Dynamic Input Cleaning (String Strip & Trimming Gate)
    cleaned_district = payload.customer_district.strip()
    if not cleaned_district:
        raise HTTPException(
            status_code=400,
            detail="Customer district string cannot be empty or solely whitespace."
        )
    
    # 2. Strict case-insensitive relational join to locate mapped zone
    mapping = (
        db.query(DistrictZoneMapping)
        .filter(func.lower(DistrictZoneMapping.district_name) == cleaned_district.lower())
        .first()
    )
    
    if not mapping:
        raise HTTPException(
            status_code=404, 
            detail=f"District '{cleaned_district}' is currently unmapped to any geographic zone."
        )
    
    # 3. Retrieve order details to populate task information (optional but makes task detailed)
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Order with ID {payload.order_id} does not exist."
        )

    # Initialize customer info based on order user
    customer_name = "Walk-in Customer"
    customer_address = "District: " + cleaned_district
    contact_number = None

    if order.user:
        customer_name = order.user.full_name or order.user.username
        customer_address = order.user.address_line or customer_address
        contact_number = order.user.phone

    # 4. Insert new delivery workflow tracking task
    # Refinement 1: order_id is strictly NOT NULL
    try:
        new_task = DeliveryTask(
            order_id=payload.order_id,
            zone_id=mapping.zone_id,
            delivery_agent_id=None,
            driver_id=None,
            assignment_status="Pending_Pooling",
            status=DeliveryStatus.PENDING, # Pending pickup assignment
            customer_name=customer_name,
            customer_address=customer_address,
            customer_district=cleaned_district.strip().upper(),
            assignment_status_or_zone=mapping.zone.zone_code.strip().upper() if (mapping and mapping.zone) else "ZONE_2",
            contact_number=contact_number,
            order_reference=str(payload.order_id),
            timestamp_logs={"PENDING": datetime.now().isoformat()}
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database transaction failed while creating delivery task: {str(e)}"
        )
    
    return {
        "message": "Order pooled successfully.",
        "task_id": new_task.id,
        "order_id": new_task.order_id,
        "zone_id": new_task.zone_id,
        "assignment_status": new_task.assignment_status
    }

# ── POST: /api/logistics/trigger-agent-auto-assignment ──────────────────────────────

@router.post("/trigger-agent-auto-assignment", response_model=AutoAssignmentResponse)
def trigger_agent_auto_assignment(payload: AgentAutoAssignmentRequest, db: Session = Depends(get_db)):
    """
    Locates the least-loaded online/available delivery agent for a target zone,
    fetches all unassigned tasks inside that zone, and performs bulk assignment
    inside a single transaction block with database rollback safeguards.
    """
    # 1. Clean payload and lookup the target zone registry record case-insensitively
    sanitized_zone_code = payload.zone_code.strip().upper().replace(" ", "_")
    zone = db.query(ZoneRegistry).filter(func.upper(func.trim(ZoneRegistry.zone_code)) == sanitized_zone_code).first()
    if not zone:
        raise HTTPException(
            status_code=404,
            detail=f"Zone code '{payload.zone_code}' is not registered."
        )

    # 2. Least-Loaded Agent Auto-Assignment Balancing
    # We join with delivery_tasks to find active assignments (assignment_status = 'Assigned')
    # and sort by the task count ASC, handling ties by ID to select the least-loaded agent.
    # We filter case-insensitively on assigned_zone_code for online available agents.
    agent_data = (
        db.query(User, func.count(DeliveryTask.id).label("active_task_count"))
        .outerjoin(
            DeliveryTask,
            (DeliveryTask.delivery_agent_id == User.id) & (DeliveryTask.assignment_status == "Assigned")
        )
        .filter(
            func.upper(cast(User.role, String)).in_(["DELIVERY", "DELIVERY_AGENT"]),
            func.upper(func.trim(User.assigned_zone_code)) == sanitized_zone_code,
            User.is_available == True
        )
        .group_by(User.id)
        .order_by(func.count(DeliveryTask.id).asc(), User.id.asc())
        .first()
    )

    if not agent_data:
        raise HTTPException(
            status_code=404,
            detail=f"No online and available delivery agent found for zone '{payload.zone_code}'."
        )

    agent, active_task_count = agent_data

    # 3. Retrieve all unassigned packages clustered inside this target zone
    # CRITICAL CONNECTIVITY REPAIR: Fetch tasks where zone_id matches OR the string key assignment_status_or_zone matches
    tasks_to_assign = (
        db.query(DeliveryTask)
        .filter(
            ((DeliveryTask.zone_id == zone.id) | (func.upper(func.trim(DeliveryTask.assignment_status_or_zone)) == sanitized_zone_code)),
            DeliveryTask.assignment_status == "Pending_Pooling"
        )
        .all()
    )

    assigned_count = len(tasks_to_assign)

    # 4. Bulk update those task rows inside a singular database transaction block with rollback safeguards
    if assigned_count > 0:
        task_ids = [t.id for t in tasks_to_assign]
        try:
            # Backfill zone_id during assignment to guarantee absolute database relational integrity
            db.query(DeliveryTask).filter(DeliveryTask.id.in_(task_ids)).update({
                "delivery_agent_id": agent.id,
                "driver_id": agent.id, # Keep driver_id in sync for backward compatibility
                "assignment_status": "Assigned",
                "status": DeliveryStatus.ASSIGNED, # Update delivery task status to ASSIGNED
                "zone_id": zone.id # Backfill zone_id
            }, synchronize_session=False)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Relational rollback executed due to bulk assignment error: {str(e)}"
            )

    return {
        "assigned_count": assigned_count,
        "agent": {
            "id": agent.id,
            "username": agent.username,
            "full_name": agent.full_name,
            "email": agent.email,
            "phone": agent.phone,
            "assigned_zone_code": agent.assigned_zone_code,
            "is_available": agent.is_available
        }
    }
