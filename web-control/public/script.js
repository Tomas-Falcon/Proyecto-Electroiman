const socket = io();

// Elementos del DOM
const btnPower = document.getElementById('btn-power');
const rangeHeight = document.getElementById('range-height');
const valHeight = document.getElementById('val-height');
const rangeOffsetY = document.getElementById('range-offset-y');
const valOffsetY = document.getElementById('val-offset-y');
const modeButtons = document.querySelectorAll('.btn-mode');
const statusBadge = document.getElementById('status-badge');

let isSystemOn = false;

// Gestión de Pestañas
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

// Gestión de Logs
const logList = document.getElementById('log-list');
const btnClearLogs = document.getElementById('btn-clear-logs');

function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    let tag = 'INFO';
    if(type === 'control') tag = 'CTRL';
    if(type === 'network') tag = 'NETW';
    if(type === 'error') tag = 'ERR!';

    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-tag">${tag}</span>
        <span class="log-msg">${msg}</span>
    `;
    
    logList.prepend(entry);
    
    // Limitar a 50 logs para no saturar
    if (logList.children.length > 50) {
        logList.lastChild.remove();
    }
}

btnClearLogs.addEventListener('click', () => {
    logList.innerHTML = '';
});

// Modificación de los eventos existentes para incluir logs
btnPower.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    updatePowerUI();
    const action = isSystemOn ? 'Encendido (Soft Start)' : 'Apagado (Soft Stop)';
    addLog(`Sistema: ${action}`, 'control');
    socket.emit('toggle_system', isSystemOn);
});

rangeHeight.addEventListener('change', (e) => {
    const val = e.target.value;
    addLog(`Target Z: ${val}mm`, 'control');
    socket.emit('set_height', val);
});

socket.on('connect', () => {
    addLog('Conectado al servidor de control', 'network');
});

socket.on('disconnect', () => {
    addLog('Desconectado del servidor', 'error');
});

// Gestión de Offset Eje Y
rangeOffsetY.addEventListener('input', (e) => {
    valOffsetY.textContent = e.target.value;
});

rangeOffsetY.addEventListener('change', (e) => {
    socket.emit('set_offset_y', e.target.value);
});

// Gestión de Modos
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        socket.emit('set_mode', mode);
    });
});

// Sincronizacion de estado inicial
socket.on('sync_state', (state) => {
    isSystemOn = state.power;
    updatePowerUI();
    
    rangeHeight.value = state.height;
    valHeight.textContent = state.height;
    
    rangeOffsetY.value = state.offsetY;
    valOffsetY.textContent = state.offsetY;
    
    modeButtons.forEach(btn => {
        if (btn.getAttribute('data-mode') === state.mode) {
            btn.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    
    addLog('Estado sincronizado con el servidor', 'network');
});
