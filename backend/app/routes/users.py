from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.db import get_db
from app.models.orm import User
from app.models.schemas import UserRead, UserUpdate
from app.utils.auth import (
    verify_password,
    get_password_hash,
    get_current_active_user,
)

from typing import List
router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/all", response_model=List[UserRead])
def get_all_users(db: Session = Depends(get_db)):
    """Fetch all users with 'user' or 'customer' role for the admin dropdown."""
    return db.query(User).filter(User.role.in_(['user', 'customer'])).all()

@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Fetch the logged-in user's details with wallet balance."""
    from app.models.orm import Advance
    # Calculate available balance
    balance = db.query(func.sum(Advance.amount)).filter(
        Advance.customer_id == current_user.id,
        Advance.is_adjusted == False
    ).scalar() or 0.0
    
    current_user.wallet_balance = balance
    return current_user

@router.put("/me", response_model=UserRead)
def update_me(
    update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Allow the logged-in user to update their profile and/or change password."""
    if update.full_name is not None:
        current_user.full_name = update.full_name
    if update.email is not None:
        current_user.email = update.email
    if update.phone is not None:
        current_user.phone = update.phone
    if update.address_line is not None:
        current_user.address_line = update.address_line
    if update.district is not None:
        current_user.district = update.district
    if update.state is not None:
        current_user.state = update.state
    if update.pincode is not None:
        current_user.pincode = update.pincode
    if update.gstin is not None:
        current_user.gstin = update.gstin

    if update.new_password:
        if not update.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not verify_password(update.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = get_password_hash(update.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user
