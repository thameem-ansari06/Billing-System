from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.db import get_db
from app.models.orm import Invoice

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.get("/stats")
def get_payment_stats(db: Session = Depends(get_db)):
    result = db.query(
        func.sum(Invoice.grand_total).label("total_billed"),
        func.sum(Invoice.amount_paid).label("total_received")
    ).first()

    total_billed = result.total_billed or 0.0
    total_received = result.total_received or 0.0
    total_pending = total_billed - total_received

    return {
        "total_billed": total_billed,
        "total_received": total_received,
        "total_pending": total_pending
    }
