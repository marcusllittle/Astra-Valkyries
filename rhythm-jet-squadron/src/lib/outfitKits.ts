import type { Outfit, ShmupKit } from "../types";
import {
  passiveName,
  primaryName,
  secondaryName,
} from "./kitNames";

const RARITY_PROGRESSION: Record<Outfit["rarity"], number> = {
  Common: 0,
  Rare: 1,
  SR: 2,
  SSR: 3,
};

const OUTFIT_PROGRESSION_OVERRIDES: Record<string, number> = {
  outfit_09: 0, // Frost Nova: Yuki starter
  outfit_05: 1, // Cloud Walker: Yuki second
  outfit_03: 2, // Desert Storm: promoted out of starter tier
};

export function compareOutfitProgression(a: Outfit, b: Outfit): number {
  const aOverride = OUTFIT_PROGRESSION_OVERRIDES[a.id];
  const bOverride = OUTFIT_PROGRESSION_OVERRIDES[b.id];
  if (aOverride !== undefined || bOverride !== undefined) {
    return (aOverride ?? 100) - (bOverride ?? 100);
  }
  const rarityDifference = RARITY_PROGRESSION[a.rarity] - RARITY_PROGRESSION[b.rarity];
  return rarityDifference || a.id.localeCompare(b.id);
}

export function isOutfitPilotLocked(
  outfit: Outfit,
  selectedPilotId: string | null
): boolean {
  if (!selectedPilotId) return false;
  if (!outfit.pilotId) return false;
  return outfit.pilotId !== selectedPilotId;
}

export function getKitBombCharges(outfit: Outfit): number {
  if (
    outfit.shmupKit?.secondary !== "bomb" &&
    outfit.shmupKit?.secondary !== "crystalBomb"
  ) {
    return 0;
  }
  return outfit.rarity === "SSR" ? 5 : 3;
}

export function summarizeOutfitKit(outfit: Outfit): string {
  if (!outfit.shmupKit) {
    return "Standard Burst • No Secondary • No passives";
  }

  const kit = outfit.shmupKit;
  const passiveLabels =
    kit.passives.length > 0
      ? kit.passives.slice(0, 2).map((passive) => passiveName(passive))
      : [];
  const passivesText = passiveLabels.length > 0 ? passiveLabels.join(", ") : "No passives";
  const segments = [
    primaryName(kit.primary),
    secondaryName(kit.secondary),
    passivesText,
  ];

  if (kit.secondary === "bomb" || kit.secondary === "crystalBomb") {
    segments.push(`Charges: ${getKitBombCharges(outfit)}`);
  }

  return segments.join(" • ");
}

export function getSelectedOutfitKit(
  selectedPilotId: string | null,
  selectedOutfitId: string | null,
  outfitsData: Outfit[]
): ShmupKit | null {
  if (!selectedPilotId || !selectedOutfitId) return null;

  const outfit = outfitsData.find((item) => item.id === selectedOutfitId);
  if (!outfit || !outfit.shmupKit) return null;

  if (isOutfitPilotLocked(outfit, selectedPilotId)) {
    return null;
  }

  if ((outfit.rarity === "SR" || outfit.rarity === "SSR") && !outfit.pilotId) {
    return null;
  }

  return outfit.shmupKit;
}
