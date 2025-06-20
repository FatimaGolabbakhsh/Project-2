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

// Remove startBtn and start screen logic

function getDifficultySettings() {
  if (difficulty === 'easy') {
    return {
      pursuerBaseDistance: 250,
      pursuerSpeed: 0.5,
      escapeThreshold: 200,
      obstacleRate: 0.03
    };
  } else if (difficulty === 'hard') {
    return {
      pursuerBaseDistance: 180,
      pursuerSpeed: 0.8,
      escapeThreshold: 350,
      obstacleRate: 0.05
    };
  } else if (difficulty === 'impossible') {
    return {
      pursuerBaseDistance: 120,
      pursuerSpeed: 1.3,
      escapeThreshold: 600,
      obstacleRate: 0.09
    };
  }
}

function drawAnimal(x, y, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2); // head
  ctx.fillStyle = color;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.beginPath(); // eyes
  ctx.arc(x-10, y-5, 5, 0, Math.PI*2);
  ctx.arc(x+10, y-5, 5, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath(); // mouth
  ctx.arc(x, y+10, 10, 0, Math.PI, false);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawMonster(x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#a00';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x-15, y-10, 7, 0, Math.PI*2);
  ctx.arc(x+15, y-10, 7, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y+15, 18, 0, Math.PI, false);
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
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}

function drawPowerUp(x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#00e676';
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.restore();
}

function drawEscapeBar() {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(20, 20, 120, 16);
  ctx.fillStyle = '#3ad';
  ctx.fillRect(20, 20, Math.max(0, Math.min(escapeMeter, escapeThreshold)) * 120 / escapeThreshold, 16);
  ctx.strokeStyle = '#222';
  ctx.strokeRect(20, 20, 120, 16);
  ctx.font = '12px Arial';
  ctx.fillStyle = '#222';
  ctx.fillText('Escape', 25, 32);
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
  pursuerY = player.y + pursuerBaseDistance;
  score = 0;
  running = false;
  gameOver = false;
  escapeMeter = 0;
  escaped = false;
  scoreDiv.textContent = 'Score: 0';
  gameOverDiv.style.display = 'none';
}

function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  // Hide start UI
  startBtn.style.display = 'none';
  gameTitle.style.display = 'none';
  difficultySelect.style.display = 'none';
  instructions.style.display = 'none';
  // Show score
  scoreDiv.style.display = 'block';
  resetGame();
  running = true;
  sfxRun.currentTime = 0;
  sfxRun.play();
  requestAnimationFrame(gameLoop);
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
  }, 900);
}

function gameLoop() {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  // Power-up effect: invincibility and double score
  if (powerUpActive) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(Date.now()/80);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    powerUpTimer--;
    if (powerUpTimer <= 0) {
      powerUpActive = false;
    }
  }
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
      document.getElementById('restart-btn').onclick = startGame;
      return;
    }
  } else if (pursuerY < player.y + 60) {
    endGame();
    return;
  }
  // Player jump
  if (player.jumping) {
    player.vy -= 1.2;
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
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
  if (!running) return;
  if (e.key === 'ArrowLeft' && player.lane > 0) player.lane--;
  if (e.key === 'ArrowRight' && player.lane < 2) player.lane++;
  if ((e.key === 'ArrowUp' || e.key === ' ') && !player.jumping) {
    player.jumping = true;
    player.vy = 16;
  }
});

startBtn.onclick = startGame;

restartBtn.onclick = function() {
  gameStarted = false;
  // Show start UI again
  startBtn.style.display = 'block';
  gameTitle.style.display = 'block';
  difficultySelect.style.display = 'block';
  instructions.style.display = 'block';
  scoreDiv.style.display = 'none';
  gameOverDiv.style.display = 'none';
  resetGame();
  running = false;
};

window.onload = function() {
  resetGame();
  // Hide score and game over until game starts
  scoreDiv.style.display = 'none';
  gameOverDiv.style.display = 'none';
  running = false;
};

difficultySelect.onchange = resetGame;
