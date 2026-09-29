// js/app.js
// Simplified Cartoon App Controller

import { CarterRunner } from './game.js';
import { audio } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const scoreDisplay = document.getElementById('score-display');
  const highscoreDisplay = document.getElementById('highscore-display');
  const btnSound = document.getElementById('btn-sound');

  // Modals
  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const finalScoreEl = document.getElementById('final-score');
  const bestScoreEl = document.getElementById('best-score');

  // Controls
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const btnJump = document.getElementById('btn-jump');
  const cooldownFill = document.getElementById('cooldown-fill');
  const jumpTitle = btnJump.querySelector('.jump-title');

  // Initialize Game Instance
  const runner = new CarterRunner(canvas, {
    onStateChange: (state) => {
      if (state === 'PLAYING') {
        startOverlay.classList.add('hidden');
        gameoverOverlay.classList.add('hidden');
      }
    },
    onScoreUpdate: (score, highScore) => {
      scoreDisplay.textContent = score.toLocaleString();
      highscoreDisplay.textContent = highScore.toLocaleString();
    },
    onCooldownUpdate: (progress, remaining) => {
      if (remaining <= 0) {
        btnJump.classList.remove('on-cooldown');
        jumpTitle.textContent = 'JUMP! 🚀';
        cooldownFill.style.width = '100%';
      } else {
        btnJump.classList.add('on-cooldown');
        jumpTitle.textContent = `${remaining.toFixed(1)}s`;
        cooldownFill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
      }
    },
    onGameOver: (stats) => {
      finalScoreEl.textContent = stats.score.toLocaleString();
      bestScoreEl.textContent = stats.highScore.toLocaleString();
      gameoverOverlay.classList.remove('hidden');
    }
  });

  highscoreDisplay.textContent = runner.highScore.toLocaleString();

  window.addEventListener('resize', () => runner.resize());

  // Keyboard Controls
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;

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

  // Button Controls
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

  // Sound Toggle
  btnSound.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    btnSound.textContent = isMuted ? '🔇' : '🔊';
  });

  // Touch swipe on canvas
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

      if (Math.max(absDx, absDy) > 20) {
        if (absDx > absDy) {
          if (dx < 0) runner.moveLeft();
          else runner.moveRight();
        } else {
          if (dy < 0) runner.jump();
        }
      } else {
        runner.jump();
      }
    }
  }, { passive: true });
});
