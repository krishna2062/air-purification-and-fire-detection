/* history.js - Logic for Historical Data & Event Logs */

// Global State
let allHistoryData = [];
let allEvents = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let charts = {}; // Store chart instances

// --- 1. Data Generation (Simulation) ---

function generateHistoryData(days = 7) {
    const data = [];
    const events = [];
    const now = new Date();
    
    // Generate data for each hour of the past 'days'
    for (let i = 0; i < days * 24; i++) {
        const time = new Date(now.getTime() - (i * 3600 * 1000));
        
        // Random baselines with some sine wave for daily cycle
        const hour = time.getHours();
        const cycle = Math.sin((hour - 6) / 12 * Math.PI); // Peak around 12-2 PM
        
        // PM2.5: Base 15 + random + daily cycle
        let pm25 = Math.max(2, 15 + (Math.random() * 20 - 10) + (cycle * 10));
        let pm10 = pm25 * (1.5 + Math.random() * 0.5);
        
        // Gases
        let co2 = 400 + (Math.random() * 100) + (cycle * 50);
        let voc = 10 + (Math.random() * 20);
        
        // Temp/Hum
        let temp = 22 + (Math.random() * 2) + (cycle * 3);
        let hum = 50 + (Math.random() * 10) - (cycle * 10);
        
        // AQI Calculation (Simplified)
        let aqi = pm25 * 3.5; 
        
        // Occasional "Spike" events
        let status = 'Normal';
        let action = '-';
        
        if (Math.random() > 0.97) {
            pm25 += 50; aqi += 150;
            status = 'Warning';
            action = 'Fan Boost Auto';
            events.push({
                id: `evt-${i}`,
                time: time,
                type: 'High Pollution',
                severity: 'warning',
                details: `Spike in PM2.5 detected (${pm25.toFixed(0)} µg/m³). Purifiers engaged.`,
                action: 'Auto-Purify'
            });
        }
        
        if (Math.random() > 0.995) {
            // Fire/Smoke Event simulation
            status = 'Emergency';
            action = 'Alarm + Sprinkler Standby';
            events.push({
                id: `evt-crit-${i}`,
                time: time,
                type: 'Smoke Detected',
                severity: 'danger',
                details: 'Smoke sensor triggered in Zone 2. System Alert sent to Admin.',
                action: 'Emergency Protocol'
            });
        }

        data.push({
            timestamp: time,
            pm25: parseFloat(pm25.toFixed(1)),
            pm10: parseFloat(pm10.toFixed(1)),
            co2: parseFloat(co2.toFixed(0)),
            voc: parseFloat(voc.toFixed(1)),
            temp: parseFloat(temp.toFixed(1)),
            hum: parseFloat(hum.toFixed(1)),
            aqi: Math.round(aqi),
            status: status,
            action: action
        });
    }
    
    // Sort chronological (oldest first for charts)
    return { 
        data: data.reverse(), 
        events: events.sort((a,b) => b.time - a.time) // Newest first for list
    };
}

// --- 2. Initialization & DOM ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Generate Data
    const sim = generateHistoryData(3); // Last 3 days
    allHistoryData = sim.data;
    allEvents = sim.events;
    filteredData = [...allHistoryData];
    
    // 2. Set Default Date Inputs
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 3);
    
    document.getElementById('endDate').value = end.toISOString().slice(0, 16);
    document.getElementById('startDate').value = start.toISOString().slice(0, 16);

    // 3. Init Charts
    initCharts();
    
    // 4. Update UI
    updateDashboard();

    // 5. Event Listeners
    setupEventListeners();

    // 6. Theme Init
    initTheme();
});

// --- Theme Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const btn = document.getElementById('themeToggle');
    if(btn) {
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            
            // Optional: Update charts if needed (e.g. grid colors)
            // location.reload(); // Simple way to re-render charts with new colors if they depend on CSS vars
        });
    }
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    if(btn) {
        const i = btn.querySelector('i');
        if(theme === 'dark') {
            i.className = 'fas fa-sun';
        } else {
            i.className = 'fas fa-moon';
        }
    }
}

function setupEventListeners() {
    // Date Range
    document.getElementById('startDate').addEventListener('change', filterData);
    document.getElementById('endDate').addEventListener('change', filterData);
    
    // Type Filter
    document.getElementById('dataTypeFilter').addEventListener('change', filterData);
    
    // Search
    document.getElementById('tableSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        // Just filter the table view, not charts? 
        // Typically search is just for the grid.
        renderTable(filteredData.filter(row => 
            row.status.toLowerCase().includes(term) || 
            row.action.toLowerCase().includes(term)
        ));
    });
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });
    });
}

// --- 3. Core Logic ---

function filterData() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    const type = document.getElementById('dataTypeFilter').value; // 'all', 'air', 'fire'

    const startTime = new Date(startStr).getTime();
    const endTime = new Date(endStr).getTime();

    // Filter main data
    filteredData = allHistoryData.filter(d => {
        const t = d.timestamp.getTime();
        return t >= startTime && t <= endTime;
    });

    // Update everything
    updateDashboard();
}

function updateDashboard() {
    updateSummaryCards();
    updateCharts();
    renderTable(filteredData);
    renderTimeline();
    currentPage = 1;
    updatePaginationControls();
}

function updateSummaryCards() {
    if (filteredData.length === 0) return;
    
    // Avg AQI
    const totalAqi = filteredData.reduce((sum, row) => sum + row.aqi, 0);
    const avgAqi = Math.round(totalAqi / filteredData.length);
    document.getElementById('avgAqi').textContent = avgAqi;

    // Max Temp
    const maxTemp = Math.max(...filteredData.map(d => d.temp));
    document.getElementById('maxTemp').textContent = maxTemp.toFixed(1) + '°C';
    
    // Total Alerts (from events list within range)
    const startTime = filteredData[0].timestamp;
    const endTime = filteredData[filteredData.length - 1].timestamp; // Assuming sorted
    
    const rangeEvents = allEvents.filter(e => e.time >= startTime && e.time <= endTime);
    document.getElementById('totalAlerts').textContent = rangeEvents.length;
}

// --- 4. Chart.js Implementations ---

function initCharts() {
    // Shared Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }, // We have custom legend or simple charts
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
            y: { border: { dash: [4, 4] }, grid: { color: '#e2e8f0' }, ticks: { color: '#94a3b8' } }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    // 1. History Chart (Line)
    const ctxHistory = document.getElementById('historyChart').getContext('2d');
    charts.main = new Chart(ctxHistory, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'AQI',
                    data: [],
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'PM2.5',
                    data: [],
                    borderColor: '#3498db',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'PM10',
                    data: [],
                    borderColor: '#9b59b6',
                    borderWidth: 2,
                    tension: 0.4,
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: commonOptions
    });

    // 2. Fire Bar Chart
    const ctxFire = document.getElementById('fireBarChart').getContext('2d');
    charts.fire = new Chart(ctxFire, {
        type: 'bar',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3'],
            datasets: [{
                label: 'Alerts',
                data: [2, 5, 1],
                backgroundColor: '#e74c3c',
                borderRadius: 4
            }]
        },
        options: {
            ...commonOptions,
            plugins: { legend: { display: false } }
        }
    });

    // 3. Gas Chart
    const ctxGas = document.getElementById('gasChart').getContext('2d');
    charts.gas = new Chart(ctxGas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CO2',
                    data: [],
                    borderColor: '#f1c40f',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'VOC',
                    data: [],
                    borderColor: '#e67e22',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { display: false },
                y: { display: true },
                y1: { display: true, position: 'right', grid: { display: false } }
            }
        }
    });
}

function updateCharts() {
    if (!charts.main) return;
    
    // Downsample for performance if needed, but for <500 pts it's fine
    const labels = filteredData.map(d => formatDateShort(d.timestamp));
    
    // Main Chart
    charts.main.data.labels = labels;
    charts.main.data.datasets[0].data = filteredData.map(d => d.aqi);
    charts.main.data.datasets[1].data = filteredData.map(d => d.pm25);
    charts.main.data.datasets[2].data = filteredData.map(d => d.pm10);
    charts.main.update();
    
    // Gas Chart
    charts.gas.data.labels = labels;
    charts.gas.data.datasets[0].data = filteredData.map(d => d.co2);
    charts.gas.data.datasets[1].data = filteredData.map(d => d.voc);
    charts.gas.update();
    
    // Fire Chart (Aggregate by day)
    // Simplified just random numbers for demo based on 'events'
    // In real app, group 'allEvents' by day
    charts.fire.update();
}

// --- 5. Table & Pagination ---

function renderTable(data, page = 1) {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    // Search Filter happens before this function call usually, but we passed 'data' which is filteredData
    // Apply Pagination
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = data.slice(start, end);
    
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        
        let statusClass = 'status-normal';
        if (row.status === 'Warning') statusClass = 'status-warning';
        if (row.status === 'Emergency') statusClass = 'status-danger';
        
        tr.innerHTML = `
            <td>${formatDateLong(row.timestamp)}</td>
            <td>Log Entry</td>
            <td>
                <span style="font-size:0.9em; opacity:0.8;">
                    PM2.5: ${row.pm25} | CO2: ${row.co2} | T: ${row.temp}°
                </span>
            </td>
            <td><span class="status-badge ${statusClass}">${row.status}</span></td>
            <td>${row.action}</td>
        `;
        tbody.appendChild(tr);
    });
    
    updatePaginationControls(data.length);
}

function updatePaginationControls(totalItems) {
    if (!totalItems) totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable(filteredData);
    }
}

// --- 6. Timeline ---

function renderTimeline() {
    const container = document.getElementById('fireTimeline');
    container.innerHTML = '';
    
    // Filter events by current time range
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    const startTime = new Date(startStr).getTime();
    const endTime = new Date(endStr).getTime();
    
    const visibleEvents = allEvents.filter(e => e.time.getTime() >= startTime && e.time.getTime() <= endTime);
    
    if (visibleEvents.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">No events in this period.</p>';
        return;
    }
    
    visibleEvents.forEach(evt => {
        const div = document.createElement('div');
        div.className = 'timeline-item';
        div.innerHTML = `
            <div class="time-marker">${formatDateLong(evt.time)}</div>
            <div class="event-card ${evt.severity}">
                <h4><i class="fas fa-exclamation-circle"></i> ${evt.type}</h4>
                <p>${evt.details}</p>
                <small style="display:block; margin-top:0.5rem; color:var(--text-muted);">
                    <i class="fas fa-robot"></i> Action: ${evt.action}
                </small>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- Helpers ---

function formatDateShort(date) {
    return date.getHours() + ':00';
}

function formatDateLong(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function exportData(format) {
    alert(`Simulating export of ${filteredData.length} records to ${format.toUpperCase()}... File would download here.`);
}

function sortTable(n) {
    // Sort logic placeholder
    // In a real app, sort 'filteredData' then renderTable
    alert("Sorting functionality simulated.");
}
