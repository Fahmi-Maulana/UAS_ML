import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
import seaborn as sns
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
    
    # Export Splits ke File CSV (Untuk Bukti ke Dosen)
    print("\n--- Menyimpan Bukti Split Data ke File CSV ---")
    train_df = pd.concat([X_train, y_curr_train, y_1h_train], axis=1)
    train_df.to_csv("data/dataset_train_70.csv", index=False)
    
    valid_df = pd.concat([X_valid, y_curr_valid, y_1h_valid], axis=1)
    valid_df.to_csv("data/dataset_valid_20.csv", index=False)
    
    test_df = pd.concat([X_test, y_curr_test, y_1h_test], axis=1)
    test_df.to_csv("data/dataset_test_10.csv", index=False)
    
    print("-> Tersimpan: data/dataset_train_70.csv (3500 baris)")
    print("-> Tersimpan: data/dataset_valid_20.csv (1000 baris)")
    print("-> Tersimpan: data/dataset_test_10.csv (500 baris)")
    
    # 3. Build Models
    print("\n--- Training Model for Current Weather ---")
    rf_current = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_current.fit(X_train, y_curr_train)
    
    # Validate
    val_pred_curr = rf_current.predict(X_valid)
    print(f"Validation Accuracy (Current): {accuracy_score(y_curr_valid, val_pred_curr):.4f}")
    
    # Test Current
    test_pred_curr = rf_current.predict(X_test)
    acc_curr = accuracy_score(y_curr_test, test_pred_curr)
    report_curr = classification_report(y_curr_test, test_pred_curr)
    print(f"Test Accuracy (Current): {acc_curr:.4f}")
    print("Classification Report (Current):")
    print(report_curr)
    
    # Plot Confusion Matrix Current
    plt.figure(figsize=(8, 6))
    cm_curr = confusion_matrix(y_curr_test, test_pred_curr, labels=rf_current.classes_)
    sns.heatmap(cm_curr, annot=True, fmt='d', cmap='Blues', xticklabels=rf_current.classes_, yticklabels=rf_current.classes_)
    plt.title('Confusion Matrix - Cuaca Saat Ini')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.tight_layout()
    plt.savefig('confusion_matrix_current.png')
    plt.close()
    
    print("\n--- Training Model for 1 Hour Ahead Weather ---")
    rf_1h = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_1h.fit(X_train, y_1h_train)
    
    # Validate 1H
    val_pred_1h = rf_1h.predict(X_valid)
    print(f"Validation Accuracy (1H): {accuracy_score(y_1h_valid, val_pred_1h):.4f}")
    
    # Test 1H
    test_pred_1h = rf_1h.predict(X_test)
    acc_1h = accuracy_score(y_1h_test, test_pred_1h)
    report_1h = classification_report(y_1h_test, test_pred_1h)
    print(f"Test Accuracy (1H): {acc_1h:.4f}")
    print("Classification Report (1H Ahead):")
    print(report_1h)
    
    # Plot Confusion Matrix 1H
    plt.figure(figsize=(8, 6))
    cm_1h = confusion_matrix(y_1h_test, test_pred_1h, labels=rf_1h.classes_)
    sns.heatmap(cm_1h, annot=True, fmt='d', cmap='Greens', xticklabels=rf_1h.classes_, yticklabels=rf_1h.classes_)
    plt.title('Confusion Matrix - Cuaca 1 Jam ke Depan')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.tight_layout()
    plt.savefig('confusion_matrix_1h.png')
    plt.close()
    
    # --- VISUALIZATION OF TRAINING PROCESS ---
    print("\n--- Visualizing Training Process (OOB Error vs Number of Trees) ---")
    rf_vis = RandomForestClassifier(n_estimators=1, warm_start=True, oob_score=True, random_state=42)
    
    min_estimators = 15
    max_estimators = 150
    error_rate = []
    
    for i in range(min_estimators, max_estimators + 1, 5):
        rf_vis.set_params(n_estimators=i)
        rf_vis.fit(X_train, y_curr_train)
        oob_error = 1 - rf_vis.oob_score_
        error_rate.append((i, oob_error))
        
    trees, errors = zip(*error_rate)
    plt.figure(figsize=(10, 5))
    plt.plot(trees, errors, marker='o', color='red', label='OOB Error Rate')
    plt.xlabel('Jumlah Pohon Keputusan (n_estimators)')
    plt.ylabel('Tingkat Kesalahan (OOB Error)')
    plt.title('Proses Pelatihan Random Forest\n(Penurunan Kesalahan Seiring Bertambahnya Pohon)')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig('training_process.png')
    plt.close()

    print("\n--- Plotting Feature Importances ---")
    importances = rf_current.feature_importances_
    features = X.columns
    indices = np.argsort(importances)
    plt.figure(figsize=(8, 5))
    plt.title('Seberapa Penting Masing-masing Sensor? (Feature Importance)')
    plt.barh(range(len(indices)), importances[indices], color='purple', align='center')
    plt.yticks(range(len(indices)), [features[i] for i in indices])
    plt.xlabel('Tingkat Kepentingan Relatif (0 - 1.0)')
    plt.tight_layout()
    plt.savefig('feature_importance.png')
    plt.close()
    
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

    # 5. Menyimpan Laporan Klasifikasi Fisik
    print("\n--- Menyimpan Laporan Fisik (Untuk Dosen) ---")
    with open("data/laporan_akurasi.txt", "w") as f:
        f.write("=== LAPORAN EVALUASI MODEL RANDOM FOREST ===\n\n")
        f.write("1. MODEL PREDIKSI CUACA SAAT INI\n")
        f.write(f"Akurasi Pengujian (Test Accuracy): {acc_curr * 100:.2f}%\n")
        f.write("Classification Report:\n")
        f.write(report_curr)
        f.write("\n")
        f.write("-" * 50 + "\n\n")
        f.write("2. MODEL PREDIKSI CUACA 1 JAM KE DEPAN\n")
        f.write(f"Akurasi Pengujian (Test Accuracy): {acc_1h * 100:.2f}%\n")
        f.write("Classification Report:\n")
        f.write(report_1h)
        f.write("\n")
        f.write("=============================================\n")
    print("-> Tersimpan: data/laporan_akurasi.txt")

if __name__ == "__main__":
    train()
