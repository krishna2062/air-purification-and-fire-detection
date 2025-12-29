/* dashboard.js - Redesigned */

// Security Check
if(sessionStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "index.html";
}

const CONFIG = {
    tickRate: 1500, // Update every 1.5s
    maxData: 20
};

// State
const state = {
    aqi: 45,
    pm25: 12,
    fireRisk: 2,
    lastFireRisk: 2,
    alerts: [],
    history: {
        aqi: Array(CONFIG.maxData).fill(45),
        labels: Array(CONFIG.maxData).fill('')
    }
};

let mainChart;
let barChart;

// Init
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateTime();
    setInterval(tick, CONFIG.tickRate);
    setInterval(updateTime, 1000);

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to logout?")) {
                sessionStorage.removeItem("isLoggedIn");
                sessionStorage.removeItem("userRole");
                window.location.href = "index.html";
            }
        });
    }
});

/* ================= LOGIC TO SIMULATE REAL-TIME DATA ================= */
function tick() {
    // 1. Random Walk Data
    state.aqi = clamp(state.aqi + (Math.random() - 0.5) * 5, 20, 150);
    state.pm25 = state.aqi * 0.4 + (Math.random() * 5);
    
    // Rare Fire Event Simulation (1% chance)
    if(Math.random() > 0.995) {
        state.fireRisk = Math.min(100, state.fireRisk + 25);
    } else {
        state.fireRisk = Math.max(0, state.fireRisk - 1);
    }

    // 2. Update UI
    updateCards();
    updateCharts();
    checkInsights();
    checkHazards();
}

function updateCards() {
    // AQI
    const aqiEl = document.getElementById('aqiValue');
    animateValue(aqiEl, Math.round(state.aqi));
    
    const aqiBar = document.getElementById('aqiBar');
    aqiBar.style.width = Math.min(100, (state.aqi / 300) * 100) + '%';
    
    const aqiText = document.getElementById('aqiStatus');
    if (state.aqi < 50) { aqiText.innerText = "Good"; aqiText.className = "status-text safe"; aqiBar.style.background = "var(--color-safe)"; }
    else if (state.aqi < 100) { aqiText.innerText = "Moderate"; aqiText.className = "status-text warn"; aqiBar.style.background = "var(--color-warn)"; }
    else { aqiText.innerText = "Unhealthy"; aqiText.className = "status-text crit"; aqiBar.style.background = "var(--color-crit)"; }

    // PM
    document.getElementById('pmValue').innerText = state.pm25.toFixed(1);

    // Fire
    document.getElementById('fireRiskValue').innerText = Math.round(state.fireRisk);
    document.getElementById('fireBar').style.width = state.fireRisk + '%';
    
    const fireText = document.getElementById('fireStatus');
    if (state.fireRisk > 50) { fireText.innerText = "HIGH"; fireText.className = "status-text crit"; }
    else if (state.fireRisk > 20) { fireText.innerText = "Elevated"; fireText.className = "status-text warn"; }
    else { fireText.innerText = "Low"; fireText.className = "status-text safe"; }
}

function checkInsights() {
    const list = document.getElementById('insightList');
    list.innerHTML = ''; // Clear

    // Logic 1: AQI Trend
    const trend = state.aqi - state.history.aqi[0];
    if(trend < -5) addInsight("Air quality has improved by " + Math.abs(Math.round(trend)) + "% in last session", "fa-leaf");
    else if(trend > 10) addInsight("Detected rising particle count. Check filtration.", "fa-exclamation-triangle");
    
    // Logic 2: Purifier Status
    if(state.aqi > 100) {
        addInsight("Purifier operating at Max Efficiency to combat pollution.", "fa-fan");
        document.getElementById('purifierSpeed').innerText = "Speed: TURBO";
    } else {
        addInsight("Air quality optimal. System in eco-mode.", "fa-seedling");
        document.getElementById('purifierSpeed').innerText = "Speed: Silent";
    }

    // Logic 3: Fire
    if(state.fireRisk > 0 && state.fireRisk > state.lastFireRisk) {
        addInsight("Warning: Thermal anomaly detected in local zone.", "fa-fire");
    }
    state.lastFireRisk = state.fireRisk;
}

function addInsight(text, icon) {
    const div = document.createElement('div');
    div.className = 'insight-item';
    div.innerHTML = `<i class="fas ${icon}"></i><p>${text}</p>`;
    document.getElementById('insightList').appendChild(div);
}

function checkHazards() {
    const box = document.getElementById('emergencyBox');
    const badge = document.getElementById('globalStatus');
    const alarmFeed = document.getElementById('alertFeed');
    
    if (state.fireRisk > 60) {
        // Critical State
        box.querySelector('.value').innerText = "ACTIVE";
        box.querySelector('.value').className = "value on";
        box.style.borderColor = "var(--color-crit)";
        
        badge.className = "status-badge crit";
        badge.querySelector('.status-text').innerText = "EMERGENCY PROTOCOL";
        
        // Add Alert if not recent
        if(Math.random() > 0.8) addAlert("CRITICAL", "High Smoke Levels - Starting Extraction");
        
    } else {
        // Safe
        box.querySelector('.value').innerText = "INACTIVE";
        box.querySelector('.value').className = "value off";
        box.style.borderColor = "#333";
        
        badge.className = "status-badge safe";
        badge.querySelector('.status-text').innerText = "SYSTEM OPTIMAL";
    }

    // Render Alerts
    if(state.alerts.length === 0) return;
    alarmFeed.innerHTML = '';
    state.alerts.slice(0, 5).forEach(a => {
        const div = document.createElement('div');
        div.className = `alert-row ${a.type === 'CRITICAL' ? 'crit' : 'warn'}`;
        div.innerHTML = `<span><b>${a.type}</b>: ${a.msg}</span><span>${a.time}</span>`;
        alarmFeed.prepend(div);
    });
    document.getElementById('activeAlertCount').innerText = state.alerts.length;
}

function addAlert(type, msg) {
    const time = new Date().toLocaleTimeString();
    state.alerts.unshift({ type, msg, time });
    if(state.alerts.length > 20) state.alerts.pop();
}

/* ================= CHARTS ================= */
function initCharts() {
    Chart.defaults.color = '#71717a';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
    Chart.defaults.font.family = "'JetBrains Mono', monospace";

    // 1. Line Chart
    const ctx1 = document.getElementById('mainAqiChart').getContext('2d');
    const grad = ctx1.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // Blue
    grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    mainChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: state.history.labels,
            datasets: [{
                label: 'AQI',
                data: state.history.aqi,
                borderColor: '#3b82f6',
                borderWidth: 2,
                backgroundColor: grad,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { min: 0, max: 200 }
            },
            animation: false
        }
    });

    // 2. Bar Chart
    const ctx2 = document.getElementById('pollutantBarChart').getContext('2d');
    barChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['PM2.5', 'PM10', 'NO2', 'CO', 'O3'],
            datasets: [{
                label: 'Level',
                data: [12, 18, 5, 2, 8],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function updateCharts() {
    // Push new data
    state.history.aqi.push(state.aqi);
    state.history.aqi.shift();
    
    mainChart.update();
    
    // Randomize bar chart slightly
    barChart.data.datasets[0].data = barChart.data.datasets[0].data.map(v => 
        Math.max(0, v + (Math.random() - 0.5) * 2)
    );
    barChart.update();
}

/* ================= UTILS ================= */
function updateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').innerText = now.toLocaleTimeString();
    
    // Env Simulation
    const temp = 22 + (Math.sin(now.getTime()/10000)*2);
    document.getElementById('tempVal').innerText = temp.toFixed(1) + "°C";
    document.getElementById('humVal').innerText = "45%";
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

function animateValue(obj, val) {
    // Simple direct update for high-frequency
    obj.innerText = val;
}
