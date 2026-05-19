# Proyecto Electroimán: Levitación, Carga Inalámbrica y Orientación Automática

Esta documentación contiene la arquitectura de hardware, red, software y la lógica de control para el desarrollo del prototipo avanzado de plataforma de levitación magnética de lazo cerrado (Closed-Loop). El sistema integra control PID en tiempo real, puente de red seguro mediante VPN para evadir bloqueos corporativos, e interconectividad con paneles de domótica (Homarr / Home Assistant).

---

## 0. Gestión de Configuración (Novedad)
Para facilitar el despliegue en cualquier entorno, el sistema utiliza:
* **Repositorio GitHub:** Centralización de firmware y documentación.
* **Aprovisionamiento Bluetooth (BLE):** Al encenderse por primera vez o al fallar la conexión, el ESP32 activa un servicio BLE que permite enviar las credenciales Wi-Fi y las claves de la VPN WireGuard desde una aplicación móvil, eliminando la necesidad de recompilar el código para cambiar de red.

---

## 1. Gestión de Materiales e Inventario

### 1.1 Fase 1: Componentes Adquiridos (Cerebro, Potencia y Herramientas)
Este set de componentes cubre el núcleo del procesamiento, actuadores magnéticos y el instrumental de taller necesario para el ensamble inicial.

* **Procesamiento:**
    * 1x Placa de desarrollo ESP32 (ESP-WROOM-32) con puerto USB Tipo C.
    * 1x Placa de expansión "One Set" con borneras a tornillo para el ESP32 (facilita conexiones modulares).
* **Actuadores y Potencia:**
    * 4x Electroimanes industriales de elevación modelo **P40/25** (especificación de bobina: **24 Volteos**). Dimensiones: 40mm de diámetro, 25mm de altura.
    * 4x Módulos controladores de motor (H-Bridge) **BTS7960 de 43A**. Disipador de aluminio integrado.
    * 2 metros de cable de silicona **AWG 14** de alta flexibilidad (1 metro rojo, 1 metro negro) para soportar las líneas de alta potencia (24V, picos de hasta 15A).
* **Sensores y Feedback de Posición:**
    * 10x Sensores de efecto Hall lineales **49E (Encapsulado TO-92)**. Muestreo analógico continuo.
    * 2x Sensores de temperatura digitales **DS18B20** (Encapsulado TO-92 o sonda estanca). Monitoreo térmico de los electroimanes para prevención de fallos por sobrecalentamiento.
* **Instrumental y Consumibles de Taller:**
    * 1x Soldador USB electrónico mini con control de temperatura regulable.
    * 1x Kit de tubos termorretractiles aislantes (127 piezas, color negro).
    * 1x Kit de placas de circuito impreso (PCB) universales perforadas de doble cara de fibra de vidrio.
    * 1x Kit de cables Jumper Dupont de **20cm** (Macho-Hembra).
    * 1x Alicate de corte oblicuo multifuncional de precisión (Marca SAMZHE).
    * 1x Multímetro digital portátil modelo DT83B.

### 1.2 Fase 2: Componentes Pendientes (Próxima Tanda de Integración)
* 1x Fuente de alimentación conmutada de tipo industrial (chapa perforada) de **24V y 15A (360W)**.
* 1x Cable de alimentación de red eléctrica de la UE (Schuko de 3 pines).
* 1x Imán de neodimio de alto grado **N52**, formato disco plano redondo de **50x20mm** (o 40x20mm).
* 1x Módulo transmisor de carga inalámbrica estándar Qi de 15W PCBA.
* 1x Par de conectores mecánicos de resorte **Pines Pogo (Pogo Pins)** de 2 vías.
* 1x Sensor óptico reflectivo infrarrojo modelo **TCRT5000**.
* 1x Adhesivo en degradé de escala de grises (blanco a negro).

---

## 2. Arquitectura de Red y Conectividad (Bypass de AP Isolation)

Debido al bloqueo por seguridad informática en redes corporativas u oficinas (AP Isolation), los dispositivos conectados al Wi-Fi no pueden comunicarse entre sí de forma directa. Se implementa una topología VPN de tipo Hub-and-Spoke utilizando el protocolo WireGuard directamente integrado en el firmware del ESP32.

![Arquitectura de Red Segura](arquitectura_red_vpn.png)

### Mecánica del Flujo de Datos:
1. **Conexión Saliente:** El ESP32 se asocia al Wi-Fi de la oficina como un cliente estándar e inicia una sesión cifrada mediante la librería `WireGuard-ESP32` apuntando al servidor de casa. El router corporativo permite el tráfico de salida y el AP Isolation es evadido de forma transparente.
2. **Enrutamiento:** El panel de Homarr envía comandos apuntando a la IP virtual del ESP32 dentro de la red WireGuard (ej. `10.8.0.50`).
3. **Control Celular:** El teléfono Android activa Tailscale, permitiéndole ingresar a la red interna de casa y controlar la mesa de la oficina desde cualquier lado con latencias mínimas.

---

## 3. Arquitectura del Software (Distribución Dual-Core)

El procesador ESP32 cuenta con dos núcleos independientes (Core 0 y Core 1). Para evitar que las tareas de red desestabilicen el lazo cerrado de levitación (que requiere precisión crítica de microsegundos), se utiliza FreeRTOS para forzar la afinidad de hilos:

![Distribución Dual-Core ESP32](distribucion_dual_core.png)

* **Core 0 - Control Crítico (Frecuencia: ~5 kHz):** Lee los pines analógicos de los sensores Hall, procesa las matrices matemáticas del algoritmo PID vertical y de inclinación, y actualiza los registros del contador PWM de los BTS7960 de inmediato.
* **Core 1 - Comunicaciones y Gestión (Frecuencia: ~100 Hz):** Administra el tráfico IP encapsulado en WireGuard, procesa los paquetes WebSockets provenientes de la App/Homarr, toma lecturas del sensor óptico TCRT5000 e inyecta de forma segura los valores modificados (como la altura o el offset del eje Y) en la memoria compartida que lee el Core 0.

---

## 4. Lógica de Control y Modos de Funcionamiento

### 4.1 Diagrama de Bloques de Control PID
La ecuación de control implementada responde al estándar matemático discreto para mantener la plataforma flotando sin oscilaciones:

![Diagrama de Bloques del Lazo Cerrado PID](diagrama_bloques_pid.png)

### 4.2 Especificación Técnica de los Modos Planificados:
1. **Modo Crucero:** Despegue con rampa matemática incremental sobre el ciclo de trabajo (Duty Cycle) para evitar tirones. Aterrizaje suave modificando el Setpoint de altura a razón de 1.5mm/s. Control del "Norte" fijo leyendo el sensor de reflexión infrarrojo TCRT5000 para contrarrestar corrientes de aire y bloquear la orientación de la pantalla.
2. **Modo Carrera:** Despegue balístico inmediato forzando PWM al 100%. Aterrizaje de carrera con caída libre (0% PWM) y un pulso de contra-corriente inductiva masiva al cruzar el umbral crítico de los 15mm de altura para generar un colchón de freno electromagnético severo antes de posar sobre los pines.
3. **Modo Carga Automática (Auto-Docking):** El ESP32 detecta un desplazamiento sostenido hacia abajo (peso extra del celular). Inicia la secuencia automática de aterrizaje crucero, encastrando de forma perfecta en las guías cónicas sobre los Pines Pogo. Monitorea por la API de Homarr/HA la batería del celular; al llegar al 80%, desenergiza la línea de carga y ejecuta el despegue automático a velocidad crucero.
4. **Modo Ajuste Remoto Eje Y:** Un slider en la interfaz web interactúa sumando o restando un offset numérico directo a la lectura del ADC del sensor Hall del eje Y. Permite corregir desviaciones por asimetrías de peso o de la carcasa 3D en tiempo real desde el escritorio.

---

## 6. Estado Actual y Gestión de Desarrollo
**Última actualización:** Mayo 2026.
*   **Repositorio Oficial:** [GitHub - Tomas-Falcon/Proyecto-Electroiman](https://github.com/Tomas-Falcon/Proyecto-Electroiman)
*   **Flujo de Trabajo:** Se utiliza la rama `dev` para la implementación de nuevas características. El firmware actual soporta aprovisionamiento BLE y gestión dual-core para separar el control crítico del tráfico de red.

---

## 9. Mapeo de Pines GPIO y Arquitectura de Hardware

### 9.1 Consideracion Tecnica: Multiplexor Analogico
Debido a que el ESP32 deshabilita el bloque **ADC2** cuando el Wi-Fi/WireGuard esta activo, solo disponemos de los pines del bloque **ADC1** (GPIOs 32-39) para lecturas analogicas estables. Para leer los **10 sensores Hall** requeridos, se recomienda la integracion de un multiplexor analogico **CD74HC4067** (16 canales).

### 9.2 Tabla de Conexiones (ESP32 DevKit V4)

| Componente | Pin ESP32 | Funcion | Notas |
| :--- | :--- | :--- | :--- |
| **DS18B20** | GPIO 4 | OneWire Data | Sensores de temperatura |
| **Multiplexor SIG** | GPIO 34 | ADC1_CH6 | Entrada analogica compartida |
| **Multiplexor S0** | GPIO 5 | Digital Out | Seleccion canal Mux |
| **Multiplexor S1** | GPIO 18 | Digital Out | Seleccion canal Mux |
| **Multiplexor S2** | GPIO 19 | Digital Out | Seleccion canal Mux |
| **Multiplexor S3** | GPIO 22 | Digital Out | Seleccion canal Mux |
| **TCRT5000 IR** | GPIO 35 | ADC1_CH7 | Sensor de orientacion |
| **BTS7960 M1** | GPIO 32 / 33 | PWM (R/L) | Electroiman 1 |
| **BTS7960 M2** | GPIO 25 / 26 | PWM (R/L) | Electroiman 2 |
| **BTS7960 M3** | GPIO 27 / 14 | PWM (R/L) | Electroiman 3 |
| **BTS7960 M4** | GPIO 12 / 13 | PWM (R/L) | Electroiman 4 |
| **Carga Qi** | GPIO 2 | Digital Out | Activacion bobina transmision |

### 9.3 Distribucion de Canales Multiplexor (CD74HC4067)
*   **C0 - C9:** Sensores Hall 49E (1 al 10).
*   **C10 - C15:** Disponibles para expansion futura.
**Fecha:** 19 de mayo de 2026

### 8.1 Análisis de Recursos (VM)
*   **Memoria RAM:** 5.3Gi Total. 3.4Gi en uso (aprox. 64%). Memoria disponible (incluyendo caché) de ~1.9Gi. 
*   **Almacenamiento:** 17Gi disponibles en disco local.
*   **CPU:** 16 núcleos disponibles. Load average estable (~1.38).
*   **Conclusión:** La VM tiene recursos suficientes para la instalación de herramientas de compilación ligera (`arduino-cli`), aunque se debe monitorear el uso de RAM durante el proceso de linkeo del firmware.

### 8.2 Plan de Pruebas Virtuales (Wokwi)
1.  **Instalación:** Configurar `arduino-cli` y el core de ESP32.
2.  **Compilación:** Generar binarios (`.bin` y `.elf`) desde la rama `dev`.
3.  **Simulación:** Ejecutar pruebas de regresión para validar:
    *   API de control vía red.
    *   Lógica de rampa para Soft Start/Stop.
    *   Respuesta de seguridad ante fallo térmico (Descenso paulatino).

### ✅ Fase 1: Arquitectura Base y Conectividad (Completado)
- [x] Repositorio Git inicializado y estructurado (Ramas `main` y `dev`).
- [x] Implementacion del firmware base hibrido (C/C++).
- [x] Asignacion Dual-Core: Core 0 (Control) y Core 1 (Red).
- [x] Logica de aprovisionamiento Bluetooth (BLE) y persistencia NVS.
- [x] Tunel WireGuard configurado en el firmware.
- [x] Interfaz de control Web (Node.js/Socket.io) dockerizada y accesible via Tailscale.
- [x] Sistema de telemetria y registros (logs) categorizados en la web.

### 🚧 Fase 2: Integracion de Hardware y Control (En Proceso)
- [x] Instalacion de herramientas de compilacion (arduino-cli) en la VM.
- [x] Integracion de logica para sensores de temperatura DS18B20 (Prevencion termica con soft-stop).
- [ ] Simulacion virtual del ESP32 mediante Wokwi (En ejecucion).
- [ ] Mapeo de pines GPIO para los 10 sensores Hall 49E y 4 puentes H BTS7960.
- [ ] Implementacion del algoritmo PID en el Core 0 (Operaciones C puras).

### ⏳ Fase 3: Modos de Vuelo y Calibracion (Pendiente)
- [ ] Programacion de rampas PWM para Soft Start/Stop (Modo Crucero).
- [ ] Logica de freno electromagnetico (Modo Carrera).
- [ ] Sintonizacion fisica de constantes Kp, Ki, Kd (Requiere hardware).
- [ ] Calibracion del offset del eje Y via panel web.
