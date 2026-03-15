import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, Enum as SQLAlchemyEnum, 
    ForeignKey, DateTime, JSON, Numeric, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from .database import Base


class UserRole(str, enum.Enum):
    """Sistemdeki kullanıcı yetki seviyeleri"""
    GUEST = "guest"
    TEACHER_BASIC = "teacher_basic"
    TEACHER_PRO = "teacher_pro"
    ACADEMICIAN = "academician"
    PUBLISHER = "publisher"
    ADMIN = "admin"

class User(Base):
    """Kullanıcı bilgilerini tutan tablo"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    institution = Column(String)  # Okul, Üniversite veya Yayınevi adı
    role = Column(SQLAlchemyEnum(UserRole), nullable=False, default=UserRole.GUEST)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # İlişkiler
    map_data = relationship("UserMapData", back_populates="owner", cascade="all, delete-orphan")
    published_content = relationship("PublisherContent", back_populates="publisher", cascade="all, delete-orphan")
    classrooms = relationship("Classroom", back_populates="teacher", cascade="all, delete-orphan")

class UserMapData(Base):
    """Genel harita verileri (Nokta, Çizgi, Poligon)"""
    __tablename__ = "user_map_data"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # PostGIS Geometri Sütunu (WGS84)
    geometry = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=False)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="map_data")
    
    # Kalıtım (Inheritance) Ayarı
    type = Column(String(50))
    __mapper_args__ = {
        "polymorphic_identity": "user_map_data",
        "polymorphic_on": type,
    }

class AcademicDataset(UserMapData):
    """Akademisyenlere özel veri seti tablosu"""
    __tablename__ = "academic_datasets"
    
    id = Column(Integer, ForeignKey("user_map_data.id"), primary_key=True)
    scientific_metadata = Column(JSON)
    citation_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=False)

    __mapper_args__ = {
        "polymorphic_identity": "academic_dataset",
    }

class PublisherContent(Base):
    """Yayınevlerinin interaktif ders içerikleri"""
    __tablename__ = "publisher_content"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=True) 
    geometry_data = Column(Geometry(geometry_type='GEOMETRY', srid=4326))

    publisher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    publisher = relationship("User", back_populates="published_content")

class Classroom(Base):
    """Öğretmenlerin sınıf ve öğrenci yönetim tablosu"""
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String, nullable=False)
    access_code = Column(String, unique=True, index=True, nullable=False)

    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher = relationship("User", back_populates="classrooms")

class UserPoint(Base):
    __tablename__ = "user_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True) # Noktaya isim verebiliriz
    category = Column(String, default="Genel") # Yeni sütun!
    # SRID 4326: Standart WGS84 koordinat sistemi (GPS koordinatları)
    location = Column(Geometry(geometry_type='POINT', srid=4326))
    user_id = Column(Integer, ForeignKey("users.id"))

class UserPolygon(Base):
    __tablename__ = "user_polygons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    category = Column(String, default="Alan")
    # Geometry(POLYGON) olarak tanımlıyoruz
    geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    user_id = Column(Integer, ForeignKey("users.id"))

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    start_info = Column(Text)
    end_info = Column(Text)
    geom_start = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    geom_end = Column(Geometry(geometry_type='POINT', srid=4326), nullable=True) 
    geom_path = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
    status = Column(String, default="draft")
    
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher = relationship("User")