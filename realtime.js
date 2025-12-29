/* realtime.js */
const CONFIG = {
    updateRate: 1000,
    maxRows: 50
};

let isStreaming = true;
let dataBuffer = []; // Store for export

document.addEventListener('DOMContentLoaded', () => {
    setInterval(streamCycle, CONFIG.updateRate);
});

function streamCycle() {
    if(!isStreaming) return;

    // Generate Packet
    const packet = generatePacket();
    dataBuffer.push(packet);
    if(dataBuffer.length > 500) dataBuffer.shift(); // Keep max 500 in CSV buffer

    // Update UI
    addTableRow(packet);
    addLogEntry(packet);
}

function generatePacket() {
    const types = ['PM2.5', 'CO2', 'TEMP', 'SMOKE', 'VOC'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let val, unit, status = 'OK';
    const id = "SENS-" + Math.floor(Math.random()*100).toString().padStart(3, '0');

    // Mock Value Logic
    switch(type) {
        case 'PM2.5':
            val = (Math.random() * 50).toFixed(1);
            unit = 'µg/m³';
            if(val > 35) status = 'WARN';
            break;
        case 'CO2':
            val = Math.floor(400 + Math.random() * 800);
            unit = 'ppm';
            if(val > 1000) status = 'WARN';
            break;
        case 'TEMP':
            val = (20 + Math.random() * 10).toFixed(1);
            unit = '°C';
            break;
        case 'SMOKE':
            val = Math.floor(Math.random() * 5); // Usually low
            if(Math.random() > 0.95) val = 45; // Spike
            unit = '%';
            if(val > 20) status = 'CRITICAL';
            break;
        case 'VOC':
            val = Math.floor(Math.random() * 300);
            unit = 'ppb';
            break;
    }

    return {
        timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
        id: id,
        type: type,
        value: val,
        unit: unit,
        status: status
    };
}

function addTableRow(pkt) {
    const tbody = document.getElementById('dataTableBody');
    const row = document.createElement('tr');
    
    // Status color class
    const statusClass = pkt.status === 'OK' ? 'status-ok' : 
                        pkt.status === 'WARN' ? 'status-warn' : 'status-err';

    row.innerHTML = `
        <td>${pkt.timestamp}</td>
        <td>${pkt.id}</td>
        <td>${pkt.type}</td>
        <td>${pkt.value}</td>
        <td>${pkt.unit}</td>
        <td class="${statusClass}">${pkt.status}</td>
    `;
    
    tbody.prepend(row);

    // Prune old rows
    if(tbody.children.length > CONFIG.maxRows) {
        tbody.lastElementChild.remove();
    }
}

function addLogEntry(pkt) {
    const consoleDiv = document.getElementById('consoleOutput');
    const line = document.createElement('div');
    line.className = 'log-line';
    
    // Create compact JSON string
    const jsonStr = JSON.stringify(pkt);
    line.innerText = `> RECV: ${jsonStr}`;
    
    consoleDiv.appendChild(line);
    consoleDiv.scrollTop = consoleDiv.scrollHeight; // Auto scroll
}

/* ================= CONTROLS ================= */
function toggleStream() {
    isStreaming = !isStreaming;
    const btn = document.getElementById('btnPause');
    const status = document.getElementById('streamStatus');
    
    if(isStreaming) {
        btn.innerHTML = '<i class="fas fa-pause"></i> PAUSE';
        status.classList.add('active');
        status.innerHTML = '<span class="dot"></span> LIVE';
    } else {
        btn.innerHTML = '<i class="fas fa-play"></i> RESUME';
        status.classList.remove('active');
        status.innerHTML = '<span class="dot"></span> PAUSED';
    }
}

function clearTable() {
    document.getElementById('dataTableBody').innerHTML = '';
    document.getElementById('consoleOutput').innerHTML = '<div class="log-line system">> Logs cleared by user.</div>';
    dataBuffer = [];
}

function exportCSV() {
    if(dataBuffer.length === 0) {
        alert("No data to export!");
        return;
    }

    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,TIMESTAMP,ID,TYPE,VALUE,UNIT,STATUS\n";
    
    // Rows
    dataBuffer.forEach(row => {
        csvContent += `${row.timestamp},${row.id},${row.type},${row.value},${row.unit},${row.status}\n`;
    });

    // Download Trigger
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sensor_data_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
