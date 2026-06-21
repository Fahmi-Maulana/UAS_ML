import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os

def train():
    # 1. Load Data
    dataset_path = "data/weather_dataset.csv"
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}. Please run generate_data.py first.")
        return
        
    df = pd.read_csv(dataset_path)
    
    # Features and Labels
    X = df[["Temperature", "Humidity", "Light", "Gas"]]
    y_current = df["Weather_Current"]
    y_1h = df["Weather_1H_Ahead"]
    
    print(f"Total data size: {len(df)}")
    
    # 2. Split Data: 70% Train, 20% Valid, 10% Test
    # First split: 70% Train, 30% (Valid + Test)
    X_train, X_temp, y_curr_train, y_curr_temp, y_1h_train, y_1h_temp = train_test_split(
        X, y_current, y_1h, test_size=0.30, random_state=42
    )
    
    # Second split: From the 30% temp, we want 20% Valid and 10% Test
    # Ratio is 2:1, so valid is 2/3 of temp, test is 1/3 of temp
    X_valid, X_test, y_curr_valid, y_curr_test, y_1h_valid, y_1h_test = train_test_split(
        X_temp, y_curr_temp, y_1h_temp, test_size=(1/3.0), random_state=42
    )
    
    print(f"Training data size: {len(X_train)} (70%)")
    print(f"Validation data size: {len(X_valid)} (20%)")
    print(f"Testing data size: {len(X_test)} (10%)")
    
    # 3. Build Models
    print("\n--- Training Model for Current Weather ---")
    rf_current = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_current.fit(X_train, y_curr_train)
    
    # Validate
    val_pred_curr = rf_current.predict(X_valid)
    print(f"Validation Accuracy (Current): {accuracy_score(y_curr_valid, val_pred_curr):.4f}")
    
    # Test
    test_pred_curr = rf_current.predict(X_test)
    print(f"Test Accuracy (Current): {accuracy_score(y_curr_test, test_pred_curr):.4f}")
    
    print("\n--- Training Model for 1 Hour Ahead Weather ---")
    rf_1h = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_1h.fit(X_train, y_1h_train)
    
    # Validate
    val_pred_1h = rf_1h.predict(X_valid)
    print(f"Validation Accuracy (1H): {accuracy_score(y_1h_valid, val_pred_1h):.4f}")
    
    # Test
    test_pred_1h = rf_1h.predict(X_test)
    print(f"Test Accuracy (1H): {accuracy_score(y_1h_test, test_pred_1h):.4f}")
    
    # 4. Save Models
    models = {
        "model_current": rf_current,
        "model_1h": rf_1h,
        "features": ["Temperature", "Humidity", "Light", "Gas"]
    }
    
    os.makedirs("models", exist_ok=True)
    with open("models/rf_weather_model.pkl", "wb") as f:
        pickle.dump(models, f)
        
    print("\nModels successfully saved to models/rf_weather_model.pkl")

if __name__ == "__main__":
    train()
