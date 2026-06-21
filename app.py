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

# Queue for sending commands down to ESP32
pending_commands = []

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
        
        proba_current = rf_current.predict_proba(input_df)[0]
        proba_1h = rf_1h.predict_proba(input_df)[0]
        
        def extract_probs(classes, proba):
            conf = int(max(proba) * 100)
            rain_prob = 0
            classes_list = list(classes)
            if "Hujan" in classes_list:
                rain_prob = int(proba[classes_list.index("Hujan")] * 100)
            return conf, rain_prob
            
        conf_curr, rain_curr = extract_probs(rf_current.classes_, proba_current)
        conf_1h, rain_1h = extract_probs(rf_1h.classes_, proba_1h)
        
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
            "weather_1h_ahead": pred_1h,
            "conf_curr": conf_curr,
            "rain_curr": rain_curr,
            "conf_1h": conf_1h,
            "rain_1h": rain_1h
        }
        latest_data["timestamp"] = time.time()
        
        # Consume pending commands if any
        cmds_to_send = []
        if pending_commands:
            cmds_to_send = pending_commands[:]
            pending_commands.clear()
        
        response = {
            "success": True,
            "predictions": latest_data["predictions"],
            "sensor_echo": latest_data["sensor_data"],
            "commands": cmds_to_send
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 400

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(latest_data)

@app.route('/api/command', methods=['POST'])
def enqueue_command():
    try:
        data = request.json
        cmd = data.get('cmd')
        if cmd:
            pending_commands.append(cmd)
            return jsonify({"success": True, "message": f"Command '{cmd}' enqueued"})
        return jsonify({"success": False, "error": "No command provided"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/', methods=['GET'])
def index():
    # Serve the frontend index.html
    return app.send_static_file('index.html')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "API is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
