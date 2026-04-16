from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import setup_db
from app.routes import customers, invoices # 👈 Namma pudhu routes
from app.routes import customers, products, invoices, quotes, challans
app = FastAPI(title="Enterprise AR Hub API")

# Initial DB Setup
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

@app.get("/")
def root():
    return {"message": "API is online and modularized! 🚀"}

@app.get("/")
def health():
    return {"status": "Active", "mode": "Modular"}