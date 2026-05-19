/*
 * PROYECTO ELECTROIMÁN - Firmware Híbrido
 * Core 0 (C Style): Control PID Crítico
 * Core 1 (C++ Style): Conectividad WireGuard, BLE y API
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WireGuard-ESP32.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <Preferences.h>

// ==========================================
// SECCIÓN CORE 0: CONTROL CRÍTICO (ESTILO C)
// ==========================================
// Variables volátiles para comunicación entre núcleos
volatile float target_height = 20.0f; // mm
volatile bool system_active = false;

// Prototipo de funciones de control (Lógica pura C)
void pid_compute_loop() {
    // Aquí irá la implementación matemática del PID
    // Optimizada para no usar objetos
}

void core0_task(void * pvParameters) {
    Serial.printf("Core 0: Inicializando lazo de control en nucleo %d\n", xPortGetCoreID());
    for(;;) {
        if(system_active) {
            pid_compute_loop();
        }
        // Delay mínimo para evitar disparar el WDT del sistema
        // pero manteniendo los ~5kHz deseados.
        delayMicroseconds(200); 
    }
}

// ==========================================
// SECCIÓN CORE 1: CONECTIVIDAD (ESTILO C++)
// ==========================================
Preferences prefs;
static WireGuard wg;

void core1_task(void * pvParameters) {
    Serial.printf("Core 1: Inicializando conectividad en nucleo %d\n", xPortGetCoreID());
    
    prefs.begin("config", true);
    String ssid = prefs.getString("ssid", "");
    String pass = prefs.getString("pass", "");
    String wg_key = prefs.getString("wgk", "");
    prefs.end();

    if (ssid != "") {
        WiFi.begin(ssid.c_str(), pass.c_str());
        while (WiFi.status() != WL_CONNECTED) {
            delay(500);
            Serial.print(".");
        }
        Serial.println("\nWiFi Conectado");

        // Configuración WireGuard
        // Nota: Los parámetros IP y Endpoint deben venir de la configuración
        // IPAddress local_ip(10, 8, 0, 50);
        // wg.begin(local_ip, wg_key.c_str(), "SERVER_PUBLIC_KEY", "ENDPOINT_URL", 51820);
    }

    for(;;) {
        // Aquí se procesarán los comandos entrantes de la Web (vía WireGuard)
        // Ejemplo: Cambiar target_height o system_active
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void setup() {
    Serial.begin(115200);

    // Prioridad 10 para el Control (Máxima)
    xTaskCreatePinnedToCore(core0_task, "PID_Ctrl", 4096, NULL, 10, NULL, 0);
    
    // Prioridad 1 para Red (Baja/Media)
    xTaskCreatePinnedToCore(core1_task, "Network", 8192, NULL, 1, NULL, 1);
}

void loop() {
    vTaskDelete(NULL);
}
