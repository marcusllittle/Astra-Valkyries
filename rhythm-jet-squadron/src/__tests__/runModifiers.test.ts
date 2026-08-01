/**
 * Run modifier combination rules.
 *
 * RUN_MODIFIERS shipped as data with no UI and no sim consumption — six
 * fully-designed modifiers that did nothing. These tests pin the combine
 * math, and the source-level check at the bottom asserts the sim actually
 * reads every effect, so a modifier can never again exist as decoration.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RUN_MODIFIERS,
  NEUTRAL_MODIFIER_EFFECTS,
  combineModifierEffects,
  getModifierById,
  getScoreSwingPercent,
} from "../data/modifiers";

describe("combineModifierEffects", () => {
  it("returns neutral multipliers for no selection", () => {
    expect(combineModifierEffects([])).toEqual(NEUTRAL_MODIFIER_EFFECTS);
    expect(combineModifierEffects(undefined)).toEqual(NEUTRAL_MODIFIER_EFFECTS);
  });

  it("applies a single modifier's declared effects", () => {
    const combined = combineModifierEffects(["double-trouble"]);
    expect(combined.enemyHpMult).toBe(2);
    expect(combined.scoreMult).toBe(2);
    // Untouched axes stay neutral.
    expect(combined.playerHpMult).toBe(1);
    expect(combined.bulletSpeedMult).toBe(1);
  });

  it("multiplies when modifiers stack rather than taking the larger", () => {
    const combined = combineModifierEffects(["double-trouble", "bullet-hell"]);
    expect(combined.scoreMult).toBe(3); // 2.0 * 1.5
    expect(combined.enemyHpMult).toBe(2);
    expect(combined.bulletSpeedMult).toBe(1.5);
  });

  it("is order independent", () => {
    const a = combineModifierEffects(["glass-cannon", "swarm-mode"]);
    const b = combineModifierEffects(["swarm-mode", "glass-cannon"]);
    expect(a).toEqual(b);
  });

  it("ignores unknown ids so a stale save cannot break a run", () => {
    const combined = combineModifierEffects(["not-a-modifier", "relaxed"]);
    expect(combined.enemyHpMult).toBe(0.5);
    expect(combined.scoreMult).toBe(0.5);
  });

  it("keeps a zero-HP modifier at zero for the sim to floor", () => {
    // One Hit Wonder sets playerHpMult 0; the sim clamps to 1 HP.
    expect(combineModifierEffects(["one-hit-wonder"]).playerHpMult).toBe(0);
  });
});

describe("getScoreSwingPercent", () => {
  it("reports no swing for an empty selection", () => {
    expect(getScoreSwingPercent([])).toBe(0);
  });

  it("reports gains and losses", () => {
    expect(getScoreSwingPercent(["double-trouble"])).toBe(100);
    expect(getScoreSwingPercent(["relaxed"])).toBe(-50);
    expect(getScoreSwingPercent(["one-hit-wonder"])).toBe(200);
  });
});

describe("modifier catalogue", () => {
  it("ids are unique and resolvable", () => {
    const ids = RUN_MODIFIERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getModifierById(id)).toBeDefined();
  });

  it("every modifier declares at least one effect", () => {
    for (const mod of RUN_MODIFIERS) {
      expect(Object.keys(mod.effects).length, `${mod.id} has no effects`).toBeGreaterThan(0);
    }
  });

  it("every declared effect is one the combiner understands", () => {
    const known = new Set(Object.keys(NEUTRAL_MODIFIER_EFFECTS));
    for (const mod of RUN_MODIFIERS) {
      for (const key of Object.keys(mod.effects)) {
        expect(known.has(key), `${mod.id} declares unknown effect ${key}`).toBe(true);
      }
    }
  });

  it("every modifier offers the player something", () => {
    // The upside can be score (Double Trouble) or raw power (Glass Cannon's
    // 2x damage). What must not exist is a pure-downside modifier.
    for (const mod of RUN_MODIFIERS) {
      if (mod.category === "fun") continue;
      const e = mod.effects;
      const hasUpside =
        (e.scoreMult ?? 1) > 1 ||
        (e.playerDamageMult ?? 1) > 1 ||
        (e.playerHpMult ?? 1) > 1 ||
        (e.enemyHpMult ?? 1) < 1 ||
        (e.enemySpeedMult ?? 1) < 1;
      expect(hasUpside, `${mod.id} is pure downside with no upside`).toBe(true);
    }
  });

  it("the easy-mode modifier pays for itself with reduced score", () => {
    expect(getScoreSwingPercent(["relaxed"])).toBeLessThan(0);
  });
});

describe("sim consumption", () => {
  // The original bug was data with no consumer. Assert the play screen
  // actually threads every effect through, so deleting a usage fails here.
  const source = readFileSync(
    join(__dirname, "..", "screens", "ShmupPlayScreen.tsx"),
    "utf8",
  );

  it("the play screen builds modifiers from the save", () => {
    expect(source).toContain("combineModifierEffects(save.selectedModifiers)");
  });

  it.each([
    ["runEnemyHpMult"],
    ["runEnemySpeedMult"],
    ["runScoreMult"],
    ["runEnemyBulletSpeedMult"],
    ["runSpawnRateMult"],
  ])("%s is consumed by the sim, not just declared", (field) => {
    // One occurrence is the interface, one the assignment, one the
    // destructure — a real usage means more than those.
    const uses = source.split(field).length - 1;
    expect(uses, `${field} is declared but never applied`).toBeGreaterThan(3);
  });

  it("player damage and HP modifiers reach the loadout", () => {
    expect(source).toContain("runMods.playerDamageMult");
    expect(source).toContain("runMods.playerHpMult");
  });
});
