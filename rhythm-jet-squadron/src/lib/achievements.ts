/**
 * Achievement system — tracks player milestones with localStorage persistence.
 */

import type { SaveData } from "../types";
import { loadPityState } from "./gacha";

const STORAGE_KEY = "astra.achievements";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "gameplay" | "collection" | "economy" | "mastery";
  check: (save: SaveData, extras: AchievementExtras) => boolean;
}

export interface AchievementExtras {
  totalPulls: number;
  bestScore: number;
}

function getBestScore(save: SaveData): number {
  return Object.values(save.highScores).reduce((max, s) => Math.max(max, s), 0);
}

export const ACHIEVEMENTS: Achievement[] = [
  // Gameplay
  {
    id: "first_flight",
    title: "First Flight",
    description: "Complete your first shmup run",
    icon: "✈",
    category: "gameplay",
    check: (save) => Object.keys(save.highScores).length > 0,
  },
  {
    id: "score_10k",
    title: "Rising Star",
    description: "Score 10,000 points in a single run",
    icon: "⭐",
    category: "gameplay",
    check: (save) => getBestScore(save) >= 10000,
  },
  {
    id: "score_50k",
    title: "Ace Pilot",
    description: "Score 50,000 points in a single run",
    icon: "🎖",
    category: "gameplay",
    check: (save) => getBestScore(save) >= 50000,
  },
  {
    id: "score_100k",
    title: "Legend",
    description: "Score 100,000 points in a single run",
    icon: "🏆",
    category: "gameplay",
    check: (save) => getBestScore(save) >= 100000,
  },
  {
    id: "score_250k",
    title: "Valkyrie",
    description: "Score 250,000 points in a single run",
    icon: "👑",
    category: "mastery",
    check: (save) => getBestScore(save) >= 250000,
  },

  // Collection
  {
    id: "first_outfit",
    title: "Fashionista",
    description: "Own your first outfit",
    icon: "👔",
    category: "collection",
    check: (save) => save.ownedOutfits.length > 0,
  },
  {
    id: "own_5_outfits",
    title: "Wardrobe Builder",
    description: "Own 5 outfits",
    icon: "🎒",
    category: "collection",
    check: (save) => save.ownedOutfits.length >= 5,
  },
  {
    id: "own_10_outfits",
    title: "Fashion Icon",
    description: "Own 10 outfits",
    icon: "💎",
    category: "collection",
    check: (save) => save.ownedOutfits.length >= 10,
  },
  {
    id: "own_all_outfits",
    title: "Complete Collection",
    description: "Own all 18 outfits",
    icon: "🌟",
    category: "collection",
    check: (save) => save.ownedOutfits.length >= 18,
  },
  {
    id: "max_star_outfit",
    title: "Fully Upgraded",
    description: "Upgrade any outfit to 5 stars",
    icon: "⭐",
    category: "collection",
    check: (save) => save.ownedOutfits.some((o) => o.stars >= 5),
  },

  // Economy
  {
    id: "earn_1000",
    title: "Pocket Change",
    description: "Accumulate 1,000 total credits",
    icon: "💰",
    category: "economy",
    check: (save) => save.credits >= 1000,
  },
  {
    id: "earn_5000",
    title: "Funded",
    description: "Accumulate 5,000 total credits",
    icon: "💎",
    category: "economy",
    check: (save) => save.credits >= 5000,
  },
  {
    id: "pull_10",
    title: "Gacha Beginner",
    description: "Perform 10 gacha pulls",
    icon: "🎰",
    category: "economy",
    check: (_save, extras) => extras.totalPulls >= 10,
  },
  {
    id: "pull_50",
    title: "Gacha Veteran",
    description: "Perform 50 gacha pulls",
    icon: "🎲",
    category: "economy",
    check: (_save, extras) => extras.totalPulls >= 50,
  },

  // Mastery
  {
    id: "try_all_pilots",
    title: "Squad Leader",
    description: "Try all 3 pilots",
    icon: "👥",
    category: "mastery",
    check: (save) => save.ownedPilots.length >= 3,
  },
  {
    id: "try_all_ships",
    title: "Fleet Commander",
    description: "Own all 3 ships",
    icon: "🚀",
    category: "mastery",
    check: (save) => save.ownedShips.length >= 3,
  },
];

export interface UnlockedAchievements {
  [achievementId: string]: number; // timestamp of unlock
}

export function loadUnlocked(): UnlockedAchievements {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UnlockedAchievements;
  } catch { /* ignore */ }
  return {};
}

export function saveUnlocked(unlocked: UnlockedAchievements): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  } catch { /* ignore */ }
}

export function checkAchievements(
  save: SaveData,
  unlocked: UnlockedAchievements,
): { newlyUnlocked: Achievement[]; allUnlocked: UnlockedAchievements } {
  const pity = loadPityState();
  const extras: AchievementExtras = {
    totalPulls: pity.totalPulls,
    bestScore: getBestScore(save),
  };

  const updated = { ...unlocked };
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (updated[achievement.id]) continue;
    if (achievement.check(save, extras)) {
      updated[achievement.id] = Date.now();
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked(updated);
  }

  return { newlyUnlocked, allUnlocked: updated };
}
