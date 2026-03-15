// Haritayı Bergama'ya odakla
let map = L.map('map').setView([39.1325, 27.1841], 15);

// OpenStreetMap katmanını ekle
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// 2. İMLEÇ AYARI (Artı İşareti)
// CSS'e eklediğimiz cursor: crosshair özelliğini tüm harita etkileşimlerinde aktif tutar.
map.getContainer().style.cursor = 'crosshair';

// İkon renklerini CSS filtreleri ile ayarlıyalım
const greenMarker = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redMarker = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

let recordingStep = 1; // 1: P1, 2: P2, 3: Path
let macroData = {
    start: { latlng: null, info: "" },
    end: { latlng: null, info: "" },
    path: []
};

let macroLayer = L.layerGroup().addTo(map);
let tempLine = L.polyline([], {color: '#f59e0b', weight: 5}).addTo(map);

map.on('click', function(e) {
    if (recordingStep === 1) {
        // BAŞLANGIÇ NOKTASI
        macroData.start.latlng = e.latlng;
        L.marker(e.latlng, {icon: greenMarker}).addTo(macroLayer).bindPopup("Başlangıç Noktası").openPopup();
        
        // Inputu göster
        document.getElementById('start-desc').style.display = "block";
        document.getElementById('msg').innerText = "Başlangıç için açıklama gir ve 2. adıma hazırlan.";
        document.getElementById('step-1-area').style.opacity = "1";
        
        // Bir sonraki tıklama için 2. adıma geç (Açıklama girildikten sonra)
        recordingStep = 1.5; // Açıklama bekleme modu
    } 
    else if (recordingStep === 2) {
        // BİTİŞ NOKTASI
        macroData.end.latlng = e.latlng;
        L.marker(e.latlng, {icon: redMarker}).addTo(macroLayer).bindPopup("Bitiş Noktası").openPopup();
        
        document.getElementById('end-desc').style.display = "block";
        document.getElementById('msg').innerText = "Bitiş için açıklama gir ve yolu çizmeye başla.";
        document.getElementById('step-2-area').style.opacity = "1";
        recordingStep = 2.5; 
    } 
    else if (recordingStep === 3) {
        // YOL ÇİZİMİ
        macroData.path.push(e.latlng);
        tempLine.addLatLng(e.latlng);
        L.circleMarker(e.latlng, {radius: 3, color: '#f59e0b'}).addTo(macroLayer);
        
        document.getElementById('save-macro-btn').style.display = "block";
    }
});

// Input alanları değiştikçe veriyi güncelle (Enter'a basınca diğer adıma geç)
document.getElementById('start-desc').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        macroData.start.info = this.value;
        recordingStep = 2; // Artık 2. noktaya tıklayabilir
        document.getElementById('msg').innerText = "Harika! Şimdi bitiş noktasını seç.";
        this.disabled = true;
    }
});

document.getElementById('end-desc').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        macroData.end.info = this.value;
        recordingStep = 3; // Artık yol çizebilir
        document.getElementById('step-3-area').style.opacity = "1";
        document.getElementById('msg').innerText = "Noktalar tamam. Şimdi aradaki tarihi yolu çiz.";
        this.disabled = true;
    }
});

function finishMacro() {
    // Bu aşamada macroData nesnesi veritabanına kaydedilmeye hazır!
    console.log("ÖĞRETMEN MAKROSU KAYDEDİLDİ:", macroData);
    alert("Görev başarıyla kaydedildi! Artık öğrenciler sizin tıkladığınız bu rotayı takip edecek.");
    
    // Öğrenci moduna geçiş simülasyonu
    document.getElementById('msg').innerHTML = "<span style='color:green'>Makro Yayında! Öğrenciler artık bu görevi görebilir.</span>";
}

// 1. ARAMA FONKSİYONU
async function searchLocation() {
    const query = document.getElementById('search-input').value;
    if (!query) return;

    // Aramayı Bergama ile sınırla
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query},Bergama`);
    const data = await response.json();

    if (data && data.length > 0) {
        const target = [data[0].lat, data[0].lon];
        
        map.flyTo(target, 18);
        
        // KRİTİK: Açık popup varsa kapat ki tıklamaya engel olmasın
        map.closePopup();

        // Çemberi 'interactive: false' yapıyoruz (Tıklama içinden geçer)
        const searchRing = L.circle(target, {
            radius: 60, 
            color: '#2563eb', 
            fillOpacity: 0.1, 
            interactive: false // BU SATIR SORUNU ÇÖZER
        }).addTo(map);
        
        // 5 saniye sonra halka kaybolsun
        setTimeout(() => map.removeLayer(searchRing), 5000);
        
        document.getElementById('msg').innerText = "Yer bulundu! Şimdi hedefi işaretle.";
    } else {
        alert("Aradığın yer bulunamadı.");
    }
}