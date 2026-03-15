// Haritayı başlat (Bergama koordinatları: 39.12, 27.18)
const map = L.map('map').setView([39.12, 27.18], 13);

// OpenStreetMap katmanını ekle
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap katkıda bulunanlar'
}).addTo(map);

// Bir marker (işaretçi) ekle
const marker = L.marker([39.12, 27.18]).addTo(map);
marker.bindPopup("<b>Bergama CBS Merkezi</b><br>Buradan başlıyoruz.").openPopup();

// Haritaya tıklandığında koordinatları konsola yaz (İlerde veritabanına kaydedeceğiz)
map.on('click', function(e) {
    const coords = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: "Harita Tıklaması"
    };

    // API'ye veriyi gönder
    fetch('/api/v1/save-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords)
    })
    .then(response => response.json())
    .then(data => {
        // Kaydedilen yere bir marker koy
        L.marker([coords.lat, coords.lng]).addTo(map)
            .bindPopup("Veritabanına Kaydedildi!").openPopup();
        console.log(data.message);
    });
});

// Veritabanındaki tüm noktaları yükle
function loadSavedPoints() {
    fetch('/api/v1/get-points')
        .then(response => response.json())
        .then(points => {
            points.forEach(p => {
                L.marker([p.lat, p.lng])
                    .addTo(map)
                    .bindPopup(`<b>${p.name}</b><br>ID: ${p.id}`);
            });
            console.log(`${points.length} nokta yüklendi.`);
        });
}

// Harita hazır olduğunda noktaları getir
loadSavedPoints();