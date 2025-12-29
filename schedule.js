/* schedule.js - Task Scheduler System */

// State
let tasks = [];
let isSchedulerActive = true;
let simMode = false;
let simTimeOffset = 0; // ms to add to real time
let clockInterval;
let checkInterval;

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    renderTimeline();
    
    // Start Clock & Checker
    startClock();
    checkInterval = setInterval(checkSchedule, 1000);

    // Initial log
    logConsole("Scheduler System Initialized.", 'sys');
});

// --- Core Task Management ---

function loadTasks() {
    const saved = localStorage.getItem('schedTasks');
    if (saved) {
        tasks = JSON.parse(saved);
        // Fix date objects if needed (stored as strings)
    } else {
        // Defaults
        tasks = [
            { id: 't1', name: 'Morning Purge', device: 'fan', action: 'on', time: '08:00', repeat: 'daily', priority: 'low' },
            { id: 't2', name: 'Night Silent Mode', device: 'purifier', action: 'silent', time: '22:00', repeat: 'daily', priority: 'high' }
        ];
    }
}

function addTask() {
    const name = document.getElementById('taskName').value;
    const device = document.getElementById('taskDevice').value;
    const action = document.getElementById('taskAction').value;
    const time = document.getElementById('taskTime').value;
    const repeat = document.getElementById('taskRepeat').value;
    const priority = document.querySelector('input[name="priority"]:checked').value;

    if (!name || !time) {
        alert("Please enter a task name and time.");
        return;
    }

    // Safety Constraint
    if (device === 'alarm' && action === 'off') {
        alert("SAFETY VIOLATION: Scheduling 'Fire Alarm OFF' is prohibited.");
        logConsole("Blocked unsafe task creation: Alarm OFF", 'block');
        return;
    }

    const newTask = {
        id: 'tsk-' + Date.now(),
        name, device, action, time, repeat, priority,
        lastRun: null
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    renderTimeline();
    showToast("Task Scheduled");
    logConsole(`Scheduled: ${name} at ${time}`, 'sys');
}

function deleteTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if(idx === -1) return;
    
    // Safety Lock
    if (tasks[idx].device === 'alarm' || tasks[idx].priority === 'high') {
        if(!confirm("Warning: Deleting a CRITICAL or SAFETY task. Proceed?")) return;
    }

    tasks.splice(idx, 1);
    saveTasks();
    renderTasks();
    renderTimeline();
}

function saveTasks() {
    localStorage.setItem('schedTasks', JSON.stringify(tasks));
}

function pauseAll() {
    isSchedulerActive = !isSchedulerActive;
    const ind = document.getElementById('schedStatus');
    if(!isSchedulerActive) {
        ind.className = 'status-indicator paused';
        ind.querySelector('.value').textContent = 'PAUSED';
        logConsole("Scheduler Paused by User", 'sys');
    } else {
        ind.className = 'status-indicator active';
        ind.querySelector('.value').textContent = 'ACTIVE';
        logConsole("Scheduler Resumed", 'sys');
    }
}

// --- Rendering ---

function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    
    tasks.sort((a,b) => a.time.localeCompare(b.time));

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-card ${task.device === 'alarm' ? 'fire' : ''}`;
        div.innerHTML = `
            <div class="task-info">
                <h4>${task.name} <span style="font-size:0.7em; opacity:0.6">${task.repeat.toUpperCase()}</span></h4>
                <p>${capitalize(task.device)}: ${capitalize(task.action)}</p>
            </div>
            <div class="task-meta">
                <span class="task-time">${task.time}</span>
                <button class="btn-del" onclick="deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('taskCount').textContent = tasks.length;
}

function renderTimeline() {
    const track = document.getElementById('timelineTrack');
    // Clear old markers (keep the current-time-line)
    const markers = track.querySelectorAll('.task-marker');
    markers.forEach(m => m.remove());

    tasks.forEach(task => {
        const [h, m] = task.time.split(':').map(Number);
        const pct = ((h * 60 + m) / 1440) * 100;
        
        const mark = document.createElement('div');
        mark.className = `task-marker ${task.device === 'alarm' ? 'fire' : ''}`;
        mark.style.left = `${pct}%`;
        mark.title = `${task.time} - ${task.name}`;
        track.appendChild(mark);
    });
}

// --- Engine ---

function startClock() {
    updateClock(); // Init
    clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
    const now = getSimulatedTime();
    const timeStr = now.toLocaleTimeString('en-GB', {hour12: false});
    document.getElementById('liveTime').textContent = timeStr;
    document.getElementById('liveDate').textContent = now.toISOString().split('T')[0];

    // Update timeline position
    const mins = now.getHours() * 60 + now.getMinutes();
    const pct = (mins / 1440) * 100;
    document.getElementById('currentTimeLine').style.left = `${pct}%`;
}

function checkSchedule() {
    if(!isSchedulerActive) return;

    const now = getSimulatedTime();
    const currentHM = now.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
    
    // Check against last run to prevent duplicate firing in same minute
    const lastCheckKey = 'lastCheck_' + currentHM;
    if (sessionStorage.getItem(lastCheckKey)) return; 
    
    tasks.forEach(task => {
        if (task.time === currentHM) {
            executeTask(task);
        }
    });

    sessionStorage.setItem(lastCheckKey, 'true');
}

function executeTask(task) {
    logConsole(`EXECUTING: ${task.name} (${task.device} -> ${task.action})`, 'exec');
    
    // Visual feedback
    showToast(`Task Executed: ${task.name}`);
    
    // In a real app, send API command here
}

// --- Simulation ---

function getSimulatedTime() {
    return new Date(Date.now() + simTimeOffset);
}

function toggleSim() {
    if(!simMode) {
        simMode = true;
        simTimeOffset += 3600000; // Add 1 hour
        updateClock();
        logConsole("SIM: Skipped forward 1 hour", 'sys');
        // Re-check schedule immediately for the skipped time? (Simplified: no, just next loop)
    } else {
        // Keep adding
        simTimeOffset += 3600000;
        updateClock();
        logConsole("SIM: Skipped +1 hour", 'sys');
    }
}

// --- Utils ---

function logConsole(msg, type) {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = `<span>${getSimulatedTime().toLocaleTimeString()}</span> ${msg}`;
    const consoleEl = document.getElementById('execLog');
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function saveToMemory() {
    saveTasks();
    alert("Schedules exported to system memory.");
}
