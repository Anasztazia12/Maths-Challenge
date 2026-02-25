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
const certificateDateEl = document.getElementById("certificate-date");
const certificateResultEl = document.getElementById("certificate-result");
const certificateBadgeEl = document.getElementById("certificate-badge");

const badgeGoldChip = document.getElementById("badge-gold-chip");
const badgeSilverChip = document.getElementById("badge-silver-chip");
const badgeBronzeChip = document.getElementById("badge-bronze-chip");
const badgePracticeChip = document.getElementById("badge-practice-chip");

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
    if (certificateDateEl) certificateDateEl.innerText = dateLabel;
    if (certificateResultEl) certificateResultEl.innerText = `${lastResultData.correctCount}/${lastResultData.total}`;
    if (certificateBadgeEl) certificateBadgeEl.innerText = lastResultData.badge.label;

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
            <div style="max-width:720px;margin:0 auto;border-radius:18px;padding:24px;background:linear-gradient(160deg,#ffffff,#eef2ff);border:4px solid #6366f1;box-shadow:0 10px 30px rgba(15,23,42,0.15);color:#0f172a;">
                <div style="font-size:28px;font-weight:900;text-align:center;color:#312e81;margin-bottom:18px;">Math Game Challenge Website Badge / Certificate</div>
                <p style="font-size:18px;margin:8px 0;"><strong>Name:</strong> ${sanitizeHtml(data.studentName)}</p>
                <p style="font-size:18px;margin:8px 0;"><strong>Date:</strong> ${sanitizeHtml(data.dateLabel)}</p>
                <p style="font-size:18px;margin:8px 0;"><strong>Result:</strong> ${data.correctCount}/${data.total}</p>
                <p style="font-size:18px;margin:8px 0;"><strong>Badge:</strong>
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;font-weight:800;border:1px solid rgba(15,23,42,0.15);background:${badgeStyle.background};color:${badgeStyle.color};">${sanitizeHtml(data.badge.label)}</span>
                </p>
                <p style="margin-top:22px;font-size:13px;color:#334155;text-align:center;">© Anasztázia Karalyos-Kecskés 2026 • All rights reserved</p>
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

        updateBadgeShelf(badge.className);
        refreshCertificatePreview();

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

        if (playAgainBtn) playAgainBtn.setAttribute("onclick", `location.href='${playAgainTarget}'`);
        if (backHomeBtn) {
            backHomeBtn.setAttribute("onclick", `location.href='${backTarget}'`);
            backHomeBtn.innerText = isWeekly ? "Back to Weekly" : "Back to Home";
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
            <p style="margin:0 0 8px;"><strong>Done:</strong> ${data.total}/${data.correctCount}</p>
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
    const cardH = 620;

    const badgeStyle = getBadgeStyle(data.badge.className);

    doc.setFillColor(238, 242, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 18, 18, "F");

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(4);
    doc.roundedRect(cardX, cardY, cardW, cardH, 18, 18, "S");

    doc.setTextColor(49, 46, 129);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("Math Game Challenge Website Badge / Certificate", pageWidth / 2, 112, { align: "center", maxWidth: cardW - 80 });

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(17);

    let rowY = 190;
    const rowGap = 44;

    doc.setFont("helvetica", "bold");
    doc.text("Name:", cardX + 36, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(data.studentName), cardX + 96, rowY);

    rowY += rowGap;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", cardX + 36, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(data.dateLabel), cardX + 96, rowY);

    rowY += rowGap;
    doc.setFont("helvetica", "bold");
    doc.text("Result:", cardX + 36, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.correctCount}/${data.total}`, cardX + 96, rowY);

    rowY += rowGap;
    doc.setFont("helvetica", "bold");
    doc.text("Badge:", cardX + 36, rowY);

    const badgeX = cardX + 96;
    const badgeY = rowY - 22;
    const badgeW = 170;
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
    doc.text(String(data.badge.label), badgeX + badgeW / 2, rowY - 2, { align: "center" });

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

if (mode === "multiple") {
    inputContainer.style.display = "none";
    multipleContainer.style.display = "block";
} else {
    inputContainer.style.display = "block";
    multipleContainer.style.display = "none";
}

// First question
generateQuestion();