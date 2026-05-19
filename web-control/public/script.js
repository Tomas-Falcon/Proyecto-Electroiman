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
const btnClearLogs = document.getElementById('btn-clear-logs');
const filterType = document.getElementById('filter-type');

let isSystemOn = false;

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

// Gestion de Logs
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
btnClearLogs.addEventListener('click', () => { logList.innerHTML = ''; });

// UI de Encendido
function updatePowerUI() {
    if (isSystemOn) {
        btnPower.textContent = "APAGAR SISTEMA";
        btnPower.classList.replace('btn-off', 'btn-on');
        statusBadge.textContent = "Online";
        statusBadge.classList.replace('offline', 'online');
    } else {
        btnPower.textContent = "ENCENDER SISTEMA";
        btnPower.classList.replace('btn-on', 'btn-off');
        statusBadge.textContent = "Offline";
        statusBadge.classList.replace('online', 'offline');
    }
}

function getHeightDescription(val) {
    const v = parseInt(val);
    if (v <= 10) return "Aterrizaje / Bajo";
    if (v <= 20) return "Crucero / Estable";
    if (v <= 30) return "Alto / Exhibicion";
    return "Maximo / Riesgo";
}

// Eventos de Control
btnPower.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    updatePowerUI();
    const action = isSystemOn ? 'Inicio suave de levitacion' : 'Descenso suave controlado';
    addLog(action, 'instruction');
    socket.emit('toggle_system', isSystemOn);
});

rangeHeight.addEventListener('input', (e) => {
    const val = e.target.value;
    valHeight.textContent = val;
    valHeightDesc.textContent = getHeightDescription(val);
});

rangeHeight.addEventListener('change', (e) => {
    socket.emit('set_height', e.target.value);
    addLog(`Nueva altura: ${e.target.value}mm`, 'instruction');
});

rangeOffsetY.addEventListener('input', (e) => {
    valOffsetY.textContent = e.target.value;
});

rangeOffsetY.addEventListener('change', (e) => {
    socket.emit('set_offset_y', e.target.value);
});

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        
        // Desbloquear limite de altura si es modo configuracion
        if (mode === 'config') {
            rangeHeight.max = 100;
            addLog('MODO CONFIGURACION: Limites de altura desactivados. ¡Cuidado con el consumo!', 'danger');
        } else {
            rangeHeight.max = 40;
            if (rangeHeight.value > 40) {
                rangeHeight.value = 40;
                valHeight.textContent = 40;
                socket.emit('set_height', 40);
            }
        }
        
        socket.emit('set_mode', mode);
        addLog(`Modo cambiado a: ${mode}`, 'instruction');
    });
});

// Sockets
socket.on('connect', () => {
    addLog('Conexion establecida', 'network');
});

socket.on('telemetry', (data) => {
    if(data.batt) document.getElementById('tel-batt').textContent = data.batt + '%';
    if(data.core0) document.getElementById('tel-core0').textContent = data.core0 + ' kHz';
    if(data.temp) {
        const tempSpan = document.getElementById('tel-temp');
        tempSpan.textContent = data.temp + ' °C';
        if(data.temp > 50) {
            tempSpan.style.color = '#ef4444';
            addLog(`ALERTA: Temperatura critica (${data.temp}C)`, 'danger');
        } else {
            tempSpan.style.color = 'var(--accent)';
        }
    }
});

socket.on('sync_state', (state) => {
    isSystemOn = state.power;
    updatePowerUI();
    
    rangeHeight.value = state.height;
    valHeight.textContent = state.height;
    valHeightDesc.textContent = getHeightDescription(state.height);
    
    rangeOffsetY.value = state.offsetY;
    valOffsetY.textContent = state.offsetY;
    
    modeButtons.forEach(btn => {
        if (btn.getAttribute('data-mode') === state.mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    addLog('Estado sincronizado con el servidor', 'network');
});
