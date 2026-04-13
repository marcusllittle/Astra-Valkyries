/**
 * Procedural retro sound effects via Web Audio API.
 * No external audio files needed — all sounds are generated.
 * Routes through the SFX bus from audioEngine for volume control.
 */

import { getAudioCtx, getSfxBus } from "./audioEngine";

// ─── UI Sounds ────────────────────────────────────────────────

/** Short square-wave blip for cursor movement. */
export function cursorMove() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(660, now + 0.06);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.08);

  osc.connect(gain).connect(bus);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** Rising two-tone chime for menu confirm. */
export function menuConfirm() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const now = ac.currentTime;

  const osc1 = ac.createOscillator();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(440, now);

  const g1 = ac.createGain();
  g1.gain.setValueAtTime(0.2, now);
  g1.gain.linearRampToValueAtTime(0, now + 0.08);

  osc1.connect(g1).connect(bus);
  osc1.start(now);
  osc1.stop(now + 0.08);

  const osc2 = ac.createOscillator();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(880, now + 0.06);

  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0, now);
  g2.gain.setValueAtTime(0.2, now + 0.06);
  g2.gain.linearRampToValueAtTime(0, now + 0.18);

  osc2.connect(g2).connect(bus);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.18);
}

/** Sparkle/whoosh for "PRESS START" transition. */
export function pressStart() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.25);

  osc.connect(gain).connect(bus);
  osc.start(now);
  osc.stop(now + 0.25);

  const bufLen = Math.floor(ac.sampleRate * 0.06);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.15, now);
  ng.gain.linearRampToValueAtTime(0, now + 0.06);

  noise.connect(ng).connect(bus);
  noise.start(now);
}

// ─── Gameplay SFX ─────────────────────────────────────────────

// Throttle rapid-fire sounds to avoid audio glitches
let _lastShot = 0;

/**
 * Per-ship shot tint. Each frame gets a signature sound instead of every
 * pilot sharing the same square-wave blip. Kept tiny and short so the
 * auto-fire cadence doesn't turn into a drone.
 */
interface ShotTint {
  /** Primary oscillator waveform. */
  type: OscillatorType;
  /** Starting pitch in Hz. */
  startHz: number;
  /** Ending pitch in Hz (exponential decay). */
  endHz: number;
  /** Peak gain before the envelope decays. */
  peakGain: number;
  /** Total duration in seconds. */
  durationSec: number;
  /** Optional sub-oscillator one octave down for body. */
  sub?: {
    type: OscillatorType;
    gain: number;
  };
  /** Optional short noise click at attack for "crack". */
  clickNoise?: boolean;
}

const DEFAULT_SHOT_TINT: ShotTint = {
  type: "square",
  startHz: 1200,
  endHz: 400,
  peakGain: 0.09,
  durationSec: 0.07,
};

const SHIP_SHOT_TINTS: Record<string, ShotTint> = {
  // Interceptor — higher and snappier, feels precise/quick
  ship_astra_interceptor: {
    type: "square",
    startHz: 1500,
    endHz: 520,
    peakGain: 0.08,
    durationSec: 0.06,
  },
  // Lancer — rougher sawtooth with a sub layer, feels aggressive
  ship_valkyrie_lancer: {
    type: "sawtooth",
    startHz: 1000,
    endHz: 300,
    peakGain: 0.085,
    durationSec: 0.08,
    sub: { type: "square", gain: 0.05 },
    clickNoise: true,
  },
  // Guard — triangle + square body, deeper weight, feels heavy/armored
  ship_seraph_guard: {
    type: "triangle",
    startHz: 820,
    endHz: 240,
    peakGain: 0.095,
    durationSec: 0.085,
    sub: { type: "square", gain: 0.045 },
  },
};

/** Player primary weapon fire — short laser blip, optionally tinted per ship. */
export function sfxShoot(shipId?: string) {
  const now = performance.now();
  if (now - _lastShot < 60) return; // max ~16 shots/sec audio
  _lastShot = now;

  const tint = (shipId && SHIP_SHOT_TINTS[shipId]) || DEFAULT_SHOT_TINT;

  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = tint.type;
  osc.frequency.setValueAtTime(tint.startHz, t);
  osc.frequency.exponentialRampToValueAtTime(tint.endHz, t + tint.durationSec);

  const g = ac.createGain();
  g.gain.setValueAtTime(tint.peakGain, t);
  g.gain.linearRampToValueAtTime(0, t + tint.durationSec);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + tint.durationSec);

  if (tint.sub) {
    // Sub one octave down for low-end body on heavier ships
    const subOsc = ac.createOscillator();
    subOsc.type = tint.sub.type;
    subOsc.frequency.setValueAtTime(tint.startHz * 0.5, t);
    subOsc.frequency.exponentialRampToValueAtTime(tint.endHz * 0.5, t + tint.durationSec);

    const subG = ac.createGain();
    subG.gain.setValueAtTime(tint.sub.gain, t);
    subG.gain.linearRampToValueAtTime(0, t + tint.durationSec);

    subOsc.connect(subG).connect(bus);
    subOsc.start(t);
    subOsc.stop(t + tint.durationSec);
  }

  if (tint.clickNoise) {
    // Short noise crack at attack — gives the Lancer shot its bite
    const bufLen = Math.max(1, Math.floor(ac.sampleRate * 0.012));
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.05, t);
    ng.gain.linearRampToValueAtTime(0, t + 0.012);
    noise.connect(ng).connect(bus);
    noise.start(t);
  }
}

/**
 * Run-end grade reveal sting. Higher grades get a bigger, brighter chord
 * stack so the results screen "lands" instead of quietly appearing.
 */
export function sfxRunGrade(grade: "S" | "A" | "B" | "C" | "D") {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  // Base chord pitches (root, fifth, octave) scaled per grade.
  // S is triumphant / bright, D is flat / subdued.
  const gradeConfig: Record<string, { root: number; glide: number; dur: number; peak: number; shimmer: boolean }> = {
    S: { root: 440, glide: 660, dur: 0.70, peak: 0.22, shimmer: true },
    A: { root: 392, glide: 588, dur: 0.60, peak: 0.19, shimmer: true },
    B: { root: 330, glide: 494, dur: 0.52, peak: 0.16, shimmer: false },
    C: { root: 294, glide: 392, dur: 0.44, peak: 0.13, shimmer: false },
    D: { root: 220, glide: 262, dur: 0.36, peak: 0.11, shimmer: false },
  };
  const cfg = gradeConfig[grade] ?? gradeConfig.B;

  // Stack root + fifth + octave with triangle waves for a warm synth chord
  const notes = [cfg.root, cfg.root * 1.5, cfg.root * 2];
  notes.forEach((hz, i) => {
    const osc = ac.createOscillator();
    osc.type = i === 0 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.linearRampToValueAtTime(hz * (cfg.glide / cfg.root), t + cfg.dur * 0.35);

    const g = ac.createGain();
    // Slight stagger so voices layer in rather than all-at-once
    const start = t + i * 0.04;
    const peak = cfg.peak * (i === 0 ? 1 : 0.7);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + 0.05);
    g.gain.linearRampToValueAtTime(0, start + cfg.dur);

    osc.connect(g).connect(bus);
    osc.start(start);
    osc.stop(start + cfg.dur + 0.05);
  });

  // Shimmer hats on S/A — short bright noise bursts layered above the chord
  if (cfg.shimmer) {
    for (let i = 0; i < 3; i++) {
      const bufLen = Math.floor(ac.sampleRate * 0.045);
      const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1) * 0.4;
      const noise = ac.createBufferSource();
      noise.buffer = buf;

      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 4200;

      const ng = ac.createGain();
      const nt = t + 0.12 + i * 0.08;
      ng.gain.setValueAtTime(0.06, nt);
      ng.gain.linearRampToValueAtTime(0, nt + 0.05);

      noise.connect(hp).connect(ng).connect(bus);
      noise.start(nt);
    }
  }
}

/** Enemy destroyed — noise burst + descending tone */
export function sfxEnemyDeath() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  // Noise burst
  const bufLen = Math.floor(ac.sampleRate * 0.08);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2000, t);
  filter.frequency.exponentialRampToValueAtTime(300, t + 0.08);
  filter.Q.value = 1;

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.14, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.1);

  noise.connect(filter).connect(ng).connect(bus);
  noise.start(t);

  // Tone
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);

  const og = ac.createGain();
  og.gain.setValueAtTime(0.08, t);
  og.gain.linearRampToValueAtTime(0, t + 0.1);

  osc.connect(og).connect(bus);
  osc.start(t);
  osc.stop(t + 0.1);
}

/** Big explosion — bomb, boss phase, boss death */
export function sfxExplosion() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  // Heavy noise
  const bufLen = Math.floor(ac.sampleRate * 0.3);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3000, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.2, t);
  ng.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

  noise.connect(filter).connect(ng).connect(bus);
  noise.start(t);

  // Sub bass thump
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

  const og = ac.createGain();
  og.gain.setValueAtTime(0.18, t);
  og.gain.linearRampToValueAtTime(0, t + 0.3);

  osc.connect(og).connect(bus);
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Player hit — harsh buzz */
export function sfxPlayerHit() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.linearRampToValueAtTime(80, t + 0.15);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.16, t);
  g.gain.linearRampToValueAtTime(0, t + 0.18);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.18);

  // Static
  const bufLen = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.12, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.06);

  noise.connect(ng).connect(bus);
  noise.start(t);
}

/** Bomb launch — whoosh + thud */
export function sfxBomb() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.linearRampToValueAtTime(0, t + 0.22);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.22);

  // Delayed explosion
  setTimeout(() => sfxExplosion(), 100);
}

/** EMP activation — electrical zap */
export function sfxEmp() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(2000, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.linearRampToValueAtTime(0, t + 0.18);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.18);

  // Secondary crackle
  const osc2 = ac.createOscillator();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(3000, t + 0.03);
  osc2.frequency.exponentialRampToValueAtTime(500, t + 0.12);

  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.06, t + 0.03);
  g2.gain.linearRampToValueAtTime(0, t + 0.13);

  osc2.connect(g2).connect(bus);
  osc2.start(t + 0.03);
  osc2.stop(t + 0.13);
}

/** Shield/barrier activation — resonant hum */
export function sfxShield() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(600, t + 0.1);
  osc.frequency.linearRampToValueAtTime(400, t + 0.25);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.setValueAtTime(0.12, t + 0.15);
  g.gain.linearRampToValueAtTime(0, t + 0.3);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.3);

  // Harmonic
  const osc2 = ac.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(600, t);
  osc2.frequency.linearRampToValueAtTime(1200, t + 0.1);
  osc2.frequency.linearRampToValueAtTime(800, t + 0.25);

  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.06, t);
  g2.gain.linearRampToValueAtTime(0, t + 0.28);

  osc2.connect(g2).connect(bus);
  osc2.start(t);
  osc2.stop(t + 0.28);
}

/** Drone deploy — ascending whirr */
export function sfxDrones() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.1, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.1);
  g.gain.linearRampToValueAtTime(0, t + 0.2);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.2);
}

/** Weapon level up — ascending chime */
export function sfxPowerup() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;

    const g = ac.createGain();
    const start = t + i * 0.06;
    g.gain.setValueAtTime(0.1, start);
    g.gain.linearRampToValueAtTime(0, start + 0.1);

    osc.connect(g).connect(bus);
    osc.start(start);
    osc.stop(start + 0.1);
  });
}

/** Boss warning siren — pulsing alert */
export function sfxBossWarning() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.35;
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, start);
    osc.frequency.linearRampToValueAtTime(440, start + 0.15);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.12, start);
    g.gain.linearRampToValueAtTime(0, start + 0.25);

    osc.connect(g).connect(bus);
    osc.start(start);
    osc.stop(start + 0.25);
  }
}

/** Crystal bomb — icy shatter */
export function sfxCrystalBomb() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  // High shimmer
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2400, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.1, t);
  g.gain.linearRampToValueAtTime(0, t + 0.2);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.2);

  // Crunch
  const bufLen = Math.floor(ac.sampleRate * 0.12);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 3000;

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.08, t + 0.05);
  ng.gain.linearRampToValueAtTime(0, t + 0.15);

  noise.connect(filter).connect(ng).connect(bus);
  noise.start(t + 0.05);
}

/** Shield pulse — ring burst */
export function sfxShieldPulse() {
  const ac = getAudioCtx();
  const bus = getSfxBus();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(1600, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.14, t);
  g.gain.linearRampToValueAtTime(0, t + 0.22);

  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.22);
}
