from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db, get_next_id
from app.models.orm import Quote, QuoteItem
from app.models.schemas import QuoteCreate, QuoteRead

router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

@router.get("/")
def get_all_quotes(db: Session = Depends(get_db)):
    quotes = db.query(Quote).all()
    return {"quotes": quotes}

@router.post("/", response_model=QuoteRead)
def create_quote(quote_data: QuoteCreate, db: Session = Depends(get_db)):
    # Generate Quote ID
    quote_id = get_next_id("QUOTE", "quotes", "quote_number")
    
    try:
        db_quote = Quote(
            quote_number=quote_id,
            **quote_data.model_dump(exclude={"items", "quote_number"})
        )
        db.add(db_quote)
        db.flush()
        
        for item_data in quote_data.items:
            db_item = QuoteItem(
                quote_id=db_quote.id,
                **item_data.model_dump()
            )
            db.add(db_item)
            
        db.commit()
        db.refresh(db_quote)
        return db_quote
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

