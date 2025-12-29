/* analytics.js */

// Constants & Config
const CONFIG = {
    updateInterval: 2000, // 2 seconds
    maxDataPoints: 20,
    thresholds: {
        pm25: 35,
        smoke: 30, // ppm
        temp: 45   // Celsius
    }
};

// State Management
const state = {
    timestamps: [],
    pm25: [],
    co2: [],
    temp: [],
    humidity: [],
    smoke: [],
    fireRisk: 0
};

// Initialize Charts
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initHeatmap();
    startSimulation();
    updateSystemTime();
});

function initCharts() {
    // 1. Main Air Quality Chart (Line)
    const ctxAir = document.getElementById('airQualityChart').getContext('2d');
    charts.air = new Chart(ctxAir, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'PM2.5',
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                data: [],
                tension: 0.4,
                fill: true
            },
            {
                label: 'CO2 (ppm)',
                borderColor: '#10b981',
                borderDash: [5, 5],
                data: [],
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y1: { position: 'right', grid: { display: false } }
            },
            plugins: { legend: { labels: { color: '#94a3b8' } } }
        }
    });

    // 2. Fire Risk Gauge (Doughnut as Gauge)
    const ctxFire = document.getElementById('fireRiskGauge').getContext('2d');
    charts.fire = new Chart(ctxFire, {
        type: 'doughnut',
        data: {
            labels: ['Risk', 'Safe'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#ef4444', '#1f2937'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });

    // 3. Prediction Chart (Bar)
    const ctxPred = document.getElementById('predictionChart').getContext('2d');
    charts.pred = new Chart(ctxPred, {
        type: 'bar',
        data: {
            labels: ['1h', '2h', '3h', '4h'],
            datasets: [{
                label: 'Predicted Risk',
                data: [10, 15, 12, 8],
                backgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { 
                x: { grid: { display: false } },
                y: { display: false }
            }
        }
    });

    // 4. Env Chart (Scatter/Dual)
    const ctxEnv = document.getElementById('envChart').getContext('2d');
    charts.env = new Chart(ctxEnv, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temp (°C)',
                borderColor: '#ef4444',
                data: [],
                tension: 0.4 
            }, {
                label: 'Humidity (%)',
                borderColor: '#3b82f6',
                data: [],
                tension: 0.4
            }]
        },
        options: {
             responsive: true,
             maintainAspectRatio: false,
             elements: { point: { radius: 0 } },
             plugins: { legend: { display: false } },
             scales: {
                 x: { display: false },
                 y: { grid: { color: 'rgba(255,255,255,0.05)' } }
             }
        }
    });

    // 5. Correlation Chart (Scatter)
    const ctxCor = document.getElementById('correlationChart').getContext('2d');
    charts.cor = new Chart(ctxCor, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Smoke vs AQI',
                data: [],
                backgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Smoke Density' } },
                y: { title: { display: true, text: 'AQI' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Heatmap Grid Generation
function initHeatmap() {
    const grid = document.getElementById('smokeHeatmap');
    grid.innerHTML = '';
    for(let i=0; i<20; i++) {
        const div = document.createElement('div');
        div.className = 'heat-cell';
        grid.appendChild(div);
    }
}

// Data Simulation Loop
function startSimulation() {
    setInterval(() => {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();

        // Generate Random Data with Pattern
        const newPM25 = 20 + Math.random() * 15 + Math.sin(now.getTime()/10000) * 10;
        const newCO2 = 400 + Math.random() * 50;
        const newSmoke = Math.max(0, Math.random() * 10 + (Math.random() > 0.9 ? 30 : 0)); // Occasional spike
        const newTemp = 24 + Math.random() * 2;
        const newHum = 45 + Math.random() * 5;

        // Update State
        if(state.timestamps.length > CONFIG.maxDataPoints) {
            state.timestamps.shift();
            state.pm25.shift();
            state.co2.shift();
            state.temp.shift();
            state.humidity.shift();
        }

        state.timestamps.push(timeLabel);
        state.pm25.push(newPM25);
        state.co2.push(newCO2);
        state.temp.push(newTemp);
        state.humidity.push(newHum);

        // Update Charts
        updateCharts(newPM25, newCO2, newSmoke, newTemp, newHum);
        updateKPIs(newPM25, newSmoke, newTemp);
        updateHeatmap(newSmoke);
        checkAlerts(newPM25, newSmoke);

    }, CONFIG.updateInterval);

    // Clock
    setInterval(updateSystemTime, 1000);
}

function updateCharts(pm25, co2, smoke, temp, hum) {
    // Air Chart
    charts.air.data.labels = state.timestamps;
    charts.air.data.datasets[0].data = state.pm25;
    charts.air.data.datasets[1].data = state.co2;
    charts.air.update('none'); // 'none' for performance

    // Fire Gauge (Calc Fire Risk)
    // Risk formula: Smoke * 0.7 + (Temp-25) * 2;
    let risk = Math.min(100, Math.max(0, (smoke * 1.5) + (temp - 30)*5));
    charts.fire.data.datasets[0].data = [risk, 100-risk];
    // Dynamic Color
    charts.fire.data.datasets[0].backgroundColor[0] = risk > 50 ? '#ef4444' : '#f59e0b';
    charts.fire.update();

    // Env Chart
    charts.env.data.labels = state.timestamps;
    charts.env.data.datasets[0].data = state.temp;
    charts.env.data.datasets[1].data = state.humidity;
    charts.env.update('none');

    // Correlation (Add point)
    if(charts.cor.data.datasets[0].data.length > 30) charts.cor.data.datasets[0].data.shift();
    charts.cor.data.datasets[0].data.push({x: smoke, y: pm25 + (smoke*0.5)});
    charts.cor.update();
}

function updateKPIs(pm25, smoke, temp) {
    document.getElementById('kpi-aqi').innerText = Math.round(pm25 * 1.5); // Simple AQI calc
    document.getElementById('kpi-smoke').innerText = smoke.toFixed(1);
    
    // Risk
    let risk = Math.round((smoke * 1.5) + (temp - 30)*5);
    risk = Math.max(0, risk);
    document.getElementById('kpi-fire').innerText = risk;

    // Efficiency Mock
    document.getElementById('kpi-eff').innerText = (95 + Math.random()*4).toFixed(1);
}

function updateHeatmap(smokeLevel) {
    const cells = document.querySelectorAll('.heat-cell');
    cells.forEach(cell => { // Randomly flicker cells based on smoke level
        if(Math.random() < (smokeLevel / 50)) {
            const intensity = Math.random();
            cell.style.background = `rgba(239, 68, 68, ${intensity})`; // Red flash
        } else {
            cell.style.background = 'rgba(255,255,255,0.05)';
        }
    });
}

function checkAlerts(pm25, smoke) {
    if(smoke > 20 && Math.random() > 0.8) {
        addAlert('critical', 'Smoke Detected', 'Zone 4 sensor reporting elevated levels.');
    }
}

function addAlert(type, title, msg) {
    const list = document.getElementById('alertsList');
    const item = document.createElement('div');
    item.className = `alert-item ${type}`;
    item.innerHTML = `
        <div class="alert-icon"><i class="fas fa-${type === 'critical' ? 'fire' : 'exclamation-triangle'}"></i></div>
        <div class="alert-content">
            <span class="alert-title">${title}</span>
            <span class="alert-time">Just Now</span>
        </div>
    `;
    list.prepend(item);
    if(list.children.length > 5) list.lastElementChild.remove();
    
    // Update Badge
    document.getElementById('alertCount').innerText = "1 New";
    document.getElementById('alertCount').style.background = "#ef4444";
    setTimeout(() => { document.getElementById('alertCount').style.background = ""; }, 2000);
}

function updateSystemTime() {
    document.getElementById('lastUpdated').innerText = new Date().toLocaleTimeString();
}
