export type EnemyPattern = "drifter" | "sine" | "zigzag" | "orbiter";

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

export interface ShmupMap {
  id: string;
  name: string;
  bossName: string;
  bossMaxHp: number;
  bossTriggerMs: number;
  bossWarningMs: number;
  palette: ShmupMapPalette;
  waves: ShmupWave[];
}

const NEBULA_WAVES: ShmupWave[] = [
  {
    id: "opening-arrow",
    label: "Opening Arrow",
    durationMs: 2200,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "drifter", vy: 112, hp: 2, scoreValue: 180 },
      { delayMs: 140, x: 0.36, pattern: "drifter", vx: -16, vy: 116, hp: 2, scoreValue: 180 },
      { delayMs: 140, x: 0.64, pattern: "drifter", vx: 16, vy: 116, hp: 2, scoreValue: 180 },
      { delayMs: 320, x: 0.24, pattern: "drifter", vx: -32, vy: 122, hp: 2, scoreValue: 200 },
      { delayMs: 320, x: 0.76, pattern: "drifter", vx: 32, vy: 122, hp: 2, scoreValue: 200 },
    ],
  },
  {
    id: "crosswind-pair",
    label: "Crosswind Pair",
    durationMs: 2600,
    enemies: [
      { delayMs: 0, x: 0.2, pattern: "sine", vy: 88, amplitude: 54, frequency: 2.1, hp: 3, scoreValue: 260 },
      { delayMs: 0, x: 0.8, pattern: "sine", vy: 88, amplitude: 54, frequency: 2.1, hp: 3, scoreValue: 260 },
      { delayMs: 380, x: 0.32, pattern: "drifter", vx: -28, vy: 120, hp: 2, scoreValue: 190 },
      { delayMs: 380, x: 0.68, pattern: "drifter", vx: 28, vy: 120, hp: 2, scoreValue: 190 },
      { delayMs: 740, x: 0.5, pattern: "sine", vy: 92, amplitude: 84, frequency: 2.45, hp: 3, scoreValue: 280 },
    ],
  },
  {
    id: "pincer-drop",
    label: "Pincer Drop",
    durationMs: 2400,
    enemies: [
      { delayMs: 0, x: 0.14, pattern: "drifter", vx: 64, vy: 132, hp: 2, scoreValue: 190 },
      { delayMs: 0, x: 0.86, pattern: "drifter", vx: -64, vy: 132, hp: 2, scoreValue: 190 },
      { delayMs: 240, x: 0.26, pattern: "drifter", vx: 42, vy: 126, hp: 2, scoreValue: 190 },
      { delayMs: 240, x: 0.74, pattern: "drifter", vx: -42, vy: 126, hp: 2, scoreValue: 190 },
      { delayMs: 640, x: 0.5, pattern: "sine", vy: 94, amplitude: 72, frequency: 2.25, hp: 4, scoreValue: 320, fireCooldown: 0.82 },
    ],
  },
  {
    id: "serpent-column",
    label: "Serpent Column",
    durationMs: 2800,
    enemies: [
      { delayMs: 0, x: 0.18, pattern: "sine", vy: 90, amplitude: 44, frequency: 2.4, hp: 3, scoreValue: 260 },
      { delayMs: 180, x: 0.34, pattern: "sine", vy: 92, amplitude: 48, frequency: 2.3, hp: 3, scoreValue: 260 },
      { delayMs: 360, x: 0.5, pattern: "sine", vy: 96, amplitude: 52, frequency: 2.2, hp: 3, scoreValue: 280 },
      { delayMs: 540, x: 0.66, pattern: "sine", vy: 92, amplitude: 48, frequency: 2.3, hp: 3, scoreValue: 260 },
      { delayMs: 720, x: 0.82, pattern: "sine", vy: 90, amplitude: 44, frequency: 2.4, hp: 3, scoreValue: 260 },
    ],
  },
];

const SOLAR_WAVES: ShmupWave[] = [
  {
    id: "flare-gate",
    label: "Flare Gate",
    durationMs: 2400,
    enemies: [
      { delayMs: 0, x: 0.24, pattern: "zigzag", vy: 110, amplitude: 56, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 0, x: 0.76, pattern: "zigzag", vy: 110, amplitude: 56, frequency: 3.8, hp: 3, scoreValue: 250 },
      { delayMs: 320, x: 0.5, pattern: "drifter", vy: 130, hp: 3, scoreValue: 230 },
      { delayMs: 620, x: 0.34, pattern: "zigzag", vy: 108, amplitude: 62, frequency: 4.1, hp: 3, scoreValue: 260 },
      { delayMs: 620, x: 0.66, pattern: "zigzag", vy: 108, amplitude: 62, frequency: 4.1, hp: 3, scoreValue: 260 },
    ],
  },
  {
    id: "heat-lattice",
    label: "Heat Lattice",
    durationMs: 2900,
    enemies: [
      { delayMs: 0, x: 0.14, pattern: "drifter", vx: 92, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 0, x: 0.86, pattern: "drifter", vx: -92, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 220, x: 0.26, pattern: "zigzag", vy: 106, amplitude: 52, frequency: 3.4, hp: 3, scoreValue: 250 },
      { delayMs: 220, x: 0.74, pattern: "zigzag", vy: 106, amplitude: 52, frequency: 3.4, hp: 3, scoreValue: 250 },
      { delayMs: 760, x: 0.5, pattern: "orbiter", vy: 86, amplitude: 58, frequency: 2.6, hp: 4, scoreValue: 320, fireCooldown: 0.78 },
    ],
  },
  {
    id: "magma-spiral",
    label: "Magma Spiral",
    durationMs: 3000,
    enemies: [
      { delayMs: 0, x: 0.28, pattern: "orbiter", vy: 84, amplitude: 46, frequency: 2.4, hp: 4, scoreValue: 310, fireCooldown: 0.86 },
      { delayMs: 160, x: 0.72, pattern: "orbiter", vy: 84, amplitude: 46, frequency: 2.4, hp: 4, scoreValue: 310, fireCooldown: 0.86 },
      { delayMs: 500, x: 0.2, pattern: "zigzag", vy: 112, amplitude: 68, frequency: 4.4, hp: 3, scoreValue: 260 },
      { delayMs: 500, x: 0.8, pattern: "zigzag", vy: 112, amplitude: 68, frequency: 4.4, hp: 3, scoreValue: 260 },
      { delayMs: 900, x: 0.5, pattern: "drifter", vy: 146, hp: 4, scoreValue: 300, fireCooldown: 0.92 },
    ],
  },
  {
    id: "ember-prism",
    label: "Ember Prism",
    durationMs: 2600,
    enemies: [
      { delayMs: 0, x: 0.16, pattern: "zigzag", vy: 114, amplitude: 60, frequency: 3.9, hp: 3, scoreValue: 255 },
      { delayMs: 120, x: 0.34, pattern: "drifter", vx: -34, vy: 128, hp: 3, scoreValue: 230 },
      { delayMs: 240, x: 0.52, pattern: "orbiter", vy: 82, amplitude: 50, frequency: 2.8, hp: 4, scoreValue: 320, fireCooldown: 0.84 },
      { delayMs: 360, x: 0.7, pattern: "drifter", vx: 34, vy: 128, hp: 3, scoreValue: 230 },
      { delayMs: 480, x: 0.88, pattern: "zigzag", vy: 114, amplitude: 60, frequency: 3.9, hp: 3, scoreValue: 255 },
    ],
  },
];

const ABYSS_WAVES: ShmupWave[] = [
  {
    id: "frost-needle",
    label: "Frost Needle",
    durationMs: 2500,
    enemies: [
      { delayMs: 0, x: 0.5, pattern: "orbiter", vy: 78, amplitude: 64, frequency: 2.2, hp: 4, scoreValue: 310, fireCooldown: 0.88 },
      { delayMs: 260, x: 0.24, pattern: "sine", vy: 90, amplitude: 48, frequency: 2.5, hp: 3, scoreValue: 260 },
      { delayMs: 260, x: 0.76, pattern: "sine", vy: 90, amplitude: 48, frequency: 2.5, hp: 3, scoreValue: 260 },
      { delayMs: 720, x: 0.14, pattern: "drifter", vx: 54, vy: 126, hp: 3, scoreValue: 220 },
      { delayMs: 720, x: 0.86, pattern: "drifter", vx: -54, vy: 126, hp: 3, scoreValue: 220 },
    ],
  },
  {
    id: "glacier-fan",
    label: "Glacier Fan",
    durationMs: 3000,
    enemies: [
      { delayMs: 0, x: 0.18, pattern: "orbiter", vy: 82, amplitude: 40, frequency: 3.1, hp: 4, scoreValue: 300, fireCooldown: 0.84 },
      { delayMs: 0, x: 0.82, pattern: "orbiter", vy: 82, amplitude: 40, frequency: 3.1, hp: 4, scoreValue: 300, fireCooldown: 0.84 },
      { delayMs: 420, x: 0.32, pattern: "zigzag", vy: 104, amplitude: 58, frequency: 4.6, hp: 3, scoreValue: 250 },
      { delayMs: 420, x: 0.68, pattern: "zigzag", vy: 104, amplitude: 58, frequency: 4.6, hp: 3, scoreValue: 250 },
      { delayMs: 900, x: 0.5, pattern: "orbiter", vy: 80, amplitude: 68, frequency: 2.3, hp: 5, scoreValue: 350, fireCooldown: 0.72 },
    ],
  },
  {
    id: "abyss-weave",
    label: "Abyss Weave",
    durationMs: 2800,
    enemies: [
      { delayMs: 0, x: 0.22, pattern: "sine", vy: 88, amplitude: 66, frequency: 2.9, hp: 3, scoreValue: 260 },
      { delayMs: 140, x: 0.78, pattern: "sine", vy: 88, amplitude: 66, frequency: 2.9, hp: 3, scoreValue: 260 },
      { delayMs: 360, x: 0.4, pattern: "zigzag", vy: 112, amplitude: 54, frequency: 4.2, hp: 3, scoreValue: 250 },
      { delayMs: 360, x: 0.6, pattern: "zigzag", vy: 112, amplitude: 54, frequency: 4.2, hp: 3, scoreValue: 250 },
      { delayMs: 740, x: 0.5, pattern: "orbiter", vy: 84, amplitude: 72, frequency: 2.7, hp: 5, scoreValue: 360, fireCooldown: 0.74 },
    ],
  },
  {
    id: "polar-break",
    label: "Polar Break",
    durationMs: 2500,
    enemies: [
      { delayMs: 0, x: 0.14, pattern: "drifter", vx: 70, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 0, x: 0.86, pattern: "drifter", vx: -70, vy: 138, hp: 3, scoreValue: 230 },
      { delayMs: 260, x: 0.28, pattern: "orbiter", vy: 86, amplitude: 48, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.82 },
      { delayMs: 260, x: 0.72, pattern: "orbiter", vy: 86, amplitude: 48, frequency: 2.5, hp: 4, scoreValue: 310, fireCooldown: 0.82 },
      { delayMs: 760, x: 0.5, pattern: "zigzag", vy: 112, amplitude: 70, frequency: 4.8, hp: 4, scoreValue: 320, fireCooldown: 0.8 },
    ],
  },
];

export const SHMUP_MAPS: ShmupMap[] = [
  {
    id: "nebula-runway",
    name: "Nebula Runway",
    bossName: "Aegis Dreadnought",
    bossMaxHp: 360,
    bossTriggerMs: 72_000,
    bossWarningMs: 2600,
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
    bossMaxHp: 430,
    bossTriggerMs: 78_000,
    bossWarningMs: 2800,
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
    bossMaxHp: 470,
    bossTriggerMs: 84_000,
    bossWarningMs: 3000,
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
