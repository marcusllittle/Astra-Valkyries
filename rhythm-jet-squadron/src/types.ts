/** Core type definitions for Rhythm Jet Squadron */

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
}

export interface OutfitPerk {
  type: "scoreFlat" | "scoreMult" | "comboBonus" | "perfectWindow" | "feverRate" | "feverDuration" | "comboShield";
  label: string;
  baseValue: number;
  scalingPerStar: number;
}

export interface Outfit {
  id: string;
  name: string;
  rarity: "Common" | "Rare" | "SR" | "SSR";
  artPlaceholder: string;
  perk: OutfitPerk;
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
  ownedOutfits: OwnedOutfit[];    // outfit instances
  selectedPilotId: string | null;
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

export interface GameResult {
  trackId: string;
  score: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  totalNotes: number;
  accuracy: number;   // 0-100
  grade: "S" | "A" | "B" | "C" | "D";
  creditsEarned: number;
}

export interface GachaResult {
  outfit: Outfit;
  isNew: boolean;
  shardsGained: number;
}
