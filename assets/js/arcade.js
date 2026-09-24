const arcadeCanvas = document.getElementById("arcade-canvas");

if (arcadeCanvas) {
    function getScopedKey(baseKey) {
        const profileStore = window.MathsProfileStore;
        return profileStore ? profileStore.getScopedStorageKey(baseKey) : baseKey;
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
    const arcadeLeftBtn = document.getElementById("arcade-left-btn");
    const arcadeRightBtn = document.getElementById("arcade-right-btn");
    const arcadeRulesEl = document.getElementById("arcade-rules");
    const arcadeStartBtn = document.getElementById("arcade-start-btn");
    const openRunnerBtn = document.getElementById("open-runner-btn");
    const arcadeStepRules = document.getElementById("arcade-step-rules");
    const arcadeStepSetup = document.getElementById("arcade-step-setup");
    const arcadeNextBtn = document.getElementById("arcade-next-btn");
    const arcadeRulesLink = document.getElementById("arcade-rules-link");
    const arcadeCharPreview = document.getElementById("arcade-char-preview");
    const arcadeCharName = document.getElementById("arcade-char-name");
    const arcadeCharDots = document.getElementById("arcade-char-dots");
    const arcadeCharPrev = document.getElementById("arcade-char-prev");
    const arcadeCharNext = document.getElementById("arcade-char-next");
    const arcadePauseBtn = document.getElementById("arcade-pause-btn");
    const arcadePauseEl = document.getElementById("arcade-pause");
    const arcadeResumeBtn = document.getElementById("arcade-resume-btn");
    const arcadeQuitBtn = document.getElementById("arcade-quit-btn");

    let ctx = arcadeCanvas.getContext("2d");
    const audioCtx = window.AudioContext ? new AudioContext() : null;

    // Tuning
    const STEP_MS = 1000 / 60;
    const MAX_LIVES = 5;
    const TASKS_PER_FIELD = 5;
    const GRAVITY = 0.72;
    const JUMP_VELOCITY = -16;
    // Releasing the jump early still gives a jump high enough for the high orb and boxes.
    const JUMP_CUT_VELOCITY = -8;
    const JUMP_TAP_VELOCITY = -12;
    const COYOTE_FRAMES = 6;
    const JUMP_BUFFER_FRAMES = 7;
    const ORB_LOW_OFFSET = 36;
    const ORB_HIGH_OFFSET = 164;
    const BOX_OFFSET = 160;
    const MOVE_SPEED = 4;
    const SMALL_SIZE = { width: 54, height: 64 };
    const BIG_SIZE = { width: 70, height: 84 };
    const BIG_FRAMES = 60 * 20;
    const BIG_JUMP_BOOST = 1.1;
    const MUSHROOM_RISE_FRAMES = 36;
    // How fast the mushroom slides forward on screen: slower than the runner's → speed, so it can be caught.
    const MUSHROOM_SCREEN_SPEED = 0.9;
    const GROW_FLICKER_FRAMES = 42;

    const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
    const COLORS = {
        accent: "#22d3ee",
        good: "#34d399",
        bad: "#f43f5e",
        gold: "#fbbf24",
        text: "#f8fafc",
        muted: "#94a3b8"
    };

    const DIFFICULTY = {
        easy: { speed: 3.1, gap: 300, maxSpeedBonus: 1.4 },
        medium: { speed: 3.7, gap: 270, maxSpeedBonus: 1.8 },
        hard: { speed: 4.3, gap: 240, maxSpeedBonus: 2.2 }
    };

    const THEMES = [
        {
            name: "Dusk",
            sky: ["#0d1330", "#35285a", "#e8845c"],
            sun: "#ffd3a1",
            layers: ["#4b3b6e", "#2d2650", "#1a1733"],
            haze: "rgba(232,132,92,0.28)",
            ground: "#121026",
            groundDark: "#0a0918",
            edge: "#f59e0b",
            stars: true,
            aurora: false
        },
        {
            name: "Aurora",
            sky: ["#040a16", "#0a2030", "#0f4a47"],
            sun: "#e2fbf6",
            layers: ["#123448", "#0b2331", "#06141d"],
            haze: "rgba(45,212,191,0.18)",
            ground: "#06111a",
            groundDark: "#030a10",
            edge: "#2dd4bf",
            stars: true,
            aurora: true
        },
        {
            name: "Ember",
            sky: ["#14070e", "#461327", "#e0533d"],
            sun: "#ffc7a8",
            layers: ["#5a1d2e", "#38111f", "#200913"],
            haze: "rgba(224,83,61,0.25)",
            ground: "#15070d",
            groundDark: "#0b0307",
            edge: "#fb7185",
            stars: false,
            aurora: false
        },
        {
            name: "Glacier",
            sky: ["#0a1120", "#1d3a5f", "#9ccbe9"],
            sun: "#f0f9ff",
            layers: ["#3c5e86", "#274466", "#162a44"],
            haze: "rgba(156,203,233,0.22)",
            ground: "#0c1929",
            groundDark: "#070f1a",
            edge: "#7dd3fc",
            stars: true,
            aurora: false
        }
    ];

    const CHARACTERS = {
        astronaut: { name: "Astronaut", suit: ["#f1f5f9", "#94a3b8"], limb: "#1e293b", tail: "pack" },
        bear: {
            name: "Bear", suit: ["#a8703f", "#6f4526"], limb: "#5a3820", shoe: "#3f2716",
            fur: "#a8703f", furDark: "#80522c", light: "#ecd0aa", belly: "#d9b184", tail: "stub"
        },
        dog: {
            name: "Dog", suit: ["#e6bb80", "#b8864b"], limb: "#8a5f33", shoe: "#5c3b1c",
            fur: "#e6bb80", furDark: "#c9975a", light: "#fcebd2", ear: "#7a4a24", belt: "#dc2626", tail: "dog"
        },
        fox: {
            name: "Fox", suit: ["#f28a3c", "#c2551d"], limb: "#3b2314", shoe: "#1f130b",
            fur: "#f28a3c", light: "#fff4e6", dark: "#3b2314", belly: "#fde7cf", tail: "fox"
        },
        panda: {
            name: "Panda", suit: ["#f8fafc", "#cbd5e1"], limb: "#111827", shoe: "#000000",
            fur: "#f8fafc", tailColor: "#111827", tail: "stub"
        }
    };

    let selectedCharacter = "astronaut";
    try {
        const savedCharacter = localStorage.getItem(getScopedKey("arcadeCharacter"));
        if (savedCharacter && CHARACTERS[savedCharacter]) selectedCharacter = savedCharacter;
    } catch {
        // Keep the default character.
    }

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
        shootFlash: 0,
        big: false,
        bigUntil: 0,
        growAnim: 0,
        moveLeft: false,
        moveRight: false
    };

    const BASE_X = player.x;

    function setBig(isBig) {
        const bottom = player.y + player.height;
        const size = isBig ? BIG_SIZE : SMALL_SIZE;
        if (player.big !== isBig && state.mode === "playing") player.growAnim = GROW_FLICKER_FRAMES;
        player.big = isBig;
        player.bigUntil = isBig ? world.frame + BIG_FRAMES : 0;
        player.width = size.width;
        player.height = size.height;
        player.y = bottom - player.height;
    }

    const state = {
        mode: "ready", // ready | playing | paused | over
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
        orbs: [],
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
        const radius = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function withGlow(color, blur, drawFn) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        drawFn();
        ctx.restore();
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
        jump: () => playTone(420, 0.08, "triangle", 0.035),
        shoot: () => playTone(720, 0.05, "sine", 0.03),
        correct: () => {
            playTone(660, 0.1, "sine", 0.06);
            playTone(990, 0.14, "sine", 0.05, 80);
        },
        wrong: () => {
            playTone(220, 0.16, "triangle", 0.06);
            playTone(165, 0.22, "triangle", 0.05, 110);
        },
        hit: () => playTone(140, 0.18, "sawtooth", 0.05),
        stomp: () => playTone(520, 0.08, "triangle", 0.05),
        pickup: () => {
            playTone(740, 0.07, "sine", 0.05);
            playTone(1110, 0.09, "sine", 0.04, 60);
        },
        field: () => {
            [523, 659, 784, 1047].forEach((freq, i) => playTone(freq, 0.16, "sine", 0.05, i * 110));
        },
        over: () => {
            [392, 330, 262].forEach((freq, i) => playTone(freq, 0.22, "triangle", 0.05, i * 160));
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
        const next = profileStore?.addPoints ? profileStore.addPoints(safe) : getWalletGold() + safe;
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
            { y: world.groundY - ORB_LOW_OFFSET, value: correctIsHigh ? wrong : state.question.answer },
            { y: world.groundY - ORB_HIGH_OFFSET, value: correctIsHigh ? state.question.answer : wrong }
        ];
        lanes.forEach((lane, i) => {
            state.orbs.push({
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
        const needsLife = state.lives < MAX_LIVES;
        const table = [
            ["spike", 30],
            ["crate", 18],
            ["pillar", 10],
            ["crawler", 22],
            ["drone", state.level >= 2 || difficulty !== "easy" ? 12 : 0],
            ["box", 9],
            ["life", needsLife ? 7 : 0]
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
            state.obstacles.push({ type: "crate", x, y: world.groundY - size, width: size, height: size, standable: true });
            if (state.level >= 2 && Math.random() < 0.35) {
                state.obstacles.push({ type: "crate", x, y: world.groundY - size * 2, width: size, height: size, standable: true });
            }
        } else if (kind === "pillar") {
            const h = randInt(50, 70);
            state.obstacles.push({ type: "pillar", x, y: world.groundY - h, width: 50, height: h, standable: true });
        } else if (kind === "crawler") {
            state.enemies.push({ type: "crawler", x, y: world.groundY - 36, width: 50, height: 36, hp: 2, maxHp: 2, phase: Math.random() * 6 });
        } else if (kind === "drone") {
            const baseY = world.groundY - randInt(120, 160);
            state.enemies.push({ type: "drone", x, y: baseY, baseY, width: 48, height: 26, hp: 1, maxHp: 1, phase: Math.random() * 6 });
        } else if (kind === "box") {
            state.boxes.push({ x, y: world.groundY - BOX_OFFSET, width: 40, height: 40 });
        } else {
            state.pickups.push({ type: "life", x, y: world.groundY - randInt(50, 110), radius: 15, phase: 0 });
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
                vy: Math.sin(angle) * velocity - 1.2,
                life: 30 + randInt(0, 16),
                maxLife: 46,
                size: 1.5 + Math.random() * 2.5,
                color: pick(colors)
            });
        }
    }

    function floatText(x, y, text, color = COLORS.text, size = 20) {
        state.floaters.push({ x, y, text, color, size, life: 50, maxLife: 50 });
    }

    function showToast(text, color = COLORS.text, frames = 80) {
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
        state.orbs = [];
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
        state.banner = null;
        state.particles = [];
        state.floaters = [];
        world.scroll = 0;
        world.shake = 0;
        setBig(false);
        player.growAnim = 0;
        player.x = BASE_X;
        player.y = world.groundY - player.height;
        player.vy = 0;
        player.onGround = true;
        player.jumpBuffer = 0;
        player.moveLeft = false;
        player.moveRight = false;
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
        arcadePauseEl?.classList.add("hidden");
        showBanner("FIELD 1", currentTheme().name.toUpperCase(), 90);
        playTone(880, 0.12, "sine", 0.05);
    }

    function showReadyScreen() {
        state.mode = "ready";
        difficulty = arcadeDifficultyButtonsWrap?.dataset.selected || "easy";
        resetGame();
        arcadeOverlay?.classList.add("hidden");
        arcadePauseEl?.classList.add("hidden");
        arcadeRulesEl?.classList.remove("hidden");
        showStep(hasSeenRules() ? "setup" : "rules");
    }

    function pauseGame() {
        if (state.mode !== "playing") return;
        state.mode = "paused";
        state.shootHeld = false;
        player.jumpHeld = false;
        player.moveLeft = false;
        player.moveRight = false;
        arcadePauseEl?.classList.remove("hidden");
        arcadePauseBtn?.setAttribute("aria-pressed", "true");
    }

    function resumeGame() {
        if (state.mode !== "paused") return;
        unlockArcadeAudio();
        state.mode = "playing";
        arcadePauseEl?.classList.add("hidden");
        arcadePauseBtn?.setAttribute("aria-pressed", "false");
        lastTime = 0;
        accumulator = 0;
    }

    function togglePause() {
        if (state.mode === "playing") pauseGame();
        else if (state.mode === "paused") resumeGame();
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
            arcadeOverlayTitle.innerText = isNewBest && state.score > 0 ? "New personal best" : "Run complete";
            arcadeOverlayText.innerHTML = `
                <span class="arcade-result-grid">
                    <span><strong>${state.score}</strong>Score</span>
                    <span><strong>${state.solvedTotal}</strong>Solved</span>
                    <span><strong>${state.level}</strong>Field</span>
                    <span><strong>+${state.goldThisRun}</strong>Gold</span>
                </span>
                <span class="arcade-result-best">Best ${state.bestScore} · Top combo ×${state.bestCombo}</span>`;
            arcadeOverlay.classList.remove("hidden");
        }
        updateHud();
    }

    function hurt(reason) {
        if (isInvincible() || state.mode !== "playing") return;
        if (player.big) {
            // Like a mushroom in Mario: being big absorbs one hit.
            setBig(false);
            state.combo = 0;
            state.invincibleUntil = world.frame + 80;
            world.shake = 6;
            sounds.hit();
            burst(player.x + player.width / 2, player.y + player.height / 2, [COLORS.gold, "#ffffff"], 14, 3);
            showToast(reason ? `${reason} · shrunk instead of losing a life` : "Shrunk", "#fde68a", 90);
            updateHud();
            return;
        }
        state.lives -= 1;
        state.combo = 0;
        state.invincibleUntil = world.frame + 80;
        world.shake = 9;
        sounds.hit();
        burst(player.x + player.width / 2, player.y + player.height / 2, [COLORS.bad, "#fda4af", "#ffffff"], 16, 4);
        floatText(player.x + player.width / 2, player.y - 10, "−1", COLORS.bad, 22);
        if (reason) showToast(reason, "#fecdd3", 80);
        updateHud();
        if (state.lives <= 0) gameOver();
    }

    function solveQuestion(orb) {
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const points = 10 + Math.min(20, (state.combo - 1) * 2);
        state.score += points;
        state.solvedThisLevel += 1;
        state.solvedTotal += 1;
        awardGold(1);
        sounds.correct();
        burst(orb.x, orb.y, [COLORS.good, "#a7f3d0", "#ffffff", COLORS.accent], 22, 5);
        floatText(orb.x, orb.y - 34, `+${points}`, COLORS.good, 24);
        showToast(state.combo >= 3 ? `Correct · Combo ×${state.combo}` : "Correct", "#bbf7d0", 60);

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
        showBanner(`FIELD ${state.level}`, `${currentTheme().name.toUpperCase()}  ·  +1 LIFE  ·  +2 GOLD`, 150);
    }

    function answerWrong(orb) {
        sounds.wrong();
        burst(orb.x, orb.y, [COLORS.bad, "#fda4af", "#ffffff"], 14, 4);
        floatText(orb.x, orb.y - 34, `${orb.value}`, COLORS.bad, 22);
        state.invincibleUntil = 0;
        hurt(`${orb.value} is not right — try again`);
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
            x: player.x + player.width + 6,
            y: player.y + player.height * 0.48,
            radius: powered ? 6 : 4,
            vx: powered ? 12 : 10.5,
            piercing: powered,
            power: powered
        });
        sounds.shoot();
    }

    function updatePlayer() {
        if (player.big && world.frame >= player.bigUntil) {
            setBig(false);
            showToast("Back to normal size", "#fde68a", 70);
        }

        const direction = (player.moveRight ? 1 : 0) - (player.moveLeft ? 1 : 0);
        if (direction !== 0) {
            const maxX = world.width * 0.6 - player.width;
            player.x = Math.max(24, Math.min(maxX, player.x + direction * MOVE_SPEED));
        }

        const previousBottom = player.y + player.height;

        if (player.jumpBuffer > 0) {
            player.jumpBuffer -= 1;
            if (player.onGround || player.framesSinceGround < COYOTE_FRAMES) {
                player.vy = (player.jumpHeld ? JUMP_VELOCITY : JUMP_TAP_VELOCITY) * (player.big ? BIG_JUMP_BOOST : 1);
                player.onGround = false;
                player.framesSinceGround = COYOTE_FRAMES;
                player.jumpBuffer = 0;
                sounds.jump();
                burst(player.x + player.width / 2, player.y + player.height, [currentTheme().edge, "#ffffff"], 6, 1.8);
            }
        }

        player.vy = Math.min(player.vy + GRAVITY, 16);
        player.y += player.vy;
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
            if (player.framesSinceGround > 10) {
                burst(player.x + player.width / 2, player.y + player.height, [currentTheme().edge, "#ffffff"], 5, 1.4);
            }
            player.framesSinceGround = 0;
        } else {
            player.framesSinceGround += 1;
        }

        // Supply boxes open on any touch (usually a jump into them from below).
        for (const box of state.boxes) {
            if (box.used) continue;
            if (!intersectsRect(player.x, player.y, player.width, player.height, box.x - 4, box.y - 4, box.width + 8, box.height + 8)) continue;
            if (player.vy < 0) player.vy = 2;
            // Like the ? block in Super Mario: it bumps up, empties, and the reward comes out of the top.
            box.used = true;
            box.bump = 10;
            burst(box.x + box.width / 2, box.y, [COLORS.accent, "#ffffff", COLORS.gold], 14, 3);
            let reward = state.lives < MAX_LIVES && Math.random() < 0.6 ? "life" : "power";
            if (!player.big && Math.random() < 0.5) reward = "grow";
            // Life and power are granted straight away; the mushroom has to be caught.
            if (reward === "grow") {
                state.pickups.push({
                    type: "grow",
                    stage: "rise",
                    box,
                    rise: 0,
                    x: box.x + box.width / 2,
                    y: box.y + box.height / 2,
                    radius: 16,
                    vy: 0,
                    phase: 0
                });
                playTone(330, 0.08, "square", 0.03);
                playTone(440, 0.08, "square", 0.03, 90);
                playTone(550, 0.1, "square", 0.03, 180);
                showToast("A mushroom! Catch it — hold → to run after it", "#fde68a", 120);
                updateHud();
                continue;
            } else if (reward === "life") {
                state.lives += 1;
                floatText(box.x + box.width / 2, box.y - 12, "+1 life", "#fda4af", 18);
            } else {
                state.powerUntil = world.frame + 60 * 8;
                floatText(box.x + box.width / 2, box.y - 12, "Power shot", "#a5f3fc", 18);
            }
            sounds.pickup();
            updateHud();
        }

        if (state.shootCooldown > 0) state.shootCooldown -= 1;
        if (player.shootFlash > 0) player.shootFlash -= 1;
        if (player.growAnim > 0) player.growAnim -= 1;
        if (state.shootHeld) shoot();
    }

    // ---------- World update ----------

    function updateMovement() {
        const speed = world.speed;
        world.scroll += speed;

        state.orbs.forEach((orb) => {
            orb.x -= speed;
            orb.y = orb.baseY + Math.sin(world.frame * 0.07 + orb.phase) * 3;
        });
        state.obstacles.forEach((obstacle) => { obstacle.x -= speed; });
        state.boxes.forEach((box) => {
            box.x -= speed;
            if (box.bump > 0) box.bump -= 1;
        });
        state.pickups.forEach((pickup) => {
            pickup.phase += 0.08;
            if (pickup.type === "grow") {
                updateMushroom(pickup);
                return;
            }
            pickup.x -= speed;
        });
        state.enemies.forEach((enemy) => {
            enemy.phase += 0.12;
            if (enemy.type === "crawler") {
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
            particle.vy += 0.15;
            particle.life -= 1;
        });
        state.floaters.forEach((floater) => {
            floater.y -= 0.8;
            floater.life -= 1;
        });

        // A gate that scrolled away unanswered comes back with the same question.
        const activeGateOrbs = state.orbs.filter((orb) => orb.gate === state.gateId);
        if (state.gateActive && activeGateOrbs.length > 0 && activeGateOrbs.every((orb) => orb.x < -40)) {
            state.gateActive = false;
            state.combo = 0;
            showToast(`Missed — ${state.question.text} is coming back`, "#fde68a", 80);
            updateHud();
        }

        state.orbs = state.orbs.filter((orb) => orb.x > -60);
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);
        state.boxes = state.boxes.filter((box) => box.x + box.width > -40);
        state.pickups = state.pickups.filter((pickup) => pickup.x > -40 && pickup.x < world.width + 60);
        state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -60);
        state.bullets = state.bullets.filter((bullet) => bullet.x < world.width + 40);
        state.particles = state.particles.filter((particle) => particle.life > 0);
        state.floaters = state.floaters.filter((floater) => floater.life > 0);
    }

    function updateMushroom(mushroom) {
        const r = mushroom.radius;

        if (mushroom.stage === "rise") {
            // Slowly rises out of the top of the block, moving with it.
            const box = mushroom.box;
            mushroom.rise += 1;
            const progress = Math.min(1, mushroom.rise / MUSHROOM_RISE_FRAMES);
            const startY = box.y + box.height / 2;
            const endY = box.y - r;
            mushroom.x = box.x + box.width / 2;
            mushroom.y = startY + (endY - startY) * progress;
            if (progress >= 1) {
                mushroom.stage = "walk";
                mushroom.vy = 0;
            }
            return;
        }

        // The block keeps scrolling while the mushroom rises, so first it hurries out in front
        // of the runner; from there it walks on slowly and has to be chased with →.
        const runnerFront = player.x + player.width;
        if (!mushroom.ready && mushroom.x - r > runnerFront + 12) mushroom.ready = true;
        let screenSpeed = mushroom.ready ? MUSHROOM_SCREEN_SPEED : 3.4;
        // Never run beyond the part of the screen the runner can reach.
        if (mushroom.x > world.width * 0.55) screenSpeed = Math.min(screenSpeed, -0.5);
        mushroom.x += screenSpeed;
        mushroom.vy = Math.min(mushroom.vy + 0.5, 9);

        let floor = world.groundY - r;
        const surfaces = [
            ...state.boxes,
            ...state.obstacles.filter((obstacle) => obstacle.standable)
        ];
        surfaces.forEach((surface) => {
            const above = mushroom.y <= surface.y - r + 1;
            const overlaps = mushroom.x + r * 0.6 > surface.x && mushroom.x - r * 0.6 < surface.x + surface.width;
            if (above && overlaps) floor = Math.min(floor, surface.y - r);
        });

        const onFloor = mushroom.y >= floor - 0.5;
        if (onFloor) {
            // Hop over anything in its way instead of getting stuck.
            const blocked = state.obstacles.some((obstacle) => {
                const gap = obstacle.x - (mushroom.x + r);
                return gap < 26 && gap > -r && obstacle.y < mushroom.y + r - 2;
            });
            if (blocked) mushroom.vy = -9.5;
        }

        mushroom.y += mushroom.vy;
        if (mushroom.y >= floor) {
            mushroom.y = floor;
            mushroom.vy = 0;
        }
    }

    function handleOrbs() {
        for (let i = 0; i < state.orbs.length; i++) {
            const orb = state.orbs[i];
            if (!intersectsCircleRect(orb.x, orb.y, orb.radius - 3, player.x, player.y, player.width, player.height)) continue;

            // The first orb touched in a gate counts; its partner dissolves.
            const gate = orb.gate;
            state.orbs.forEach((other) => {
                if (other.gate === gate && other !== orb) burst(other.x, other.y, ["#ffffff", COLORS.muted], 6, 2);
            });
            state.orbs = state.orbs.filter((other) => other.gate !== gate);
            if (gate === state.gateId) state.gateActive = false;

            if (orb.isCorrect) solveQuestion(orb);
            else answerWrong(orb);
            return;
        }
    }

    function handlePickups() {
        for (let i = state.pickups.length - 1; i >= 0; i--) {
            const pickup = state.pickups[i];
            if (pickup.type === "grow" && !pickup.ready) continue;
            if (!intersectsCircleRect(pickup.x, pickup.y, pickup.radius + 4, player.x, player.y, player.width, player.height)) continue;
            state.pickups.splice(i, 1);
            sounds.pickup();
            if (pickup.type === "grow") {
                setBig(true);
                showToast("Super size for 20 s — higher jumps, survives one hit", "#fde68a", 110);
                burst(pickup.x, pickup.y, [COLORS.gold, "#ffffff", "#f97316"], 20, 4);
                [392, 494, 587, 784, 988, 1175].forEach((freq, n) => playTone(freq, 0.07, "square", 0.03, n * 55));
            } else if (pickup.type === "power") {
                state.powerUntil = world.frame + 60 * 8;
                showToast("Power shot active", "#a5f3fc", 70);
                burst(pickup.x, pickup.y, [COLORS.accent, "#ffffff"], 14, 3);
            } else if (state.lives < MAX_LIVES) {
                state.lives += 1;
                floatText(pickup.x, pickup.y - 16, "+1 life", "#fda4af", 18);
                burst(pickup.x, pickup.y, [COLORS.bad, "#ffffff"], 14, 3);
            } else {
                state.score += 5;
                floatText(pickup.x, pickup.y - 16, "+5", COLORS.gold, 18);
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
                if (!intersectsCircleRect(bullet.x, bullet.y, bullet.radius + 2, enemy.x, enemy.y, enemy.width, enemy.height)) continue;
                enemy.hp -= bullet.power ? 2 : 1;
                enemy.flash = 6;
                if (!bullet.piercing) consumed = true;
                if (enemy.hp <= 0) {
                    state.enemies.splice(e, 1);
                    state.score += 5;
                    floatText(enemy.x + enemy.width / 2, enemy.y - 12, "+5", COLORS.gold, 18);
                    burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, [COLORS.bad, "#ffffff", "#64748b"], 16, 4);
                    sounds.stomp();
                } else {
                    playTone(300, 0.05, "square", 0.025);
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
                        burst(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, ["#64748b", "#cbd5e1", COLORS.gold], 14, 4);
                        playTone(240, 0.07, "triangle", 0.04);
                    } else {
                        burst(bullet.x, bullet.y, ["#ffffff", COLORS.accent], 4, 2);
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
                floatText(enemy.x + enemy.width / 2, enemy.y - 12, "+5", COLORS.gold, 18);
                burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, [COLORS.bad, "#ffffff", "#64748b"], 16, 4);
                sounds.stomp();
                continue;
            }
            hurt("Hit — jump on enemies or shoot them");
            return;
        }

        for (const obstacle of state.obstacles) {
            const inset = obstacle.type === "spike" ? 6 : 3;
            const touching = intersectsRect(px, py, pw, ph, obstacle.x + inset, obstacle.y + inset, obstacle.width - inset * 2, obstacle.height - inset);
            if (!touching) continue;
            const standingOnTop = obstacle.standable && player.y + player.height <= obstacle.y + 4;
            if (standingOnTop) continue;
            hurt(obstacle.type === "spike" ? "Spikes — jump over them" : "Blocked — jump over or shoot crates");
            return;
        }
    }

    function update() {
        if (state.mode === "paused") return;
        world.frame += 1;
        if (world.shake > 0) world.shake *= 0.85;
        if (world.shake < 0.3) world.shake = 0;

        if (state.mode !== "playing") {
            world.scroll += state.mode === "ready" ? 1.2 : 0;
            state.particles.forEach((particle) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.15;
                particle.life -= 1;
            });
            state.particles = state.particles.filter((particle) => particle.life > 0);
            return;
        }

        updatePlayer();
        updateSpawns();
        updateMovement();
        handleOrbs();
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
                `<span class="arcade-life${i < state.lives ? " on" : ""}"></span>`
            ).join("");
            arcadeLivesEl.setAttribute("aria-label", `Lives: ${state.lives} of ${MAX_LIVES}`);
        }
        if (arcadeTargetEl && state.question) arcadeTargetEl.innerText = `${state.question.text} = ?`;
        if (arcadeScoreEl) arcadeScoreEl.innerText = String(state.score);
        if (arcadePointsEl) arcadePointsEl.innerText = String(getWalletGold());
        if (arcadeComboEl) {
            arcadeComboEl.innerText = `Combo ×${state.combo}`;
            arcadeComboEl.classList.toggle("hidden", state.combo < 2);
        }
        if (arcadeCheckpointEl) arcadeCheckpointEl.innerText = `Field ${state.level} · ${state.solvedThisLevel}/${TASKS_PER_FIELD}`;
        if (arcadeProgressBarEl) arcadeProgressBarEl.style.width = `${(state.solvedThisLevel / TASKS_PER_FIELD) * 100}%`;
    }

    // ---------- Drawing: scenery ----------

    function drawSky(theme) {
        const horizon = world.groundY;
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, theme.sky[0]);
        sky.addColorStop(0.55, theme.sky[1]);
        sky.addColorStop(1, theme.sky[2]);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, world.width, world.height);

        if (theme.stars) {
            for (let i = 0; i < 70; i++) {
                const sx = (hash(i) * (world.width + 40) - world.scroll * 0.015) % (world.width + 40);
                const x = sx < 0 ? sx + world.width + 40 : sx;
                const y = hash(i + 99) * horizon * 0.55;
                const twinkle = 0.5 + 0.5 * Math.sin(world.frame * 0.04 + i * 1.3);
                const alpha = (0.15 + twinkle * 0.5) * (1 - y / (horizon * 0.6));
                ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
                const size = hash(i + 5) > 0.85 ? 1.8 : 1.1;
                ctx.fillRect(x, y, size, size);
            }
        }

        if (theme.aurora) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let band = 0; band < 3; band++) {
                const grad = ctx.createLinearGradient(0, 40, 0, 190);
                grad.addColorStop(0, "rgba(45,212,191,0)");
                grad.addColorStop(0.5, band === 1 ? "rgba(129,140,248,0.16)" : "rgba(45,212,191,0.16)");
                grad.addColorStop(1, "rgba(45,212,191,0)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                for (let x = 0; x <= world.width + 20; x += 20) {
                    const wx = x + world.scroll * 0.05 + band * 140;
                    const y = 70 + band * 22 + Math.sin(wx * 0.008 + world.frame * 0.01) * 26;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                for (let x = world.width + 20; x >= 0; x -= 20) {
                    const wx = x + world.scroll * 0.05 + band * 140;
                    const y = 150 + band * 22 + Math.sin(wx * 0.006 + 1 + world.frame * 0.012) * 30;
                    ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // Low sun / moon sitting behind the ridges.
        const sunX = world.width * 0.72;
        const sunY = horizon - 150;
        const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 170);
        glow.addColorStop(0, theme.sun);
        glow.addColorStop(0.18, `${theme.sun}66`);
        glow.addColorStop(1, `${theme.sun}00`);
        ctx.fillStyle = glow;
        ctx.fillRect(sunX - 170, sunY - 170, 340, 340);
        ctx.fillStyle = theme.sun;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
        ctx.fill();
    }

    function ridgeY(worldX, base, amp, freq, sharp) {
        const a = Math.sin(worldX * freq);
        const b = Math.sin(worldX * freq * 2.3 + 1.7);
        const c = Math.sin(worldX * freq * 5.1 + 0.4);
        const peaks = sharp ? 1 - Math.abs(a) : (a + 1) / 2;
        return base - (peaks * amp + b * amp * 0.35 + c * amp * 0.08);
    }

    function drawRidge(color, factor, base, amp, freq, sharp) {
        const offset = world.scroll * factor;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, world.groundY + 2);
        for (let x = 0; x <= world.width + 12; x += 12) {
            ctx.lineTo(x, ridgeY(x + offset, base, amp, freq, sharp));
        }
        ctx.lineTo(world.width, world.groundY + 2);
        ctx.closePath();
        ctx.fill();
    }

    function drawHaze(color, top, bottom) {
        const haze = ctx.createLinearGradient(0, top, 0, bottom);
        haze.addColorStop(0, "rgba(0,0,0,0)");
        haze.addColorStop(1, color);
        ctx.fillStyle = haze;
        ctx.fillRect(0, top, world.width, bottom - top);
    }

    function drawPines(color) {
        const factor = 0.55;
        const spacing = 38;
        const offset = world.scroll * factor;
        const first = Math.floor(offset / spacing) - 1;
        ctx.fillStyle = color;
        for (let k = first; k < first + Math.ceil(world.width / spacing) + 3; k++) {
            if (hash(k + 13) < 0.45) continue;
            const x = k * spacing - offset + hash(k) * 20;
            const h = 26 + hash(k + 3) * 34;
            const base = world.groundY + 2;
            ctx.beginPath();
            ctx.moveTo(x, base - h);
            ctx.lineTo(x + h * 0.22, base);
            ctx.lineTo(x - h * 0.22, base);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawGround(theme) {
        const top = world.groundY;
        const ground = ctx.createLinearGradient(0, top, 0, world.height);
        ground.addColorStop(0, theme.ground);
        ground.addColorStop(1, theme.groundDark);
        ctx.fillStyle = ground;
        ctx.fillRect(0, top, world.width, world.height - top);

        // Perspective lines give a sense of speed without clutter.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, world.width, world.height - top);
        ctx.clip();
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        const spacing = 70;
        const offset = world.scroll % spacing;
        for (let x = -offset - spacing * 4; x < world.width + spacing * 4; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x + (x - world.width / 2) * 0.9, world.height);
            ctx.stroke();
        }
        [0.35, 0.7].forEach((ratio) => {
            const y = top + (world.height - top) * ratio;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(world.width, y);
            ctx.stroke();
        });
        ctx.restore();

        // Glowing horizon edge.
        withGlow(theme.edge, 12, () => {
            ctx.fillStyle = theme.edge;
            ctx.fillRect(0, top - 1, world.width, 2);
        });
    }

    function drawScenery() {
        const theme = currentTheme();
        drawSky(theme);
        drawRidge(theme.layers[0], 0.12, world.groundY - 95, 95, 0.0045, true);
        drawHaze(theme.haze, world.groundY - 140, world.groundY);
        drawRidge(theme.layers[1], 0.28, world.groundY - 40, 60, 0.008, false);
        drawHaze(theme.haze, world.groundY - 70, world.groundY);
        drawRidge(theme.layers[2], 0.5, world.groundY - 8, 26, 0.013, false);
        drawPines(theme.layers[2]);
        drawGround(theme);
    }

    // ---------- Drawing: sprites ----------

    function drawShadow(x, width) {
        const grad = ctx.createRadialGradient(x, world.groundY + 2, 1, x, world.groundY + 2, width / 2);
        grad.addColorStop(0, "rgba(0,0,0,0.45)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, world.groundY + 2, width / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawRunner() {
        let scale = player.width / SMALL_SIZE.width;
        if (player.growAnim > 0) {
            // Flicker between the two sizes, like Super Mario when growing or shrinking.
            const showBig = Math.floor(player.growAnim / 6) % 2 === (player.big ? 0 : 1);
            scale = (showBig ? BIG_SIZE.width : SMALL_SIZE.width) / SMALL_SIZE.width;
        }
        const airHeight = world.groundY - (player.y + player.height);
        drawShadow(player.x + player.width / 2, Math.max(20, 56 - airHeight * 0.18) * scale);

        if (isInvincible() && Math.floor(world.frame / 5) % 2 === 0) return;

        const running = player.onGround && state.mode !== "over";
        const t = world.frame * 0.32;

        // The sprite is drawn at its small size and scaled up from the feet when big.
        ctx.save();
        ctx.translate(player.x, player.y + player.height);
        ctx.scale(scale, scale);
        drawCharacter(selectedCharacter, 0, -SMALL_SIZE.height, {
            swing: running ? Math.sin(t) * 8 : 0,
            bob: running ? -Math.abs(Math.sin(t)) * 2 : 0,
            onGround: player.onGround,
            streaks: running && state.mode === "playing",
            hurt: isInvincible(),
            shootFlash: player.shootFlash,
            power: hasPower(),
            edge: currentTheme().edge,
            wag: Math.sin(world.frame * 0.3)
        });
        ctx.restore();
    }

    function drawEye(ex, ey, hurt, radius = 2.4) {
        if (hurt) {
            ctx.strokeStyle = "#111827";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(ex - 2.5, ey - 2.5);
            ctx.lineTo(ex + 2.5, ey + 2.5);
            ctx.moveTo(ex + 2.5, ey - 2.5);
            ctx.lineTo(ex - 2.5, ey + 2.5);
            ctx.stroke();
            return;
        }
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(ex, ey, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex + 0.8, ey - 0.9, radius * 0.38, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawTail(look, x, by, pose) {
        const wag = pose.wag * 3;
        if (look.tail === "fox") {
            ctx.fillStyle = look.fur;
            ctx.beginPath();
            ctx.moveTo(x + 15, by + 38);
            ctx.quadraticCurveTo(x - 6, by + 30 + wag, x - 14, by + 38 + wag);
            ctx.quadraticCurveTo(x - 2, by + 48 + wag, x + 16, by + 45);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = look.light;
            ctx.beginPath();
            ctx.ellipse(x - 10, by + 39 + wag, 5, 4, -0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (look.tail === "dog") {
            ctx.strokeStyle = look.fur;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x + 15, by + 36);
            ctx.quadraticCurveTo(x + 6, by + 30, x + 4 + wag, by + 22);
            ctx.stroke();
            ctx.lineCap = "butt";
        } else if (look.tail === "stub") {
            ctx.fillStyle = look.tailColor || look.fur;
            ctx.beginPath();
            ctx.arc(x + 13, by + 40, 4.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (look.tail === "pack") {
            ctx.fillStyle = "#cbd5e1";
            roundRect(x + 7, by + 26, 9, 20, 3);
            ctx.fill();
            ctx.fillStyle = "#64748b";
            ctx.fillRect(x + 9, by + 30, 5, 2);
        }
    }

    function drawHead(id, look, hx, hy, pose) {
        const hurt = pose.hurt;

        if (id === "astronaut") {
            const helmet = ctx.createLinearGradient(hx - 14, hy - 14, hx + 14, hy + 14);
            helmet.addColorStop(0, "#ffffff");
            helmet.addColorStop(1, "#a3b1c6");
            ctx.fillStyle = helmet;
            ctx.beginPath();
            ctx.arc(hx, hy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#0b1222";
            roundRect(hx - 1, hy - 7, 17, 11, 5);
            ctx.fill();
            withGlow(hurt ? COLORS.bad : pose.edge, 10, () => {
                ctx.fillStyle = hurt ? COLORS.bad : pose.edge;
                roundRect(hx + 3, hy - 3, 11, 3, 1.5);
                ctx.fill();
            });
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - 8, hy - 10);
            ctx.lineTo(hx - 12, hy - 18);
            ctx.stroke();
            ctx.fillStyle = pose.edge;
            ctx.beginPath();
            ctx.arc(hx - 12, hy - 19, 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        if (id === "fox") {
            ctx.fillStyle = look.fur;
            ctx.beginPath();
            ctx.moveTo(hx - 11, hy - 6);
            ctx.lineTo(hx - 7, hy - 24);
            ctx.lineTo(hx - 1, hy - 11);
            ctx.moveTo(hx + 1, hy - 11);
            ctx.lineTo(hx + 8, hy - 24);
            ctx.lineTo(hx + 12, hy - 6);
            ctx.fill();
            ctx.fillStyle = look.dark;
            ctx.beginPath();
            ctx.moveTo(hx - 8.5, hy - 19);
            ctx.lineTo(hx - 7, hy - 24);
            ctx.lineTo(hx - 5, hy - 19);
            ctx.moveTo(hx + 6.5, hy - 19);
            ctx.lineTo(hx + 8, hy - 24);
            ctx.lineTo(hx + 9.8, hy - 19);
            ctx.fill();
            ctx.fillStyle = look.fur;
            ctx.beginPath();
            ctx.arc(hx, hy, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = look.light;
            ctx.beginPath();
            ctx.moveTo(hx + 1, hy - 1);
            ctx.quadraticCurveTo(hx + 12, hy - 2, hx + 20, hy + 4);
            ctx.quadraticCurveTo(hx + 10, hy + 13, hx - 1, hy + 9);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#111827";
            ctx.beginPath();
            ctx.arc(hx + 19, hy + 4, 2.4, 0, Math.PI * 2);
            ctx.fill();
            drawEye(hx + 5, hy - 4, hurt, 2.3);
            return;
        }

        if (id === "panda") {
            ctx.fillStyle = "#111827";
            ctx.beginPath();
            ctx.arc(hx - 9, hy - 11, 6, 0, Math.PI * 2);
            ctx.arc(hx + 8, hy - 12, 6, 0, Math.PI * 2);
            ctx.fill();
            const head = ctx.createLinearGradient(hx, hy - 14, hx, hy + 14);
            head.addColorStop(0, "#ffffff");
            head.addColorStop(1, "#e2e8f0");
            ctx.fillStyle = head;
            ctx.beginPath();
            ctx.arc(hx, hy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#111827";
            ctx.beginPath();
            ctx.ellipse(hx + 4, hy - 3, 5, 4, -0.5, 0, Math.PI * 2);
            ctx.fill();
            if (hurt) {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(hx + 2, hy - 5);
                ctx.lineTo(hx + 6, hy - 1);
                ctx.moveTo(hx + 6, hy - 5);
                ctx.lineTo(hx + 2, hy - 1);
                ctx.stroke();
            } else {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(hx + 5, hy - 3.5, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = "#e5e7eb";
            ctx.beginPath();
            ctx.ellipse(hx + 8, hy + 5, 6.5, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#111827";
            ctx.beginPath();
            ctx.ellipse(hx + 12, hy + 3, 2.6, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Bear and dog share a round head.
        if (id === "bear") {
            ctx.fillStyle = look.fur;
            ctx.beginPath();
            ctx.arc(hx - 9, hy - 11, 6, 0, Math.PI * 2);
            ctx.arc(hx + 8, hy - 12, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = look.light;
            ctx.beginPath();
            ctx.arc(hx - 9, hy - 11, 3, 0, Math.PI * 2);
            ctx.arc(hx + 8, hy - 12, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        const head = ctx.createLinearGradient(hx, hy - 14, hx, hy + 14);
        head.addColorStop(0, look.fur);
        head.addColorStop(1, look.furDark);
        ctx.fillStyle = head;
        ctx.beginPath();
        ctx.arc(hx, hy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = look.light;
        ctx.beginPath();
        ctx.ellipse(hx + 8, hy + 4, id === "dog" ? 8.5 : 7, id === "dog" ? 6.5 : 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.ellipse(hx + (id === "dog" ? 15 : 13), hy + 1, 3, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
        drawEye(hx + 3, hy - 4, hurt);
        if (id === "dog") {
            // Floppy ear on the near side.
            ctx.fillStyle = look.ear;
            ctx.beginPath();
            ctx.ellipse(hx - 6, hy - 1, 5, 11, 0.35 + pose.wag * 0.08, 0, Math.PI * 2);
            ctx.fill();
            if (!hurt) {
                ctx.fillStyle = "#f472b6";
                roundRect(hx + 9, hy + 8, 4, 5, 2);
                ctx.fill();
            }
        }
    }

    function drawCharacter(id, x, y, pose) {
        const look = CHARACTERS[id] || CHARACTERS.astronaut;
        const by = y + pose.bob;
        const swing = pose.swing;

        if (pose.streaks) {
            ctx.strokeStyle = `${pose.edge}55`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const ly = by + 22 + i * 12;
                const len = 14 + ((world.frame * 3 + i * 17) % 18);
                ctx.beginPath();
                ctx.moveTo(x - 6, ly);
                ctx.lineTo(x - 6 - len, ly);
                ctx.stroke();
            }
        }

        drawTail(look, x, by, pose);

        // Legs
        ctx.lineCap = "round";
        ctx.strokeStyle = look.limb;
        ctx.lineWidth = 9;
        ctx.beginPath();
        if (pose.onGround) {
            ctx.moveTo(x + 24, by + 46);
            ctx.lineTo(x + 22 + swing, by + 60);
            ctx.moveTo(x + 32, by + 46);
            ctx.lineTo(x + 34 - swing, by + 60);
        } else {
            ctx.moveTo(x + 24, by + 46);
            ctx.lineTo(x + 16, by + 56);
            ctx.moveTo(x + 32, by + 46);
            ctx.lineTo(x + 40, by + 54);
        }
        ctx.stroke();
        ctx.strokeStyle = look.shoe || pose.edge;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (pose.onGround) {
            ctx.moveTo(x + 19 + swing, by + 63);
            ctx.lineTo(x + 26 + swing, by + 63);
            ctx.moveTo(x + 31 - swing, by + 63);
            ctx.lineTo(x + 38 - swing, by + 63);
        } else {
            ctx.moveTo(x + 12, by + 58);
            ctx.lineTo(x + 19, by + 58);
            ctx.moveTo(x + 37, by + 56);
            ctx.lineTo(x + 44, by + 56);
        }
        ctx.stroke();
        ctx.lineCap = "butt";

        // Torso
        const suit = ctx.createLinearGradient(x, by + 24, x, by + 50);
        suit.addColorStop(0, pose.hurt ? "#fecdd3" : look.suit[0]);
        suit.addColorStop(1, pose.hurt ? "#fb7185" : look.suit[1]);
        ctx.fillStyle = suit;
        roundRect(x + 13, by + 24, 30, 26, 10);
        ctx.fill();
        if (look.belly) {
            ctx.fillStyle = look.belly;
            ctx.beginPath();
            ctx.ellipse(x + 31, by + 38, 9, 9, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (look.belt) {
            ctx.fillStyle = look.belt;
            roundRect(x + 13, by + 26, 30, 4, 2);
            ctx.fill();
        }
        if (id === "astronaut") {
            ctx.fillStyle = "#1e293b";
            roundRect(x + 13, by + 40, 30, 5, 2);
            ctx.fill();
            withGlow(pose.edge, 8, () => {
                ctx.fillStyle = pose.edge;
                ctx.fillRect(x + 20, by + 30, 3, 8);
            });
        }

        // Arm + blaster
        const armY = by + 36 - swing * 0.2;
        ctx.fillStyle = look.limb;
        roundRect(x + 36, armY - 3, 18, 8, 3);
        ctx.fill();
        ctx.fillStyle = "#334155";
        roundRect(x + 48, armY - 5, 12, 10, 3);
        ctx.fill();
        withGlow(pose.power ? COLORS.accent : pose.edge, 10, () => {
            ctx.fillStyle = pose.power ? COLORS.accent : pose.edge;
            ctx.fillRect(x + 58, armY - 2, 3, 4);
        });
        if (pose.shootFlash > 0) {
            withGlow(COLORS.accent, 18, () => {
                ctx.fillStyle = "rgba(207,250,254,0.95)";
                ctx.beginPath();
                ctx.arc(x + 63, armY, 3 + pose.shootFlash * 0.8, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        drawHead(id, look, x + 29, by + 13, pose);
    }

    const CHARACTER_IDS = Object.keys(CHARACTERS);

    let carouselSlide = 0;

    function renderCharacterPreview() {
        if (!arcadeCharPreview || !isSetupStepVisible()) return;
        const cssW = arcadeCharPreview.clientWidth || 240;
        const cssH = cssW / 2;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (arcadeCharPreview.width !== Math.round(cssW * dpr)) {
            arcadeCharPreview.width = Math.round(cssW * dpr);
            arcadeCharPreview.height = Math.round(cssH * dpr);
        }
        carouselSlide *= 0.8;
        if (Math.abs(carouselSlide) < 0.01) carouselSlide = 0;

        const t = world.frame * 0.32;
        const unit = cssW / 240;
        const floorY = cssH - 10 * unit;
        const index = CHARACTER_IDS.indexOf(selectedCharacter);
        const mainCtx = ctx;
        ctx = arcadeCharPreview.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        // Draw neighbours first so the selected runner sits on top.
        const slots = [-2, 2, -1, 1, 0];
        slots.forEach((rel) => {
            const position = rel + carouselSlide;
            const distance = Math.min(1, Math.abs(position));
            if (Math.abs(position) > 1.7) return;
            const id = CHARACTER_IDS[(index + rel + CHARACTER_IDS.length * 3) % CHARACTER_IDS.length];
            const scale = (1.3 - distance * 0.5) * unit;
            const cx = cssW / 2 + position * 82 * unit;
            const isCenter = rel === 0;

            ctx.save();
            ctx.globalAlpha = 1 - distance * 0.7;
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.beginPath();
            ctx.ellipse(cx, floorY, 22 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(cx - 30 * scale, floorY);
            ctx.scale(scale, scale);
            drawCharacter(id, 0, -SMALL_SIZE.height, {
                swing: isCenter ? Math.sin(t) * 8 : 0,
                bob: isCenter ? -Math.abs(Math.sin(t)) * 2 : 0,
                onGround: true,
                streaks: false,
                hurt: false,
                shootFlash: 0,
                power: false,
                edge: COLORS.accent,
                wag: isCenter ? Math.sin(world.frame * 0.3) : 0.3
            });
            ctx.restore();
        });
        ctx = mainCtx;
    }

    function selectCharacter(id) {
        if (!CHARACTERS[id]) return;
        selectedCharacter = id;
        try {
            localStorage.setItem(getScopedKey("arcadeCharacter"), id);
        } catch {
            // Storage can be unavailable (private mode); the choice still applies for this visit.
        }
        if (arcadeCharName) arcadeCharName.innerText = CHARACTERS[id].name;
        if (arcadeCharDots) {
            arcadeCharDots.innerHTML = CHARACTER_IDS.map((charId) =>
                `<span class="${charId === id ? "on" : ""}"></span>`
            ).join("");
        }
    }

    function cycleCharacter(step) {
        const index = CHARACTER_IDS.indexOf(selectedCharacter);
        const next = (index + step + CHARACTER_IDS.length) % CHARACTER_IDS.length;
        selectCharacter(CHARACTER_IDS[next]);
        carouselSlide = step;
        playTone(step > 0 ? 660 : 560, 0.05, "sine", 0.03);
    }

    function isSetupStepVisible() {
        return state.mode === "ready" && arcadeStepSetup && !arcadeStepSetup.classList.contains("hidden");
    }

    function showStep(step) {
        arcadeStepRules?.classList.toggle("hidden", step !== "rules");
        arcadeStepSetup?.classList.toggle("hidden", step !== "setup");
        if (step === "setup") {
            try {
                localStorage.setItem(getScopedKey("arcadeRulesSeen"), "1");
            } catch {
                // Ignore storage errors.
            }
        }
    }

    function hasSeenRules() {
        try {
            return localStorage.getItem(getScopedKey("arcadeRulesSeen")) === "1";
        } catch {
            return false;
        }
    }

    function drawOrb(orb) {
        const { x, y, radius: r } = orb;
        const pulse = 0.5 + 0.5 * Math.sin(world.frame * 0.08 + orb.phase);

        // Outer glow
        const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.9);
        glow.addColorStop(0, "rgba(186,230,253,0.28)");
        glow.addColorStop(1, "rgba(186,230,253,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
        ctx.fill();

        // Core
        const core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        core.addColorStop(0, "rgba(51,65,85,0.95)");
        core.addColorStop(1, "rgba(8,12,28,0.95)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        withGlow("#bae6fd", 10 + pulse * 6, () => {
            ctx.strokeStyle = `rgba(224,242,254,${0.75 + pulse * 0.25})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, r - 1, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.strokeStyle = "rgba(224,242,254,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r + 5, -Math.PI * 0.25 + world.frame * 0.02, Math.PI * 0.35 + world.frame * 0.02);
        ctx.stroke();

        // Number
        const text = String(orb.value);
        ctx.font = `700 ${text.length >= 3 ? 17 : 21}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, y + 1);
    }

    function drawObstacle(obstacle) {
        const { x, y, width: w, height: h } = obstacle;

        if (obstacle.type === "spike") {
            const count = Math.round(w / 28);
            for (let i = 0; i < count; i++) {
                const sx = x + i * 28;
                const grad = ctx.createLinearGradient(0, y, 0, y + h);
                grad.addColorStop(0, "#334155");
                grad.addColorStop(1, "#0f172a");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(sx + 2, y + h);
                ctx.lineTo(sx + 14, y);
                ctx.lineTo(sx + 26, y + h);
                ctx.closePath();
                ctx.fill();
                withGlow(COLORS.bad, 10, () => {
                    ctx.strokeStyle = COLORS.bad;
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(sx + 4, y + h - 2);
                    ctx.lineTo(sx + 14, y + 1);
                    ctx.lineTo(sx + 24, y + h - 2);
                    ctx.stroke();
                });
            }
            return;
        }

        if (obstacle.type === "crate") {
            const grad = ctx.createLinearGradient(0, y, 0, y + h);
            grad.addColorStop(0, "#475569");
            grad.addColorStop(1, "#1e293b");
            ctx.fillStyle = grad;
            roundRect(x, y, w, h, 4);
            ctx.fill();
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.strokeStyle = "rgba(15,23,42,0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + h / 2);
            ctx.lineTo(x + w - 6, y + h / 2);
            ctx.stroke();
            ctx.fillStyle = COLORS.gold;
            [[4, 4], [w - 10, 4], [4, h - 7], [w - 10, h - 7]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 6, 3));
            return;
        }

        // Pillar
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, "#1e293b");
        grad.addColorStop(0.5, "#334155");
        grad.addColorStop(1, "#111827");
        ctx.fillStyle = grad;
        roundRect(x, y, w, h, 3);
        ctx.fill();
        withGlow(currentTheme().edge, 8, () => {
            ctx.fillStyle = currentTheme().edge;
            ctx.fillRect(x + 3, y, w - 6, 2);
        });
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        for (let ly = y + 12; ly < y + h - 4; ly += 12) ctx.fillRect(x + 6, ly, w - 12, 1);
    }

    function drawBox(box) {
        if (box.used) {
            const bumpY = box.bump > 0 ? -Math.sin((box.bump / 10) * Math.PI) * 8 : 0;
            const y = box.y + bumpY;
            ctx.fillStyle = "#334155";
            roundRect(box.x, y, box.width, box.height, 6);
            ctx.fill();
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 2;
            roundRect(box.x + 1, y + 1, box.width - 2, box.height - 2, 6);
            ctx.stroke();
            ctx.fillStyle = "#64748b";
            [[6, 6], [box.width - 9, 6], [6, box.height - 9], [box.width - 9, box.height - 9]].forEach(([dx, dy]) => {
                ctx.fillRect(box.x + dx, y + dy, 3, 3);
            });
            return;
        }

        const bob = Math.sin(world.frame * 0.08 + box.x * 0.01) * 2;
        const y = box.y + bob;
        const cx = box.x + box.width / 2;

        // Faint guide beam so it is clear the box can be reached from below.
        const beam = ctx.createLinearGradient(0, y + box.height, 0, world.groundY);
        beam.addColorStop(0, "rgba(34,211,238,0.18)");
        beam.addColorStop(1, "rgba(34,211,238,0)");
        ctx.fillStyle = beam;
        ctx.fillRect(box.x + 6, y + box.height, box.width - 12, world.groundY - y - box.height);

        ctx.fillStyle = "rgba(15,23,42,0.9)";
        roundRect(box.x, y, box.width, box.height, 6);
        ctx.fill();
        withGlow(COLORS.accent, 12, () => {
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2;
            roundRect(box.x + 1, y + 1, box.width - 2, box.height - 2, 6);
            ctx.stroke();
            ctx.font = `800 22px ${FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = COLORS.accent;
            ctx.fillText("?", cx, y + box.height / 2 + 1);
        });
    }

    function drawEnemy(enemy) {
        const cx = enemy.x + enemy.width / 2;
        const flashing = enemy.flash > 0;
        if (enemy.flash > 0) enemy.flash -= 1;

        if (enemy.type === "crawler") {
            const bottom = enemy.y + enemy.height;
            drawShadow(cx, enemy.width);
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            for (let i = 0; i < 3; i++) {
                const lx = enemy.x + 10 + i * 15;
                const step = Math.sin(enemy.phase * 1.4 + i * 2) * 4;
                ctx.beginPath();
                ctx.moveTo(lx, bottom - 10);
                ctx.lineTo(lx - 5 + step, bottom);
                ctx.stroke();
            }
            ctx.lineCap = "butt";
            const shell = ctx.createLinearGradient(0, enemy.y, 0, bottom);
            shell.addColorStop(0, flashing ? "#ffffff" : "#4b5563");
            shell.addColorStop(1, flashing ? "#e2e8f0" : "#111827");
            ctx.fillStyle = shell;
            ctx.beginPath();
            ctx.moveTo(enemy.x + 2, bottom - 8);
            ctx.quadraticCurveTo(enemy.x + 4, enemy.y, cx, enemy.y);
            ctx.quadraticCurveTo(enemy.x + enemy.width - 4, enemy.y, enemy.x + enemy.width - 2, bottom - 8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1;
            ctx.stroke();
            withGlow(COLORS.bad, 12, () => {
                ctx.fillStyle = COLORS.bad;
                roundRect(enemy.x + 8, enemy.y + 13, 16, 4, 2);
                ctx.fill();
            });
        } else {
            const cy = enemy.y + enemy.height / 2;
            const spin = Math.abs(Math.sin(enemy.phase * 3));
            ctx.strokeStyle = "rgba(148,163,184,0.8)";
            ctx.lineWidth = 2;
            [cx - 14, cx + 14].forEach((rx) => {
                ctx.beginPath();
                ctx.moveTo(rx - 12 * spin, enemy.y - 3);
                ctx.lineTo(rx + 12 * spin, enemy.y - 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(rx, enemy.y - 3);
                ctx.lineTo(rx, enemy.y + 4);
                ctx.stroke();
            });
            const body = ctx.createLinearGradient(0, enemy.y, 0, enemy.y + enemy.height);
            body.addColorStop(0, flashing ? "#ffffff" : "#64748b");
            body.addColorStop(1, flashing ? "#e2e8f0" : "#0f172a");
            ctx.fillStyle = body;
            roundRect(enemy.x + 4, enemy.y + 3, enemy.width - 8, enemy.height - 6, 9);
            ctx.fill();
            withGlow(COLORS.bad, 12, () => {
                ctx.fillStyle = COLORS.bad;
                ctx.beginPath();
                ctx.arc(enemy.x + 13, cy, 4, 0, Math.PI * 2);
                ctx.fill();
            });
            if (Math.floor(world.frame / 20) % 2 === 0) {
                ctx.fillStyle = COLORS.gold;
                ctx.fillRect(enemy.x + enemy.width - 12, enemy.y + 6, 3, 3);
            }
        }

        if (enemy.maxHp > 1) {
            for (let i = 0; i < enemy.maxHp; i++) {
                ctx.fillStyle = i < enemy.hp ? COLORS.bad : "rgba(255,255,255,0.18)";
                ctx.fillRect(cx - 11 + i * 12, enemy.y - 9, 10, 3);
            }
        }
    }

    function drawMushroom(pickup) {
        const x = pickup.x;
        const y = pickup.y;
        const glow = ctx.createRadialGradient(x, y, 4, x, y, 30);
        glow.addColorStop(0, "rgba(251,191,36,0.45)");
        glow.addColorStop(1, "rgba(251,191,36,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 30, y - 30, 60, 60);
        ctx.fillStyle = "#f1e4cf";
        roundRect(x - 8, y - 2, 16, 18, 5);
        ctx.fill();
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(x - 4, y + 4, 2, 5);
        ctx.fillRect(x + 2, y + 4, 2, 5);
        const cap = ctx.createLinearGradient(0, y - 18, 0, y + 2);
        cap.addColorStop(0, "#f87171");
        cap.addColorStop(1, "#b91c1c");
        ctx.fillStyle = cap;
        ctx.beginPath();
        ctx.moveTo(x - 18, y + 1);
        ctx.quadraticCurveTo(x - 18, y - 19, x, y - 19);
        ctx.quadraticCurveTo(x + 18, y - 19, x + 18, y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(x - 8, y - 9, 4, 0, Math.PI * 2);
        ctx.arc(x + 7, y - 11, 5, 0, Math.PI * 2);
        ctx.arc(x + 13, y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPickup(pickup) {
        if (pickup.type === "grow") {
            drawMushroom(pickup);
            return;
        }
        const bob = Math.sin(pickup.phase) * 4;
        const x = pickup.x;
        const y = pickup.y + bob;
        const color = pickup.type === "life" ? COLORS.bad : COLORS.accent;

        ctx.fillStyle = "rgba(8,12,28,0.85)";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 6 + (i * Math.PI) / 3;
            const px = x + Math.cos(angle) * 16;
            const py = y + Math.sin(angle) * 16;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        withGlow(color, 12, () => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            if (pickup.type === "life") {
                ctx.moveTo(x, y + 7);
                ctx.bezierCurveTo(x - 11, y, x - 7, y - 9, x, y - 3);
                ctx.bezierCurveTo(x + 7, y - 9, x + 11, y, x, y + 7);
            } else {
                ctx.moveTo(x + 2, y - 9);
                ctx.lineTo(x - 5, y + 1);
                ctx.lineTo(x, y + 1);
                ctx.lineTo(x - 2, y + 9);
                ctx.lineTo(x + 5, y - 1);
                ctx.lineTo(x, y - 1);
                ctx.closePath();
            }
            ctx.fill();
        });
    }

    function drawBullets() {
        state.bullets.forEach((bullet) => {
            const color = bullet.power ? COLORS.accent : currentTheme().edge;
            const trail = ctx.createLinearGradient(bullet.x - 34, 0, bullet.x, 0);
            trail.addColorStop(0, "rgba(255,255,255,0)");
            trail.addColorStop(1, color);
            ctx.fillStyle = trail;
            ctx.fillRect(bullet.x - 34, bullet.y - bullet.radius * 0.5, 34, bullet.radius);
            withGlow(color, 14, () => {
                ctx.fillStyle = "#ffffff";
                roundRect(bullet.x - bullet.radius * 2, bullet.y - bullet.radius * 0.6, bullet.radius * 3, bullet.radius * 1.2, bullet.radius);
                ctx.fill();
            });
        });
    }

    function drawEffects() {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        state.particles.forEach((particle) => {
            ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        state.floaters.forEach((floater) => {
            ctx.globalAlpha = Math.min(1, floater.life / 18);
            ctx.font = `700 ${floater.size}px ${FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillText(floater.text, floater.x + 1, floater.y + 2);
            ctx.fillStyle = floater.color;
            ctx.fillText(floater.text, floater.x, floater.y);
        });
        ctx.globalAlpha = 1;
    }

    function setLetterSpacing(value) {
        if ("letterSpacing" in ctx) ctx.letterSpacing = value;
    }

    function drawMessages() {
        if (state.toast && world.frame < state.toast.until) {
            const age = world.frame - state.toast.start;
            const remaining = state.toast.until - world.frame;
            ctx.globalAlpha = Math.min(1, age / 6, remaining / 12);
            ctx.font = `600 16px ${FONT}`;
            const textWidth = ctx.measureText(state.toast.text).width;
            const boxW = textWidth + 32;
            const boxX = (world.width - boxW) / 2;
            const boxY = 116;
            ctx.fillStyle = "rgba(8,12,28,0.72)";
            roundRect(boxX, boxY, boxW, 32, 16);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = state.toast.color;
            ctx.fillText(state.toast.text, world.width / 2, boxY + 16.5);
            ctx.globalAlpha = 1;
        }

        if (state.banner && world.frame < state.banner.until) {
            const age = world.frame - state.banner.start;
            const remaining = state.banner.until - world.frame;
            const ease = 1 - Math.pow(1 - Math.min(1, age / 18), 3);
            const cy = world.height * 0.42;
            ctx.globalAlpha = Math.min(1, remaining / 20);
            const lineW = 150 * ease;
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(world.width / 2 - 100 - lineW, cy - 18);
            ctx.lineTo(world.width / 2 - 100, cy - 18);
            ctx.moveTo(world.width / 2 + 100, cy - 18);
            ctx.lineTo(world.width / 2 + 100 + lineW, cy - 18);
            ctx.stroke();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            setLetterSpacing("6px");
            ctx.font = `800 34px ${FONT}`;
            ctx.fillStyle = "#ffffff";
            ctx.fillText(state.banner.title, world.width / 2 + 3, cy - 18);
            setLetterSpacing("3px");
            ctx.font = `600 12px ${FONT}`;
            ctx.fillStyle = currentTheme().edge;
            ctx.fillText(state.banner.subtitle, world.width / 2 + 1.5, cy + 14);
            setLetterSpacing("0px");
            ctx.globalAlpha = 1;
        }

        if (state.mode === "playing" || state.mode === "paused") {
            let barY = world.height - 20;
            if (hasPower()) {
                drawTimerBar("POWER", (state.powerUntil - world.frame) / (60 * 8), COLORS.accent, "#a5f3fc", barY);
                barY -= 26;
            }
            if (player.big) {
                drawTimerBar("SUPER SIZE", (player.bigUntil - world.frame) / BIG_FRAMES, COLORS.gold, "#fde68a", barY);
            }
        }
    }

    function drawTimerBar(label, ratio, color, textColor, barY) {
        const barW = 90;
        const bx = world.width - barW - 16;
        ctx.fillStyle = "rgba(8,12,28,0.6)";
        roundRect(bx, barY, barW, 6, 3);
        ctx.fill();
        withGlow(color, 8, () => {
            ctx.fillStyle = color;
            roundRect(bx, barY, barW * Math.max(0, ratio), 6, 3);
            ctx.fill();
        });
        ctx.font = `600 11px ${FONT}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = textColor;
        ctx.fillText(label, bx + barW, barY - 3);
    }

    function drawVignette() {
        const vignette = ctx.createRadialGradient(world.width / 2, world.height / 2, world.height * 0.45, world.width / 2, world.height / 2, world.width * 0.7);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.35)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, world.width, world.height);
    }

    function draw() {
        ctx.save();
        if (world.shake > 0) {
            ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
        }
        drawScenery();
        state.obstacles.forEach(drawObstacle);
        state.pickups.filter((pickup) => pickup.stage === "rise").forEach(drawPickup);
        state.boxes.forEach(drawBox);
        state.pickups.filter((pickup) => pickup.stage !== "rise").forEach(drawPickup);
        state.orbs.forEach(drawOrb);
        state.enemies.forEach(drawEnemy);
        drawBullets();
        drawRunner();
        drawEffects();
        ctx.restore();
        drawVignette();
        drawMessages();
    }

    // ---------- Canvas sizing ----------

    function resizeCanvas() {
        const cssWidth = arcadeCanvasWrap?.clientWidth || arcadeCanvas.clientWidth || 860;
        const cssHeightAvailable = arcadeCanvasWrap?.clientHeight || 0;
        const isLandscapePhone = window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches;

        // Portrait phones get a narrower world (bigger sprites); landscape phones use the full wide world.
        world.width = !isLandscapePhone && cssWidth < 600 ? 560 : 860;
        world.height = 420;
        world.groundY = world.height - 64;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssHeight = isLandscapePhone && cssHeightAvailable > 0
            ? cssHeightAvailable
            : cssWidth * (world.height / world.width);
        if (isLandscapePhone && cssHeightAvailable > 0) {
            // Fill the available box exactly; keep the world height and widen the view to match.
            world.width = Math.round(world.height * (cssWidth / cssHeight));
        }
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
        renderCharacterPreview();
    }

    // ---------- Input ----------

    const JUMP_KEYS = ["ArrowUp", "KeyW", "Space"];
    const SHOOT_KEYS = ["KeyF", "KeyJ", "KeyX"];
    const RIGHT_KEYS = ["ArrowRight", "KeyD"];
    const LEFT_KEYS = ["ArrowLeft", "KeyA"];

    function isTypingTarget(target) {
        return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    }

    window.addEventListener("keydown", (event) => {
        if (!isPanelVisible() || isTypingTarget(event.target)) return;

        if (event.code === "KeyP" || event.code === "Escape") {
            event.preventDefault();
            togglePause();
            return;
        }
        if (state.mode === "paused") {
            if (event.code === "Space" || event.code === "Enter") {
                event.preventDefault();
                resumeGame();
            }
            return;
        }

        if (JUMP_KEYS.includes(event.code)) {
            event.preventDefault();
            if (state.mode !== "playing") {
                if (!event.repeat && event.code === "Space") {
                    const onRulesStep = state.mode === "ready" && arcadeStepRules && !arcadeStepRules.classList.contains("hidden");
                    if (onRulesStep) showStep("setup");
                    else startGame();
                }
                return;
            }
            if (!event.repeat) requestJump();
        }
        if (isSetupStepVisible() && (LEFT_KEYS.includes(event.code) || RIGHT_KEYS.includes(event.code))) {
            event.preventDefault();
            cycleCharacter(RIGHT_KEYS.includes(event.code) ? 1 : -1);
            return;
        }
        if (state.mode === "ready" && arcadeStepRules && !arcadeStepRules.classList.contains("hidden")
            && (event.code === "Enter" || event.code === "Space")) {
            event.preventDefault();
            showStep("setup");
            return;
        }
        if (event.code === "Enter" && state.mode !== "playing") {
            event.preventDefault();
            startGame();
            return;
        }
        if (RIGHT_KEYS.includes(event.code)) {
            event.preventDefault();
            player.moveRight = true;
        }
        if (LEFT_KEYS.includes(event.code)) {
            event.preventDefault();
            player.moveLeft = true;
        }
        if (SHOOT_KEYS.includes(event.code)) {
            event.preventDefault();
            state.shootHeld = true;
            shoot();
        }
    });

    window.addEventListener("keyup", (event) => {
        if (JUMP_KEYS.includes(event.code)) releaseJump();
        if (SHOOT_KEYS.includes(event.code)) state.shootHeld = false;
        if (RIGHT_KEYS.includes(event.code)) player.moveRight = false;
        if (LEFT_KEYS.includes(event.code)) player.moveLeft = false;
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
    bindHoldButton(arcadeRightBtn, () => { player.moveRight = true; }, () => { player.moveRight = false; });
    bindHoldButton(arcadeLeftBtn, () => { player.moveLeft = true; }, () => { player.moveLeft = false; });
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
        player.moveLeft = false;
        player.moveRight = false;
        pauseGame();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) pauseGame();
    });

    if (arcadePauseBtn) {
        arcadePauseBtn.addEventListener("pointerdown", (event) => event.stopPropagation());
        arcadePauseBtn.addEventListener("click", togglePause);
    }
    if (arcadeResumeBtn) arcadeResumeBtn.addEventListener("click", resumeGame);
    if (arcadeQuitBtn) arcadeQuitBtn.addEventListener("click", showReadyScreen);
    document.querySelectorAll(".arcade-exit-btn").forEach((button) => {
        button.addEventListener("click", () => {
            showReadyScreen();
            document.getElementById("runner-back-btn")?.click();
        });
    });

    if (arcadeRestartBtn) arcadeRestartBtn.addEventListener("click", startGame);
    if (arcadeStartBtn) arcadeStartBtn.addEventListener("click", startGame);
    if (openRunnerBtn) {
        openRunnerBtn.addEventListener("click", () => {
            showReadyScreen();
            requestAnimationFrame(resizeCanvas);
        });
    }

    if (arcadeDifficultyButtonsWrap) {
        arcadeDifficultyButtonsWrap.querySelectorAll(".mode-btn").forEach((button) => {
            button.addEventListener("click", () => {
                // Let the page's own handler update data-selected first.
                setTimeout(() => {
                    difficulty = arcadeDifficultyButtonsWrap.dataset.selected || "easy";
                    if (state.mode !== "playing") showReadyScreen();
                }, 0);
            });
        });
    }

    if (window.ResizeObserver && arcadeCanvasWrap) {
        new ResizeObserver(resizeCanvas).observe(arcadeCanvasWrap);
    }
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 200));

    arcadeNextBtn?.addEventListener("click", () => showStep("setup"));
    arcadeRulesLink?.addEventListener("click", () => showStep("rules"));
    arcadeCharPrev?.addEventListener("click", () => cycleCharacter(-1));
    arcadeCharNext?.addEventListener("click", () => cycleCharacter(1));
    selectCharacter(selectedCharacter);

    resizeCanvas();
    showReadyScreen();
    requestAnimationFrame(loop);
}
