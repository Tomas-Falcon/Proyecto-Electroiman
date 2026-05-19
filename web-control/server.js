const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// IP del ESP32 dentro de la VPN WireGuard
const ESP32_IP = '10.8.0.50'; 

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Usuario conectado al panel de control');

    // Enviar comando al ESP32 (via WireGuard)
    socket.on('set_height', async (height) => {
        try {
            console.log(`Cambiando altura a: ${height}mm`);
            // El ESP32 expondrá un pequeño servidor HTTP o WebSocket en el Core 1
            await axios.get(`http://${ESP32_IP}/set?height=${height}`);
        } catch (err) {
            console.error('Error comunicando con el ESP32:', err.message);
        }
    });

    socket.on('toggle_system', async (state) => {
        try {
            const cmd = state ? 'start' : 'stop';
            await axios.get(`http://${ESP32_IP}/system?cmd=${cmd}`);
        } catch (err) {
            console.error('Error al cambiar estado del sistema:', err.message);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Panel de Control corriendo en puerto ${PORT}`);
    console.log(`Acceso via Tailscale: http://[TU_IP_TAILSCALE]:${PORT}`);
});
