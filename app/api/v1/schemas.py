from pydantic import BaseModel, EmailStr
from typing import Optional, List
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

# API'den dönen genel mesajlar için
class Message(BaseModel):
    message: str

# Nokta verisi dönerken kullanılacak model
class PointOut(BaseModel):
    id: int
    name: str
    category: str
    lat: float
    lng: float

    class Config:
        from_attributes = True

# Poligon verisi dönerken kullanılacak model
class PolygonOut(BaseModel):
    id: int
    name: str
    geometry: dict # GeoJSON objesi için

    class Config:
        from_attributes = True

class PointCreate(BaseModel):
    lat: float
    lng: float
    name: Optional[str] = "Yeni İşaret"

class LatLng(BaseModel):
    lat: float
    lng: float

class NodeData(BaseModel):
    latlng: LatLng
    info: str

class AssignmentCreate(BaseModel):
    title: str
    assignment_type: str # "POINT", "LINESTRING" veya "POLYGON"
    start: NodeData
    end: Optional[NodeData] = None   # Optional eklendi
    path: Optional[List[LatLng]] = [] # Optional eklendi
    status: str = "published"

# Görev oluşturulduktan sonra dönen yanıt
class AssignmentOut(BaseModel):
    id: int
    message: str
    status: str

# Öğrenci paneline görevleri listelerken kullanılacak model
class AssignmentForStudent(BaseModel):
    id: int
    title: str
    assignment_type: str
    start_info: Optional[str] = None
    end_info: Optional[str] = None
    
    # Geometri verilerini frontend'in anlayacağı GeoJSON formatında göndereceğiz
    geom_start: dict 
    geom_end: Optional[dict] = None
    geom_path: Optional[dict] = None
    status: str

    class Config:
        from_attributes = True