# Gunakan image Python ringan
FROM python:3.11-slim

# Set direktori kerja di dalam container
WORKDIR /app

# Copy file requirements terlebih dahulu untuk caching layer Docker
COPY requirements.txt .

# Install dependensi
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh file proyek ke dalam container
COPY . .

# Expose port Flask
EXPOSE 5000

# Jalankan server API (app.py) menggunakan python
CMD ["python", "app.py"]
