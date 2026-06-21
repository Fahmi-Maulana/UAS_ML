// State variables
let currentData = {
    Temperature: 32.5,
    Humidity: 65.0,
    Light: 55000,
    Gas: 450,
    Latitude: -6.2000,
    Longitude: 106.8166
};

// DOM Elements
const elTemp = document.getElementById('val-temp');
const elHum = document.getElementById('val-hum');
const elLight = document.getElementById('val-light');
const elGas = document.getElementById('val-gas');
const elLat = document.getElementById('val-lat');
const elLon = document.getElementById('val-lon');

const iconCurrent = document.getElementById('icon-current');
const labelCurrent = document.getElementById('label-current');
const icon1H = document.getElementById('icon-1h');
const label1H = document.getElementById('label-1h');

const btnPredict = document.getElementById('btn-predict');
const btnSimulate = document.getElementById('btn-simulate');

// Icons mapping based on label
const weatherConfig = {
    "Cerah": { icon: "fa-sun", colorClass: "text-cerah" },
    "Berawan": { icon: "fa-cloud-sun", colorClass: "text-berawan" },
    "Mendung": { icon: "fa-cloud", colorClass: "text-mendung" },
    "Hujan": { icon: "fa-cloud-showers-heavy", colorClass: "text-hujan" }
};

// Initialize UI
function updateSensorUI() {
    elTemp.innerText = currentData.Temperature.toFixed(1);
    elHum.innerText = currentData.Humidity.toFixed(1);
    elLight.innerText = Math.round(currentData.Light).toLocaleString();
    elGas.innerText = currentData.Gas.toFixed(0);
    elLat.innerText = currentData.Latitude.toFixed(4);
    elLon.innerText = currentData.Longitude.toFixed(4);
}

// Randomize Data to simulate sensor reading
function simulateData() {
    // Add small random variations to make it look alive, or pick entirely new weather base
    const randState = Math.random();
    
    if (randState < 0.25) { // Cerah
        currentData.Temperature = 30 + Math.random() * 6;
        currentData.Humidity = 40 + Math.random() * 20;
        currentData.Light = 40000 + Math.random() * 60000;
    } else if (randState < 0.5) { // Berawan
        currentData.Temperature = 28 + Math.random() * 4;
        currentData.Humidity = 55 + Math.random() * 20;
        currentData.Light = 10000 + Math.random() * 30000;
    } else if (randState < 0.75) { // Mendung
        currentData.Temperature = 25 + Math.random() * 4;
        currentData.Humidity = 70 + Math.random() * 20;
        currentData.Light = 1000 + Math.random() * 9000;
    } else { // Hujan
        currentData.Temperature = 22 + Math.random() * 4;
        currentData.Humidity = 85 + Math.random() * 15;
        currentData.Light = 100 + Math.random() * 1900;
    }
    
    currentData.Gas = 100 + Math.random() * 700;
    
    // GPS slight movement
    currentData.Latitude += (Math.random() - 0.5) * 0.0001;
    currentData.Longitude += (Math.random() - 0.5) * 0.0001;
    
    updateSensorUI();
    
    // Reset labels
    labelCurrent.innerText = "Menunggu Prediksi...";
    labelCurrent.className = "weather-label";
    iconCurrent.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    iconCurrent.className = "weather-icon-large";
    
    label1H.innerText = "Menunggu Prediksi...";
    label1H.className = "weather-label";
    icon1H.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    icon1H.className = "weather-icon-large";
}

// Apply Prediction Result
function applyPredictionUI(elementIcon, elementLabel, result) {
    // Reset animation
    elementIcon.classList.remove('pop-animation');
    void elementIcon.offsetWidth; // trigger reflow
    
    const config = weatherConfig[result] || { icon: "fa-circle-question", colorClass: "" };
    
    elementIcon.innerHTML = `<i class="fa-solid ${config.icon}"></i>`;
    elementIcon.className = `weather-icon-large ${config.colorClass} pop-animation`;
    
    elementLabel.innerText = result;
    elementLabel.className = `weather-label ${config.colorClass}`;
}

// Fetch from Backend API
async function processPrediction() {
    const btnIcon = btnPredict.querySelector('i');
    btnIcon.className = "fa-solid fa-spinner fa-spin";
    btnPredict.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentData)
        });
        
        const resData = await response.json();
        
        if (resData.success) {
            applyPredictionUI(iconCurrent, labelCurrent, resData.predictions.current_weather);
            
            // Add a slight delay for 1H prediction for aesthetic effect
            setTimeout(() => {
                applyPredictionUI(icon1H, label1H, resData.predictions.weather_1h_ahead);
            }, 400);
        } else {
            alert("Error: " + (resData.error || "Unknown error"));
        }
        
    } catch (error) {
        console.error(error);
        alert("Gagal terhubung ke Server AI. Pastikan app.py sedang berjalan di port 5000.");
    } finally {
        btnIcon.className = "fa-solid fa-microchip";
        btnPredict.disabled = false;
    }
}

// Event Listeners
btnSimulate.addEventListener('click', () => {
    btnSimulate.querySelector('i').classList.add('fa-spin');
    setTimeout(() => {
        btnSimulate.querySelector('i').classList.remove('fa-spin');
    }, 500);
    simulateData();
});

btnPredict.addEventListener('click', processPrediction);

// Initial Load
updateSensorUI();
