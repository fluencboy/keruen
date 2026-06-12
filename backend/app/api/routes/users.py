from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import User
from app.schemas import UserOut
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserOut])
async def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return db.query(User).all()

@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "operator"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
