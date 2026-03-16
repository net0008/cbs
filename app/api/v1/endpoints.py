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
    try:
        user = crud_user.create_user(db=db, user_in=user_in)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu e-posta adresi zaten kayıtlı.")

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

@router.post("/save-point", response_model=schemas.Message)
def save_point(
    point_in: schemas.PointCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Koordinatları PostGIS formatına (Well-Known Text) çeviriyoruz
    # Dikkat: PostGIS formatı (Longitude, Latitude) sırasıyla çalışır
    wkt_point = f"POINT({point_in.lng} {point_in.lat})"

    new_point = models.UserPoint(
        name=point_in.name,
        category="Genel", # Varsayılan kategori
        location=WKTElement(wkt_point, srid=4326),
        user_id=current_user.id
    )
    try:
        db.add(new_point)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Nokta kaydedilirken bir veritabanı hatası oluştu.")
    return {"message": "Nokta başarıyla kaydedildi."}

@router.get("/get-points", response_model=list[schemas.PointOut])
def get_points(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    points = db.query(models.UserPoint).filter(models.UserPoint.user_id == current_user.id).all()
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

@router.get("/get-polygons", response_model=list[schemas.PolygonOut])
def get_polygons(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    polygons = db.query(models.UserPolygon).filter(models.UserPolygon.user_id == current_user.id).all()
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

@router.delete("/delete-point/{point_id}", response_model=schemas.Message)
def delete_point(point_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_point = db.query(models.UserPoint).filter(models.UserPoint.id == point_id).first()
    if not db_point:
        raise HTTPException(status_code=404, detail="Nokta bulunamadı")
    
    if db_point.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu işlemi yapmaya yetkiniz yok.")
    try:
        db.delete(db_point)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Nokta silinirken bir veritabanı hatası oluştu.")
    return {"message": "Nokta başarıyla silindi"}

@router.post("/upload-geojson", response_model=schemas.Message)
async def upload_geojson(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Dosyayı oku
    contents = await file.read()
    try:
        data = json.loads(contents)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz GeoJSON formatı.")
    
    counts = {"points": 0, "polygons": 0}
    try:
        for feature in data.get("features", []):
            geom = feature.get("geometry")
            if not geom:
                continue
            
            geom_type = geom.get("type")
            props = feature.get("properties", {})

            if geom_type == "Point":
                coordinates = geom.get("coordinates")
                if not (isinstance(coordinates, list) and len(coordinates) == 2):
                    continue # Geçersiz koordinat formatını atla
                lng, lat = coordinates
                wkt_point = f"POINT({lng} {lat})"
                
                new_point = models.UserPoint(
                    name=props.get("name", "İçe Aktarılan Nokta"),
                    location=WKTElement(wkt_point, srid=4326),
                    user_id=current_user.id
                )
                db.add(new_point)
                counts["points"] += 1
            
            elif geom_type == "Polygon":
                geom_obj = shape(geom) # GeoJSON'ı Shapely objesine çevirir
                new_poly = models.UserPolygon(
                    name=props.get("name", "Yeni Alan"),
                    geometry=WKTElement(geom_obj.wkt, srid=4326),
                    user_id=current_user.id
                )
                db.add(new_poly)
                counts["polygons"] += 1
                
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"GeoJSON verisi işlenirken beklenmedik bir hata oluştu: {e}")
    
    return {"message": f"{counts['points']} nokta ve {counts['polygons']} alan yüklendi!"}

@router.get("/assignments", response_model=list[schemas.AssignmentForStudent])
def get_all_assignments(db: Session = Depends(get_db)):
    """
    Tüm görevleri öğrenci paneli için listeler.
    İleride bu, öğrencinin sınıfına veya öğretmenine göre filtrelenebilir.
    """
    assignments = db.query(models.Assignment).order_by(models.Assignment.id).all()
    
    results = []
    for assign in assignments:
        # Geometriyi GeoJSON formatına çeviren yardımcı fonksiyon
        def geom_to_json(geom):
            return mapping(to_shape(geom)) if geom else None

        results.append({
            "id": assign.id,
            "title": assign.title,
            "assignment_type": assign.assignment_type,
            "start_info": assign.start_info,
            "end_info": assign.end_info,
            "status": assign.status,
            "geom_start": geom_to_json(assign.geom_start),
            "geom_end": geom_to_json(assign.geom_end),
            "geom_path": geom_to_json(assign.geom_path),
        })
        
    return results

@router.post("/save_task", status_code=status.HTTP_201_CREATED)
def save_task(
    assignment_in: schemas.AssignmentCreate,
    db: Session = Depends(get_db)
    # current_user: models.User = Depends(get_current_user)  <-- Burayı geçici olarak kapattık
):
    try:
        # 1. Veritabanındaki ilk mevcut öğretmeni otomatik bul (Auth gerektirmez)
        teacher = db.query(models.User).filter(models.User.role == models.UserRole.TEACHER_PRO).first()
        
        if not teacher:
            # Eğer hiç kullanıcı yoksa hata dönelim ki bilelim
            raise HTTPException(
                status_code=400, 
                detail="Hocam veritabanında hiç öğretmen yok. Önce Swagger'dan bir Register yapmalısın."
            )

        # 2. Geometriyi hazırla (Senin yazdığın mantıkla devam)
        start_wkt = f"POINT({assignment_in.start.latlng.lng} {assignment_in.start.latlng.lat})"
        new_assignment = models.Assignment(
            title=assignment_in.title,
            assignment_type=assignment_in.assignment_type,
            start_info=assignment_in.start.info,
            status=assignment_in.status,
            geom_start=WKTElement(start_wkt, srid=4326),
            teacher_id=teacher.id # Bulduğumuz öğretmene bağladık
        )

        # 3. Diğer Geometriler (Çizgi/Alan)
        if assignment_in.end and assignment_in.end.latlng:
            end_wkt = f"POINT({assignment_in.end.latlng.lng} {assignment_in.end.latlng.lat})"
            new_assignment.geom_end = WKTElement(end_wkt, srid=4326)
            new_assignment.end_info = assignment_in.end.info

        if assignment_in.assignment_type == "LINESTRING" and assignment_in.path and len(assignment_in.path) >= 2:
            coords = ", ".join([f"{p.lng} {p.lat}" for p in assignment_in.path])
            new_assignment.geom_path = WKTElement(f"LINESTRING({coords})", srid=4326)
            
        elif assignment_in.assignment_type == "POLYGON" and assignment_in.path and len(assignment_in.path) >= 3:
            p_list = assignment_in.path
            coords = ", ".join([f"{p.lng} {p.lat}" for p in p_list])
            coords += f", {p_list[0].lng} {p_list[0].lat}" # Poligonu kapat
            new_assignment.geom_path = WKTElement(f"POLYGON(({coords}))", srid=4326)

        db.add(new_assignment)
        db.commit()
        return {"status": "success", "message": "Görev mühürlendi!"}
        
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Veritabanı hatası: {str(e)}")