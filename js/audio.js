// js/audio.js
// Playful Cartoon Sound Synthesizer using Web Audio API

class CartoonAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  ensure() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Cartoon "BOING!" spring jump sound
  playJump() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Classic cartoon spring boing pitch sweep
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    osc.frequency.linearRampToValueAtTime(450, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.32);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Cartoon landing "squish/tap"
  playLand() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Smooth cartoon "woop!" when shifting lanes
  playLaneSwitch(dir = 1) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = dir > 0 ? 320 : 440;
    const endFreq = dir > 0 ? 520 : 260;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Cheerful cartoon "DING-A-LING!" collectible coin sound
  playCollect() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = [784, 988, 1318]; // G5, B5, E6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.22);
    });
  }

  // Playful cartoon "POP!" when cooldown is ready
  playCooldownReady() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  // Comical cartoon "BONK / SPLAT" crash sound
  playCrash() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Funny low bonk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);

    // 2. Cartoon slide whistle descent
    const whistle = this.ctx.createOscillator();
    const wGain = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(600, now + 0.1);
    whistle.frequency.exponentialRampToValueAtTime(100, now + 0.55);

    wGain.gain.setValueAtTime(0, now);
    wGain.gain.setValueAtTime(0.16, now + 0.1);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    whistle.connect(wGain);
    wGain.connect(this.ctx.destination);
    whistle.start(now + 0.1);
    whistle.stop(now + 0.6);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const audio = new CartoonAudio();
