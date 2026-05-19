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
#include <OneWire.h>
#include <DallasTemperature.h>

// ==========================================
// PINES GPIO
// ==========================================
#define ONE_WIRE_BUS 4 // Pin de datos para DS18B20

// ==========================================
// SECCIÓN CORE 0: CONTROL CRÍTICO (ESTILO C)
// ==========================================
// Variables volátiles para comunicación entre núcleos
volatile float target_height = 20.0f; // mm
volatile bool system_active = false;
volatile float current_temp = 0.0f;
volatile bool thermal_fault = false;

// Objetos de temperatura (Inicializados en Core 0)
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Prototipo de funciones de control (Lógica pura C)
void pid_compute_loop() {
    // Aquí irá la implementación matemática del PID
}

void add_system_log(const char* msg) {
    Serial.printf("[LOG] %s\n", msg);
    // En el futuro, enviar esto via WebSocket al servidor central
}

void core0_task(void * pvParameters) {
    Serial.printf("Core 0: Inicializando lazo de control en nucleo %d\n", xPortGetCoreID());
    
    sensors.begin();
    int temp_read_counter = 0;

    for(;;) {
        // Monitoreo termico cada ~1 segundo (5000 iteraciones de 200us)
        if (temp_read_counter++ >= 5000) {
            sensors.requestTemperatures();
            current_temp = sensors.getTempCByIndex(0);
            
            // Gestion de seguridad por temperatura
            if (current_temp > 50.0f) {
                if (!thermal_fault) {
                    thermal_fault = true;
                    add_system_log("ALERTA: Temperatura critica detectada. Iniciando descenso de seguridad.");
                }
                
                // Descenso paulatino: bajamos la altura objetivo gradualmente
                if (target_height > 0.0f) {
                    target_height -= 0.5f; // Rampa de descenso
                    if (target_height < 0.0f) target_height = 0.0f;
                } else {
                    system_active = false; // Solo apagamos totalmente al llegar abajo
                }
            } else if (current_temp < 45.0f && thermal_fault) {
                thermal_fault = false; 
                add_system_log("Info: Temperatura normalizada. Sistema listo.");
            }
            temp_read_counter = 0;
        }

        if(system_active && !thermal_fault) {
            pid_compute_loop();
        }
        
        delayMicroseconds(200); 
    }
}

// ==========================================
// SECCIÓN CORE 1: CONECTIVIDAD (ESTILO C++)
// ==========================================
Preferences prefs;
static WireGuard wg;
WebServer server(80); // Servidor en puerto 80

void handleRoot() {
    String response = "Proyecto Electroiman - API Online\n";
    response += "Altura Objetivo: " + String(target_height) + " mm\n";
    response += "Estado: " + String(system_active ? "ENCENDIDO" : "APAGADO") + "\n";
    response += "Temperatura: " + String(current_temp) + " C\n";
    if (thermal_fault) response += "ALERTA: Falla Termica Detectada!\n";
    server.send(200, "text/plain", response);
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
    Serial.printf("Core 1: Inicializando conectividad en nucleo %d\n", xPortGetCoreID());
    
    prefs.begin("config", true);
    String ssid = prefs.getString("ssid", "");
    String pass = prefs.getString("pass", "");
    String local_ip_str = prefs.getString("local_ip", "10.8.0.50");
    String wg_private_key = prefs.getString("wgk", "");
    String endpoint_address = prefs.getString("endpoint", "tu.servidor.vpn");
    String server_public_key = prefs.getString("server_pub", "");
    uint16_t endpoint_port = prefs.getUInt("port", 51820);
    bool configured = prefs.getBool("configured", false);
    prefs.end();

    if (configured && ssid != "") {
        WiFi.begin(ssid.c_str(), pass.c_str());
        while (WiFi.status() != WL_CONNECTED) {
            delay(500);
            Serial.print(".");
        }
        Serial.println("\nWiFi Conectado");

        IPAddress local_ip;
        if (local_ip.fromString(local_ip_str)) {
            Serial.println("Estableciendo tunel WireGuard...");
            if (wg.begin(local_ip, wg_private_key.c_str(), server_public_key.c_str(), endpoint_address.c_str(), endpoint_port)) {
                Serial.println("Tunel WireGuard OK");
            } else {
                Serial.println("Fallo al establecer WireGuard");
            }
        }
    } else {
        // Si no esta configurado, se activa el modo BLE (se asume implementado segun el plan previo)
        Serial.println("Dispositivo no configurado. Esperando BLE...");
    }

    // Rutas de la API
    server.on("/", handleRoot);
    server.on("/set", handleSetHeight);
    server.on("/system", handleSystem);
    server.begin();
    Serial.println("Servidor API iniciado");

    for(;;) {
        server.handleClient();
        vTaskDelay(pdMS_TO_TICKS(10));
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
