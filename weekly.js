// Load saved weekly progress (with safe fallback)
const WEEKLY_TOTAL_TASKS = 10;
const DAILY_LIMIT = 2;

const savedWeeklyProgress = JSON.parse(localStorage.getItem("weeklyProgress") || "null");
const legacyWeeklyCurrent = Number(localStorage.getItem("weeklyCurrent") || 0);
const initialCompleted = Number.isFinite(savedWeeklyProgress?.completed)
    ? savedWeeklyProgress.completed
    : legacyWeeklyCurrent;

function getCurrentDayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const initialByDay = savedWeeklyProgress && typeof savedWeeklyProgress.byDay === "object" && savedWeeklyProgress.byDay
    ? savedWeeklyProgress.byDay
    : {};

let weeklyProgress = {
    completed: Math.max(0, Math.min(WEEKLY_TOTAL_TASKS, Number(initialCompleted) || 0)),
    byDay: initialByDay
};

let weeklyCelebrated = localStorage.getItem("weeklyCelebrated") === "1";

function getCurrentWeekKey() {
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

    return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function applyWeeklyResetIfNeeded() {
    const currentWeekKey = getCurrentWeekKey();
    const storedWeekKey = localStorage.getItem("weeklyWeekKey");

    if (storedWeekKey !== currentWeekKey) {
        weeklyProgress.completed = 0;
        weeklyProgress.byDay = {};
        weeklyCelebrated = false;

        localStorage.setItem("weeklyWeekKey", currentWeekKey);
        localStorage.setItem("weeklyProgress", JSON.stringify(weeklyProgress));
        localStorage.setItem("weeklyCurrent", "0");

        localStorage.removeItem("weeklyCelebrated");
        localStorage.removeItem("weeklyTaskDone");
        localStorage.removeItem("doingWeekly");
        localStorage.removeItem("weeklyLastResultData");
        localStorage.removeItem("weeklyLastResultUrl");
    }
}

function startLiveWeeklyResetWatcher() {
    setInterval(() => {
        const beforeReset = weeklyProgress.completed;
        applyWeeklyResetIfNeeded();

        if (weeklyProgress.completed !== beforeReset) {
            updateProgressUI();
        }
    }, 30000);
}

// DOM
const progressText = document.getElementById("weekly-progress");
const starProgress = document.getElementById("star-progress");
const trophyPopup = document.getElementById("trophy-popup");
const trophy = document.getElementById("trophy");
const weeklyDoneBtn = document.getElementById("weekly-done-btn");
const weeklyCloseWinBtn = document.getElementById("weekly-close-win-btn");
const weeklyModalBackdrop = document.getElementById("weekly-modal-backdrop");
const weeklyResultPanel = document.getElementById("weekly-result-panel");
const weeklyResultText = document.getElementById("weekly-result-text");
const weeklyResultOkBtn = document.getElementById("weekly-result-ok-btn");

function isVisible(el) {
    return Boolean(el) && !el.classList.contains("hidden");
}

function syncWeeklyModalState() {
    const modalVisible = isVisible(trophyPopup) || isVisible(weeklyResultPanel);
    if (weeklyModalBackdrop) {
        weeklyModalBackdrop.classList.toggle("hidden", !modalVisible);
    }
    document.body.classList.toggle("modal-open", modalVisible);
}

function buildWeeklyResultText() {
    const weekKey = localStorage.getItem("weeklyWeekKey") || getCurrentWeekKey();
    return `Done!! You completed ${weeklyProgress.completed}/${WEEKLY_TOTAL_TASKS} tasks in ${weekKey}. Daily limit is ${DAILY_LIMIT} tasks, and next week the challenge resets automatically.`;
}

function openWeeklyResultPanel() {
    if (weeklyResultText) weeklyResultText.innerText = buildWeeklyResultText();
    if (weeklyResultPanel) weeklyResultPanel.classList.remove("hidden");
    syncWeeklyModalState();
}

function closeWeeklyResultPanel() {
    if (weeklyResultPanel) weeklyResultPanel.classList.add("hidden");
    syncWeeklyModalState();
}

// Update UI: weekly progress and trophy separately
function updateProgressUI() {
    const completed = weeklyProgress.completed;
    const dayKey = getCurrentDayKey();
    const todayCount = Math.max(0, Math.min(DAILY_LIMIT, Number(weeklyProgress.byDay?.[dayKey] || 0)));
    
    // Weekly progress text
    if(progressText) progressText.innerText = `Weekly progress: ${completed}/${WEEKLY_TOTAL_TASKS} • Today: ${todayCount}/${DAILY_LIMIT}`;
    
    // Star progress (10 tasks = full 100%)
    if(starProgress) {
        const progressPercent = Math.max(0, Math.min(100, (completed / WEEKLY_TOTAL_TASKS) * 100));
        starProgress.setAttribute("stroke-dasharray", `${progressPercent} 100`);
    }

    // Trophy only when completed = 10
    if(completed === WEEKLY_TOTAL_TASKS) {
        if(!weeklyCelebrated) {
            showTrophy(true);
            weeklyCelebrated = true;
            localStorage.setItem("weeklyCelebrated", "1");
        } else {
            showTrophy(false);
        }
    } else {
        weeklyCelebrated = false;
        localStorage.removeItem("weeklyCelebrated");

        if(trophyPopup) {
            trophyPopup.classList.add("hidden");
            trophyPopup.classList.remove("show");
        }

        closeWeeklyResultPanel();
        syncWeeklyModalState();
    }
}

// Show trophy
function showTrophy(withConfetti) {
    if(trophyPopup) {
        trophyPopup.classList.remove("hidden");
        trophyPopup.classList.add("show");
    }
    syncWeeklyModalState();

    if(withConfetti) {
        burstConfetti();
        setTimeout(burstConfetti, 250);
        setTimeout(burstConfetti, 500);
    }
}

if (weeklyDoneBtn) {
    weeklyDoneBtn.addEventListener("click", () => {
        const latestResultUrl = localStorage.getItem("weeklyLastResultUrl");
        if (latestResultUrl) {
            location.href = latestResultUrl;
            return;
        }
        openWeeklyResultPanel();
    });
}

if (weeklyCloseWinBtn) {
    weeklyCloseWinBtn.addEventListener("click", () => {
        if(trophyPopup) {
            trophyPopup.classList.add("hidden");
            trophyPopup.classList.remove("show");
        }
        syncWeeklyModalState();
    });
}

if (weeklyResultOkBtn) {
    weeklyResultOkBtn.addEventListener("click", () => {
        closeWeeklyResultPanel();
    });
}

if (weeklyModalBackdrop) {
    weeklyModalBackdrop.addEventListener("click", () => {
        if (isVisible(weeklyResultPanel)) {
            closeWeeklyResultPanel();
            return;
        }
        if (isVisible(trophyPopup)) {
            trophyPopup.classList.add("hidden");
            trophyPopup.classList.remove("show");
            syncWeeklyModalState();
        }
    });
}

// Confetti burst from trophy position
function burstConfetti() {
    const sourceRect = trophy?.getBoundingClientRect();
    const originX = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2;
    const originY = sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight / 2;

    for (let i = 0; i < 55; i++) createConfetti(originX, originY);
}

function createConfetti(originX, originY) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");

    const angle = Math.random() * Math.PI * 2;
    const distance = 140 + Math.random() * 220;
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance - (120 + Math.random() * 120);

    confetti.style.setProperty("--dx", `${driftX}px`);
    confetti.style.setProperty("--dy", `${driftY}px`);

    document.body.appendChild(confetti);
    const size = Math.random()*10 + 5;
    confetti.style.width = size + "px";
    confetti.style.height = size + "px";
    confetti.style.left = originX + "px";
    confetti.style.top = originY + "px";
    confetti.style.backgroundColor = ["#ff00cc","#00ff7f","#ffd700","#6a00ff"][Math.floor(Math.random()*4)];
    confetti.style.animationDuration = (Math.random()*0.9+1.6)+"s";
    setTimeout(()=>confetti.remove(),2600);
}

// Start daily challenge
function startWeeklyTask() {
    const dayKey = getCurrentDayKey();
    const todayCount = Math.max(0, Math.min(DAILY_LIMIT, Number(weeklyProgress.byDay?.[dayKey] || 0)));

    if(weeklyProgress.completed >= WEEKLY_TOTAL_TASKS){
        alert("You already completed all 10 tasks this week!");
        return;
    }

    if(todayCount >= DAILY_LIMIT) {
        alert("You already completed 2 tasks today. Come back tomorrow for the next ones!");
        return;
    }

    const modeButtonsWrap = document.getElementById("weekly-mode-buttons");
    const mode = modeButtonsWrap?.dataset.selected || "input";
    const difficultyButtonsWrap = document.getElementById("weekly-difficulty-buttons");
    const operationButtonsWrap = document.getElementById("weekly-operation-buttons");
    const diff = difficultyButtonsWrap?.dataset.selected || "easy";
    const op = operationButtonsWrap?.dataset.selected || "addition";

    localStorage.setItem("doingWeekly","1");
    localStorage.removeItem("weeklyTaskDone");
    location.href = `play.html?mode=${mode}&op=${op}&diff=${diff}&weekly=1`;
}

// Handle return from play.html (increment once after a completed weekly task)
window.addEventListener("load", () => {
    applyWeeklyResetIfNeeded();

    const finishedWeeklyTask = localStorage.getItem("weeklyTaskDone") === "1";
    const cameFromWeeklySession = localStorage.getItem("doingWeekly") === "1";

    if(finishedWeeklyTask && cameFromWeeklySession){
        const dayKey = getCurrentDayKey();
        const todayCount = Math.max(0, Math.min(DAILY_LIMIT, Number(weeklyProgress.byDay?.[dayKey] || 0)));

        if(weeklyProgress.completed < WEEKLY_TOTAL_TASKS && todayCount < DAILY_LIMIT) {
            weeklyProgress.completed++;
            weeklyProgress.byDay[dayKey] = todayCount + 1;
        }

        localStorage.setItem("weeklyWeekKey", getCurrentWeekKey());
        localStorage.setItem("weeklyProgress", JSON.stringify(weeklyProgress));
        localStorage.setItem("weeklyCurrent", String(weeklyProgress.completed));

        localStorage.removeItem("weeklyTaskDone");
        localStorage.removeItem("doingWeekly");

        updateProgressUI();
    } else {
        updateProgressUI();
    }
});

// INITIAL
applyWeeklyResetIfNeeded();
updateProgressUI();
startLiveWeeklyResetWatcher();
syncWeeklyModalState();