const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ESP32_IP = '10.8.0.50'; 

const FACTORY_MODES = {
    'crucero': { name: 'Crucero', height: 40, offsetY: 0, type: 'factory' },
    'carrera': { name: 'Carrera', height: 20, offsetY: 0, type: 'factory' },
    'docking': { name: 'Auto-Docking', height: 10, offsetY: 0, type: 'factory' }
};

let systemState = {
    power: false,
    height: 20,
    offsetY: 0,
    mode: 'crucero',
    globalMaxHeight: 60,
    modes: { ...FACTORY_MODES }
};

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.emit('sync_state', systemState);

    socket.on('save_mode', (data) => {
        const id = data.id || data.name.toLowerCase().replace(/\s+/g, '_');
        systemState.modes[id] = {
            name: data.name,
            height: data.height,
            offsetY: data.offsetY,
            type: 'custom'
        };
        io.emit('sync_state', systemState);
    });

    socket.on('reset_factory', () => {
        systemState.modes = { ...FACTORY_MODES };
        systemState.mode = 'crucero';
        systemState.height = FACTORY_MODES.crucero.height;
        io.emit('sync_state', systemState);
    });

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

app.use(express.json());

// Endpoint para recibir telemetria real del ESP32
app.post('/telemetry', (req) => {
    const data = req.body;
    
    // Actualizar estado interno con datos reales
    if (data.temp !== undefined) systemState.temp = data.temp;
    if (data.height !== undefined) systemState.height = data.height;
    if (data.power !== undefined) systemState.power = data.power;
    if (data.core0 !== undefined) systemState.core0 = data.core0;

    // Reemitir a todos los clientes web
    io.emit('telemetry', data);
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});
