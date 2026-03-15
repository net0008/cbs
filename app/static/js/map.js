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
// SEVİYE 2 HEDEFLERİ - Güncellenmiş hassas koordinatlar
const selcukluMinare = [39.12052, 27.17735]; // Biraz daha batıya çekildi
const uluCami = [39.12215, 27.18185];

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
    
    document.getElementById('next-btn').style.display = "none";
    
    document.getElementById('level-title').innerText = "Adım Adım Rota Oluştur";
    document.getElementById('info-card-content').innerHTML = `
        <strong>📚 Bilgi Notu:</strong><br>
        Önce önemli noktaları (nokta verisi) belirleyip, sonra aralarındaki bağlantıyı (çizgi verisi) kuracağız.
    `;
    updateInstruction("<strong>1. Adım:</strong> Bergama'nın en eski Türk eseri olan <b>Selçuklu Minaresi</b>'ni haritada bul ve işaretle.");
    
    map.flyTo([39.1213, 27.1796], 17);
}

function handleLevel2Click(latlng) {
    if (subTask === 0) { // Selçuklu Minaresi'ni bulma
        if (isNear(latlng, [39.1205, 27.1775])) {
            L.marker([39.1205, 27.1775]).addTo(markers).bindPopup("Selçuklu Minaresi").openPopup();
            subTask = 1;
            updateInstruction("<strong>2. Adım:</strong> Şimdi <b>Ulu Cami</b>'yi (Yıldırım Bayezid) bul ve işaretle.");
            document.getElementById('msg').innerText = "Harika! İlk noktayı buldun.";
        } else {
            alert("Minare biraz daha batıda kalıyor, tekrar dene!");
        }
    } 
    else if (subTask === 1) { // Ulu Cami'yi bulma
        if (isNear(latlng, uluCami)) {
            L.marker(uluCami).addTo(markers).bindPopup("Ulu Cami").openPopup();
            subTask = 2;
            updateInstruction("<strong>3. Adım:</strong> Şimdi bu iki nokta arasını <b>Çizgi</b> çekerek birleştir (Rota oluştur).");
            document.getElementById('msg').innerText = "Noktalar tamam! Şimdi yolu çizmeye başla.";
            // Kontrol butonu burada belirsin
            document.getElementById('next-btn').innerText = "Rotayı Kontrol Et";
            document.getElementById('next-btn').style.display = "block";
            document.getElementById('next-btn').onclick = validateRoute;
        } else {
            alert("Ulu Cami biraz daha kuzeydoğuda, minarenin ilerisinde!");
        }
    }
    else if (subTask === 2) { // Rota çizme
        routePoints.push(latlng);
        tempRoute.addLatLng(latlng);
        L.circleMarker(latlng, {radius: 3, color: '#f59e0b'}).addTo(markers);
    }
}

// Yardımcı fonksiyonlar
function isNear(latlng, target) {
    // Math.hypot ile gerçek kuş uçuşu mesafe kontrolü (daha sağlıklı)
    const y = latlng.lat - target[0];
    const x = latlng.lng - target[1];
    const dist = Math.sqrt(x*x + y*y); 
    
    return dist < 0.0006; // Yaklaşık 50-60 metrelik güvenli bir alan
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