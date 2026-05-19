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

#include <WebServer.h>

// ==========================================
// SECCIÓN CORE 0: CONTROL CRÍTICO (ESTILO C)
// ==========================================
// Variables volátiles para comunicación entre núcleos
volatile float target_height = 20.0f; // mm
volatile bool system_active = false;

// ... (resto del código de control)

// ==========================================
// SECCIÓN CORE 1: CONECTIVIDAD (ESTILO C++)
// ==========================================
Preferences prefs;
static WireGuard wg;
WebServer server(80); // Servidor en puerto 80

void handleRoot() {
    server.send(200, "text/plain", "Proyecto Electroiman - API Online");
}

void handleSetHeight() {
    if (server.hasArg("height")) {
        target_height = server.arg("height").toFloat();
        server.send(200, "text/plain", "Altura actualizada");
        Serial.printf("Nueva altura objetivo: %.2f mm\n", target_height);
    } else {
        server.send(400, "text/plain", "Falta parametro height");
    }
}

void handleSystem() {
    if (server.hasArg("cmd")) {
        String cmd = server.arg("cmd");
        if (cmd == "start") system_active = true;
        else if (cmd == "stop") system_active = false;
        server.send(200, "text/plain", "Estado del sistema actualizado");
        Serial.printf("Sistema: %s\n", system_active ? "ENCENDIDO" : "APAGADO");
    }
}

void core1_task(void * pvParameters) {
    // ... (lógica de conexión WiFi/WireGuard previa)

    // Configurar rutas de la API
    server.on("/", handleRoot);
    server.on("/set", handleSetHeight);
    server.on("/system", handleSystem);
    server.begin();
    Serial.println("Servidor API iniciado en Core 1");

    for(;;) {
        server.handleClient();
        vTaskDelay(pdMS_TO_TICKS(10)); // Pequeño respiro para el sistema
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
