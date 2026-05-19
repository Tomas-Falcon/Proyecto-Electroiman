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

const globalMaxZInput = document.getElementById('global-max-z');
const btnSaveSettings = document.getElementById('btn-save-settings');

let globalMaxHeight = 60;

// Gestion de Ajustes
btnSaveSettings.addEventListener('click', () => {
    globalMaxHeight = parseInt(globalMaxZInput.value);
    socket.emit('set_settings', { globalMaxHeight });
    addLog(`Configuracion global actualizada: Max Z = ${globalMaxHeight}mm`, 'info');
});

// Modificar la logica de modos para usar el limite global
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');
        
        updateUIVisibility(currentMode);
        
        // Limites Dinamicos
        if (currentMode === 'experimental') {
            rangeHeight.max = 120;
            addLog('Modo Experimental: Limites de altura extendidos (120mm)', 'danger');
        } else if (currentMode === 'alineacion') {
            rangeHeight.max = 100;
        } else {
            rangeHeight.max = globalMaxHeight; // Aplicar limite global
            if (parseInt(rangeHeight.value) > globalMaxHeight) {
                rangeHeight.value = globalMaxHeight;
                valHeight.textContent = globalMaxHeight;
                valHeightDesc.textContent = getHeightDescription(globalMaxHeight);
                socket.emit('set_height', globalMaxHeight);
            }
        }
        
        if (modePresets[currentMode]) {
            const preset = modePresets[currentMode];
            let targetZ = preset.height;
            // Asegurar que el preset no supere el maximo global en modos estandar
            if (currentMode !== 'experimental' && currentMode !== 'alineacion') {
                targetZ = Math.min(targetZ, globalMaxHeight);
            }
            socket.emit('set_height', targetZ);
            addLog(`Modo ${currentMode}: Altura auto-ajustada a ${targetZ}mm`, 'info');
        }

        socket.emit('set_mode', currentMode);
    });
});

// Sincronizacion de estado inicial
socket.on('sync_state', (state) => {
    isSystemOn = state.power;
    currentMode = state.mode;
    globalMaxHeight = state.globalMaxHeight || 60;
    
    updatePowerUI();
    updateUIVisibility(currentMode);
    
    globalMaxZInput.value = globalMaxHeight;

    // Configurar maximo segun el modo guardado
    if (currentMode === 'experimental') rangeHeight.max = 120;
    else if (currentMode === 'alineacion') rangeHeight.max = 100;
    else rangeHeight.max = globalMaxHeight;

    rangeHeight.value = state.height;
    valHeight.textContent = state.height;
    valHeightDesc.textContent = getHeightDescription(state.height);
    
    rangeOffsetY.value = state.offsetY;
    valOffsetY.textContent = state.offsetY;
    
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
