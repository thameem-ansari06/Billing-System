from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import engine, Base, setup_db
from app.routes import customers, products, invoices, quotes, challans, payments, auth, orders, admin, delivery, dashboard, users
from app.models import orm # Import models to ensure they are registered
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Enterprise AR Hub API")

# Create static directories if they don't exist
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

Base.metadata.create_all(bind=engine)
setup_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_csp_header(request, call_next):
    response = await call_next(request)
    # Set CSP header to allow eval and inline scripts for React development
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: http://localhost:8000; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' http://localhost:8000 ws://localhost:8000"
    )
    return response

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[DEBUG] Incoming Request Path: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# 🔗 Connect the modular routes
app.include_router(auth.router,prefix="/api")
app.include_router(users.router,prefix="/api")
app.include_router(orders.router,prefix="/api")
app.include_router(customers.router,prefix="/api")
app.include_router(products.router,prefix="/api")
app.include_router(invoices.router,prefix="/api")
app.include_router(quotes.router,prefix="/api")
app.include_router(challans.router,prefix="/api")
app.include_router(payments.router,prefix="/api")
app.include_router(admin.router,prefix="/api")
app.include_router(delivery.router,prefix="/api")
app.include_router(dashboard.router,prefix="/api")

@app.get("/")
def root():
    return {"message": "API is online with SQLAlchemy ORM! --- Rocket"}

@app.get("/health")
def health():
    return {"status": "Active", "mode": "ORM"}

