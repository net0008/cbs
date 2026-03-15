from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.api.v1 import schemas
from app.crud import crud_user
from app.core import security
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from jose import jwt, JWTError
from datetime import timedelta

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
def save_point(point_in: schemas.PointCreate, db: Session = Depends(get_db)):
    # Koordinatları PostGIS formatına (Well-Known Text) çeviriyoruz
    # Dikkat: PostGIS formatı (Longitude, Latitude) sırasıyla çalışır
    wkt_point = f"POINT({point_in.lng} {point_in.lat})"
    
    new_point = models.UserPoint(
        name=point_in.name,
        location=WKTElement(wkt_point, srid=4326),
        user_id=1 # Şimdilik seni (admin) varsayıyoruz
    )
    db.add(new_point)
    db.commit()
    return {"status": "success", "message": "Nokta veritabanına kazındı!"}

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
            "lat": shape.y, # Point(lng lat) olduğu için y lat'tır
            "lng": shape.x
        })
    return result