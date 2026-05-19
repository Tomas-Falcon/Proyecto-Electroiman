# Proyecto Electroiman

Plataforma avanzada de levitacion magnetica de lazo cerrado (Closed-Loop) con control PID, carga inalambrica y conectividad segura mediante VPN.

## Caracteristicas Principales
- **Levitacion Inteligente:** Control PID de alta frecuencia (5 kHz) en tiempo real.
- **Doble Nucleo (ESP32):** Procesamiento de control critico (Core 0) y comunicaciones (Core 1) independientes.
- **Bypass de Red (WireGuard):** Conectividad transparente en redes corporativas con AP Isolation.
- **Configuracion Inicial:** Aprovisionamiento de red via Bluetooth (BLE) para facilitar la configuracion inicial.
- **Integracion Domotica:** Control mediante WebSockets y API REST.

## Estructura del Proyecto
- `/firmware`: Codigo fuente para el ESP32.
- `/docs`: Documentacion tecnica y diagramas de arquitectura.
- `/web-control`: Interfaz de gestion remota (Node.js/Docker).

## Configuracion Inicial
1. Inicializacion del dispositivo.
2. Configuracion de red mediante protocolo BLE.
3. Establecimiento de tunel WireGuard para gestion remota.

## Planificacion de Desarrollo
- [x] Arquitectura y diseño de sistema.
- [ ] Implementacion de firmware base (BLE y WireGuard).
- [ ] Validacion de sensores Hall y actuadores PWM.
- [ ] Sintonizacion de parametros PID.
- [ ] Integracion con panel de control.
