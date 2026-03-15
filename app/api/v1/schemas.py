from pydantic import BaseModel, EmailStr
from typing import Optional
from app.db.models import UserRole

# Kayıt sırasında istenecek veriler
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    institution: Optional[str] = None
    role: UserRole = UserRole.TEACHER_PRO  # Varsayılanı pro öğretmen yapalım

# Kullanıcı bilgilerini geri dönerken şifreyi gizlemek için
class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

# Giriş sonrası verilecek Token yapısı
class Token(BaseModel):
    access_token: str
    token_type: str

class PointCreate(BaseModel):
    lat: float
    lng: float
    name: Optional[str] = "Yeni İşaret"