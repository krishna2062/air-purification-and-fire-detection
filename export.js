/* export.js - Data Export Handlers */

// State
let filteredData = [];
let exportHistory = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Set default dates (Last 7 days)
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    document.getElementById('dateTo').value = today;
    document.getElementById('dateFrom').value = lastWeek;

    // Load History
    loadHistory();

    // Initial Fetch (Mock)
    updatePreview();
});

// --- Data Logic ---

function updatePreview() {
    const filters = getFilters();
    
    // Simulate Fetching & Filtering
    filteredData = generateMockData(filters);
    
    // Update UI
    document.getElementById('totalExportCount').textContent = filteredData.length;
    document.getElementById('rowCount').textContent = `${Math.min(50, filteredData.length)} of ${filteredData.length} Recs`;
    
    // Render Table
    renderTable(filteredData.slice(0, 50)); // Only show top 50 in preview
}

function getFilters() {
    return {
        category: document.querySelector('input[name="category"]:checked').value,
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value,
        severity: document.getElementById('severitySelect').value,
        format: document.querySelector('input[name="format"]:checked').value
    };
}

function generateMockData(filters) {
    const data = [];
    const count = Math.floor(Math.random() * 200) + 50; // Random count 50-250
    
    const types = {
        'air': ['AQI Reading', 'Filter Status', 'Fan Speed'],
        'fire': ['Smoke Check', 'Temp Scan', 'Alarm Test'],
        'ops': ['System Boot', 'User Login', 'Config Change']
    };

    // Determine type pool
    let pool = [];
    if (filters.category === 'all') {
        pool = [...types.air, ...types.fire, ...types.ops];
    } else {
        pool = types[filters.category] || types.air;
    }

    for(let i=0; i<count; i++) {
        // Mock Severity Filter Logic
        let status = 'Normal';
        const rnd = Math.random();
        if (rnd > 0.8) status = 'Warning';
        if (rnd > 0.95) status = 'Critical';

        if (filters.severity !== 'all' && filters.severity.toLowerCase() !== status.toLowerCase()) continue;

        data.push({
            id: i,
            time: `2025-12-28 ${10 + (i%12)}:${Math.floor(Math.random()*60)}`,
            category: filters.category === 'all' ? 'System' : filters.category.toUpperCase(),
            event: pool[Math.floor(Math.random() * pool.length)],
            val: Math.floor(Math.random() * 100),
            status: status
        });
    }

    // Sort Descending Time
    return data.reverse();
}

function renderTable(data) {
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.time}</td>
            <td>${row.category}</td>
            <td>${row.event}</td>
            <td>${row.val}</td>
            <td style="color:${dColor(row.status)}">${row.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function dColor(s) {
    if(s==='Critical') return '#ef4444';
    if(s==='Warning') return '#f59e0b';
    return '#10b981';
}

// --- Export Process ---

function startExport() {
    if (filteredData.length === 0) {
        alert("No data to export!");
        return;
    }

    // UI Feedback
    const pArea = document.getElementById('progressArea');
    const pBar = document.getElementById('pFill');
    const pText = document.getElementById('pPct');
    const btn = document.querySelector('.btn-export');
    
    pArea.classList.remove('hidden');
    btn.disabled = true;
    btn.style.opacity = '0.5';

    // Simulate Progress
    let pct = 0;
    const interval = setInterval(() => {
        pct += 10;
        pBar.style.width = pct + '%';
        pText.textContent = pct + '%';

        if(pct >= 100) {
            clearInterval(interval);
            finishExport();
        }
    }, 150);
}

function finishExport() {
    // Reset UI
    setTimeout(() => {
        document.getElementById('progressArea').classList.add('hidden');
        document.getElementById('pFill').style.width = '0%';
        const btn = document.querySelector('.btn-export');
        btn.disabled = false;
        btn.style.opacity = '1';
        
        showToast("Download Started");
    }, 500);

    // Trigger Download
    const format = document.querySelector('input[name="format"]:checked').value;
    downloadFile(format);
    
    // Log History
    addHistoryItem(format);
}

function downloadFile(format) {
    let content = "";
    let mimeType = "text/plain";
    const filename = `airpure_export_${Date.now()}.${format}`;

    if (format === 'csv') {
        const headers = ["Timestamp,Category,Event,Value,Status"];
        const rows = filteredData.map(d => `${d.time},${d.category},${d.event},${d.val},${d.status}`);
        content = headers.concat(rows).join("\n");
        mimeType = "text/csv";
    } else if (format === 'json') {
        content = JSON.stringify(filteredData, null, 2);
        mimeType = "application/json";
    } else {
        // XLS Sim (User needs to accept HTML table)
        content = "Timestamp\tEvent\tValue\n" + filteredData.map(d => `${d.time}\t${d.event}\t${d.val}`).join("\n");
        mimeType = "application/vnd.ms-excel";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function copyToClip() {
    const text = JSON.stringify(filteredData.slice(0, 10)); // Only copy top 10 for demo
    navigator.clipboard.writeText(text).then(() => {
        showToast("Top 10 Records Copied");
    });
}


// --- History Management ---

function addHistoryItem(format) {
    const filters = getFilters();
    const item = {
        id: 'EXP-' + Math.floor(Math.random()*1000),
        format: format.toUpperCase(),
        cat: filters.category.toUpperCase(),
        date: new Date().toLocaleTimeString()
    };
    
    exportHistory.unshift(item);
    if(exportHistory.length > 5) exportHistory.pop();
    
    localStorage.setItem('expHistory', JSON.stringify(exportHistory));
    renderHistory();
}

function loadHistory() {
    const saved = localStorage.getItem('expHistory');
    if (saved) exportHistory = JSON.parse(saved);
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('exportHistory');
    list.innerHTML = '';
    
    if (exportHistory.length === 0) {
        list.innerHTML = '<div class="empty-state">No export history found.</div>';
        return;
    }

    exportHistory.forEach(h => {
        const typeClass = h.format.toLowerCase();
        const div = document.createElement('div');
        div.className = 'h-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center">
                <span class="h-tag ${typeClass}">${h.format}</span>
                <span>${h.cat} Data <span style="opacity:0.5; font-size:0.7em">(${h.id})</span></span>
            </div>
            <div>
                <span class="h-date">${h.date}</span>
                <button class="btn-re" onclick="showToast('Re-downloading...')"><i class="fas fa-download"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

function clearHistory() {
    exportHistory = [];
    localStorage.removeItem('expHistory');
    renderHistory();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}
