const arcadeCanvas = document.getElementById("arcade-canvas");

if (arcadeCanvas) {
    function getScopedKey(baseKey) {
        const profileStore = window.MathsProfileStore;
        return profileStore ? profileStore.getScopedStorageKey(baseKey) : baseKey;
    }

    const arcadeTargetEl = document.getElementById("arcade-target");
    const arcadeBasketEl = document.getElementById("arcade-basket");
    const arcadeNeedEl = document.getElementById("arcade-need");
    const arcadeScoreEl = document.getElementById("arcade-score");
    const arcadePointsEl = document.getElementById("arcade-points");
    const arcadeLivesEl = document.getElementById("arcade-lives");
    const arcadeComboEl = document.getElementById("arcade-combo");
    const arcadeCheckpointEl = document.getElementById("arcade-checkpoint");
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
    let arcadeAudioUnlocked = false;

    const THEMES = [
        { top: "#0f223c", bottom: "#281740", ground: "#2a1f4f" },
        { top: "#12363f", bottom: "#1f1f50", ground: "#203d5d" },
        { top: "#31203d", bottom: "#1d1f40", ground: "#493267" },
        { top: "#0c2b2a", bottom: "#213344", ground: "#2b3f2f" }
    ];

    const DIFFICULTY = {
        easy: { speed: 2.5, jumpPower: -16, gravity: 0.72, appleTick: 62, hazardTick: 95, enemyTick: 105 },
        medium: { speed: 3.0, jumpPower: -15.3, gravity: 0.82, appleTick: 56, hazardTick: 86, enemyTick: 96 },
        hard: { speed: 3.5, jumpPower: -14.8, gravity: 0.92, appleTick: 50, hazardTick: 78, enemyTick: 88 }
    };

    const MAX_CHALLENGE_FAILS = 5;

    const world = {
        width: arcadeCanvas.width,
        height: arcadeCanvas.height,
        groundY: arcadeCanvas.height - 70,
        gravity: 0.82,
        speed: 3,
        frame: 0,
        running: true
    };

    const player = {
        x: 120,
        y: 0,
        width: 68,
        height: 74,
        vy: 0,
        jumpPower: -15.3,
        onGround: false
    };

    const savedArcadeProfile = JSON.parse(localStorage.getItem(getScopedKey("arcadeProfile")) || "null") || {};

    const profile = {
        coins: Math.max(0, Number(savedArcadeProfile.coins) || Number(localStorage.getItem(getScopedKey("arcadeCoins")) || 0)),
        weaponLevel: Math.max(1, Number(savedArcadeProfile.weaponLevel) || 1),
        cosmetics: {
            fur: savedArcadeProfile?.cosmetics?.fur || "brown",
            eyes: savedArcadeProfile?.cosmetics?.eyes || "normal",
            ears: savedArcadeProfile?.cosmetics?.ears || "normal",
            smile: savedArcadeProfile?.cosmetics?.smile || "normal"
        }
    };

    function saveArcadeProfile() {
        localStorage.setItem(getScopedKey("arcadeCoins"), String(profile.coins));
        localStorage.setItem(getScopedKey("arcadeProfile"), JSON.stringify(profile));
    }

    const state = {
        score: 0,
        lives: 10,
        combo: 0,
        bestCombo: 0,
        nextCheckpoint: 5,
        level: 1,
        levelDistance: 0,
        levelGoal: 1350,
        basket: 0,
        solvedThisLevel: 0,
        failThisChallenge: 0,
        awaitingStart: true,
        awaitingNextField: false,
        challenge: null,
        apples: [],
        platforms: [],
        obstacles: [],
        enemies: [],
        lifePickups: [],
        bullets: [],
        enemyBullets: [],
        shootCooldown: 0,
        powerShotUntil: 0,
        invincibleUntil: 0,
        messageUntil: 0,
        messageText: "",
        phaseOrder: ["apples", "hazards", "enemies"],
        phaseIndex: 0,
        phaseTick: 0,
        spawnAppleTick: 0,
        spawnHazardTick: 0,
        spawnEnemyTick: 0,
        spawnRouteTick: 0,
        spawnLifeTick: 0
    };

    let difficulty = arcadeDifficultyButtonsWrap?.dataset.selected || "easy";

    function playTone(freq, duration, type = "sine", volume = 0.05) {
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = freq;
        gain.gain.value = volume;
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    function unlockArcadeAudio() {
        if (!audioCtx) return;
        if (arcadeAudioUnlocked && audioCtx.state !== "suspended") return;
        arcadeAudioUnlocked = true;
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
    }

    function playCollectSound() { playTone(560, 0.07, "triangle", 0.05); }
    function playShootSound() { playTone(440, 0.05, "square", 0.04); }
    function playSuccessSound() {
        playTone(620, 0.09, "triangle", 0.06);
        setTimeout(() => playTone(760, 0.11, "triangle", 0.05), 65);
    }
    function playNewTaskSound() {
        playTone(820, 0.07, "triangle", 0.05);
        setTimeout(() => playTone(980, 0.08, "triangle", 0.045), 70);
    }
    function playHitSound() { playTone(180, 0.14, "sawtooth", 0.06); }
    function playWrongPickSound() { playTone(230, 0.12, "square", 0.05); }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function formatLives() {
        return Number.isInteger(state.lives) ? String(state.lives) : state.lives.toFixed(1);
    }

    function formatHeartLives() {
        const maxHearts = 10;
        let value = Math.max(0, Math.min(maxHearts, state.lives));
        let text = "";

        for (let i = 0; i < maxHearts; i++) {
            if (value >= 1) {
                text += "❤️";
                value -= 1;
            } else if (value >= 0.5) {
                text += "💖";
                value -= 0.5;
            } else {
                text += "🤍";
            }
        }

        return text;
    }

    function showMessage(text, durationMs = 900) {
        state.messageText = text;
        state.messageUntil = performance.now() + durationMs;
    }

    function newChallenge() {
        const lvl = Math.max(1, state.level);
        const pick = Math.random();
        if (pick < 0.34) {
            const maxA = Math.min(24, 9 + lvl * 2);
            const maxB = Math.min(22, 8 + lvl * 2);
            const a = randInt(2, maxA);
            const b = randInt(1, maxB);
            return { text: `${a} + ${b}`, target: a + b };
        }
        if (pick < 0.67) {
            const maxMul = Math.min(12, 7 + Math.floor(lvl / 2));
            const a = randInt(2, maxMul);
            const b = randInt(2, maxMul);
            return { text: `${a} × ${b}`, target: a * b };
        }
        const a = randInt(10 + lvl * 2, Math.min(40, 20 + lvl * 4));
        const b = randInt(2, Math.min(12, 8 + Math.floor(lvl / 2)));
        return { text: `${a} - ${b}`, target: a - b };
    }

    function getCurrentPhase() {
        return state.phaseOrder[state.phaseIndex % state.phaseOrder.length];
    }

    function phaseDuration() {
        const base = 280;
        const faster = Math.min(90, (state.level - 1) * 12);
        return base - faster;
    }

    function nextPhase() {
        state.phaseIndex = (state.phaseIndex + 1) % state.phaseOrder.length;
        state.phaseTick = 0;
        const phaseLabel = getCurrentPhase();
        if (phaseLabel === "apples") showMessage("Apple wave", 650);
        if (phaseLabel === "hazards") showMessage("Obstacle wave", 650);
        if (phaseLabel === "enemies") showMessage("Enemy wave", 650);
    }

    function applyDifficulty() {
        const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        player.jumpPower = cfg.jumpPower;
        world.gravity = cfg.gravity;
        world.speed = cfg.speed + (state.level - 1) * 0.25;
    }

    function syncArcadeDifficultyFromButtons() {
        difficulty = arcadeDifficultyButtonsWrap?.dataset.selected || "easy";
    }

    function resetWaveObjects() {
        state.apples = [];
        state.platforms = [];
        state.obstacles = [];
        state.enemies = [];
        state.lifePickups = [];
        state.bullets = [];
        state.enemyBullets = [];
        state.spawnAppleTick = 0;
        state.spawnHazardTick = 0;
        state.spawnEnemyTick = 0;
        state.spawnRouteTick = 0;
        state.spawnLifeTick = 0;
    }

    function startLevel(isNext = false) {
        if (isNext) {
            state.level += 1;
            showMessage(`NEW FIELD! ${state.level}`, 1400);
        }

        state.levelDistance = 0;
        state.levelGoal = 1300 + state.level * 300;
        state.phaseIndex = 0;
        state.phaseTick = 0;
        state.basket = 0;
        state.failThisChallenge = 0;
        state.solvedThisLevel = 0;
        state.challenge = newChallenge();
        playNewTaskSound();
        resetWaveObjects();
        applyDifficulty();

        player.y = world.groundY - player.height;
        player.vy = 0;
        player.onGround = true;
    }

    function resetGame() {
        state.score = 0;
        state.lives = 10;
        state.combo = 0;
        state.bestCombo = 0;
        state.nextCheckpoint = 5;
        state.level = 1;
        state.solvedThisLevel = 0;
        state.failThisChallenge = 0;
        state.powerShotUntil = 0;
        state.invincibleUntil = 0;
        state.awaitingNextField = false;
        world.running = true;
        if (arcadeOverlay) arcadeOverlay.classList.add("hidden");
        startLevel(false);
        updateHud();
    }

    function updateHud() {
        const progress = Math.min(100, Math.floor((state.levelDistance / state.levelGoal) * 100));
        if (arcadeTargetEl) arcadeTargetEl.innerText = `Target: ${state.challenge.text}`;
        if (arcadeBasketEl) arcadeBasketEl.style.display = "none";
        if (arcadeNeedEl) arcadeNeedEl.style.display = "none";
        if (arcadeScoreEl) arcadeScoreEl.innerText = `Score: ${state.score}`;
        if (arcadePointsEl) arcadePointsEl.innerText = `Points: ${profile.coins}`;
        if (arcadeLivesEl) arcadeLivesEl.innerText = `Lives: ${formatHeartLives()} (${formatLives()}/10)`;
        if (arcadeComboEl) arcadeComboEl.innerText = `Combo: x${state.combo}`;
        if (arcadeCheckpointEl) arcadeCheckpointEl.innerText = `Field ${state.level} • Solved ${state.solvedThisLevel}/5`;
    }

    function spawnRecoveryApples() {
        // Reset active hazards so the player can retry math without instant collisions.
        resetWaveObjects();

        spawnApple(true);
        spawnApple(true);
        spawnApple(false);
    }

    function handleWrongMath(reasonText) {
        state.failThisChallenge += 1;
        state.basket = 0;
        loseLife(2, reasonText);

        if (!world.running) {
            return;
        }

        if (state.failThisChallenge < MAX_CHALLENGE_FAILS) {
            spawnRecoveryApples();
            state.invincibleUntil = performance.now() + 1800;
            const remaining = MAX_CHALLENGE_FAILS - state.failThisChallenge;
            showMessage(`Wrong! New apples incoming • ${remaining} mistakes left`, 1200);
            updateHud();
            return;
        }

        world.running = false;
        if (arcadeOverlay) {
            arcadeOverlay.classList.remove("hidden");
            arcadeOverlayTitle.innerText = "Game Over";
            arcadeOverlayText.innerText = `${reasonText} • You used all ${MAX_CHALLENGE_FAILS} mistakes on this challenge.`;
        }
    }

    function neededValue() {
        return Math.max(1, state.challenge.target - state.basket);
    }

    function hasPowerShot() {
        return performance.now() < state.powerShotUntil;
    }

    function addScore(delta) {
        state.score = Math.max(0, state.score + delta);
    }

    function addCoins(delta) {
        profile.coins = Math.max(0, profile.coins + delta);
        saveArcadeProfile();
    }
    function getReadabilityScale() {
        const clientWidth = arcadeCanvas.clientWidth || world.width;
        if (clientWidth <= 420) return 1.45;
        if (clientWidth <= 520) return 1.3;
        if (clientWidth <= 680) return 1.15;
        return 1;
    }

    function maxApplesOnField() {
        const clientWidth = arcadeCanvas.clientWidth || world.width;
        if (clientWidth <= 420) return 3;
        if (clientWidth <= 680) return 4;
        return 5;
    }

    function appleColorByValue(value) {
        const palette = ["#ff7a59", "#7c3aed", "#06b6d4", "#f59e0b", "#10b981", "#ec4899", "#3b82f6", "#a855f7", "#eab308", "#14b8a6", "#ef4444", "#22c55e"];
        return palette[Math.abs(value) % palette.length];
    }

    function hasNeededAppleOnField() {
        const need = neededValue();
        return state.apples.some((apple) => apple.value === need && apple.x > -40 && apple.x < world.width + 120);
    }

    function spawnApple(forceAnswer = false) {
        const x = world.width + randInt(80, 160);
        const scale = getReadabilityScale();
        const hasUpperRoute = state.platforms.some((platform) => platform.y < world.groundY - 100 && platform.x > player.x - 160 && platform.x < world.width + 220);

        let y;
        if (hasUpperRoute) {
            const lanePick = Math.random();
            if (lanePick < 0.34) y = world.groundY - randInt(32, 52);
            else if (lanePick < 0.78) y = world.groundY - randInt(138, 166);
            else y = world.groundY - randInt(186, 214);
        } else {
            const laneTop = Math.random() < 0.5;
            y = laneTop ? world.groundY - randInt(130, 165) : world.groundY - randInt(34, 54);
        }

        const need = neededValue();
        const useAnswer = forceAnswer || (need > 0 && Math.random() < 0.3);
        let value = useAnswer ? need : randInt(1, Math.min(12, state.challenge.target + 1));
        if (!useAnswer && value === need) {
            value = Math.max(1, Math.min(12, value + (Math.random() < 0.5 ? -1 : 1)));
        }

        state.apples.push({
            x,
            y,
            radius: Math.round(18 * scale),
            value,
            isAnswer: value === need
        });
    }

    function spawnStairRoute() {
        const startX = world.width + randInt(70, 140);
        const stepWidth = randInt(52, 64);
        const stepRise = randInt(22, 28);
        const stepHeight = 16;
        const stepCount = 3;

        for (let i = 0; i < stepCount; i++) {
            state.platforms.push({
                x: startX + i * stepWidth,
                y: world.groundY - (i + 1) * stepRise,
                width: stepWidth + 10,
                height: stepHeight
            });
        }

        const upperY = world.groundY - (stepCount + 1) * stepRise;
        let cursorX = startX + stepCount * stepWidth + 10;
        const segmentCount = randInt(3, 5);

        for (let i = 0; i < segmentCount; i++) {
            const segmentWidth = randInt(110, 170);
            state.platforms.push({
                x: cursorX,
                y: upperY,
                width: segmentWidth,
                height: 18
            });

            const gapWidth = randInt(46, 92);
            cursorX += segmentWidth + gapWidth;
        }

        const downStart = cursorX + 8;
        for (let i = 0; i < stepCount; i++) {
            state.platforms.push({
                x: downStart + i * stepWidth,
                y: upperY + i * stepRise,
                width: stepWidth + 8,
                height: stepHeight
            });
        }
    }

    function spawnHazard() {
        const x = world.width + randInt(80, 150);

        if (Math.random() < 0.45) {
            const count = Math.random() < 0.4 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                state.platforms.push({
                    x: x + i * randInt(66, 96),
                    y: world.groundY - randInt(88, 140),
                    width: randInt(90, 140),
                    height: 18
                });
            }
            return;
        }

        const roll = Math.random();
        let type = "spike";
        if (roll < 0.4) type = "crate";
        else if (roll < 0.74) type = "block";
        else type = "brick";

        const h = type === "spike" ? randInt(22, 42) : randInt(30, 68);
        const w = type === "spike" ? randInt(28, 46) : randInt(32, 68);

        state.obstacles.push({
            x,
            y: world.groundY - h,
            width: w,
            height: h,
            type,
            breakable: type === "crate",
            breakByHead: type === "brick",
            standable: type !== "spike"
        });
    }

    function spawnEnemy() {
        const x = world.width + randInt(130, 220);
        const upperPlatform = state.platforms.find((platform) => platform.y < world.groundY - 100 && platform.x > player.x - 80 && platform.x < world.width + 220);
        const spawnOnUpper = Boolean(upperPlatform) && Math.random() < 0.7;
        const y = spawnOnUpper
            ? upperPlatform.y - randInt(56, 66)
            : world.groundY - randInt(70, 150);
        state.enemies.push({
            x,
            y,
            width: 64,
            height: 52,
            hp: randInt(3, 4),
            maxHp: 4
        });
    }

    function spawnLifePickup() {
        const x = world.width + randInt(120, 220);
        const highLane = Math.random() < 0.55;
        const y = highLane ? world.groundY - randInt(130, 190) : world.groundY - randInt(48, 78);
        state.lifePickups.push({
            x,
            y,
            radius: 14,
            type: Math.random() < 0.22 ? "power" : "life"
        });
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

    function addHalfLife() {
        state.lives = Math.min(10, Math.round((state.lives + 0.5) * 2) / 2);
    }

    function loseLife(amount, reason) {
        state.lives = Math.round((state.lives - amount) * 2) / 2;
        state.combo = 0;
        state.invincibleUntil = performance.now() + 850;
        playHitSound();

        if (state.lives <= 0) {
            state.lives = 0;
            world.running = false;
            if (arcadeOverlay) {
                arcadeOverlay.classList.remove("hidden");
                arcadeOverlayTitle.innerText = "Game Over";
                arcadeOverlayText.innerText = `${reason} Final score: ${state.score} • Best combo: x${state.bestCombo}`;
            }
            return;
        }

        showMessage("Life lost", 700);
    }

    function completeMathGoal(source) {
        addScore(3);
        addCoins(1);
        addHalfLife();
        state.failThisChallenge = 0;
        state.solvedThisLevel += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);

        if (source === "shot") {
            state.enemies = [];
            state.enemyBullets = [];
            showMessage("Perfect shot! +0.5 life", 1100);
        } else {
            showMessage("Correct! +0.5 life", 900);
        }

        if (state.score >= state.nextCheckpoint) {
            state.lives = Math.min(10, state.lives + 1);
            state.nextCheckpoint += 5;
            showMessage("Checkpoint! +1 life", 1200);
        }

        state.basket = 0;
        state.challenge = newChallenge();
        playSuccessSound();
        setTimeout(() => playNewTaskSound(), 120);
        updateHud();
    }

    function shoot() {
        if (!world.running || state.shootCooldown > 0) return;
        unlockArcadeAudio();

        state.shootCooldown = 12;
        const powered = hasPowerShot();
        const baseRadius = 7 + (profile.weaponLevel - 1);
        const baseSpeed = 9.2 + (profile.weaponLevel - 1) * 0.4;
        state.bullets.push({
            x: player.x + player.width - 2,
            y: player.y + player.height * 0.45,
            radius: powered ? baseRadius + 4 : baseRadius,
            vx: powered ? baseSpeed + 2 : baseSpeed,
            vy: 0,
            power: powered,
            piercing: powered
        });
        playShootSound();
    }

    function jump() {
        unlockArcadeAudio();
        if (!world.running || !player.onGround) return;
        player.vy = player.jumpPower;
        player.onGround = false;
    }

    function updatePlayerPhysics() {
        const previousBottom = player.y + player.height;

        player.vy += world.gravity;
        player.y += player.vy;
        player.onGround = false;

        if (player.y + player.height >= world.groundY) {
            player.y = world.groundY - player.height;
            player.vy = 0;
            player.onGround = true;
        }

        for (const platform of state.platforms) {
            const onTop = previousBottom <= platform.y
                && player.y + player.height >= platform.y
                && player.x + player.width > platform.x + 6
                && player.x < platform.x + platform.width - 6
                && player.vy >= 0;
            if (onTop) {
                player.y = platform.y - player.height;
                player.vy = 0;
                player.onGround = true;
            }
        }

        for (const obstacle of state.obstacles) {
            if (!obstacle.standable) continue;
            const onTop = previousBottom <= obstacle.y
                && player.y + player.height >= obstacle.y
                && player.x + player.width > obstacle.x + 4
                && player.x < obstacle.x + obstacle.width - 4
                && player.vy >= 0;
            if (onTop) {
                player.y = obstacle.y - player.height;
                player.vy = 0;
                player.onGround = true;
            }
        }

        for (let obstacleIndex = state.obstacles.length - 1; obstacleIndex >= 0; obstacleIndex--) {
            const obstacle = state.obstacles[obstacleIndex];
            if (!obstacle.breakByHead) continue;

            const hitFromBelow = player.vy < 0
                && player.y <= obstacle.y + obstacle.height
                && player.y >= obstacle.y + obstacle.height - 16
                && player.x + player.width > obstacle.x + 4
                && player.x < obstacle.x + obstacle.width - 4;

            if (!hitFromBelow) continue;

            player.vy = 1.2;
            state.obstacles.splice(obstacleIndex, 1);

            if (Math.random() < 0.52) {
                addHalfLife();
                showMessage("Brick bonus: +0.5 life", 900);
            } else {
                state.powerShotUntil = performance.now() + 9000;
                showMessage("Power shot unlocked!", 1000);
            }

            playCollectSound();
            updateHud();
            break;
        }
    }

    function updateSpawns() {
        const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        const phase = getCurrentPhase();

        state.spawnRouteTick += 1;
        if (state.spawnRouteTick > Math.max(240, 340 - state.level * 10)) {
            state.spawnRouteTick = 0;
            spawnStairRoute();
            showMessage("Stairs ahead", 700);
        }

        state.phaseTick += 1;
        if (state.phaseTick > phaseDuration()) {
            nextPhase();
        }

        if (phase === "apples") {
            state.spawnAppleTick += 1;
            const noExactNeededVisible = !hasNeededAppleOnField();
            const spawnThreshold = noExactNeededVisible
                ? Math.max(34, cfg.appleTick + 4 - state.level * 2)
                : Math.max(50, cfg.appleTick + 14 - state.level * 2);

            if (state.spawnAppleTick > spawnThreshold && state.apples.length < maxApplesOnField()) {
                state.spawnAppleTick = 0;
                // If no correct apple is visible, always spawn a correct one.
                if (noExactNeededVisible) {
                    spawnApple(true);
                } else {
                    spawnApple(false);
                }
            }
        }

        if (phase === "hazards") {
            state.spawnHazardTick += 1;
            if (state.spawnHazardTick > Math.max(62, cfg.hazardTick - state.level * 2)) {
                state.spawnHazardTick = 0;
                spawnHazard();
            }
        }

        if (phase === "enemies") {
            state.spawnEnemyTick += 1;
            if (state.spawnEnemyTick > Math.max(68, cfg.enemyTick - state.level * 2)) {
                state.spawnEnemyTick = 0;
                spawnEnemy();
            }
        }

        state.spawnLifeTick += 1;
        if (state.spawnLifeTick > Math.max(290, 360 - state.level * 10)) {
            state.spawnLifeTick = 0;
            spawnLifePickup();
        }
    }

    function updateMovement() {
        state.apples.forEach((apple) => { apple.x -= world.speed; });
        state.platforms.forEach((platform) => { platform.x -= world.speed + 0.2; });
        state.obstacles.forEach((obstacle) => { obstacle.x -= world.speed + 0.35; });
        state.enemies.forEach((enemy) => {
            enemy.x -= world.speed + 0.7;
        });

        state.bullets.forEach((bullet) => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
        });

        state.enemyBullets.forEach((bullet) => { bullet.x += bullet.vx; });

        state.lifePickups.forEach((pickup) => { pickup.x -= world.speed + 0.45; });

        let escapedEnemies = 0;
        state.enemies.forEach((enemy) => {
            if (enemy.x + enemy.width < -140) escapedEnemies += 1;
        });
        if (escapedEnemies > 0) {
            loseLife(1, "Enemy escaped.");
            addScore(-2);
            showMessage("Enemy escaped! -1 life", 900);
        }

        state.apples = state.apples.filter((apple) => apple.x > -90);
        state.platforms = state.platforms.filter((platform) => platform.x + platform.width > -100);
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -100);
        state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -140);
        state.lifePickups = state.lifePickups.filter((pickup) => pickup.x + pickup.radius > -90);
        state.bullets = state.bullets.filter((bullet) => bullet.x < world.width + 80 && bullet.y > -80 && bullet.y < world.height + 80);
        state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.x > -80);
    }

    function handlePlayerApplePickup() {
        for (let i = state.apples.length - 1; i >= 0; i--) {
            const apple = state.apples[i];
            if (!intersectsCircleRect(apple.x, apple.y, apple.radius, player.x, player.y, player.width, player.height)) continue;

            state.basket += apple.value;
            state.apples.splice(i, 1);
            playCollectSound();

            if (state.basket === state.challenge.target) {
                completeMathGoal("pickup");
                return;
            }
            if (state.basket > state.challenge.target) {
                addScore(-1);
                addCoins(-1);
                playWrongPickSound();
                handleWrongMath("Wrong total");
                return;
            }
            updateHud();
        }
    }

    function handleLifePickupCollection() {
        for (let i = state.lifePickups.length - 1; i >= 0; i--) {
            const pickup = state.lifePickups[i];
            if (!intersectsCircleRect(pickup.x, pickup.y, pickup.radius, player.x, player.y, player.width, player.height)) continue;

            state.lifePickups.splice(i, 1);
            playCollectSound();

            if (pickup.type === "power") {
                state.powerShotUntil = performance.now() + 9000;
                showMessage("Power shot ready!", 900);
            } else {
                addHalfLife();
                addCoins(1);
                showMessage("Life pickup +0.5", 900);
            }

            updateHud();
        }
    }

    function handleEnemyStomp() {
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const enemy = state.enemies[i];
            const touching = intersectsRect(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height);
            if (!touching) continue;

            const stompHit = player.vy > 1.1 && (player.y + player.height) <= (enemy.y + 18);
            if (!stompHit) continue;

            state.enemies.splice(i, 1);
            player.vy = player.jumpPower * 0.62;
            player.onGround = false;
            addScore(2);
            addCoins(1);
            state.combo += 1;
            state.bestCombo = Math.max(state.bestCombo, state.combo);
            showMessage("Enemy stomped!", 760);
            playCollectSound();
            updateHud();
        }
    }

    function handleBulletHits() {
        for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = state.bullets[bulletIndex];
            let consumed = false;

            for (let appleIndex = state.apples.length - 1; appleIndex >= 0; appleIndex--) {
                const apple = state.apples[appleIndex];
                const dx = bullet.x - apple.x;
                const dy = bullet.y - apple.y;
                const r = bullet.radius + apple.radius + 3;
                if (dx * dx + dy * dy > r * r) continue;

                const need = neededValue();
                // Keep the correct answer apple collectible only by touching it.
                if (apple.value === need) {
                    continue;
                }

                state.apples.splice(appleIndex, 1);
                if (!bullet.piercing) {
                    state.bullets.splice(bulletIndex, 1);
                    consumed = true;
                }

                addScore(-1);
                addCoins(-1);
                playWrongPickSound();
                // Do not remove life for wrong shots; only reduce points.
                // handleWrongMath("Wrong number shot");
                break;
            }

            if (consumed) continue;

            for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
                const enemy = state.enemies[enemyIndex];
                if (!intersectsCircleRect(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.width, enemy.height)) continue;

                enemy.hp -= 1;
                if (!bullet.piercing) {
                    state.bullets.splice(bulletIndex, 1);
                    consumed = true;
                }
                playCollectSound();

                if (enemy.hp <= 0) {
                    state.enemies.splice(enemyIndex, 1);
                    addScore(1);
                    addCoins(1);
                    showMessage("Enemy defeated", 650);
                } else {
                    showMessage(`Enemy hit (${enemy.hp} left)`, 520);
                }
                break;
            }

            if (consumed) continue;

            for (let obstacleIndex = state.obstacles.length - 1; obstacleIndex >= 0; obstacleIndex--) {
                const obstacle = state.obstacles[obstacleIndex];
                if (!intersectsCircleRect(bullet.x, bullet.y, bullet.radius, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) continue;

                if (!bullet.piercing) {
                    state.bullets.splice(bulletIndex, 1);
                    consumed = true;
                }
                if (obstacle.breakable) {
                    state.obstacles.splice(obstacleIndex, 1);
                    playCollectSound();
                    showMessage("Crate destroyed", 620);
                }
                break;
            }
        }
    }

    function handleDamageCollisions() {
        if (performance.now() <= state.invincibleUntil) return;

        for (const obstacle of state.obstacles) {
            const touching = intersectsRect(
                player.x + 6,
                player.y + 6,
                player.width - 12,
                player.height - 8,
                obstacle.x + 2,
                obstacle.y + 2,
                Math.max(4, obstacle.width - 4),
                Math.max(4, obstacle.height - 4)
            );

            const standing = player.y + player.height <= obstacle.y + 3
                && player.x + player.width > obstacle.x + 4
                && player.x < obstacle.x + obstacle.width - 4;

            if (touching && !(obstacle.standable && standing)) {
                loseLife(1, "Obstacle collision.");
                return;
            }
        }

        for (const enemy of state.enemies) {
            if (intersectsRect(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                loseLife(1, "Monster collision.");
                return;
            }
        }

    }

    function updateLevelProgress() {
        if (state.solvedThisLevel < 5) return;

        if (!state.awaitingNextField) {
            state.awaitingNextField = true;
            world.running = false;
            showMessage(`NEW FIELD! ${state.level + 1}`, 1500);
            startLevel(true);
            state.awaitingNextField = false;
            world.running = true;
        }
    }

    function update() {
        if (!world.running || state.awaitingStart) return;
        if (document.getElementById("arcade-panel")?.classList.contains("hidden")) return;

        world.frame += 1;
        if (state.shootCooldown > 0) state.shootCooldown -= 1;

        updatePlayerPhysics();
        updateSpawns();
        updateMovement();
        handleEnemyStomp();
        handlePlayerApplePickup();
        handleLifePickupCollection();
        handleBulletHits();
        handleDamageCollisions();
        updateLevelProgress();
        updateHud();
    }

    function drawBackground() {
        const theme = THEMES[(state.level - 1) % THEMES.length];
        const sky = ctx.createLinearGradient(0, 0, 0, world.height);
        sky.addColorStop(0, theme.top);
        sky.addColorStop(1, theme.bottom);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, world.width, world.height);

        const horizonY = world.groundY - 8;
        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, horizonY, world.width, world.height - horizonY);

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 13; i++) {
            const x = ((i * 120) - (world.frame * world.speed * 0.6)) % (world.width + 130);
            ctx.beginPath();
            ctx.moveTo(x, world.height);
            ctx.lineTo(world.width / 2, horizonY);
            ctx.stroke();
        }
    }

    function drawGoalFlag() {
        const remaining = state.levelGoal - state.levelDistance;
        if (remaining > 380) return;

        const x = Math.max(player.x + 220, world.width - remaining - 24);
        const y = world.groundY - 140;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, world.groundY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 38, y + 12);
        ctx.lineTo(x, y + 24);
        ctx.closePath();
        ctx.fill();
    }

    function drawChallengeOverlay() {
        const scale = getReadabilityScale();
        const targetFont = Math.round(21 * scale);
        const tipFont = Math.round(20 * scale);

        ctx.fillStyle = "rgba(0,0,0,0.48)";
        ctx.fillRect(16, 12, 500, 92);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.strokeRect(16, 12, 500, 92);

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${targetFont}px Arial`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`TARGET: ${state.challenge.text}`, 30, 40);

        ctx.fillStyle = "#8dffbf";
        ctx.font = `bold ${tipFont}px Arial`;
        ctx.fillText("Collect exact apples to solve it", 30, 68);

        if (hasPowerShot()) {
            ctx.fillStyle = "#9fddff";
            ctx.font = "bold 18px Arial";
            ctx.fillText("POWER SHOT ACTIVE", 320, 88);
        }

        if (performance.now() < state.messageUntil) {
            ctx.fillStyle = "#ffd36b";
            ctx.font = "bold 24px Arial";
            ctx.fillText(state.messageText, 530, 60);
        }
    }

    function drawBear() {
        const blink = performance.now() < state.invincibleUntil && Math.floor(performance.now() / 90) % 2 === 0;
        if (blink) return;

        const cx = player.x + player.width * 0.5;
        const furMain = profile.cosmetics.fur === "pink" ? "#d977b3" : "#9b6b42";
        const furDark = profile.cosmetics.fur === "pink" ? "#b45595" : "#7a5233";
        const paws = profile.cosmetics.fur === "pink" ? "#9a3f77" : "#74482b";

        ctx.fillStyle = furMain;
        ctx.fillRect(player.x + 10, player.y + 26, 48, 42);

        ctx.fillStyle = furDark;
        ctx.fillRect(player.x + 4, player.y + 30, 10, 26);
        ctx.fillRect(player.x + player.width - 14, player.y + 30, 10, 26);

        ctx.fillStyle = paws;
        ctx.fillRect(player.x + 18, player.y + 64, 10, 10);
        ctx.fillRect(player.x + 40, player.y + 64, 10, 10);

        ctx.beginPath();
        ctx.arc(cx, player.y + 22, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        const earRadius = profile.cosmetics.ears === "round" ? 10 : 8;
        ctx.arc(cx - 12, player.y + 8, earRadius, 0, Math.PI * 2);
        ctx.arc(cx + 12, player.y + 8, earRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f6dfc3";
        ctx.beginPath();
        ctx.arc(cx, player.y + 26, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1f1f1f";
        ctx.beginPath();
        const eyeRadius = profile.cosmetics.eyes === "spark" ? 3 : 2;
        ctx.arc(cx - 5, player.y + 19, eyeRadius, 0, Math.PI * 2);
        ctx.arc(cx + 5, player.y + 19, eyeRadius, 0, Math.PI * 2);
        ctx.arc(cx, player.y + 26, 2, 0, Math.PI * 2);
        ctx.fill();

        if (profile.cosmetics.smile === "big") {
            ctx.strokeStyle = "#1f1f1f";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, player.y + 29, 6, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        }
    }

    function drawApples() {
        const scale = getReadabilityScale();
        state.apples.forEach((apple) => {
            ctx.beginPath();
            ctx.fillStyle = appleColorByValue(apple.value);
            ctx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fff";
            const fontSize = Math.round(Math.max(15, Math.min(24, 15 * scale)));
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(apple.value), apple.x, apple.y + 1);
        });
    }

    function drawPlatformsAndObstacles() {
        state.platforms.forEach((platform) => {
            ctx.fillStyle = "#3477b6";
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = "#9ad2ff";
            ctx.fillRect(platform.x + 4, platform.y + 4, platform.width - 8, 4);
        });

        state.obstacles.forEach((obstacle) => {
            if (obstacle.type === "spike") {
                ctx.fillStyle = "#ff7b7b";
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                ctx.lineTo(obstacle.x + obstacle.width * 0.5, obstacle.y);
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
                return;
            }

            if (obstacle.type === "crate") {
                ctx.fillStyle = "#a26a34";
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                ctx.strokeStyle = "#e7b27a";
                ctx.lineWidth = 2;
                ctx.strokeRect(obstacle.x + 3, obstacle.y + 3, obstacle.width - 6, obstacle.height - 6);
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 4, obstacle.y + 4);
                ctx.lineTo(obstacle.x + obstacle.width - 4, obstacle.y + obstacle.height - 4);
                ctx.moveTo(obstacle.x + obstacle.width - 4, obstacle.y + 4);
                ctx.lineTo(obstacle.x + 4, obstacle.y + obstacle.height - 4);
                ctx.stroke();
                return;
            }

            if (obstacle.type === "brick") {
                ctx.fillStyle = "#b35a3c";
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                ctx.strokeStyle = "#e9b49a";
                ctx.lineWidth = 1.2;
                const step = 14;
                for (let x = obstacle.x + step; x < obstacle.x + obstacle.width; x += step) {
                    ctx.beginPath();
                    ctx.moveTo(x, obstacle.y);
                    ctx.lineTo(x, obstacle.y + obstacle.height);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y + obstacle.height * 0.5);
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * 0.5);
                ctx.stroke();
                return;
            }

            ctx.fillStyle = "#3f4f8f";
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            ctx.fillStyle = "#7f98d1";
            ctx.fillRect(obstacle.x + 4, obstacle.y + 4, Math.max(8, obstacle.width - 8), 6);
        });
    }

    function drawEnemies() {
        const styleIndex = (state.level - 1) % 3;
        const bodyColors = ["#57ffd0", "#ff8fb1", "#7ee2ff"];

        state.enemies.forEach((enemy) => {
            ctx.fillStyle = bodyColors[styleIndex];
            ctx.beginPath();
            ctx.ellipse(enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5, enemy.width * 0.5, enemy.height * 0.48, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#1b1b1b";
            ctx.beginPath();
            ctx.arc(enemy.x + 19, enemy.y + 17, 3, 0, Math.PI * 2);
            ctx.arc(enemy.x + 43, enemy.y + 17, 3, 0, Math.PI * 2);
            ctx.fill();

            const hpWidth = enemy.width;
            const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(enemy.x, enemy.y - 10, hpWidth, 6);
            ctx.fillStyle = "#ff5555";
            ctx.fillRect(enemy.x, enemy.y - 10, hpWidth * hpRatio, 6);
        });
    }

    function drawBullets() {
        state.bullets.forEach((bullet) => {
            ctx.fillStyle = bullet.power ? "#95f0ff" : "#ffe45e";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();

            if (bullet.power) {
                ctx.strokeStyle = "rgba(149,240,255,0.6)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.radius + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        state.enemyBullets.forEach((bullet) => {
            ctx.fillStyle = "#ff8a8a";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawLifePickups() {
        state.lifePickups.forEach((pickup) => {
            if (pickup.type === "power") {
                ctx.fillStyle = "#7dd3fc";
                ctx.beginPath();
                ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#082f49";
                ctx.font = "bold 15px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("⚡", pickup.x, pickup.y + 1);
                return;
            }

            ctx.fillStyle = "#ff5f8a";
            ctx.beginPath();
            ctx.arc(pickup.x - 5, pickup.y - 2, 6, 0, Math.PI * 2);
            ctx.arc(pickup.x + 5, pickup.y - 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(pickup.x - 12, pickup.y);
            ctx.lineTo(pickup.x + 12, pickup.y);
            ctx.lineTo(pickup.x, pickup.y + 12);
            ctx.closePath();
            ctx.fill();
        });
    }

    function draw() {
        drawBackground();
        drawGoalFlag();
        drawChallengeOverlay();
        drawPlatformsAndObstacles();
        drawEnemies();
        drawApples();
        drawLifePickups();
        drawBullets();
        drawBear();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener("keydown", (event) => {
        if (event.code === "ArrowUp" || event.code === "KeyW") {
            event.preventDefault();
            jump();
        }
        if (event.code === "Space" || event.code === "KeyF") {
            event.preventDefault();
            shoot();
        }
    });

    if (arcadeJumpBtn) {
        arcadeJumpBtn.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            jump();
        });
    }

    if (arcadeShootBtn) {
        arcadeShootBtn.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            shoot();
        });
    }

    if (arcadeCanvas) {
        arcadeCanvas.addEventListener("pointerdown", jump);
    }

    if (arcadeRestartBtn) {
        arcadeRestartBtn.addEventListener("click", () => {
            unlockArcadeAudio();
            syncArcadeDifficultyFromButtons();
            state.awaitingStart = false;
            resetGame();
        });
    }

    if (arcadeDifficultyButtonsWrap) {
        const difficultyButtons = arcadeDifficultyButtonsWrap.querySelectorAll(".mode-btn");
        difficultyButtons.forEach((button) => {
            button.addEventListener("click", () => {
                unlockArcadeAudio();
                syncArcadeDifficultyFromButtons();
                state.awaitingStart = false;
                resetGame();
            });
        });
    }

    if (openRunnerBtn) {
        openRunnerBtn.addEventListener("click", () => {
            state.awaitingStart = true;
            world.running = false;
            arcadeRulesEl?.classList.remove("hidden");
        });
    }

    if (arcadeStartBtn) {
        arcadeStartBtn.addEventListener("click", () => {
            unlockArcadeAudio();
            state.awaitingStart = false;
            arcadeRulesEl?.classList.add("hidden");
            world.running = true;
            resetGame();
        });
    }

    player.y = world.groundY - player.height;
    arcadeRulesEl?.classList.remove("hidden");
    resetGame();
    loop();
}
