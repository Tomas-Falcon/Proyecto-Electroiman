const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ESP32_IP = '10.8.0.50'; 

// Estado persistente del sistema
let systemState = {
    power: false,
    height: 20,
    offsetY: 0,
    mode: 'crucero'
};

app.use(express.static('public'));

io.on('connection', (socket) => {
    // Sincronizar estado actual con el cliente que se conecta
    socket.emit('sync_state', systemState);

    socket.on('set_height', async (height) => {
        systemState.height = height;
        try {
            await axios.get(`http://${ESP32_IP}/set?height=${height}`);
        } catch (err) {
            console.error('Error de comunicacion con ESP32');
        }
    });

    socket.on('toggle_system', async (state) => {
        systemState.power = state;
        try {
            const cmd = state ? 'start' : 'stop';
            await axios.get(`http://${ESP32_IP}/system?cmd=${cmd}`);
        } catch (err) {
            console.error('Error de comunicacion con ESP32');
        }
    });

    socket.on('set_offset_y', (val) => {
        systemState.offsetY = val;
    });

    socket.on('set_mode', (mode) => {
        systemState.mode = mode;
    });
});

// Simulacion de telemetria para pruebas
setInterval(() => {
    if (systemState.power) {
        // Simular variaciones leves
        const telemetry = {
            temp: (25 + Math.random() * 5 + (systemState.height / 2)).toFixed(1),
            core0: (4.9 + Math.random() * 0.2).toFixed(1),
            batt: (80 + Math.random() * 5).toFixed(0)
        };
        io.emit('telemetry', telemetry);
    }
}, 2000);

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});
