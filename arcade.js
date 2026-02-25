const arcadeCanvas = document.getElementById("arcade-canvas");

if (arcadeCanvas) {
    const arcadeTargetEl = document.getElementById("arcade-target");
    const arcadeBasketEl = document.getElementById("arcade-basket");
    const arcadeScoreEl = document.getElementById("arcade-score");
    const arcadeLivesEl = document.getElementById("arcade-lives");
    const arcadeComboEl = document.getElementById("arcade-combo");
    const arcadeCheckpointEl = document.getElementById("arcade-checkpoint");
    const arcadeOverlay = document.getElementById("arcade-overlay");
    const arcadeOverlayTitle = document.getElementById("arcade-overlay-title");
    const arcadeOverlayText = document.getElementById("arcade-overlay-text");
    const arcadeRestartBtn = document.getElementById("arcade-restart-btn");
    const arcadeDifficultyEl = document.getElementById("arcade-difficulty");
    const arcadeJumpBtn = document.getElementById("arcade-jump-btn");
    const arcadeShootBtn = document.getElementById("arcade-shoot-btn");

    const ctx = arcadeCanvas.getContext("2d");
    const audioCtx = window.AudioContext ? new AudioContext() : null;

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
        width: 56,
        height: 60,
        vy: 0,
        jumpPower: -15.3,
        onGround: false
    };

    const state = {
        score: 0,
        lives: 5,
        combo: 0,
        bestCombo: 0,
        nextCheckpoint: 5,
        level: 1,
        levelDistance: 0,
        levelGoal: 1350,
        basket: 0,
        challenge: null,
        apples: [],
        platforms: [],
        obstacles: [],
        enemies: [],
        bullets: [],
        enemyBullets: [],
        shootCooldown: 0,
        invincibleUntil: 0,
        messageUntil: 0,
        messageText: "",
        phaseOrder: ["apples", "hazards", "enemies"],
        phaseIndex: 0,
        phaseTick: 0,
        spawnAppleTick: 0,
        spawnHazardTick: 0,
        spawnEnemyTick: 0
    };

    let difficulty = arcadeDifficultyEl?.value || "easy";

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

    function playCollectSound() { playTone(560, 0.07, "triangle", 0.05); }
    function playShootSound() { playTone(440, 0.05, "square", 0.04); }
    function playSuccessSound() {
        playTone(620, 0.09, "triangle", 0.06);
        setTimeout(() => playTone(760, 0.11, "triangle", 0.05), 65);
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
        const maxHearts = 5;
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
        const pick = Math.random();
        if (pick < 0.34) {
            const a = randInt(2, 9);
            const b = randInt(1, 8);
            return { text: `${a} + ${b}`, target: a + b };
        }
        if (pick < 0.67) {
            const a = randInt(2, 9);
            const b = randInt(2, 7);
            return { text: `${a} × ${b}`, target: a * b };
        }
        const a = randInt(10, 20);
        const b = randInt(2, 8);
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

    function resetWaveObjects() {
        state.apples = [];
        state.platforms = [];
        state.obstacles = [];
        state.enemies = [];
        state.bullets = [];
        state.enemyBullets = [];
        state.spawnAppleTick = 0;
        state.spawnHazardTick = 0;
        state.spawnEnemyTick = 0;
    }

    function startLevel(isNext = false) {
        if (isNext) {
            state.level += 1;
            showMessage(`Level ${state.level}`, 1100);
        }

        state.levelDistance = 0;
        state.levelGoal = 1300 + state.level * 300;
        state.phaseIndex = 0;
        state.phaseTick = 0;
        state.basket = 0;
        state.challenge = newChallenge();
        resetWaveObjects();
        applyDifficulty();

        player.y = world.groundY - player.height;
        player.vy = 0;
        player.onGround = true;
    }

    function resetGame() {
        state.score = 0;
        state.lives = 5;
        state.combo = 0;
        state.bestCombo = 0;
        state.nextCheckpoint = 5;
        state.level = 1;
        state.invincibleUntil = 0;
        world.running = true;
        if (arcadeOverlay) arcadeOverlay.classList.add("hidden");
        startLevel(false);
        updateHud();
    }

    function updateHud() {
        const progress = Math.min(100, Math.floor((state.levelDistance / state.levelGoal) * 100));
        if (arcadeTargetEl) arcadeTargetEl.innerText = `Target: ${state.challenge.text} = ${state.challenge.target}`;
        if (arcadeBasketEl) arcadeBasketEl.innerText = `Basket: ${state.basket}`;
        if (arcadeScoreEl) arcadeScoreEl.innerText = `Score: ${state.score}`;
        if (arcadeLivesEl) arcadeLivesEl.innerText = `Lives: ${formatHeartLives()} (${formatLives()}/5)`;
        if (arcadeComboEl) arcadeComboEl.innerText = `Combo: x${state.combo}`;
        if (arcadeCheckpointEl) arcadeCheckpointEl.innerText = `Level ${state.level} • Finish ${progress}%`;
    }

    function neededValue() {
        return Math.max(1, state.challenge.target - state.basket);
    }

    function spawnApple() {
        const x = world.width + randInt(80, 160);
        const laneTop = Math.random() < 0.5;
        const y = laneTop ? world.groundY - randInt(130, 165) : world.groundY - randInt(34, 54);
        const need = neededValue();
        const useAnswer = need > 0 && Math.random() < 0.3;
        let value = useAnswer ? need : randInt(1, Math.min(12, state.challenge.target + 1));
        if (!useAnswer && value === need) {
            value = Math.max(1, Math.min(12, value + (Math.random() < 0.5 ? -1 : 1)));
        }

        state.apples.push({
            x,
            y,
            radius: 18,
            value,
            isAnswer: value === need
        });
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
        else if (roll < 0.82) type = "block";

        const h = type === "spike" ? randInt(22, 42) : randInt(30, 68);
        const w = type === "spike" ? randInt(28, 46) : randInt(32, 68);

        state.obstacles.push({
            x,
            y: world.groundY - h,
            width: w,
            height: h,
            type,
            breakable: type === "crate",
            standable: type !== "spike"
        });
    }

    function spawnEnemy() {
        const x = world.width + randInt(130, 220);
        const y = world.groundY - randInt(70, 150);
        state.enemies.push({
            x,
            y,
            width: 64,
            height: 52,
            hp: randInt(3, 4),
            maxHp: 4,
            shootTick: randInt(70, 130)
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
        state.lives = Math.min(5, Math.round((state.lives + 0.5) * 2) / 2);
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
        state.score += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);

        if (source === "shot") {
            addHalfLife();
            state.enemies = [];
            state.enemyBullets = [];
            showMessage("Perfect shot! +0.5 life", 1100);
        } else {
            showMessage("Goal completed", 850);
        }

        if (state.score >= state.nextCheckpoint) {
            state.lives += 1;
            state.nextCheckpoint += 5;
            showMessage("Checkpoint! +1 life", 1200);
        }

        state.basket = 0;
        state.challenge = newChallenge();
        playSuccessSound();
        updateHud();
    }

    function shoot() {
        if (!world.running || state.shootCooldown > 0) return;
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        state.shootCooldown = 12;
        state.bullets.push({
            x: player.x + player.width - 2,
            y: player.y + player.height * 0.45,
            radius: 7,
            vx: 9.2,
            vy: 0
        });
        playShootSound();
    }

    function jump() {
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
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
    }

    function updateSpawns() {
        const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        const phase = getCurrentPhase();

        state.phaseTick += 1;
        if (state.phaseTick > phaseDuration()) {
            nextPhase();
        }

        if (phase === "apples") {
            state.spawnAppleTick += 1;
            if (state.spawnAppleTick > Math.max(38, cfg.appleTick - state.level * 2)) {
                state.spawnAppleTick = 0;
                spawnApple();
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
    }

    function updateMovement() {
        state.apples.forEach((apple) => { apple.x -= world.speed; });
        state.platforms.forEach((platform) => { platform.x -= world.speed + 0.2; });
        state.obstacles.forEach((obstacle) => { obstacle.x -= world.speed + 0.35; });
        state.enemies.forEach((enemy) => {
            enemy.x -= world.speed + 0.7;
            enemy.shootTick -= 1;
            if (enemy.shootTick <= 0) {
                enemy.shootTick = randInt(70, 120);
                state.enemyBullets.push({
                    x: enemy.x + 2,
                    y: enemy.y + enemy.height * 0.54,
                    radius: 4,
                    vx: -(world.speed + 4.1)
                });
            }
        });

        state.bullets.forEach((bullet) => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
        });

        state.enemyBullets.forEach((bullet) => { bullet.x += bullet.vx; });

        state.apples = state.apples.filter((apple) => apple.x > -90);
        state.platforms = state.platforms.filter((platform) => platform.x + platform.width > -100);
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -100);
        state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -140);
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
                loseLife(1, "Too much collected.");
                return;
            }
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

                state.apples.splice(appleIndex, 1);
                state.bullets.splice(bulletIndex, 1);
                consumed = true;

                const need = neededValue();
                if (apple.value === need) {
                    state.basket += apple.value;
                    completeMathGoal("shot");
                } else {
                    playWrongPickSound();
                    loseLife(0.5, "Wrong number shot.");
                    showMessage("Wrong number", 750);
                }
                break;
            }

            if (consumed) continue;

            for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
                const enemy = state.enemies[enemyIndex];
                if (!intersectsCircleRect(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.width, enemy.height)) continue;

                enemy.hp -= 1;
                state.bullets.splice(bulletIndex, 1);
                consumed = true;
                playCollectSound();

                if (enemy.hp <= 0) {
                    state.enemies.splice(enemyIndex, 1);
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

                state.bullets.splice(bulletIndex, 1);
                consumed = true;
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

        for (const bullet of state.enemyBullets) {
            if (intersectsCircleRect(bullet.x, bullet.y, bullet.radius, player.x, player.y, player.width, player.height)) {
                loseLife(1, "Enemy projectile.");
                return;
            }
        }
    }

    function updateLevelProgress() {
        state.levelDistance += world.speed;
        if (state.levelDistance < state.levelGoal) return;

        showMessage("Finish reached!", 950);
        startLevel(true);
    }

    function update() {
        if (!world.running) return;
        if (document.getElementById("arcade-panel")?.classList.contains("hidden")) return;

        world.frame += 1;
        if (state.shootCooldown > 0) state.shootCooldown -= 1;

        updatePlayerPhysics();
        updateSpawns();
        updateMovement();
        handlePlayerApplePickup();
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
        ctx.fillStyle = "rgba(0,0,0,0.48)";
        ctx.fillRect(16, 12, 460, 82);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.strokeRect(16, 12, 460, 82);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`TARGET: ${state.challenge.text} = ${state.challenge.target}`, 30, 40);

        ctx.fillStyle = "#8dffbf";
        ctx.font = "bold 26px Arial";
        ctx.fillText(`BASKET: ${state.basket}`, 30, 68);

        if (performance.now() < state.messageUntil) {
            ctx.fillStyle = "#ffd36b";
            ctx.font = "bold 22px Arial";
            ctx.fillText(state.messageText, 500, 56);
        }
    }

    function drawBear() {
        const blink = performance.now() < state.invincibleUntil && Math.floor(performance.now() / 90) % 2 === 0;
        if (blink) return;

        const cx = player.x + player.width * 0.5;
        ctx.fillStyle = "#8f6641";
        ctx.fillRect(player.x + 8, player.y + 24, 40, 36);

        ctx.beginPath();
        ctx.arc(cx, player.y + 21, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx - 11, player.y + 8, 7, 0, Math.PI * 2);
        ctx.arc(cx + 11, player.y + 8, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f6dfc3";
        ctx.beginPath();
        ctx.arc(cx, player.y + 24, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1f1f1f";
        ctx.beginPath();
        ctx.arc(cx - 5, player.y + 18, 2, 0, Math.PI * 2);
        ctx.arc(cx + 5, player.y + 18, 2, 0, Math.PI * 2);
        ctx.arc(cx, player.y + 24, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawApples() {
        state.apples.forEach((apple) => {
            ctx.beginPath();
            ctx.fillStyle = apple.isAnswer ? "#18d96b" : "#ff3158";
            ctx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fff";
            ctx.font = "bold 15px Arial";
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

            ctx.fillStyle = "#3f4f8f";
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            ctx.fillStyle = "#7f98d1";
            ctx.fillRect(obstacle.x + 4, obstacle.y + 4, Math.max(8, obstacle.width - 8), 6);
        });
    }

    function drawEnemies() {
        state.enemies.forEach((enemy) => {
            ctx.fillStyle = "#57ffd0";
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
            ctx.fillStyle = "#ffe45e";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        state.enemyBullets.forEach((bullet) => {
            ctx.fillStyle = "#ff8a8a";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
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
        drawBullets();
        drawBear();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener("keydown", (event) => {
        if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
            event.preventDefault();
            jump();
        }
        if (event.code === "KeyF") {
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
            difficulty = arcadeDifficultyEl?.value || "easy";
            resetGame();
        });
    }

    if (arcadeDifficultyEl) {
        arcadeDifficultyEl.addEventListener("change", () => {
            difficulty = arcadeDifficultyEl.value || "easy";
            resetGame();
        });
    }

    player.y = world.groundY - player.height;
    resetGame();
    loop();
}
