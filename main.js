const canvas = document.getElementById('runner-canvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart-btn');
const scoreDiv = document.getElementById('score');
const gameOverDiv = document.getElementById('game-over');
const sfxScream = document.getElementById('sfx-scream');
const sfxRun = document.getElementById('sfx-run');
const difficultySelect = document.getElementById('difficulty');
const startBtn = document.getElementById('start-btn');
const gameTitle = document.getElementById('game-title');
const instructions = document.getElementById('instructions');

const laneX = [100, 200, 300];
let player = { lane: 1, y: 500, vy: 0, jumping: false };
let obstacles = [];
let pursuerY = 600;
let score = 0;
let running = false;
let gameOver = false;
let escapeMeter = 0;
let escapeThreshold = 300; // How much you need to escape
let escaped = false;
let pursuerSpeed = 0.7;
let pursuerBaseDistance = 200; // Start farther away
let difficulty = 'easy';
let gameStarted = false;
let coins = [];
let powerUps = [];
let speedUps = [];
let powerUpActive = false;
let powerUpTimer = 0;
let speedUpActive = false;
let speedUpTimer = 0;

// Add a simple page state: 'home' or 'game'
let pageState = 'home';

function showStartScreen() {
  startBtn.style.display = 'block';
  gameTitle.style.display = 'block';
  difficultySelect.style.display = 'block';
  instructions.style.display = 'block';
  scoreDiv.style.display = 'none';
  gameOverDiv.style.display = 'none';
}

function hideStartScreen() {
  startBtn.style.display = 'none';
  gameTitle.style.display = 'none';
  difficultySelect.style.display = 'none';
  instructions.style.display = 'none';
  scoreDiv.style.display = 'block';
}

function getDifficultySettings() {
  if (difficulty === 'easy') {
    return {
      pursuerBaseDistance: 420, // farther away
      pursuerSpeed: 0.32,      // slower
      escapeThreshold: 500,    // less needed to escape
      obstacleRate: 0.018      // fewer obstacles
    };
  } else if (difficulty === 'hard') {
    return {
      pursuerBaseDistance: 260, // closer
      pursuerSpeed: 0.82,      // faster
      escapeThreshold: 1100,   // more needed to escape
      obstacleRate: 0.055      // more obstacles
    };
  } else if (difficulty === 'impossible') {
    return {
      pursuerBaseDistance: 140, // very close
      pursuerSpeed: 1.45,      // very fast
      escapeThreshold: 2200,   // much more needed to escape
      obstacleRate: 0.11       // tons of obstacles
    };
  }
}

// --- Parallax horror background layers ---
function drawParallaxBackground() {
  // Sky
  ctx.save();
  ctx.fillStyle = '#181a22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Moon
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(canvas.width-80, 80, 50, 0, Math.PI*2);
  ctx.fillStyle = '#e0e0e0';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Trees (parallax)
  for (let layer=0; layer<3; layer++) {
    let speed = [0.2, 0.5, 1][layer];
    let yBase = [420, 470, 520][layer];
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.12*layer;
    for (let i=0; i<canvas.width; i+=60) {
      let sway = Math.sin(Date.now()/900 + i/80 + layer*2) * 8;
      ctx.beginPath();
      ctx.moveTo(i+sway, yBase);
      ctx.lineTo(i+10+sway, yBase-60-10*layer);
      ctx.lineTo(i+20+sway, yBase);
      ctx.closePath();
      ctx.fillStyle = ['#222','#2a2a2a','#333'][layer];
      ctx.fill();
    }
    ctx.restore();
  }
  // Fog
  for (let f=0; f<2; f++) {
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.07*Math.sin(Date.now()/1200+f);
    ctx.fillStyle = '#b0c4de';
    ctx.beginPath();
    for (let x=0; x<canvas.width+60; x+=60) {
      let y = 540 + 18*Math.sin(Date.now()/900 + x/80 + f*2);
      ctx.arc(x, y, 40+10*f, 0, Math.PI*2);
    }
    ctx.fill();
    ctx.restore();
  }
  // Vignette
  let grad = ctx.createRadialGradient(
    canvas.width/2, canvas.height/2, canvas.width/2-40,
    canvas.width/2, canvas.height/2, canvas.width/2
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
}

// --- Enhanced draw functions ---
function drawAnimal(x, y, color) {
  ctx.save();
  // Bobbing
  let bob = Math.sin(Date.now()/220)*6;
  // Shadow
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.ellipse(x, y+32+bob, 22, 8, 0, 0, Math.PI*2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.globalAlpha = 1;
  // Body
  ctx.beginPath();
  ctx.arc(x, y+bob, 28, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = '#00e6ff';
  ctx.shadowBlur = 16;
  ctx.fill();
  // Eyes (glow)
  ctx.save();
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x-10, y-5+bob, 5, 0, Math.PI*2);
  ctx.arc(x+10, y-5+bob, 5, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  // Mouth
  ctx.beginPath();
  ctx.arc(x, y+10+bob, 10, 0, Math.PI, false);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawMonster(x, y) {
  ctx.save();
  // Bobbing
  let bob = Math.sin(Date.now()/180)*10;
  // Shadow
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.ellipse(x, y+44+bob, 32, 12, 0, 0, Math.PI*2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.globalAlpha = 1;
  // Body
  ctx.beginPath();
  ctx.arc(x, y+bob, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#a00';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur = 30;
  ctx.fill();
  // Eyes (glow, flicker)
  ctx.save();
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 18 + 8*Math.abs(Math.sin(Date.now()/90));
  ctx.beginPath();
  ctx.arc(x-15, y-10+bob, 7, 0, Math.PI*2);
  ctx.arc(x+15, y-10+bob, 7, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  // Mouth
  ctx.beginPath();
  ctx.arc(x, y+15+bob, 18, 0, Math.PI, false);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(x, y) {
  ctx.save();
  ctx.fillStyle = '#444';
  ctx.fillRect(x-20, y-10, 40, 20);
  ctx.strokeStyle = '#222';
  ctx.strokeRect(x-20, y-10, 40, 20);
  ctx.restore();
}

function drawCoin(x, y) {
  ctx.save();
  // Flicker
  let flicker = 0.7 + 0.3*Math.abs(Math.sin(Date.now()/120 + y/30));
  ctx.globalAlpha = flicker;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSpeedUp(x, y) {
  ctx.save();
  // Flicker
  let flicker = 0.7 + 0.3*Math.abs(Math.sin(Date.now()/100 + y/20));
  ctx.globalAlpha = flicker;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#f00';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPowerUp(x, y) {
  ctx.save();
  // Flicker
  let flicker = 0.7 + 0.3*Math.abs(Math.sin(Date.now()/90 + y/18));
  ctx.globalAlpha = flicker;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#00e676';
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 22;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- Proximity flash effect ---
function drawProximityFlash() {
  let dist = pursuerY - player.y;
  if (dist < 120) {
    let flash = 0.18 + 0.18*Math.abs(Math.sin(Date.now()/60));
    ctx.save();
    ctx.globalAlpha = flash * (1 - dist/120);
    ctx.fillStyle = '#f00';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }
}

// --- UI horror polish ---
function drawHorrorUI() {
  // Dripping effect on escape bar
  ctx.save();
  let dripY = 36 + 2*Math.abs(Math.sin(Date.now()/200));
  ctx.fillStyle = '#3ad';
  ctx.beginPath();
  ctx.arc(20 + Math.max(0, Math.min(escapeMeter, escapeThreshold)) * 120 / escapeThreshold, dripY, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// --- Draw the escape bar at the top of the canvas ---
function drawEscapeBar() {
  ctx.save();
  // Bar background
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#222';
  ctx.fillRect(20, 20, 120, 18);
  // Bar fill
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#3ad';
  let fill = Math.max(0, Math.min(escapeMeter, escapeThreshold)) * 120 / escapeThreshold;
  ctx.fillRect(20, 20, fill, 18);
  // Bar border
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(20, 20, 120, 18);
  // Text
  ctx.font = 'bold 15px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText('Escape', 24, 34);
  ctx.restore();
}

function resetGame() {
  difficulty = difficultySelect.value;
  const settings = getDifficultySettings();
  pursuerBaseDistance = settings.pursuerBaseDistance;
  pursuerSpeed = settings.pursuerSpeed;
  escapeThreshold = settings.escapeThreshold;
  player = { lane: 1, y: 500, vy: 0, jumping: false };
  obstacles = [];
  coins = [];
  powerUps = [];
  speedUps = [];
  pursuerY = player.y + pursuerBaseDistance;
  score = 0;
  running = false;
  gameOver = false;
  escapeMeter = 0;
  escaped = false;
  powerUpActive = false;
  powerUpTimer = 0;
  speedUpActive = false;
  speedUpTimer = 0;
  scoreDiv.textContent = 'Score: 0';
  gameOverDiv.style.display = 'none';
}

function startGame() {
  // Always show the game canvas and score, hide home/start UI
  hideStartScreen();
  canvas.style.display = 'block';
  scoreDiv.style.display = 'block';
  gameOverDiv.style.display = 'none';
  // Reset all state and start the game
  resetGame();
  // Set running and gameStarted flags after reset
  running = true;
  gameStarted = true;
  // Start the game loop (no forced draw, let gameLoop handle everything)
  sfxRun.currentTime = 0;
  sfxRun.play();
  requestAnimationFrame(gameLoop);
}

function showHomePage() {
  pageState = 'home';
  showStartScreen();
  // Hide canvas and score/game UI
  canvas.style.display = 'none';
  scoreDiv.style.display = 'none';
  gameOverDiv.style.display = 'none';
}

function showGamePage() {
  pageState = 'game';
  hideStartScreen();
  canvas.style.display = 'block';
  scoreDiv.style.display = 'block';
  resetGame();
  running = true;
  sfxRun.currentTime = 0;
  sfxRun.play();
  requestAnimationFrame(gameLoop);
}

// Always attach these listeners
startBtn.onclick = startGame;

function setRestartHandler() {
  const btn = document.getElementById('restart-btn');
  if (btn) {
    btn.onclick = function() {
      showHomePage();
      gameStarted = false;
      running = false;
    };
  }
}

function endGame() {
  running = false;
  gameOver = true;
  sfxRun.pause();
  sfxScream.currentTime = 0;
  sfxScream.play();
  // Show ghost jumpscare
  ctx.save();
  ctx.font = '100px Arial';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.92;
  ctx.fillText('👻', canvas.width/2, canvas.height/2 + 30);
  ctx.restore();
  setTimeout(() => {
    gameOverDiv.style.display = 'block';
    setRestartHandler();
  }, 900);
}

function gameLoop() {
  if (!running) return;
  // --- Draw parallax horror background ---
  drawParallaxBackground();
  ctx.clearRect(0, 0, canvas.width, 80); // keep top UI clear
  // Draw tracks
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(laneX[i], 0);
    ctx.lineTo(laneX[i], 600);
    ctx.stroke();
  }
  // Draw obstacles
  for (let i = 0; i < obstacles.length; i++) {
    drawObstacle(laneX[obstacles[i].lane], obstacles[i].y);
  }
  // Draw player animal
  drawAnimal(laneX[player.lane], player.y, '#3ad');
  // Draw monster pursuer
  drawMonster(laneX[player.lane], pursuerY);
  // Draw and move coins
  for (let i = 0; i < coins.length; i++) {
    drawCoin(laneX[coins[i].lane], coins[i].y);
    coins[i].y += 7;
  }
  coins = coins.filter(c => c.y < 650);
  // Draw and move power-ups
  for (let i = 0; i < powerUps.length; i++) {
    drawPowerUp(laneX[powerUps[i].lane], powerUps[i].y);
    powerUps[i].y += 7;
  }
  powerUps = powerUps.filter(p => p.y < 650);
  // Draw and move speed-ups
  for (let i = 0; i < speedUps.length; i++) {
    drawSpeedUp(laneX[speedUps[i].lane], speedUps[i].y);
    speedUps[i].y += 7;
  }
  speedUps = speedUps.filter(s => s.y < 650);
  // Move obstacles
  for (let i = 0; i < obstacles.length; i++) {
    obstacles[i].y += 7;
  }
  // Remove off-screen obstacles
  obstacles = obstacles.filter(o => o.y < 650);
  // Add new coins
  if (Math.random() < 0.03) {
    coins.push({ lane: Math.floor(Math.random()*3), y: -30 });
  }
  // Add new power-ups
  if (Math.random() < 0.008 && !powerUpActive) {
    powerUps.push({ lane: Math.floor(Math.random()*3), y: -30 });
  }
  // Add new speed-ups
  if (Math.random() < 0.012 && !speedUpActive) {
    speedUps.push({ lane: Math.floor(Math.random()*3), y: -30 });
  }
  // Add new obstacles
  const settings = getDifficultySettings();
  if (Math.random() < settings.obstacleRate) {
    obstacles.push({ lane: Math.floor(Math.random()*3), y: -30 });
  }
  // Coin collection
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].lane === player.lane && Math.abs(coins[i].y - player.y) < 32) {
      score += 25;
      coins.splice(i, 1);
      i--;
    }
  }
  // Power-up collection
  for (let i = 0; i < powerUps.length; i++) {
    if (powerUps[i].lane === player.lane && Math.abs(powerUps[i].y - player.y) < 32) {
      powerUpActive = true;
      powerUpTimer = 180; // 3 seconds at 60fps
      powerUps.splice(i, 1);
      i--;
    }
  }
  // Speed-up collection
  for (let i = 0; i < speedUps.length; i++) {
    if (speedUps[i].lane === player.lane && Math.abs(speedUps[i].y - player.y) < 32) {
      speedUpActive = true;
      speedUpTimer = 300; // 5 seconds at 60fps
      speedUps.splice(i, 1);
      i--;
    }
  }
  // Speed-up effect: increase player speed
  let jumpBoost = 16;
  let speedBoost = 1;
  if (speedUpActive) {
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.10 * Math.sin(Date.now()/60); // LESS BRIGHT
    ctx.fillStyle = '#f00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    speedUpTimer--;
    speedBoost = 1.7;
    jumpBoost = 20;
    if (speedUpTimer <= 0) {
      speedUpActive = false;
    }
  }
  // Power-up effect: invincibility and double score
  if (powerUpActive) {
    ctx.save();
    ctx.globalAlpha = 0.13 + 0.13 * Math.sin(Date.now()/80); // LESS BRIGHT
    ctx.fillStyle = '#00e676';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    powerUpTimer--;
    if (powerUpTimer <= 0) {
      powerUpActive = false;
    }
  }
  // Move obstacles, coins, power-ups, and speed-ups
  for (let i = 0; i < obstacles.length; i++) obstacles[i].y += 7 * speedBoost;
  for (let i = 0; i < coins.length; i++) coins[i].y += 7 * speedBoost;
  for (let i = 0; i < powerUps.length; i++) powerUps[i].y += 7 * speedBoost;
  for (let i = 0; i < speedUps.length; i++) speedUps[i].y += 7 * speedBoost;
  // Remove off-screen coins, power-ups, and speed-ups
  coins = coins.filter(c => c.y < 650);
  powerUps = powerUps.filter(p => p.y < 650);
  speedUps = speedUps.filter(s => s.y < 650);
  // Check collisions (update for power-up)
  for (let i = 0; i < obstacles.length; i++) {
    if (obstacles[i].lane === player.lane && Math.abs(obstacles[i].y - player.y) < 32) {
      if (!player.jumping && !powerUpActive) {
        pursuerY -= 40;
        if (pursuerY < player.y + 40) {
          endGame();
          return;
        }
      }
    }
  }
  // Move pursuer closer or farther
  if (pursuerY > player.y + 80) {
    // If player is jumping, slow pursuer and increase distance
    if (player.jumping) {
      pursuerSpeed = Math.max(0.3, pursuerSpeed - 0.08);
      pursuerY += 2.5; // Jumping increases distance from pursuer
      escapeMeter += 2.5; // Also helps escape
    } else if (obstacles.some(o => o.lane === player.lane && Math.abs(o.y - player.y) < 32)) {
      pursuerSpeed = Math.max(0.4, pursuerSpeed - 0.04);
      escapeMeter += 2 + Math.random();
    } else {
      pursuerSpeed = Math.min(1.5, pursuerSpeed + 0.01 + score/2000);
      escapeMeter += 0.2;
    }
    pursuerY -= pursuerSpeed;
    if (escapeMeter >= escapeThreshold && !escaped) {
      escaped = true;
      running = false;
      sfxRun.pause();
      scoreDiv.textContent = 'Score: ' + score + ' (You escaped the monster!)';
      gameOverDiv.innerHTML = 'You Escaped!<br><button id="restart-btn">Restart</button>';
      gameOverDiv.style.display = 'block';
      setRestartHandler();
      return;
    }
  } else if (pursuerY < player.y + 60) {
    endGame();
    return;
  }
  // Player jump
  if (player.jumping) {
    player.vy -= 1.2 * speedBoost;
    player.y -= player.vy;
    if (player.y >= 500) {
      player.y = 500;
      player.jumping = false;
      player.vy = 0;
    }
  }
  // Score (double if power-up)
  if (powerUpActive) {
    score += 1;
  } else {
    score++;
  }
  scoreDiv.textContent = 'Score: ' + score;
  drawEscapeBar();
  // --- UI horror polish ---
  drawHorrorUI();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
  if (!running) return;
  if (e.key === 'ArrowLeft' && player.lane > 0) player.lane--;
  if (e.key === 'ArrowRight' && player.lane < 2) player.lane++;
  if ((e.key === 'ArrowUp' || e.key === ' ') && !player.jumping) {
    player.jumping = true;
    player.vy = speedUpActive ? 20 : 16;
  }
});

window.onload = function() {
  showHomePage();
  // Always ensure canvas is hidden on home
  canvas.style.display = 'none';
};

difficultySelect.onchange = resetGame;
