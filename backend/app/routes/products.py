import os
import shutil
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.db import get_db, get_next_id
from app.models.orm import Product
from app.models.schemas import ProductRead

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("/")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return {"products": products}

@router.post("/", response_model=ProductRead)
def create_product(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    stock_quantity: int = Form(0),
    db: Session = Depends(get_db)
):
    prod_id = get_next_id("PROD", "products", "product_id")
    image_url = None
    
    if image:
        file_ext = image.filename.split('.')[-1]
        
        # Flatten the ID to prevent arbitrary nested folder issues from '/' characters
        safe_prod_id = prod_id.replace('/', '-')
        file_name = f"{safe_prod_id}.{file_ext}"
        
        file_location = f"static/uploads/{file_name}"
        
        # Ensure deep directories exist if someone attempts nested strings later
        os.makedirs(os.path.dirname(file_location), exist_ok=True)
        
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        
        image_url = f"static/uploads/{file_name}"
        
    try:
        db_product = Product(
            product_id=prod_id,
            name=name,
            price=price,
            description=description,
            image_url=image_url,
            stock_quantity=stock_quantity
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    gst_percentage: Optional[float] = Form(None),
    stock_quantity: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    db_product = db.query(Product).filter(Product.product_id == product_id).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    if name is not None:
        db_product.name = name
    if price is not None:
        db_product.price = price
    if description is not None:
        db_product.description = description
    if gst_percentage is not None:
        db_product.gst_percentage = gst_percentage
    if stock_quantity is not None:
        db_product.stock_quantity = stock_quantity

    if image:
        file_ext = image.filename.split('.')[-1]
        safe_prod_id = product_id.replace('/', '-')
        file_name = f"{safe_prod_id}.{file_ext}"
        
        # Save explicitly to static/uploads/PROD/2026/ as requested by user
        file_location = f"static/uploads/PROD/2026/{file_name}"
        os.makedirs(os.path.dirname(file_location), exist_ok=True)
        
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        
        db_product.image_url = f"static/uploads/PROD/2026/{file_name}"

    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))