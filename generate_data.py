import pandas as pd
import numpy as np
import random
import os

def generate_weather_data(num_samples=5000):
    np.random.seed(42)
    
    data = []
    
    # Generate sequential-like data or random combinations with logic
    for i in range(num_samples):
        # We'll randomly pick a weather state and generate sensor data around it
        # States: 0 = Cerah, 1 = Berawan, 2 = Mendung, 3 = Hujan
        
        state_current = np.random.choice([0, 1, 2, 3])
        
        # Determine sensors based on current state
        if state_current == 0: # Cerah
            temp = np.random.uniform(30.0, 36.0)
            humidity = np.random.uniform(40.0, 60.0)
            light = np.random.uniform(40000, 100000)
        elif state_current == 1: # Berawan
            temp = np.random.uniform(28.0, 32.0)
            humidity = np.random.uniform(55.0, 75.0)
            light = np.random.uniform(10000, 40000)
        elif state_current == 2: # Mendung
            temp = np.random.uniform(25.0, 29.0)
            humidity = np.random.uniform(70.0, 90.0)
            light = np.random.uniform(1000, 10000)
        else: # Hujan
            temp = np.random.uniform(22.0, 26.0)
            humidity = np.random.uniform(85.0, 100.0)
            light = np.random.uniform(100, 2000)
            
        gas_mq135 = np.random.uniform(100, 800) # Gas quality varies independently
        
        # Determine 1 hour ahead
        # It's usually similar or moves to adjacent state
        transition_probs = {
            0: [0.7, 0.2, 0.1, 0.0],
            1: [0.3, 0.5, 0.15, 0.05],
            2: [0.05, 0.2, 0.5, 0.25],
            3: [0.0, 0.1, 0.4, 0.5]
        }
        state_1h = np.random.choice([0, 1, 2, 3], p=transition_probs[state_current])
        
        labels = ["Cerah", "Berawan", "Mendung", "Hujan"]
        
        data.append({
            "Temperature": round(temp, 2),
            "Humidity": round(humidity, 2),
            "Light": round(light, 2),
            "Gas": round(gas_mq135, 2),
            "Weather_Current": labels[state_current],
            "Weather_1H_Ahead": labels[state_1h]
        })
        
    df = pd.DataFrame(data)
    
    # Save to CSV
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/weather_dataset.csv", index=False)
    print(f"Generated {num_samples} samples and saved to data/weather_dataset.csv")

if __name__ == "__main__":
    generate_weather_data()
