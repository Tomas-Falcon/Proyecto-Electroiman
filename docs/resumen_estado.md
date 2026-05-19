# Estado Actual del Proyecto: Proyecto Electroimán 🧲

**Fecha de última actualización:** 19 de mayo de 2026

## ✅ Hitos Alcanzados
1.  **Identidad Visual y Nomenclatura:** Proyecto renombrado formalmente a "Proyecto Electroimán".
2.  **Infraestructura de Código:**
    *   Repositorio GitHub creado y vinculado vía SSH (`Tomas-Falcon/Proyecto-Electroiman`).
    *   Estructura de ramas establecida: `main` (producción) y `dev` (desarrollo activo).
3.  **Firmware Base (ESP32):**
    *   Implementación de arquitectura **Dual-Core** (Core 0 para PID, Core 1 para conectividad).
    *   Sistema de **Aprovisionamiento Bluetooth (BLE)** funcional para configurar Wi-Fi y WireGuard sin cables.
    *   Persistencia de datos mediante **NVS (Preferences)**.

## 🛠️ Configuración Técnica
- **Rama Actual:** `dev`
- **Autenticación Git:** Clave SSH ED25519 generada y configurada.
- **Archivo de Instrucciones:** `GEMINI.md` creado en la raíz para continuidad del agente.

## 📋 Próximos Pasos (En cola para rama `dev`)
- [ ] Definición de mapa de pines (GPIO) para sensores Hall y Puentes H.
- [ ] Implementación de la lógica de conexión WireGuard en el firmware.
- [ ] Desarrollo del algoritmo PID en el Core 0.
- [ ] Pruebas de integración con Homarr.
