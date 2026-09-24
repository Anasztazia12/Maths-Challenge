const arcadeCanvas = document.getElementById("arcade-canvas");

if (arcadeCanvas) {
    function getScopedKey(baseKey) {
        const profileStore = window.MathsProfileStore;
        return profileStore ? profileStore.getScopedStorageKey(baseKey) : baseKey;
    }

    function readJson(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null");
        } catch {
            return null;
        }
    }

    // DOM
    const arcadePanel = document.getElementById("arcade-panel");
    const arcadeCanvasWrap = document.getElementById("arcade-canvas-wrap");
    const arcadeTargetEl = document.getElementById("arcade-target");
    const arcadeScoreEl = document.getElementById("arcade-score");
    const arcadePointsEl = document.getElementById("arcade-points");
    const arcadeLivesEl = document.getElementById("arcade-lives");
    const arcadeComboEl = document.getElementById("arcade-combo");
    const arcadeCheckpointEl = document.getElementById("arcade-checkpoint");
    const arcadeProgressBarEl = document.getElementById("arcade-progress-bar");
    const arcadeOverlay = document.getElementById("arcade-overlay");
    const arcadeOverlayTitle = document.getElementById("arcade-overlay-title");
    const arcadeOverlayText = document.getElementById("arcade-overlay-text");
    const arcadeRestartBtn = document.getElementById("arcade-restart-btn");
    const arcadeDifficultyButtonsWrap = document.getElementById("arcade-difficulty-buttons");
    const arcadeJumpBtn = document.getElementById("arcade-jump-btn");
    const arcadeShootBtn = document.getElementById("arcade-shoot-btn");
    const arcadeRulesEl = document.getElementById("arcade-rules");
    const arcadeStartBtn = document.getElementById("arcade-start-btn");
    const openRunnerBtn = document.getElementById("open-runner-btn");

    const ctx = arcadeCanvas.getContext("2d");
    const audioCtx = window.AudioContext ? new AudioContext() : null;

    // Tuning
    const STEP_MS = 1000 / 60;
    const MAX_LIVES = 5;
    const TASKS_PER_FIELD = 5;
    const GRAVITY = 0.72;
    const JUMP_VELOCITY = -15;
    const JUMP_CUT_VELOCITY = -7;
    const COYOTE_FRAMES = 6;
    const JUMP_BUFFER_FRAMES = 7;
    const APPLE_LOW_OFFSET = 36;
    const APPLE_HIGH_OFFSET = 168;

    const DIFFICULTY = {
        easy: { speed: 3.1, gap: 300, maxSpeedBonus: 1.4 },
        medium: { speed: 3.7, gap: 270, maxSpeedBonus: 1.8 },
        hard: { speed: 4.3, gap: 240, maxSpeedBonus: 2.2 }
    };

    const THEMES = [
        {
            name: "Meadow",
            skyTop: "#5ec2f7", skyBottom: "#d7f1ff",
            far: "#8fb8e8", near: "#57c46b", nearDark: "#3a9d52",
            grass: "#4cc44f", grassDark: "#2f9a3a", dirt: "#9a6532", dirtDark: "#7a4d24",
            tree: "#2f8f47", sun: "#fff3b0", night: false
        },
        {
            name: "Sunset",
            skyTop: "#ff8a5b", skyBottom: "#ffd98a",
            far: "#c96a6a", near: "#b88a3a", nearDark: "#946b28",
            grass: "#8cbf3f", grassDark: "#6a9a2a", dirt: "#8a5230", dirtDark: "#6b3d22",
            tree: "#6b7f2a", sun: "#fff1c4", night: false
        },
        {
            name: "Starry Night",
            skyTop: "#0b1030", skyBottom: "#33307a",
            far: "#262a5e", near: "#1f4d3f", nearDark: "#173a30",
            grass: "#2f8a55", grassDark: "#226b41", dirt: "#4a3326", dirtDark: "#37251b",
            tree: "#16432f", sun: "#f5f3ff", night: true
        },
        {
            name: "Candy Land",
            skyTop: "#f5a8ff", skyBottom: "#ffe3f3",
            far: "#c79bff", near: "#ff8cc6", nearDark: "#e56aa8",
            grass: "#ff6fb5", grassDark: "#e04b97", dirt: "#9d4a86", dirtDark: "#7c356a",
            tree: "#b03a86", sun: "#fffbe6", night: false
        }
    ];

    const world = {
        width: 860,
        height: 420,
        groundY: 356,
        speed: 3,
        scroll: 0,
        frame: 0,
        shake: 0
    };

    const player = {
        x: 110,
        y: 0,
        width: 54,
        height: 64,
        vy: 0,
        onGround: true,
        framesSinceGround: 0,
        jumpBuffer: 0,
        jumpHeld: false,
        shootFlash: 0
    };

    const savedArcadeProfile = readJson(getScopedKey("arcadeProfile")) || {};
    const furStyle = savedArcadeProfile?.cosmetics?.fur === "pink" ? "pink" : "brown";
    const FUR = furStyle === "pink"
        ? { main: "#e58ac2", dark: "#c0619d", light: "#fbd3ea" }
        : { main: "#a8703f", dark: "#80522c", light: "#f2d4ae" };

    const state = {
        mode: "ready", // ready | playing | over
        score: 0,
        bestScore: Math.max(0, Number(localStorage.getItem(getScopedKey("arcadeBestScore")) || 0)),
        lives: MAX_LIVES,
        combo: 0,
        bestCombo: 0,
        level: 1,
        solvedThisLevel: 0,
        solvedTotal: 0,
        goldThisRun: 0,
        question: null,
        gateId: 0,
        gateActive: false,
        lastEventWasGate: false,
        nextEventIn: 0,
        invincibleUntil: 0,
        powerUntil: 0,
        shootCooldown: 0,
        shootHeld: false,
        toast: null,
        banner: null,
        apples: [],
        obstacles: [],
        enemies: [],
        pickups: [],
        boxes: [],
        bullets: [],
        particles: [],
        floaters: []
    };

    let difficulty = arcadeDifficultyButtonsWrap?.dataset.selected || "easy";

    // ---------- Helpers ----------

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function hash(n) {
        const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    function intersectsRect(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function intersectsCircleRect(cx, cy, r, rx, ry, rw, rh) {
        const nx = Math.max(rx, Math.min(cx, rx + rw));
        const ny = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nx;
        const dy = cy - ny;
        return dx * dx + dy * dy <= r * r;
    }

    function roundRect(x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function currentTheme() {
        return THEMES[(state.level - 1) % THEMES.length];
    }

    function isPanelVisible() {
        return !arcadePanel || !arcadePanel.classList.contains("hidden");
    }

    function isInvincible() {
        return world.frame < state.invincibleUntil;
    }

    function hasPower() {
        return world.frame < state.powerUntil;
    }

    // ---------- Audio ----------

    function playTone(freq, duration, type = "sine", volume = 0.05, delayMs = 0) {
        if (!audioCtx) return;
        const start = () => {
            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            oscillator.type = type;
            oscillator.frequency.value = freq;
            oscillator.connect(gain);
            gain.connect(audioCtx.destination);
            const now = audioCtx.currentTime;
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            oscillator.start(now);
            oscillator.stop(now + duration);
        };
        if (delayMs > 0) setTimeout(start, delayMs);
        else start();
    }

    function unlockArcadeAudio() {
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    }

    const sounds = {
        jump: () => playTone(420, 0.09, "triangle", 0.04),
        shoot: () => playTone(660, 0.05, "square", 0.025),
        correct: () => {
            playTone(660, 0.1, "triangle", 0.06);
            playTone(880, 0.12, "triangle", 0.06, 80);
            playTone(1100, 0.16, "triangle", 0.05, 160);
        },
        wrong: () => {
            playTone(260, 0.14, "square", 0.05);
            playTone(180, 0.2, "square", 0.05, 110);
        },
        hit: () => playTone(150, 0.18, "sawtooth", 0.06),
        stomp: () => playTone(520, 0.08, "triangle", 0.06),
        pickup: () => {
            playTone(740, 0.07, "triangle", 0.05);
            playTone(990, 0.09, "triangle", 0.05, 60);
        },
        field: () => {
            [523, 659, 784, 1047].forEach((freq, i) => playTone(freq, 0.16, "triangle", 0.06, i * 110));
        },
        over: () => {
            [392, 330, 262].forEach((freq, i) => playTone(freq, 0.22, "triangle", 0.06, i * 160));
        }
    };

    // ---------- Wallet ----------

    function getWalletGold() {
        const profileStore = window.MathsProfileStore;
        if (profileStore?.getPoints) return profileStore.getPoints();
        return Math.max(0, Number(localStorage.getItem(getScopedKey("arcadeCoins")) || 0));
    }

    function awardGold(amount) {
        const safe = Math.max(0, Math.round(amount));
        if (safe <= 0) return;
        const profileStore = window.MathsProfileStore;
        let next;
        if (profileStore?.addPoints) {
            next = profileStore.addPoints(safe);
        } else {
            next = getWalletGold() + safe;
        }
        localStorage.setItem(getScopedKey("arcadeCoins"), String(next));
        state.goldThisRun += safe;
    }

    // ---------- Math questions ----------

    function makeQuestion() {
        const growth = Math.min(state.level - 1, 5);
        const ops = {
            easy: ["+", "+", "-", "-", "×"],
            medium: ["+", "-", "×", "×", "÷"],
            hard: ["+", "-", "×", "÷", "×", "÷"]
        }[difficulty] || ["+", "-"];
        const op = pick(ops);
        const addMax = { easy: 10, medium: 40, hard: 90 }[difficulty] + growth * (difficulty === "easy" ? 2 : 6);
        const tableMax = Math.min(12, { easy: 5, medium: 10, hard: 12 }[difficulty] + (difficulty === "easy" ? Math.floor(growth / 2) : 0));

        if (op === "+") {
            const a = randInt(1, addMax);
            const b = randInt(1, addMax);
            return { op, a, b, text: `${a} + ${b}`, answer: a + b };
        }
        if (op === "-") {
            const a = randInt(3, addMax + 5);
            const b = randInt(1, a - 1);
            return { op, a, b, text: `${a} − ${b}`, answer: a - b };
        }
        if (op === "×") {
            const a = randInt(2, tableMax);
            const b = randInt(1, tableMax);
            return { op, a, b, text: `${a} × ${b}`, answer: a * b };
        }
        const b = randInt(2, tableMax);
        const answer = randInt(1, tableMax);
        return { op, a: answer * b, b, text: `${answer * b} ÷ ${b}`, answer };
    }

    function makeWrongAnswer(question) {
        const { answer, op, a, b } = question;
        const candidates = [answer + 1, answer - 1, answer + 2, answer - 2];
        if (op === "+" || op === "-") candidates.push(answer + 10, answer - 10);
        if (op === "×") candidates.push(a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b);
        if (op === "÷") candidates.push(answer + b, Math.max(0, answer - 1));
        const valid = candidates.filter((value) => value >= 0 && value !== answer);
        return pick(valid);
    }

    function newQuestion() {
        state.question = makeQuestion();
        updateHud();
    }

    // ---------- Spawning ----------

    function spawnGate() {
        state.gateId += 1;
        const x = world.width + 60;
        const correctIsHigh = Math.random() < 0.5;
        const wrong = makeWrongAnswer(state.question);
        const lanes = [
            { y: world.groundY - APPLE_LOW_OFFSET, value: correctIsHigh ? wrong : state.question.answer },
            { y: world.groundY - APPLE_HIGH_OFFSET, value: correctIsHigh ? state.question.answer : wrong }
        ];
        lanes.forEach((lane, i) => {
            state.apples.push({
                gate: state.gateId,
                x,
                baseY: lane.y,
                y: lane.y,
                radius: 24,
                value: lane.value,
                isCorrect: lane.value === state.question.answer,
                phase: i * 1.7
            });
        });
        state.gateActive = true;
    }

    function spawnFiller() {
        const x = world.width + 40;
        const needsHeart = state.lives < MAX_LIVES;
        const table = [
            ["spike", 30],
            ["crate", 18],
            ["block", 10],
            ["slime", 22],
            ["bat", state.level >= 2 || difficulty !== "easy" ? 12 : 0],
            ["box", 8],
            ["heart", needsHeart ? 7 : 0]
        ];
        const total = table.reduce((sum, [, weight]) => sum + weight, 0);
        let roll = Math.random() * total;
        let kind = "spike";
        for (const [name, weight] of table) {
            roll -= weight;
            if (roll <= 0) {
                kind = name;
                break;
            }
        }

        if (kind === "spike") {
            const count = randInt(1, state.level >= 3 ? 3 : 2);
            state.obstacles.push({ type: "spike", x, y: world.groundY - 30, width: count * 28, height: 30, standable: false });
        } else if (kind === "crate") {
            const size = 46;
            const stacked = state.level >= 2 && Math.random() < 0.35;
            state.obstacles.push({ type: "crate", x, y: world.groundY - size, width: size, height: size, standable: true, hp: 1 });
            if (stacked) {
                state.obstacles.push({ type: "crate", x, y: world.groundY - size * 2, width: size, height: size, standable: true, hp: 1 });
            }
        } else if (kind === "block") {
            const h = randInt(50, 70);
            state.obstacles.push({ type: "block", x, y: world.groundY - h, width: 54, height: h, standable: true });
        } else if (kind === "slime") {
            state.enemies.push({ type: "slime", x, y: world.groundY - 40, width: 50, height: 40, hp: 2, maxHp: 2, phase: Math.random() * 6 });
        } else if (kind === "bat") {
            const baseY = world.groundY - randInt(120, 160);
            state.enemies.push({ type: "bat", x, y: baseY, baseY, width: 46, height: 30, hp: 1, maxHp: 1, phase: Math.random() * 6 });
        } else if (kind === "box") {
            state.boxes.push({ x, y: world.groundY - 200, width: 40, height: 40, bump: 0 });
        } else {
            state.pickups.push({ type: "heart", x, y: world.groundY - randInt(60, 150), radius: 15, phase: 0 });
        }
    }

    function eventGap() {
        const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        return Math.max(190, cfg.gap - (state.level - 1) * 8) + randInt(-20, 40);
    }

    function updateSpawns() {
        state.nextEventIn -= world.speed;
        if (state.nextEventIn > 0) return;

        if (!state.gateActive && !state.lastEventWasGate) {
            spawnGate();
            state.lastEventWasGate = true;
            state.nextEventIn = eventGap() + 60;
            return;
        }

        spawnFiller();
        state.lastEventWasGate = false;
        state.nextEventIn = eventGap();
    }

    // ---------- Effects ----------

    function burst(x, y, colors, count = 14, speed = 4) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = speed * (0.4 + Math.random() * 0.8);
            state.particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - 1.5,
                life: 36 + randInt(0, 16),
                maxLife: 52,
                size: randInt(3, 6),
                color: pick(colors)
            });
        }
    }

    function floatText(x, y, text, color = "#ffffff", size = 22) {
        state.floaters.push({ x, y, text, color, size, life: 55, maxLife: 55 });
    }

    function showToast(text, color = "#ffffff", frames = 80) {
        state.toast = { text, color, until: world.frame + frames, start: world.frame };
    }

    function showBanner(title, subtitle, frames = 120) {
        state.banner = { title, subtitle, until: world.frame + frames, start: world.frame };
    }

    // ---------- Game flow ----------

    function applyDifficulty() {
        const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        world.speed = cfg.speed + Math.min(cfg.maxSpeedBonus, (state.level - 1) * 0.3);
    }

    function clearField() {
        state.apples = [];
        state.obstacles = [];
        state.enemies = [];
        state.pickups = [];
        state.boxes = [];
        state.bullets = [];
        state.gateActive = false;
        state.lastEventWasGate = false;
        state.nextEventIn = 260;
    }

    function resetGame() {
        state.score = 0;
        state.lives = MAX_LIVES;
        state.combo = 0;
        state.bestCombo = 0;
        state.level = 1;
        state.solvedThisLevel = 0;
        state.solvedTotal = 0;
        state.goldThisRun = 0;
        state.invincibleUntil = 0;
        state.powerUntil = 0;
        state.shootCooldown = 0;
        state.toast = null;
        state.particles = [];
        state.floaters = [];
        world.scroll = 0;
        world.shake = 0;
        player.y = world.groundY - player.height;
        player.vy = 0;
        player.onGround = true;
        player.jumpBuffer = 0;
        clearField();
        applyDifficulty();
        newQuestion();
    }

    function startGame() {
        unlockArcadeAudio();
        difficulty = arcadeDifficultyButtonsWrap?.dataset.selected || "easy";
        resetGame();
        state.mode = "playing";
        arcadeRulesEl?.classList.add("hidden");
        arcadeOverlay?.classList.add("hidden");
        showBanner("GO!", `Field 1 · ${currentTheme().name}`, 80);
        playTone(880, 0.12, "triangle", 0.05);
    }

    function showReadyScreen() {
        state.mode = "ready";
        difficulty = arcadeDifficultyButtonsWrap?.dataset.selected || "easy";
        resetGame();
        arcadeOverlay?.classList.add("hidden");
        arcadeRulesEl?.classList.remove("hidden");
    }

    function gameOver() {
        state.mode = "over";
        sounds.over();
        const isNewBest = state.score > state.bestScore;
        if (isNewBest) {
            state.bestScore = state.score;
            localStorage.setItem(getScopedKey("arcadeBestScore"), String(state.bestScore));
        }
        if (arcadeOverlay) {
            arcadeOverlayTitle.innerText = isNewBest && state.score > 0 ? "New best score! 🏆" : "Game Over";
            arcadeOverlayText.innerHTML = `
                <span class="arcade-result-grid">
                    <span><strong>${state.score}</strong>Score</span>
                    <span><strong>${state.solvedTotal}</strong>Correct</span>
                    <span><strong>${state.level}</strong>Field</span>
                    <span><strong>+${state.goldThisRun}</strong>Gold</span>
                </span>
                <span class="arcade-result-best">Best score: ${state.bestScore} · Best combo: x${state.bestCombo}</span>`;
            arcadeOverlay.classList.remove("hidden");
        }
        updateHud();
    }

    function hurt(reason) {
        if (isInvincible() || state.mode !== "playing") return;
        state.lives -= 1;
        state.combo = 0;
        state.invincibleUntil = world.frame + 80;
        world.shake = 10;
        sounds.hit();
        burst(player.x + player.width / 2, player.y + player.height / 2, ["#ff5d73", "#ffffff", "#ffb3c1"], 16, 4);
        floatText(player.x + player.width / 2, player.y - 8, "−1 ❤", "#ff6b81", 22);
        if (reason) showToast(reason, "#ffd1d8", 70);
        updateHud();
        if (state.lives <= 0) gameOver();
    }

    function solveQuestion(apple) {
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const points = 10 + Math.min(20, (state.combo - 1) * 2);
        state.score += points;
        state.solvedThisLevel += 1;
        state.solvedTotal += 1;
        awardGold(1);
        sounds.correct();
        burst(apple.x, apple.y, ["#ffe066", "#7cf29a", "#ffffff", "#66d9ff"], 22, 5);
        floatText(apple.x, apple.y - 30, `+${points}`, "#fff59d", 26);
        showToast(state.combo >= 3 ? `Correct! Combo x${state.combo} 🔥` : pick(["Correct! ✨", "Great job! ⭐", "Awesome! 🎉", "Well done! 👏"]), "#b9ffcf", 70);

        if (state.solvedThisLevel >= TASKS_PER_FIELD) {
            completeField();
        } else {
            newQuestion();
        }
    }

    function completeField() {
        state.level += 1;
        state.solvedThisLevel = 0;
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
        state.score += 25;
        awardGold(2);
        clearField();
        applyDifficulty();
        newQuestion();
        sounds.field();
        showBanner(`FIELD ${state.level}`, `${currentTheme().name} · +1 ❤  +2 gold`, 150);
    }

    function answerWrong(apple) {
        sounds.wrong();
        burst(apple.x, apple.y, ["#ff6b6b", "#8b1e1e", "#ffffff"], 14, 4);
        floatText(apple.x, apple.y - 30, `✗ ${apple.value}`, "#ff8a8a", 24);
        state.invincibleUntil = 0;
        hurt(`Not ${apple.value}. Try again: ${state.question.text}`);
    }

    // ---------- Player ----------

    function requestJump() {
        unlockArcadeAudio();
        if (state.mode !== "playing" || !isPanelVisible()) return;
        player.jumpHeld = true;
        player.jumpBuffer = JUMP_BUFFER_FRAMES;
    }

    function releaseJump() {
        player.jumpHeld = false;
        if (player.vy < JUMP_CUT_VELOCITY) player.vy = JUMP_CUT_VELOCITY;
    }

    function shoot() {
        unlockArcadeAudio();
        if (state.mode !== "playing" || !isPanelVisible() || state.shootCooldown > 0) return;
        const powered = hasPower();
        state.shootCooldown = powered ? 8 : 14;
        player.shootFlash = 6;
        state.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height * 0.48,
            radius: powered ? 10 : 7,
            vx: powered ? 11 : 9.5,
            piercing: powered,
            power: powered
        });
        sounds.shoot();
    }

    function updatePlayer() {
        const previousBottom = player.y + player.height;

        if (player.jumpBuffer > 0) {
            player.jumpBuffer -= 1;
            if (player.onGround || player.framesSinceGround < COYOTE_FRAMES) {
                player.vy = JUMP_VELOCITY;
                player.onGround = false;
                player.framesSinceGround = COYOTE_FRAMES;
                player.jumpBuffer = 0;
                sounds.jump();
                burst(player.x + player.width / 2, player.y + player.height, ["#ffffff", "#e2e8f0"], 6, 2);
                if (!player.jumpHeld) player.vy = JUMP_CUT_VELOCITY - 3;
            }
        }

        player.vy = Math.min(player.vy + GRAVITY, 16);
        player.y += player.vy;
        const wasOnGround = player.onGround;
        player.onGround = false;

        if (player.y + player.height >= world.groundY) {
            player.y = world.groundY - player.height;
            player.vy = 0;
            player.onGround = true;
        }

        for (const obstacle of state.obstacles) {
            if (!obstacle.standable) continue;
            const landing = previousBottom <= obstacle.y + 2
                && player.y + player.height >= obstacle.y
                && player.x + player.width > obstacle.x + 4
                && player.x < obstacle.x + obstacle.width - 4
                && player.vy >= 0;
            if (landing) {
                player.y = obstacle.y - player.height;
                player.vy = 0;
                player.onGround = true;
            }
        }

        if (player.onGround) {
            if (!wasOnGround && previousBottom < player.y + player.height + 1) {
                // Landing puff.
                if (player.framesSinceGround > 10) {
                    burst(player.x + player.width / 2, player.y + player.height, ["#ffffff", "#e2e8f0"], 5, 1.6);
                }
            }
            player.framesSinceGround = 0;
        } else {
            player.framesSinceGround += 1;
        }

        // Bonus boxes: bump from below.
        for (let i = state.boxes.length - 1; i >= 0; i--) {
            const box = state.boxes[i];
            const headHit = player.vy < 0
                && player.y <= box.y + box.height
                && player.y - player.vy >= box.y + box.height - 2
                && player.x + player.width > box.x + 4
                && player.x < box.x + box.width - 4;
            if (!headHit) continue;
            player.y = box.y + box.height;
            player.vy = 2;
            state.boxes.splice(i, 1);
            burst(box.x + box.width / 2, box.y + box.height / 2, ["#ffd43b", "#fff3bf", "#f59f00"], 18, 4);
            const reward = state.lives < MAX_LIVES && Math.random() < 0.6 ? "heart" : "power";
            state.pickups.push({ type: reward, x: box.x + box.width / 2, y: box.y - 22, radius: 15, phase: 0 });
            sounds.pickup();
        }

        if (state.shootCooldown > 0) state.shootCooldown -= 1;
        if (player.shootFlash > 0) player.shootFlash -= 1;
        if (state.shootHeld) shoot();
    }

    // ---------- World update ----------

    function updateMovement() {
        const speed = world.speed;
        world.scroll += speed;

        state.apples.forEach((apple) => {
            apple.x -= speed;
            apple.y = apple.baseY + Math.sin(world.frame * 0.08 + apple.phase) * 4;
        });
        state.obstacles.forEach((obstacle) => { obstacle.x -= speed; });
        state.boxes.forEach((box) => { box.x -= speed; });
        state.pickups.forEach((pickup) => {
            pickup.x -= speed;
            pickup.phase += 0.08;
        });
        state.enemies.forEach((enemy) => {
            enemy.phase += 0.12;
            if (enemy.type === "slime") {
                enemy.x -= speed + 0.9;
            } else {
                enemy.x -= speed + 1.4;
                enemy.y = enemy.baseY + Math.sin(enemy.phase * 0.6) * 18;
            }
        });
        state.bullets.forEach((bullet) => { bullet.x += bullet.vx; });

        state.particles.forEach((particle) => {
            particle.x += particle.vx - speed * 0.3;
            particle.y += particle.vy;
            particle.vy += 0.18;
            particle.life -= 1;
        });
        state.floaters.forEach((floater) => {
            floater.y -= 0.9;
            floater.life -= 1;
        });

        // A gate that scrolled away unanswered comes back with the same question.
        const activeGateApples = state.apples.filter((apple) => apple.gate === state.gateId);
        if (state.gateActive && activeGateApples.length > 0 && activeGateApples.every((apple) => apple.x < -40)) {
            state.gateActive = false;
            state.combo = 0;
            showToast(`Missed it! Look again: ${state.question.text}`, "#ffe8a3", 80);
            updateHud();
        }

        state.apples = state.apples.filter((apple) => apple.x > -60);
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);
        state.boxes = state.boxes.filter((box) => box.x + box.width > -40);
        state.pickups = state.pickups.filter((pickup) => pickup.x > -40);
        state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -60);
        state.bullets = state.bullets.filter((bullet) => bullet.x < world.width + 40);
        state.particles = state.particles.filter((particle) => particle.life > 0);
        state.floaters = state.floaters.filter((floater) => floater.life > 0);
    }

    function handleApples() {
        for (let i = 0; i < state.apples.length; i++) {
            const apple = state.apples[i];
            if (!intersectsCircleRect(apple.x, apple.y, apple.radius - 3, player.x, player.y, player.width, player.height)) continue;

            // The first apple touched in a gate counts; its partner pops.
            const gate = apple.gate;
            state.apples.forEach((other) => {
                if (other.gate === gate && other !== apple) {
                    burst(other.x, other.y, ["#ffffff", "#ffd6d6"], 6, 2);
                }
            });
            state.apples = state.apples.filter((other) => other.gate !== gate);
            if (gate === state.gateId) state.gateActive = false;

            if (apple.isCorrect) solveQuestion(apple);
            else answerWrong(apple);
            return;
        }
    }

    function handlePickups() {
        for (let i = state.pickups.length - 1; i >= 0; i--) {
            const pickup = state.pickups[i];
            if (!intersectsCircleRect(pickup.x, pickup.y, pickup.radius, player.x, player.y, player.width, player.height)) continue;
            state.pickups.splice(i, 1);
            sounds.pickup();
            if (pickup.type === "power") {
                state.powerUntil = world.frame + 60 * 8;
                showToast("Power shot! ⚡", "#a5f3fc", 70);
                burst(pickup.x, pickup.y, ["#67e8f9", "#ffffff"], 14, 3);
            } else if (state.lives < MAX_LIVES) {
                state.lives += 1;
                floatText(pickup.x, pickup.y - 16, "+1 ❤", "#ff8fab", 22);
                burst(pickup.x, pickup.y, ["#ff6b8a", "#ffffff"], 14, 3);
            } else {
                state.score += 5;
                floatText(pickup.x, pickup.y - 16, "+5", "#fff59d", 22);
            }
            updateHud();
        }
    }

    function handleBullets() {
        for (let b = state.bullets.length - 1; b >= 0; b--) {
            const bullet = state.bullets[b];
            let consumed = false;

            for (let e = state.enemies.length - 1; e >= 0; e--) {
                const enemy = state.enemies[e];
                if (!intersectsCircleRect(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.width, enemy.height)) continue;
                enemy.hp -= bullet.power ? 2 : 1;
                enemy.flash = 6;
                if (!bullet.piercing) consumed = true;
                if (enemy.hp <= 0) {
                    state.enemies.splice(e, 1);
                    state.score += 5;
                    floatText(enemy.x + enemy.width / 2, enemy.y - 10, "+5", "#fff59d", 20);
                    burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type === "slime" ? ["#a78bfa", "#ddd6fe", "#ffffff"] : ["#475569", "#cbd5e1"], 16, 4);
                    sounds.stomp();
                } else {
                    playTone(300, 0.05, "square", 0.03);
                }
                break;
            }

            if (!consumed) {
                for (let o = state.obstacles.length - 1; o >= 0; o--) {
                    const obstacle = state.obstacles[o];
                    if (obstacle.type === "spike") continue;
                    if (!intersectsCircleRect(bullet.x, bullet.y, bullet.radius, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) continue;
                    consumed = true;
                    if (obstacle.type === "crate") {
                        state.obstacles.splice(o, 1);
                        state.score += 1;
                        burst(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, ["#c07a35", "#8a5420", "#f0c38a"], 14, 4);
                        playTone(240, 0.07, "triangle", 0.04);
                    } else {
                        burst(bullet.x, bullet.y, ["#ffffff", "#cbd5e1"], 4, 2);
                    }
                    break;
                }
            }

            if (consumed) state.bullets.splice(b, 1);
        }
    }

    function handleEnemiesAndHazards() {
        const px = player.x + 6;
        const py = player.y + 6;
        const pw = player.width - 12;
        const ph = player.height - 8;

        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const enemy = state.enemies[i];
            if (!intersectsRect(player.x, player.y, player.width, player.height, enemy.x + 4, enemy.y + 4, enemy.width - 8, enemy.height - 6)) continue;

            const stomp = player.vy > 0.5 && player.y + player.height - player.vy <= enemy.y + 14;
            if (stomp) {
                state.enemies.splice(i, 1);
                player.vy = JUMP_VELOCITY * 0.65;
                player.onGround = false;
                state.score += 5;
                floatText(enemy.x + enemy.width / 2, enemy.y - 10, "STOMP! +5", "#fff59d", 20);
                burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, ["#a78bfa", "#ddd6fe", "#ffffff"], 16, 4);
                sounds.stomp();
                continue;
            }
            hurt("Ouch! Jump on monsters or shoot them.");
            return;
        }

        for (const obstacle of state.obstacles) {
            const inset = obstacle.type === "spike" ? 6 : 3;
            const touching = intersectsRect(px, py, pw, ph, obstacle.x + inset, obstacle.y + inset, obstacle.width - inset * 2, obstacle.height - inset);
            if (!touching) continue;
            const standingOnTop = obstacle.standable && player.y + player.height <= obstacle.y + 4;
            if (standingOnTop) continue;
            hurt(obstacle.type === "spike" ? "Ouch, spikes! Jump over them." : "Bonk! Jump over it or shoot the crate.");
            return;
        }
    }

    function update() {
        world.frame += 1;
        if (world.shake > 0) world.shake *= 0.85;
        if (world.shake < 0.3) world.shake = 0;

        if (state.mode !== "playing") {
            // Idle scenery on the ready / game over screens.
            world.scroll += state.mode === "ready" ? 1.2 : 0;
            state.particles.forEach((particle) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.18;
                particle.life -= 1;
            });
            state.particles = state.particles.filter((particle) => particle.life > 0);
            return;
        }

        updatePlayer();
        updateSpawns();
        updateMovement();
        handleApples();
        if (state.mode !== "playing") return;
        handlePickups();
        handleBullets();
        handleEnemiesAndHazards();
    }

    // ---------- HUD (DOM) ----------

    let lastHudKey = "";

    function updateHud() {
        const key = [state.lives, state.question?.text, state.score, state.goldThisRun, state.combo, state.level, state.solvedThisLevel].join("|");
        if (key === lastHudKey) return;
        lastHudKey = key;

        if (arcadeLivesEl) {
            arcadeLivesEl.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
                `<span class="arcade-heart${i < state.lives ? "" : " empty"}">${i < state.lives ? "❤" : "♡"}</span>`
            ).join("");
            arcadeLivesEl.setAttribute("aria-label", `Lives: ${state.lives} of ${MAX_LIVES}`);
        }
        if (arcadeTargetEl && state.question) arcadeTargetEl.innerText = `${state.question.text} = ?`;
        if (arcadeScoreEl) arcadeScoreEl.innerText = `⭐ ${state.score}`;
        if (arcadePointsEl) arcadePointsEl.innerText = `🪙 ${getWalletGold()}`;
        if (arcadeComboEl) {
            arcadeComboEl.innerText = `🔥 x${state.combo}`;
            arcadeComboEl.classList.toggle("hidden", state.combo < 2);
        }
        if (arcadeCheckpointEl) arcadeCheckpointEl.innerText = `Field ${state.level} · ${state.solvedThisLevel}/${TASKS_PER_FIELD}`;
        if (arcadeProgressBarEl) arcadeProgressBarEl.style.width = `${(state.solvedThisLevel / TASKS_PER_FIELD) * 100}%`;
    }

    // ---------- Drawing: scenery ----------

    function drawSky(theme) {
        const sky = ctx.createLinearGradient(0, 0, 0, world.groundY);
        sky.addColorStop(0, theme.skyTop);
        sky.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, world.width, world.height);

        const sunX = world.width * 0.8;
        const sunY = 78;
        if (theme.night) {
            for (let i = 0; i < 60; i++) {
                const sx = (hash(i) * world.width * 1.3 - world.scroll * 0.02) % (world.width + 20);
                const x = sx < 0 ? sx + world.width + 20 : sx;
                const y = hash(i + 99) * (world.groundY - 140);
                const twinkle = 0.5 + 0.5 * Math.sin(world.frame * 0.05 + i);
                ctx.fillStyle = `rgba(255,255,255,${0.35 + twinkle * 0.6})`;
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.fillStyle = theme.sun;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = theme.skyTop;
            ctx.beginPath();
            ctx.arc(sunX + 11, sunY - 6, 22, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90);
            glow.addColorStop(0, "rgba(255,255,220,0.9)");
            glow.addColorStop(1, "rgba(255,255,220,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
            ctx.fillStyle = theme.sun;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        // Clouds
        const cloudSpacing = 290;
        const cloudScroll = world.scroll * 0.12;
        const firstCloud = Math.floor(cloudScroll / cloudSpacing) - 1;
        ctx.fillStyle = theme.night ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)";
        for (let k = firstCloud; k < firstCloud + Math.ceil(world.width / cloudSpacing) + 3; k++) {
            const x = k * cloudSpacing - cloudScroll + hash(k) * 120;
            const y = 40 + hash(k + 7) * 90;
            const s = 0.7 + hash(k + 3) * 0.6;
            ctx.beginPath();
            ctx.arc(x, y, 20 * s, 0, Math.PI * 2);
            ctx.arc(x + 22 * s, y - 10 * s, 24 * s, 0, Math.PI * 2);
            ctx.arc(x + 48 * s, y, 20 * s, 0, Math.PI * 2);
            ctx.rect(x, y, 48 * s, 20 * s);
            ctx.fill();
        }
    }

    function ridgeY(worldX, base, a1, f1, a2, f2) {
        return base - (Math.sin(worldX * f1) * a1 + Math.sin(worldX * f2 + 1.7) * a2);
    }

    function drawRidge(color, factor, base, a1, f1, a2, f2) {
        const offset = world.scroll * factor;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, world.groundY);
        for (let x = 0; x <= world.width + 16; x += 16) {
            ctx.lineTo(x, ridgeY(x + offset, base, a1, f1, a2, f2));
        }
        ctx.lineTo(world.width, world.groundY);
        ctx.closePath();
        ctx.fill();
    }

    function drawTrees(theme) {
        const factor = 0.45;
        const spacing = 150;
        const offset = world.scroll * factor;
        const first = Math.floor(offset / spacing) - 1;
        for (let k = first; k < first + Math.ceil(world.width / spacing) + 3; k++) {
            if (hash(k + 21) < 0.35) continue;
            const x = k * spacing - offset + hash(k) * 70;
            const groundAt = ridgeY(x + offset, world.groundY - 34, 16, 0.011, 8, 0.023);
            const h = 26 + hash(k + 5) * 22;
            ctx.fillStyle = "rgba(60,35,20,0.8)";
            ctx.fillRect(x - 3, groundAt - h * 0.5, 6, h * 0.5 + 6);
            ctx.fillStyle = theme.tree;
            ctx.beginPath();
            ctx.arc(x, groundAt - h * 0.65, h * 0.42, 0, Math.PI * 2);
            ctx.arc(x - h * 0.25, groundAt - h * 0.45, h * 0.3, 0, Math.PI * 2);
            ctx.arc(x + h * 0.25, groundAt - h * 0.45, h * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGround(theme) {
        const top = world.groundY;
        ctx.fillStyle = theme.dirt;
        ctx.fillRect(0, top, world.width, world.height - top);

        const tile = 48;
        const offset = world.scroll % tile;
        ctx.fillStyle = theme.dirtDark;
        for (let x = -offset - tile; x < world.width + tile; x += tile) {
            const k = Math.round((x + world.scroll) / tile);
            ctx.beginPath();
            ctx.ellipse(x + 14 + hash(k) * 16, top + 30 + hash(k + 4) * 22, 5, 3, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 34, top + 50 + hash(k + 8) * 8, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = theme.grass;
        ctx.fillRect(0, top, world.width, 12);
        ctx.fillStyle = theme.grassDark;
        ctx.fillRect(0, top + 12, world.width, 4);
        const bladeOffset = world.scroll % 16;
        ctx.fillStyle = theme.grass;
        for (let x = -bladeOffset; x < world.width + 16; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, top + 2);
            ctx.lineTo(x + 5, top - 6);
            ctx.lineTo(x + 10, top + 2);
            ctx.fill();
        }
    }

    function drawScenery() {
        const theme = currentTheme();
        drawSky(theme);
        drawRidge(theme.far, 0.2, world.groundY - 110, 38, 0.006, 16, 0.017);
        drawRidge(theme.near, 0.45, world.groundY - 34, 16, 0.011, 8, 0.023);
        drawTrees(theme);
        drawGround(theme);
    }

    // ---------- Drawing: sprites ----------

    function drawShadow(x, width, height = 6) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.ellipse(x, world.groundY + 3, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawBear() {
        const { x, y, width: w } = player;
        const airHeight = world.groundY - (y + player.height);
        drawShadow(x + w / 2, Math.max(18, 48 - airHeight * 0.15));

        if (isInvincible() && Math.floor(world.frame / 5) % 2 === 0) return;

        const running = player.onGround && state.mode !== "over";
        const t = world.frame * 0.35;
        const swing = running ? Math.sin(t) * 7 : 0;
        const bob = running ? Math.abs(Math.sin(t)) * -2 : 0;
        const by = y + bob;

        // Scarf tail
        ctx.fillStyle = "#ef4444";
        const flap = Math.sin(world.frame * 0.4) * 3;
        ctx.beginPath();
        ctx.moveTo(x + 18, by + 32);
        ctx.lineTo(x - 4, by + 30 + flap);
        ctx.lineTo(x - 2, by + 40 + flap);
        ctx.lineTo(x + 18, by + 38);
        ctx.fill();

        // Legs
        ctx.fillStyle = FUR.dark;
        if (player.onGround) {
            roundRect(x + 14 + swing, by + 50, 12, 15, 5);
            ctx.fill();
            roundRect(x + 30 - swing, by + 50, 12, 15, 5);
            ctx.fill();
        } else {
            roundRect(x + 12, by + 48, 12, 12, 5);
            ctx.fill();
            roundRect(x + 32, by + 46, 12, 12, 5);
            ctx.fill();
        }

        // Body
        ctx.fillStyle = FUR.main;
        ctx.beginPath();
        ctx.ellipse(x + 28, by + 40, 21, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FUR.light;
        ctx.beginPath();
        ctx.ellipse(x + 32, by + 44, 11, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Scarf
        ctx.fillStyle = "#ef4444";
        roundRect(x + 14, by + 28, 30, 7, 3);
        ctx.fill();

        // Arm (holds the apple blaster)
        ctx.fillStyle = FUR.dark;
        ctx.beginPath();
        ctx.ellipse(x + 44, by + 42 - swing * 0.3, 7, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#334155";
        roundRect(x + 46, by + 38 - swing * 0.3, 14, 7, 3);
        ctx.fill();
        if (player.shootFlash > 0) {
            ctx.fillStyle = hasPower() ? "rgba(103,232,249,0.9)" : "rgba(255,230,120,0.95)";
            ctx.beginPath();
            ctx.arc(x + 63, by + 41 - swing * 0.3, 6 + player.shootFlash, 0, Math.PI * 2);
            ctx.fill();
        }

        // Head
        const hx = x + 30;
        const hy = by + 16;
        ctx.fillStyle = FUR.main;
        ctx.beginPath();
        ctx.arc(hx - 11, hy - 12, 7, 0, Math.PI * 2);
        ctx.arc(hx + 10, hy - 12, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FUR.light;
        ctx.beginPath();
        ctx.arc(hx - 11, hy - 12, 3.5, 0, Math.PI * 2);
        ctx.arc(hx + 10, hy - 12, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FUR.main;
        ctx.beginPath();
        ctx.arc(hx, hy, 17, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = FUR.light;
        ctx.beginPath();
        ctx.ellipse(hx + 7, hy + 5, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1f2937";
        ctx.beginPath();
        ctx.ellipse(hx + 12, hy + 2, 3.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();

        const hurtFace = isInvincible();
        if (hurtFace) {
            ctx.strokeStyle = "#1f2937";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - 2, hy - 7);
            ctx.lineTo(hx + 4, hy - 3);
            ctx.moveTo(hx + 4, hy - 7);
            ctx.lineTo(hx - 2, hy - 3);
            ctx.stroke();
        } else {
            ctx.fillStyle = "#1f2937";
            ctx.beginPath();
            ctx.arc(hx + 1, hy - 5, 3, 0, Math.PI * 2);
            ctx.arc(hx + 12, hy - 6, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(hx + 2, hy - 6, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = "#1f2937";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (hurtFace) ctx.arc(hx + 7, hy + 12, 3, Math.PI * 1.1, Math.PI * 1.9);
        else ctx.arc(hx + 7, hy + 6, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,120,150,0.45)";
        ctx.beginPath();
        ctx.arc(hx - 6, hy + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawApple(apple) {
        const { x, y, radius: r } = apple;
        drawShadow(x, r * 1.2, 5);

        const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r * 1.1);
        body.addColorStop(0, "#ff7a7a");
        body.addColorStop(0.55, "#e53935");
        body.addColorStop(1, "#a61b1b");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y, r * 0.78, 0, Math.PI * 2);
        ctx.arc(x + r * 0.3, y, r * 0.78, 0, Math.PI * 2);
        ctx.arc(x, y + r * 0.12, r * 0.86, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#5b3a1a";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.62);
        ctx.quadraticCurveTo(x + 2, y - r * 0.95, x + 5, y - r * 1.12);
        ctx.stroke();
        ctx.lineCap = "butt";

        ctx.fillStyle = "#4caf50";
        ctx.beginPath();
        ctx.ellipse(x + 11, y - r * 0.95, 8, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(x - r * 0.42, y - r * 0.3, r * 0.18, r * 0.28, 0.5, 0, Math.PI * 2);
        ctx.fill();

        const text = String(apple.value);
        const fontSize = text.length >= 3 ? 17 : 21;
        ctx.font = `900 ${fontSize}px "Trebuchet MS", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(60,0,0,0.85)";
        ctx.strokeText(text, x, y + 3);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, y + 3);
    }

    function drawObstacle(obstacle) {
        const { x, y, width: w, height: h } = obstacle;

        if (obstacle.type === "spike") {
            const count = Math.round(w / 28);
            for (let i = 0; i < count; i++) {
                const sx = x + i * 28;
                const grad = ctx.createLinearGradient(sx, 0, sx + 28, 0);
                grad.addColorStop(0, "#f1f5f9");
                grad.addColorStop(0.5, "#cbd5e1");
                grad.addColorStop(1, "#64748b");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(sx, y + h);
                ctx.lineTo(sx + 14, y);
                ctx.lineTo(sx + 28, y + h);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "#334155";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            return;
        }

        if (obstacle.type === "crate") {
            ctx.fillStyle = "#c07a35";
            roundRect(x, y, w, h, 4);
            ctx.fill();
            ctx.strokeStyle = "#7a4a1c";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.strokeStyle = "#8a5420";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + h / 3);
            ctx.lineTo(x + w - 5, y + h / 3);
            ctx.moveTo(x + 5, y + (h * 2) / 3);
            ctx.lineTo(x + w - 5, y + (h * 2) / 3);
            ctx.stroke();
            ctx.strokeStyle = "#e7b27a";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 6);
            ctx.lineTo(x + w - 6, y + h - 6);
            ctx.stroke();
            return;
        }

        // Stone block
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, "#94a3b8");
        grad.addColorStop(1, "#475569");
        ctx.fillStyle = grad;
        roundRect(x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        roundRect(x + 5, y + 4, w - 10, 6, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(30,41,59,0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y + h * 0.35);
        ctx.lineTo(x + w * 0.45, y + h * 0.55);
        ctx.lineTo(x + w * 0.38, y + h * 0.75);
        ctx.stroke();
    }

    function drawBox(box) {
        const bob = Math.sin(world.frame * 0.1 + box.x * 0.01) * 2;
        const y = box.y + bob;
        ctx.fillStyle = "#facc15";
        roundRect(box.x, y, box.width, box.height, 6);
        ctx.fill();
        ctx.strokeStyle = "#a16207";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#a16207";
        [[5, 5], [box.width - 9, 5], [5, box.height - 9], [box.width - 9, box.height - 9]].forEach(([dx, dy]) => {
            ctx.fillRect(box.x + dx, y + dy, 4, 4);
        });
        ctx.font = "900 24px 'Trebuchet MS', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#a16207";
        ctx.lineWidth = 4;
        ctx.strokeText("?", box.x + box.width / 2, y + box.height / 2 + 1);
        ctx.fillText("?", box.x + box.width / 2, y + box.height / 2 + 1);
    }

    function drawEnemy(enemy) {
        const cx = enemy.x + enemy.width / 2;
        const flashing = enemy.flash > 0;
        if (enemy.flash > 0) enemy.flash -= 1;

        if (enemy.type === "slime") {
            const squash = Math.sin(enemy.phase) * 0.08;
            const w = enemy.width * (1 + squash);
            const h = enemy.height * (1 - squash);
            const bottom = enemy.y + enemy.height;
            drawShadow(cx, w * 0.9, 6);
            ctx.fillStyle = flashing ? "#ffffff" : "#8b5cf6";
            ctx.beginPath();
            ctx.moveTo(cx - w / 2, bottom);
            ctx.quadraticCurveTo(cx - w / 2, bottom - h * 1.15, cx, bottom - h);
            ctx.quadraticCurveTo(cx + w / 2, bottom - h * 1.15, cx + w / 2, bottom);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.ellipse(cx - w * 0.18, bottom - h * 0.7, 6, 4, -0.5, 0, Math.PI * 2);
            ctx.fill();
            drawEyes(cx - 9, bottom - h * 0.5, cx + 7, bottom - h * 0.5);
        } else {
            const flap = Math.sin(enemy.phase * 2.2);
            const cy = enemy.y + enemy.height / 2;
            ctx.fillStyle = flashing ? "#ffffff" : "#3f3f6e";
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy);
            ctx.lineTo(cx - 26, cy - 12 * flap);
            ctx.lineTo(cx - 18, cy + 6);
            ctx.closePath();
            ctx.moveTo(cx + 6, cy);
            ctx.lineTo(cx + 26, cy - 12 * flap);
            ctx.lineTo(cx + 18, cy + 6);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 8);
            ctx.lineTo(cx - 7, cy - 18);
            ctx.lineTo(cx - 3, cy - 10);
            ctx.moveTo(cx + 10, cy - 8);
            ctx.lineTo(cx + 7, cy - 18);
            ctx.lineTo(cx + 3, cy - 10);
            ctx.fill();
            drawEyes(cx - 5, cy - 1, cx + 5, cy - 1, "#fde047");
        }

        if (enemy.maxHp > 1) {
            for (let i = 0; i < enemy.maxHp; i++) {
                ctx.fillStyle = i < enemy.hp ? "#ff5d73" : "rgba(0,0,0,0.3)";
                ctx.beginPath();
                ctx.arc(cx - 6 + i * 12, enemy.y - 8, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawEyes(x1, y1, x2, y2, white = "#ffffff") {
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.arc(x1, y1, 5.5, 0, Math.PI * 2);
        ctx.arc(x2, y2, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Pupils look toward the bear.
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(x1 - 2, y1 + 1, 2.6, 0, Math.PI * 2);
        ctx.arc(x2 - 2, y2 + 1, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPickup(pickup) {
        const bob = Math.sin(pickup.phase) * 4;
        const x = pickup.x;
        const y = pickup.y + bob;
        const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
        glow.addColorStop(0, pickup.type === "heart" ? "rgba(255,120,160,0.55)" : "rgba(103,232,249,0.55)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 26, y - 26, 52, 52);

        if (pickup.type === "heart") {
            ctx.fillStyle = "#ff4d79";
            ctx.beginPath();
            ctx.moveTo(x, y + 12);
            ctx.bezierCurveTo(x - 18, y, x - 12, y - 14, x, y - 5);
            ctx.bezierCurveTo(x + 12, y - 14, x + 18, y, x, y + 12);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.beginPath();
            ctx.arc(x - 6, y - 4, 2.5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.moveTo(x + 3, y - 10);
        ctx.lineTo(x - 6, y + 2);
        ctx.lineTo(x, y + 2);
        ctx.lineTo(x - 3, y + 10);
        ctx.lineTo(x + 6, y - 2);
        ctx.lineTo(x, y - 2);
        ctx.closePath();
        ctx.fill();
    }

    function drawBullets() {
        state.bullets.forEach((bullet) => {
            const color = bullet.power ? "103,232,249" : "255,214,90";
            const trail = ctx.createLinearGradient(bullet.x - 30, 0, bullet.x, 0);
            trail.addColorStop(0, `rgba(${color},0)`);
            trail.addColorStop(1, `rgba(${color},0.6)`);
            ctx.fillStyle = trail;
            ctx.fillRect(bullet.x - 30, bullet.y - bullet.radius * 0.6, 30, bullet.radius * 1.2);
            ctx.fillStyle = `rgb(${color})`;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.beginPath();
            ctx.arc(bullet.x + 1, bullet.y - 1, bullet.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawEffects() {
        state.particles.forEach((particle) => {
            ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        });
        ctx.globalAlpha = 1;

        state.floaters.forEach((floater) => {
            ctx.globalAlpha = Math.min(1, floater.life / 20);
            outlinedText(floater.text, floater.x, floater.y, floater.size, floater.color);
        });
        ctx.globalAlpha = 1;
    }

    function outlinedText(text, x, y, size, color, stroke = "rgba(15,23,42,0.85)") {
        ctx.font = `900 ${size}px "Trebuchet MS", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(4, size * 0.22);
        ctx.strokeStyle = stroke;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    function drawMessages() {
        if (state.toast && world.frame < state.toast.until) {
            const age = world.frame - state.toast.start;
            const remaining = state.toast.until - world.frame;
            ctx.globalAlpha = Math.min(1, age / 6, remaining / 12);
            const size = world.width < 700 ? 22 : 24;
            outlinedText(state.toast.text, world.width / 2, 132, size, state.toast.color);
            ctx.globalAlpha = 1;
        }

        if (state.banner && world.frame < state.banner.until) {
            const age = world.frame - state.banner.start;
            const remaining = state.banner.until - world.frame;
            const pop = Math.min(1, age / 10);
            ctx.globalAlpha = Math.min(1, remaining / 20);
            ctx.fillStyle = "rgba(15,23,42,0.35)";
            ctx.fillRect(0, world.height * 0.36, world.width, 96);
            outlinedText(state.banner.title, world.width / 2, world.height * 0.36 + 38, Math.round(48 * (0.6 + pop * 0.4)), "#fde047");
            outlinedText(state.banner.subtitle, world.width / 2, world.height * 0.36 + 78, 20, "#ffffff");
            ctx.globalAlpha = 1;
        }

        if (state.mode === "playing" && hasPower()) {
            const left = Math.ceil((state.powerUntil - world.frame) / 60);
            outlinedText(`⚡ ${left}s`, world.width - 44, world.height - 24, 18, "#a5f3fc");
        }
    }

    function draw() {
        ctx.save();
        if (world.shake > 0) {
            ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
        }
        drawScenery();
        state.obstacles.forEach(drawObstacle);
        state.boxes.forEach(drawBox);
        state.pickups.forEach(drawPickup);
        state.apples.forEach(drawApple);
        state.enemies.forEach(drawEnemy);
        drawBullets();
        drawBear();
        drawEffects();
        ctx.restore();
        drawMessages();
    }

    // ---------- Canvas sizing ----------

    function resizeCanvas() {
        const cssWidth = arcadeCanvasWrap?.clientWidth || arcadeCanvas.clientWidth || 860;
        // Narrow screens get a narrower world, so everything is drawn bigger.
        world.width = cssWidth < 600 ? 560 : 860;
        world.height = 420;
        world.groundY = world.height - 64;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssHeight = cssWidth * (world.height / world.width);
        arcadeCanvas.width = Math.round(cssWidth * dpr);
        arcadeCanvas.height = Math.round(cssHeight * dpr);
        ctx.setTransform(arcadeCanvas.width / world.width, 0, 0, arcadeCanvas.height / world.height, 0, 0);

        if (player.onGround) player.y = world.groundY - player.height;
    }

    // ---------- Main loop ----------

    let lastTime = 0;
    let accumulator = 0;

    function loop(now) {
        requestAnimationFrame(loop);
        if (!isPanelVisible() || document.hidden) {
            lastTime = now;
            return;
        }

        if (!lastTime) lastTime = now;
        accumulator += Math.min(250, now - lastTime);
        lastTime = now;

        let steps = 0;
        while (accumulator >= STEP_MS && steps < 5) {
            update();
            accumulator -= STEP_MS;
            steps += 1;
        }
        if (steps === 5) accumulator = 0;

        updateHud();
        draw();
    }

    // ---------- Input ----------

    const JUMP_KEYS = ["ArrowUp", "KeyW", "Space"];
    const SHOOT_KEYS = ["KeyF", "KeyJ", "ArrowRight", "Enter"];

    function isTypingTarget(target) {
        return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    }

    window.addEventListener("keydown", (event) => {
        if (!isPanelVisible() || isTypingTarget(event.target)) return;

        if (JUMP_KEYS.includes(event.code)) {
            event.preventDefault();
            if (state.mode !== "playing") {
                if (!event.repeat && event.code === "Space") startGame();
                return;
            }
            if (!event.repeat) requestJump();
        }
        if (SHOOT_KEYS.includes(event.code)) {
            event.preventDefault();
            if (event.code === "Enter" && state.mode !== "playing") {
                startGame();
                return;
            }
            state.shootHeld = true;
            shoot();
        }
    });

    window.addEventListener("keyup", (event) => {
        if (JUMP_KEYS.includes(event.code)) releaseJump();
        if (SHOOT_KEYS.includes(event.code)) state.shootHeld = false;
    });

    function bindHoldButton(button, onDown, onUp) {
        if (!button) return;
        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            onDown();
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach((type) => button.addEventListener(type, onUp));
        button.addEventListener("contextmenu", (event) => event.preventDefault());
    }

    bindHoldButton(arcadeJumpBtn, requestJump, releaseJump);
    bindHoldButton(arcadeShootBtn, () => {
        state.shootHeld = true;
        shoot();
    }, () => {
        state.shootHeld = false;
    });

    arcadeCanvas.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        requestJump();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => arcadeCanvas.addEventListener(type, releaseJump));

    window.addEventListener("blur", () => {
        state.shootHeld = false;
        player.jumpHeld = false;
    });

    if (arcadeRestartBtn) arcadeRestartBtn.addEventListener("click", startGame);
    if (arcadeStartBtn) arcadeStartBtn.addEventListener("click", startGame);
    if (openRunnerBtn) openRunnerBtn.addEventListener("click", () => {
        showReadyScreen();
        requestAnimationFrame(resizeCanvas);
    });

    if (arcadeDifficultyButtonsWrap) {
        arcadeDifficultyButtonsWrap.querySelectorAll(".mode-btn").forEach((button) => {
            button.addEventListener("click", () => {
                // Let the page's own handler update data-selected first.
                setTimeout(showReadyScreen, 0);
            });
        });
    }

    if (window.ResizeObserver && arcadeCanvasWrap) {
        new ResizeObserver(resizeCanvas).observe(arcadeCanvasWrap);
    } else {
        window.addEventListener("resize", resizeCanvas);
    }

    resizeCanvas();
    showReadyScreen();
    requestAnimationFrame(loop);
}
