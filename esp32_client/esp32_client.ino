#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>

// Sensor Libraries
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <TinyGPSPlus.h>
#include <U8g2lib.h>

// ===================== KONFIGURASI PIN =====================
static const int PIN_I2C_SDA = 21;
static const int PIN_I2C_SCL = 22;

static const int PIN_GPS_RX = 16;
static const int PIN_GPS_TX = 17;
static const uint32_t GPS_BAUD = 9600;

static const int PIN_MQ135_ADC = 36;
static const int PIN_WIFI_LED = 2; // LED Indikator WiFi ESP32

// ===================== KONFIGURASI SERVER =====================
// Alamat HTTPS Server CasaOS Anda
const char* serverUrl = "https://rf.ijuloss.my.id/api/predict";

// ===================== OBJEK SENSOR =====================
Adafruit_SHT31 sht31 = Adafruit_SHT31();
BH1750 lightMeter;
TinyGPSPlus gps;
HardwareSerial SerialGPS(2); // Menggunakan UART2 (Pin 16, 17)

// OLED Display (Resolusi 128x64) - Sesuaikan nama jika tipe OLED Anda berbeda
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE, PIN_I2C_SCL, PIN_I2C_SDA);

WiFiManager wm;

// Timer untuk Interval Pengiriman Data (misal: kirim tiap 10 detik)
unsigned long previousMillis = 0;
const long interval = 10000;

void setup() {
  Serial.begin(115200);
  SerialGPS.begin(GPS_BAUD, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  
  pinMode(PIN_WIFI_LED, OUTPUT);
  digitalWrite(PIN_WIFI_LED, LOW);

  // Inisialisasi I2C
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  // Inisialisasi Layar OLED
  u8g2.begin();
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 15, "Memulai Sistem...");
  u8g2.sendBuffer();

  // Inisialisasi Sensor SHT31
  if (!sht31.begin(0x44)) { // Alamat I2C default SHT31 biasanya 0x44
    Serial.println("Gagal menemukan SHT31!");
    u8g2.drawStr(0, 30, "SHT31 Error!");
    u8g2.sendBuffer();
  }

  // Inisialisasi Sensor BH1750
  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire)) {
    Serial.println("Gagal menemukan BH1750!");
    u8g2.drawStr(0, 45, "BH1750 Error!");
    u8g2.sendBuffer();
  }

  // Koneksi WiFi dengan WiFiManager (Non-Blocking)
  wm.setConfigPortalBlocking(false);
  
  u8g2.clearBuffer();
  u8g2.drawStr(0, 15, "Menghubungkan WiFi...");
  u8g2.drawStr(0, 30, "Atau buka portal:");
  u8g2.drawStr(0, 45, "Cuaca_AI_AP");
  u8g2.sendBuffer();

  wm.autoConnect("Cuaca_AI_AP");

  // Konfigurasi ArduinoOTA
  ArduinoOTA.setHostname("Cuaca-AI-ESP32");
  ArduinoOTA.onStart([]() {
    u8g2.clearBuffer();
    u8g2.drawStr(0, 15, "OTA Update Start...");
    u8g2.sendBuffer();
  });
  ArduinoOTA.onEnd([]() {
    u8g2.clearBuffer();
    u8g2.drawStr(0, 15, "OTA Selesai!");
    u8g2.drawStr(0, 30, "Restarting...");
    u8g2.sendBuffer();
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    u8g2.clearBuffer();
    u8g2.drawStr(0, 15, "OTA Update...");
    u8g2.setCursor(0, 30);
    u8g2.print(progress / (total / 100));
    u8g2.print(" %");
    u8g2.sendBuffer();
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
  });
  ArduinoOTA.begin();
}

void loop() {
  wm.process(); // Proses WiFiManager secara non-blocking
  ArduinoOTA.handle(); // Tangani request OTA

  // Update LED Indikator WiFi
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_WIFI_LED, HIGH);
  } else {
    digitalWrite(PIN_WIFI_LED, LOW);
  }

  // Update data GPS setiap kali ada serial masuk
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  unsigned long currentMillis = millis();

  // Kirim data setiap interval
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // --- BACA DATA SENSOR ---
    float temp = sht31.readTemperature();
    float hum = sht31.readHumidity();
    float light = lightMeter.readLightLevel();
    
    // Baca Analog MQ135 (0 - 4095 pada ESP32)
    // Bisa dikalibrasi sesuai kebutuhan, ini hanya raw value / konversi sederhana
    int rawGas = analogRead(PIN_MQ135_ADC);
    float gasPPM = map(rawGas, 0, 4095, 0, 1000); // Penyesuaian Dummy Mapping

    // Baca Data GPS
    float lat = 0.0;
    float lon = 0.0;
    if (gps.location.isValid()) {
      lat = gps.location.lat();
      lon = gps.location.lng();
    }

    // Tampilkan di OLED
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_ncenB08_tr);
    if (WiFi.status() == WL_CONNECTED) {
      u8g2.setCursor(0, 10); u8g2.print("IP: "); u8g2.print(WiFi.localIP());
    } else {
      u8g2.setCursor(0, 10); u8g2.print("AP: Cuaca_AI_AP");
    }
    u8g2.setCursor(0, 25); u8g2.print("T:"); u8g2.print(temp, 1); u8g2.print("C H:"); u8g2.print(hum, 0); u8g2.print("%");
    u8g2.setCursor(0, 40); u8g2.print("L:"); u8g2.print(light, 0); u8g2.print("lx G:"); u8g2.print(gasPPM, 0);
    u8g2.setCursor(0, 55); u8g2.print("Mengirim data...");
    u8g2.sendBuffer();

    // --- KIRIM DATA KE SERVER CASAOS ---
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClientSecure client;
      client.setInsecure(); // Abaikan validasi sertifikat SSL agar praktis
      
      HTTPClient http;
      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");

      // Buat JSON Payload
      StaticJsonDocument<256> doc;
      doc["Temperature"] = temp;
      doc["Humidity"] = hum;
      doc["Light"] = light;
      doc["Gas"] = gasPPM;
      doc["Latitude"] = lat;
      doc["Longitude"] = lon;

      String requestBody;
      serializeJson(doc, requestBody);
      
      Serial.println("Mengirim Payload: " + requestBody);

      // POST Request
      int httpResponseCode = http.POST(requestBody);

      if (httpResponseCode > 0) {
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
        
        // Membaca Balasan (Prediksi Cuaca dari Server)
        String payload = http.getString();
        Serial.println("Balasan Server: " + payload);
        
        // Parse JSON balasan untuk memeriksa apakah ada antrean perintah
        StaticJsonDocument<512> responseDoc;
        DeserializationError error = deserializeJson(responseDoc, payload);
        if (!error) {
          JsonArray commands = responseDoc["commands"];
          for (JsonVariant v : commands) {
            String cmd = v.as<String>();
            if (cmd == "reset_wifi") {
              Serial.println("Menerima perintah: RESET WIFI. Menghapus memori jaringan...");
              u8g2.clearBuffer();
              u8g2.drawStr(0, 30, "RESET WIFI...");
              u8g2.sendBuffer();
              wm.resetSettings();
              delay(1000);
              ESP.restart();
            }
          }
        }
        
        u8g2.setCursor(0, 55); 
        u8g2.print("Terkirim (HTTP "); u8g2.print(httpResponseCode); u8g2.print(")");
        u8g2.sendBuffer();

      } else {
        Serial.print("Error code: ");
        Serial.println(httpResponseCode);
        
        u8g2.setCursor(0, 55); u8g2.print("Gagal Mengirim!");
        u8g2.sendBuffer();
      }
      
      http.end(); // Bebaskan resource HTTP
    } else {
      Serial.println("WiFi tidak terhubung!");
    }
  }
}
