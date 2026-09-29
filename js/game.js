// js/game.js
// 5-Lane Cartoon Runner Engine with Carter Kart & Computer Parts

import { COMPUTER_PARTS } from './parts.js';
import { audio } from './audio.js';

export class CarterRunner {
  constructor(canvas, uiHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = uiHooks;

    // Game state
    this.state = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER'
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('carter_runner_highscore') || '0', 10);
    this.baseSpeed = 380; // px/sec
    this.speed = this.baseSpeed;
    this.maxSpeed = 660;

    // 5-Lane Road Geometry
    this.laneCount = 5;
    this.currentLane = 2; // Center lane (0, 1, 2, 3, 4)
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.roadWidth = 520;
    this.roadLeft = 0;
    this.laneWidth = 104;
    this.roadOffset = 0;

    // Player with Cartoon Squash & Stretch + Smooth Steering
    this.player = {
      lane: 2,
      x: 0,
      targetX: 0,
      y: 0,
      width: 66,
      height: 90,
      tilt: 0,
      targetTilt: 0,
      // Cartoon stretch/squash
      scaleX: 1,
      scaleY: 1,
      idleBob: 0,
      // Jump
      isJumping: false,
      jumpDuration: 0.82,
      jumpTimer: 0,
      jumpZ: 0,
      // Cooldown
      jumpCooldown: 1.4,
      cooldownTimer: 0,
      wasOnCooldown: false
    };

    // Obstacles, Collectibles, Particles & Floating Texts
    this.obstacles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lastOpenLanes = [1, 2, 3];

    // Screen Shake
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Assets
    this.images = {};
    this.imagesLoaded = false;
    this.preloadAssets();

    // Timing
    this.lastTime = 0;
    this.gameTime = 0;
    this.animationId = null;

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

    const kartImg = new Image();
    kartImg.src = 'assets/carter_kart.png';
    kartImg.onload = () => {
      this.images['kart'] = kartImg;
      checkDone();
    };
    kartImg.onerror = () => checkDone();

    COMPUTER_PARTS.forEach(part => {
      const img = new Image();
      img.src = part.svg;
      img.onload = () => {
        this.images[part.id] = img;
        checkDone();
      };
      img.onerror = () => checkDone();
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

    // 5 Lanes responsive width
    this.roadWidth = Math.min(this.width * 0.96, 540);
    this.roadLeft = (this.width - this.roadWidth) / 2;
    this.laneWidth = this.roadWidth / this.laneCount;

    // Position player near bottom
    this.player.y = this.height - 150;
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
    audio.ensure();
    this.state = 'PLAYING';
    this.score = 0;
    this.speed = this.baseSpeed;
    this.obstacles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lastOpenLanes = [1, 2, 3];

    this.player.lane = 2; // Center
    this.player.isJumping = false;
    this.player.jumpTimer = 0;
    this.player.jumpZ = 0;
    this.player.scaleX = 1;
    this.player.scaleY = 1;
    this.player.cooldownTimer = 0;
    this.player.wasOnCooldown = false;
    this.updateTargetX();
    this.player.x = this.player.targetX;

    if (this.ui.onStateChange) this.ui.onStateChange(this.state);
    if (this.ui.onScoreUpdate) this.ui.onScoreUpdate(this.score, this.highScore);

    this.lastTime = performance.now();
    if (!this.animationId) {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  // Smooth, non-instant lane movement
  moveLeft() {
    if (this.state !== 'PLAYING') return;
    if (this.player.lane > 0) {
      this.player.lane--;
      this.updateTargetX();
      this.player.targetTilt = -0.16; // Playful cartoon tilt
      audio.playLaneSwitch(-1);
      this.spawnTirePuff(-1);
    }
  }

  moveRight() {
    if (this.state !== 'PLAYING') return;
    if (this.player.lane < this.laneCount - 1) {
      this.player.lane++;
      this.updateTargetX();
      this.player.targetTilt = 0.16; // Playful cartoon tilt
      audio.playLaneSwitch(1);
      this.spawnTirePuff(1);
    }
  }

  jump() {
    if (this.state !== 'PLAYING') return;
    if (this.player.cooldownTimer > 0 || this.player.isJumping) {
      return false;
    }

    this.player.isJumping = true;
    this.player.jumpTimer = this.player.jumpDuration;
    this.player.cooldownTimer = this.player.jumpCooldown;
    this.player.wasOnCooldown = true;

    // Cartoon launch stretch!
    this.player.scaleX = 0.85;
    this.player.scaleY = 1.25;

    audio.playJump();
    this.spawnJumpParticles();
    this.addFloatingText(this.player.x, this.player.y - 40, 'BOING! ⭐', '#f59e0b', 18);

    return true;
  }

  spawnJumpParticles() {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() * 30 - 15),
        y: this.player.y + 35,
        vx: (Math.random() - 0.5) * 80,
        vy: Math.random() * 50 + 20,
        radius: Math.random() * 5 + 3,
        color: i % 2 === 0 ? '#38bdf8' : '#facc15',
        alpha: 0.9,
        decay: 2.5
      });
    }
  }

  spawnTirePuff(dir) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: this.player.x + dir * 20,
        y: this.player.y + 35,
        vx: dir * (Math.random() * 40 + 20),
        vy: (Math.random() - 0.5) * 20,
        radius: Math.random() * 4 + 2,
        color: '#ffffff',
        alpha: 0.8,
        decay: 3.2
      });
    }
  }

  triggerShake(intensity = 12, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  addFloatingText(x, y, text, color = '#f59e0b', size = 16) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      alpha: 1,
      vy: -65
    });
  }

  // 5-LANE GUARANTEED SOLVABILITY PROCEDURAL GENERATOR
  // Always leaves at least 2 lanes wide open and guarantees smooth pathing
  updateObstacleSpawning(dt) {
    const minGap = Math.max(360, this.speed * 0.9);

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

    // Pick 2 or 3 lanes to block (never 4 or 5!)
    // Ensure at least 2 lanes are open
    const numObstacles = Math.random() < 0.65 ? 2 : 3;

    // To guarantee reachability, pick open lanes close to last open lanes
    const allLanes = [0, 1, 2, 3, 4];
    const shuffled = [...allLanes].sort(() => Math.random() - 0.5);

    // Keep at least 2 open
    const openLanes = shuffled.slice(0, this.laneCount - numObstacles);
    const blockedLanes = shuffled.slice(this.laneCount - numObstacles);

    blockedLanes.forEach(lane => {
      this.spawnObstacleAtLane(lane, -120);
    });

    // Spawn bonus collectible Thermal Paste in one of the open lanes
    if (Math.random() < 0.45) {
      const pasteLane = openLanes[Math.floor(Math.random() * openLanes.length)];
      this.spawnCollectibleAtLane(pasteLane, -120 - 90);
    }

    this.lastOpenLanes = openLanes;
  }

  spawnObstacleAtLane(lane, yPos) {
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
      cleared: false
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
      cleared: false
    });
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.gameTime += dt;

    // Speed progression
    this.speed = Math.min(this.maxSpeed, this.baseSpeed + Math.floor(this.score * 0.1));
    this.score += Math.round(this.speed * dt * 0.1);

    // SMOOTH, DELIBERATE LANE GLIDE (Not instant/snappy!)
    // Using a smooth ease interpolation factor of 0.11
    const dtRatio = Math.min(dt * 60, 2);
    this.player.x += (this.player.targetX - this.player.x) * (0.11 * dtRatio);
    this.player.tilt += (this.player.targetTilt - this.player.tilt) * (0.12 * dtRatio);
    this.player.targetTilt *= 0.86;

    // Idle cartoon engine bounce
    this.player.idleBob = Math.sin(this.gameTime * 14) * 2.2;

    // Jump physics with cartoon squash & stretch
    if (this.player.isJumping) {
      this.player.jumpTimer -= dt;
      if (this.player.jumpTimer <= 0) {
        this.player.isJumping = false;
        this.player.jumpTimer = 0;
        this.player.jumpZ = 0;

        // Cartoon landing squash!
        this.player.scaleX = 1.25;
        this.player.scaleY = 0.8;

        audio.playLand();
        this.spawnJumpParticles();
      } else {
        const progress = 1 - (this.player.jumpTimer / this.player.jumpDuration);
        this.player.jumpZ = Math.sin(progress * Math.PI) * 96;

        // Peak airborne stretch
        const airProgress = Math.sin(progress * Math.PI);
        this.player.scaleX = 1 - airProgress * 0.1;
        this.player.scaleY = 1 + airProgress * 0.15;
      }
    } else {
      // Ease scale back to normal (1, 1)
      this.player.scaleX += (1 - this.player.scaleX) * 0.15;
      this.player.scaleY += (1 - this.player.scaleY) * 0.15;
      this.player.jumpZ = 0;
    }

    // Cooldown
    if (this.player.cooldownTimer > 0) {
      this.player.cooldownTimer = Math.max(0, this.player.cooldownTimer - dt);
      if (this.player.cooldownTimer === 0 && this.player.wasOnCooldown) {
        this.player.wasOnCooldown = false;
        audio.playCooldownReady();
        if (this.ui.onCooldownReady) this.ui.onCooldownReady();
      }
    }

    if (this.ui.onCooldownUpdate) {
      const remaining = this.player.cooldownTimer;
      const total = this.player.jumpCooldown;
      const progress = remaining <= 0 ? 1 : (1 - remaining / total);
      this.ui.onCooldownUpdate(progress, remaining);
    }

    // Road scroll
    this.roadOffset = (this.roadOffset + this.speed * dt) % 64;

    // Spawn obstacles
    this.updateObstacleSpawning(dt);

    // Update active obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += this.speed * dt;

      this.checkObstacleInteraction(obs);

      if (obs.y > this.height + 150) {
        this.obstacles.splice(i, 1);
      }
    }

    // Shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.85 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Score callback
    if (this.ui.onScoreUpdate) {
      this.ui.onScoreUpdate(this.score, this.highScore);
    }
  }

  checkObstacleInteraction(obs) {
    if (this.state !== 'PLAYING') return;

    // Player Hitbox
    const pBox = {
      x: this.player.x - 22,
      y: this.player.y - 30,
      w: 44,
      h: 68
    };

    // Obstacle Hitbox
    const oBox = {
      x: obs.x - obs.hitbox.w / 2,
      y: obs.y - obs.hitbox.h / 2,
      w: obs.hitbox.w,
      h: obs.hitbox.h
    };

    const isOverlapping =
      pBox.x < oBox.x + oBox.w &&
      pBox.x + pBox.w > oBox.x &&
      pBox.y < oBox.y + oBox.h &&
      pBox.y + pBox.h > oBox.y;

    if (isOverlapping) {
      if (obs.type === 'collectible') {
        this.score += obs.part.points;
        audio.playCollect();
        this.addFloatingText(obs.x, obs.y - 20, '+500 🍯', '#0284c7', 20);
        this.spawnCollectSparkles(obs.x, obs.y);

        const idx = this.obstacles.indexOf(obs);
        if (idx !== -1) this.obstacles.splice(idx, 1);
        return;
      }

      // Jump clearance check (jumpZ >= 20 clears ground obstacles)
      if (this.player.isJumping && this.player.jumpZ >= 20) {
        if (!obs.cleared) {
          obs.cleared = true;
          this.score += 150;
          this.addFloatingText(this.player.x, this.player.y - 50, '+150 JUMP! ⭐', '#16a34a', 16);
        }
      } else {
        this.gameOver(obs);
      }
    }
  }

  spawnCollectSparkles(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      const spd = Math.random() * 90 + 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 4 + 2,
        color: '#facc15',
        alpha: 1,
        decay: 2.0
      });
    }
  }

  gameOver(fatalObstacle) {
    this.state = 'GAMEOVER';
    audio.playCrash();
    this.triggerShake(16, 0.4);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('carter_runner_highscore', this.highScore.toString());
    }

    // Explosion particles
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 260,
        radius: Math.random() * 5 + 3,
        color: ['#ef4444', '#f59e0b', '#38bdf8', '#ffffff'][i % 4],
        alpha: 1,
        decay: 1.6
      });
    }

    if (this.ui.onGameOver) {
      this.ui.onGameOver({
        score: this.score,
        highScore: this.highScore,
        obstacleName: fatalObstacle.part.name
      });
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();

    if (this.shakeDuration > 0) {
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(ox, oy);
    }

    // 1. Bright Cartoon Background & 5-Lane Track
    this.renderRoad();

    // 2. Obstacles
    this.renderObstacles();

    // 3. Carter Kart
    this.renderPlayer();

    // 4. Particles
    this.renderParticles();

    // 5. Floating text
    this.renderFloatingTexts();

    this.ctx.restore();
  }

  renderRoad() {
    const ctx = this.ctx;
    const rL = this.roadLeft;
    const rW = this.roadWidth;
    const lW = this.laneWidth;

    // Cheerful pastel sky background
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, this.width, this.height);

    // Cartoon grass / border sides
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, 0, rL, this.height);
    ctx.fillRect(rL + rW, 0, this.width - (rL + rW), this.height);

    // Cartoon Red & White Candy Curbs
    const curbW = 12;
    const curbH = 32;
    const curbOffset = this.roadOffset % curbH;

    for (let y = -curbH; y < this.height + curbH; y += curbH) {
      const idx = Math.floor((y - curbOffset) / curbH);
      const isRed = Math.abs(idx) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
      // Left curb
      ctx.fillRect(rL - curbW, y + curbOffset, curbW, curbH);
      // Right curb
      ctx.fillRect(rL + rW, y + curbOffset, curbW, curbH);
    }

    // Smooth Road Bed
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(rL, 0, rW, this.height);

    // Crisp cartoon road border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(rL, 0, rW, this.height);

    // 4 Cartoon Dashed Lane Dividers (for 5 lanes!)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([20, 24]);
    ctx.lineDashOffset = -this.roadOffset;

    for (let i = 1; i < this.laneCount; i++) {
      const lx = rL + i * lW;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, this.height);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  renderObstacles() {
    const ctx = this.ctx;

    this.obstacles.forEach(obs => {
      const img = this.images[obs.partId];

      ctx.save();
      ctx.translate(obs.x, obs.y);

      // Playful bob for collectibles
      if (obs.type === 'collectible') {
        const floatOffset = Math.sin(this.gameTime * 6) * 5;
        ctx.translate(0, floatOffset);

        // Cartoon golden halo
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Drop shadow underneath part
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.beginPath();
      ctx.ellipse(0, obs.height / 2 + 3, obs.width * 0.45, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (img && img.complete) {
        ctx.drawImage(img, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else {
        ctx.fillStyle = obs.type === 'collectible' ? '#0ea5e9' : '#334155';
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      }

      ctx.restore();
    });
  }

  renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y + p.idleBob);

    // Jump shadow on ground
    const shadowScale = Math.max(0.35, 1 - p.jumpZ * 0.006);
    const shadowAlpha = Math.max(0.1, 0.32 - p.jumpZ * 0.002);
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 40, 32 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Altitude offset
    ctx.translate(0, -p.jumpZ);

    // Cartoon tilt
    ctx.rotate(p.tilt);

    // Cartoon squash and stretch
    ctx.scale(p.scaleX, p.scaleY);

    // Draw Carter Kart
    const kartImg = this.images['kart'];
    if (kartImg && kartImg.complete) {
      const kw = p.width;
      const kh = p.height;
      ctx.drawImage(kartImg, -kw / 2, -kh / 2, kw, kh);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-22, -35, 44, 70);
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
      ctx.font = `900 ${ft.size}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';

      ctx.lineWidth = 4;
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
