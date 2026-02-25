// URL paraméterek
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");        // input vagy multiple
const op = urlParams.get("op");            // addition, subtraction, multiplication, division, mixed
const diff = urlParams.get("diff");        // easy, medium, hard
const isWeekly = urlParams.get("weekly") === "1";

// DOM elemek
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

// Hangok
const correctSound = document.getElementById("correct-sound");
const wrongSound = document.getElementById("wrong-sound");

// Állapot
let currentQuestion = 0;  // Kezdő kérdés
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

// Nehézségi szintek
const ranges = {
    easy: 20,
    medium: 60,
    hard: 150
};

// Véletlenszám generálása
function rand(max) {
    return Math.floor(Math.random() * max) + 1;
}

// Új kérdés generálása
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
            correctAnswer = a * b;
            currentExpression = `${a} × ${b}`;
            questionEl.innerText = `${currentExpression} = ?`;
            break;
        case "division":
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

// Multiple choice beállítása
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

// Ellenőrzés
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

    // Következő kérdés vagy vége
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

    const replayQuery = `mode=${mode || "input"}&op=${op || "mixed"}&diff=${diff || "easy"}`;
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

        if (endTitle) endTitle.innerText = "Done!";
        if (endText) endText.innerText = "You finished all 20 questions. Done!";
        if (resultSummaryEl) {
            resultSummaryEl.innerText = `Your result is ${total}/${correctCount} — ${rating}`;
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

// OK gomb input módhoz
okBtn.onclick = () => {
    if (mode === "input") checkAnswer(Number(answerInput.value));
};

if (quizSubmitBtn) {
    quizSubmitBtn.onclick = () => {
        if (mode === "input") checkAnswer(Number(answerInput.value));
    };
}

if (quizClearBtn) {
    quizClearBtn.onclick = () => {
        if (answerInput) answerInput.value = "";
    };
}

// Kezdeti megjelenítés
if (endScreen) endScreen.classList.add("hidden");

if (mode === "multiple") {
    inputContainer.style.display = "none";
    multipleContainer.style.display = "block";
} else {
    inputContainer.style.display = "block";
    multipleContainer.style.display = "none";
}

// Első kérdés
generateQuestion();