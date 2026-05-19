# Proyecto Electroimán 🧲

Plataforma avanzada de levitación magnética de lazo cerrado (Closed-Loop) con control PID, carga inalámbrica y conectividad segura mediante VPN.

## 🚀 Características Principales
- **Levitación Inteligente:** Control PID de alta frecuencia (5 kHz) en tiempo real.
- **Doble Núcleo (ESP32):** Procesamiento de control crítico (Core 0) y comunicaciones (Core 1) independientes.
- **Bypass de Red (WireGuard):** Conectividad transparente en redes corporativas con AP Isolation.
- **Configuración Inicial:** Aprovisionamiento de red vía Bluetooth (BLE) para facilitar la configuración inicial sin cables.
- **Integración Domótica:** Controlable desde Homarr / Home Assistant mediante WebSockets/API.

## 🛠️ Estructura del Proyecto
- `/firmware`: Código fuente para el ESP32 (Framework Arduino/PlatformIO).
- `/docs`: Documentación técnica, diagramas de arquitectura y esquemas de hardware.

## ⚙️ Configuración Inicial
1. Encender el dispositivo.
2. Conectarse mediante la App de configuración (BLE) para introducir las credenciales Wi-Fi y las claves de WireGuard.
3. El sistema establecerá el túnel VPN automáticamente y se reportará al panel de control.

## 📝 Roadmap
- [x] Planificación y Arquitectura.
- [ ] Implementación de Firmware Base (BLE + WireGuard).
- [ ] Validación de sensores Hall y control PWM.
- [ ] Sintonización del algoritmo PID.
- [ ] Integración final con Homarr.
