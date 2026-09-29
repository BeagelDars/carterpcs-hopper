// js/game.js
// Core 3-Lane Runner Engine with Carter Kart & Computer Parts

import { COMPUTER_PARTS, CARTER_QUOTES } from './parts.js';

export class CarterRunner {
  constructor(canvas, uiHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = uiHooks;

    // Game state
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('carter_runner_highscore') || '0', 10);
    this.distance = 0;
    this.baseSpeed = 420; // px / sec
    this.speed = this.baseSpeed;
    this.maxSpeed = 740;
    this.partsDodged = 0;
    this.pasteCollected = 0;

    // Road & Dimensions
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.roadWidth = 420;
    this.roadLeft = 0;
    this.laneWidth = 140;
    this.roadOffset = 0;

    // 3 Lanes: 0: Left, 1: Center, 2: Right
    this.currentLane = 1; // Start in center
    this.player = {
      lane: 1,
      x: 0,
      targetX: 0,
      y: 0,
      width: 80,
      height: 120,
      tilt: 0,
      targetTilt: 0,
      // Jump physics
      isJumping: false,
      jumpDuration: 0.78, // seconds
      jumpTimer: 0,
      jumpZ: 0,
      // Cooldown
      jumpCooldown: 1.35, // seconds total
      cooldownTimer: 0,
      wasOnCooldown: false
    };

    // Obstacles and Collectibles
    this.obstacles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lastWaveY = -100;
    this.lastOpenLanes = [0, 1, 2];

    // Screen shake
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Asset Preloading
    this.images = {};
    this.imagesLoaded = false;
    this.preloadAssets();

    // Timing
    this.lastTime = 0;
    this.animationId = null;

    // Bindings
    this.loop = this.loop.bind(this);
    this.resize();
  }

  preloadAssets() {
    let pending = 1 + COMPUTER_PARTS.length;
    const checkDone = () => {
      pending--;
      if (pending <= 0) {
        this.imagesLoaded = true;
        this.renderStartFrame();
      }
    };

    // Load Carter Kart
    const kartImg = new Image();
    kartImg.src = 'assets/carter_kart.png';
    kartImg.onload = () => {
      this.images['kart'] = kartImg;
      checkDone();
    };
    kartImg.onerror = () => {
      console.warn('Failed to load Carter Kart image');
      checkDone();
    };

    // Load Computer Parts SVGs
    COMPUTER_PARTS.forEach(part => {
      const img = new Image();
      img.src = part.svg;
      img.onload = () => {
        this.images[part.id] = img;
        checkDone();
      };
      img.onerror = () => {
        console.warn('Failed to load part SVG:', part.svg);
        checkDone();
      };
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);

    // Responsive road width
    this.roadWidth = Math.min(this.width * 0.94, 440);
    this.roadLeft = (this.width - this.roadWidth) / 2;
    this.laneWidth = this.roadWidth / 3;

    // Player position (near bottom of canvas)
    this.player.y = this.height - 180;
    this.updateTargetX();
    this.player.x = this.player.targetX;

    if (this.state === 'START' && this.imagesLoaded) {
      this.renderStartFrame();
    }
  }

  getLaneX(laneIndex) {
    return this.roadLeft + (laneIndex + 0.5) * this.laneWidth;
  }

  updateTargetX() {
    this.player.targetX = this.getLaneX(this.player.lane);
  }

  start() {
    this.state = 'PLAYING';
    this.score = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    this.partsDodged = 0;
    this.pasteCollected = 0;
    this.obstacles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lastWaveY = -120;
    this.lastOpenLanes = [0, 1, 2];

    this.player.lane = 1;
    this.player.isJumping = false;
    this.player.jumpTimer = 0;
    this.player.jumpZ = 0;
    this.player.cooldownTimer = 0;
    this.player.wasOnCooldown = false;
    this.updateTargetX();
    this.player.x = this.player.targetX;

    if (this.ui.onStateChange) this.ui.onStateChange(this.state);
    if (this.ui.onScoreUpdate) this.ui.onScoreUpdate(this.score, this.highScore, this.getFpsDisplay());

    this.lastTime = performance.now();
    if (!this.animationId) {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  moveLeft() {
    if (this.state !== 'PLAYING') return;
    if (this.player.lane > 0) {
      this.player.lane--;
      this.updateTargetX();
      this.player.targetTilt = -0.15; // Lean left
      this.spawnTirePuff(-1);
    }
  }

  moveRight() {
    if (this.state !== 'PLAYING') return;
    if (this.player.lane < 2) {
      this.player.lane++;
      this.updateTargetX();
      this.player.targetTilt = 0.15; // Lean right
      this.spawnTuffPuff(1);
    }
  }

  jump() {
    if (this.state !== 'PLAYING') return;
    // Check cooldown
    if (this.player.cooldownTimer > 0 || this.player.isJumping) {
      return false; // Can't jump yet
    }

    this.player.isJumping = true;
    this.player.jumpTimer = this.player.jumpDuration;
    this.player.cooldownTimer = this.player.jumpCooldown;
    this.player.wasOnCooldown = true;

    this.spawnJumpParticles();

    // Random cheerful carter jump quote
    if (Math.random() < 0.3) {
      const q = CARTER_QUOTES.jump[Math.floor(Math.random() * CARTER_QUOTES.jump.length)];
      this.addFloatingText(this.player.x, this.player.y - 40, q, '#0284c7');
    }

    return true;
  }

  spawnJumpParticles() {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() * 40 - 20),
        y: this.player.y + 40,
        vx: (Math.random() - 0.5) * 60,
        vy: Math.random() * 40 + 20,
        radius: Math.random() * 3 + 2,
        color: '#94a3b8',
        alpha: 0.7,
        decay: 2.2
      });
    }
  }

  spawnTirePuff(dir) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: this.player.x + dir * 25,
        y: this.player.y + 40,
        vx: dir * (Math.random() * 40 + 10),
        vy: (Math.random() - 0.5) * 20,
        radius: Math.random() * 2.5 + 1.5,
        color: '#cbd5e1',
        alpha: 0.6,
        decay: 3.0
      });
    }
  }

  spawnTuffPuff(dir) {
    this.spawnTirePuff(dir);
  }

  triggerShake(intensity = 10, duration = 0.35) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  addFloatingText(x, y, text, color = '#0f172a', size = 14) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      alpha: 1,
      vy: -55
    });
  }

  getFpsDisplay() {
    // Convert speed to fun "FPS" metric (Carter PCs theme!)
    // 420 px/s -> 60 FPS, 740 px/s -> 360 FPS
    const ratio = (this.speed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed);
    const fps = Math.round(60 + ratio * 300);
    return `${fps} FPS`;
  }

  // GUARANTEED SOLVABILITY PROCEDURAL GENERATOR
  // Enforces that at least 1 lane is always open and traversable
  updateObstacleSpawning(dt) {
    // Gap between waves: ensures ample human reaction time
    const minGap = Math.max(380, this.speed * 0.95);

    // Check if leading obstacle has moved down enough to spawn next wave
    let canSpawn = false;
    if (this.obstacles.length === 0) {
      canSpawn = true;
    } else {
      let minY = Infinity;
      for (const obs of this.obstacles) {
        if (obs.y < minY) minY = obs.y;
      }
      if (minY >= -140 + minGap) {
        canSpawn = true;
      }
    }

    if (!canSpawn) return;

    // Pick wave pattern
    const rand = Math.random();
    let openLanes = [];

    // Ensure solvability with previous wave:
    // If last wave left only 1 lane open (say lane 0), the new wave must not only leave lane 2 open
    // without adjacent path. We ensure at least one open lane is adjacent (distance <= 1) to previous open lanes.
    const lastOpen = this.lastOpenLanes;

    if (rand < 0.55) {
      // 1 obstacle wave (2 lanes completely open) -> very forgiving & dynamic
      const blockedLane = Math.floor(Math.random() * 3);
      openLanes = [0, 1, 2].filter(l => l !== blockedLane);
      this.spawnObstacleAtLane(blockedLane, -130);
    } else if (rand < 0.85) {
      // 2 obstacles wave (1 lane open) -> requires finding the open lane or jumping
      // Select open lane that is easy to reach from lastOpen
      const possibleOpenLanes = [0, 1, 2].filter(candidate => {
        return lastOpen.some(prev => Math.abs(prev - candidate) <= 1);
      });
      const chosenOpenLane = possibleOpenLanes[Math.floor(Math.random() * possibleOpenLanes.length)];
      openLanes = [chosenOpenLane];

      [0, 1, 2].forEach(lane => {
        if (lane !== chosenOpenLane) {
          this.spawnObstacleAtLane(lane, -130);
        }
      });
    } else {
      // Staggered obstacles wave (slalom run: Lane A then Lane B 220px further)
      const laneA = Math.floor(Math.random() * 3);
      let laneB = (laneA + 1 + Math.floor(Math.random() * 2)) % 3;
      this.spawnObstacleAtLane(laneA, -130);
      this.spawnObstacleAtLane(laneB, -130 - 220);
      openLanes = [0, 1, 2].filter(l => l !== laneB);
    }

    // Occasionally spawn collectible Thermal Paste in an open lane or floating over an obstacle
    if (Math.random() < 0.4) {
      const pasteLane = openLanes[Math.floor(Math.random() * openLanes.length)];
      this.spawnCollectibleAtLane(pasteLane, -130 - 100);
    }

    this.lastOpenLanes = openLanes;
  }

  spawnObstacleAtLane(lane, yPos) {
    // Pick a computer part (exclude collectibles from obstacles)
    const obstacleParts = COMPUTER_PARTS.filter(p => p.type === 'obstacle');
    const part = obstacleParts[Math.floor(Math.random() * obstacleParts.length)];

    this.obstacles.push({
      partId: part.id,
      part: part,
      lane: lane,
      x: this.getLaneX(lane),
      y: yPos,
      width: part.width,
      height: part.height,
      hitbox: part.hitbox,
      type: 'obstacle',
      cleared: false,
      nearMissed: false
    });
  }

  spawnCollectibleAtLane(lane, yPos) {
    const pastePart = COMPUTER_PARTS.find(p => p.id === 'thermal_paste');
    this.obstacles.push({
      partId: pastePart.id,
      part: pastePart,
      lane: lane,
      x: this.getLaneX(lane),
      y: yPos,
      width: pastePart.width,
      height: pastePart.height,
      hitbox: pastePart.hitbox,
      type: 'collectible',
      cleared: false,
      nearMissed: false
    });
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Speed progression: gradually accelerates with distance
    this.distance += this.speed * dt;
    this.speed = Math.min(this.maxSpeed, this.baseSpeed + Math.floor(this.score * 0.12));
    this.score += Math.round(this.speed * dt * 0.1);

    // Smooth lane steering physics
    const dtRatio = Math.min(dt * 60, 2);
    this.player.x += (this.player.targetX - this.player.x) * (0.24 * dtRatio);
    this.player.tilt += (this.player.targetTilt - this.player.tilt) * (0.2 * dtRatio);
    this.player.targetTilt *= 0.88; // decay tilt back to center

    // Jump physics
    if (this.player.isJumping) {
      this.player.jumpTimer -= dt;
      if (this.player.jumpTimer <= 0) {
        this.player.isJumping = false;
        this.player.jumpTimer = 0;
        this.player.jumpZ = 0;
        this.spawnJumpParticles();
      } else {
        const progress = 1 - (this.player.jumpTimer / this.player.jumpDuration);
        // Smooth parabolic arc
        this.player.jumpZ = Math.sin(progress * Math.PI) * 88;
      }
    } else {
      this.player.jumpZ = 0;
    }

    // Jump Cooldown handling
    if (this.player.cooldownTimer > 0) {
      this.player.cooldownTimer = Math.max(0, this.player.cooldownTimer - dt);
      if (this.player.cooldownTimer === 0 && this.player.wasOnCooldown) {
        this.player.wasOnCooldown = false;
        if (this.ui.onCooldownReady) this.ui.onCooldownReady();
      }
    }

    // Cooldown UI notification
    if (this.ui.onCooldownUpdate) {
      const remaining = this.player.cooldownTimer;
      const total = this.player.jumpCooldown;
      const progress = remaining <= 0 ? 1 : (1 - remaining / total);
      this.ui.onCooldownUpdate(progress, remaining);
    }

    // Road dashed line animation
    this.roadOffset = (this.roadOffset + this.speed * dt) % 60;

    // Spawn obstacles
    this.updateObstacleSpawning(dt);

    // Update active obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += this.speed * dt;

      // Check collision with player
      this.checkObstacleInteraction(obs);

      // Despawn if off bottom of screen
      if (obs.y > this.height + 150) {
        this.obstacles.splice(i, 1);
        if (obs.type === 'obstacle' && !obs.cleared) {
          this.partsDodged++;
        }
      }
    }

    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text popups
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.9 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update UI HUD
    if (this.ui.onScoreUpdate) {
      this.ui.onScoreUpdate(this.score, this.highScore, this.getFpsDisplay());
    }
  }

  checkObstacleInteraction(obs) {
    if (this.state !== 'PLAYING') return;

    // Player Hitbox
    const pBox = {
      x: this.player.x - 28,
      y: this.player.y - 38,
      w: 56,
      h: 84
    };

    // Obstacle Hitbox
    const oBox = {
      x: obs.x - obs.hitbox.w / 2,
      y: obs.y - obs.hitbox.h / 2,
      w: obs.hitbox.w,
      h: obs.hitbox.h
    };

    // AABB Overlap check
    const isOverlapping =
      pBox.x < oBox.x + oBox.w &&
      pBox.x + pBox.w > oBox.x &&
      pBox.y < oBox.y + oBox.h &&
      pBox.y + pBox.h > oBox.y;

    if (isOverlapping) {
      if (obs.type === 'collectible') {
        // Collect Thermal Paste!
        this.score += obs.part.points;
        this.pasteCollected++;
        this.addFloatingText(obs.x, obs.y - 20, `+${obs.part.points} PASTE!`, '#0284c7', 16);
        this.spawnCollectSparkles(obs.x, obs.y);

        // Remove collectible
        const idx = this.obstacles.indexOf(obs);
        if (idx !== -1) this.obstacles.splice(idx, 1);
        return;
      }

      // It's an obstacle!
      // CAN WE JUMP OVER IT?
      // Jump height threshold: 24px clears ground obstacle
      if (this.player.isJumping && this.player.jumpZ >= 24) {
        // Successfully jumped over!
        if (!obs.cleared) {
          obs.cleared = true;
          this.score += 150;
          this.addFloatingText(this.player.x, this.player.y - 60, `JUMPED OVER ${obs.part.name}! +150`, '#16a34a', 14);
        }
      } else {
        // CRASH!
        this.gameOver(obs);
      }
    } else {
      // Near miss check: within close proximity horizontally while passing vertically
      if (obs.type === 'obstacle' && !obs.nearMissed && !obs.cleared) {
        const yDist = Math.abs(this.player.y - obs.y);
        const xDist = Math.abs(this.player.x - obs.x);
        if (yDist < 30 && xDist > 30 && xDist < 85) {
          obs.nearMissed = true;
          this.score += 60;
          const comment = CARTER_QUOTES.nearMiss[Math.floor(Math.random() * CARTER_QUOTES.nearMiss.length)];
          this.addFloatingText(this.player.x + (this.player.x < obs.x ? -30 : 30), this.player.y - 20, `${comment} +60`, '#059669', 12);
        }
      }
    }
  }

  spawnCollectSparkles(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = Math.random() * 80 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        color: '#38bdf8',
        alpha: 1,
        decay: 1.8
      });
    }
  }

  gameOver(fatalObstacle) {
    this.state = 'GAMEOVER';
    this.triggerShake(14, 0.45);

    // Save Highscore
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('carter_runner_highscore', this.highScore.toString());
    }

    // Pick funny Carter crash quote
    let quote = fatalObstacle.part.carterComment || CARTER_QUOTES.crash[0];
    if (Math.random() < 0.4) {
      quote = CARTER_QUOTES.crash[Math.floor(Math.random() * CARTER_QUOTES.crash.length)];
    }

    // Spawn crash parts explosion
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        radius: Math.random() * 4 + 2,
        color: i % 2 === 0 ? '#ef4444' : '#64748b',
        alpha: 1,
        decay: 1.4
      });
    }

    if (this.ui.onGameOver) {
      this.ui.onGameOver({
        score: this.score,
        highScore: this.highScore,
        obstacleName: fatalObstacle.part.name,
        quote: quote,
        partsDodged: this.partsDodged,
        pasteCollected: this.pasteCollected
      });
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();

    // Screen shake transform
    if (this.shakeDuration > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Draw Clean Minimalist Road
    this.renderRoad();

    // 2. Draw Obstacles & Collectibles
    this.renderObstacles();

    // 3. Draw Player Carter Kart
    this.renderPlayer();

    // 4. Draw Particles
    this.renderParticles();

    // 5. Draw Floating Texts
    this.renderFloatingTexts();

    this.ctx.restore();
  }

  renderRoad() {
    const ctx = this.ctx;
    const rL = this.roadLeft;
    const rW = this.roadWidth;
    const lW = this.laneWidth;

    // Road Asphalt / Surface (Minimalist Light Slate)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, this.width, this.height);

    // Road Track Bed
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(rL, 0, rW, this.height);

    // Road Outer Borders (Crisp graphite lines)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(rL, 0);
    ctx.lineTo(rL, this.height);
    ctx.moveTo(rL + rW, 0);
    ctx.lineTo(rL + rW, this.height);
    ctx.stroke();

    // 2 Lane Dividers (Dashed minimalist markings)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.setLineDash([24, 28]);
    ctx.lineDashOffset = -this.roadOffset;

    ctx.beginPath();
    // Lane 1 divider
    ctx.moveTo(rL + lW, 0);
    ctx.lineTo(rL + lW, this.height);
    // Lane 2 divider
    ctx.moveTo(rL + lW * 2, 0);
    ctx.lineTo(rL + lW * 2, this.height);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash
  }

  renderObstacles() {
    const ctx = this.ctx;

    this.obstacles.forEach(obs => {
      const img = this.images[obs.partId];

      ctx.save();
      ctx.translate(obs.x, obs.y);

      // Collectible gentle floating pulse
      if (obs.type === 'collectible') {
        const floatOffset = Math.sin(performance.now() * 0.006) * 4;
        ctx.translate(0, floatOffset);

        // Glow ring behind thermal paste
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();
      }

      if (img && img.complete) {
        ctx.drawImage(img, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else {
        // Fallback rectangle
        ctx.fillStyle = obs.type === 'collectible' ? '#0ea5e9' : '#334155';
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      }

      // Minimalist part name tag
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.fillText(obs.part.name, 0, obs.height / 2 + 13);

      ctx.restore();
    });
  }

  renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Jump shadow on ground
    const shadowScale = Math.max(0.4, 1 - p.jumpZ * 0.006);
    const shadowAlpha = Math.max(0.12, 0.3 - p.jumpZ * 0.002);
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 48, 36 * shadowScale, 14 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Translate car up by jump altitude
    ctx.translate(0, -p.jumpZ);

    // Apply steering roll tilt
    ctx.rotate(p.tilt);

    // Scale up slightly during jump
    const jumpScale = 1 + p.jumpZ * 0.0022;
    ctx.scale(jumpScale, jumpScale);

    // Render Carter Kart
    const kartImg = this.images['kart'];
    if (kartImg && kartImg.complete) {
      const kw = p.width;
      const kh = p.height;
      ctx.drawImage(kartImg, -kw / 2, -kh / 2, kw, kh);
    } else {
      // Fallback minimalist car
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-25, -45, 50, 90);
    }

    // If airborne, draw light wind lines
    if (p.isJumping) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-28, 35);
      ctx.lineTo(-28, 55);
      ctx.moveTo(28, 35);
      ctx.lineTo(28, 55);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  renderFloatingTexts() {
    const ctx = this.ctx;
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${ft.size}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';

      // White outline for contrast
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(ft.text, ft.x, ft.y);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  renderStartFrame() {
    this.renderRoad();
    this.renderPlayer();
  }

  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  }
}
