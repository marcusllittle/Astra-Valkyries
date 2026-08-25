import type { OwnedOutfit } from "../types";

export const CORE_STARTER_OUTFIT_IDS = ["outfit_01", "outfit_02", "outfit_09"] as const;

export function ensureCoreStarterOutfits(ownedOutfits: OwnedOutfit[]): OwnedOutfit[] {
  const ownedIds = new Set(ownedOutfits.map((outfit) => outfit.outfitId));
  const missingStarters = CORE_STARTER_OUTFIT_IDS
    .filter((outfitId) => !ownedIds.has(outfitId))
    .map((outfitId) => ({ outfitId, stars: 1, shards: 0 }));
  return [...ownedOutfits, ...missingStarters];
}
