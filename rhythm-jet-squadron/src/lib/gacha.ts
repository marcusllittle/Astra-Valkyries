/**
 * Gacha (pull) system for outfit acquisition.
 * Rarity rates: Common 70%, Rare 20%, SR 9%, SSR 1%
 */

import type { Outfit, GachaResult, OwnedOutfit } from "../types";
import outfitsData from "../data/outfits.json";

const RARITY_WEIGHTS = {
  Common: 70,
  Rare: 20,
  SR: 9,
  SSR: 1,
};

/** Cost constants */
export const PULL_COST_1 = 120;
export const PULL_COST_10 = 1000;

/** Shard thresholds for star upgrades */
export const SHARD_THRESHOLDS: Record<number, number> = {
  2: 10,  // 10 shards: 1★ -> 2★
  3: 20,  // 20 shards: 2★ -> 3★
  4: 40,  // 40 shards: 3★ -> 4★
  5: 80,  // 80 shards: 4★ -> 5★
};

/** Shards gained per duplicate by rarity */
const DUPE_SHARDS: Record<string, number> = {
  Common: 5,
  Rare: 10,
  SR: 25,
  SSR: 50,
};

/** Roll a single rarity */
function rollRarity(): "Common" | "Rare" | "SR" | "SSR" {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) return rarity as Outfit["rarity"];
  }
  return "Common";
}

/** Get all outfits of a specific rarity */
function getOutfitsByRarity(rarity: string): Outfit[] {
  return (outfitsData as Outfit[]).filter((o) => o.rarity === rarity);
}

/** Perform a single pull */
export function pullOne(ownedOutfits: OwnedOutfit[]): GachaResult {
  const rarity = rollRarity();
  const pool = getOutfitsByRarity(rarity);
  const outfit = pool[Math.floor(Math.random() * pool.length)];

  const existing = ownedOutfits.find((o) => o.outfitId === outfit.id);
  if (existing) {
    const shardsGained = DUPE_SHARDS[rarity];
    return { outfit, isNew: false, shardsGained };
  }

  return { outfit, isNew: true, shardsGained: 0 };
}

/** Perform a 10-pull */
export function pullTen(ownedOutfits: OwnedOutfit[]): GachaResult[] {
  // Update owned list as we go so duplicate detection works within the batch
  const tempOwned = [...ownedOutfits];
  const results: GachaResult[] = [];

  for (let i = 0; i < 10; i++) {
    const result = pullOne(tempOwned);
    results.push(result);
    if (result.isNew) {
      tempOwned.push({ outfitId: result.outfit.id, stars: 1, shards: 0 });
    }
  }

  return results;
}

/** Check if an outfit can be upgraded to the next star */
export function canUpgrade(owned: OwnedOutfit): boolean {
  if (owned.stars >= 5) return false;
  const threshold = SHARD_THRESHOLDS[owned.stars + 1];
  return owned.shards >= threshold;
}

/** Get the effective perk value for an outfit at its current star level */
export function getEffectivePerkValue(outfit: Outfit, stars: number): number {
  return outfit.perk.baseValue + outfit.perk.scalingPerStar * (stars - 1);
}

// ─── Pity counter ─────────────────────────────────────────

const PITY_STORAGE_KEY = "astra.pityCounter";
const PITY_THRESHOLD_SR = 30;
const PITY_THRESHOLD_SSR = 90;

export interface PityState {
  pullsSinceSR: number;
  pullsSinceSSR: number;
  totalPulls: number;
}

export function loadPityState(): PityState {
  try {
    const raw = localStorage.getItem(PITY_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PityState;
  } catch { /* ignore */ }
  return { pullsSinceSR: 0, pullsSinceSSR: 0, totalPulls: 0 };
}

export function savePityState(state: PityState): void {
  try {
    localStorage.setItem(PITY_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export { PITY_THRESHOLD_SR, PITY_THRESHOLD_SSR };

// ─── Featured banner ────────────────────────────────────────

export function getFeaturedOutfit(): Outfit | null {
  const allOutfits = outfitsData as Outfit[];
  const ssrOutfits = allOutfits.filter((o) => o.rarity === "SSR");
  if (ssrOutfits.length === 0) return null;
  // Rotate featured outfit weekly based on date
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return ssrOutfits[weekNumber % ssrOutfits.length];
}
