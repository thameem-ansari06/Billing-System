from sqlalchemy import text, inspect
from app.database.db import SessionLocal, engine

def fix_tax_nulls():
    db = SessionLocal()
    inspector = inspect(engine)
    try:
        print("Starting Global Database Data Integrity Fix...")
        
        # 1. Update Invoices
        print("Processing 'invoices' table...")
        db.execute(text("UPDATE invoices SET cgst = 0.0 WHERE cgst IS NULL;"))
        db.execute(text("UPDATE invoices SET sgst = 0.0 WHERE sgst IS NULL;"))
        db.execute(text("UPDATE invoices SET igst = 0.0 WHERE igst IS NULL;"))
        
        # 2. Update Quotes
        print("Processing 'quotes' table...")
        db.execute(text("UPDATE quotes SET cgst = 0.0 WHERE cgst IS NULL;"))
        db.execute(text("UPDATE quotes SET sgst = 0.0 WHERE sgst IS NULL;"))
        db.execute(text("UPDATE quotes SET igst = 0.0 WHERE igst IS NULL;"))
        
        # 3. Check Invoice Items (Safe Check)
        print("Checking 'invoice_items' table...")
        columns = [c['name'] for c in inspector.get_columns('invoice_items')]
        tax_cols = [col for col in ['cgst', 'sgst', 'igst'] if col in columns]
        
        if tax_cols:
            for col in tax_cols:
                print(f"Updating {col} in invoice_items...")
                db.execute(text(f"UPDATE invoice_items SET {col} = 0.0 WHERE {col} IS NULL;"))
        else:
            print("Note: 'invoice_items' does not contain cgst/sgst/igst columns. Skipping.")
            
        db.commit()
        print("Success: Global Data Integrity Fix Complete.")
    except Exception as e:
        db.rollback()
        print(f"Error during integrity fix: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_tax_nulls()
