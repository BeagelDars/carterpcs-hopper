// js/app.js
// Main Application Controller for Carter PCs Runner

import { CarterRunner } from './game.js';
import { COMPUTER_PARTS } from './parts.js';

window.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const canvas = document.getElementById('game-canvas');
  const fpsDisplay = document.getElementById('fps-display');
  const scoreDisplay = document.getElementById('score-display');
  const highscoreDisplay = document.getElementById('highscore-display');
  const btnParts = document.getElementById('btn-parts');
  const btnCloseParts = document.getElementById('btn-close-parts');
  const btnViewParts = document.getElementById('btn-view-parts');
  const partsDrawer = document.getElementById('parts-drawer');
  const partsList = document.getElementById('parts-list');

  // Cooldown Elements
  const cooldownPill = document.getElementById('cooldown-pill');
  const cooldownRingFill = document.getElementById('cooldown-ring-fill');
  const cooldownText = document.getElementById('cooldown-text');
  const btnJump = document.getElementById('btn-jump');
  const jumpBtnLabel = document.getElementById('jump-btn-label');

  // Overlays
  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const gameoverQuote = document.getElementById('gameover-quote');
  const finalScoreEl = document.getElementById('final-score');
  const dodgedCountEl = document.getElementById('dodged-count');
  const pasteCountEl = document.getElementById('paste-count');
  const bestScoreEl = document.getElementById('best-score');

  // Control buttons
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');

  // Populate Parts Manual
  populatePartsManual();

  // Initialize Game Instance
  const runner = new CarterRunner(canvas, {
    onStateChange: (state) => {
      if (state === 'PLAYING') {
        startOverlay.classList.add('hidden');
        gameoverOverlay.classList.add('hidden');
      }
    },
    onScoreUpdate: (score, highScore, fps) => {
      scoreDisplay.textContent = score.toLocaleString();
      highscoreDisplay.textContent = highScore.toLocaleString();
      fpsDisplay.textContent = fps;
    },
    onCooldownUpdate: (progress, remaining) => {
      if (remaining <= 0) {
        cooldownPill.classList.remove('recharging');
        cooldownPill.classList.add('ready');
        cooldownText.textContent = 'JUMP READY';
        cooldownRingFill.style.transform = 'scale(1)';
        btnJump.classList.remove('on-cooldown');
        jumpBtnLabel.textContent = 'JUMP ⇪';
      } else {
        cooldownPill.classList.add('recharging');
        cooldownPill.classList.remove('ready');
        cooldownText.textContent = `RECHARGE ${remaining.toFixed(1)}s`;
        cooldownRingFill.style.transform = `scale(${Math.max(0.2, progress)})`;
        btnJump.classList.add('on-cooldown');
        jumpBtnLabel.textContent = `${remaining.toFixed(1)}s`;
      }
    },
    onCooldownReady: () => {
      cooldownPill.style.transform = 'scale(1.1)';
      setTimeout(() => {
        cooldownPill.style.transform = '';
      }, 150);
    },
    onGameOver: (stats) => {
      gameoverQuote.textContent = `"${stats.quote}"`;
      finalScoreEl.textContent = stats.score.toLocaleString();
      dodgedCountEl.textContent = stats.partsDodged;
      pasteCountEl.textContent = stats.pasteCollected;
      bestScoreEl.textContent = stats.highScore.toLocaleString();
      gameoverOverlay.classList.remove('hidden');
    }
  });

  // Display initial high score
  highscoreDisplay.textContent = runner.highScore.toLocaleString();

  // Handle Resize
  window.addEventListener('resize', () => runner.resize());

  // Input Handling: Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; // Prevent key repeat auto-trigger

    if (e.code === 'Space') {
      e.preventDefault();
      if (runner.state === 'START' || runner.state === 'GAMEOVER') {
        runner.start();
        return;
      }
      if (runner.state === 'PLAYING') {
        runner.jump();
      }
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      runner.moveLeft();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      runner.moveRight();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (runner.state === 'PLAYING') {
        runner.jump();
      }
    } else if (e.code === 'Enter') {
      if (runner.state === 'START' || runner.state === 'GAMEOVER') {
        runner.start();
      }
    }
  });

  // Input Handling: Control Buttons
  btnLeft.addEventListener('click', (e) => {
    e.preventDefault();
    runner.moveLeft();
  });

  btnRight.addEventListener('click', (e) => {
    e.preventDefault();
    runner.moveRight();
  });

  btnJump.addEventListener('click', (e) => {
    e.preventDefault();
    runner.jump();
  });

  btnStart.addEventListener('click', () => runner.start());
  btnRestart.addEventListener('click', () => runner.start());

  // Touch Swipe on Canvas
  let touchStartX = 0;
  let touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (runner.state === 'START' || runner.state === 'GAMEOVER') {
        runner.start();
        return;
      }

      if (Math.max(absDx, absDy) > 25) {
        if (absDx > absDy) {
          if (dx < 0) runner.moveLeft();
          else runner.moveRight();
        } else {
          if (dy < 0) runner.jump(); // Swipe up jumps
        }
      } else {
        // Simple tap on canvas triggers jump
        runner.jump();
      }
    }
  }, { passive: true });

  // Parts Manual Drawer
  function openPartsDrawer() {
    partsDrawer.classList.remove('closed');
  }

  function closePartsDrawer() {
    partsDrawer.classList.add('closed');
  }

  btnParts.addEventListener('click', openPartsDrawer);
  btnViewParts.addEventListener('click', openPartsDrawer);
  btnCloseParts.addEventListener('click', closePartsDrawer);

  function populatePartsManual() {
    partsList.innerHTML = '';
    COMPUTER_PARTS.forEach(part => {
      const card = document.createElement('div');
      card.className = 'part-card';

      const isBonus = part.type === 'collectible';
      card.innerHTML = `
        <div class="part-card-img">
          <img src="${part.svg}" alt="${part.name}">
        </div>
        <div class="part-card-info">
          <div class="part-card-name">${part.name}</div>
          <div class="part-card-comment">"${part.carterComment}"</div>
        </div>
        <div class="part-card-badge" style="color: ${isBonus ? '#0284c7' : '#ef4444'};">
          ${isBonus ? `+${part.points} PTS` : 'OBSTACLE'}
        </div>
      `;
      partsList.appendChild(card);
    });
  }
});
