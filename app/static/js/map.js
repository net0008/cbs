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

// --- GLOBAL STATE AND DATA ---
let currentTaskId = '1'; // Default to task 1 on load
let recordingState = "SELECT_START"; 
let macroData = { start: {}, end: {}, path: [], polygon: [] };
let macroLayer = L.layerGroup().addTo(map);
let tempLine = L.polyline([], {color: '#f59e0b', weight: 5}).addTo(map);


// --- EVENT HANDLERS ---
// GÖREV TİPİNE GÖRE TIKLAMA YÖNETİMİ
map.on('click', function(e) {
    // Dispatch click based on the current task type
    const taskType = getTaskType(currentTaskId);

    if (taskType === 'POINT') {
        macroData.start.latlng = e.latlng;
        macroLayer.clearLayers(); // Only one point allowed
        L.marker(e.latlng, {icon: greenMarker}).addTo(macroLayer);
        showInput(1);
        recordingState = "INFO_START";
    } 
    else if (taskType === 'LINE') {
        handleLineLogic(e);
    } 
    else if (taskType === 'POLYGON') {
        macroData.polygon.push(e.latlng);
        L.circleMarker(e.latlng, {radius: 4, color: '#ff7800'}).addTo(macroLayer);
        // Poligon çizimini görselleştir
        if(macroData.polygon.length > 2) {
             if(window.currentPoly) map.removeLayer(window.currentPoly);
             window.currentPoly = L.polygon(macroData.polygon, {color: '#ff7800'}).addTo(macroLayer);
        }
        document.getElementById('save-all-btn').style.display = "block";
    }
});

function handleLineLogic(e) {
    if (recordingState === "SELECT_START") {
        macroData.start.latlng = e.latlng;
        L.marker(e.latlng, {icon: greenMarker}).addTo(macroLayer);
        showInput(1);
        recordingState = "INFO_START";
    } 
    else if (recordingState === "SELECT_END") {
        macroData.end.latlng = e.latlng;
        L.marker(e.latlng, {icon: redMarker}).addTo(macroLayer);
        showInput(2);
        recordingState = "INFO_END";
    }
    else if (recordingState === "DRAW_PATH") {
        macroData.path.push(e.latlng);
        tempLine.addLatLng(e.latlng);
        L.circleMarker(e.latlng, {radius: 3, color: '#f59e0b'}).addTo(macroLayer);
        document.getElementById('save-all-btn').style.display = "block";
    }
}

// --- UI AND STATE MANAGEMENT ---
function confirmStep(step) {
    const taskType = getTaskType(currentTaskId);

    if (taskType === 'POINT' && step === 1) {
        if (!document.getElementById('start-desc').value) { alert("Lütfen bir açıklama girin!"); return; }
        document.getElementById('save-all-btn').style.display = "block";
        document.getElementById('msg').innerText = "Nokta kaydedilmeye hazır.";
        recordingState = "DONE"; // A final state
    } else if (taskType === 'LINE') {
        if (step === 1) {
            macroData.start.info = document.getElementById('start-desc').value;
            if (!macroData.start.info) { alert("Lütfen bir açıklama girin!"); return; }
            
            document.getElementById('step-1-ui').style.opacity = "0.4";
            document.getElementById('step-2-ui').style.opacity = "1";
            recordingState = "SELECT_END";
        } 
        else if (step === 2) {
            macroData.end.info = document.getElementById('end-desc').value;
            if (!macroData.end.info) { alert("Lütfen bir açıklama girin!"); return; }
            
            document.getElementById('step-2-ui').style.opacity = "0.4";
            document.getElementById('step-3-ui').style.opacity = "1";
            recordingState = "DRAW_PATH";
        }
    }
}

// "Enter" tuşu desteği
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const activeElementId = document.activeElement.id;
        if (recordingState === "INFO_START" && activeElementId === 'start-desc') {
            confirmStep(1);
        } else if (recordingState === "INFO_END" && activeElementId === 'end-desc') {
            confirmStep(2);
        }
    }
});

// PDF SIRALAMASINA GÖRE GÖREV TİPLERİ
function getTaskType(id) {
    const n = parseInt(id);
    if ([1, 4, 5].includes(n)) return 'POINT';   // Nokta Görevleri
    if ([2, 6, 7].includes(n)) return 'LINE';    // Çizgi/Rota Görevleri
    if ([3, 8, 9].includes(n)) return 'POLYGON'; // Alan Görevleri
    return 'FINAL';
}

function loadTaskTemplate() {
    currentTaskId = document.getElementById('task-select').value;
    resetMacro();
    const type = getTaskType(currentTaskId);

    // Hide all steps first
    document.getElementById('step-1-ui').style.display = 'none';
    document.getElementById('step-2-ui').style.display = 'none';
    document.getElementById('step-3-ui').style.display = 'none';

    if (type === 'POINT') {
        document.getElementById('step-1-ui').style.display = 'block';
        document.getElementById('step-1-ui').querySelector('p').innerText = '1. ADIM: Noktayı Seç & Bilgi Gir';
        recordingState = "SELECT_START";
    } else if (type === 'LINE') {
        document.getElementById('step-1-ui').style.display = 'block';
        document.getElementById('step-2-ui').style.display = 'block';
        document.getElementById('step-3-ui').style.display = 'block';
        document.getElementById('step-1-ui').querySelector('p').innerText = '1. ADIM: Başlangıç Noktası Seç & Bilgi Gir';
        recordingState = "SELECT_START";
    } else if (type === 'POLYGON') {
        document.getElementById('step-1-ui').style.display = 'block';
        document.getElementById('step-1-ui').querySelector('p').innerText = '1. ADIM: Alanı Çiz & Açıklama Gir';
        recordingState = "DRAW_POLYGON";
    }
}

function resetMacro() {
    // Reset data
    macroData = { start: {}, end: {}, path: [], polygon: [] };
    macroLayer.clearLayers();
    tempLine.setLatLngs([]);

    // Reset UI
    document.getElementById('save-all-btn').style.display = "none";
    document.getElementById('start-desc').value = '';
    document.getElementById('end-desc').value = '';
    document.getElementById('input-1').style.display = 'none';
    document.getElementById('input-2').style.display = 'none';
}

function showInput(step) {
    document.getElementById(`input-${step}`).style.display = 'block';
}

// ARKA PLANA (VERİTABANINA) KAYIT
async function loginTeacher(email, password) {
    const formData = new FormData();
    formData.append('username', email); // FastAPI OAuth2 'username' bekler
    formData.append('password', password);

    const response = await fetch('/api/v1/login', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('cbs_token', data.access_token);
        console.log("Hocam giriş başarılı, token alındı.");
    }
}

async function saveTaskToDatabase() {
    const startLatLng = macroData.start.latlng || (macroData.polygon[0] ? macroData.polygon[0] : null);
    const endLatLng = macroData.end.latlng || null;
    const pathData = macroData.path.length > 0 ? macroData.path : macroData.polygon;

    if (!startLatLng) {
        alert("Lütfen önce başlangıç noktasını seçin.");
        return;
    }

    const taskType = getTaskType(currentTaskId);
    const payload = {
        title: document.getElementById('task-select').selectedOptions[0].text,
        assignment_type: taskType === 'LINE' ? 'LINESTRING' : taskType,
        start: { 
            latlng: { lat: startLatLng.lat, lng: startLatLng.lng }, // Nesneyi temizledik
            info: document.getElementById('start-desc').value 
        },
        end: endLatLng ? {
            latlng: { lat: endLatLng.lat, lng: endLatLng.lng },
            info: document.getElementById('end-desc').value || ""
        } : null,
        path: pathData.map(p => ({ lat: p.lat, lng: p.lng })), // Listeyi temizledik
        status: "published"
    };

    const token = localStorage.getItem('cbs_token');

    fetch('/api/v1/save_task', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token // Kimlik kartını buraya ekledik
        },
        body: JSON.stringify(payload)
    })
    .then(async response => {
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(responseData.detail || 'Sunucu hatası!');
        }
        return responseData;
    })
    .then(data => {
        alert("Hocam görev başarıyla mühürlendi ve veritabanına kaydedildi!");
        resetMacro();
    })
    .catch(error => {
        // Hata bir nesneyse (JSON) string'e çevir, yoksa mesajı bas
        const errorMsg = typeof error.message === 'object' ? JSON.stringify(error.message) : error.message;
        alert("Hocam hata var: " + errorMsg);
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

// Initialize the UI for the default selected task when the page loads
window.onload = loadTaskTemplate;