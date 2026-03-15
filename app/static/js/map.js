// Haritayı Bergama'ya odakla
let map = L.map('map').setView([39.1325, 27.1841], 15);

// OpenStreetMap katmanını ekle
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let currentLevel = 1;
let markers = L.layerGroup().addTo(map);
let routePoints = [];
let tempRoute = L.polyline([], {color: '#f59e0b', weight: 5, dashArray: '10, 10'}).addTo(map);
let subTask = 0; // 0: Minareyi bul, 1: Camiyi bul, 2: Rota çiz

// SEVİYE 1 AYARLARI (Nokta)
const targetAkropol = { lat: 39.1325, lng: 27.1841 };

// SEVİYE 2 HEDEFLERİ
// SEVİYE 2 YENİ HEDEFLER (Sorunsuz ve Dev Yapılar)
const yer1_Muze = [39.1192, 27.1772];      // Bergama Müzesi
const yer2_KizilAvlu = [39.1219, 27.1833]; // Kızıl Avlu (Bazilika)

map.on('click', function(e) {
    if (currentLevel === 1) {
        checkLevel1(e.latlng);
    } else if (currentLevel === 2) {
        handleLevel2Click(e.latlng);
    }
});

// --- SEVİYE 1 MANTIĞI ---
function checkLevel1(clicked) {
    const diff = Math.abs(clicked.lat - targetAkropol.lat) + Math.abs(clicked.lng - targetAkropol.lng);
    if (diff < 0.002) {
        markers.clearLayers();
        L.marker(clicked).addTo(markers).bindPopup("Tebrikler! Akropol işaretlendi.").openPopup();
        document.getElementById('msg').innerHTML = "<span style='color:green'>Mükemmel! Akropol'ü buldun.</span>";
        document.getElementById('next-btn').style.display = "block";
    } else {
        alert("Hedef Akropol tepesi, biraz daha kuzeye bak!");
    }
}

function startLevel1() {
    currentLevel = 1;
    markers.clearLayers();
    document.getElementById('next-btn').style.display = "none";
    
    // 1. Badge ve Başlık
    document.querySelector('.badge').innerText = "Seviye 1 / 10";
    document.getElementById('level-title').innerText = "Noktayı Koy!";
    
    // 2. Akropol Bilgi Notu (Yeni eklenen kısım)
    document.getElementById('info-card-content').innerHTML = `
        <strong>📚 Bilgi Notu:</strong><br>
        Antik Yunancada 'Yukarı Şehir' anlamına gelen <b>Akropol</b>, Bergama'nın en yüksek noktasıdır. Burada dünyanın en dik antik tiyatrosu bulunur.
    `;

    // 3. Görev Metni
    document.getElementById('task-instruction').innerHTML = `
        <strong>Görevin:</strong> Haritayı kullanarak tarihin kalbi olan <b>Bergama Akropolü</b>'nü bul ve üzerine bir kez tıkla.
    `;
    
    // Haritayı Akropol'e odakla
    map.flyTo([39.1325, 27.1841], 15);
    
    document.getElementById('msg').innerText = "Hadi, Akropol'ü işaretle!";
}

// --- SEVİYE 2'YE GEÇİŞ ---
function startLevel2() {
    currentLevel = 2;
    subTask = 0;
    markers.clearLayers();
    routePoints = [];
    if(tempRoute) tempRoute.setLatLngs([]);
    
    document.getElementById('level-title').innerText = "Tarihi Duraklar Arası Yolculuk";
    document.getElementById('info-card-content').innerHTML = `
        <strong>📚 Bilgi Notu:</strong><br>
        CBS'de noktalar birleşerek <b>Çizgi (Line)</b> verisini oluşturur. Bu, yolların ve rotaların temelidir.
    `;
    
    // Görev metni güncellendi
    updateInstruction("<strong>1. Adım:</strong> Haritanın tam ortasındaki büyük bahçeli binayı, yani <b>Bergama Müzesi</b>'ni bul ve işaretle.");
    
    // Haritayı iki dev yapıyı da görecek şekilde genişletiyoruz
    map.flyTo([39.1205, 27.1800], 16);
    document.getElementById('next-btn').style.display = "none";
}

function handleLevel2Click(latlng) {
    if (subTask === 0) { // Müze Kontrolü
        if (isNear(latlng, yer1_Muze)) {
            L.marker(yer1_Muze).addTo(markers).bindPopup("<b>Bergama Müzesi</b>").openPopup();
            
            subTask = 1;
            updateInstruction("<strong>2. Adım:</strong> Harika! Şimdi doğuya doğru bak ve dev kırmızı tuğlalı yapıyı, <b>Kızıl Avlu</b>'yu işaretle.");
            document.getElementById('msg').innerText = "Müze tamam! Şimdi Kızıl Avlu'ya tıkla.";
        } else {
            document.getElementById('msg').innerHTML = "<span style='color:red'>Hala bulamadın mı? Şehrin merkezindeki en büyük ağaçlıklı alan müzedir.</span>";
        }
    } 
    else if (subTask === 1) { // Kızıl Avlu Kontrolü
        if (isNear(latlng, yer2_KizilAvlu)) {
            L.marker(yer2_KizilAvlu).addTo(markers).bindPopup("<b>Kızıl Avlu</b>").openPopup();
            subTask = 2;
            updateInstruction("<strong>3. Adım:</strong> Şimdi Müze ile Kızıl Avlu arasını <b>Çizgi</b> çekerek birleştir (Rota oluştur).");
            document.getElementById('msg').innerText = "Noktalar tamam! Şimdi yolu çizmeye başla.";
            // Kontrol butonu burada belirsin
            document.getElementById('next-btn').innerText = "Rotayı Kontrol Et";
            document.getElementById('next-btn').style.display = "block";
            document.getElementById('next-btn').onclick = validateRoute;
        } else {
            alert("Kızıl Avlu sağ taraftaki o devasa kırmızı binadır!");
        }
    }
    else if (subTask === 2) { // Rota Çizimi
        routePoints.push(latlng);
        tempRoute.addLatLng(latlng);
        L.circleMarker(latlng, {radius: 4, color: '#f59e0b'}).addTo(markers);
    }
}

// Yardımcı fonksiyonlar
function isNear(latlng, target) {
    // Toleransı biraz daha esnettik (0.002 yaklaşık 200 metre demek)
    const dLat = latlng.lat - target[0];
    const dLng = latlng.lng - target[1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng); 
    
    return dist < 0.002; 
}

function updateInstruction(text) {
    document.getElementById('task-instruction').innerHTML = text;
}

function validateRoute() {
    if (routePoints.length < 2) {
        alert("Lütfen yolu çizmek için en az birkaç noktaya tıkla!");
        return;
    }
    // Başarı mesajı
    document.getElementById('msg').innerHTML = "<span style='color:green'><b>Tebrikler!</b> İki tarihi noktayı ve aralarındaki rotayı CBS ile modelledin.</span>";
    document.getElementById('next-btn').innerText = "Seviye 3'e Geç →";
    document.getElementById('next-btn').onclick = startLevel3; // Seviye 3 fonksiyonuna bağla
}

// Sayfa yüklendiğinde Seviye 1 ile başla
window.onload = startLevel1;