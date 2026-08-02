/**
 * Fold a pilot's unlocked skill nodes into effects the sim actually reads.
 *
 * `data/skillTrees.ts` has described 36 nodes since it was written, and
 * nothing has ever read them: no screen spent points, and no sim site
 * consumed the result. This is the missing half.
 *
 * Two rules shaped the mapping:
 *
 *   1. Every node maps to a field the sim already applies, or to `crit`,
 *      which is the one new mechanic worth adding (two nodes need it and
 *      it is a multiply at the damage site). Nothing here describes an
 *      effect that no code reads — that is the bug this file fixes, and
 *      re-introducing it would be worse than leaving the trees orphaned.
 *   2. Unknown node ids are ignored rather than throwing, so a save from
 *      an older build with a since-renamed node still loads.
 *
 * The `special` nodes are bespoke by design, so they are mapped
 * explicitly by id in SPECIAL_EFFECTS below rather than by effect type.
 */

import { getSkillTree, type SkillNode } from "../data/skillTrees";

export interface SkillEffects {
  /** Multiplies ship movement speed. */
  moveSpeedMult: number;
  /** Flat max-HP added after loadout and run modifiers. */
  bonusHp: number;
  /** Multiplies all outgoing weapon damage. */
  damageMult: number;
  /** Extra multiplier applied only to boss damage. */
  bossDamageMult: number;
  /** Multiplies fire rate at all times. */
  fireRateMult: number;
  /** Extra fire-rate multiplier that applies only while overdrive is up. */
  overdriveFireRateMult: number;
  /** Added to the score multiplier bonus. */
  scoreMult: number;
  /** Multiplies how fast the overdrive meter fills. */
  overdriveFillMult: number;
  /** Multiplies how long overdrive lasts. */
  overdriveDurationMult: number;
  /** Chance (0–1) for a hit to crit. */
  critChance: number;
  /** Damage multiplier applied on a crit. Meaningless if critChance is 0. */
  critDamageMult: number;
  /** Multiplies incoming enemy bullet speed. Below 1 is a player buff. */
  enemyBulletSpeedMult: number;
  /** Invulnerability granted when overdrive is activated. */
  overdriveInvulnMs: number;
  /** Extra invulnerability added to the window after taking a hit. */
  hitInvulnBonusMs: number;
  /** Extra starting/max charges for a charge-based secondary. */
  secondaryBonusCharges: number;
  /** Multiplies secondary blast radius. */
  secondaryRadiusMult: number;
  /** Multiplies secondary damage. */
  secondaryDamageMult: number;
  /** Enemy time scale applied permanently. Below 1 slows the field. */
  passiveEnemyTimeScale: number;
  /** Freeze duration applied to the field when overdrive is activated. */
  overdriveFreezeMs: number;
  /** Freeze duration added when a secondary detonates. */
  secondaryFreezeMs: number;
  /** Enemy slow window applied on each kill. */
  slowOnKillMs: number;
  /** How often a free absorbing shield regenerates. 0 disables it. */
  shieldPulseIntervalMs: number;
  /** Multiplies pickup drop rate. */
  dropRateMult: number;
}

export const NEUTRAL_SKILL_EFFECTS: SkillEffects = {
  moveSpeedMult: 1,
  bonusHp: 0,
  damageMult: 1,
  bossDamageMult: 1,
  fireRateMult: 1,
  overdriveFireRateMult: 1,
  scoreMult: 0,
  overdriveFillMult: 1,
  overdriveDurationMult: 1,
  critChance: 0,
  critDamageMult: 1.5,
  enemyBulletSpeedMult: 1,
  overdriveInvulnMs: 0,
  hitInvulnBonusMs: 0,
  secondaryBonusCharges: 0,
  secondaryRadiusMult: 1,
  secondaryDamageMult: 1,
  passiveEnemyTimeScale: 1,
  overdriveFreezeMs: 0,
  secondaryFreezeMs: 0,
  slowOnKillMs: 0,
  shieldPulseIntervalMs: 0,
  dropRateMult: 1,
};

/**
 * The bespoke nodes, mapped by id.
 *
 * Every one of these lands on a mechanic the sim already runs: the EMP
 * and crystal secondaries established enemy time-scaling and freezing,
 * `invulnerableUntil` already gates the post-hit window, and charge-based
 * secondaries already carry radius and damage. Nothing new is invented.
 */
const SPECIAL_EFFECTS: Record<string, Partial<SkillEffects>> = {
  // Nova — Velocity
  nova_v4: { overdriveInvulnMs: 1000 },
  // Rex — Ordnance
  rex_o2: { secondaryBonusCharges: 1 },
  // "Bombs split into 3" reads as a bigger, harder-hitting detonation
  // rather than three projectiles: the secondary is a single blast, and
  // splitting it would be a new projectile system, not a skill.
  rex_o3: { secondaryDamageMult: 1.35, secondaryRadiusMult: 1.2 },
  rex_o4: { secondaryRadiusMult: 1.5 },
  // Yuki — Stealth
  yuki_s2: { hitInvulnBonusMs: 500 },
  // "Phase through bullets" as a longer untouchable window, which is what
  // phasing would amount to against the collision the sim actually runs.
  yuki_s4: { hitInvulnBonusMs: 900 },
  // Yuki — Technician
  yuki_t3: { enemyBulletSpeedMult: 0.9 },
  // Yuki — Cryo-Ops
  yuki_c1: { passiveEnemyTimeScale: 0.95 },
  yuki_c2: { slowOnKillMs: 600 },
  yuki_c3: { secondaryFreezeMs: 700 },
  yuki_c4: { overdriveFreezeMs: 2000 },
  // Rex — Fortify. The sim already regenerates shields on a delay; this
  // is that mechanic on a fixed cadence.
  rex_f3: { shieldPulseIntervalMs: 30_000 },
};

/**
 * Nodes whose declared `effect.type` does not describe what they do.
 *
 * `yuki_t1` is typed "score" but its text says drop rate, and shipping it
 * as score would silently pay the player twice for one node.
 */
const TYPE_OVERRIDES: Record<string, (value: number, acc: SkillEffects) => void> = {
  yuki_t1: (value, acc) => {
    acc.dropRateMult *= 1 + value / 100;
  },
  // "+20% bomb damage" is a secondary buff, not a primary-weapon buff.
  rex_o1: (value, acc) => {
    acc.secondaryDamageMult *= 1 + value / 100;
  },
  // "+20% damage to bosses" only.
  rex_a4: (value, acc) => {
    acc.bossDamageMult *= 1 + value / 100;
  },
  // "+15% fire rate in overdrive" only.
  nova_i3: (value, acc) => {
    acc.overdriveFireRateMult *= 1 + value / 100;
  },
  // "+25% overdrive duration", not fill rate.
  nova_i4: (value, acc) => {
    acc.overdriveDurationMult *= 1 + value / 100;
  },
  // "+25% crit damage", not crit chance.
  nova_p4: (value, acc) => {
    acc.critDamageMult += value / 100;
  },
  // "+2 HP, -5% speed" — the cost is in the name, so charge it.
  rex_f4: (value, acc) => {
    acc.bonusHp += value;
    acc.moveSpeedMult *= 0.95;
  },
};

function applyNode(node: SkillNode, acc: SkillEffects): void {
  const override = TYPE_OVERRIDES[node.id];
  if (override) {
    override(node.effect.value, acc);
    return;
  }

  const special = SPECIAL_EFFECTS[node.id];
  if (special) {
    for (const [key, value] of Object.entries(special) as [
      keyof SkillEffects,
      number,
    ][]) {
      // Multiplicative fields compose; additive fields accumulate. The
      // split matters because two slow sources should stack toward zero,
      // not sum past it.
      if (
        key === "moveSpeedMult" ||
        key === "damageMult" ||
        key === "bossDamageMult" ||
        key === "fireRateMult" ||
        key === "overdriveFireRateMult" ||
        key === "overdriveFillMult" ||
        key === "overdriveDurationMult" ||
        key === "enemyBulletSpeedMult" ||
        key === "secondaryRadiusMult" ||
        key === "secondaryDamageMult" ||
        key === "passiveEnemyTimeScale" ||
        key === "dropRateMult"
      ) {
        acc[key] *= value;
      } else if (key === "shieldPulseIntervalMs") {
        // Shorter cadence wins rather than stacking to an absurd rate.
        acc[key] = acc[key] === 0 ? value : Math.min(acc[key], value);
      } else {
        acc[key] += value;
      }
    }
    return;
  }

  const { type, value } = node.effect;
  switch (type) {
    case "speed":
      acc.moveSpeedMult *= 1 + value / 100;
      break;
    case "hp":
      acc.bonusHp += value;
      break;
    case "damage":
      acc.damageMult *= 1 + value / 100;
      break;
    case "firerate":
      acc.fireRateMult *= 1 + value / 100;
      break;
    case "score":
      acc.scoreMult += value / 100;
      break;
    case "overdrive":
      acc.overdriveFillMult *= 1 + value / 100;
      break;
    case "crit":
      acc.critChance = Math.min(1, acc.critChance + value / 100);
      break;
    case "shield":
      acc.shieldPulseIntervalMs =
        acc.shieldPulseIntervalMs === 0 ? 30_000 : acc.shieldPulseIntervalMs;
      break;
    case "special":
      // Unmapped special: deliberately a no-op rather than a guess. The
      // skillTreeCoverage test fails if one ever reaches here.
      break;
  }
}

/**
 * Combine every unlocked node for `pilotId` into one effect bundle.
 *
 * Ids that are not in this pilot's tree are ignored, which covers both a
 * renamed node in an old save and skills unlocked on a different pilot.
 */
export function combineSkillEffects(
  pilotId: string | null | undefined,
  unlockedIds: readonly string[] | undefined,
): SkillEffects {
  const acc: SkillEffects = { ...NEUTRAL_SKILL_EFFECTS };
  if (!pilotId || !unlockedIds?.length) return acc;
  const tree = getSkillTree(pilotId);
  if (!tree) return acc;

  const seen = new Set<string>();
  for (const id of unlockedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const node = tree.nodes.find((n) => n.id === id);
    if (node) applyNode(node, acc);
  }
  return acc;
}

/** Ids of every node this module maps to a real effect. */
export function mappedNodeIds(): Set<string> {
  return new Set([...Object.keys(SPECIAL_EFFECTS), ...Object.keys(TYPE_OVERRIDES)]);
}
