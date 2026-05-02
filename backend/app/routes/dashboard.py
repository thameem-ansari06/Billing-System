from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.orm import Invoice, DeliveryTask, User
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve high-level business statistics."""
    # This matches the structure expected by DashboardTab.jsx
    invoices = db.query(Invoice).all()
    
    total_revenue = sum(inv.grand_total for inv in invoices if inv.grand_total)
    # total_pending: invoices that are not 'Paid' or 'Rejected'
    total_pending = sum(inv.grand_total for inv in invoices if inv.status not in ["Paid", "Rejected"])
    
    # Recent transactions (last 5 invoices)
    recent = db.query(Invoice).order_by(Invoice.id.desc()).limit(5).all()
    
    # Format recent invoices for serialization
    formatted_recent = []
    for inv in recent:
        formatted_recent.append({
            "invoice_id": inv.invoice_number,
            "email": inv.email or "N/A",
            "grand_total": inv.grand_total or 0,
            "status": inv.status or "Draft"
        })

    return {
        "total_invoices": len(invoices),
        "total_revenue": total_revenue,
        "total_pending": total_pending,
        "recent": formatted_recent
    }
