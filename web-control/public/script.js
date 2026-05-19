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

// Gestión de Altura
const valHeightDesc = document.getElementById('val-height-desc');

function getHeightDescription(val) {
    const v = parseInt(val);
    if (v <= 10) return "Aterrizaje / Bajo";
    if (v <= 20) return "Crucero / Estable";
    if (v <= 30) return "Alto / Exhibicion";
    return "Maximo / Riesgo";
}

rangeHeight.addEventListener('input', (e) => {
    const val = e.target.value;
    valHeight.textContent = val;
    valHeightDesc.textContent = getHeightDescription(val);
});

rangeHeight.addEventListener('change', (e) => {
    const val = e.target.value;
    addLog(`Nueva altura objetivo establecida: ${val}mm`, 'instruction');
    socket.emit('set_height', val);
});

// ... resto de eventos ...

// Telemetria en tiempo real
socket.on('telemetry', (data) => {
    if(data.batt) document.getElementById('tel-batt').textContent = data.batt + '%';
    if(data.core0) document.getElementById('tel-core0').textContent = data.core0 + ' kHz';
    if(data.temp) {
        const tempSpan = document.getElementById('tel-temp');
        tempSpan.textContent = data.temp + ' °C';
        
        // Alerta visual y log de peligro si supera 45C
        if(data.temp > 45) {
            tempSpan.style.color = '#ef4444';
            if (data.temp > 50) {
                addLog(`ALERTA: Temperatura critica (${data.temp}C). Sistema en modo seguridad.`, 'danger');
            }
        } else {
            tempSpan.style.color = 'var(--accent)';
        }
    }
});

// Sincronizacion de estado inicial
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
