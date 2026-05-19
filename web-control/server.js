const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ESP32_IP = '10.8.0.50'; 
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'system_state.json');

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

// Cargar datos guardados al iniciar
function loadState() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const savedState = JSON.parse(data);
            systemState = { ...systemState, ...savedState };
            console.log('Estado cargado desde disco');
        }
    } catch (err) {
        console.error('Error al cargar estado:', err.message);
    }
}

// Guardar datos a disco
function saveState() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(systemState, null, 2));
    } catch (err) {
        console.error('Error al guardar estado:', err.message);
    }
}

loadState();

app.use(express.static('public'));
app.use(express.json());

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
        saveState();
        io.emit('sync_state', systemState);
    });

    socket.on('delete_mode', (id) => {
        if (systemState.modes[id] && systemState.modes[id].type !== 'factory') {
            delete systemState.modes[id];
            saveState();
            io.emit('sync_state', systemState);
        }
    });

    socket.on('reset_factory', () => {
        systemState.modes = { ...FACTORY_MODES };
        systemState.mode = 'crucero';
        systemState.height = FACTORY_MODES.crucero.height;
        saveState();
        io.emit('sync_state', systemState);
    });

    socket.on('set_settings', (data) => {
        if (data.globalMaxHeight !== undefined) {
            systemState.globalMaxHeight = data.globalMaxHeight;
            saveState();
            io.emit('sync_state', systemState);
        }
    });

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
