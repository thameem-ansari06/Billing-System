from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db, get_next_id
from app.models.orm import Product
from app.models.schemas import ProductModel, ProductRead

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("/")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return {"products": products}


@router.post("/", response_model=ProductRead)
def create_product(prod_data: ProductModel, db: Session = Depends(get_db)):
    # Generate Product ID
    prod_id = get_next_id("PROD", "products", "product_id")
    
    try:
        db_product = Product(
            product_id=prod_id,
            **prod_data.model_dump()
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))