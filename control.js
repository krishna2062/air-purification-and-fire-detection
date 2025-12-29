/* control.js - System Control Logic */

// State
let config = {
    masterPower: true,
    mode: 'auto',
    fanSpeed: 45,
    filterBoost: false,
    silentMode: false,
    smokeSens: 5,
    tempRise: 8,
    flameEnable: true,
    autoVent: true
};

let systemStatus = 'NORMAL'; // NORMAL, EMERGENCY
let changesPending = 0;
let holdTimer = null;
const HOLD_DURATION = 3000; // 3s for emergency

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    updateUI();
    setupListeners();
});

// --- Core Functions ---

function loadConfig() {
    // Simulate loading from persistent storage
    const saved = localStorage.getItem('sysConfig');
    if (saved) {
        config = { ...config, ...JSON.parse(saved) };
    }
    document.getElementById('lastUpdateTs').textContent = new Date().toLocaleTimeString();
}

function updateUI() {
    // Device Controls
    document.getElementById('masterPower').checked = config.masterPower;
    setActiveMode(config.mode);
    
    const fanSlider = document.getElementById('fanSpeed');
    fanSlider.value = config.fanSpeed;
    document.getElementById('fanSpeedVal').textContent = config.fanSpeed + '%';
    fanSlider.disabled = config.mode === 'auto' || !config.masterPower;
    
    document.getElementById('filterBoost').checked = config.filterBoost;
    document.getElementById('silentMode').checked = config.silentMode;

    // Fire Config
    document.getElementById('smokeSens').value = config.smokeSens;
    document.getElementById('smokeSensVal').textContent = config.smokeSens + '%';
    document.getElementById('tempRise').value = config.tempRise;
    document.getElementById('flameEnable').checked = config.flameEnable;
    document.getElementById('autoVent').checked = config.autoVent;
}

function setupListeners() {
    // Inputs Change Tracking
    const inputs = document.querySelectorAll('input, button.mode-btn');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            trackChange();
            // Immediate UI updates for some controls
            if(input.id === 'masterPower') config.masterPower = input.checked;
            updateCustomLogic(input); 
        });
        
        if (input.type === 'range') {
            input.addEventListener('input', (e) => {
                // Update label immediately
                const valId = e.target.id + 'Val';
                const el = document.getElementById(valId);
                if(el) el.textContent = e.target.value + (e.target.id === 'fanSpeed' ? '%' : '%');
                trackChange();
            });
        }
    });

    // Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            config.mode = e.target.dataset.mode;
            setActiveMode(config.mode);
            trackChange();
            // Re-eval fan slider state
            document.getElementById('fanSpeed').disabled = config.mode === 'auto' || !config.masterPower;
        });
    });
}

function updateCustomLogic(input) {
    if (input.id === 'masterPower') {
        const isOff = !input.checked;
        document.getElementById('fanSpeed').disabled = isOff;
        document.querySelectorAll('.mode-btn').forEach(b => b.disabled = isOff);
    }
}

function setActiveMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`)?.classList.add('active');
}

function trackChange() {
    changesPending++;
    document.getElementById('changeCount').textContent = changesPending > 0 ? changesPending + '*' : '0';
}

function saveConfiguration() {
    // Collect specific values that aren't auto-bound (in a real app, bind everything)
    config.fanSpeed = document.getElementById('fanSpeed').value;
    config.smokeSens = document.getElementById('smokeSens').value;
    config.tempRise = document.getElementById('tempRise').value;
    // ... others mapped in updateUI/setupListeners

    localStorage.setItem('sysConfig', JSON.stringify(config));
    
    // Simulate API call
    const btn = document.querySelector('.btn-footer.primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        changesPending = 0;
        document.getElementById('changeCount').textContent = '0';
        showToast();
        document.getElementById('lastUpdateTs').textContent = new Date().toLocaleTimeString();
    }, 800);
}

function updateConfig(key) {
    // For single set buttons like Temp Rise
    trackChange();
}


// --- Emergency Logic ---

function startHold(btn) {
    if(systemStatus === 'EMERGENCY') return; // Already triggered

    btn.parentNode.classList.add('active-hold');
    holdTimer = setTimeout(() => {
        triggerEmergencyShutdown();
    }, HOLD_DURATION);
}

function endHold(btn) {
    if (holdTimer) clearTimeout(holdTimer);
    btn.parentNode.classList.remove('active-hold');
}

function triggerEmergencyShutdown() {
    systemStatus = 'EMERGENCY';
    
    // Lock UI
    document.querySelector('.control-grid').classList.add('emergency-lock'); // Need CSS for this if desired
    
    // Visuals
    document.getElementById('systemModeIndicator').className = 'status-indicator emergency';
    document.getElementById('systemModeIndicator').querySelector('.mode-value').textContent = 'EMERGENCY STOP';
    
    // Disable controls
    document.getElementById('masterPower').checked = false;
    document.getElementById('masterPower').disabled = true;
    
    alert("⚠ EMERGENCY SHUTDOWN TRIGGERED ⚠\n\n- Power Cut to Air Systems\n- Fire Doors Closing\n- Admin Notation Logged");
}

function resetSystem() {
    if (systemStatus !== 'EMERGENCY') return;
    
    if(confirm("Confirm: Reset System to Normal Operation?")) {
        systemStatus = 'NORMAL';
        document.getElementById('systemModeIndicator').className = 'status-indicator normal';
        document.getElementById('systemModeIndicator').querySelector('.mode-value').textContent = 'NORMAL OPERATION';
        
        document.getElementById('masterPower').disabled = false;
        document.getElementById('masterPower').checked = true;
    }
}

function triggerEvacuation() {
    showConfirm("INITIATE BUILDING EVACUATION?\nThis will sound all alarms and contact emergency services.", () => {
        alert("EVACUATION SIGNAL SENT. ALARMS ACTIVATED.");
    });
}

function testAlarm() {
    alert("TESTING ALARM SYSTEMS...\n(Beep Beep Beep)");
}

// --- Utils ---

function showToast() {
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function showConfirm(msg, callback) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmMsg').innerText = msg;
    modal.classList.add('active');
    
    const confirmBtn = document.getElementById('confirmBtn');
    // Remove old listeners
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    
    newBtn.addEventListener('click', () => {
        callback();
        closeConfirm();
    });
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
}

function addRule() {
    alert("Rule Editor Wizard would open here.\n(Feature pending backend integration)");
}
