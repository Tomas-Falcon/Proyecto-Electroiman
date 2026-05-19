# Proyecto Electroimán - Instrucciones del Proyecto

## 🛠 Configuración de Desarrollo
- **Nombre del Proyecto:** Proyecto Electroimán
- **Repositorio:** `git@github.com:Tomas-Falcon/Proyecto-Electroiman.git`
- **SSH Key:** `~/.ssh/id_ed25519_github` (usar para git operations)

## 📡 Arquitectura de Conectividad
- **ESP32 Dual-Core:** Core 0 (PID), Core 1 (Conectividad).
- **Aprovisionamiento BLE:** Servicio `ElectroIman_Config` para recibir `SSID;PASS;WG_KEY`.
- **VPN:** WireGuard integrada en el firmware.

## ⚙️ Comandos Útiles
- **Push a GitHub:** `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_github" git push`
