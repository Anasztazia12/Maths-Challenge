// URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode") || "input";        // input or multiple
const op = urlParams.get("op") || "mixed";            // addition, subtraction, multiplication, division, mixed
const diff = urlParams.get("diff") || "easy";        // easy, medium, hard
const tablesParam = urlParams.get("tables") || "";
const isWeekly = urlParams.get("weekly") === "1";
const showWeeklyResult = urlParams.get("showWeeklyResult") === "1";
const isTimedMode = mode === "timed";
const QUESTION_TIME_SECONDS = 20;

const selectedTables = tablesParam
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((num) => Number.isInteger(num) && num >= 1 && num <= 12);

function randomFromTables() {
    if (selectedTables.length === 0) return rand(12);
    const index = Math.floor(Math.random() * selectedTables.length);
    return selectedTables[index];
}

// DOM elements
const questionEl = document.getElementById("question");
const counterEl = document.getElementById("counter");
const timerWrapEl = document.getElementById("timer-wrap");
const timerLabelEl = document.getElementById("timer-label");
const timerBarEl = document.getElementById("timer-bar");
const inputContainer = document.getElementById("input-container");
const multipleContainer = document.getElementById("multiple-container");
const answerInput = document.getElementById("answer-input");
const choiceButtons = document.querySelectorAll(".choice-btn");
const okBtn = document.getElementById("ok-btn");
const quizClearBtn = document.getElementById("quiz-clear-btn");
const quizSubmitBtn = document.getElementById("quiz-submit-btn");
const endScreen = document.getElementById("end-screen");
const resultSummaryEl = document.getElementById("result-summary");
const resultListEl = document.getElementById("result-list");
const resultBadgeEl = document.getElementById("result-badge");
const playAgainBtn = document.getElementById("play-again-btn");
const backHomeBtn = document.getElementById("back-home-btn");
const studentNameInput = document.getElementById("student-name");
const saveResultBtn = document.getElementById("save-result-btn");
const printResultBtn = document.getElementById("print-result-btn");
const saveStatusEl = document.getElementById("save-status");
const viewCertificateBtn = document.getElementById("view-certificate-btn");
const closeCertificateBtn = document.getElementById("close-certificate-btn");
const printCertificateBtn = document.getElementById("print-certificate-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const certificatePreviewEl = document.getElementById("certificate-preview");
const certificateNameEl = document.getElementById("certificate-name");
const certificateHighlightEl = document.getElementById("certificate-highlight");
const certificateDateEl = document.getElementById("certificate-date");
const certificateResultEl = document.getElementById("certificate-result");
const certificateBadgeEl = document.getElementById("certificate-badge");
const certificateOperationEl = document.getElementById("certificate-operation");
const certificateDifficultyEl = document.getElementById("certificate-difficulty");
const certificateModeEl = document.getElementById("certificate-mode");
const certificateTableInfoEl = document.getElementById("certificate-table-info");

const badgeGoldChip = document.getElementById("badge-gold-chip");
const badgeSilverChip = document.getElementById("badge-silver-chip");
const badgeBronzeChip = document.getElementById("badge-bronze-chip");
const badgePracticeChip = document.getElementById("badge-practice-chip");

let lastResultData = null;

function getCurrentDateLabel() {
    return new Date().toLocaleDateString();
}

function getOperationLabel(value) {
    if (value === "addition") return "Addition";
    if (value === "subtraction") return "Subtraction";
    if (value === "multiplication") return "Multiplication";
    if (value === "division") return "Division";
    return "Mixed (Addition / Subtraction / Multiplication / Division)";
}

function getDifficultyLabel(value) {
    if (value === "easy") return "Easy";
    if (value === "medium") return "Medium";
    if (value === "hard") return "Hard";
    return "Easy";
}

function getModeLabel(value) {
    if (value === "multiple") return "Multiple Choice";
    if (value === "timed") return "Timed (20s / question)";
    return "Type Answer";
}

function stopQuestionTimer() {
    if (questionTimerId) {
        clearInterval(questionTimerId);
        questionTimerId = null;
    }
    timedTickLastSecond = null;
}

function updateTimerUi(msLeft) {
    if (!timerWrapEl || !timerLabelEl || !timerBarEl) return;

    const full = QUESTION_TIME_SECONDS * 1000;
    const clamped = Math.max(0, Math.min(full, msLeft));
    const ratio = clamped / full;
    const secondsLeft = Math.ceil(clamped / 1000);

    timerLabelEl.innerText = `Time left: ${secondsLeft}s`;
    timerBarEl.style.width = `${Math.max(0, ratio * 100)}%`;
    timerBarEl.classList.remove("warn", "danger");

    if (ratio <= 0.25) {
        timerBarEl.classList.add("danger");
    } else if (ratio <= 0.55) {
        timerBarEl.classList.add("warn");
    }
}

function handleTimedOutQuestion() {
    stopQuestionTimer();

    questionResults.push({
        index: currentQuestion,
        expression: currentExpression,
        correctAnswer,
        userAnswerLabel: "Time's up",
        isCorrect: false
    });

    if (wrongSound) {
        wrongSound.currentTime = 0;
        wrongSound.play();
    }

    if (answerInput) answerInput.value = "";

    if (currentQuestion < 20) {
        generateQuestion();
    } else {
        showEndScreen();
    }
}

function startQuestionTimer() {
    if (!isTimedMode) return;

    stopQuestionTimer();
    timedTickLastSecond = null;
    questionTimeRemainingMs = QUESTION_TIME_SECONDS * 1000;
    questionTimerExpectedEnd = Date.now() + questionTimeRemainingMs;
    updateTimerUi(questionTimeRemainingMs);

    questionTimerId = setInterval(() => {
        questionTimeRemainingMs = questionTimerExpectedEnd - Date.now();
        const secondsLeft = Math.ceil(questionTimeRemainingMs / 1000);

        if (secondsLeft <= 5 && secondsLeft >= 1 && timedTickLastSecond !== secondsLeft) {
            timedTickLastSecond = secondsLeft;
            playTimedTickSound();
        }

        if (questionTimeRemainingMs <= 0) {
            updateTimerUi(0);
            handleTimedOutQuestion();
            return;
        }

        updateTimerUi(questionTimeRemainingMs);
    }, 100);
}

function getTableInfoLabel() {
    if (op !== "multiplication" && op !== "division") {
        return "Table: Mix operations";
    }

    if (selectedTables.length === 0) return "Table: 1x-12x";

    const sorted = [...selectedTables].sort((a, b) => a - b);
    if (sorted.length === 1) return `Table: ${sorted[0]}x`;
    if (sorted.length === 12) return "Table: 1x-12x";
    return `Tables: ${sorted.map((num) => `${num}x`).join(", ")}`;
}

function getCertificateHeadline(correctCount, totalCount, rating) {
    if (correctCount === totalCount && totalCount > 0) {
        return `Great result: ${correctCount}/${totalCount}`;
    }
    return `${rating} Result: ${correctCount}/${totalCount}`;
}

function addArcadeCoinsFromQuiz(correctCount) {
    const current = Math.max(0, Number(localStorage.getItem("arcadeCoins") || 0));
    const gained = Math.max(0, Number(correctCount) || 0);
    localStorage.setItem("arcadeCoins", String(current + gained));
}

// Sounds
const correctSound = document.getElementById("correct-sound");
const wrongSound = document.getElementById("wrong-sound");
const timedTickAudioCtx = window.AudioContext ? new AudioContext() : null;

let quizAudioUnlocked = false;

function unlockQuizAudio() {
    if (quizAudioUnlocked) return;
    quizAudioUnlocked = true;

    [correctSound, wrongSound].forEach((sound) => {
        if (!sound) return;
        sound.volume = 0;
        const playPromise = sound.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                    sound.volume = 1;
                })
                .catch(() => {
                    sound.volume = 1;
                });
        } else {
            sound.volume = 1;
        }
    });

    if (timedTickAudioCtx && timedTickAudioCtx.state === "suspended") {
        timedTickAudioCtx.resume();
    }
}

function playTimedTickSound() {
    if (!timedTickAudioCtx) return;
    if (timedTickAudioCtx.state === "suspended") {
        timedTickAudioCtx.resume();
    }

    const oscillator = timedTickAudioCtx.createOscillator();
    const gain = timedTickAudioCtx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 920;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(timedTickAudioCtx.destination);

    const now = timedTickAudioCtx.currentTime;
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
}

// State
let currentQuestion = 0;  // Starting question
let correctAnswer = 0;
let currentExpression = "";
const questionResults = [];
let questionTimerId = null;
let questionTimeRemainingMs = 0;
let questionTimerExpectedEnd = 0;
let timedTickLastSecond = null;

function getResultRating(correctCount, totalCount) {
    if (correctCount === totalCount && totalCount > 0) return "Excellent!";
    if (correctCount >= 18) return "Great!";
    if (correctCount >= 14) return "Well done!";
    if (correctCount >= 10) return "Not bad!";
    return "Keep practicing!";
}

function getBadgeLevel(correctCount, totalCount) {
    if (correctCount === totalCount && totalCount > 0) return { label: "Gold Badge", className: "badge-gold" };
    if (correctCount >= 16) return { label: "Silver Badge", className: "badge-silver" };
    if (correctCount >= 10) return { label: "Bronze Badge", className: "badge-bronze" };
    return { label: "Practice Badge", className: "badge-practice" };
}

function sanitizeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateBadgeShelf(activeBadgeClass) {
    const chips = [badgeGoldChip, badgeSilverChip, badgeBronzeChip, badgePracticeChip];
    chips.forEach((chip) => chip?.classList.remove("badge-active"));

    if (activeBadgeClass === "badge-gold") badgeGoldChip?.classList.add("badge-active");
    if (activeBadgeClass === "badge-silver") badgeSilverChip?.classList.add("badge-active");
    if (activeBadgeClass === "badge-bronze") badgeBronzeChip?.classList.add("badge-active");
    if (activeBadgeClass === "badge-practice") badgePracticeChip?.classList.add("badge-active");
}

function refreshCertificatePreview() {
    if (!lastResultData) return;

    const studentName = (studentNameInput?.value || lastResultData.studentName || "Player").trim() || "Player";
    const dateLabel = getCurrentDateLabel();

    if (certificateNameEl) certificateNameEl.innerText = studentName;
    if (certificateHighlightEl) certificateHighlightEl.innerText = lastResultData.resultHeadline;
    if (certificateDateEl) certificateDateEl.innerText = dateLabel;
    if (certificateResultEl) certificateResultEl.innerText = `${lastResultData.correctCount}/${lastResultData.total}`;
    if (certificateBadgeEl) certificateBadgeEl.innerText = lastResultData.badge.label;
    if (certificateOperationEl) certificateOperationEl.innerText = lastResultData.operationLabel;
    if (certificateDifficultyEl) certificateDifficultyEl.innerText = lastResultData.difficultyLabel;
    if (certificateModeEl) certificateModeEl.innerText = lastResultData.modeLabel;
    if (certificateTableInfoEl) certificateTableInfoEl.innerText = lastResultData.tableInfoLabel;

    lastResultData.studentName = studentName;
    lastResultData.dateLabel = dateLabel;
}

function setSaveStatus(message, isError = false) {
    if (!saveStatusEl) return;
    saveStatusEl.innerText = message || "";
    saveStatusEl.classList.toggle("save-status-error", Boolean(isError));
}

function getBadgeStyle(badgeClassName) {
    if (badgeClassName === "badge-gold") {
        return {
            background: "linear-gradient(90deg,#facc15,#f59e0b)",
            color: "#111827"
        };
    }
    if (badgeClassName === "badge-silver") {
        return {
            background: "linear-gradient(90deg,#cbd5e1,#94a3b8)",
            color: "#0f172a"
        };
    }
    if (badgeClassName === "badge-bronze") {
        return {
            background: "linear-gradient(90deg,#d97706,#92400e)",
            color: "#ffffff"
        };
    }
    return {
        background: "linear-gradient(90deg,#7c3aed,#ec4899)",
        color: "#ffffff"
    };
}

function buildCertificateHtml(data) {
    const badgeStyle = getBadgeStyle(data.badge.className);

    return `
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificate</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc;">
            <div style="position:relative;overflow:hidden;max-width:760px;margin:0 auto;border-radius:20px;padding:18px 16px 20px;background:linear-gradient(160deg,#ffffff,#eef2ff);border:4px solid #6366f1;box-shadow:0 10px 30px rgba(15,23,42,0.15);color:#0f172a;">
                <div style="position:absolute;left:14px;top:20px;width:14px;height:14px;border-radius:50%;background:#ec4899;opacity:.45;"></div>
                <div style="position:absolute;right:18px;top:60px;width:14px;height:14px;border-radius:50%;background:#06b6d4;opacity:.45;"></div>
                <div style="position:absolute;right:22px;bottom:22px;width:14px;height:14px;border-radius:3px;transform:rotate(18deg);background:#f97316;opacity:.45;"></div>
                <div style="position:absolute;left:22px;bottom:32px;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:14px solid #8b5cf6;opacity:.45;"></div>
                <div style="position:absolute;left:24px;top:92px;font-size:18px;font-weight:900;color:#f43f5e;opacity:.55;">7</div>
                <div style="position:absolute;right:32px;top:118px;font-size:18px;font-weight:900;color:#0ea5e9;opacity:.55;">3</div>
                <div style="position:absolute;left:50%;top:8px;transform:translateX(-50%);font-size:18px;font-weight:900;color:#f59e0b;opacity:.55;">9</div>
                <div style="position:absolute;left:12px;bottom:62px;font-size:18px;font-weight:900;color:#10b981;opacity:.55;">12</div>
                <div style="position:absolute;right:42px;bottom:62px;font-size:18px;font-weight:900;color:#6366f1;opacity:.55;">5</div>

                <div style="font-size:16px;font-weight:800;text-align:center;color:#3730a3;margin-bottom:10px;">Math Game Challenge Website Badge / Certificate</div>
                <div style="font-size:36px;font-weight:900;text-align:center;color:#1d4ed8;line-height:1.1;">${sanitizeHtml(data.studentName)}</div>
                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;text-align:center;color:#64748b;margin-top:2px;">Name</div>

                <div style="margin:10px auto 12px;width:fit-content;max-width:100%;padding:7px 12px;border-radius:999px;font-size:14px;font-weight:800;color:#0f172a;background:linear-gradient(90deg,#fef08a,#facc15);border:1px solid rgba(161,98,7,0.35);">${sanitizeHtml(data.resultHeadline)}</div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;position:relative;z-index:1;">
                    <div style="font-size:15px;padding:8px 10px;border-radius:10px;background:rgba(241,245,249,.8);border:1px solid rgba(148,163,184,.32);"><strong>Date:</strong> ${sanitizeHtml(data.dateLabel)}</div>
                    <div style="font-size:15px;padding:8px 10px;border-radius:10px;background:rgba(241,245,249,.8);border:1px solid rgba(148,163,184,.32);"><strong>Result:</strong> ${data.correctCount}/${data.total}</div>
                    <div style="font-size:15px;padding:8px 10px;border-radius:10px;background:rgba(241,245,249,.8);border:1px solid rgba(148,163,184,.32);"><strong>Badge:</strong> <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-weight:800;border:1px solid rgba(15,23,42,0.15);background:${badgeStyle.background};color:${badgeStyle.color};">${sanitizeHtml(data.badge.label)}</span></div>
                    <div style="font-size:15px;padding:8px 10px;border-radius:10px;background:rgba(241,245,249,.8);border:1px solid rgba(148,163,184,.32);"><strong>Operation:</strong> ${sanitizeHtml(data.operationLabel)}</div>
                    <div style="font-size:15px;padding:8px 10px;border-radius:10px;background:rgba(241,245,249,.8);border:1px solid rgba(148,163,184,.32);"><strong>Level:</strong> ${sanitizeHtml(data.difficultyLabel)}</div>
                    <div style="font-size:15px;padding:8px 10px;border-radius:10px;background:rgba(241,245,249,.8);border:1px solid rgba(148,163,184,.32);"><strong>Mode:</strong> ${sanitizeHtml(data.modeLabel)}</div>
                </div>

                <div style="margin-top:10px;font-size:13px;font-weight:700;text-align:center;color:#475569;">${sanitizeHtml(data.tableInfoLabel)}</div>
                <p style="margin-top:16px;font-size:12px;color:#334155;text-align:center;">© Anasztázia Karalyos-Kecskés 2026 • All rights reserved</p>
            </div>
        </body>
        </html>
    `;
}

// Difficulty levels
const ranges = {
    easy: 20,
    medium: 60,
    hard: 150
};

const mixedRanges = {
    easy: 100,
    medium: 500,
    hard: 10000
};

const mixedTableSets = {
    easy: [1, 2, 3],
    medium: [1, 2, 3, 5, 10, 11],
    hard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
};

function randomFromSet(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random number generator
function rand(max) {
    return Math.floor(Math.random() * max) + 1;
}

// Generate new question
function generateQuestion() {
    if (currentQuestion >= 20) {
        showEndScreen();
        return;
    }

    currentQuestion++;
    counterEl.innerText = `Question ${currentQuestion} / 20`;

    let a = rand(ranges[diff]);
    let b = rand(ranges[diff]);

    switch (op) {
        case "addition":
            correctAnswer = a + b;
            currentExpression = `${a} + ${b}`;
            questionEl.innerText = `${currentExpression} = ?`;
            break;
        case "subtraction":
            if (a < b) [a, b] = [b, a];
            correctAnswer = a - b;
            currentExpression = `${a} - ${b}`;
            questionEl.innerText = `${currentExpression} = ?`;
            break;
        case "multiplication":
            a = randomFromTables();
            b = rand(12);
            correctAnswer = a * b;
            currentExpression = `${a} × ${b}`;
            questionEl.innerText = `${currentExpression} = ?`;
            break;
        case "division":
            b = randomFromTables();
            a = rand(12);
            correctAnswer = a;
            let product = a * b;
            currentExpression = `${product} ÷ ${b}`;
            questionEl.innerText = `${currentExpression} = ?`;
            break;
        case "mixed":
            const mixedLimit = mixedRanges[diff] || mixedRanges.easy;
            const mixedTables = mixedTableSets[diff] || mixedTableSets.easy;
            const mixedMin = 0;
            a = randBetween(mixedMin, mixedLimit);
            b = randBetween(mixedMin, mixedLimit);
            const ops = ["+", "-", "×", "÷"];
            const pick = ops[Math.floor(Math.random() * 4)];
            if (pick === "+") {
                correctAnswer = a + b;
                currentExpression = `${a} + ${b}`;
            }
            if (pick === "-") {
                if (a < b) [a, b] = [b, a];
                correctAnswer = a - b;
                currentExpression = `${a} - ${b}`;
            }
            if (pick === "×") {
                a = randomFromSet(mixedTables);
                b = randomFromSet(mixedTables);
                correctAnswer = a * b;
                currentExpression = `${a} × ${b}`;
            }
            if (pick === "÷") {
                b = randomFromSet(mixedTables);
                const result = randomFromSet(mixedTables);
                correctAnswer = result;
                const product2 = result * b;
                currentExpression = `${product2} ÷ ${b}`;
            }
            questionEl.innerText = `${currentExpression} = ?`;
            break;
    }

    if (mode === "multiple") setupMultipleChoice();
    if (isTimedMode) startQuestionTimer();
}

// Multiple choice setup
function setupMultipleChoice() {
    let answers = [correctAnswer];
    while (answers.length < 3) {
        let wrong = correctAnswer + Math.floor(Math.random() * 10) - 5;
        if (wrong !== correctAnswer && wrong >= 0) answers.push(wrong);
    }
    answers.sort(() => Math.random() - 0.5);

    choiceButtons.forEach((btn, i) => {
        btn.innerText = answers[i];
        btn.onclick = () => checkAnswer(answers[i]);
    });
}

// Check answer
function checkAnswer(value) {
    const usesInputMode = mode === "input" || isTimedMode;
    const rawInput = usesInputMode ? answerInput.value.trim() : String(value);
    if (usesInputMode && rawInput === "") return;
    if (usesInputMode) value = Number(rawInput);

    stopQuestionTimer();

    const isCorrect = value === correctAnswer;
    const answerLabel = rawInput === "" ? "(no answer)" : rawInput;

    questionResults.push({
        index: currentQuestion,
        expression: currentExpression,
        correctAnswer,
        userAnswerLabel: answerLabel,
        isCorrect
    });

    if (isCorrect) correctSound.play();
    else wrongSound.play();

    answerInput.value = "";

    // Next question or end
    if (currentQuestion < 20) {
        generateQuestion();
    } else {
        showEndScreen();
    }
}

function renderEndScreenFromData(data, playAgainTarget, backTarget) {
    if (!data || !endScreen) return;

    if (counterEl) counterEl.style.display = "none";
    if (timerWrapEl) timerWrapEl.classList.add("hidden");
    if (questionEl) questionEl.style.display = "none";
    if (inputContainer) inputContainer.style.display = "none";
    if (multipleContainer) multipleContainer.style.display = "none";

    const endTitle = endScreen.querySelector("h2");
    const endText = endScreen.querySelector("p");
    const correctCount = Number(data.correctCount) || 0;
    const total = Number(data.total) || 0;
    const rating = data.rating || getResultRating(correctCount, total);
    const badge = data.badge || getBadgeLevel(correctCount, total);
    const rows = Array.isArray(data.results) ? data.results : [];

    if (endTitle) endTitle.innerText = isTimedMode ? "Time's up!" : "Done!";
    if (endText) {
        endText.innerText = isTimedMode
            ? `Time's up! You finished ${total}/20 questions. Result: ${correctCount}/${total}.`
            : `You finished all ${total} questions. Done ${correctCount}/${total}.`;
    }
    if (resultSummaryEl) {
        resultSummaryEl.innerText = `Your result: ${correctCount}/${total} • Correct answers: ${correctCount}/${total} • ${rating}`;
    }
    if (resultBadgeEl) {
        resultBadgeEl.innerText = badge.label || "Practice Badge";
        resultBadgeEl.className = `result-badge ${badge.className || "badge-practice"}`;
    }

    updateBadgeShelf(badge.className || "badge-practice");
    refreshCertificatePreview();

    if (resultListEl) {
        const resultRows = rows.map((item) => {
            const line = `${item.index}. ${item.expression} = ${item.correctAnswer}`;
            const answerText = item.isCorrect
                ? "✓ Correct"
                : `✗ Your answer: ${item.userAnswerLabel}`;

            return `<div class="result-row ${item.isCorrect ? "result-correct" : "result-wrong"}">
                <span>${line}</span>
                <strong>${answerText}</strong>
            </div>`;
        });

        resultListEl.innerHTML = resultRows.join("");
    }

    if (playAgainBtn) playAgainBtn.setAttribute("onclick", `location.href='${playAgainTarget}'`);
    if (backHomeBtn) {
        backHomeBtn.setAttribute("onclick", `location.href='${backTarget}'`);
        backHomeBtn.innerText = isWeekly ? "Back to Weekly" : "Back to Home";
    }

    endScreen.classList.remove("hidden");
}

function loadSavedWeeklyResultData() {
    try {
        const raw = localStorage.getItem("weeklyLastResultData");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.results)) return null;
        return parsed;
    } catch {
        return null;
    }
}

// End screen
function showEndScreen() {
    stopQuestionTimer();

    if (isWeekly) {
        localStorage.setItem("weeklyTaskDone", "1");
    }

    const tablesQuery = tablesParam ? `&tables=${encodeURIComponent(tablesParam)}` : "";
    const replayQuery = `mode=${mode || "input"}&op=${op || "mixed"}&diff=${diff || "easy"}${tablesQuery}`;
    const playAgainTarget = isWeekly ? "weekly.html" : `play.html?${replayQuery}`;
    const backTarget = isWeekly ? "weekly.html" : "index.html";

    if (counterEl) counterEl.style.display = "none";
    if (timerWrapEl) timerWrapEl.classList.add("hidden");
    if (questionEl) questionEl.style.display = "none";
    if (inputContainer) inputContainer.style.display = "none";
    if (multipleContainer) multipleContainer.style.display = "none";

    if (endScreen) {
        const correctCount = questionResults.filter((item) => item.isCorrect).length;
        const total = questionResults.length;
        const rating = getResultRating(correctCount, total);
        const badge = getBadgeLevel(correctCount, total);
        const studentName = studentNameInput?.value?.trim() || "Player";

        addArcadeCoinsFromQuiz(correctCount);

        lastResultData = {
            studentName,
            correctCount,
            total,
            rating,
            badge,
            resultHeadline: getCertificateHeadline(correctCount, total, rating),
            operationLabel: getOperationLabel(op),
            difficultyLabel: getDifficultyLabel(diff),
            modeLabel: getModeLabel(mode),
            tableInfoLabel: getTableInfoLabel(),
            dateLabel: getCurrentDateLabel(),
            results: [...questionResults]
        };

        if (isWeekly) {
            const weeklyResultUrl = `play.html?${replayQuery}&weekly=1&showWeeklyResult=1`;
            localStorage.setItem("weeklyLastResultData", JSON.stringify(lastResultData));
            localStorage.setItem("weeklyLastResultUrl", weeklyResultUrl);
        }

        renderEndScreenFromData(lastResultData, playAgainTarget, backTarget);
    }
}

function buildResultText(data) {
    const lines = [
        `Name: ${data.studentName}`,
        `Date: ${data.dateLabel}`,
        `Result: ${data.correctCount}/${data.total}`,
        `Operation: ${data.operationLabel}`,
        `Level: ${data.difficultyLabel}`,
        `Mode: ${data.modeLabel}`,
        `${data.tableInfoLabel}`,
        `Rating: ${data.rating}`,
        `Badge: ${data.badge.label}`,
        "",
        "Question Details:"
    ];

    data.results.forEach((item) => {
        const status = item.isCorrect ? "CORRECT" : `WRONG (Your answer: ${item.userAnswerLabel})`;
        lines.push(`${item.index}. ${item.expression} = ${item.correctAnswer} -> ${status}`);
    });

    return lines.join("\n");
}

async function saveResultToFile() {
    if (!lastResultData) return;

    const nameRaw = (studentNameInput?.value || lastResultData.studentName || "player").trim();
    const safeName = (nameRaw || "player").replace(/[^a-zA-Z0-9_-]/g, "_");
    const data = {
        ...lastResultData,
        studentName: nameRaw || "Player",
        dateLabel: getCurrentDateLabel()
    };

    const certificateHtml = buildCertificateHtml(data);
    const fileName = `math_certificate_${safeName}.html`;
    const blob = new Blob([certificateHtml], { type: "text/html;charset=utf-8" });
    const file = new File([blob], fileName, { type: "text/html" });

    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [
                    {
                        description: "HTML Certificate",
                        accept: { "text/html": [".html"] }
                    }
                ]
            });

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            setSaveStatus("Saved successfully to the selected location.");
            return;
        }

        if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: "Math Certificate",
                text: "Save or share your certificate"
            });
            setSaveStatus("Opened share menu. Choose Files/Downloads to save on this device.");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setSaveStatus("Downloaded to your browser default download location (usually Downloads). ");
    } catch (error) {
        if (error && error.name === "AbortError") {
            setSaveStatus("Save cancelled.");
            return;
        }
        setSaveStatus("Could not save file on this browser. Try Print Certificate instead.", true);
    }
}

function printResultSheet() {
    if (!lastResultData) return;

    const studentName = (studentNameInput?.value || lastResultData.studentName || "Player").trim() || "Player";
    const data = { ...lastResultData, studentName, dateLabel: getCurrentDateLabel() };
    const rows = data.results.map((item) => {
        const color = item.isCorrect ? "#14532d" : "#7f1d1d";
        const bg = item.isCorrect ? "#dcfce7" : "#fee2e2";
        const tail = item.isCorrect ? "✓ Correct" : `✗ Your answer: ${sanitizeHtml(item.userAnswerLabel)}`;
        return `<div style="padding:8px 10px;margin-bottom:6px;border-radius:8px;background:${bg};color:${color};font-size:14px;">
            <strong>${item.index}. ${sanitizeHtml(item.expression)} = ${item.correctAnswer}</strong><br>
            <span>${tail}</span>
        </div>`;
    }).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
        <html>
        <head>
            <title>Result Sheet</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
            <p style="margin:0 0 8px;"><strong>Name:</strong> ${sanitizeHtml(data.studentName)}</p>
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${sanitizeHtml(data.dateLabel)}</p>
            <p style="margin:0 0 8px;"><strong>Done:</strong> ${data.correctCount}/${data.total}</p>
            <p style="margin:0 0 8px;"><strong>Your result:</strong> ${data.correctCount}/${data.total} (${sanitizeHtml(data.rating)})</p>
            <p style="margin:0 0 18px;"><strong>Badge:</strong> ${sanitizeHtml(data.badge.label)}</p>
            <h2 style="margin:12px 0 10px;">Question Results</h2>
            ${rows}
            <p style="margin-top:18px;font-size:12px;color:#475569;">© Anasztázia Karalyos-Kecskés 2026 • All rights reserved</p>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function printCertificateSheet() {
    if (!lastResultData) return;

    refreshCertificatePreview();
    const data = { ...lastResultData };
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(buildCertificateHtml(data));

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function buildCertificatePdfDoc(data) {
    const jsPDFCtor = window.jspdf?.jsPDF;
    if (!jsPDFCtor) return null;

    const doc = new jsPDFCtor({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 44;
    const cardX = margin;
    const cardY = 46;
    const cardW = pageWidth - margin * 2;
    const cardH = 650;

    const badgeStyle = getBadgeStyle(data.badge.className);

    doc.setFillColor(238, 242, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 18, 18, "F");

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(4);
    doc.roundedRect(cardX, cardY, cardW, cardH, 18, 18, "S");

    const canUseGState = typeof doc.setGState === "function" && typeof doc.GState === "function";

    doc.setFillColor(236, 72, 153);
    if (canUseGState) doc.setGState(new doc.GState({ opacity: 0.45 }));
    doc.circle(cardX + 18, cardY + 24, 7, "F");
    doc.setFillColor(6, 182, 212);
    doc.circle(cardX + cardW - 18, cardY + 68, 7, "F");
    doc.setFillColor(249, 115, 22);
    doc.roundedRect(cardX + cardW - 28, cardY + cardH - 30, 12, 12, 2, 2, "F");
    doc.setFillColor(139, 92, 246);
    doc.triangle(cardX + 24, cardY + cardH - 24, cardX + 16, cardY + cardH - 10, cardX + 32, cardY + cardH - 10, "F");
    doc.setTextColor(244, 63, 94);
    doc.setFontSize(18);
    doc.text("7", cardX + 24, cardY + 96);
    doc.setTextColor(14, 165, 233);
    doc.text("3", cardX + cardW - 30, cardY + 122);
    doc.setTextColor(245, 158, 11);
    doc.text("9", pageWidth / 2, cardY + 18, { align: "center" });
    doc.setTextColor(16, 185, 129);
    doc.text("12", cardX + 10, cardY + cardH - 62);
    doc.setTextColor(99, 102, 241);
    doc.text("5", cardX + cardW - 44, cardY + cardH - 62);
    if (canUseGState) doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setTextColor(55, 48, 163);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Math Game Challenge Website Badge / Certificate", pageWidth / 2, 84, { align: "center", maxWidth: cardW - 80 });

    doc.setTextColor(29, 78, 216);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.text(String(data.studentName), pageWidth / 2, 126, { align: "center", maxWidth: cardW - 80 });

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("NAME", pageWidth / 2, 140, { align: "center" });

    doc.setFillColor(254, 240, 138);
    doc.roundedRect(cardX + 170, 152, cardW - 340, 24, 10, 10, "F");
    doc.setDrawColor(161, 98, 7);
    doc.setLineWidth(1);
    doc.roundedRect(cardX + 170, 152, cardW - 340, 24, 10, 10, "S");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(String(data.resultHeadline), pageWidth / 2, 168, { align: "center", maxWidth: cardW - 350 });

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);

    const colGap = 14;
    const rowGap = 12;
    const cellW = (cardW - 72 - colGap) / 2;
    const cellH = 38;
    const gridX = cardX + 36;
    const gridY = 194;

    function drawCell(col, row, label, value) {
        const x = gridX + col * (cellW + colGap);
        const y = gridY + row * (cellH + rowGap);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.7);
        doc.roundedRect(x, y, cellW, cellH, 8, 8, "FD");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`${label}:`, x + 8, y + 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(String(value), x + 8, y + 28, { maxWidth: cellW - 16 });
    }

    drawCell(0, 0, "Date", data.dateLabel);
    drawCell(1, 0, "Result", `${data.correctCount}/${data.total}`);
    drawCell(0, 1, "Operation", data.operationLabel);
    drawCell(1, 1, "Level", data.difficultyLabel);
    drawCell(0, 2, "Mode", data.modeLabel);
    drawCell(1, 2, "Table", data.tableInfoLabel.replace(/^Tables?:\s*/i, ""));

    const badgeX = gridX;
    const badgeY = gridY + 3 * (cellH + rowGap) + 4;
    const badgeW = cardW - 72;
    const badgeH = 30;

    if (badgeStyle.background.includes("#facc15")) {
        doc.setFillColor(250, 204, 21);
        doc.setTextColor(17, 24, 39);
    } else if (badgeStyle.background.includes("#cbd5e1")) {
        doc.setFillColor(203, 213, 225);
        doc.setTextColor(15, 23, 42);
    } else if (badgeStyle.background.includes("#d97706")) {
        doc.setFillColor(217, 119, 6);
        doc.setTextColor(255, 255, 255);
    } else {
        doc.setFillColor(124, 58, 237);
        doc.setTextColor(255, 255, 255);
    }

    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 14, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Badge: ${String(data.badge.label)}`, badgeX + badgeW / 2, badgeY + 19, { align: "center" });

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("© Anasztázia Karalyos-Kecskés 2026 • All rights reserved", pageWidth / 2, cardY + cardH - 26, { align: "center" });

    return doc;
}

async function exportCertificatePdf() {
    if (!lastResultData) return;

    refreshCertificatePreview();
    const data = { ...lastResultData };
    const nameRaw = (data.studentName || "player").trim();
    const safeName = (nameRaw || "player").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `math_certificate_${safeName}.pdf`;

    const doc = buildCertificatePdfDoc(data);
    if (!doc) {
        setSaveStatus("PDF engine not loaded. Using Print Certificate as fallback.", true);
        printCertificateSheet();
        return;
    }

    try {
        const pdfBlob = doc.output("blob");
        const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [
                    {
                        description: "PDF Certificate",
                        accept: { "application/pdf": [".pdf"] }
                    }
                ]
            });

            const writable = await handle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
            setSaveStatus("PDF saved to the selected location.");
            return;
        }

        if (navigator.canShare && navigator.share && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                files: [pdfFile],
                title: "Math Certificate PDF",
                text: "Save or share your certificate PDF"
            });
            setSaveStatus("Share menu opened. Choose Files/Downloads to save your PDF.");
            return;
        }

        const pdfUrl = URL.createObjectURL(pdfBlob);
        const isAppleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

        if (isAppleTouch) {
            window.open(pdfUrl, "_blank");
            setSaveStatus("PDF opened in a new tab. Use Share → Save to Files on iPhone/iPad.");
            return;
        }

        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setSaveStatus("PDF downloaded to your browser default download location.");

        setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
        }, 2000);
    } catch (error) {
        if (error && error.name === "AbortError") {
            setSaveStatus("PDF export cancelled.");
            return;
        }
        setSaveStatus("Could not export PDF on this browser. Try Print Certificate.", true);
    }
}

// OK button for input mode
okBtn.onclick = () => {
    if (mode === "input" || isTimedMode) checkAnswer(Number(answerInput.value));
};

if (quizSubmitBtn) {
    quizSubmitBtn.onclick = () => {
        unlockQuizAudio();
        if (mode === "input") checkAnswer(Number(answerInput.value));
    };
}

if (quizClearBtn) {
    quizClearBtn.onclick = () => {
        if (answerInput) answerInput.value = "";
    };
}

window.addEventListener("pointerdown", unlockQuizAudio, { once: true });
window.addEventListener("touchstart", unlockQuizAudio, { once: true });

if (saveResultBtn) {
    saveResultBtn.onclick = () => {
        saveResultToFile();
    };
}

if (printResultBtn) {
    printResultBtn.onclick = printResultSheet;
}

if (viewCertificateBtn && certificatePreviewEl) {
    viewCertificateBtn.onclick = () => {
        refreshCertificatePreview();
        certificatePreviewEl.classList.remove("hidden");
    };
}

if (closeCertificateBtn && certificatePreviewEl) {
    closeCertificateBtn.onclick = () => {
        certificatePreviewEl.classList.add("hidden");
    };
}

if (printCertificateBtn) {
    printCertificateBtn.onclick = printCertificateSheet;
}

if (exportPdfBtn) {
    exportPdfBtn.onclick = () => {
        exportCertificatePdf();
    };
}

if (resultBadgeEl && certificatePreviewEl) {
    resultBadgeEl.onclick = () => {
        refreshCertificatePreview();
        certificatePreviewEl.classList.remove("hidden");
    };
}

if (studentNameInput) {
    studentNameInput.addEventListener("input", refreshCertificatePreview);
}

// Initial display setup
if (endScreen) endScreen.classList.add("hidden");

if (timerWrapEl) {
    if (isTimedMode) timerWrapEl.classList.remove("hidden");
    else timerWrapEl.classList.add("hidden");
}

if (mode === "multiple") {
    inputContainer.style.display = "none";
    multipleContainer.style.display = "block";
} else {
    inputContainer.style.display = "block";
    multipleContainer.style.display = "none";
}

// First question
if (isWeekly && showWeeklyResult) {
    const savedWeeklyResult = loadSavedWeeklyResultData();
    if (savedWeeklyResult) {
        lastResultData = savedWeeklyResult;
        renderEndScreenFromData(lastResultData, "weekly.html", "weekly.html");
    } else {
        generateQuestion();
    }
} else {
    generateQuestion();
}