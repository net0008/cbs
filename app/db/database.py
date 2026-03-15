from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# DATABASE_URL'i okuyoruz
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Eğer URL gelmezse uygulama hata versin ki nerede olduğunu bilelim
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("HATA: DATABASE_URL ortam değişkeni bulunamadı!")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()