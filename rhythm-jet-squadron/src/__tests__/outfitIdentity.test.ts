import { describe, expect, it } from "vitest";
import outfits from "../data/outfits.json";
import { SHMUP_BALANCE, resolveSecondaryKey } from "../lib/shmupBalance";
import { compareOutfitProgression } from "../lib/outfitKits";
import type { Outfit } from "../types";
import { CORE_STARTER_OUTFIT_IDS, ensureCoreStarterOutfits } from "../lib/starterOutfits";

const typedOutfits = outfits as Outfit[];

function outfit(id: string) {
  const found = typedOutfits.find((item) => item.id === id);
  if (!found) throw new Error(`Missing outfit ${id}`);
  return found;
}

describe("outfit combat identity", () => {
  it("keeps the approved first outfits at Common", () => {
    expect(outfit("outfit_02")).toMatchObject({ name: "Neon Vanguard", rarity: "Common" });
    expect(outfit("outfit_09")).toMatchObject({ name: "Frost Nova", rarity: "Common" });
    expect(CORE_STARTER_OUTFIT_IDS).toEqual(["outfit_01", "outfit_02", "outfit_09"]);
  });

  it("adds missing core starters to existing saves without changing ownership progress", () => {
    const migrated = ensureCoreStarterOutfits([
      { outfitId: "outfit_02", stars: 4, shards: 11 },
      { outfitId: "outfit_03", stars: 2, shards: 5 },
    ]);
    expect(migrated.find((item) => item.outfitId === "outfit_02")).toMatchObject({ stars: 4, shards: 11 });
    expect(migrated.find((item) => item.outfitId === "outfit_03")).toMatchObject({ stars: 2, shards: 5 });
    expect(migrated.map((item) => item.outfitId)).toEqual([
      "outfit_02",
      "outfit_03",
      "outfit_01",
      "outfit_09",
    ]);
  });

  it("moves Desert Storm out of Yuki's starter tier while Cloud Walker stays Common", () => {
    expect(outfit("outfit_03")).toMatchObject({ name: "Desert Storm", rarity: "Rare" });
    expect(outfit("outfit_05")).toMatchObject({ name: "Cloud Walker", rarity: "Common" });
    const yukiOrder = typedOutfits
      .filter((item) => item.pilotId === "pilot_yuki")
      .sort(compareOutfitProgression)
      .map((item) => item.name);
    expect(yukiOrder.slice(0, 3)).toEqual(["Frost Nova", "Cloud Walker", "Desert Storm"]);
  });

  it("assigns each redesigned secondary to the intended outfit", () => {
    expect(outfit("outfit_06").shmupKit?.secondary).toBe("shadowPulse");
    expect(outfit("outfit_10").shmupKit?.secondary).toBe("thunderStrike");
    expect(outfit("outfit_14").shmupKit).toMatchObject({
      primary: "void_rake",
      secondary: "chronoLock",
    });
  });

  it("keeps five Shadow Pulse orbs and exactly two Starfall escorts", () => {
    expect(SHMUP_BALANCE.effects.shadowPulseOrbs).toBe(5);
    expect(SHMUP_BALANCE.effects.starfallLances).toBe(2);
    expect(resolveSecondaryKey("shadowPulse")).toBe("shadowPulse");
    expect(resolveSecondaryKey("thunderStrike")).toBe("thunderStrike");
  });
});
