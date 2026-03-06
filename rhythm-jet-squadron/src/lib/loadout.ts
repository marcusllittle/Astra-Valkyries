import type { Outfit, OwnedOutfit, Pilot, Ship } from "../types";
import { getEffectivePerkValue } from "./gacha";

export const BASE_SHMUP_HP = 5;
export const BASE_SHMUP_SPEED = 290;
export const BASE_OVERDRIVE_DURATION_MS = 5000;

export interface ShmupLoadoutSummary {
  shipHp: number;
  shipSpeed: number;
  overdriveFillMultiplier: number;
  overdriveDurationMs: number;
  hitboxScale: number;
  scoreFlatBonus: number;
  scoreMultBonus: number;
  comboBonus: number;
  hasComboShield: boolean;
  identityLine: string;
  multiplierLine: string;
  systemsLine: string;
  survivabilityLine: string;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

export function buildShmupLoadout(
  pilot: Pilot | undefined,
  ship: Ship | undefined,
  outfit: Outfit | undefined,
  ownedOutfit: OwnedOutfit | undefined
): ShmupLoadoutSummary {
  let overdriveRateBonus = ship?.modifiers.overdriveRate ?? 0;
  let overdriveDurationBonusSeconds = ship?.modifiers.overdriveDuration ?? 0;
  let perfectWindowBonus = 0;
  let scoreFlatBonus = ship?.modifiers.scoreFlat ?? 0;
  let scoreMultBonus = ship?.modifiers.scoreMult ?? 0;
  let comboBonus = ship?.modifiers.comboBonus ?? 0;
  let hasComboShield = false;

  if (pilot) {
    switch (pilot.perk.type) {
      case "comboBonus":
        comboBonus += pilot.perk.value;
        break;
      case "feverDuration":
        overdriveDurationBonusSeconds += pilot.perk.value;
        break;
      case "perfectWindow":
        perfectWindowBonus += pilot.perk.value;
        break;
    }
  }

  if (outfit && ownedOutfit) {
    const value = getEffectivePerkValue(outfit, ownedOutfit.stars);
    switch (outfit.perk.type) {
      case "feverRate":
        overdriveRateBonus += value;
        break;
      case "feverDuration":
        overdriveDurationBonusSeconds += value;
        break;
      case "perfectWindow":
        perfectWindowBonus += value;
        break;
      case "scoreFlat":
        scoreFlatBonus += value;
        break;
      case "scoreMult":
        scoreMultBonus += value;
        break;
      case "comboBonus":
        comboBonus += value;
        break;
      case "comboShield":
        hasComboShield = value > 0;
        break;
    }
  }

  const shipHp = BASE_SHMUP_HP + (ship?.modifiers.maxHp ?? 0);
  const shipSpeed = BASE_SHMUP_SPEED * (1 + (ship?.modifiers.moveSpeedPct ?? 0) / 100);
  const overdriveFillMultiplier = 1 + overdriveRateBonus / 100;
  const overdriveDurationMs = BASE_OVERDRIVE_DURATION_MS + overdriveDurationBonusSeconds * 1000;
  const hitboxScale = Math.max(0.55, 1 - perfectWindowBonus / 100);

  const multiplierParts = [
    scoreMultBonus > 0 ? `${formatPercent(scoreMultBonus)} passive mult` : null,
    comboBonus > 0 ? `${formatPercent(comboBonus)} chain growth` : null,
    scoreFlatBonus > 0 ? `+${scoreFlatBonus} flat score` : null,
  ].filter(Boolean);

  const systemsParts = [
    `${Math.round(shipSpeed)} speed`,
    `${Math.round(overdriveFillMultiplier * 100)}% OD fill`,
    `${(overdriveDurationMs / 1000).toFixed(0)}s OD uptime`,
  ];

  const survivabilityParts = [
    `${shipHp} HP frame`,
    hitboxScale < 1 ? `${Math.round((1 - hitboxScale) * 100)}% tighter hitbox` : null,
    hasComboShield ? "combo shield online" : null,
  ].filter(Boolean);

  return {
    shipHp,
    shipSpeed,
    overdriveFillMultiplier,
    overdriveDurationMs,
    hitboxScale,
    scoreFlatBonus,
    scoreMultBonus,
    comboBonus,
    hasComboShield,
    identityLine: ship ? `${ship.name} / ${ship.trait.label}` : "No ship selected",
    multiplierLine: multiplierParts.join(" / ") || "No multiplier bonus",
    systemsLine: systemsParts.join(" / "),
    survivabilityLine: survivabilityParts.join(" / "),
  };
}
