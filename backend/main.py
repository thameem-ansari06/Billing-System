import os
from pathlib import Path
from dotenv import load_dotenv

# ── LAYER 1: Force .env load with explicit absolute path ──────────────────────
# .env lives at project root (D:/AR_Automation/.env), one level above /backend/
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

# ── LAYER 2: Startup boot verification log ───────────────────────────────────
# Printed to uvicorn console on every server start — confirms env state BEFORE
# any router modules (which call os.getenv) are imported.
print("\n" + "="*60)
print("[BOOT] Environment Verification")
print(f"[BOOT] .env path       : {_ENV_PATH}")
print(f"[BOOT] .env exists     : {_ENV_PATH.exists()}")
print(f"[BOOT] DATABASE_URL    : {'SET' if os.getenv('DATABASE_URL') else 'MISSING'}")
print(f"[BOOT] NVIDIA_API_KEY  : {'SET' if os.getenv('NVIDIA_API_KEY') else 'MISSING'}")
print(f"[BOOT] MAIL_USERNAME   : {'SET' if os.getenv('MAIL_USERNAME') else 'MISSING'}")
print(f"[BOOT] RAZORPAY_KEY_ID : {'SET' if os.getenv('RAZORPAY_KEY_ID') else 'MISSING'}")
print("="*60 + "\n")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import engine, Base, setup_db
from app.routes import customers, products, invoices, quotes, challans, payments, auth, orders, delivery, dashboard, users, logistics
from app.routes.admin import router as admin_router
from app.models import orm # Import models to ensure they are registered
from fastapi.staticfiles import StaticFiles
from app.routes import admin_chat

app = FastAPI(title="Enterprise AR Hub API")

# Create static directories if they don't exist
static_invoices_path = os.path.join(os.getcwd(), "static", "invoices")
os.makedirs(static_invoices_path, exist_ok=True)
os.makedirs("static/uploads", exist_ok=True)
os.makedirs("static/backups", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/api/static", StaticFiles(directory="static"), name="api_static")

Base.metadata.create_all(bind=engine)
setup_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ar-automation-thameem.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_csp_header(request, call_next):
    response = await call_next(request)
    
    # Combined and cleaned up CSP directives
    csp_directives = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "img-src 'self' data: https: http:; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://billing-system-jk1c.onrender.com "
        "wss://billing-system-jk1c.onrender.com http://localhost:8000 "
        "ws://localhost:8000 http://localhost:5173 ws://localhost:5173 "
        "http://localhost:3000 ws://localhost:3000;"
    )
    
    response.headers["Content-Security-Policy"] = csp_directives
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
app.include_router(admin_router,prefix="/api")
app.include_router(delivery.router,prefix="/api")
app.include_router(dashboard.router,prefix="/api")
app.include_router(logistics.router,prefix="/api")
app.include_router(admin_chat.router)

@app.get("/")
def root():
    return {"message": "API is online with SQLAlchemy ORM! --- Rocket"}

@app.get("/health")
def health():
    return {"status": "Active", "mode": "ORM"}

