from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.orm import User
from app.models.schemas import UserRead, UserUpdate
from app.utils.auth import (
    verify_password,
    get_password_hash,
    get_current_active_user,
)

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_active_user)):
    """Fetch the logged-in user's details."""
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
    if update.city is not None:
        current_user.city = update.city
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
