import os
import shutil
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.db import get_db, get_next_id
from app.models.orm import Product
from app.models.schemas import ProductRead

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return {"products": products}

import json

@router.post("/", response_model=ProductRead)
def create_product(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    stock_quantity: int = Form(0),
    db: Session = Depends(get_db)
):
    prod_id = get_next_id("PROD", "products", "product_id")
    image_urls = []
    
    if images:
        for idx, img in enumerate(images):
            file_ext = img.filename.split('.')[-1]
            safe_prod_id = prod_id.replace('/', '-')
            file_name = f"{safe_prod_id}_{idx}.{file_ext}"
            
            file_location = f"static/uploads/PROD/2026/{file_name}"
            os.makedirs(os.path.dirname(file_location), exist_ok=True)
            
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(img.file, file_object)
            
            image_urls.append(f"static/uploads/PROD/2026/{file_name}")
            
    try:
        db_product = Product(
            product_id=prod_id,
            name=name,
            price=price,
            description=description,
            image_url=image_urls[0] if image_urls else None,
            image_urls=image_urls,
            stock_quantity=stock_quantity
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{product_id:path}", response_model=ProductRead)
def update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    gst_percentage: Optional[float] = Form(None),
    stock_quantity: Optional[int] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    remaining_images: Optional[str] = Form(None), # JSON list of existing URLs to keep
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

    current_urls = []
    if remaining_images:
        try:
            current_urls = json.loads(remaining_images)
        except:
            current_urls = db_product.image_urls or []
    else:
        # If not provided, we might want to keep current ones or clear them?
        # Usually, if 'images' is provided but not 'remaining_images', it means overwrite.
        # But let's be safe and keep current if neither is provided.
        current_urls = db_product.image_urls or []

    if images:
        for idx, img in enumerate(images):
            file_ext = img.filename.split('.')[-1]
            safe_prod_id = product_id.replace('/', '-')
            import time
            file_name = f"{safe_prod_id}_{int(time.time())}_{idx}.{file_ext}"
            
            file_location = f"static/uploads/PROD/2026/{file_name}"
            os.makedirs(os.path.dirname(file_location), exist_ok=True)
            
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(img.file, file_object)
            
            current_urls.append(f"static/uploads/PROD/2026/{file_name}")

    db_product.image_urls = current_urls
    db_product.image_url = current_urls[0] if current_urls else None

    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
