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
    const playStyleEl = document.getElementById("play-style");
    const arcadeJumpBtn = document.getElementById("arcade-jump-btn");
    const arcadeShootBtn = document.getElementById("arcade-shoot-btn");

    const arcadeCtx = arcadeCanvas.getContext("2d");
    const audioCtx = window.AudioContext ? new AudioContext() : null;

    const DIFFICULTY = {
        easy: { baseSpeed: 2.8, maxBonusSpeed: 1.7, jumpPower: -15.8, gravity: 0.72, appleBaseTick: 116, hazardBaseTick: 165, enemyBaseTick: 220 },
        medium: { baseSpeed: 3.3, maxBonusSpeed: 2.2, jumpPower: -15.2, gravity: 0.8, appleBaseTick: 104, hazardBaseTick: 148, enemyBaseTick: 205 },
        hard: { baseSpeed: 4.0, maxBonusSpeed: 3.0, jumpPower: -14.8, gravity: 0.9, appleBaseTick: 96, hazardBaseTick: 132, enemyBaseTick: 190 }
    };

    let difficulty = arcadeDifficultyEl?.value || "easy";

    const world = {
        width: arcadeCanvas.width,
        height: arcadeCanvas.height,
        groundY: arcadeCanvas.height - 68,
        gravity: 0.8,
        speed: 3,
        frame: 0,
        running: true
    };

    const player = {
        x: 120,
        y: 0,
        width: 54,
        height: 58,
        velocityY: 0,
        jumpPower: -15.2,
        onGround: false
    };

    const state = {
        score: 0,
        lives: 4,
        combo: 0,
        bestCombo: 0,
        nextCheckpoint: 5,
        basket: 0,
        challenge: null,
        apples: [],
        obstacles: [],
        platforms: [],
        enemies: [],
        bullets: [],
        enemyBullets: [],
        spawnAppleTick: 0,
        spawnHazardTick: 0,
        spawnEnemyTick: 0,
        shootCooldown: 0,
        invincibleUntil: 0,
        messageUntil: 0,
        messageText: ""
    };

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
    function playShootSound() { playTone(430, 0.05, "square", 0.04); }
    function playSuccessSound() {
        playTone(620, 0.09, "triangle", 0.05);
        setTimeout(() => playTone(760, 0.11, "triangle", 0.045), 60);
    }
    function playHitSound() { playTone(180, 0.12, "sawtooth", 0.06); }

    function showMessage(text, ms = 900) {
        state.messageText = text;
        state.messageUntil = performance.now() + ms;
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function newChallenge() {
        const modePick = Math.random();
        if (modePick < 0.34) {
            const a = randInt(2, 9);
            const b = randInt(1, 8);
            return { text: `${a} + ${b}`, target: a + b };
        }
        if (modePick < 0.67) {
            const a = randInt(2, 9);
            const b = randInt(2, 7);
            return { text: `${a} × ${b}`, target: a * b };
        }
        const a = randInt(10, 20);
        const b = randInt(2, 8);
        return { text: `${a} - ${b}`, target: a - b };
    }

    function applyDifficulty() {
        const config = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        player.jumpPower = config.jumpPower;
        world.gravity = config.gravity;
    }

    function resetRound(keepChallenge = false) {
        const config = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        state.basket = 0;
        state.apples = [];
        state.obstacles = [];
        state.platforms = [];
        state.enemies = [];
        state.bullets = [];
        state.enemyBullets = [];
        state.spawnAppleTick = 0;
        state.spawnHazardTick = 0;
        state.spawnEnemyTick = 0;

        if (!keepChallenge) {
            state.challenge = newChallenge();
        }

        world.speed = config.baseSpeed + Math.min(config.maxBonusSpeed, state.score * 0.18);
        player.y = world.groundY - player.height;
        player.velocityY = 0;
        player.onGround = true;
        updateHud();
    }

    function updateHud() {
        if (arcadeTargetEl) arcadeTargetEl.innerText = `Target: ${state.challenge.text} = ${state.challenge.target}`;
        if (arcadeBasketEl) arcadeBasketEl.innerText = `Basket: ${state.basket}`;
        if (arcadeScoreEl) arcadeScoreEl.innerText = `Score: ${state.score}`;
        if (arcadeLivesEl) arcadeLivesEl.innerText = `Lives: ${state.lives}`;
        if (arcadeComboEl) arcadeComboEl.innerText = `Combo: x${state.combo}`;
        if (arcadeCheckpointEl) arcadeCheckpointEl.innerText = `Checkpoint: ${state.nextCheckpoint}`;
    }

    function anyHazardNear(x, minDistance) {
        return state.obstacles.some((item) => Math.abs(item.x - x) < minDistance)
            || state.platforms.some((item) => Math.abs(item.x - x) < minDistance)
            || state.enemies.some((item) => Math.abs(item.x - x) < minDistance);
    }

    function spawnApple() {
        let spawnX = world.width + 120 + randInt(0, 120);
        let tries = 0;
        while (anyHazardNear(spawnX, 150) && tries < 6) {
            spawnX += 70;
            tries++;
        }

        const value = randInt(1, 8);
        const lane = randInt(0, 2);
        const laneY = [world.groundY - 36, world.groundY - 95, world.groundY - 150][lane];

        state.apples.push({ x: spawnX, y: laneY, radius: 18, value });
    }

    function spawnHazard() {
        const makePlatform = Math.random() < 0.46;
        const spawnX = world.width + 100 + randInt(0, 120);

        if (makePlatform) {
            state.platforms.push({
                x: spawnX,
                y: world.groundY - randInt(82, 140),
                width: randInt(90, 140),
                height: 18
            });
            return;
        }

        state.obstacles.push({
            x: spawnX,
            y: world.groundY - randInt(22, 62),
            width: randInt(24, 60),
            height: randInt(22, 62)
        });
    }

    function spawnEnemy() {
        const spawnX = world.width + 140 + randInt(0, 180);
        state.enemies.push({
            x: spawnX,
            y: world.groundY - randInt(64, 140),
            width: 42,
            height: 34,
            shootTick: randInt(30, 90)
        });
    }

    function intersectsRect(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function intersectsCircleRect(cx, cy, r, rx, ry, rw, rh) {
        const nearestX = Math.max(rx, Math.min(cx, rx + rw));
        const nearestY = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        return dx * dx + dy * dy <= r * r;
    }

    function loseLife(reasonText) {
        state.lives--;
        state.combo = 0;
        state.invincibleUntil = performance.now() + 900;
        playHitSound();

        if (state.lives <= 0) {
            world.running = false;
            if (arcadeOverlay) {
                arcadeOverlay.classList.remove("hidden");
                arcadeOverlayTitle.innerText = "Game Over";
                arcadeOverlayText.innerText = `${reasonText} Final score: ${state.score} • Best combo: x${state.bestCombo}`;
            }
            return;
        }

        showMessage("Life lost!", 800);
        resetRound(true);
    }

    function completeChallenge() {
        state.score++;
        state.combo++;
        state.bestCombo = Math.max(state.bestCombo, state.combo);

        if (state.score >= state.nextCheckpoint) {
            state.lives++;
            state.nextCheckpoint += 5;
            showMessage("Checkpoint! +1 life", 1200);
        } else {
            showMessage("Great! Next target", 900);
        }

        playSuccessSound();
        resetRound(false);
    }

    function shoot() {
        if (!world.running) return;
        if (state.shootCooldown > 0) return;

        state.shootCooldown = 14;
        state.bullets.push({
            x: player.x + player.width - 2,
            y: player.y + player.height * 0.45,
            radius: 5,
            vx: 8.3
        });
        playShootSound();
    }

    function jump() {
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        if (!world.running || !player.onGround) return;
        player.velocityY = player.jumpPower;
        player.onGround = false;
    }

    function updatePlayerPhysics() {
        const previousBottom = player.y + player.height;

        player.velocityY += world.gravity;
        player.y += player.velocityY;
        player.onGround = false;

        if (player.y + player.height >= world.groundY) {
            player.y = world.groundY - player.height;
            player.velocityY = 0;
            player.onGround = true;
        }

        for (const platform of state.platforms) {
            const onTop = previousBottom <= platform.y
                && player.y + player.height >= platform.y
                && player.x + player.width > platform.x + 6
                && player.x < platform.x + platform.width - 6
                && player.velocityY >= 0;

            if (onTop) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
            }
        }
    }

    function update() {
        if (!world.running) return;
        if (playStyleEl && playStyleEl.value !== "arcade") return;

        world.frame++;
        if (state.shootCooldown > 0) state.shootCooldown--;

        updatePlayerPhysics();

        const config = DIFFICULTY[difficulty] || DIFFICULTY.easy;
        state.spawnAppleTick++;
        state.spawnHazardTick++;
        state.spawnEnemyTick++;

        if (state.spawnAppleTick > Math.max(52, config.appleBaseTick - state.score * 2)) {
            state.spawnAppleTick = 0;
            spawnApple();
        }

        if (state.spawnHazardTick > Math.max(84, config.hazardBaseTick - state.score * 2)) {
            state.spawnHazardTick = 0;
            spawnHazard();
        }

        if (state.spawnEnemyTick > Math.max(120, config.enemyBaseTick - state.score)) {
            state.spawnEnemyTick = 0;
            spawnEnemy();
        }

        state.apples.forEach((apple) => { apple.x -= world.speed; });
        state.obstacles.forEach((obstacle) => { obstacle.x -= world.speed + 0.4; });
        state.platforms.forEach((platform) => { platform.x -= world.speed + 0.2; });
        state.enemies.forEach((enemy) => {
            enemy.x -= world.speed + 0.8;
            enemy.shootTick--;
            if (enemy.shootTick <= 0) {
                enemy.shootTick = randInt(70, 130);
                state.enemyBullets.push({ x: enemy.x + 2, y: enemy.y + enemy.height * 0.55, radius: 4, vx: -(world.speed + 4.2) });
            }
        });

        state.bullets.forEach((bullet) => { bullet.x += bullet.vx; });
        state.enemyBullets.forEach((bullet) => { bullet.x += bullet.vx; });

        state.apples = state.apples.filter((apple) => apple.x > -90);
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x > -100);
        state.platforms = state.platforms.filter((platform) => platform.x + platform.width > -100);
        state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -120);
        state.bullets = state.bullets.filter((bullet) => bullet.x < world.width + 80);
        state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.x > -80);

        for (const apple of state.apples) {
            if (intersectsCircleRect(apple.x, apple.y, apple.radius, player.x, player.y, player.width, player.height)) {
                state.basket += apple.value;
                playCollectSound();
                apple.x = -999;

                if (state.basket === state.challenge.target) {
                    completeChallenge();
                    return;
                }
                if (state.basket > state.challenge.target) {
                    loseLife("You collected too much.");
                    return;
                }
                updateHud();
            }
        }

        for (const bullet of state.bullets) {
            for (const apple of state.apples) {
                const dx = bullet.x - apple.x;
                const dy = bullet.y - apple.y;
                if (dx * dx + dy * dy <= (bullet.radius + apple.radius) ** 2) {
                    apple.x = -999;
                    bullet.x = world.width + 999;
                    showMessage("Apple removed", 520);
                }
            }

            for (const enemy of state.enemies) {
                if (intersectsCircleRect(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.width, enemy.height)) {
                    enemy.x = -999;
                    bullet.x = world.width + 999;
                    playCollectSound();
                    showMessage("Enemy down", 700);
                }
            }
        }

        if (performance.now() > state.invincibleUntil) {
            for (const obstacle of state.obstacles) {
                if (intersectsRect(player.x, player.y, player.width, player.height, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
                    loseLife("You hit an obstacle.");
                    return;
                }
            }

            for (const enemy of state.enemies) {
                if (intersectsRect(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                    loseLife("A monster hit you.");
                    return;
                }
            }

            for (const bullet of state.enemyBullets) {
                if (intersectsCircleRect(bullet.x, bullet.y, bullet.radius, player.x, player.y, player.width, player.height)) {
                    loseLife("Enemy shot you.");
                    return;
                }
            }
        }

        updateHud();
    }

    function drawBackground() {
        const sky = arcadeCtx.createLinearGradient(0, 0, 0, world.height);
        sky.addColorStop(0, "#0f223c");
        sky.addColorStop(1, "#281740");
        arcadeCtx.fillStyle = sky;
        arcadeCtx.fillRect(0, 0, world.width, world.height);

        const horizonY = world.groundY - 8;
        arcadeCtx.fillStyle = "#2a1f4f";
        arcadeCtx.fillRect(0, horizonY, world.width, world.height - horizonY);

        arcadeCtx.strokeStyle = "rgba(255,255,255,0.16)";
        arcadeCtx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            const x = ((i * 115) - (world.frame * world.speed * 0.65)) % (world.width + 130);
            arcadeCtx.beginPath();
            arcadeCtx.moveTo(x, world.height);
            arcadeCtx.lineTo(world.width / 2, horizonY);
            arcadeCtx.stroke();
        }
    }

    function drawChallengeOverlay() {
        arcadeCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
        arcadeCtx.fillRect(18, 14, 420, 74);
        arcadeCtx.strokeStyle = "rgba(255,255,255,0.25)";
        arcadeCtx.strokeRect(18, 14, 420, 74);

        arcadeCtx.fillStyle = "#ffffff";
        arcadeCtx.font = "bold 20px Arial";
        arcadeCtx.textAlign = "left";
        arcadeCtx.textBaseline = "middle";
        arcadeCtx.fillText(`TARGET: ${state.challenge.text} = ${state.challenge.target}`, 30, 42);
        arcadeCtx.fillStyle = "#8dffbf";
        arcadeCtx.font = "bold 24px Arial";
        arcadeCtx.fillText(`BASKET: ${state.basket}`, 30, 68);

        if (performance.now() < state.messageUntil) {
            arcadeCtx.fillStyle = "#ffd36b";
            arcadeCtx.font = "bold 22px Arial";
            arcadeCtx.fillText(state.messageText, 460, 58);
        }
    }

    function drawBear() {
        const blink = performance.now() < state.invincibleUntil && Math.floor(performance.now() / 90) % 2 === 0;
        if (blink) return;

        const cx = player.x + player.width * 0.5;
        const cy = player.y + player.height * 0.58;

        arcadeCtx.fillStyle = "#8f6641";
        arcadeCtx.fillRect(player.x + 7, player.y + 22, 40, 36);

        arcadeCtx.beginPath();
        arcadeCtx.arc(cx, player.y + 20, 18, 0, Math.PI * 2);
        arcadeCtx.fill();

        arcadeCtx.beginPath();
        arcadeCtx.arc(cx - 12, player.y + 8, 7, 0, Math.PI * 2);
        arcadeCtx.arc(cx + 12, player.y + 8, 7, 0, Math.PI * 2);
        arcadeCtx.fill();

        arcadeCtx.fillStyle = "#f6dfc3";
        arcadeCtx.beginPath();
        arcadeCtx.arc(cx, player.y + 24, 8, 0, Math.PI * 2);
        arcadeCtx.fill();

        arcadeCtx.fillStyle = "#1f1f1f";
        arcadeCtx.beginPath();
        arcadeCtx.arc(cx - 6, player.y + 18, 2, 0, Math.PI * 2);
        arcadeCtx.arc(cx + 6, player.y + 18, 2, 0, Math.PI * 2);
        arcadeCtx.fill();

        arcadeCtx.beginPath();
        arcadeCtx.arc(cx, player.y + 24, 2.2, 0, Math.PI * 2);
        arcadeCtx.fill();
    }

    function drawApples() {
        state.apples.forEach((apple) => {
            arcadeCtx.beginPath();
            arcadeCtx.fillStyle = "#ff3158";
            arcadeCtx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
            arcadeCtx.fill();

            arcadeCtx.fillStyle = "#fff";
            arcadeCtx.font = "bold 15px Arial";
            arcadeCtx.textAlign = "center";
            arcadeCtx.textBaseline = "middle";
            arcadeCtx.fillText(String(apple.value), apple.x, apple.y + 1);
        });
    }

    function drawPlatformsAndObstacles() {
        state.platforms.forEach((platform) => {
            arcadeCtx.fillStyle = "#3477b6";
            arcadeCtx.fillRect(platform.x, platform.y, platform.width, platform.height);
            arcadeCtx.fillStyle = "#9ad2ff";
            arcadeCtx.fillRect(platform.x + 4, platform.y + 4, platform.width - 8, 4);
        });

        state.obstacles.forEach((obstacle) => {
            arcadeCtx.fillStyle = "#6b336f";
            arcadeCtx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            arcadeCtx.fillStyle = "#f4be4f";
            arcadeCtx.fillRect(obstacle.x + 5, obstacle.y + 5, Math.max(8, obstacle.width - 10), 5);
        });
    }

    function drawEnemies() {
        state.enemies.forEach((enemy) => {
            arcadeCtx.fillStyle = "#64ffcb";
            arcadeCtx.beginPath();
            arcadeCtx.ellipse(enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5, enemy.width * 0.52, enemy.height * 0.5, 0, 0, Math.PI * 2);
            arcadeCtx.fill();
            arcadeCtx.fillStyle = "#1b1b1b";
            arcadeCtx.beginPath();
            arcadeCtx.arc(enemy.x + 14, enemy.y + 13, 2, 0, Math.PI * 2);
            arcadeCtx.arc(enemy.x + 28, enemy.y + 13, 2, 0, Math.PI * 2);
            arcadeCtx.fill();
        });
    }

    function drawBullets() {
        state.bullets.forEach((bullet) => {
            arcadeCtx.fillStyle = "#ffe45e";
            arcadeCtx.beginPath();
            arcadeCtx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            arcadeCtx.fill();
        });

        state.enemyBullets.forEach((bullet) => {
            arcadeCtx.fillStyle = "#ff7a7a";
            arcadeCtx.beginPath();
            arcadeCtx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            arcadeCtx.fill();
        });
    }

    function draw() {
        drawBackground();
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

    arcadeCanvas.addEventListener("pointerdown", (event) => {
        if (event.shiftKey) {
            shoot();
        } else {
            jump();
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

    if (arcadeRestartBtn) {
        arcadeRestartBtn.addEventListener("click", () => {
            difficulty = arcadeDifficultyEl?.value || "easy";
            applyDifficulty();
            world.running = true;
            state.score = 0;
            state.lives = 4;
            state.combo = 0;
            state.bestCombo = 0;
            state.nextCheckpoint = 5;
            state.invincibleUntil = 0;
            if (arcadeOverlay) arcadeOverlay.classList.add("hidden");
            resetRound(false);
        });
    }

    if (arcadeDifficultyEl) {
        arcadeDifficultyEl.addEventListener("change", () => {
            difficulty = arcadeDifficultyEl.value || "easy";
            applyDifficulty();
            resetRound(false);
        });
    }

    player.y = world.groundY - player.height;
    applyDifficulty();
    resetRound(false);
    loop();
}
