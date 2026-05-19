const socket = io();

// DOM Elements
const btnPower = document.getElementById('btn-power');
const modeContainer = document.getElementById('mode-container');
const experimentalPanel = document.getElementById('experimental-controls');
const alignmentPanel = document.getElementById('alignment-panel');
const rangeHeight = document.getElementById('range-height');
const valHeight = document.getElementById('val-height');
const valHeightDesc = document.getElementById('val-height-desc');
const rangeOffsetY = document.getElementById('range-offset-y');
const valOffsetY = document.getElementById('val-offset-y');
const statusBadge = document.getElementById('status-badge');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const logList = document.getElementById('log-list');

// Settings Elements
const globalMaxZInput = document.getElementById('global-max-z');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnResetFactory = document.getElementById('btn-reset-factory');
const btnSaveDraft = document.getElementById('btn-save-draft');
const btnCaptureAlign = document.getElementById('btn-capture-config');

let isSystemOn = false;
let currentMode = 'crucero';
let globalMaxHeight = 60;
let availableModes = {};

// Tabs Navigation
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

// UI Functions
function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    logList.prepend(entry);
    entry.innerHTML = `<span class="log-time">${time}</span> <span class="log-msg">${msg}</span>`;
}

function updatePowerUI() {
    btnPower.textContent = isSystemOn ? "APAGAR SISTEMA" : "ENCENDER SISTEMA";
    btnPower.className = isSystemOn ? "btn btn-on" : "btn btn-off";
    statusBadge.className = isSystemOn ? "badge " + (isSystemOn ? "online" : "offline");
    statusBadge.textContent = isSystemOn ? "Online" : "Offline";
}

function getHeightDescription(val) {
    const v = parseInt(val);
    if (v <= 20) return "Aterrizaje / Bajo";
    if (v <= 40) return "Crucero / Estable";
    if (v <= 60) return "Alto / Exhibicion";
    return "Experimental / Riesgo";
}

function renderModes() {
    modeContainer.innerHTML = '';
    
    // Modos Dinamicos (del servidor)
    Object.keys(availableModes).forEach(id => {
        const mode = availableModes[id];
        const btn = document.createElement('button');
        btn.className = `btn-mode ${currentMode === id ? 'active' : ''}`;
        btn.textContent = mode.name;
        btn.onclick = () => selectMode(id);
        modeContainer.appendChild(btn);
    });

    // Botones Especiales Fijos
    const btnAlign = document.createElement('button');
    btnAlign.className = `btn-mode ${currentMode === 'alineacion' ? 'active' : ''}`;
    btnAlign.textContent = 'Alineacion';
    btnAlign.onclick = () => selectMode('alineacion');
    modeContainer.appendChild(btnAlign);

    const btnExp = document.createElement('button');
    btnExp.className = `btn-mode btn-warning ${currentMode === 'experimental' ? 'active' : ''}`;
    btnExp.textContent = 'Experimental';
    btnExp.onclick = () => selectMode('experimental');
    modeContainer.appendChild(btnExp);
}

function selectMode(id) {
    currentMode = id;
    experimentalPanel.style.display = (id === 'experimental') ? 'block' : 'none';
    alignmentPanel.style.display = (id === 'alineacion') ? 'block' : 'none';

    if (availableModes[id]) {
        const mode = availableModes[id];
        let targetZ = mode.height;
        if (id !== 'experimental' && id !== 'alineacion') {
            targetZ = Math.min(targetZ, globalMaxHeight);
            rangeHeight.max = globalMaxHeight;
        } else {
            rangeHeight.max = 120;
        }
        socket.emit('set_height', targetZ);
        rangeHeight.value = targetZ;
        valHeight.textContent = targetZ;
        valHeightDesc.textContent = getHeightDescription(targetZ);
    }
    
    socket.emit('set_mode', id);
    renderModes();
}

// Events
btnPower.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    updatePowerUI();
    socket.emit('toggle_system', isSystemOn);
});

rangeHeight.addEventListener('input', (e) => {
    valHeight.textContent = e.target.value;
    valHeightDesc.textContent = getHeightDescription(e.target.value);
});

rangeHeight.addEventListener('change', (e) => {
    socket.emit('set_height', e.target.value);
});

btnSaveSettings.addEventListener('click', () => {
    globalMaxHeight = parseInt(globalMaxZInput.value);
    socket.emit('set_settings', { globalMaxHeight });
});

btnResetFactory.addEventListener('click', () => {
    if(confirm('¿Restablecer todos los modos a valores de fabrica?')) {
        socket.emit('reset_factory');
    }
});

btnSaveDraft.addEventListener('click', () => {
    const name = prompt('Nombre del nuevo modo:');
    if (name) {
        socket.emit('save_mode', {
            name: name,
            height: rangeHeight.value,
            offsetY: rangeOffsetY.value
        });
    }
});

btnCaptureAlign.addEventListener('click', () => {
    const name = prompt('Nombre para la configuracion capturada:');
    if (name) {
        socket.emit('save_mode', {
            name: name,
            height: document.getElementById('cap-z').textContent,
            offsetY: 0
        });
    }
});

// Sockets
socket.on('sync_state', (state) => {
    isSystemOn = state.power;
    currentMode = state.mode;
    globalMaxHeight = state.globalMaxHeight;
    availableModes = state.modes;

    updatePowerUI();
    globalMaxZInput.value = globalMaxHeight;
    
    experimentalPanel.style.display = (currentMode === 'experimental') ? 'block' : 'none';
    alignmentPanel.style.display = (currentMode === 'alineacion') ? 'block' : 'none';

    renderModes();
    
    rangeHeight.value = state.height;
    valHeight.textContent = state.height;
    valHeightDesc.textContent = getHeightDescription(state.height);
});

socket.on('telemetry', (data) => {
    if(data.temp) document.getElementById('tel-temp').textContent = data.temp + ' °C';
    if(currentMode === 'alineacion') {
        if(data.height) document.getElementById('cap-z').textContent = data.height;
        if(data.rot) document.getElementById('cap-rot').textContent = data.rot;
    }
});
