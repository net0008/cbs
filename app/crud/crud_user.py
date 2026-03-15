from sqlalchemy.orm import Session
from app.db import models
from app.api.v1 import schemas
from app.core import security

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user_in: schemas.UserCreate):
    hashed_pass = security.get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pass,
        full_name=user_in.full_name,
        institution=user_in.institution,
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user