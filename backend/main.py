from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import engine, Base, setup_db
from app.routes import customers, products, invoices, quotes, challans, payments
from app.models import orm # Import models to ensure they are registered

app = FastAPI(title="Enterprise AR Hub API")

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)
setup_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔗 Connect the modular routes
app.include_router(customers.router)
app.include_router(products.router)
app.include_router(invoices.router)
app.include_router(quotes.router)
app.include_router(challans.router)
app.include_router(payments.router)

@app.get("/")
def root():
    return {"message": "API is online with SQLAlchemy ORM! --- Rocket"}

@app.get("/health")
def health():
    return {"status": "Active", "mode": "ORM"}
