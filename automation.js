/* automation.js - Smart Rules Engine */

// State
let rules = [];
let isAutomationEnabled = true;
let isSystemLocked = false;
let simulationInterval = null;

// Mock Sensor Data
let sensors = {
    aqi: 45,
    temp: 24,
    smoke: false,
    gas: false,
    time: '12:00'
};

// Mode Presets
const MODES = {
    'smart-air': [
        { id: 'mode-1', cond: 'aqi', op: '>', val: 100, action: 'purifier_on' },
        { id: 'mode-2', cond: 'aqi', op: '>', val: 200, action: 'purifier_max' }
    ],
    'fire-safety': [
        { id: 'mode-3', cond: 'smoke', op: '=', val: 'detected', action: 'alarm_on' },
        { id: 'mode-4', cond: 'temp', op: '>', val: 50, action: 'alarm_on' }
    ],
    'night-mode': [
        { id: 'mode-5', cond: 'time', op: '>', val: '22:00', action: 'purifier_silent' }
    ],
    'energy-save': [
        { id: 'mode-6', cond: 'aqi', op: '<', val: 50, action: 'purifier_off' }
    ]
};

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    updateUI();
    startSimulation(); // Start background sensor sim

    // Event Listeners
    document.getElementById('masterAutoToggle').addEventListener('change', (e) => {
        isAutomationEnabled = e.target.checked;
        updateStatus();
    });

    // Condition Select Context Logic
    document.getElementById('newCondition').addEventListener('change', updateInputType);
});

// --- Rule Management ---

function loadRules() {
    const saved = localStorage.getItem('autoRules');
    if (saved) {
        rules = JSON.parse(saved);
    } else {
        // Default
        rules = [...MODES['smart-air']];
    }
    renderRules();
}

function renderRules() {
    const list = document.getElementById('rulesList');
    list.innerHTML = '';
    
    rules.forEach((rule, index) => {
        const div = document.createElement('div');
        div.className = 'rule-item';
        div.id = `rule-${index}`;
        div.innerHTML = `
            <div class="rule-desc">
                IF <span>${getLabel(rule.cond)}</span> ${rule.op} <span class="r-val">${rule.val}</span> 
                THEN <span class="r-act">${getLabel(rule.action)}</span>
            </div>
            <button class="btn-del" onclick="deleteRule(${index})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
    
    document.getElementById('ruleCount').textContent = `${rules.length} Rules Active`;
}

function addNewRule() {
    const cond = document.getElementById('newCondition').value;
    const op = document.getElementById('newOperator').value;
    const action = document.getElementById('newAction').value;
    let val = document.getElementById('newThreshold').value;

    // Special handling for smoke/bools
    if (cond === 'smoke' || cond === 'gas') val = 'detected';

    if (!val && val !== 0 && cond !== 'smoke' && cond !== 'gas') {
        alert("Please enter a threshold value");
        return;
    }

    rules.push({ id: `custom-${Date.now()}`, cond, op, val, action });
    renderRules();
    logConsole(`New Rule Added: IF ${cond} ${op} ${val} -> ${action}`, 'system');
}

function deleteRule(index) {
    rules.splice(index, 1);
    renderRules();
}

function clearLogs() {
    document.getElementById('consoleLog').innerHTML = '';
}

function saveRules() {
    localStorage.setItem('autoRules', JSON.stringify(rules));
    showToast();
}

function resetRules() {
    if(confirm("Reset all rules to factory default?")) {
        localStorage.removeItem('autoRules');
        loadRules();
        logConsole("Rules reset to factory defaults", 'system');
    }
}

// --- Logic Engine & Simulator ---

function startSimulation() {
    logConsole("Simulation Engine Started...", 'system');
    
    simulationInterval = setInterval(() => {
        if (!isAutomationEnabled || isSystemLocked) return;

        // 1. Jitter Sensors
        if (sensors.smoke === false) { // Don't clear smoke if manually set
            sensors.aqi = Math.max(0, sensors.aqi + (Math.random() * 10 - 5));
            sensors.temp = Math.max(15, Math.min(40, sensors.temp + (Math.random() * 2 - 1)));
        }
        
        updateSimVisuals();
        evaluateRules();
        
        // Update execution time
        if (Math.random() > 0.8) {
            document.getElementById('lastExecTime').textContent = new Date().toLocaleTimeString();
        }

    }, 2000); // Check every 2s
}

function evaluateRules() {
    rules.forEach((rule, idx) => {
        let triggered = false;
        const currentVal = sensors[rule.cond];
        
        // Simple Logic Eval
        if (rule.cond === 'smoke' || rule.cond === 'gas') {
            triggered = (rule.val === 'detected' && currentVal === true);
        } else {
            // Numeric
            const numVal = parseFloat(rule.val);
            if (rule.op === '>') triggered = currentVal > numVal;
            if (rule.op === '<') triggered = currentVal < numVal;
            if (rule.op === '=') triggered = currentVal == numVal;
        }

        if (triggered) {
            executeAction(rule.action, idx);
        }
    });
}

function executeAction(action, ruleIdx) {
    // Prevent spamming logs - only log if state changes (simulated roughly here)
    // For demo, we just highlight the rule and log occasionally
    const ruleEl = document.getElementById(`rule-${ruleIdx}`);
    if (ruleEl) {
        ruleEl.classList.add('triggered');
        setTimeout(() => ruleEl.classList.remove('triggered'), 1000);
    }
    
    // Log distinct actions
    const msg = `Triggered: ${getLabel(action)}`;
    // Debounce log
    const lastLog = document.querySelector('.log-entry:last-child');
    if (!lastLog || !lastLog.textContent.includes(msg)) {
        logConsole(msg, 'trigger');
    }
}

function simulateEvent(type) {
    if(type === 'high_aqi') {
        sensors.aqi = 250;
        logConsole("SIM: Injected High AQI Spike (250)", 'system');
    }
    if(type === 'fire') {
        sensors.smoke = true;
        sensors.temp = 65;
        document.getElementById('simSmoke').querySelector('.val').textContent = 'DETECTED';
        logConsole("SIM: FIRE EVENT INJECTED", 'alert');
    }
    if(type === 'normal') {
        sensors.aqi = 45;
        sensors.temp = 24;
        sensors.smoke = false;
        document.getElementById('simSmoke').querySelector('.val').textContent = 'NONE';
        logConsole("SIM: Sensors Normalized", 'system');
    }
    updateSimVisuals();
    evaluateRules(); // Immediate check
}

// --- UI Helpers ---

function updateSimVisuals() {
    document.getElementById('simAQI').querySelector('.val').textContent = Math.floor(sensors.aqi);
    document.getElementById('simTemp').querySelector('.val').textContent = Math.floor(sensors.temp) + '°C';
    
    const smokeEl = document.getElementById('simSmoke');
    if (sensors.smoke) {
        smokeEl.classList.add('danger');
        smokeEl.querySelector('.val').textContent = 'DETECTED';
    } else {
        smokeEl.classList.remove('danger');
        smokeEl.querySelector('.val').textContent = 'NONE';
    }
}

function activateMode(modeId, btn) {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    
    // Load preset rules
    rules = [...MODES[modeId]];
    renderRules();
    logConsole(`Mode Switched: ${modeId.replace('-', ' ').toUpperCase()}`, 'system');
    showToast("Mode Activated");
}

function updateInputType() {
    const type = document.getElementById('newCondition').value;
    const inputs = document.getElementById('conditionInputs');
    
    if (type === 'smoke' || type === 'gas') {
        inputs.style.display = 'none'; // Boolean check implies = true
    } else {
        inputs.style.display = 'flex';
    }
}

function updateStatus() {
    const el = document.getElementById('automationStatus');
    if (isAutomationEnabled) {
        el.className = 'status-indicator enabled';
        el.querySelector('.value').textContent = 'ENABLED';
    } else {
        el.className = 'status-indicator disabled';
        el.querySelector('.value').textContent = 'DISABLED';
    }
}

function logConsole(msg, type) {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = `<span>${new Date().toLocaleTimeString()}</span> ${msg}`;
    const consoleEl = document.getElementById('consoleLog');
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function getLabel(key) {
    const map = {
        'aqi': 'AQI', 'temp': 'Temp', 'smoke': 'Smoke', 'gas': 'Gas',
        'purifier_on': 'Purifier ON', 'purifier_max': 'Purifier MAX',
        'purifier_off': 'Purifier OFF', 'alarm_on': 'ALARM ACTIVE',
        'purifier_silent': 'Silent Mode'
    };
    return map[key] || key;
}

function showToast(msg = "Settings Saved") {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}
