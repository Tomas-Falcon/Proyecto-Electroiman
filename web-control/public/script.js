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

// Gestión de Encendido/Apagado
btnPower.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    updatePowerUI();
    socket.emit('toggle_system', isSystemOn);
});

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

// Gestión de Altura
rangeHeight.addEventListener('input', (e) => {
    valHeight.textContent = e.target.value;
});

rangeHeight.addEventListener('change', (e) => {
    socket.emit('set_height', e.target.value);
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

// Telemetría (Escucha simulada)
socket.on('telemetry', (data) => {
    if(data.batt) document.getElementById('tel-batt').textContent = data.batt + '%';
    if(data.core0) document.getElementById('tel-core0').textContent = data.core0 + ' kHz';
});
