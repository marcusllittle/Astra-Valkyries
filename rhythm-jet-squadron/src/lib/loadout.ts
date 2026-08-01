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

export interface PilotStatline {
  /** Axis the perk moves, e.g. "HITBOX". */
  stat: string;
  /** Signed effect as the player sees it, e.g. "-10%". */
  delta: string;
  /** What it means during a run. */
  detail: string;
}

/**
 * Describe a pilot's perk in terms of what it actually changes in combat.
 *
 * Derived by diffing buildShmupLoadout with and without the pilot, so the
 * Hangar cannot drift from the numbers the sim consumes. The Hangar
 * previously showed hand-authored accuracy/rhythm/endurance values that
 * nothing in the game read.
 *
 * The perk `type` keys are legacy rhythm-game names, kept because
 * outfits.json shares the same union. What they really map to:
 *   perfectWindow -> hitbox scale    (tighter hurtbox)
 *   comboBonus    -> chain growth    (score ramp on streaks)
 *   feverDuration -> overdrive time  (longer overdrive window)
 */
export function describePilotPerk(pilot: Pilot | undefined): PilotStatline | null {
  if (!pilot) return null;

  const base = buildShmupLoadout(undefined, undefined, undefined, undefined);
  const withPilot = buildShmupLoadout(pilot, undefined, undefined, undefined);

  switch (pilot.perk.type) {
    case "perfectWindow": {
      const pct = Math.round((1 - withPilot.hitboxScale / base.hitboxScale) * 100);
      return {
        stat: "HITBOX",
        delta: `-${pct}%`,
        detail: "Tighter hurtbox — thread narrower bullet gaps",
      };
    }
    case "comboBonus": {
      const delta = withPilot.comboBonus - base.comboBonus;
      return {
        stat: "CHAIN",
        delta: formatPercent(delta),
        detail: "Faster score-chain growth on kill streaks",
      };
    }
    case "feverDuration": {
      const seconds = Math.round(
        (withPilot.overdriveDurationMs - base.overdriveDurationMs) / 1000,
      );
      return {
        stat: "OVERDRIVE",
        delta: `+${seconds}s`,
        detail: "Longer overdrive window once charged",
      };
    }
    default:
      return null;
  }
}

/**
 * Describe a ship by the modifiers it actually applies, strongest first.
 *
 * The Hangar previously showed hand-authored mobility/firepower scores.
 * Mobility at least tracked moveSpeedPct, but "firepower" was fiction --
 * ships do not affect damage at all; the weapon kit does.
 */
export function describeShipModifiers(ship: Ship | undefined, limit = 3): PilotStatline[] {
  if (!ship) return [];
  const m = ship.modifiers;

  const candidates: Array<PilotStatline & { weight: number }> = [
    {
      stat: "SPEED",
      delta: formatPercent(m.moveSpeedPct ?? 0),
      detail: "Strafe speed against the base frame",
      weight: Math.abs(m.moveSpeedPct ?? 0),
    },
    {
      stat: "HULL",
      delta: `+${m.maxHp ?? 0}`,
      detail: "Extra hit points before the run ends",
      // HP is scarce (base is 5), so a single point outranks small percentages.
      weight: (m.maxHp ?? 0) * 20,
    },
    {
      stat: "SCORE",
      delta: formatPercent(m.scoreMult ?? 0),
      detail: "Passive score multiplier",
      weight: Math.abs(m.scoreMult ?? 0),
    },
    {
      stat: "CHAIN",
      delta: formatPercent(m.comboBonus ?? 0),
      detail: "Score-chain growth on kill streaks",
      weight: Math.abs(m.comboBonus ?? 0),
    },
    {
      stat: "OD FILL",
      delta: formatPercent(m.overdriveRate ?? 0),
      detail: "How fast overdrive charges",
      weight: Math.abs(m.overdriveRate ?? 0),
    },
    {
      stat: "OD TIME",
      delta: `+${m.overdriveDuration ?? 0}s`,
      detail: "How long overdrive stays open",
      weight: (m.overdriveDuration ?? 0) * 10,
    },
  ];

  return candidates
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(({ stat, delta, detail }) => ({ stat, delta, detail }));
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
