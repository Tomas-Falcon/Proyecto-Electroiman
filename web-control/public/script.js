const socket = io();

// Elementos del DOM
const btnPower = document.getElementById('btn-power');
const rangeHeight = document.getElementById('range-height');
const valHeight = document.getElementById('val-height');
const valHeightDesc = document.getElementById('val-height-desc');
const rangeOffsetY = document.getElementById('range-offset-y');
const valOffsetY = document.getElementById('val-offset-y');
const modeButtons = document.querySelectorAll('.btn-mode');
const statusBadge = document.getElementById('status-badge');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const logList = document.getElementById('log-list');

// Paneles especiales
const experimentalPanel = document.getElementById('experimental-controls');
const alignmentPanel = document.getElementById('alignment-panel');

let isSystemOn = false;
let currentMode = 'crucero';

// Configuraciones por defecto de los modos
const modePresets = {
    'crucero': { height: 40, offsetY: 0 },
    'carrera': { height: 20, offsetY: 0 },
    'docking': { height: 10, offsetY: 0 },
    'alineacion': { height: 30, offsetY: 0 },
    'experimental': { height: 20, offsetY: 0 }
};

// Gestion de Pestañas
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

function addLog(msg, type = 'info') {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    let tag = type.substring(0, 4).toUpperCase();
    if (type === 'instruction') tag = 'INST';
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-tag">${tag}</span><span class="log-msg">${msg}</span>`;
    logList.prepend(entry);
    if (logList.children.length > 50) logList.lastChild.remove();
}

function updatePowerUI() {
    btnPower.textContent = isSystemOn ? "APAGAR SISTEMA" : "ENCENDER SISTEMA";
    btnPower.className = isSystemOn ? "btn btn-on" : "btn btn-off";
    statusBadge.className = isSystemOn ? "badge online" : "badge offline";
    statusBadge.textContent = isSystemOn ? "Online" : "Offline";
}

function getHeightDescription(val) {
    const v = parseInt(val);
    if (v <= 20) return "Aterrizaje / Bajo";
    if (v <= 40) return "Crucero / Estable";
    if (v <= 60) return "Alto / Exhibicion";
    return "Modo Prototipo / Riesgo";
}

function updateUIVisibility(mode) {
    experimentalPanel.style.display = (mode === 'experimental') ? 'block' : 'none';
    alignmentPanel.style.display = (mode === 'alineacion') ? 'block' : 'none';
}

// Eventos de Control
btnPower.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    updatePowerUI();
    socket.emit('toggle_system', isSystemOn);
    addLog(isSystemOn ? 'Encendido' : 'Apagado', 'instruction');
});

rangeHeight.addEventListener('input', (e) => {
    valHeight.textContent = e.target.value;
    valHeightDesc.textContent = getHeightDescription(e.target.value);
});

rangeHeight.addEventListener('change', (e) => {
    socket.emit('set_height', e.target.value);
});

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');
        
        updateUIVisibility(currentMode);
        
        // Aplicar presets si no es experimental/alineacion
        if (modePresets[currentMode]) {
            const preset = modePresets[currentMode];
            socket.emit('set_height', preset.height);
            addLog(`Modo ${currentMode}: Altura auto-ajustada a ${preset.height}mm`, 'info');
        }

        socket.emit('set_mode', currentMode);
    });
});

// Alineacion Haptica
const btnCapture = document.getElementById('btn-capture-config');
btnCapture.addEventListener('click', () => {
    const config = {
        z: document.getElementById('cap-z').textContent,
        rot: document.getElementById('cap-rot').textContent,
        speed: document.getElementById('cap-speed').textContent
    };
    addLog(`Configuracion capturada: Z=${config.z}, Rot=${config.rot}`, 'instruction');
    // Aqui se podria enviar al servidor para guardar en DB/Archivo
});

// Sockets
socket.on('sync_state', (state) => {
    isSystemOn = state.power;
    currentMode = state.mode;
    updatePowerUI();
    updateUIVisibility(currentMode);
    
    rangeHeight.value = state.height;
    valHeight.textContent = state.height;
    valHeightDesc.textContent = getHeightDescription(state.height);
    
    modeButtons.forEach(btn => {
        if (btn.getAttribute('data-mode') === currentMode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
});

socket.on('telemetry', (data) => {
    if(data.temp) document.getElementById('tel-temp').textContent = data.temp + ' °C';
    
    // Si estamos en modo alineacion, actualizar valores capturados
    if (currentMode === 'alineacion') {
        if(data.height) document.getElementById('cap-z').textContent = data.height;
        if(data.rot) document.getElementById('cap-rot').textContent = data.rot;
        if(data.speed) document.getElementById('cap-speed').textContent = data.speed;
    }
});
