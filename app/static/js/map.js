// Haritayı başlat (Bergama koordinatları: 39.12, 27.18)
const map = L.map('map').setView([39.12, 27.18], 13);

// OpenStreetMap katmanını ekle
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap katkıda bulunanlar'
}).addTo(map);

// Dinamik olarak eklenecek noktalar için bir katman grubu oluşturalım
const pointsLayer = L.layerGroup().addTo(map);
const polygonsLayer = L.layerGroup().addTo(map);

// Bir marker (işaretçi) ekle
const marker = L.marker([39.12, 27.18]).addTo(map);
marker.bindPopup("<b>Bergama CBS Merkezi</b><br>Buradan başlıyoruz.").openPopup();

// Haritaya tıklandığında yeni nokta ekleme
// Not: Bu işlem için /save-point endpoint'i yetkilendirme (token) gerektirir.
// Geliştirme aşamasında bu endpoint'in kilidini geçici olarak kaldırabilir veya
// fetch isteğine geçerli bir token ekleyebilirsiniz.
map.on('click', function(e) {
    const coords = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: "Yeni Tıklama Noktası"
    };

    // API'ye veriyi gönder (Yetkilendirme başlığı eklenmeli)
    fetch('/api/v1/save-point', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}` // Gerçek uygulamada token buraya eklenmeli
        },
        body: JSON.stringify(coords)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.detail || 'Bilinmeyen bir hata oluştu.') });
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);
        // Haritayı anında güncellemek için noktaları yeniden yükle
        loadSavedPoints();
    })
    .catch(error => {
        alert("Nokta kaydedilemedi: " + error.message);
        console.error(error);
    });
});

// Kategorilere göre renk belirleyen fonksiyon
function getIconColor(category) {
    switch(category) {
        case 'Müze': return 'red';
        case 'Sağlık': return 'green';
        case 'Tarihi Yer': return 'orange';
        default: return 'blue'; // 'Genel' ve diğerleri için
    }
}

// Veritabanındaki tüm noktaları yükle ve haritaya çiz
function loadSavedPoints() {
    fetch('/api/v1/get-points')
        .then(response => response.json())
        .then(points => {
            pointsLayer.clearLayers(); // Önceki noktaları temizle
            points.forEach(p => {
                const popupContent = `
                    <b>${p.name}</b><br>
                    Kategori: ${p.category}<hr>
                    <button class="delete-btn" onclick="deletePoint(${p.id})">Bu Noktayı Sil</button>
                `;

                L.circleMarker([p.lat, p.lng], {
                    radius: 8,
                    fillColor: getIconColor(p.category),
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                })
                .addTo(pointsLayer)
                .bindPopup(popupContent);
            });
            console.log(`${points.length} nokta veritabanından yüklendi.`);
        })
        .catch(err => console.error("Noktalar yüklenirken hata oluştu:", err));
}

// Veritabanındaki tüm poligonları yükle ve haritaya çiz
function loadSavedPolygons() {
    fetch('/api/v1/get-polygons')
        .then(res => res.json())
        .then(polygons => {
            polygonsLayer.clearLayers(); // Önceki poligonları temizle
            polygons.forEach(p => {
                // Leaflet, GeoJSON formatını doğrudan işleyebilir
                L.geoJSON(p.geometry, {
                    style: { color: "orange", weight: 2, fillOpacity: 0.3 }
                })
                .addTo(polygonsLayer)
                .bindPopup(p.name);
            });
            console.log(`${polygons.length} alan veritabanından yüklendi.`);
        })
        .catch(err => console.error("Alanlar yüklenirken hata oluştu:", err));
}

// Nokta silme fonksiyonu
function deletePoint(pointId) {
    if (!confirm(`ID: ${pointId} olan noktayı silmek istediğinizden emin misiniz?`)) {
        return;
    }

    fetch(`/api/v1/delete-point/${pointId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadSavedPoints(); // Haritayı yenilemek için noktaları tekrar yükle
    })
    .catch(error => alert("Hata: " + error.message));
}

// Harita hazır olduğunda noktaları getir
loadSavedPoints();
loadSavedPolygons();

async function uploadFile() {
    const fileInput = document.getElementById('geoJsonInput');
    if (!fileInput.files[0]) return alert("Lütfen bir dosya seçin!");

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/api/v1/upload-geojson', {
            method: 'POST',
            body: formData // Header eklemiyoruz, doğrudan gönderiyoruz
        });

        const data = await response.json();
        alert(data.message);
        loadSavedPoints(); // Haritayı anında güncelle
        loadSavedPolygons(); // Alanları da güncelle
    } catch (err) {
        alert("Bağlantı hatası oluştu!");
    }
}