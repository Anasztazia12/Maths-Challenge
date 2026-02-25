// URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");        // input or multiple
const op = urlParams.get("op");            // addition, subtraction, multiplication, division, mixed
const diff = urlParams.get("diff");        // easy, medium, hard
const tablesParam = urlParams.get("tables") || "";
const isWeekly = urlParams.get("weekly") === "1";

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
const studentNameInput = document.getElementById("student-name");
const saveResultBtn = document.getElementById("save-result-btn");
const printResultBtn = document.getElementById("print-result-btn");

let lastResultData = null;

function getCurrentDateLabel() {
    return new Date().toLocaleDateString();
}

// Sounds
const correctSound = document.getElementById("correct-sound");
const wrongSound = document.getElementById("wrong-sound");

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
}

// State
let currentQuestion = 0;  // Starting question
let correctAnswer = 0;
let currentExpression = "";
const questionResults = [];

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

// Difficulty levels
const ranges = {
    easy: 20,
    medium: 60,
    hard: 150
};

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
            const ops = ["+", "-", "×", "÷"];
            const pick = ops[Math.floor(Math.random() * 4)];
            if (pick === "+") {
                correctAnswer = a + b;
                currentExpression = `${a} + ${b}`;
            }
            if (pick === "-") {
                correctAnswer = a - b;
                currentExpression = `${a} - ${b}`;
            }
            if (pick === "×") {
                correctAnswer = a * b;
                currentExpression = `${a} × ${b}`;
            }
            if (pick === "÷") {
                correctAnswer = a;
                let product2 = a * b;
                currentExpression = `${product2} ÷ ${b}`;
            }
            questionEl.innerText = `${currentExpression} = ?`;
            break;
    }

    if (mode === "multiple") setupMultipleChoice();
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
    const rawInput = mode === "input" ? answerInput.value.trim() : String(value);
    if (mode === "input" && rawInput === "") return;
    if (mode === "input") value = Number(rawInput);

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

// End screen
function showEndScreen() {
    if (isWeekly) {
        localStorage.setItem("weeklyTaskDone", "1");
    }

    const tablesQuery = tablesParam ? `&tables=${encodeURIComponent(tablesParam)}` : "";
    const replayQuery = `mode=${mode || "input"}&op=${op || "mixed"}&diff=${diff || "easy"}${tablesQuery}`;
    const playAgainTarget = isWeekly ? "weekly.html" : `play.html?${replayQuery}`;
    const backTarget = isWeekly ? "weekly.html" : "index.html";

    if (counterEl) counterEl.style.display = "none";
    if (questionEl) questionEl.style.display = "none";
    if (inputContainer) inputContainer.style.display = "none";
    if (multipleContainer) multipleContainer.style.display = "none";

    if (endScreen) {
        const endTitle = endScreen.querySelector("h2");
        const endText = endScreen.querySelector("p");
        const endButtons = endScreen.querySelectorAll("button");
        const correctCount = questionResults.filter((item) => item.isCorrect).length;
        const total = questionResults.length;
        const rating = getResultRating(correctCount, total);
        const badge = getBadgeLevel(correctCount, total);
        const studentName = studentNameInput?.value?.trim() || "Player";

        lastResultData = {
            studentName,
            correctCount,
            total,
            rating,
            badge,
            dateLabel: getCurrentDateLabel(),
            results: [...questionResults]
        };

        if (endTitle) endTitle.innerText = "Done!";
        if (endText) endText.innerText = `You finished all ${total} questions. Done ${total}/${correctCount}.`;
        if (resultSummaryEl) {
            resultSummaryEl.innerText = `Your result: ${total}/${correctCount} • Correct answers: ${correctCount}/${total} • ${rating}`;
        }
        if (resultBadgeEl) {
            resultBadgeEl.innerText = badge.label;
            resultBadgeEl.className = `result-badge ${badge.className}`;
        }

        if (resultListEl) {
            const resultRows = questionResults.map((item) => {
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

        if (endButtons[0]) endButtons[0].setAttribute("onclick", `location.href='${playAgainTarget}'`);
        if (endButtons[1]) {
            endButtons[1].setAttribute("onclick", `location.href='${backTarget}'`);
            endButtons[1].innerText = isWeekly ? "Back to Weekly" : "Back to Home";
        }

        endScreen.classList.remove("hidden");
    }
}

function buildResultText(data) {
    const lines = [
        `Name: ${data.studentName}`,
        `Date: ${data.dateLabel}`,
        `Result: ${data.total}/${data.correctCount}`,
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

function saveResultToFile() {
    if (!lastResultData) return;

    const nameRaw = (studentNameInput?.value || lastResultData.studentName || "player").trim();
    const safeName = (nameRaw || "player").replace(/[^a-zA-Z0-9_-]/g, "_");
    const text = buildResultText({
        ...lastResultData,
        studentName: nameRaw || "Player",
        dateLabel: getCurrentDateLabel()
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `math_result_${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
            <p style="margin:0 0 8px;"><strong>Done:</strong> ${data.total}/${data.correctCount}</p>
            <p style="margin:0 0 8px;"><strong>Your result:</strong> ${data.total}/${data.correctCount} (${sanitizeHtml(data.rating)})</p>
            <p style="margin:0 0 18px;"><strong>Badge:</strong> ${sanitizeHtml(data.badge.label)}</p>
            <h2 style="margin:12px 0 10px;">Question Results</h2>
            ${rows}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// OK button for input mode
okBtn.onclick = () => {
    if (mode === "input") checkAnswer(Number(answerInput.value));
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
    saveResultBtn.onclick = saveResultToFile;
}

if (printResultBtn) {
    printResultBtn.onclick = printResultSheet;
}

// Initial display setup
if (endScreen) endScreen.classList.add("hidden");

if (mode === "multiple") {
    inputContainer.style.display = "none";
    multipleContainer.style.display = "block";
} else {
    inputContainer.style.display = "block";
    multipleContainer.style.display = "none";
}

// First question
generateQuestion();