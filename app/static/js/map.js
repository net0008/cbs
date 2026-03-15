// Haritayı Bergama'ya odakla
const map = L.map('map').setView([39.1325, 27.1841], 15);

// OpenStreetMap katmanını ekle
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Hedef: Akropol Koordinatları
const target = { lat: 39.1325, lng: 27.1841 };

map.on('click', function(e) {
    const clickedLat = e.latlng.lat;
    const clickedLng = e.latlng.lng;

    // Koordinat farkını hesapla (yakınlık toleransı)
    const diff = Math.abs(clickedLat - target.lat) + Math.abs(clickedLng - target.lng);

    if (diff < 0.002) { // Yaklaşık 200 metrelik bir tolerans
        L.marker([clickedLat, clickedLng]).addTo(map)
            .bindPopup("<b>Tebrikler!</b><br>Akropolü doğru işaretledin.").openPopup();
        
        document.getElementById('msg').innerHTML = "<span style='color:green'>Mükemmel! İlk mekânsal verini (Nokta) başarıyla oluşturdun.</span>";
        document.getElementById('next-btn').style.display = "block";
    } else {
        alert("Biraz daha yakından bak! Akropol tepenin en üst kısmında yer alır.");
    }
});