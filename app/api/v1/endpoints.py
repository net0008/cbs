from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.api.v1 import schemas
from app.crud import crud_user
from app.core import security
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from shapely.geometry import shape, mapping
from jose import jwt, JWTError
from datetime import timedelta
import json
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz kimlik bilgileri",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = crud_user.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

router = APIRouter()

@router.post("/register", response_model=schemas.UserOut)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu e-posta zaten kayıtlı.")
    return crud_user.create_user(db=db, user_in=user_in)

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    # Kullanıcıyı e-posta ile bul (Swagger varsayılan olarak 'username' alanını kullanır)
    user = crud_user.get_user_by_email(db, email=form_data.username)
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı e-posta veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Anahtarı (Token) üret
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/save-point")
def save_point(
    point_in: schemas.PointCreate,
    db: Session = Depends(get_db)
    # current_user satırını siliyoruz ki tıklayınca hata vermesin
):
    # Koordinatları PostGIS formatına (Well-Known Text) çeviriyoruz
    # Dikkat: PostGIS formatı (Longitude, Latitude) sırasıyla çalışır
    wkt_point = f"POINT({point_in.lng} {point_in.lat})"

    new_point = models.UserPoint(
        name=point_in.name,
        category="Genel", # Varsayılan kategori
        location=WKTElement(wkt_point, srid=4326),
        user_id=1 # Senin ID'ni (1) buraya sabitliyoruz
    )
    db.add(new_point)
    db.commit()
    return {"status": "success", "message": "Nokta kaydedildi!"}

@router.get("/get-points")
def get_points(db: Session = Depends(get_db)):
    points = db.query(models.UserPoint).all()
    result = []
    
    for p in points:
        # PostGIS geometrisini (WKB) Python objesine (Shapely) çeviriyoruz
        shape = to_shape(p.location)
        result.append({
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "lat": shape.y, # Point(lng lat) olduğu için y lat'tır
            "lng": shape.x
        })
    return result

@router.get("/get-polygons")
def get_polygons(db: Session = Depends(get_db)):
    polygons = db.query(models.UserPolygon).all()
    results = []
    for p in polygons:
        # PostGIS geometrisini Python objesine (Shapely) çevir
        geom_shape = to_shape(p.geometry)
        results.append({
            "id": p.id,
            "name": p.name,
            "geometry": mapping(geom_shape) # Shapely objesini GeoJSON dict'e çevir
        })
    return results

@router.delete("/delete-point/{point_id}")
def delete_point(point_id: int, db: Session = Depends(get_db)):
    db_point = db.query(models.UserPoint).filter(models.UserPoint.id == point_id).first()
    if not db_point:
        raise HTTPException(status_code=404, detail="Nokta bulunamadı")
    db.delete(db_point)
    db.commit()
    return {"message": "Nokta başarıyla silindi"}

@router.post("/upload-geojson")
async def upload_geojson(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
    # current_user satırını sildik, artık kapı herkese açık
):
    # Dosyayı oku
    contents = await file.read()
    data = json.loads(contents)
    
    counts = {"points": 0, "polygons": 0}
    for feature in data.get("features", []):
        geom = feature.get("geometry")
        if not geom:
            continue
        
        geom_type = geom.get("type")
        props = feature.get("properties", {})

        if geom_type == "Point":
            lng, lat = geom.get("coordinates")
            wkt_point = f"POINT({lng} {lat})"
            
            new_point = models.UserPoint(
                name=props.get("name", "İçe Aktarılan Nokta"),
                location=WKTElement(wkt_point, srid=4326),
                user_id=1 # Şimdilik senin ID'ni (1) sabitliyoruz
            )
            db.add(new_point)
            counts["points"] += 1
        
        elif geom_type == "Polygon":
            geom_obj = shape(geom) # GeoJSON'ı Shapely objesine çevirir
            new_poly = models.UserPolygon(
                name=props.get("name", "Yeni Alan"),
                geometry=WKTElement(geom_obj.wkt, srid=4326),
                user_id=1
            )
            db.add(new_poly) # Hata düzeltildi: new_point yerine new_poly
            counts["polygons"] += 1
            
    db.commit()
    return {"message": f"{counts['points']} nokta ve {counts['polygons']} alan yüklendi!"}

@router.post("/save_task", status_code=status.HTTP_201_CREATED)
def save_task(
    assignment_in: schemas.AssignmentCreate,
    db: Session = Depends(get_db),
    # current_user: models.User = Depends(get_current_user) # Geliştirme tamamlandığında bu satır açılmalı
):
    # 1. Başlangıç her zaman var
    start_point_wkt = f"POINT({assignment_in.start.latlng.lng} {assignment_in.start.latlng.lat})"

    teacher = db.query(models.User).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Görev kaydı için önce bir öğretmen hesabı oluşturulmalı."
        )

    new_assignment = models.Assignment(
        title=assignment_in.title,
        start_info=assignment_in.start.info,
        status=assignment_in.status,
        geom_start=WKTElement(start_point_wkt, srid=4326),
        teacher_id=teacher.id
    )

    # 2. Bitiş varsa ekle (Nokta görevinde burası atlanır)
    if assignment_in.end and assignment_in.end.latlng:
        end_wkt = f"POINT({assignment_in.end.latlng.lng} {assignment_in.end.latlng.lat})"
        new_assignment.geom_end = WKTElement(end_wkt, srid=4326)
        new_assignment.end_info = assignment_in.end.info

    # 3. Yol varsa ekle (DİKKAT: p.lng olmalı, p['lng'] değil)
    if assignment_in.path and len(assignment_in.path) >= 2:
        path_coords = ", ".join([f"{p.lng} {p.lat}" for p in assignment_in.path])
        path_wkt = f"LINESTRING({path_coords})"
        new_assignment.geom_path = WKTElement(path_wkt, srid=4326)

    db.add(new_assignment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Görev kaydı için geçersiz veya eksik veri gönderildi."
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Görev kaydedilirken veritabanı hatası oluştu."
        )
    return {"status": "success", "message": "Görev mühürlendi!"}