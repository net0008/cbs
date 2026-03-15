from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from app.api.v1.endpoints import router as api_router

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
    # Ana sayfaya girildiğinde index.html'i gönderir
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "index.html bulunamadı, lütfen app/static/ klasörünü kontrol edin."}

@app.get("/health")
def health_check():
    # Sistemin çalışıp çalışmadığını test etmek için
    return {"status": "ok", "message": "CBS Motoru Çalışıyor"}

# Gelecekte buraya API rotalarını ekleyeceğiz:
# app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(api_router, prefix="/api/v1")