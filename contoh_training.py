# 1. IMPORT LIBRARY
import pandas as pd
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 2. PERSIAPAN DATASET
print("--- 1. Menyiapkan Data ---")
data = load_breast_cancer()
X = pd.DataFrame(data.data, columns=data.feature_names) # Fitur (kolom-kolom data)
y = data.target # Target (0: Ganas, 1: Jinak)
print(f"Total baris data: {X.shape[0]}, Total fitur: {X.shape[1]}")

# 3. MEMBAGI DATA (TRAINING & TESTING)
# Kita membagi data 80% untuk dilatih, 20% untuk diuji.
# Kita gunakan random_state=42 agar pembagian acaknya selalu sama.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. INISIALISASI MODEL (Mengatur Parameter)
print("\n--- 2. Membangun Model ---")
# n_estimators = 100 (membuat 100 pohon)
# random_state = 42 (jangkar keacakan agar hasil konsisten)
# oob_score = True (agar kita bisa melihat nilai evaluasi tanpa data test terpisah)
rf_model = RandomForestClassifier(n_estimators=100, random_state=42, oob_score=True)

# 5. PROSES TRAINING (Bagian Utama)
print("Sedang melatih model Random Forest...")
rf_model.fit(X_train, y_train)
print("Proses training selesai!")

# 6. MELIHAT ATRIBUT SETELAH TRAINING (Pengetahuan Model)
print("\n--- 3. Mengekstrak Pengetahuan Model ---")
# Melihat OOB Score (Ujian mini menggunakan data yang tidak terpilih saat bootstrapping)
print(f"OOB Score (Akurasi Ujian Mini): {rf_model.oob_score_ * 100:.2f}%")

# Melihat 3 fitur (kolom) yang paling penting dalam menentukan kanker
importances = pd.Series(rf_model.feature_importances_, index=X.columns)
top_3_fitur = importances.sort_values(ascending=False).head(3)
print("\n3 Fitur Paling Berpengaruh:")
print(top_3_fitur)

# 7. EVALUASI DAN PREDIKSI PADA DATA UJI (TESTING)
print("\n--- 4. Evaluasi Hasil Prediksi ---")
y_pred = rf_model.predict(X_test)

# Menghitung akurasi akhir
akurasi_akhir = accuracy_score(y_test, y_pred)
print(f"Akurasi pada Data Uji (Test Data): {akurasi_akhir * 100:.2f}%")

# Menampilkan laporan lengkap
print("\nLaporan Klasifikasi Lengkap:")
print(classification_report(y_test, y_pred, target_names=data.target_names))
