/** Core type definitions for Astra Valkyries */

// ─── Data types ──────────────────────────────────────────

export interface PilotPerk {
  type: "perfectWindow" | "comboBonus" | "feverDuration";
  label: string;
  value: number;
}

export interface Pilot {
  id: string;
  name: string;
  description: string;
  stats: { accuracy: number; rhythm: number; endurance: number };
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
  stats: { mobility: number; firepower: number; control: number };
  artPlaceholder: string;
  artUrl?: string;
  spriteUrl?: string;
  cutinUrl?: string;
  trait: ShipTrait;
  modifiers: ShipModifiers;
}

export interface BeatNote {
  t: number;    // time in ms
  lane: 0 | 1 | 2;
  type: "tap";
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  difficulty: "Easy" | "Normal" | "Hard";
  beatmap: BeatNote[];
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
}

export interface GameSettings {
  noteSpeed: number;       // pixels per second (default 400)
  musicVolume: number;     // 0-1
  sfxVolume: number;       // 0-1
  showFPS: boolean;
}

// ─── Gameplay types ─────────────────────────────────────

export type HitJudgment = "Perfect" | "Good" | "Miss";

export type Grade = "S" | "A" | "B" | "C" | "D";

interface BaseGameResult {
  mode: "rhythm" | "shmup";
  trackId: string;
  score: number;
  grade: Grade;
  creditsEarned: number;
}

export interface RhythmGameResult extends BaseGameResult {
  mode: "rhythm";
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  totalNotes: number;
  accuracy: number;   // 0-100
}

export interface ShmupGameResult extends BaseGameResult {
  mode: "shmup";
  kills: number;
  timeSurvivedMs: number;
  bestMultiplier: number;
  weaponLevel: number;
  damageTaken: number;
}

export type GameResult = RhythmGameResult | ShmupGameResult;

export interface GachaResult {
  outfit: Outfit;
  isNew: boolean;
  shardsGained: number;
}
