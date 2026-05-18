import os
import shutil
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.db import get_db, get_next_id
from app.models.orm import Product
from app.models.schemas import ProductRead

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_deleted == False).all()
    return {"products": products}

import json
import pandas as pd
import io
from fastapi.responses import StreamingResponse
from app.database.db import get_db, get_next_id

def save_product_helper(db: Session, prod_data: dict):
    """Shared helper to handle UPSERT logic by Name or HSN."""
    name = prod_data.get("name")
    hsn = prod_data.get("hsn_code")
    
    # Try to find existing product by Name or HSN
    existing = None
    if hsn:
        existing = db.query(Product).filter(Product.hsn_code == hsn).first()
    if not existing and name:
        existing = db.query(Product).filter(Product.name == name).first()
        
    if existing:
        # Update existing
        if "price" in prod_data: existing.price = prod_data["price"]
        if "description" in prod_data: existing.description = prod_data["description"]
        if "stock_quantity" in prod_data: 
            existing.stock_quantity += int(prod_data["stock_quantity"])
        if "gst_percentage" in prod_data: existing.gst_percentage = prod_data["gst_percentage"]
        if "category" in prod_data: existing.category = prod_data["category"]
        if "image_url" in prod_data: existing.image_url = prod_data["image_url"]
        if "image_urls" in prod_data: existing.image_urls = prod_data["image_urls"]
        if "type" in prod_data: existing.type = prod_data["type"]
        if "unit" in prod_data: existing.unit = prod_data["unit"]
        if "tax_preference" in prod_data: existing.tax_preference = prod_data["tax_preference"]
        db.commit()
        db.refresh(existing)
        return existing, False # False means not a new creation
    else:
        # Create new
        prod_id = get_next_id("PROD", "products", "product_id")
        db_product = Product(
            product_id=prod_id,
            name=name,
            price=prod_data.get("price", 0),
            description=prod_data.get("description"),
            image_url=prod_data.get("image_url"),
            image_urls=prod_data.get("image_urls", []),
            stock_quantity=prod_data.get("stock_quantity", 0),
            hsn_code=hsn,
            category=prod_data.get("category"),
            type=prod_data.get("type", "Goods"),
            unit=prod_data.get("unit", "pcs"),
            tax_preference=prod_data.get("tax_preference", "Taxable"),
            gst_percentage=prod_data.get("gst_percentage", 18.0),
            is_deleted=False
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product, True

@router.post("/", response_model=ProductRead)
def create_product(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    stock_quantity: int = Form(0),
    hsn_code: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    image_urls = []
    if images:
        # Use a temporary ID for file naming if we don't have one yet
        # But save_product_helper generates one. Let's use a timestamp for naming if needed.
        for idx, img in enumerate(images):
            file_ext = img.filename.split('.')[-1]
            import time
            file_name = f"manual_{int(time.time())}_{idx}.{file_ext}"
            file_location = f"static/uploads/PROD/2026/{file_name}"
            os.makedirs(os.path.dirname(file_location), exist_ok=True)
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(img.file, file_object)
            image_urls.append(file_location)
            
    prod_data = {
        "name": name,
        "price": price,
        "description": description,
        "stock_quantity": stock_quantity,
        "image_url": image_urls[0] if image_urls else None,
        "image_urls": image_urls,
        "hsn_code": hsn_code,
        "category": category
    }
    
    product, created = save_product_helper(db, prod_data)
    return product

@router.get("/template")
def download_template():
    """Generates an Excel template for bulk upload."""
    df = pd.DataFrame(columns=[
        "type", "product_name", "unit", "tax_preference", "hsn_code", "category", 
        "price", "stock_quantity", "description", "gst_percentage", "image_urls"
    ])
    # Add an example row
    df.loc[0] = [
        "Goods", "Example Product", "pcs", "Taxable", "HSN1234", "Electronics", 
        999.0, 10, "Example description", 18.0, "https://example.com/img1.jpg, static/uploads/PROD/2026/img2.jpg"
    ]
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Template')
    
    output.seek(0)
    headers = {
        'Content-Disposition': 'attachment; filename="inventory_template.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/export")
def export_inventory(db: Session = Depends(get_db)):
    """Exports all active products to an Excel file."""
    products = db.query(Product).filter(Product.is_deleted == False).all()
    
    export_data = []
    for p in products:
        export_data.append({
            "type": p.type,
            "product_name": p.name,
            "unit": p.unit,
            "tax_preference": p.tax_preference,
            "hsn_code": p.hsn_code,
            "category": p.category,
            "price": p.price,
            "stock_quantity": p.stock_quantity,
            "description": p.description,
            "gst_percentage": p.gst_percentage,
            "image_urls": ", ".join(p.image_urls) if p.image_urls else ""
        })
        
    df = pd.DataFrame(export_data)
    
    # Reorder columns to match template exactly
    cols = ["type", "product_name", "unit", "tax_preference", "hsn_code", "category", "price", "stock_quantity", "description", "gst_percentage", "image_urls"]
    # Ensure all columns exist even if empty
    for col in cols:
        if col not in df.columns:
            df[col] = ""
    df = df[cols]
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Inventory')
    
    output.seek(0)
    filename = f"Inventory_Export_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.post("/upload-bulk")
async def upload_bulk(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Processes bulk product upload via Excel or CSV."""
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        required_cols = ["product_name", "price"]
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
        
        results = {"created": 0, "updated": 0, "errors": []}
        
        for index, row in df.iterrows():
            try:
                # Basic validation
                if pd.isna(row['product_name']) or pd.isna(row['price']):
                    results["errors"].append(f"Row {index+2}: Missing Name or Price")
                    continue
                
                # Image parsing: comma separated string to list
                image_list = []
                if not pd.isna(row.get('image_urls')):
                    image_list = [url.strip() for url in str(row['image_urls']).split(',') if url.strip()]
                
                prod_data = {
                    "name": str(row['product_name']),
                    "price": float(row['price']),
                    "stock_quantity": int(row['stock_quantity']) if not pd.isna(row.get('stock_quantity')) else 0,
                    "hsn_code": str(row['hsn_code']) if not pd.isna(row.get('hsn_code')) else None,
                    "category": str(row['category']) if not pd.isna(row.get('category')) else None,
                    "description": str(row['description']) if not pd.isna(row.get('description')) else None,
                    "type": str(row['type']) if not pd.isna(row.get('type')) else "Goods",
                    "unit": str(row['unit']) if not pd.isna(row.get('unit')) else "pcs",
                    "tax_preference": str(row['tax_preference']) if not pd.isna(row.get('tax_preference')) else "Taxable",
                    "gst_percentage": float(row['gst_percentage']) if not pd.isna(row.get('gst_percentage')) else 18.0,
                    "image_urls": image_list,
                    "image_url": image_list[0] if image_list else None
                }
                
                _, created = save_product_helper(db, prod_data)
                if created: results["created"] += 1
                else: results["updated"] += 1
                
            except Exception as row_err:
                results["errors"].append(f"Row {index+2}: {str(row_err)}")
                
        return results
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File processing error: {str(e)}")

@router.post("/bulk-delete")
def bulk_delete_products(product_ids: List[str], db: Session = Depends(get_db)):
    try:
        db.query(Product).filter(Product.product_id.in_(product_ids)).update({Product.is_deleted: True}, synchronize_session=False)
        db.commit()
        return {"message": f"{len(product_ids)} products deleted successfully"}
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

@router.delete("/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.product_id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        db_product.is_deleted = True
        db.commit()
        return {"message": f"Product {product_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
