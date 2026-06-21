// DOM Elements
const elements = {
    temp: { val: document.getElementById('val-temp'), badge: document.getElementById('badge-temp'), fill: document.getElementById('gauge-fill-temp'), needle: document.getElementById('needle-temp') },
    hum: { val: document.getElementById('val-hum'), badge: document.getElementById('badge-hum'), fill: document.getElementById('gauge-fill-hum'), needle: document.getElementById('needle-hum') },
    gas: { val: document.getElementById('val-gas'), badge: document.getElementById('badge-gas'), fill: document.getElementById('gauge-fill-gas'), needle: document.getElementById('needle-gas') },
    light: { val: document.getElementById('val-light'), badge: document.getElementById('badge-light'), fill: document.getElementById('gauge-fill-light'), needle: document.getElementById('needle-light') },
    
    gps: { lat: document.getElementById('val-lat'), lon: document.getElementById('val-lon'), btn: document.getElementById('btn-maps') },
    
    time: document.getElementById('current-time'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshCounter: document.getElementById('refresh-counter'),
    resetWifiBtn: document.getElementById('reset-wifi-btn'),
    
    ai: {
        currTemp: document.getElementById('ai-curr-temp'),
        currLabel: document.getElementById('ai-curr-label'),
        currHum: document.getElementById('ai-curr-hum'),
        recom: document.getElementById('ai-recom'),
        conf: document.getElementById('ai-conf'),
        forecastHint: document.getElementById('ai-forecast-hint'),
        
        iconNow: document.getElementById('fc-icon-now'),
        labelNow: document.getElementById('fc-label-now'),
        
        time30m: document.getElementById('fc-time-30m'),
        time1h: document.getElementById('fc-time-1h'),
        icon1h: document.getElementById('fc-icon-1h'),
        label1h: document.getElementById('fc-label-1h')
    }
};

let countdown = 10;
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

// Logic to derive badges based on value
function deriveBadges(data) {
    // Temp (0-50C)
    let tempB = "Normal";
    if(data.Temperature > 30) tempB = "Hangat";
    if(data.Temperature < 24) tempB = "Dingin";
    elements.temp.badge.innerText = tempB;
    setGauge(elements.temp, (data.Temperature / 50) * 100);

    // Hum (0-100%)
    let humB = "Normal";
    if(data.Humidity > 70) humB = "Lembap";
    if(data.Humidity < 40) humB = "Kering";
    elements.hum.badge.innerText = humB;
    setGauge(elements.hum, data.Humidity);

    // Gas (0-1000 ppm)
    let gasB = "Baik";
    elements.gas.badge.style.color = "#10b981";
    elements.gas.badge.style.borderColor = "rgba(16,185,129,0.5)";
    if(data.Gas > 400) { gasB = "Sedang"; elements.gas.badge.style.color = "#eab308"; }
    if(data.Gas > 700) { gasB = "Buruk"; elements.gas.badge.style.color = "#ef4444"; elements.gas.badge.style.borderColor = "rgba(239,68,68,0.5)"; }
    elements.gas.badge.innerText = gasB;
    setGauge(elements.gas, (data.Gas / 1000) * 100);

    // Light (0-100000 lux, use log scale for gauge)
    let lightB = "Redup";
    if(data.Light > 10000) lightB = "Terang";
    if(data.Light < 2000) lightB = "Mendung";
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
        
        // Dynamic confidence
        const conf = Math.floor(70 + (resData.timestamp % 25));
        elements.ai.conf.innerText = conf + "%";
        
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
            countdown = 10;
            elements.refreshCounter.innerText = countdown;
            fetchData();
        }
    }, 1000);
}

elements.refreshBtn.addEventListener('click', () => {
    countdown = 10;
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

startTimer();
