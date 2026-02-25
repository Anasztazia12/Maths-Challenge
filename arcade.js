const arcadeCanvas = document.getElementById("arcade-canvas");
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

const arcadeCtx = arcadeCanvas.getContext("2d");
const audioCtx = window.AudioContext ? new AudioContext() : null;

const DIFFICULTY = {
    easy: { baseSpeed: 3.6, maxBonusSpeed: 2.1, jumpPower: -14.2, gravity: 0.75, appleBaseTick: 102, obstacleBaseTick: 150 },
    medium: { baseSpeed: 4.2, maxBonusSpeed: 2.8, jumpPower: -15, gravity: 0.85, appleBaseTick: 95, obstacleBaseTick: 130 },
    hard: { baseSpeed: 5.1, maxBonusSpeed: 3.6, jumpPower: -15.8, gravity: 0.95, appleBaseTick: 86, obstacleBaseTick: 114 }
};

let difficulty = (arcadeDifficultyEl?.value || "medium");

const world = {
    width: arcadeCanvas.width,
    height: arcadeCanvas.height,
    groundY: arcadeCanvas.height - 70,
    gravity: 0.85,
    speed: 4.2,
    frame: 0,
    running: true
};

const player = {
    x: 120,
    y: 0,
    width: 44,
    height: 62,
    velocityY: 0,
    jumpPower: -15,
    onGround: false
};

const gameState = {
    score: 0,
    lives: 3,
    combo: 0,
    bestCombo: 0,
    nextCheckpoint: 5,
    basket: 0,
    challenge: null,
    apples: [],
    obstacles: [],
    spawnAppleTick: 0,
    spawnObstacleTick: 0,
    invincibleUntil: 0
};

function playTone(freq, duration, type = "sine", volume = 0.05) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
}

function playCollectSound() {
    playTone(540, 0.08, "triangle", 0.05);
}

function playSuccessSound() {
    playTone(620, 0.1, "triangle", 0.06);
    setTimeout(() => playTone(780, 0.12, "triangle", 0.05), 70);
}

function playHitSound() {
    playTone(180, 0.14, "sawtooth", 0.06);
}

function applyDifficulty() {
    const config = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    player.jumpPower = config.jumpPower;
    world.gravity = config.gravity;
}

function newChallenge() {
    const modePick = Math.random();

    if (modePick < 0.34) {
        const a = randInt(2, 9);
        const b = randInt(1, 9);
        return { text: `${a} + ${b}`, target: a + b };
    }

    if (modePick < 0.67) {
        const a = randInt(2, 12);
        const b = randInt(2, 12);
        return { text: `${a} × ${b}`, target: a * b };
    }

    const a = randInt(8, 20);
    const b = randInt(2, 8);
    return { text: `${a} - ${b}`, target: a - b };
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resetRound(keepChallenge = false) {
    const config = DIFFICULTY[difficulty] || DIFFICULTY.medium;

    gameState.basket = 0;
    gameState.apples = [];
    gameState.obstacles = [];
    gameState.spawnAppleTick = 0;
    gameState.spawnObstacleTick = 0;

    if (!keepChallenge) {
        gameState.challenge = newChallenge();
    }

    world.speed = config.baseSpeed + Math.min(config.maxBonusSpeed, gameState.score * 0.22);
    updateHud();
}

function loseLife(reasonText) {
    gameState.lives--;
    gameState.combo = 0;
    gameState.invincibleUntil = performance.now() + 800;
    playHitSound();

    if (gameState.lives <= 0) {
        endGame(reasonText);
        return;
    }

    resetRound(true);
}

function endGame(reasonText) {
    world.running = false;
    if (arcadeOverlay) {
        arcadeOverlay.classList.remove("hidden");
        arcadeOverlayTitle.innerText = "Game Over";
        arcadeOverlayText.innerText = `${reasonText} Final score: ${gameState.score} • Best combo: x${gameState.bestCombo}`;
    }
}

function completeChallenge() {
    gameState.score++;
    gameState.combo++;
    gameState.bestCombo = Math.max(gameState.bestCombo, gameState.combo);

    if (gameState.score >= gameState.nextCheckpoint) {
        gameState.lives++;
        gameState.nextCheckpoint += 5;
    }

    playSuccessSound();
    resetRound(false);
}

function updateHud() {
    if (arcadeTargetEl) arcadeTargetEl.innerText = `Target: ${gameState.challenge.text} = ${gameState.challenge.target}`;
    if (arcadeBasketEl) arcadeBasketEl.innerText = `Basket: ${gameState.basket}`;
    if (arcadeScoreEl) arcadeScoreEl.innerText = `Score: ${gameState.score}`;
    if (arcadeLivesEl) arcadeLivesEl.innerText = `Lives: ${gameState.lives}`;
    if (arcadeComboEl) arcadeComboEl.innerText = `Combo: x${gameState.combo}`;
    if (arcadeCheckpointEl) arcadeCheckpointEl.innerText = `Checkpoint: ${gameState.nextCheckpoint}`;
}

function spawnApple() {
    const value = randInt(1, 9);
    const high = Math.random() < 0.5;

    gameState.apples.push({
        x: world.width + 50,
        y: high ? world.groundY - 115 : world.groundY - 45,
        radius: 18,
        value
    });
}

function spawnObstacle() {
    gameState.obstacles.push({
        x: world.width + 40,
        y: world.groundY - 35,
        width: randInt(30, 44),
        height: randInt(35, 55)
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

function update() {
    if (!world.running) return;

    world.frame++;

    player.velocityY += world.gravity;
    player.y += player.velocityY;

    if (player.y + player.height >= world.groundY) {
        player.y = world.groundY - player.height;
        player.velocityY = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }

    gameState.spawnAppleTick++;
    gameState.spawnObstacleTick++;

    const config = DIFFICULTY[difficulty] || DIFFICULTY.medium;

    if (gameState.spawnAppleTick > Math.max(45, config.appleBaseTick - gameState.score * 2)) {
        gameState.spawnAppleTick = 0;
        spawnApple();
    }

    if (gameState.spawnObstacleTick > Math.max(66, config.obstacleBaseTick - gameState.score * 2)) {
        gameState.spawnObstacleTick = 0;
        spawnObstacle();
    }

    gameState.apples.forEach((apple) => {
        apple.x -= world.speed;
    });

    gameState.obstacles.forEach((obstacle) => {
        obstacle.x -= world.speed + 1.1;
    });

    gameState.apples = gameState.apples.filter((apple) => apple.x > -80);
    gameState.obstacles = gameState.obstacles.filter((obstacle) => obstacle.x > -80);

    for (const apple of gameState.apples) {
        if (intersectsCircleRect(
            apple.x,
            apple.y,
            apple.radius,
            player.x,
            player.y,
            player.width,
            player.height
        )) {
            gameState.basket += apple.value;
            playCollectSound();
            apple.x = -100;

            if (gameState.basket === gameState.challenge.target) {
                completeChallenge();
                return;
            }

            if (gameState.basket > gameState.challenge.target) {
                loseLife("Basket went above target.");
                return;
            }

            updateHud();
        }
    }

    if (performance.now() > gameState.invincibleUntil) {
        for (const obstacle of gameState.obstacles) {
            if (intersectsRect(player.x, player.y, player.width, player.height, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
                loseLife("You hit an obstacle.");
                return;
            }
        }
    }
}

function drawBackground() {
    const sky = arcadeCtx.createLinearGradient(0, 0, 0, world.height);
    sky.addColorStop(0, "#101430");
    sky.addColorStop(1, "#201038");
    arcadeCtx.fillStyle = sky;
    arcadeCtx.fillRect(0, 0, world.width, world.height);

    const horizonY = world.groundY - 10;
    arcadeCtx.fillStyle = "#2c1b4d";
    arcadeCtx.fillRect(0, horizonY, world.width, world.height - horizonY);

    arcadeCtx.strokeStyle = "rgba(255,255,255,0.18)";
    arcadeCtx.lineWidth = 1;

    for (let i = 0; i < 16; i++) {
        const x = ((i * 110) - (world.frame * world.speed * 0.8)) % (world.width + 120);
        arcadeCtx.beginPath();
        arcadeCtx.moveTo(x, world.height);
        arcadeCtx.lineTo(world.width / 2, horizonY);
        arcadeCtx.stroke();
    }

    arcadeCtx.strokeStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 9; i++) {
        const y = horizonY + i * 28;
        arcadeCtx.beginPath();
        arcadeCtx.moveTo(0, y);
        arcadeCtx.lineTo(world.width, y);
        arcadeCtx.stroke();
    }
}

function drawPlayer() {
    const blink = performance.now() < gameState.invincibleUntil && Math.floor(performance.now() / 80) % 2 === 0;
    if (blink) return;

    arcadeCtx.fillStyle = "#00ff7f";
    arcadeCtx.fillRect(player.x, player.y, player.width, player.height);

    arcadeCtx.fillStyle = "#ffffff";
    arcadeCtx.fillRect(player.x + 28, player.y + 10, 10, 10);

    arcadeCtx.fillStyle = "#222";
    arcadeCtx.fillRect(player.x + 31, player.y + 13, 4, 4);
}

function drawApples() {
    gameState.apples.forEach((apple) => {
        arcadeCtx.beginPath();
        arcadeCtx.fillStyle = "#ff2f55";
        arcadeCtx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
        arcadeCtx.fill();

        arcadeCtx.fillStyle = "#ffffff";
        arcadeCtx.font = "bold 16px Arial";
        arcadeCtx.textAlign = "center";
        arcadeCtx.textBaseline = "middle";
        arcadeCtx.fillText(String(apple.value), apple.x, apple.y + 1);

        arcadeCtx.strokeStyle = "#5eff9c";
        arcadeCtx.lineWidth = 2;
        arcadeCtx.beginPath();
        arcadeCtx.moveTo(apple.x, apple.y - apple.radius);
        arcadeCtx.lineTo(apple.x + 4, apple.y - apple.radius - 9);
        arcadeCtx.stroke();
    });
}

function drawObstacles() {
    gameState.obstacles.forEach((obstacle) => {
        arcadeCtx.fillStyle = "#663399";
        arcadeCtx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        arcadeCtx.fillStyle = "#ffcc00";
        arcadeCtx.fillRect(obstacle.x + 6, obstacle.y + 8, obstacle.width - 12, 6);
    });
}

function draw() {
    drawBackground();
    drawObstacles();
    drawApples();
    drawPlayer();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function jump() {
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    if (!world.running) return;
    if (!player.onGround) return;
    player.velocityY = player.jumpPower;
    player.onGround = false;
}

window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        jump();
    }
});

arcadeCanvas.addEventListener("pointerdown", jump);

if (arcadeRestartBtn) {
    arcadeRestartBtn.addEventListener("click", () => {
        difficulty = arcadeDifficultyEl?.value || "medium";
        applyDifficulty();

        world.running = true;
        gameState.score = 0;
        gameState.lives = 3;
        gameState.combo = 0;
        gameState.bestCombo = 0;
        gameState.nextCheckpoint = 5;
        gameState.invincibleUntil = 0;
        if (arcadeOverlay) arcadeOverlay.classList.add("hidden");
        resetRound(false);
    });
}

if (arcadeDifficultyEl) {
    arcadeDifficultyEl.addEventListener("change", () => {
        difficulty = arcadeDifficultyEl.value || "medium";
        applyDifficulty();
        resetRound(false);
    });
}

player.y = world.groundY - player.height;
difficulty = arcadeDifficultyEl?.value || "medium";
applyDifficulty();
resetRound(false);
loop();
