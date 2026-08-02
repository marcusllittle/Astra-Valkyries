/** Core type definitions for Astra Valkyries */

// ─── Data types ──────────────────────────────────────────

/**
 * Legacy rhythm-game key names, kept because outfits.json shares this union.
 * What they actually drive in the shmup (see lib/loadout.ts):
 *   perfectWindow -> hitbox scale   (tighter hurtbox)
 *   comboBonus    -> chain growth   (score ramp on kill streaks)
 *   feverDuration -> overdrive time (longer overdrive window)
 */
export interface PilotPerk {
  type: "perfectWindow" | "comboBonus" | "feverDuration";
  label: string;
  value: number;
}

export interface Pilot {
  id: string;
  name: string;
  description: string;
  perk: PilotPerk;
  artPlaceholder: string;
  artUrl?: string;
  cutinUrl?: string;
  feverCutinUrl?: string;
}

export interface OutfitPerk {
  type: "scoreFlat" | "scoreMult" | "comboBonus" | "perfectWindow" | "feverRate" | "feverDuration" | "comboShield";
  label: string;
  baseValue: number;
  scalingPerStar: number;
}

export type ShmupKit = {
  primary: string;
  secondary: string;
  passives: string[];
  visuals?: {
    shotColor?: string;
  };
};

export interface Outfit {
  id: string;
  name: string;
  rarity: "Common" | "Rare" | "SR" | "SSR";
  artPlaceholder: string;
  artUrl?: string;
  cutsceneArtUrl?: string;
  cutinUrl?: string;
  pilotId?: "pilot_nova" | "pilot_rex" | "pilot_yuki";
  shmupKit?: ShmupKit;
  perk: OutfitPerk;
}

export interface ShipTrait {
  label: string;
  description: string;
}

export interface ShipModifiers {
  maxHp: number;
  moveSpeedPct: number;
  overdriveRate: number;
  overdriveDuration: number;
  scoreMult: number;
  scoreFlat: number;
  comboBonus: number;
}

export interface Ship {
  id: string;
  name: string;
  className: string;
  manufacturer: string;
  description: string;
  artPlaceholder: string;
  artUrl?: string;
  spriteUrl?: string;
  cutinUrl?: string;
  trait: ShipTrait;
  modifiers: ShipModifiers;
}

// ─── Save data types ────────────────────────────────────

export interface OwnedOutfit {
  outfitId: string;
  stars: number;    // 1-5
  shards: number;   // accumulated duplicate shards
}

export interface SaveData {
  credits: number;
  ownedPilots: string[];          // pilot IDs (all unlocked by default)
  ownedShips: string[];           // ship IDs
  ownedOutfits: OwnedOutfit[];    // outfit instances
  selectedPilotId: string | null;
  selectedShipId: string | null;
  selectedMapId: string | null;
  selectedOutfitId: string | null;
  highScores: Record<string, number>; // trackId -> best score
  settings: GameSettings;
  // Progression
  pilotXp: Record<string, number>;
  pilotLevel: Record<string, number>;
  bestGrades: Record<string, string>;  // mapId -> best grade achieved
  totalRuns: number;
  totalKills: number;
  totalBossKills: number;
  // Missions
  missionProgress: Record<string, number>;  // missionId -> progress
  missionsClaimed: string[];                // claimed mission IDs
  lastDailyReset: number;                   // day number of last daily reset
  lastWeeklyReset: number;                  // week number of last weekly reset
  // Meta
  metaCurrency: number;                     // "stardust"
  selectedModifiers: string[];              // active run modifier IDs
  // Narrative / cutscene tracking
  seenCutscenes: string[];                  // cutscene/dialogue IDs already viewed
  zoneClears: Record<string, number>;       // mapId -> times boss defeated
  // Skill tree
  pilotSkills: Record<string, string[]>;    // pilotId -> unlocked skill node IDs
  // JoinHavn-owned cosmetic. Cosmetic only, deliberately: an owned asset
  // must never change a number the sim reads, or the marketplace becomes
  // pay-to-win. The URL here is a cache for first paint; ownership is
  // re-verified against /gallery/collection before the banner is shown.
  equippedBanner: EquippedBanner | null;
}

/** A JoinHavn Collection asset the player has equipped as hangar decor. */
export interface EquippedBanner {
  jobId: string;
  title: string;
  url: string;
}

/** Desktop movement input. Ignored on touch devices, which always use the
 *  on-screen stick. */
export type ControlScheme = "keyboard" | "mouse";

export interface GameSettings {
  musicVolume: number;     // 0-1
  sfxVolume: number;       // 0-1
  showFPS: boolean;
  controlScheme: ControlScheme;
}

// ─── Gameplay types ─────────────────────────────────────

export type Grade = "S" | "A" | "B" | "C" | "D";

export interface GameResult {
  mode: "shmup";
  trackId: string;
  score: number;
  grade: Grade;
  creditsEarned: number;
  kills: number;
  timeSurvivedMs: number;
  bestMultiplier: number;
  weaponLevel: number;
  damageTaken: number;
}

export interface GachaResult {
  outfit: Outfit;
  isNew: boolean;
  shardsGained: number;
}
