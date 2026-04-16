from fastapi import APIRouter, HTTPException
from app.database.db import get_db
from app.models.schemas import ProductModel
import time

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("/")
def get_all_products():
    conn = get_db()
    products = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return {"products": [dict(p) for p in products]}

@router.post("/")
def create_product(prod: ProductModel):
    conn = get_db()
    c = conn.cursor()
    prod_id = f"PROD-{int(time.time())}"
    try:
        c.execute("INSERT INTO products (product_id, name, price) VALUES (?, ?, ?)", 
                  (prod_id, prod.name, prod.price))
        conn.commit()
        return {"message": "Product Added", "id": prod_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()