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

  // -- Nova: Velocity (graze) ---------------------------------------------
  /** Overdrive meter gained each time a bullet is grazed (passed close
   *  without hitting). */
  grazeOverdriveGain: number;
  /** Duration of the speed burst a graze grants. */
  grazeSpeedBurstMs: number;
  /** Multiplier applied to move speed during a graze speed burst. */
  grazeSpeedBurstMult: number;
  /** Duration of the damage burst a graze grants. */
  grazeDamageBurstMs: number;
  /** Multiplier applied to weapon damage during a graze damage burst. */
  grazeDamageBurstMult: number;

  // -- Nova: Instinct (overdrive) ------------------------------------------
  /** Radius of the bullet-clearing shockwave on overdrive activation. 0 disables it. */
  overdriveActivationClearRadius: number;
  /** Overdrive meter gained per kill while a streak (5+) is active. */
  streakKillOverdriveGain: number;

  // -- Nova: Precision (crit) ----------------------------------------------
  /** Minimum pierce granted to a shot that lands as a critical hit. */
  critBonusPierce: number;

  // -- Rex: Arsenal (kill momentum) ----------------------------------------
  /** Duration of the fire-rate pulse granted per kill. */
  killFireRateBonusMs: number;
  /** Fire-rate multiplier per stack of the kill pulse. */
  killFireRateBonusMult: number;
  /** Maximum stacks the kill pulse can reach. */
  killFireRateMaxStacks: number;
  /** Secondary cooldown shaved off on every kill. */
  killSecondaryCooldownReliefMs: number;

  // -- Rex: Ordnance --------------------------------------------------------
  /** Extra chain links Detonation Chain can reach. */
  detonationChainBonusLinks: number;

  // -- Yuki: Stealth (Cold Focus) -------------------------------------------
  /** How long the ship must go without taking a hit before Cold Focus
   *  activates. 0 disables it. */
  flawlessWindowMs: number;
  /** Damage multiplier while Cold Focus is active. */
  flawlessDamageMult: number;

  // -- Yuki: Technician (Intel Override) ------------------------------------
  /** Draws a health bar under every enemy and the boss. */
  showEnemyHealthBars: boolean;
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
  grazeOverdriveGain: 0,
  grazeSpeedBurstMs: 0,
  grazeSpeedBurstMult: 1,
  grazeDamageBurstMs: 0,
  grazeDamageBurstMult: 1,
  overdriveActivationClearRadius: 0,
  streakKillOverdriveGain: 0,
  critBonusPierce: 0,
  killFireRateBonusMs: 0,
  killFireRateBonusMult: 1,
  killFireRateMaxStacks: 0,
  killSecondaryCooldownReliefMs: 0,
  detonationChainBonusLinks: 0,
  flawlessWindowMs: 0,
  flawlessDamageMult: 1,
  showEnemyHealthBars: false,
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
  // Nova — Velocity. Grazing a bullet (passing close without taking the
  // hit) is detected in the sim's collision pass and flagged per-bullet so
  // a slow round lingering in the band only pays out once.
  nova_v1: { grazeOverdriveGain: 4 },
  nova_v2: { grazeSpeedBurstMs: 500, grazeSpeedBurstMult: 1.35 },
  nova_v3: { grazeDamageBurstMs: 450, grazeDamageBurstMult: 1.25 },
  nova_v4: { overdriveInvulnMs: 1000 },
  // Nova — Precision. nova_p1/p2 are plain crit-chance nodes and fall
  // through the generic "crit" case below; only the pierce node is bespoke.
  nova_p3: { critBonusPierce: 1 },
  // Nova — Instinct. Overdrive activation and streak kills both feed the
  // sim's existing overdrive systems rather than adding new ones.
  nova_i1: { overdriveActivationClearRadius: 130 },
  nova_i2: { streakKillOverdriveGain: 3 },
  // Rex — Arsenal. Kill Momentum is one stack counter with one decay
  // timer; Rapid Salvo raises the cap rather than adding a second system.
  rex_a1: { killFireRateBonusMs: 2000, killFireRateBonusMult: 1.12, killFireRateMaxStacks: 1 },
  rex_a2: { killSecondaryCooldownReliefMs: 350 },
  rex_a3: { killFireRateMaxStacks: 2 },
  // Rex — Fortify. Energy Shield now unlocks the free-absorb shield
  // directly (previously gated behind rex_f3); Overcharged Shield just
  // shortens the cadence, and shorter-wins composition (below) means both
  // being unlocked correctly yields the faster interval.
  rex_f2: { shieldPulseIntervalMs: 34_000 },
  rex_f3: { shieldPulseIntervalMs: 22_000 },
  // Rex — Ordnance. secondaryDamageMult/secondaryRadiusMult (rex_o1/rex_o4,
  // via TYPE_OVERRIDES below) are wired into detonationChain and afterburn
  // directly in the sim now, not just the legacy bomb case, so they reach
  // whichever explosive kit he actually has equipped. "Splits into 3" used
  // to just be a bigger single blast; it is an honest chain-length bonus
  // now.
  rex_o2: { secondaryBonusCharges: 1 },
  rex_o3: { detonationChainBonusLinks: 2 },
  rex_o4: { secondaryRadiusMult: 1.5 },
  // Yuki — Stealth. "Damage from behind" was never tracked — every enemy
  // in a vertical shmup faces the player, so the bonus would have been
  // unconditional. Cold Focus rewards sustained clean flying instead,
  // reusing the same "time since last hit" the shield-regen delay depends
  // on.
  yuki_s2: { hitInvulnBonusMs: 500 },
  yuki_s3: { flawlessWindowMs: 3200, flawlessDamageMult: 1.2 },
  // "Phase through bullets" as a longer untouchable window, which is what
  // phasing would amount to against the collision the sim actually runs.
  yuki_s4: { hitInvulnBonusMs: 900 },
  // Yuki — Technician. Intel Override promised "see enemy HP" and never
  // implemented it; it draws a real health bar under every enemy now.
  // Being bespoke means it must carry its own score bonus too, since being
  // listed here skips the generic "score" case entirely.
  yuki_t3: { enemyBulletSpeedMult: 0.9 },
  yuki_t4: { showEnemyHealthBars: true, scoreMult: 0.25 },
  // Yuki — Cryo-Ops
  yuki_c1: { passiveEnemyTimeScale: 0.95 },
  yuki_c2: { slowOnKillMs: 600 },
  yuki_c3: { secondaryFreezeMs: 700 },
  yuki_c4: { overdriveFreezeMs: 2000 },
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
    // Booleans can't flow through the numeric compose loop below; OR them
    // in directly and strip them out so the generic cast stays honest.
    if (special.showEnemyHealthBars) acc.showEnemyHealthBars = true;
    for (const [key, value] of Object.entries(special) as [
      keyof SkillEffects,
      number,
    ][]) {
      if (key === "showEnemyHealthBars") continue;
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
        key === "dropRateMult" ||
        key === "grazeSpeedBurstMult" ||
        key === "grazeDamageBurstMult" ||
        key === "flawlessDamageMult" ||
        key === "killFireRateBonusMult"
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
