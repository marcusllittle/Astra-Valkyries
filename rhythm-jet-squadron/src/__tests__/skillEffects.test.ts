/**
 * The skill trees described 36 nodes that nothing read. These tests exist
 * to make sure that cannot come back: every node must move at least one
 * number the sim consumes, and the numbers must compose sanely.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PILOT_SKILL_TREES, getSkillTree } from "../data/skillTrees";
import {
  combineSkillEffects,
  NEUTRAL_SKILL_EFFECTS,
  type SkillEffects,
} from "../lib/skillEffects";

const ALL_NODES = PILOT_SKILL_TREES.flatMap((tree) =>
  tree.nodes.map((node) => ({ pilotId: tree.pilotId, node })),
);

function differsFromNeutral(effects: SkillEffects): (keyof SkillEffects)[] {
  return (Object.keys(NEUTRAL_SKILL_EFFECTS) as (keyof SkillEffects)[]).filter(
    (key) => effects[key] !== NEUTRAL_SKILL_EFFECTS[key],
  );
}

describe("skill effects", () => {
  it("covers every node in every tree", () => {
    expect(ALL_NODES).toHaveLength(36);
  });

  it("every single node changes something the sim reads", () => {
    // This is the whole point. A node that leaves the bundle neutral is a
    // control that looks like it works and does not.
    const inert = ALL_NODES.filter(({ pilotId, node }) => {
      const effects = combineSkillEffects(pilotId, [node.id]);
      return differsFromNeutral(effects).length === 0;
    }).map(({ node }) => `${node.id} (${node.name})`);

    expect(
      inert,
      `These skill nodes are purely decorative:\n${inert.join("\n")}`,
    ).toEqual([]);
  });

  it("no node quietly makes the player worse, except where its name says so", () => {
    // rex_f4 "Titanium Core" is +2 HP, -5% speed. That trade is in the
    // node's own description, so it is allowed to cost something.
    const declaredTradeoffs = new Set(["rex_f4"]);

    for (const { pilotId, node } of ALL_NODES) {
      if (declaredTradeoffs.has(node.id)) continue;
      const e = combineSkillEffects(pilotId, [node.id]);
      expect(e.moveSpeedMult, `${node.id} slowed the ship`).toBeGreaterThanOrEqual(1);
      expect(e.damageMult, `${node.id} cut damage`).toBeGreaterThanOrEqual(1);
      expect(e.bonusHp, `${node.id} removed HP`).toBeGreaterThanOrEqual(0);
    }
  });

  it("declared tradeoffs are actually charged", () => {
    const e = combineSkillEffects("pilot_rex", ["rex_f4"]);
    expect(e.bonusHp).toBe(2);
    expect(e.moveSpeedMult).toBeCloseTo(0.95);
  });

  // -- composition -------------------------------------------------------

  it("returns neutral effects for no skills", () => {
    expect(combineSkillEffects("pilot_nova", [])).toEqual(NEUTRAL_SKILL_EFFECTS);
    expect(combineSkillEffects("pilot_nova", undefined)).toEqual(NEUTRAL_SKILL_EFFECTS);
    expect(combineSkillEffects(null, ["nova_v1"])).toEqual(NEUTRAL_SKILL_EFFECTS);
  });

  it("ignores unknown node ids instead of throwing", () => {
    // A save from an older build can name a node that no longer exists.
    expect(combineSkillEffects("pilot_nova", ["nope", "nova_v1"]).grazeOverdriveGain)
      .toBe(4);
  });

  it("ignores nodes belonging to a different pilot", () => {
    expect(combineSkillEffects("pilot_nova", ["rex_a1"])).toEqual(NEUTRAL_SKILL_EFFECTS);
  });

  it("does not double-apply a duplicated id", () => {
    const once = combineSkillEffects("pilot_nova", ["nova_v1"]);
    const twice = combineSkillEffects("pilot_nova", ["nova_v1", "nova_v1"]);
    expect(twice).toEqual(once);
  });

  it("stacks Nova's crit-chance nodes additively from tier 0", () => {
    // Target Lock (+6%) then Weak Points (+10%): crit identity starts
    // immediately instead of tier 1.
    const e = combineSkillEffects("pilot_nova", ["nova_p1", "nova_p2"]);
    expect(e.critChance).toBeCloseTo(0.16);
  });

  it("keeps crit chance in range even if every crit node stacks", () => {
    const e = combineSkillEffects("pilot_nova", ["nova_p2", "nova_p4"]);
    expect(e.critChance).toBeGreaterThan(0);
    expect(e.critChance).toBeLessThanOrEqual(1);
    expect(e.critDamageMult).toBeCloseTo(1.75);
  });

  // -- the redesigned kits ------------------------------------------------
  // Nova Velocity/Instinct, Rex Arsenal/Fortify/Ordnance and Yuki
  // Stealth/Technician were rewritten from flat stat buffs into mechanics.
  // These lock down the values the sim actually keys off.

  it("Nova Velocity: grazes charge overdrive, then add speed and damage bursts", () => {
    expect(combineSkillEffects("pilot_nova", ["nova_v1"]).grazeOverdriveGain).toBe(4);
    const e = combineSkillEffects("pilot_nova", ["nova_v1", "nova_v2", "nova_v3"]);
    expect(e.grazeSpeedBurstMs).toBeGreaterThan(0);
    expect(e.grazeSpeedBurstMult).toBeGreaterThan(1);
    expect(e.grazeDamageBurstMs).toBeGreaterThan(0);
    expect(e.grazeDamageBurstMult).toBeGreaterThan(1);
  });

  it("Nova Precision: Armor Piercing grants bonus pierce, not more flat damage", () => {
    const e = combineSkillEffects("pilot_nova", ["nova_p3"]);
    expect(e.critBonusPierce).toBe(1);
    expect(e.damageMult).toBe(1);
  });

  it("Nova Instinct: overdrive activation clears bullets, streak kills feed the meter", () => {
    const e = combineSkillEffects("pilot_nova", ["nova_i1", "nova_i2"]);
    expect(e.overdriveActivationClearRadius).toBeGreaterThan(0);
    expect(e.streakKillOverdriveGain).toBeGreaterThan(0);
  });

  it("Rex Arsenal: Kill Momentum stacks additively and Overcharged relieves cooldown", () => {
    const oneNode = combineSkillEffects("pilot_rex", ["rex_a1"]);
    expect(oneNode.killFireRateMaxStacks).toBe(1);
    const stacked = combineSkillEffects("pilot_rex", ["rex_a1", "rex_a3"]);
    expect(stacked.killFireRateMaxStacks).toBe(3);
    expect(combineSkillEffects("pilot_rex", ["rex_a2"]).killSecondaryCooldownReliefMs).toBeGreaterThan(0);
  });

  it("Rex Fortify: the free shield's cadence is shorter-wins, not summed", () => {
    const shieldOnly = combineSkillEffects("pilot_rex", ["rex_f2"]);
    expect(shieldOnly.shieldPulseIntervalMs).toBe(34_000);
    const faster = combineSkillEffects("pilot_rex", ["rex_f2", "rex_f3"]);
    expect(faster.shieldPulseIntervalMs).toBe(22_000);
  });

  it("Rex Ordnance: Cluster Munitions is an honest chain-length bonus, not a hidden damage buff", () => {
    const e = combineSkillEffects("pilot_rex", ["rex_o3"]);
    expect(e.detonationChainBonusLinks).toBe(2);
    expect(e.secondaryDamageMult).toBe(1);
    expect(e.secondaryRadiusMult).toBe(1);
  });

  it("Yuki Stealth: Cold Focus rewards flying clean, not a fake positional bonus", () => {
    const e = combineSkillEffects("pilot_yuki", ["yuki_s3"]);
    expect(e.flawlessWindowMs).toBeGreaterThan(0);
    expect(e.flawlessDamageMult).toBeGreaterThan(1);
    expect(e.damageMult).toBe(1);
  });

  it("Yuki Technician: Intel Override shows enemy HP for real, and still pays its score bonus", () => {
    const e = combineSkillEffects("pilot_yuki", ["yuki_t4"]);
    expect(e.showEnemyHealthBars).toBe(true);
    expect(e.scoreMult).toBeCloseTo(0.25);
  });

  // -- the mislabelled nodes --------------------------------------------

  it("routes the nodes whose declared type contradicts their text", () => {
    // Each of these would silently pay the wrong stat if mapped by type.
    expect(combineSkillEffects("pilot_yuki", ["yuki_t1"]).dropRateMult).toBeCloseTo(1.2);
    expect(combineSkillEffects("pilot_yuki", ["yuki_t1"]).scoreMult).toBe(0);

    expect(combineSkillEffects("pilot_rex", ["rex_o1"]).secondaryDamageMult).toBeCloseTo(1.2);
    expect(combineSkillEffects("pilot_rex", ["rex_o1"]).damageMult).toBe(1);

    expect(combineSkillEffects("pilot_rex", ["rex_a4"]).bossDamageMult).toBeCloseTo(1.2);
    expect(combineSkillEffects("pilot_rex", ["rex_a4"]).damageMult).toBe(1);

    expect(combineSkillEffects("pilot_nova", ["nova_i3"]).overdriveFireRateMult).toBeCloseTo(1.15);
    expect(combineSkillEffects("pilot_nova", ["nova_i3"]).fireRateMult).toBe(1);

    expect(combineSkillEffects("pilot_nova", ["nova_i4"]).overdriveDurationMult).toBeCloseTo(1.25);
    expect(combineSkillEffects("pilot_nova", ["nova_i4"]).overdriveFillMult).toBe(1);
  });

  // -- slows compose toward zero, never past it -------------------------

  it("stacked slows multiply rather than summing past a standstill", () => {
    const e = combineSkillEffects("pilot_yuki", ["yuki_c1"]);
    expect(e.passiveEnemyTimeScale).toBeGreaterThan(0);
    expect(e.passiveEnemyTimeScale).toBeLessThan(1);
  });

  // -- tree integrity ----------------------------------------------------

  it("every prerequisite points at a node in the same tree", () => {
    for (const tree of PILOT_SKILL_TREES) {
      const ids = new Set(tree.nodes.map((n) => n.id));
      for (const node of tree.nodes) {
        if (!node.prerequisite) continue;
        expect(ids.has(node.prerequisite), `${node.id} -> ${node.prerequisite}`).toBe(true);
      }
    }
  });

  it("the sim reads every field the bundle produces", () => {
    // Computing an effect that no sim site consumes is the exact bug this
    // whole change fixes. buildModifiers renames two fields on the way
    // through, so those are checked under their sim-side names.
    const sim = readFileSync(
      fileURLToPath(new URL("../screens/ShmupPlayScreen.tsx", import.meta.url)),
      "utf8",
    );
    // Fields folded straight into the loadout inside buildModifiers. These
    // are consumed at the fold, so they are checked as `skills.<name>`.
    const foldedIntoLoadout = new Set([
      "moveSpeedMult",
      "bonusHp",
      "damageMult",
      "scoreMult",
      "overdriveFillMult",
      "overdriveDurationMult",
      "enemyBulletSpeedMult",
      "secondaryBonusCharges",
      "fireRateMult",
      "overdriveFireRateMult",
    ]);

    // Everything else is passed through and must be referenced in the sim
    // body. Searching only after the destructure means a field that is
    // merely declared on the interface cannot make this pass.
    const bodyStart = sim.indexOf("} = modifiers;");
    expect(bodyStart, "destructure marker moved; update this test").toBeGreaterThan(0);
    const simBody = sim.slice(bodyStart + "} = modifiers;".length);

    // Every passthrough field appears once in the effect's dependency
    // array, which lives in the body too. So one mention proves nothing —
    // a real use site means at least two. Verified by deleting a use site
    // and watching this fail.
    const countIn = (text: string, name: string) =>
      text.match(new RegExp(`\\b${name}\\b`, "g"))?.length ?? 0;

    const unread = (Object.keys(NEUTRAL_SKILL_EFFECTS) as (keyof SkillEffects)[]).filter((key) =>
      foldedIntoLoadout.has(key)
        ? !sim.includes(`skills.${key}`)
        : countIn(simBody, key) < 2,
    );

    expect(
      unread,
      `These skill effects are computed but never read by the sim:\n${unread.join("\n")}`,
    ).toEqual([]);
  });

  it("every tree has a real pilot and unique node ids", () => {
    const seen = new Set<string>();
    for (const tree of PILOT_SKILL_TREES) {
      expect(getSkillTree(tree.pilotId)).toBeDefined();
      for (const node of tree.nodes) {
        expect(seen.has(node.id), `duplicate node id ${node.id}`).toBe(false);
        seen.add(node.id);
      }
    }
  });
});
