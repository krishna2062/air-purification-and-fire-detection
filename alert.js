/* alert.js - Logic for Alert & Emergency Monitoring */

// State
let activeAlerts = [];
let alertHistory = [];
let isEmergency = false;
let systemStatus = 'SAFE'; // SAFE, WARNING, EMERGENCY
let activeFilter = 'all';

// Charts
let severityChart;

// --- 1. Simulation Data Generators ---

const ALERT_TYPES = {
    FIRE: [
        { type: 'Smoke Detected', msg: 'Smoke sensor triggered in Zone 1 (Kitchen)', severity: 'critical', icon: 'smog' },
        { type: 'Flame Detected', msg: 'UV Flame sensor positive in Zone 4 (Server Room)', severity: 'critical', icon: 'fire' },
        { type: 'Heat Warning', msg: 'Rapid temperature rise (+5°C/min) in East Wing', severity: 'warning', icon: 'thermometer-full' },
        { type: 'Gas Leak', msg: 'Combustible gas limit exceeded (LPG)', severity: 'critical', icon: 'radiation-alt' }
    ],
    AIR: [
        { type: 'High PM2.5', msg: 'PM2.5 exceeded safe limits (150 µg/m³)', severity: 'warning', icon: 'lungs' },
        { type: 'VOC Spike', msg: 'Volatile Compounds high detected near production', severity: 'warning', icon: 'flask' },
        { type: 'CO2 Warning', msg: 'Poor Ventilation: CO2 > 1000ppm', severity: 'info', icon: 'cloud' },
        { type: 'Filter Life', msg: 'HEPA Filter efficiency dropped below 80%', severity: 'info', icon: 'filter' }
    ]
};

// --- 2. Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // Seed initial history
    generateHistoryLog(15);
    renderHistoryTable();
    
    // Seed active alerts (Simulate existing state)
    // 1 Warning to start
    triggerAlert('AIR', 0); 
    
    // Start Simulation Loop
    startSimulation();

    // Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Top Filter Pills
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            activeFilter = e.target.dataset.filter;
            renderActiveAlerts();
        });
    });

    // History Filters
    document.getElementById('alertSearch').addEventListener('input', renderHistoryTable);
    document.getElementById('severityFilter').addEventListener('change', renderHistoryTable);

    // Modal
    document.getElementById('modalAckBtn').addEventListener('click', () => {
        const id = document.getElementById('detailModal').dataset.id;
        acknowledgeAlert(id);
        closeModal();
    });
}

// --- 3. Core Logic & Rendering ---

function startSimulation() {
    // Randomly trigger alerts every few seconds
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance every check
            const category = Math.random() > 0.8 ? 'FIRE' : 'AIR'; // Air more common
            const index = Math.floor(Math.random() * ALERT_TYPES[category].length);
            triggerAlert(category, index);
        }
    }, 5000); // 5 sec interval

    // Update charts/timers periodically
    setInterval(updateTimes, 1000); // Update "Time ago"
}

function triggerAlert(category, index) {
    const template = ALERT_TYPES[category][index];
    const newAlert = {
        id: 'alt-' + Date.now(),
        ...template,
        timestamp: new Date(),
        category: category.toLowerCase(),
        status: 'active' // active, ack, resolved
    };

    activeAlerts.unshift(newAlert); // Add to top
    if (activeAlerts.length > 50) activeAlerts.pop();

    updateSystemStatus();
    renderActiveAlerts();
    updateCharts();
    
    // Play sound or effect if critical
    if (newAlert.severity === 'critical') {
        playAlertSound();
        if (category === 'FIRE') updateFirePanel(true, newAlert);
    }
}

function updateSystemStatus() {
    // Determine Global Status
    const hasCritical = activeAlerts.some(a => a.severity === 'critical');
    const hasWarning = activeAlerts.some(a => a.severity === 'warning');
    
    const banner = document.getElementById('globalStatus');
    const label = banner.querySelector('.value');
    const icon = banner.querySelector('.status-icon');

    banner.classList.remove('safe', 'warning', 'danger');
    
    if (hasCritical) {
        systemStatus = 'EMERGENCY';
        banner.classList.add('danger');
        label.textContent = 'EMERGENCY';
        icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        document.getElementById('btnSilence').disabled = false;
    } else if (hasWarning) {
        systemStatus = 'WARNING';
        banner.classList.add('warning');
        label.textContent = 'WARNING';
        icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        document.getElementById('btnSilence').disabled = false;
    } else {
        systemStatus = 'SAFE';
        banner.classList.add('safe');
        label.textContent = 'NORMAL';
        icon.innerHTML = '<i class="fas fa-check-circle"></i>';
        document.getElementById('btnSilence').disabled = true;
    }

    document.getElementById('activeCount').textContent = activeAlerts.length;
}

function renderActiveAlerts() {
    const container = document.getElementById('activeAlertsList');
    container.innerHTML = '';

    const filtered = activeAlerts.filter(a => {
        if (activeFilter === 'all') return true;
        return a.category === activeFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-double" style="font-size:2rem; color:var(--k-safe); margin-bottom:1rem;"></i>
                <p>No active alerts in this category.</p>
            </div>`;
        return;
    }

    filtered.forEach(alert => {
        const activeTime = Math.floor((new Date() - alert.timestamp) / 1000);
        let timeString = activeTime < 60 ? 'Just now' : `${Math.floor(activeTime/60)}m ago`;

        const div = document.createElement('div');
        div.className = `alert-card ${alert.severity}`;
        div.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon"><i class="fas fa-${alert.icon}"></i></div>
                <div class="alert-details">
                    <h4>${alert.type} <span style="font-size:0.7em; opacity:0.6">[ID: ${alert.id.substr(4,4)}]</span></h4>
                    <p>${alert.msg}</p>
                    <span class="alert-time" data-ts="${alert.timestamp.getTime()}">${timeString}</span>
                </div>
            </div>
            <div class="alert-actions">
                <button class="btn-sm" onclick="openModal('${alert.id}')">Details</button>
                <button class="btn-sm btn-ack" onclick="acknowledgeAlert('${alert.id}')"><i class="fas fa-check"></i> Ack</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateTimes() {
    document.querySelectorAll('.alert-time').forEach(el => {
        const ts = parseInt(el.dataset.ts);
        const diff = Math.floor((new Date() - ts) / 1000);
        if (diff < 60) el.textContent = 'Just now';
        else if (diff < 3600) el.textContent = `${Math.floor(diff/60)}m ago`;
        else el.textContent = `${Math.floor(diff/3600)}h ago`;
    });
}

function acknowledgeAlert(id) {
    const index = activeAlerts.findIndex(a => a.id === id);
    if (index !== -1) {
        const alert = activeAlerts.splice(index, 1)[0];
        alert.status = 'acknowledged';
        alert.ackTime = new Date();
        alertHistory.unshift(alert); // Move to history
        
        // Refresh UI
        updateSystemStatus();
        renderActiveAlerts();
        renderHistoryTable();
        updateCharts();
        
        // Reset Fire Panel if no critical fire alerts left
        const hasFireCrit = activeAlerts.some(a => a.category === 'fire' && a.severity === 'critical');
        if (!hasFireCrit) updateFirePanel(false);
    }
}

// --- 4. Fire Panel Logic ---

function updateFirePanel(isCritical, alert = null) {
    const indicator = document.getElementById('fireIndicator');
    const msg = indicator.querySelector('strong');
    const badge = document.getElementById('fireSystemStatus');
    
    if (isCritical) {
        indicator.classList.add('danger');
        msg.textContent = 'DETECTED';
        badge.textContent = 'ACTIVE';
        badge.style.color = 'var(--k-danger)';
        
        // Simulate rising values
        document.getElementById('smokeBar').style.width = '75%';
        document.getElementById('smokeVal').textContent = '780ppm';
        document.getElementById('heatBar').style.width = '60%';
        document.getElementById('heatVal').textContent = '45°C';
    } else {
        indicator.classList.remove('danger');
        msg.textContent = 'CLEAR';
        badge.textContent = 'STANDBY';
        badge.style.color = 'inherit';
        
        document.getElementById('smokeBar').style.width = '0%';
        document.getElementById('smokeVal').textContent = '0%';
        document.getElementById('heatBar').style.width = '10%';
        document.getElementById('heatVal').textContent = '24°C';
    }
}

function triggerManualDrill() {
    alert("Initiating Standard Fire Drill Protocol...\n- Alarms Sounding\n- Elevators Grounded\n- HVAC Shutdown");
    triggerAlert('FIRE', 0); // Fake smoke
}

// --- 5. History Table Logic ---

function generateHistoryLog(count) {
    const now = new Date();
    for(let i=0; i<count; i++) {
        const category = Math.random() > 0.5 ? 'FIRE' : 'AIR';
        const tpl = ALERT_TYPES[category][Math.floor(Math.random() * ALERT_TYPES[category].length)];
        const time = new Date(now.getTime() - (Math.random() * 86400000 * 3)); // past 3 days
        
        alertHistory.push({
            id: `hist-${i}`,
            ...tpl,
            timestamp: time,
            status: 'resolved',
            category: category.toLowerCase(),
            action: tpl.severity === 'critical' ? 'Auto-Shutdown' : 'Notification Sent'
        });
    }
    alertHistory.sort((a,b) => b.timestamp - a.timestamp);
}

function renderHistoryTable() {
    const tbody = document.getElementById('alertTableBody');
    tbody.innerHTML = '';
    
    // Filters
    const search = document.getElementById('alertSearch').value.toLowerCase();
    const severity = document.getElementById('severityFilter').value;
    
    const filtered = alertHistory.filter(a => {
        const matchSearch = a.type.toLowerCase().includes(search) || a.msg.toLowerCase().includes(search);
        const matchSev = severity === 'all' || 
                         (severity === 'critical' && a.severity === 'critical') ||
                         (severity === 'warning' && (a.severity === 'warning' || a.severity === 'critical'));
        return matchSearch && matchSev;
    });

    // Pagination (Simple top 10 for demo)
    filtered.slice(0, 10).forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family:monospace; color:#9ca3af;">${formatDate(a.timestamp)}</td>
            <td><span class="pill" style="background:transparent; border:1px solid ${getSeverityColor(a.severity)}; color:${getSeverityColor(a.severity)}">${a.severity.toUpperCase()}</span></td>
            <td>${a.type}</td>
            <td>${a.category === 'fire' ? 'Safety Sensor' : 'Env Sensor'}</td>
            <td>${a.action || 'Manual Reset'}</td>
            <td style="color:var(--k-safe)"><i class="fas fa-check"></i> Resolved</td>
        `;
        tbody.appendChild(tr);
    });
}

function getSeverityColor(s) {
    if(s === 'critical') return 'var(--k-danger)';
    if(s === 'warning') return 'var(--k-warning)';
    return 'var(--k-info)';
}

function formatDate(d) {
    return d.toLocaleString('en-GB', { hour12: false });
}

// --- 6. Charts & Modal ---

function initCharts() {
    const ctx = document.getElementById('severityChart').getContext('2d');
    severityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'Warning', 'Info'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function updateCharts() {
    // Count stats from history + active
    const all = [...activeAlerts, ...alertHistory];
    const crit = all.filter(a => a.severity === 'critical').length;
    const warn = all.filter(a => a.severity === 'warning').length;
    const info = all.filter(a => a.severity === 'info').length;

    document.getElementById('countCritical').textContent = crit;
    document.getElementById('countWarning').textContent = warn;
    document.getElementById('countInfo').textContent = info;

    severityChart.data.datasets[0].data = [crit, warn, info];
    severityChart.update();
}

// Modal
function openModal(id) {
    const alert = activeAlerts.find(a => a.id === id);
    if(alert) {
        document.getElementById('modalTitle').textContent = `Alert Details: ${alert.type}`;
        document.getElementById('modalContent').innerHTML = `
            <p><strong>Timestamp:</strong> ${formatDate(alert.timestamp)}</p>
            <p><strong>Message:</strong> ${alert.msg}</p>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Sensor ID:</strong> SN-2024-X45</p>
            <hr style="border-color:#374151; margin:1rem 0;">
            <p><em>Standard Operating Procedure: Verify sensor location manually. If fire confirmed, evacuate immediately.</em></p>
        `;
        document.getElementById('detailModal').dataset.id = id;
        document.getElementById('detailModal').classList.add('active');
    }
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function playAlertSound() {
    // console.log("BEEP BEEP - Critical Alert!");
}
