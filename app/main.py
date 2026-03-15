from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from app.api.v1.endpoints import router as api_router

# KRİTİK EKLEME: Veritabanı motorunu ve Base sınıfını içe aktarın
from app.db.database import engine
from app.db import models

# Bu satır, veritabanındaki tabloları (eğer yoksa) otomatik oluşturur
models.Base.metadata.create_all(bind=engine)

# FastAPI Uygulamasını Başlat
app = FastAPI(
    title="Coğrafya CBS Portalı",
    description="Öğretmenler, Akademisyenler ve Yayınevleri için CBS Platformu",
    version="1.0.0"
)

# CORS Ayarları (Farklı portlardan erişim gerekirse diye)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik Dosyaları (HTML, CSS, JS) Bağla
# app/static klasörünü /static yoluyla dışarı açar
script_dir = os.path.dirname(__file__)
static_path = os.path.join(script_dir, "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
async def read_index():
    # Ana sayfaya girildiğinde teacher.html'i gönderir
    teacher_file = os.path.join(static_path, "teacher.html")
    if os.path.exists(teacher_file):
        return FileResponse(teacher_file)
    return {"message": "teacher.html bulunamadı."}

@app.get("/student")
async def read_student_page():
    student_file = os.path.join(static_path, "student.html")
    if os.path.exists(student_file):
        return FileResponse(student_file)
    return {"message": "student.html bulunamadı."}

@app.get("/health")
def health_check():
    # Sistemin çalışıp çalışmadığını test etmek için
    return {"status": "ok", "message": "CBS Motoru Çalışıyor"}

# Gelecekte buraya API rotalarını ekleyeceğiz:
# app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(api_router, prefix="/api/v1")