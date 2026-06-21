// DOM Elements
const elements = {
    temp: { val: document.getElementById('val-temp'), badge: document.getElementById('badge-temp'), fill: document.getElementById('gauge-fill-temp'), needle: document.getElementById('needle-temp') },
    hum: { val: document.getElementById('val-hum'), badge: document.getElementById('badge-hum'), fill: document.getElementById('gauge-fill-hum'), needle: document.getElementById('needle-hum') },
    gas: { val: document.getElementById('val-gas'), badge: document.getElementById('badge-gas'), fill: document.getElementById('gauge-fill-gas'), needle: document.getElementById('needle-gas') },
    light: { val: document.getElementById('val-light'), badge: document.getElementById('badge-light'), fill: document.getElementById('gauge-fill-light'), needle: document.getElementById('needle-light') },
    
    gps: { lat: document.getElementById('val-lat'), lon: document.getElementById('val-lon'), address: document.getElementById('val-address'), btn: document.getElementById('btn-maps') },
    
    time: document.getElementById('current-time'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshCounter: document.getElementById('refresh-counter'),
    resetWifiBtn: document.getElementById('reset-wifi-btn'),
    
    battery: {
        badge: document.getElementById('badge-battery'),
        text: document.getElementById('bat-text'),
        icon: document.getElementById('bat-icon'),
        popup: document.getElementById('bat-popup'),
        v: document.getElementById('bp-v'),
        i: document.getElementById('bp-i'),
        p: document.getElementById('bp-p')
    },
    
    ai: {
        currTemp: document.getElementById('ai-curr-temp'),
        currLabel: document.getElementById('ai-curr-label'),
        currHum: document.getElementById('ai-curr-hum'),
        recom: document.getElementById('ai-recom'),
        conf: document.getElementById('ai-conf'),
        forecastHint: document.getElementById('ai-forecast-hint'),
        
        iconNow: document.getElementById('fc-icon-now'),
        labelNow: document.getElementById('fc-label-now'),
        rainNow: document.getElementById('fc-rain-now'),
        confNow: document.getElementById('fc-conf-now'),
        
        time30m: document.getElementById('fc-time-30m'),
        icon30m: document.getElementById('fc-icon-30m'),
        label30m: document.getElementById('fc-label-30m'),
        rain30m: document.getElementById('fc-rain-30m'),
        conf30m: document.getElementById('fc-conf-30m'),
        
        time1h: document.getElementById('fc-time-1h'),
        icon1h: document.getElementById('fc-icon-1h'),
        label1h: document.getElementById('fc-label-1h'),
        rain1h: document.getElementById('fc-rain-1h'),
        conf1h: document.getElementById('fc-conf-1h')
    }
};

let countdown = 3;
let refreshTimer;

// Gauge Math (stroke-dashoffset from 125.6 to 0, needle rotation from -90 to +90)
function setGauge(el, percentage) {
    const p = Math.max(0, Math.min(100, percentage));
    
    // Fill
    const offset = 125.6 - (125.6 * (p / 100));
    el.fill.style.strokeDashoffset = offset;
    
    // Needle (SVG origin is 50,50. We want to rotate from 180deg (left) to 360deg (right) around cx)
    // Actually the initial needle is drawn pointing straight UP (270 deg mathematically in SVG, but standard is 0 deg for UP).
    // Let's rotate from -90deg to +90deg
    const angle = -90 + (180 * (p / 100));
    el.needle.style.transform = `rotate(${angle}deg)`;
    el.needle.style.transformOrigin = `50px 50px`;
}

// Logic to derive badges based on scientific references
function deriveBadges(data) {
    // Suhu (ASHRAE/WHO Tropis)
    let tempB = "Normal";
    elements.temp.badge.style.color = "#10b981";
    elements.temp.badge.style.borderColor = "rgba(16,185,129,0.5)";
    if(data.Temperature > 28) { tempB = "Panas"; elements.temp.badge.style.color = "#ef4444"; elements.temp.badge.style.borderColor = "rgba(239,68,68,0.5)"; }
    else if(data.Temperature < 24) { tempB = "Sejuk"; elements.temp.badge.style.color = "#38bdf8"; elements.temp.badge.style.borderColor = "rgba(56,189,248,0.5)"; }
    elements.temp.badge.innerText = tempB;
    setGauge(elements.temp, (data.Temperature / 50) * 100);

    // Kelembapan (BMKG/ASHRAE Ideal: 40-60%)
    let humB = "Nyaman";
    elements.hum.badge.style.color = "#10b981";
    elements.hum.badge.style.borderColor = "rgba(16,185,129,0.5)";
    if(data.Humidity > 60) { humB = "Lembap"; elements.hum.badge.style.color = "#38bdf8"; elements.hum.badge.style.borderColor = "rgba(56,189,248,0.5)"; }
    else if(data.Humidity < 40) { humB = "Kering"; elements.hum.badge.style.color = "#eab308"; elements.hum.badge.style.borderColor = "rgba(234,179,8,0.5)"; }
    elements.hum.badge.innerText = humB;
    setGauge(elements.hum, data.Humidity);

    // Kualitas Udara MQ135 (Standar AQI 0-500 ppm)
    // EPA AQI: < 50 Baik, 51-150 Sedang, > 150 Buruk
    let gasB = "Baik";
    elements.gas.badge.style.color = "#10b981";
    elements.gas.badge.style.borderColor = "rgba(16,185,129,0.5)";
    if(data.Gas > 50) { gasB = "Sedang"; elements.gas.badge.style.color = "#eab308"; elements.gas.badge.style.borderColor = "rgba(234,179,8,0.5)"; }
    if(data.Gas > 150) { gasB = "Buruk"; elements.gas.badge.style.color = "#ef4444"; elements.gas.badge.style.borderColor = "rgba(239,68,68,0.5)"; }
    elements.gas.badge.innerText = gasB;
    setGauge(elements.gas, (data.Gas / 500) * 100); // Scale up to 500 for gauge

    // Cahaya Lux
    let lightB = "Pagi/Sore";
    elements.light.badge.style.color = "#eab308";
    elements.light.badge.style.borderColor = "rgba(234,179,8,0.5)";
    if(data.Light > 10000) { lightB = "Terik"; elements.light.badge.style.color = "#ef4444"; elements.light.badge.style.borderColor = "rgba(239,68,68,0.5)"; }
    else if(data.Light < 1000) { lightB = "Mendung"; elements.light.badge.style.color = "#94a3b8"; elements.light.badge.style.borderColor = "rgba(148,163,184,0.5)"; }
    elements.light.badge.innerText = lightB;
    let lightPct = (Math.log10(Math.max(1, data.Light)) / 5) * 100;
    setGauge(elements.light, lightPct);
}

const weatherIcons = {
    "Cerah": "fa-sun",
    "Berawan": "fa-cloud-sun",
    "Mendung": "fa-cloud",
    "Hujan": "fa-cloud-showers-heavy"
};

function updateClock() {
    const now = new Date();
    const ds = now.toLocaleDateString('id-ID');
    const ts = now.toLocaleTimeString('id-ID');
    elements.time.innerText = `${ds}, ${ts}`;
    
    // Update forecast times
    const d30 = new Date(now.getTime() + 30*60000);
    const d1h = new Date(now.getTime() + 60*60000);
    
    elements.ai.time30m.innerText = d30.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
    elements.ai.time1h.innerText = d1h.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
}

let lastLat = null;
let lastLon = null;
let cachedAddress = "Mendeteksi koordinat satelit...";

async function updateLocationAddress(lat, lon) {
    if (lat === 0 && lon === 0) {
        elements.gps.address.innerText = "Tidak ada sinyal GPS.";
        return;
    }
    
    // Check cache to avoid spamming Nominatim API
    if (lastLat === lat && lastLon === lon) {
        elements.gps.address.innerText = cachedAddress;
        return;
    }
    
    try {
        elements.gps.address.innerText = "Memuat alamat...";
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
            }
        });
        const data = await response.json();
        
        if (data && data.display_name) {
            // Simplify address to fit nicely
            const parts = data.display_name.split(', ');
            let shortAddress = data.display_name;
            if (parts.length > 4) {
                shortAddress = parts.slice(0, 4).join(', ');
            }
            cachedAddress = shortAddress;
        } else {
            cachedAddress = "Alamat tidak ditemukan.";
        }
        
        lastLat = lat;
        lastLon = lon;
        elements.gps.address.innerText = cachedAddress;
        
    } catch (err) {
        console.error("Reverse geocoding error:", err);
        cachedAddress = `Koordinat: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        lastLat = lat;
        lastLon = lon;
        elements.gps.address.innerText = cachedAddress;
    }
}

async function fetchData() {
    try {
        elements.refreshBtn.querySelector('i').classList.add('fa-spin');
        
        // Fetch Real Data from Backend
        const res = await fetch('/api/data');
        const resData = await res.json();
        
        const now = Date.now() / 1000; // in seconds
        const espStatusPill = document.querySelectorAll('.status-pill')[1]; // second pill is ESP32
        
        // If no data or last data was received more than 30 seconds ago, consider ESP Offline
        if (!resData.sensor_data || (now - resData.timestamp) > 30) {
            // ESP Offline UI State
            espStatusPill.className = "status-pill";
            espStatusPill.style.color = "#ef4444";
            espStatusPill.style.borderColor = "rgba(239, 68, 68, 0.3)";
            espStatusPill.style.background = "rgba(239, 68, 68, 0.1)";
            espStatusPill.querySelector('.dot').style.background = "#ef4444";
            espStatusPill.childNodes[1].nodeValue = " ESP32 (Offline)";
            
            // Reset UI Values
            elements.temp.val.innerText = "--";
            elements.hum.val.innerText = "--";
            elements.gas.val.innerText = "--";
            elements.light.val.innerText = "--";
            
            elements.gps.lat.innerText = "--";
            elements.gps.lon.innerText = "--";
            elements.gps.address.innerText = "Sistem Offline. Menunggu koneksi...";
            elements.gps.btn.href = "#";
            
            elements.ai.currTemp.innerText = "--°";
            elements.ai.currLabel.innerText = "Offline";
            elements.ai.currHum.innerText = "Menunggu koneksi dari ESP32...";
            
            elements.ai.iconNow.className = "fa-solid fa-circle-question fc-icon";
            elements.ai.labelNow.innerText = "--";
            
            elements.ai.icon1h.className = "fa-solid fa-circle-question fc-icon";
            elements.ai.label1h.innerText = "--";
            
            elements.ai.recom.innerText = "Sistem standby menunggu paket data dari alat.";
            elements.ai.recom.style.color = "#94a3b8";
            elements.ai.conf.innerText = "--%";
            elements.ai.forecastHint.innerText = "";
            
            setGauge(elements.temp, 0);
            setGauge(elements.hum, 0);
            setGauge(elements.gas, 0);
            setGauge(elements.light, 0);
            
            elements.temp.badge.innerText = "-";
            elements.hum.badge.innerText = "-";
            elements.gas.badge.innerText = "-";
            elements.light.badge.innerText = "-";
            return;
        }
        
        // ESP Online UI State
        espStatusPill.className = "status-pill status-active";
        espStatusPill.style = "";
        espStatusPill.querySelector('.dot').style = "";
        espStatusPill.childNodes[1].nodeValue = " ESP32";
        
        const simData = resData.sensor_data;
        elements.temp.val.innerText = simData.Temperature.toFixed(1);
        elements.hum.val.innerText = simData.Humidity.toFixed(1);
        elements.gas.val.innerText = simData.Gas.toFixed(0);
        elements.light.val.innerText = simData.Light.toFixed(0);
        
        elements.gps.lat.innerText = simData.Latitude.toFixed(6);
        elements.gps.lon.innerText = simData.Longitude.toFixed(6);
        elements.gps.btn.href = `https://maps.google.com/?q=${simData.Latitude},${simData.Longitude}`;
        
        updateLocationAddress(simData.Latitude, simData.Longitude);
        
        // Battery Logic (1-cell Li-ion assumed: 4.2V is 100%, 3.2V is 0%)
        let v = simData.BatVoltage || 0;
        let pct = ((v - 3.2) / (4.2 - 3.2)) * 100;
        pct = Math.max(0, Math.min(100, Math.round(pct)));
        
        elements.battery.text.innerText = `Baterai ${pct}%`;
        
        if (simData.BatCurrent > 5) {
            elements.battery.icon.className = "fa-solid fa-bolt";
            elements.battery.icon.style.color = "#fbbf24";
        } else {
            if (pct > 80) elements.battery.icon.className = "fa-solid fa-battery-full";
            else if (pct > 50) elements.battery.icon.className = "fa-solid fa-battery-three-quarters";
            else if (pct > 20) elements.battery.icon.className = "fa-solid fa-battery-quarter";
            else elements.battery.icon.className = "fa-solid fa-battery-empty";
            elements.battery.icon.style.color = "";
        }
        
        elements.battery.v.innerText = `${v.toFixed(2)} V`;
        elements.battery.i.innerText = `${simData.BatCurrent.toFixed(1)} mA`;
        elements.battery.p.innerText = `${simData.BatPower.toFixed(0)} mW`;
        
        deriveBadges(simData);
        
        const curr = resData.predictions.current_weather;
        const f1h = resData.predictions.weather_1h_ahead;
        
        elements.ai.currTemp.innerText = Math.round(simData.Temperature) + "°";
        elements.ai.currLabel.innerText = curr;
        elements.ai.currHum.innerText = `Kelembapan ${Math.round(simData.Humidity)}%`;
        
        elements.ai.iconNow.className = `fa-solid ${weatherIcons[curr] || 'fa-cloud'} fc-icon`;
        elements.ai.labelNow.innerText = curr;
        
        elements.ai.icon1h.className = `fa-solid ${weatherIcons[f1h] || 'fa-cloud'} fc-icon`;
        elements.ai.label1h.innerText = f1h;
        
        // Populate stats for 1 Hour Forecast Blocks
        elements.ai.rainNow.innerText = resData.predictions.rain_curr + "%";
        elements.ai.confNow.innerText = resData.predictions.conf_curr + "%";
        
        // 30m is transitional (interpolate slightly)
        let rain30 = Math.floor((resData.predictions.rain_curr + resData.predictions.rain_1h) / 2);
        let conf30 = Math.floor((resData.predictions.conf_curr + resData.predictions.conf_1h) / 2);
        elements.ai.rain30m.innerText = rain30 + "%";
        elements.ai.conf30m.innerText = conf30 + "%";
        
        elements.ai.rain1h.innerText = resData.predictions.rain_1h + "%";
        elements.ai.conf1h.innerText = resData.predictions.conf_1h + "%";
        
        elements.ai.conf.innerText = resData.predictions.conf_curr + "%";
        
        // Recommendations
        if (curr === "Hujan" || f1h === "Hujan") {
            elements.ai.recom.innerText = "Siapkan payung, potensi hujan tinggi.";
            elements.ai.recom.style.color = "#60a5fa";
        } else if (simData.Gas > 600) {
            elements.ai.recom.innerText = "Gunakan masker, kualitas udara buruk.";
            elements.ai.recom.style.color = "#ef4444";
        } else if (curr === "Cerah" && simData.Temperature > 32) {
            elements.ai.recom.innerText = "Cuaca panas terik, kurangi aktivitas luar ruangan.";
            elements.ai.recom.style.color = "#f59e0b";
        } else {
            elements.ai.recom.innerText = "Cuaca bersahabat untuk aktivitas normal.";
            elements.ai.recom.style.color = "#10b981";
        }
        
        if (f1h === "Hujan") {
            elements.ai.forecastHint.innerText = "Hujan diperkirakan terjadi pada " + elements.ai.time1h.innerText;
        } else {
            elements.ai.forecastHint.innerText = "Kondisi stabil hingga 1 jam ke depan.";
        }
        
    } catch(e) {
        console.error(e);
    } finally {
        setTimeout(() => {
            elements.refreshBtn.querySelector('i').classList.remove('fa-spin');
        }, 500);
    }
}

function startTimer() {
    updateClock();
    setInterval(updateClock, 1000);
    
    fetchData();
    refreshTimer = setInterval(() => {
        countdown--;
        elements.refreshCounter.innerText = countdown;
        if(countdown <= 0) {
            countdown = 3;
            elements.refreshCounter.innerText = countdown;
            fetchData();
        }
    }, 1000);
}

elements.refreshBtn.addEventListener('click', () => {
    countdown = 3;
    elements.refreshCounter.innerText = countdown;
    fetchData();
});

if (elements.resetWifiBtn) {
    elements.resetWifiBtn.addEventListener('click', async () => {
        const confirmReset = confirm("Peringatan!\n\nApakah Anda yakin ingin mereset konfigurasi WiFi ESP32? Perangkat akan terputus dari jaringan dan harus dikonfigurasi ulang secara manual via Access Point 'Cuaca_AI_AP'.");
        if (confirmReset) {
            try {
                const res = await fetch('/api/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cmd: 'reset_wifi' })
                });
                const result = await res.json();
                if (result.success) {
                    alert("Perintah Reset WiFi telah dimasukkan ke dalam antrean. ESP32 akan segera terputus dan melakukan restart.");
                } else {
                    alert("Gagal mengirim perintah: " + result.error);
                }
            } catch (err) {
                console.error(err);
                alert("Terjadi kesalahan jaringan saat mengirim perintah.");
            }
        }
    });
}

// Navbar Buttons Feedback
const btnMenuMain = document.getElementById('btn-menu-main');
const btnMenuMore = document.getElementById('btn-menu-more');
const badgeBattery = document.getElementById('badge-battery');

if (btnMenuMain) {
    btnMenuMain.addEventListener('click', () => {
        alert("Menu Navigasi Samping belum tersedia pada versi ini.\n\nSistem ini dirancang sebagai dasbor satu halaman (Single Page Dashboard).");
    });
}

if (btnMenuMore) {
    btnMenuMore.addEventListener('click', () => {
        alert("Menu Pengaturan Lanjutan (Pengaturan Tema, Notifikasi, dsb) dapat dikembangkan lebih lanjut di sini.");
    });
}

if (badgeBattery) {
    badgeBattery.addEventListener('click', () => {
        if (elements.battery.popup.style.display === "none") {
            elements.battery.popup.style.display = "flex";
        } else {
            elements.battery.popup.style.display = "none";
        }
    });
}

// Close popup if clicking outside
document.addEventListener('click', (e) => {
    if (elements.battery.popup && elements.battery.popup.style.display === "flex") {
        if (!badgeBattery.contains(e.target) && !elements.battery.popup.contains(e.target)) {
            elements.battery.popup.style.display = "none";
        }
    }
});

startTimer();
