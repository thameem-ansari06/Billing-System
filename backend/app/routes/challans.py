from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import func
from app.database.db import get_db, get_next_id
from app.models.orm import DeliveryChallan, ChallanItem
from app.models.schemas import DeliveryChallanCreate, DeliveryChallanRead
from app.utils.calculations import calculate_gst_totals

router = APIRouter(prefix="/api/delivery-challans", tags=["Delivery Challans"])

@router.get("/next-number")
def get_next_challan_number():
    return {"next_number": get_next_id("DC", "delivery_challans", "challan_number")}

@router.get("/")
def get_all_challans(db: Session = Depends(get_db)):
    challans = db.query(DeliveryChallan).all()
    return {"delivery_challans": challans}

@router.post("/", response_model=DeliveryChallanRead)
def create_challan(challan_data: DeliveryChallanCreate, db: Session = Depends(get_db)):
    # Fetch a fresh number at save time to ensure no race conditions
    gn_challan_id = get_next_id("DC", "delivery_challans", "challan_number")
    
    # Recalculate totals on backend to ensure consistency
    items_dicts = [item.model_dump() for item in challan_data.items]
    # We ignore the grand_total sent from frontend and recalculate
    calc = calculate_gst_totals(items_dicts, challan_data.place_of_supply, challan_data.adjustment)
    
    try:
        db_challan = DeliveryChallan(
            challan_number=gn_challan_id,
            subtotal=calc["subtotal"],
            adjustment=calc["adjustment"],
            grand_total=calc["grand_total"],
            vehicle_number=challan_data.vehicle_number,
            driver_name=challan_data.driver_name,
            driver_mobile=challan_data.driver_mobile,
            transporter_name=challan_data.transporter_name,
            waybill_number=challan_data.waybill_number,
            dispatch_datetime=challan_data.dispatch_datetime or func.now(),
            **challan_data.model_dump(exclude={"items", "challan_number", "subtotal", "adjustment", "grand_total", "vehicle_number", "driver_name", "driver_mobile", "transporter_name", "waybill_number", "dispatch_datetime"})
        )
        db.add(db_challan)
        db.flush()
        
        for item_data in challan_data.items:
            db_item = ChallanItem(
                challan_id=db_challan.id,
                **item_data.model_dump()
            )
            db.add(db_item)
            
        db.commit()
        db.refresh(db_challan)

        # Generate PDF for Open Challans
        if db_challan.status == "Open":
            from app.utils.invoice_maker import generate_pdf_invoice
            generate_pdf_invoice(
                invoice_id=db_challan.challan_number,
                customer_email=db_challan.customer_name,
                items_list=[{
                    "Item Name": item.item_details,
                    "Quantity": item.quantity,
                    "Price": item.rate,
                    "Amount": item.amount
                } for item in db_challan.items],
                tax_data=calc,
                terms=db_challan.terms,
                logistics_data={
                    "vehicle_number": db_challan.vehicle_number,
                    "driver_name": db_challan.driver_name,
                    "driver_mobile": db_challan.driver_mobile,
                    "transporter_name": db_challan.transporter_name,
                    "waybill_number": db_challan.waybill_number,
                }
            )

        return db_challan
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pdf-view/{challan_number:path}")
def get_challan_pdf(challan_number: str, db: Session = Depends(get_db)):
    challan = db.query(DeliveryChallan).filter(DeliveryChallan.challan_number == challan_number).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
        
    items_list = [{
        "Item Name": item.item_details,
        "Quantity": item.quantity,
        "Price": item.rate,
        "Amount": item.amount
    } for item in challan.items]
    
    from app.utils.invoice_maker import generate_pdf_invoice
    
    # Recalculate or fetch tax data for the PDF
    items_dicts = [{"amount": item.amount, "tax_type": item.tax_type} for item in challan.items]
    from app.utils.calculations import calculate_gst_totals
    calc = calculate_gst_totals(items_dicts, challan.place_of_supply, challan.adjustment or 0)

    pdf_path, _ = generate_pdf_invoice(
        invoice_id=challan_number,
        customer_email=challan.customer_name,
        items_list=items_list,
        tax_data=calc,
        terms=challan.terms,
        logistics_data={
            "vehicle_number": challan.vehicle_number,
            "driver_name": challan.driver_name,
            "driver_mobile": challan.driver_mobile,
            "transporter_name": challan.transporter_name,
            "waybill_number": challan.waybill_number,
        }
    )
    
    import os
    from fastapi.responses import FileResponse
    if os.path.exists(pdf_path):
        down_name = challan_number.replace("/", "-").replace("\\", "-")
        return FileResponse(pdf_path, media_type='application/pdf', filename=f"{down_name}.pdf")
    else:
        raise HTTPException(status_code=500, detail="PDF generation failed")
