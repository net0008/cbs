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

let recordingState = "SELECT_START"; // SELECT_START, INFO_START, SELECT_END, INFO_END, DRAW_PATH
let macroData = { start: {}, end: {}, path: [] };

let macroLayer = L.layerGroup().addTo(map);
let tempLine = L.polyline([], {color: '#f59e0b', weight: 5}).addTo(map);

map.on('click', function(e) {
    if (recordingState === "SELECT_START") {
        macroData.start.latlng = e.latlng;
        L.marker(e.latlng, {icon: greenMarker}).addTo(macroLayer);
        
        document.getElementById('input-1').style.display = "block";
        document.getElementById('msg').innerText = "Başlangıç için açıklama girin ve onaylayın.";
        recordingState = "INFO_START";
    } 
    else if (recordingState === "SELECT_END") {
        macroData.end.latlng = e.latlng;
        L.marker(e.latlng, {icon: redMarker}).addTo(macroLayer);
        
        document.getElementById('input-2').style.display = "block";
        document.getElementById('msg').innerText = "Bitiş için açıklama girin ve onaylayın.";
        recordingState = "INFO_END";
    } 
    else if (recordingState === "DRAW_PATH") {
        macroData.path.push(e.latlng);
        tempLine.addLatLng(e.latlng);
        L.circleMarker(e.latlng, {radius: 3, color: '#f59e0b'}).addTo(macroLayer);
        document.getElementById('publish-btn').style.display = "block";
    }
});

function confirmStep(step) {
    if (step === 1) {
        macroData.start.info = document.getElementById('start-info').value;
        if (!macroData.start.info) { alert("Lütfen bir açıklama girin!"); return; }
        
        document.getElementById('area-1').style.opacity = "0.5";
        document.getElementById('area-2').classList.add('active-step');
        recordingState = "SELECT_END";
        document.getElementById('msg').innerText = "Bitiş noktasını haritada işaretleyin.";
    } 
    else if (step === 2) {
        macroData.end.info = document.getElementById('end-info').value;
        if (!macroData.end.info) { alert("Lütfen bir açıklama girin!"); return; }
        
        document.getElementById('area-2').style.opacity = "0.5";
        document.getElementById('area-3').classList.add('active-step');
        document.getElementById('path-msg').style.display = "block";
        recordingState = "DRAW_PATH";
        document.getElementById('msg').innerText = "Şimdi haritaya tıklayarak yolu çizin.";
    }
}

// "Enter" tuşu desteği
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (recordingState === "INFO_START") confirmStep(1);
        else if (recordingState === "INFO_END") confirmStep(2);
    }
});

function finishMacro() {
    const finalData = {
        title: document.getElementById('level-title').innerText,
        start: macroData.start,
        end: macroData.end,
        path: macroData.path
    };

    fetch('/api/v1/save_assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
    })
    .then(response => response.json())
    .then(data => {
        alert("Ödev başarıyla sunucuya kaydedildi! ID: " + data.assignment_id);
        document.getElementById('msg').innerHTML = `<span style='color:green'>Makro (ID: ${data.assignment_id}) yayında!</span>`;
    });
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