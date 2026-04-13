export type EnemyPattern = "drifter" | "sine" | "zigzag" | "orbiter" | "charger" | "splitter" | "bomber" | "sniper" | "swarm" | "dreadnought" | "tank" | "miniboss";

export interface ShmupWaveEnemy {
  delayMs: number;
  x: number; // Normalized screen position from 0 to 1
  pattern: EnemyPattern;
  y?: number;
  vx?: number;
  vy?: number;
  hp?: number;
  radius?: number;
  scoreValue?: number;
  fireCooldown?: number;
  amplitude?: number;
  frequency?: number;
  elite?: boolean;
}

export interface ShmupWave {
  id: string;
  label: string;
  durationMs: number;
  enemies: ShmupWaveEnemy[];
}

export interface ShmupMapPalette {
  backgroundTop: string;
  backgroundBottom: string;
  corridorGlow: string;
  warningOverlay: string;
  overdriveOverlay: string;
  enemyShotColor: string;
  enemyShotCore: string;
  bossShotColor: string;
  bossShotCore: string;
  bossPrimary: string;
  bossSecondary: string;
}

export interface BossPhaseConfig {
  hpThreshold: number;   // e.g., 1.0 = full, 0.6 = 60%, 0.3 = 30%
  fireRate: number;       // seconds between aimed shots
  burstRate: number;      // seconds between burst patterns
  burstCount: number;     // bullets per burst
  moveSpeed: number;      // horizontal sway amplitude multiplier
  moveFreq: number;       // horizontal sway frequency
  summonMinions: boolean; // whether to spawn minion enemies
  sweepLaser: boolean;    // whether to fire sweeping laser beams
}

export interface ShmupMap {
  id: string;
  name: string;
  bossName: string;
  tagline: string;
  briefing: string;
  debrief: string;
  bossMaxHp: number;
  bossTriggerMs: number;
  bossWarningMs: number;
  bossPhases: BossPhaseConfig[];
  palette: ShmupMapPalette;
  /** Optional rendered key art used as the map-card background in the hangar. */
  artUrl?: string;
  waves: ShmupWave[];
}

const NEBULA_WAVES: ShmupWave[] = [
  {
    id: "opening-arrow",
    label: "Opening Arrow",
    durationMs: 2800,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "drifter", vy: 112, hp: 2, scoreValue: 180 },
      { delayMs: 140, x: 0.36, pattern: "drifter", vx: -16, vy: 116, hp: 2, scoreValue: 180 },
      { delayMs: 140, x: 0.64, pattern: "drifter", vx: 16, vy: 116, hp: 2, scoreValue: 180 },
      { delayMs: 320, x: 0.24, pattern: "swarm", vx: -32, vy: 155, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 360, x: 0.28, pattern: "swarm", vx: -28, vy: 160, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 400, x: 0.32, pattern: "swarm", vx: -24, vy: 150, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 520, x: 0.76, pattern: "drifter", vx: 32, vy: 122, hp: 2, scoreValue: 200 },
      { delayMs: 700, x: 0.5, pattern: "sine", vy: 96, amplitude: 40, frequency: 2.2, hp: 3, scoreValue: 260 },
    ],
  },
  {
    id: "crosswind-pair",
    label: "Crosswind Pair",
    durationMs: 3200,
    enemies: [
      { delayMs: 0, x: 0.2, pattern: "sine", vy: 88, amplitude: 54, frequency: 2.1, hp: 3, scoreValue: 260 },
      { delayMs: 0, x: 0.8, pattern: "sine", vy: 88, amplitude: 54, frequency: 2.1, hp: 3, scoreValue: 260 },
      { delayMs: 240, x: 0.5, pattern: "charger", vy: 70, hp: 3, scoreValue: 300 },
      { delayMs: 380, x: 0.32, pattern: "drifter", vx: -28, vy: 120, hp: 2, scoreValue: 190 },
      { delayMs: 380, x: 0.68, pattern: "drifter", vx: 28, vy: 120, hp: 2, scoreValue: 190 },
      { delayMs: 600, x: 0.14, pattern: "drifter", vx: 44, vy: 126, hp: 2, scoreValue: 200 },
      { delayMs: 600, x: 0.86, pattern: "drifter", vx: -44, vy: 126, hp: 2, scoreValue: 200 },
      { delayMs: 740, x: 0.5, pattern: "splitter", vy: 92, hp: 4, scoreValue: 350 },
      { delayMs: 920, x: 0.38, pattern: "drifter", vx: -20, vy: 134, hp: 2, scoreValue: 190 },
    ],
  },
  {
    id: "pincer-drop",
    label: "Pincer Drop",
    durationMs: 3000,
    enemies: [
      { delayMs: 0, x: 0.14, pattern: "drifter", vx: 64, vy: 132, hp: 2, scoreValue: 190 },
      { delayMs: 0, x: 0.86, pattern: "drifter", vx: -64, vy: 132, hp: 2, scoreValue: 190 },
      { delayMs: 180, x: 0.5, pattern: "bomber", vy: 60, hp: 5, radius: 22, scoreValue: 400 },
      { delayMs: 240, x: 0.26, pattern: "drifter", vx: 42, vy: 126, hp: 2, scoreValue: 190 },
      { delayMs: 240, x: 0.74, pattern: "drifter", vx: -42, vy: 126, hp: 2, scoreValue: 190 },
      { delayMs: 480, x: 0.38, pattern: "sine", vy: 90, amplitude: 50, frequency: 2.3, hp: 3, scoreValue: 270 },
      { delayMs: 480, x: 0.62, pattern: "sine", vy: 90, amplitude: 50, frequency: 2.3, hp: 3, scoreValue: 270 },
      { delayMs: 640, x: 0.5, pattern: "sine", vy: 94, amplitude: 72, frequency: 2.25, hp: 4, scoreValue: 320, fireCooldown: 0.82 },
      { delayMs: 800, x: 0.5, pattern: "miniboss", vy: 30, hp: 18, radius: 28, scoreValue: 1200 },
    ],
  },
  {
    id: "serpent-column",
    label: "Serpent Column",
    durationMs: 3400,
    enemies: [
      { delayMs: 0, x: 0.18, pattern: "sine", vy: 90, amplitude: 44, frequency: 2.4, hp: 3, scoreValue: 260 },
      { delayMs: 140, x: 0.34, pattern: "sine", vy: 92, amplitude: 48, frequency: 2.3, hp: 3, scoreValue: 260 },
      { delayMs: 280, x: 0.5, pattern: "sniper", vy: 40, hp: 3, scoreValue: 380, fireCooldown: 2.0 },
      { delayMs: 420, x: 0.66, pattern: "sine", vy: 92, amplitude: 48, frequency: 2.3, hp: 3, scoreValue: 260 },
      { delayMs: 500, x: 0.5, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 560, x: 0.82, pattern: "charger", vy: 65, hp: 3, scoreValue: 300 },
      { delayMs: 700, x: 0.26, pattern: "drifter", vx: 38, vy: 128, hp: 2, scoreValue: 200 },
      { delayMs: 700, x: 0.74, pattern: "drifter", vx: -38, vy: 128, hp: 2, scoreValue: 200 },
      { delayMs: 880, x: 0.5, pattern: "orbiter", vy: 82, amplitude: 60, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.85 },
    ],
  },
  {
    id: "nebula-ambush",
    label: "Nebula Ambush",
    durationMs: 3000,
    enemies: [
      { delayMs: 0, x: 0.2, pattern: "swarm", vx: 20, vy: 170, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 60, x: 0.25, pattern: "swarm", vx: 15, vy: 165, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 120, x: 0.3, pattern: "swarm", vx: 10, vy: 175, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 180, x: 0.7, pattern: "swarm", vx: -20, vy: 170, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 240, x: 0.75, pattern: "swarm", vx: -15, vy: 165, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 300, x: 0.8, pattern: "swarm", vx: -10, vy: 175, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 500, x: 0.5, pattern: "splitter", vy: 85, hp: 5, scoreValue: 380 },
      { delayMs: 600, x: 0.5, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 800, x: 0.35, pattern: "charger", vy: 60, hp: 3, scoreValue: 300 },
      { delayMs: 800, x: 0.65, pattern: "charger", vy: 60, hp: 3, scoreValue: 300 },
    ],
  },
  {
    id: "nebula-dreadnought",
    label: "Dreadnought Assault",
    durationMs: 8000,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "dreadnought", vy: 25, hp: 120, radius: 38, scoreValue: 2000 },
      { delayMs: 1200, x: 0.2, pattern: "swarm", vx: 20, vy: 170, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 1300, x: 0.25, pattern: "swarm", vx: 15, vy: 165, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 1400, x: 0.75, pattern: "swarm", vx: -20, vy: 170, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 1500, x: 0.8, pattern: "swarm", vx: -15, vy: 165, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 3000, x: 0.2, pattern: "sine", vy: 90, amplitude: 48, frequency: 2.2, hp: 3, scoreValue: 260 },
      { delayMs: 3000, x: 0.8, pattern: "sine", vy: 90, amplitude: 48, frequency: 2.2, hp: 3, scoreValue: 260 },
    ],
  },
];

const SOLAR_WAVES: ShmupWave[] = [
  {
    id: "flare-gate",
    label: "Flare Gate",
    durationMs: 3000,
    enemies: [
      { delayMs: 0, x: 0.24, pattern: "zigzag", vy: 110, amplitude: 56, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 0, x: 0.76, pattern: "zigzag", vy: 110, amplitude: 56, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 200, x: 0.5, pattern: "bomber", vy: 55, hp: 5, radius: 22, scoreValue: 400 },
      { delayMs: 400, x: 0.38, pattern: "charger", vy: 65, hp: 3, scoreValue: 300 },
      { delayMs: 400, x: 0.62, pattern: "charger", vy: 65, hp: 3, scoreValue: 300 },
      { delayMs: 620, x: 0.34, pattern: "zigzag", vy: 108, amplitude: 62, frequency: 4.1, hp: 3, scoreValue: 260 },
      { delayMs: 620, x: 0.66, pattern: "zigzag", vy: 108, amplitude: 62, frequency: 4.1, hp: 3, scoreValue: 260 },
      { delayMs: 820, x: 0.5, pattern: "sniper", vy: 35, hp: 3, scoreValue: 380, fireCooldown: 1.8 },
    ],
  },
  {
    id: "heat-lattice",
    label: "Heat Lattice",
    durationMs: 3400,
    enemies: [
      { delayMs: 0, x: 0.14, pattern: "drifter", vx: 92, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 0, x: 0.86, pattern: "drifter", vx: -92, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 220, x: 0.26, pattern: "zigzag", vy: 106, amplitude: 52, frequency: 3.4, hp: 3, scoreValue: 250 },
      { delayMs: 220, x: 0.74, pattern: "splitter", vy: 88, hp: 4, scoreValue: 350 },
      { delayMs: 460, x: 0.4, pattern: "drifter", vx: -18, vy: 132, hp: 2, scoreValue: 210 },
      { delayMs: 460, x: 0.6, pattern: "drifter", vx: 18, vy: 132, hp: 2, scoreValue: 210 },
      { delayMs: 680, x: 0.5, pattern: "orbiter", vy: 86, amplitude: 58, frequency: 2.6, hp: 4, scoreValue: 320, fireCooldown: 0.78 },
      { delayMs: 680, x: 0.2, pattern: "zigzag", vy: 112, amplitude: 48, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 680, x: 0.8, pattern: "zigzag", vy: 112, amplitude: 48, frequency: 3.8, hp: 3, scoreValue: 250 },
    ],
  },
  {
    id: "magma-spiral",
    label: "Magma Spiral",
    durationMs: 3600,
    enemies: [
      { delayMs: 0, x: 0.28, pattern: "orbiter", vy: 84, amplitude: 46, frequency: 2.4, hp: 4, scoreValue: 310, fireCooldown: 0.86 },
      { delayMs: 160, x: 0.72, pattern: "orbiter", vy: 84, amplitude: 46, frequency: 2.4, hp: 4, scoreValue: 310, fireCooldown: 0.86 },
      { delayMs: 340, x: 0.5, pattern: "splitter", vy: 80, hp: 5, scoreValue: 380 },
      { delayMs: 500, x: 0.2, pattern: "zigzag", vy: 112, amplitude: 68, frequency: 4.4, hp: 3, scoreValue: 260 },
      { delayMs: 500, x: 0.8, pattern: "zigzag", vy: 112, amplitude: 68, frequency: 4.4, hp: 3, scoreValue: 260 },
      { delayMs: 600, x: 0.5, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 700, x: 0.36, pattern: "sine", vy: 92, amplitude: 52, frequency: 2.8, hp: 3, scoreValue: 270 },
      { delayMs: 700, x: 0.64, pattern: "bomber", vy: 50, hp: 6, radius: 24, scoreValue: 450 },
      { delayMs: 900, x: 0.5, pattern: "drifter", vy: 146, hp: 4, scoreValue: 300, fireCooldown: 0.92 },
      { delayMs: 1000, x: 0.5, pattern: "miniboss", vy: 28, hp: 20, radius: 30, scoreValue: 1400 },
    ],
  },
  {
    id: "ember-prism",
    label: "Ember Prism",
    durationMs: 3200,
    enemies: [
      { delayMs: 0, x: 0.16, pattern: "zigzag", vy: 114, amplitude: 60, frequency: 3.9, hp: 3, scoreValue: 255 },
      { delayMs: 0, x: 0.84, pattern: "zigzag", vy: 114, amplitude: 60, frequency: 3.9, hp: 3, scoreValue: 255 },
      { delayMs: 120, x: 0.34, pattern: "charger", vy: 60, hp: 3, scoreValue: 300 },
      { delayMs: 240, x: 0.52, pattern: "orbiter", vy: 82, amplitude: 50, frequency: 2.8, hp: 4, scoreValue: 320, fireCooldown: 0.84 },
      { delayMs: 360, x: 0.7, pattern: "charger", vy: 60, hp: 3, scoreValue: 300 },
      { delayMs: 520, x: 0.22, pattern: "sine", vy: 90, amplitude: 46, frequency: 2.4, hp: 3, scoreValue: 260 },
      { delayMs: 520, x: 0.78, pattern: "sniper", vy: 38, hp: 3, scoreValue: 380, fireCooldown: 1.9 },
      { delayMs: 700, x: 0.5, pattern: "drifter", vy: 140, hp: 3, scoreValue: 240 },
      { delayMs: 700, x: 0.3, pattern: "drifter", vx: 48, vy: 130, hp: 2, scoreValue: 210 },
    ],
  },
  {
    id: "solar-swarm",
    label: "Solar Swarm",
    durationMs: 2800,
    enemies: [
      { delayMs: 0, x: 0.3, pattern: "swarm", vx: 25, vy: 180, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 50, x: 0.35, pattern: "swarm", vx: 20, vy: 175, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 100, x: 0.4, pattern: "swarm", vx: 15, vy: 185, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 150, x: 0.6, pattern: "swarm", vx: -25, vy: 180, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 200, x: 0.65, pattern: "swarm", vx: -20, vy: 175, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 250, x: 0.7, pattern: "swarm", vx: -15, vy: 185, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 500, x: 0.5, pattern: "bomber", vy: 52, hp: 6, radius: 24, scoreValue: 450 },
      { delayMs: 600, x: 0.5, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 700, x: 0.2, pattern: "sniper", vy: 35, hp: 3, scoreValue: 380, fireCooldown: 2.0 },
      { delayMs: 700, x: 0.8, pattern: "sniper", vy: 35, hp: 3, scoreValue: 380, fireCooldown: 2.0 },
    ],
  },
  {
    id: "solar-dreadnought",
    label: "Dreadnought Siege",
    durationMs: 8000,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "dreadnought", vy: 25, hp: 130, radius: 38, scoreValue: 2200 },
      { delayMs: 1000, x: 0.15, pattern: "charger", vy: 65, hp: 3, scoreValue: 300 },
      { delayMs: 1000, x: 0.85, pattern: "charger", vy: 65, hp: 3, scoreValue: 300 },
      { delayMs: 2500, x: 0.3, pattern: "zigzag", vy: 110, amplitude: 56, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 2500, x: 0.7, pattern: "zigzag", vy: 110, amplitude: 56, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 4000, x: 0.2, pattern: "sniper", vy: 35, hp: 3, scoreValue: 380, fireCooldown: 1.8 },
      { delayMs: 4000, x: 0.8, pattern: "sniper", vy: 35, hp: 3, scoreValue: 380, fireCooldown: 1.8 },
    ],
  },
];

const ABYSS_WAVES: ShmupWave[] = [
  {
    id: "frost-needle",
    label: "Frost Needle",
    durationMs: 3200,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "orbiter", vy: 78, amplitude: 64, frequency: 2.2, hp: 4, scoreValue: 310, fireCooldown: 0.88 },
      { delayMs: 200, x: 0.3, pattern: "charger", vy: 60, hp: 3, scoreValue: 300 },
      { delayMs: 200, x: 0.7, pattern: "charger", vy: 60, hp: 3, scoreValue: 300 },
      { delayMs: 400, x: 0.24, pattern: "sine", vy: 90, amplitude: 48, frequency: 2.5, hp: 3, scoreValue: 260 },
      { delayMs: 400, x: 0.76, pattern: "sniper", vy: 36, hp: 3, scoreValue: 380, fireCooldown: 1.8 },
      { delayMs: 620, x: 0.42, pattern: "zigzag", vy: 108, amplitude: 52, frequency: 4.0, hp: 3, scoreValue: 250 },
      { delayMs: 620, x: 0.58, pattern: "zigzag", vy: 108, amplitude: 52, frequency: 4.0, hp: 3, scoreValue: 250 },
      { delayMs: 720, x: 0.14, pattern: "drifter", vx: 54, vy: 126, hp: 3, scoreValue: 220 },
      { delayMs: 720, x: 0.86, pattern: "drifter", vx: -54, vy: 126, hp: 3, scoreValue: 220 },
    ],
  },
  {
    id: "glacier-fan",
    label: "Glacier Fan",
    durationMs: 3600,
    enemies: [
      { delayMs: 0, x: 0.18, pattern: "orbiter", vy: 82, amplitude: 40, frequency: 3.1, hp: 4, scoreValue: 300, fireCooldown: 0.84 },
      { delayMs: 0, x: 0.82, pattern: "splitter", vy: 85, hp: 5, scoreValue: 380 },
      { delayMs: 280, x: 0.4, pattern: "bomber", vy: 52, hp: 6, radius: 22, scoreValue: 450 },
      { delayMs: 280, x: 0.6, pattern: "drifter", vx: 22, vy: 128, hp: 3, scoreValue: 220 },
      { delayMs: 420, x: 0.32, pattern: "zigzag", vy: 104, amplitude: 58, frequency: 4.6, hp: 3, scoreValue: 250 },
      { delayMs: 420, x: 0.68, pattern: "zigzag", vy: 104, amplitude: 58, frequency: 4.6, hp: 3, scoreValue: 250 },
      { delayMs: 550, x: 0.5, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 650, x: 0.22, pattern: "sine", vy: 88, amplitude: 42, frequency: 2.4, hp: 3, scoreValue: 260 },
      { delayMs: 650, x: 0.78, pattern: "sine", vy: 88, amplitude: 42, frequency: 2.4, hp: 3, scoreValue: 260 },
      { delayMs: 900, x: 0.5, pattern: "orbiter", vy: 80, amplitude: 68, frequency: 2.3, hp: 5, scoreValue: 350, fireCooldown: 0.72 },
    ],
  },
  {
    id: "abyss-weave",
    label: "Abyss Weave",
    durationMs: 3400,
    enemies: [
      { delayMs: 0, x: 0.22, pattern: "sine", vy: 88, amplitude: 66, frequency: 2.9, hp: 3, scoreValue: 260 },
      { delayMs: 0, x: 0.78, pattern: "splitter", vy: 82, hp: 5, scoreValue: 380 },
      { delayMs: 140, x: 0.5, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
      { delayMs: 360, x: 0.4, pattern: "zigzag", vy: 112, amplitude: 54, frequency: 4.2, hp: 3, scoreValue: 250 },
      { delayMs: 360, x: 0.6, pattern: "zigzag", vy: 112, amplitude: 54, frequency: 4.2, hp: 3, scoreValue: 250 },
      { delayMs: 520, x: 0.16, pattern: "swarm", vx: 30, vy: 170, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 560, x: 0.2, pattern: "swarm", vx: 25, vy: 175, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 600, x: 0.24, pattern: "swarm", vx: 20, vy: 165, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 740, x: 0.5, pattern: "orbiter", vy: 84, amplitude: 72, frequency: 2.7, hp: 5, scoreValue: 360, fireCooldown: 0.74 },
      { delayMs: 740, x: 0.34, pattern: "sniper", vy: 38, hp: 3, scoreValue: 380, fireCooldown: 2.0 },
      { delayMs: 900, x: 0.5, pattern: "miniboss", vy: 26, hp: 22, radius: 30, scoreValue: 1600 },
    ],
  },
  {
    id: "polar-break",
    label: "Polar Break",
    durationMs: 3200,
    enemies: [
      { delayMs: 0, x: 0.14, pattern: "drifter", vx: 70, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 0, x: 0.86, pattern: "drifter", vx: -70, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 0, x: 0.5, pattern: "bomber", vy: 48, hp: 7, radius: 24, scoreValue: 500 },
      { delayMs: 260, x: 0.28, pattern: "orbiter", vy: 86, amplitude: 48, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.82 },
      { delayMs: 260, x: 0.72, pattern: "orbiter", vy: 86, amplitude: 48, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.82 },
      { delayMs: 500, x: 0.38, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
      { delayMs: 500, x: 0.62, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
      { delayMs: 620, x: 0.5, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 760, x: 0.5, pattern: "splitter", vy: 78, hp: 6, scoreValue: 420, elite: true },
      { delayMs: 760, x: 0.2, pattern: "drifter", vx: 62, vy: 132, hp: 3, scoreValue: 230 },
    ],
  },
  {
    id: "cryo-onslaught",
    label: "Cryo Onslaught",
    durationMs: 3400,
    enemies: [
      { delayMs: 0, x: 0.15, pattern: "swarm", vx: 30, vy: 190, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 40, x: 0.2, pattern: "swarm", vx: 25, vy: 185, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 80, x: 0.25, pattern: "swarm", vx: 20, vy: 195, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 120, x: 0.75, pattern: "swarm", vx: -30, vy: 190, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 160, x: 0.8, pattern: "swarm", vx: -25, vy: 185, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 200, x: 0.85, pattern: "swarm", vx: -20, vy: 195, hp: 1, radius: 10, scoreValue: 80 },
      { delayMs: 400, x: 0.3, pattern: "bomber", vy: 50, hp: 7, radius: 24, scoreValue: 500 },
      { delayMs: 400, x: 0.7, pattern: "sniper", vy: 36, hp: 4, scoreValue: 420, fireCooldown: 1.6, elite: true },
      { delayMs: 550, x: 0.3, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 550, x: 0.7, pattern: "tank", vy: 35, hp: 35, radius: 36, scoreValue: 800 },
      { delayMs: 700, x: 0.5, pattern: "splitter", vy: 75, hp: 6, scoreValue: 420, elite: true },
      { delayMs: 900, x: 0.4, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
      { delayMs: 900, x: 0.6, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
    ],
  },
  {
    id: "abyss-dreadnought",
    label: "Dreadnought Breach",
    durationMs: 8000,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "dreadnought", vy: 25, hp: 140, radius: 40, scoreValue: 2400 },
      { delayMs: 800, x: 0.2, pattern: "orbiter", vy: 82, amplitude: 50, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.82 },
      { delayMs: 800, x: 0.8, pattern: "orbiter", vy: 82, amplitude: 50, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.82 },
      { delayMs: 2000, x: 0.3, pattern: "bomber", vy: 50, hp: 6, radius: 24, scoreValue: 450 },
      { delayMs: 2000, x: 0.7, pattern: "bomber", vy: 50, hp: 6, radius: 24, scoreValue: 450 },
      { delayMs: 3500, x: 0.15, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
      { delayMs: 3500, x: 0.85, pattern: "charger", vy: 55, hp: 4, scoreValue: 320 },
    ],
  },
];

export const SHMUP_MAPS: ShmupMap[] = [
  {
    id: "nebula-runway",
    name: "Nebula Runway",
    bossName: "Aegis Dreadnought",
    tagline: "Slipstream interception corridor",
    artUrl: "/assets/maps/nebula-runway.png",
    briefing: "Break the patrol line and reopen the route.",
    debrief: "Corridor pressure collapsed. The lane is ours again.",
    bossMaxHp: 360,
    bossTriggerMs: 72_000,
    bossWarningMs: 2600,
    bossPhases: [
      { hpThreshold: 1.0, fireRate: 0.85, burstRate: 2.1, burstCount: 7, moveSpeed: 86, moveFreq: 0.95, summonMinions: false, sweepLaser: false },
      { hpThreshold: 0.6, fireRate: 0.65, burstRate: 1.5, burstCount: 10, moveSpeed: 120, moveFreq: 1.2, summonMinions: false, sweepLaser: true },
      { hpThreshold: 0.25, fireRate: 0.45, burstRate: 1.0, burstCount: 14, moveSpeed: 160, moveFreq: 1.6, summonMinions: true, sweepLaser: true },
    ],
    palette: {
      backgroundTop: "#040612",
      backgroundBottom: "#111b37",
      corridorGlow: "rgba(54, 138, 255, 0.18)",
      warningOverlay: "rgba(255, 107, 107, 0.08)",
      overdriveOverlay: "rgba(255, 212, 59, 0.08)",
      enemyShotColor: "#da77f2",
      enemyShotCore: "#f8f0fc",
      bossShotColor: "#ff922b",
      bossShotCore: "#fff4e6",
      bossPrimary: "#ff6b9d",
      bossSecondary: "#ff922b",
    },
    waves: NEBULA_WAVES,
  },
  {
    id: "solar-rift",
    name: "Solar Rift",
    bossName: "Helios Tyrant",
    tagline: "Thermal fortress breach",
    artUrl: "/assets/maps/solar-rift.png",
    briefing: "Push through the flare wall and crack the weapons platform.",
    debrief: "The heat front is broken. Solar control is shifting back.",
    bossMaxHp: 430,
    bossTriggerMs: 78_000,
    bossWarningMs: 2800,
    bossPhases: [
      { hpThreshold: 1.0, fireRate: 0.80, burstRate: 2.0, burstCount: 8, moveSpeed: 90, moveFreq: 1.0, summonMinions: false, sweepLaser: false },
      { hpThreshold: 0.55, fireRate: 0.55, burstRate: 1.3, burstCount: 12, moveSpeed: 140, moveFreq: 1.35, summonMinions: true, sweepLaser: false },
      { hpThreshold: 0.2, fireRate: 0.38, burstRate: 0.85, burstCount: 16, moveSpeed: 180, moveFreq: 1.8, summonMinions: true, sweepLaser: true },
    ],
    palette: {
      backgroundTop: "#170503",
      backgroundBottom: "#3b1007",
      corridorGlow: "rgba(255, 130, 61, 0.2)",
      warningOverlay: "rgba(255, 162, 61, 0.09)",
      overdriveOverlay: "rgba(255, 209, 102, 0.1)",
      enemyShotColor: "#ff8787",
      enemyShotCore: "#fff5f5",
      bossShotColor: "#ff922b",
      bossShotCore: "#fff4e6",
      bossPrimary: "#ff6b6b",
      bossSecondary: "#ffa94d",
    },
    waves: SOLAR_WAVES,
  },
  {
    id: "abyss-crown",
    name: "Abyss Crown",
    bossName: "Cryo Leviathan",
    tagline: "Deep-void terminal descent",
    artUrl: "/assets/maps/abyss-crown.png",
    briefing: "Hold formation through the cold breach and cut down the Leviathan.",
    debrief: "The void finally blinked. Abyss Crown is no longer untouchable.",
    bossMaxHp: 470,
    bossTriggerMs: 84_000,
    bossWarningMs: 3000,
    bossPhases: [
      { hpThreshold: 1.0, fireRate: 0.75, burstRate: 1.8, burstCount: 9, moveSpeed: 95, moveFreq: 1.05, summonMinions: false, sweepLaser: false },
      { hpThreshold: 0.5, fireRate: 0.50, burstRate: 1.2, burstCount: 13, moveSpeed: 150, moveFreq: 1.4, summonMinions: true, sweepLaser: true },
      { hpThreshold: 0.2, fireRate: 0.32, burstRate: 0.75, burstCount: 18, moveSpeed: 200, moveFreq: 2.0, summonMinions: true, sweepLaser: true },
    ],
    palette: {
      backgroundTop: "#030b16",
      backgroundBottom: "#0f2c4d",
      corridorGlow: "rgba(98, 188, 255, 0.2)",
      warningOverlay: "rgba(143, 206, 255, 0.08)",
      overdriveOverlay: "rgba(180, 229, 255, 0.08)",
      enemyShotColor: "#74c0fc",
      enemyShotCore: "#e7f5ff",
      bossShotColor: "#4dabf7",
      bossShotCore: "#d0ebff",
      bossPrimary: "#4dabf7",
      bossSecondary: "#74c0fc",
    },
    waves: ABYSS_WAVES,
  },
];

// Keep legacy export for existing imports.
export const SHMUP_WAVES: ShmupWave[] = SHMUP_MAPS[0].waves;

export function getShmupMapById(mapId: string | null | undefined): ShmupMap | null {
  if (!mapId) return null;
  return SHMUP_MAPS.find((map) => map.id === mapId) ?? null;
}

export function getShmupMapForShip(shipId: string | null | undefined): ShmupMap {
  switch (shipId) {
    case "ship_valkyrie_lancer":
      return SHMUP_MAPS[1];
    case "ship_seraph_guard":
      return SHMUP_MAPS[2];
    case "ship_astra_interceptor":
    default:
      return SHMUP_MAPS[0];
  }
}
