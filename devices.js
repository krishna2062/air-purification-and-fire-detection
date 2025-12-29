/* devices.js */

const STATE = {
    masterPower: false,
    autoMode: true,
    fanSpeed: 0,
    fireAlarmActive: false,
    emergencyMode: false
};

// Config
const LONG_PRESS_DURATION = 3000; // ms

document.addEventListener('DOMContentLoaded', () => {
    initAirControls();
    initFireControls();
    initEmergencyControls();
    logAction("SYSTEM", "Control Panel Initialized");
});

/* ================= AIR PURIFICATION ================= */
function initAirControls() {
    const powerToggle = document.getElementById('masterPower');
    const autoToggle = document.getElementById('autoMode');
    const fanSlider = document.getElementById('fanSpeed');
    const fanDisplay = document.getElementById('fanValueDisplay');
    const sliderContainer = document.getElementById('fanSpeedContainer');

    // Power Toggle
    powerToggle.addEventListener('change', (e) => {
        STATE.masterPower = e.target.checked;
        updateAirUI();
        logAction("USER", `Master Power: ${STATE.masterPower ? 'ON' : 'OFF'}`);
    });

    // Auto Mode Toggle
    autoToggle.addEventListener('change', (e) => {
        STATE.autoMode = e.target.checked;
        updateAirUI();
        logAction("USER", `Auto Mode: ${STATE.autoMode ? 'ENABLED' : 'DISABLED'}`);
    });

    // Fan Slider
    fanSlider.addEventListener('input', (e) => {
        STATE.fanSpeed = e.target.value;
        fanDisplay.innerText = `${STATE.fanSpeed}%`;
    });
    fanSlider.addEventListener('change', () => {
        logAction("USER", `Fan Speed set to ${STATE.fanSpeed}%`);
    });

    function updateAirUI() {
        // If Power OFF -> Disable All
        // If Power ON but Auto ON -> Disable Slider
        if(!STATE.masterPower) {
            autoToggle.disabled = true;
            sliderContainer.classList.add('disabled');
            document.getElementById('airStatus').innerText = "OFFLINE";
            document.getElementById('airStatus').style.color = "#888";
        } else {
            autoToggle.disabled = false;
            document.getElementById('airStatus').innerText = "OPERATIONAL";
            document.getElementById('airStatus').style.color = "#00bcd4";
            
            if(STATE.autoMode) {
                sliderContainer.classList.add('disabled');
            } else {
                sliderContainer.classList.remove('disabled');
            }
        }
    }

    // Init state
    updateAirUI();
}

/* ================= FIRE SAFETY ================= */
let pendingAction = null;

function initFireControls() {
    // Modal Confirm Logic
    document.getElementById('modalConfirmBtn').addEventListener('click', () => {
        if(pendingAction) pendingAction();
        closeModal();
    });
}

// Window scope for onclick handlers
window.confirmAction = function(actionType) {
    const modal = document.getElementById('confirmModal');
    const text = document.getElementById('modalText');
    modal.classList.remove('hidden');

    if(actionType === 'activateAlarm') {
        text.innerText = "WARNING: This will activate building-wide sirens and strobes. Confirm?";
        pendingAction = () => triggerFireAlarm();
    } else if (actionType === 'smokeExtraction') {
        text.innerText = "Enable MAX EXHAUST for smoke extraction?";
        pendingAction = () => enableSmokeExtraction();
    }
}

window.closeModal = function() {
    document.getElementById('confirmModal').classList.add('hidden');
    pendingAction = null;
}

function triggerFireAlarm() {
    STATE.fireAlarmActive = true;
    logAction("WARNING", "MANUAL FIRE ALARM TRIGGERED");
    
    // UI Effects
    document.body.style.boxShadow = "inset 0 0 100px rgba(255,0,0,0.5)";
    
    // Safety Lockout
    lockAirControls();
}

function enableSmokeExtraction() {
    logAction("SYSTEM", "Smoke Extraction Vents OPENING...");
    // Simulate API delay
    const btn = document.querySelectorAll('.btn-hazard')[1];
    btn.innerHTML = "<i class'fas fa-spinner fa-spin'></i> ACTIVE";
    setTimeout(() => {
        logAction("SUCCESS", "Extraction System at 100% Capacity");
    }, 1500);
}

function lockAirControls() {
    document.getElementById('airSafetyLock').classList.remove('hidden');
    // Force fans to stop or verify extraction logic
    STATE.masterPower = false;
    document.getElementById('masterPower').checked = false;
    logAction("SAFETY", "Air Purification Locked due to Fire Event");
}

/* ================= EMERGENCY LONG PRESS ================= */
function initEmergencyControls() {
    setupLongPress('btnEmergencyStop', (success) => {
        if(success) performEmergencyShutdown();
    });
}

function setupLongPress(btnId, callback) {
    const btn = document.getElementById(btnId);
    const ring = btn.nextElementSibling.querySelector('.progress-ring__circle');
    const circumference = 2 * Math.PI * 90;
    
    let timer;
    let startTime;
    let animationFrame;

    const reset = () => {
        clearTimeout(timer);
        cancelAnimationFrame(animationFrame);
        ring.style.strokeDashoffset = circumference; // Hide
        btn.style.transform = "scale(1)";
    };

    btn.addEventListener('mousedown', () => {
        startTime = Date.now();
        btn.style.transform = "scale(0.95)";
        
        // Progress Animation
        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
            const offset = circumference - (progress * circumference);
            ring.style.strokeDashoffset = offset;

            if(progress < 1) {
                animationFrame = requestAnimationFrame(updateProgress);
            }
        };
        animationFrame = requestAnimationFrame(updateProgress);

        // Success Timer
        timer = setTimeout(() => {
            callback(true);
            reset();
        }, LONG_PRESS_DURATION);
    });

    btn.addEventListener('mouseup', reset);
    btn.addEventListener('mouseleave', reset);
}

function performEmergencyShutdown() {
    STATE.emergencyMode = true;
    logAction("CRITICAL", "EMERGENCY SHUTDOWN INITIATED");
    
    // Visuals
    document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:black; color:red; font-family:monospace; text-align:center;">
            <i class="fas fa-biohazard fa-spin" style="font-size:5rem; margin-bottom:20px;"></i>
            <h1 style="font-size:3rem; margin:0;">SYSTEM HALTED</h1>
            <p>EMERGENCY PROTOCOL EXECUTED. POWER OFF.</p>
            <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:transparent; border:1px solid red; color:red; cursor:pointer;">SYSTEM REBOOT</button>
        </div>
    `;
}

/* ================= UTILS ================= */
function logAction(actor, message) {
    const consoleDiv = document.getElementById('auditLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="time">[${time}]</span> <strong>${actor}:</strong> ${message}`;
    consoleDiv.prepend(entry);
}
