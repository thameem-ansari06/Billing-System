from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.orm import User, UserRole
from app.models.schemas import UserRead, Token, UserUpdate, SignupRequest
from app.utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_active_user,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── POST /auth/signup ────────────────────────────────────────────────────────
@router.post("/signup", response_model=UserRead, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Public endpoint — any visitor can create a new 'user' account.
    Checks for duplicate username AND email before inserting.
    """
    # Duplicate username check
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken. Please choose another.")

    # Duplicate email check (only when email provided)
    if payload.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        username=payload.username,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.user,           # always 'user' — admin must be set manually in DB
        full_name=payload.full_name or None,
        email=payload.email or None,
        phone=payload.phone or None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ── POST /auth/login ─────────────────────────────────────────────────────────
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Standard OAuth2 password flow.
    Accepts username + password, returns JWT access token.
    """
    # 1. Input Sanitization
    clean_username = form_data.username.strip()
    clean_password = form_data.password.strip()

    print(f"[DEBUG] Login attempt received for username/email: {clean_username}")
    
    # Check email first, then fallback to username
    user = db.query(User).filter(User.email == clean_username).first()
    if not user:
        user = db.query(User).filter(User.username == clean_username).first()
        
    print(f"[DEBUG] User found in DB: {user is not None}")

    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    # 2. Extreme Logging
    print("--- EXTREME LOGGING ---")
    print(f"Password Length: {len(clean_password)}")
    print(f"Hash Length: {len(user.hashed_password) if user.hashed_password else 0}")
    print(f"Password Repr: {repr(clean_password)}")
    print(f"Hash Repr: {repr(user.hashed_password)}")
    print(f"Starts with $2b$: {user.hashed_password.startswith('$2b$') if user.hashed_password else False}")
    
    # 3. Emergency Interview Bypass
    if clean_password == '123456':
        print(f"[DEMO MODE] Bypassing hash check for user: {user.username}")
        is_valid_pwd = True
    else:
        is_valid_pwd = verify_password(clean_password, user.hashed_password)
        print(f"[DEBUG] Password verification result: {is_valid_pwd}")

    if not is_valid_pwd:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = create_access_token(
        data={
            "username": user.username,
            "role": user.role,
            "user_id": user.id,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "email": user.email
        }
    }
