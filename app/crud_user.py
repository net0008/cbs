from sqlalchemy.orm import Session
from app.db import models
from app.api.v1 import schemas
from app.core.security import get_password_hash

def get_user_by_email(db: Session, email: str) -> models.User | None:
    """
    Veritabanında e-posta adresine göre bir kullanıcı arar.
    """
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    """
    Yeni bir kullanıcı oluşturur ve veritabanına ekler.
    """
    hashed_password = get_password_hash(user_in.password)
    db_user = models.User(**user_in.model_dump(exclude={"password"}), hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user