/* reports.js - Data Aggregation & Reporting */

// State
let selectedType = 'air'; // air, fire, full
let reportHistory = [];
let myChart = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    setupListeners();
    loadHistory();
    // Generate default on load
    generateReport();
});

function updateDate() {
    const d = new Date();
    document.getElementById('dateDisplay').textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function setupListeners() {
    // Type Selectors
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedType = e.currentTarget.dataset.type;
        });
    });
}

// --- Report Generation ---

function generateReport() {
    const range = document.getElementById('timeRange').value;
    const includeCharts = document.getElementById('incCharts').checked;
    
    // Simulate Data Fetching
    const data = fetchMockData(selectedType, range);
    
    // 1. Update Meta
    document.getElementById('repTitle').textContent = getTypeLabel(selectedType) + ' Report';
    document.getElementById('repDate').textContent = new Date().toLocaleDateString();
    document.getElementById('repId').textContent = 'R-' + Math.floor(Math.random() * 100000);

    // 2. Summary Cards
    renderSummary(data);

    // 3. AI Insights
    renderInsights(data, selectedType);

    // 4. Chart
    if (includeCharts) {
        document.querySelector('.chart-container').style.display = 'block';
        renderChart(data);
    } else {
        document.querySelector('.chart-container').style.display = 'none';
    }

    // 5. Table
    renderTable(data);

    // Add to Sidebar History
    addToHistory(getTypeLabel(selectedType), range);
    
    // Feedback
    showToast("Report Generated Successfully");
}

function fetchMockData(type, range) {
    // Mocking API response
    const dataPoints = (range === 'today') ? 24 : 7;
    const labels = (range === 'today') 
        ? Array.from({length: 24}, (_, i) => `${i}:00`) 
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    let stats = {};
    let trend = [];

    if (type === 'air' || type === 'full') {
        const baseAQI = 40;
        trend = labels.map(() => baseAQI + Math.floor(Math.random() * 50));
        stats = {
            'Avg AQI': Math.floor(trend.reduce((a,b)=>a+b,0) / trend.length),
            'Peak AQI': Math.max(...trend),
            'Purifier Runtime': (Math.random() * 10 + 5).toFixed(1) + 'h',
            'Energy Saved': '12%'
        };
    } else if (type === 'fire') {
        trend = labels.map(() => Math.random() > 0.8 ? 1 : 0);
        const incidents = trend.reduce((a,b)=>a+b,0);
        stats = {
            'Incidents': incidents,
            'Avg Temp': '24°C',
            'Smoke Events': incidents > 0 ? incidents : 0,
            'System Health': '98%'
        };
    }

    // If full, merge some logic (simplified for demo)
    if (type === 'full') {
        stats['Fire Incidents'] = 0;
    }

    return { labels, trend, stats, rawLogs: generateMockLogs(type, 10) };
}

function generateMockLogs(type, count) {
    const logs = [];
    const events = type === 'fire' 
        ? ['System Check', 'Smoke Sensor Low', 'Temp Normal', 'Heartbeat'] 
        : ['Fan Speed High', 'AQI Spike', 'Filter Check', 'Mode: Auto'];
    
    for(let i=0; i<count; i++) {
        logs.push({
            time: `2025-12-28 ${10+i}:00`,
            event: events[Math.floor(Math.random() * events.length)],
            val: Math.floor(Math.random() * 100),
            status: 'OK'
        });
    }
    return logs;
}

// --- Rendering ---

function renderSummary(data) {
    const grid = document.getElementById('summaryGrid');
    grid.innerHTML = '';
    
    Object.entries(data.stats).forEach(([key, val]) => {
        const card = document.createElement('div');
        card.className = 'sum-card';
        card.innerHTML = `<span class="lbl">${key}</span><span class="val">${val}</span>`;
        grid.appendChild(card);
    });
}

function renderInsights(data, type) {
    const box = document.getElementById('aiInsights');
    let text = "";
    
    if (type === 'air') {
        const avg = data.stats['Avg AQI'];
        if (avg < 50) text = `<strong>Status: Good.</strong> Air quality trends indicate optimal environmental control. Purifier efficiency is high. No critical spikes detected in the selected period. Recommended Action: Maintain current schedule.`;
        else text = `<strong>Status: Moderate.</strong> Minor fluctuations observed. Consider increasing filter boost during peak hours (18:00 - 21:00).`;
    } else if (type === 'fire') {
        text = `<strong>Status: Secure.</strong> Intelligence diagnostics confirm all sensors are operational. No critical heat signatures or smoke particles detected. Routine calibration scheduled for next week.`;
    } else {
        text = `<strong>Status: Stable.</strong> Unified system check passed. Power consumption is within green limits. Environmental and Safety subsystems are synchronized.`;
    }
    box.innerHTML = text;
}

function renderChart(data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: selectedType === 'fire' ? 'bar' : 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: selectedType === 'fire' ? 'Incidents' : 'AQI Level',
                data: data.trend,
                borderColor: selectedType === 'fire' ? '#ef4444' : '#3b82f6',
                backgroundColor: selectedType === 'fire' ? '#ef4444' : 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    
    data.rawLogs.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.time}</td>
            <td>${row.event}</td>
            <td>${row.val}</td>
            <td><span style="color:green; font-weight:600">${row.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- History & Export ---

function addToHistory(typeStr, range) {
    const item = { type: typeStr, range, date: new Date().toLocaleTimeString() };
    reportHistory.unshift(item);
    if (reportHistory.length > 5) reportHistory.pop();
    
    renderHistoryList();
    localStorage.setItem('repHistory', JSON.stringify(reportHistory));
}

function loadHistory() {
    const saved = localStorage.getItem('repHistory');
    if (saved) reportHistory = JSON.parse(saved);
    renderHistoryList();
}

function renderHistoryList() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    
    if (reportHistory.length === 0) {
        list.innerHTML = '<div class="empty-msg" style="padding:0.5rem; color:#94a3b8; font-size:0.8rem">No recent reports</div>';
        return;
    }

    reportHistory.forEach(h => {
        const div = document.createElement('div');
        div.className = 'h-item';
        div.innerHTML = `
            <span>${h.type} <span style="opacity:0.5">(${h.range})</span></span>
            <span class="h-date">${h.date}</span>
        `;
        list.appendChild(div);
    });
}

function getTypeLabel(t) {
    if (t==='air') return 'Air Quality';
    if (t==='fire') return 'Fire Safety';
    return 'Full System';
}

function printReport() {
    window.print();
}

function exportData(format) {
    showToast(`Downloading ${format.toUpperCase()}...`);
    // Simulation
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}
