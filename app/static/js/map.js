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
// Arka planda mühürlenen yapı (Global Task Registry)
let spatialAssignments = JSON.parse(localStorage.getItem('bergama_cbs_master')) || {};
let currentTaskId = '1'; // Default to task 1 on load

// Teacher Mode State
let recordingState = "SELECT_POINT"; // Initial state for the default task (Task 1)
let macroData = { point: null, start: {}, end: {}, path: [], polygon: [] }; // A unified data object
let macroLayer = L.layerGroup().addTo(map);
let tempLine = L.polyline([], {color: '#f59e0b', weight: 5}).addTo(map);
let tempPolygon = L.polygon([], {color: '#ff7800', weight: 3, fillOpacity: 0.2}).addTo(map);


// --- EVENT HANDLERS ---
map.on('click', function(e) {
    // Dispatch click based on the current task type
    const taskType = getTaskType(currentTaskId);

    switch (taskType) {
        case 'POINT':
            handlePointTaskClick(e);
            break;
        case 'LINE':
            handleLineTaskClick(e);
            break;
        case 'POLYGON':
            handlePolygonTaskClick(e);
            break;
        default:
            console.warn(`No click handler for task type: ${taskType}`);
    }
});

// --- TASK-SPECIFIC CLICK HANDLERS ---

function handlePointTaskClick(e) {
    if (recordingState === "SELECT_POINT") {
        macroData.point = e.latlng;
        macroLayer.clearLayers(); // Only one point allowed
        L.marker(e.latlng, {icon: greenMarker}).addTo(macroLayer);
        document.getElementById('input-1').style.display = "block";
        document.getElementById('msg').innerText = "Nokta için açıklama girin ve onaylayın.";
        recordingState = "INFO_POINT";
    }
}

function handleLineTaskClick(e) {
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
        document.getElementById('save-all-btn').style.display = "block";
    }
}

function handlePolygonTaskClick(e) {
    if (recordingState === "DRAW_POLYGON") {
        macroData.polygon.push(e.latlng);
        tempPolygon.addLatLng(e.latlng);
        document.getElementById('save-all-btn').style.display = "block";
        document.getElementById('msg').innerText = "Alan çiziliyor... Bitince 'Kaydet'e bas.";
    }
}

// --- UI AND STATE MANAGEMENT ---
function confirmStep(step) {
    const taskType = getTaskType(currentTaskId);

    if (taskType === 'POINT' && step === 1) {
        if (!document.getElementById('start-desc').value) { alert("Lütfen bir açıklama girin!"); return; }
        document.getElementById('save-all-btn').style.display = "block";
        document.getElementById('msg').innerText = "Nokta kaydedilmeye hazır. 'Görevi Kaydet' butonuna tıklayın.";
        recordingState = "DONE"; // A final state
    } else if (taskType === 'LINE') {
        if (step === 1) {
            macroData.start.info = document.getElementById('start-desc').value;
            if (!macroData.start.info) { alert("Lütfen bir açıklama girin!"); return; }
            
            document.getElementById('step-1-ui').style.opacity = "0.4";
            document.getElementById('step-1-ui').classList.remove('active-step');
            document.getElementById('step-2-ui').style.opacity = "1";
            document.getElementById('step-2-ui').classList.add('active-step');
            recordingState = "SELECT_END";
            document.getElementById('msg').innerText = "Bitiş noktasını haritada işaretleyin.";
        } 
        else if (step === 2) {
            macroData.end.info = document.getElementById('end-desc').value;
            if (!macroData.end.info) { alert("Lütfen bir açıklama girin!"); return; }
            
            document.getElementById('step-2-ui').style.opacity = "0.4";
            document.getElementById('step-2-ui').classList.remove('active-step');
            document.getElementById('step-3-ui').style.opacity = "1";
            document.getElementById('step-3-ui').classList.add('active-step');
            recordingState = "DRAW_PATH";
            document.getElementById('msg').innerText = "Şimdi haritaya tıklayarak yolu çizin.";
        }
    }
}

// "Enter" tuşu desteği
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const activeElementId = document.activeElement.id;
        if ((recordingState === "INFO_POINT" || recordingState === "INFO_START") && activeElementId === 'start-desc') {
            confirmStep(1);
        } else if (recordingState === "INFO_END" && activeElementId === 'end-desc') {
            confirmStep(2);
        }
    }
});

function saveTaskToDatabase() {
    const taskType = getTaskType(currentTaskId);
    let taskData, taskLabel;

    switch (taskType) {
        case 'POINT':
            taskData = { point: macroData.point, description: document.getElementById('start-desc').value };
            taskLabel = "Nokta Tanımlama";
            break;
        case 'LINE':
            taskData = {
                startNode: { latlng: macroData.start.latlng, description: macroData.start.info },
                endNode: { latlng: macroData.end.latlng, description: macroData.end.info },
                idealPath: macroData.path
            };
            taskLabel = "Güzergah Oluşturma";
            break;
        case 'POLYGON':
            taskData = { vertices: macroData.polygon, description: document.getElementById('start-desc').value };
            taskLabel = "Alan Hesaplama";
            break;
        default:
            alert("Bilinmeyen görev tipi, kayıt yapılamadı.");
            return;
    }

    spatialAssignments[`task_${currentTaskId}`] = { type: taskType, label: taskLabel, data: taskData };
    commitToSystem();
    alert(`Görev ${currentTaskId} (${taskLabel}) başarıyla mühürlendi!`);
    resetForNextTask();
}

function commitToSystem() {
    localStorage.setItem('bergama_cbs_master', JSON.stringify(spatialAssignments));
    console.log("10 Seviyelik Müfredat Arka Planda Mühürlendi:", spatialAssignments);
}

function resetForNextTask() {
    // Reset data
    macroData = { point: null, start: {}, end: {}, path: [], polygon: [] };
    macroLayer.clearLayers();
    tempLine.setLatLngs([]);
    tempPolygon.setLatLngs([]);

    // Reset UI
    ['step-1-ui', 'step-2-ui', 'step-3-ui'].forEach(id => {
        const el = document.getElementById(id);
        el.style.opacity = '0.4';
        el.classList.remove('active-step');
        el.style.display = 'block'; // Make all visible by default, loadTaskTemplate will hide them
    });
    document.getElementById('save-all-btn').style.display = "none";
    document.getElementById('start-desc').value = '';
    document.getElementById('end-desc').value = '';
    document.getElementById('input-1').style.display = 'none';
    document.getElementById('input-2').style.display = 'none';
    document.getElementById('msg').innerText = "Lütfen listeden bir görev seçin veya mevcut göreve başlayın.";
}

function loadTaskTemplate() {
    currentTaskId = document.getElementById('task-select').value;
    console.log(`Loading template for task: ${currentTaskId}`);
    resetForNextTask();

    const taskType = getTaskType(currentTaskId);
    
    // Configure UI based on task type
    document.getElementById('step-2-ui').style.display = 'none';
    document.getElementById('step-3-ui').style.display = 'none';

    const step1UI = document.getElementById('step-1-ui');
    step1UI.classList.add('active-step');
    step1UI.style.opacity = '1';

    switch (taskType) {
        case 'POINT':
            step1UI.querySelector('p').innerHTML = "<strong>1. ADIM:</strong> Noktayı Seç & Bilgi Gir";
            document.getElementById('msg').innerText = "Haritada bir nokta seçin.";
            recordingState = "SELECT_POINT";
            break;
        case 'LINE':
            step1UI.querySelector('p').innerHTML = "<strong>1. ADIM:</strong> Başlangıç Noktası Seç & Bilgi Gir";
            document.getElementById('step-2-ui').style.display = 'block';
            document.getElementById('step-3-ui').style.display = 'block';
            document.getElementById('msg').innerText = "Başlangıç noktasını haritada işaretleyin.";
            recordingState = "SELECT_START";
            break;
        case 'POLYGON':
            step1UI.querySelector('p').innerHTML = "<strong>1. ADIM:</strong> Alanı Çiz & Bilgi Gir";
            document.getElementById('msg').innerText = "Haritaya tıklayarak alanın köşelerini çizin.";
            recordingState = "DRAW_POLYGON";
            break;
        default:
             document.getElementById('msg').innerText = "Bu görev tipi için kayıt arayüzü henüz tanımlanmadı.";
    }
}

function getTaskType(taskId) {
    const id = parseInt(taskId);
    if (id === 1 || id === 4 || id === 5) return 'POINT';
    if (id === 2 || id === 6 || id === 7) return 'LINE';
    if (id === 3 || id === 9) return 'POLYGON';
    if (id === 10) return 'FINAL'; // Special case for synthesis
    return 'UNKNOWN';
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