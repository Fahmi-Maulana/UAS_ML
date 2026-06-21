# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import os
import time

app = Flask(__name__, static_folder='frontend', static_url_path='/')
CORS(app)

# Load Models
MODEL_PATH = "models/rf_weather_model.pkl"
models = None

# Global state to store latest data from ESP32
latest_data = {
    "sensor_data": None,
    "predictions": None,
    "timestamp": 0
}

if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        models = pickle.load(f)
    print("Models loaded successfully.")
else:
    print("WARNING: Model file not found. Please train the model first.")

@app.route('/api/predict', methods=['POST'])
def predict():
    if not models:
        return jsonify({"error": "Model not loaded"}), 500
        
    try:
        data = request.json
        # Extract features
        temp = float(data.get('Temperature', 0))
        humidity = float(data.get('Humidity', 0))
        light = float(data.get('Light', 0))
        gas = float(data.get('Gas', 0))
        
        # We can accept GPS coordinates but they aren't used in the model
        lat = data.get('Latitude', 0.0)
        lon = data.get('Longitude', 0.0)
        
        # Prepare for prediction
        input_df = pd.DataFrame([{
            "Temperature": temp,
            "Humidity": humidity,
            "Light": light,
            "Gas": gas
        }])
        
        # Predict
        rf_current = models["model_current"]
        rf_1h = models["model_1h"]
        
        pred_current = rf_current.predict(input_df)[0]
        pred_1h = rf_1h.predict(input_df)[0]
        
        latest_data["sensor_data"] = {
            "Temperature": temp,
            "Humidity": humidity,
            "Light": light,
            "Gas": gas,
            "Latitude": lat,
            "Longitude": lon
        }
        latest_data["predictions"] = {
            "current_weather": pred_current,
            "weather_1h_ahead": pred_1h
        }
        latest_data["timestamp"] = time.time()
        
        response = {
            "success": True,
            "predictions": latest_data["predictions"],
            "sensor_echo": latest_data["sensor_data"]
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 400

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(latest_data)

@app.route('/', methods=['GET'])
def index():
    # Serve the frontend index.html
    return app.send_static_file('index.html')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "API is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
