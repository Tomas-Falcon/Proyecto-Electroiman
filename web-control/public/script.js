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
const filterType = document.getElementById('filter-type');

function addLog(msg, type = 'info') {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.dataset.type = type;
    
    let tag = type.substring(0, 4).toUpperCase();
    if (type === 'instruction') tag = 'INST';
    if (type === 'danger') tag = 'DANG';

    entry.innerHTML = `
        <span class="log-time" title="${date}">${time}</span>
        <span class="log-tag">${tag}</span>
        <span class="log-msg">${msg}</span>
    `;
    
    logList.prepend(entry);
    applyFilter();
    
    if (logList.children.length > 100) {
        logList.lastChild.remove();
    }
}

function applyFilter() {
    const selected = filterType.value;
    Array.from(logList.children).forEach(entry => {
        if (selected === 'all' || entry.dataset.type === selected) {
            entry.style.display = 'block';
        } else {
            entry.style.display = 'none';
        }
    });
}

filterType.addEventListener('change', applyFilter);

btnClearLogs.addEventListener('click', () => {
    logList.innerHTML = '';
});

// Eventos actualizados
btnPower.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    updatePowerUI();
    const action = isSystemOn ? 'Inicio suave de levitacion' : 'Descenso suave controlado';
    addLog(action, 'instruction');
    socket.emit('toggle_system', isSystemOn);
});

rangeHeight.addEventListener('change', (e) => {
    const val = e.target.value;
    addLog(`Nueva altura objetivo establecida: ${val}mm`, 'instruction');
    socket.emit('set_height', val);
});

socket.on('connect', () => {
    addLog('Conexion establecida con el servidor', 'info');
});

socket.on('telemetry', (data) => {
    if(data.batt) document.getElementById('tel-batt').textContent = data.batt + '%';
    if(data.core0) document.getElementById('tel-core0').textContent = data.core0 + ' kHz';
    if(data.temp) {
        const tempSpan = document.getElementById('tel-temp');
        tempSpan.textContent = data.temp + ' °C';
        if(data.temp > 50) {
            tempSpan.style.color = '#ef4444';
            addLog(`Temperatura critica detectada: ${data.temp}C`, 'danger');
        } else {
            tempSpan.style.color = 'var(--accent)';
        }
    }
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
