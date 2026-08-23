import { describe, expect, it } from "vitest";
import { resolveWeaponVfx, weaponFamilyForPrimary, weaponTierForRarity } from "../lib/weaponVfx";

describe("weapon VFX profiles", () => {
  it("maps primary weapons to distinct authored silhouettes", () => {
    expect(weaponFamilyForPrimary("flare_lance")).toBe("lance");
    expect(weaponFamilyForPrimary("lunar_stream")).toBe("pulse");
    expect(weaponFamilyForPrimary("void_rake")).toBe("blade");
    expect(weaponFamilyForPrimary("homing_missiles")).toBe("missile");
  });

  it("maps every outfit rarity to an increasing VFX tier", () => {
    expect(["Common", "Rare", "SR", "SSR"].map((rarity) => weaponTierForRarity(rarity as "Common" | "Rare" | "SR" | "SSR"))).toEqual([
      "common",
      "rare",
      "sr",
      "ssr",
    ]);
  });

  it("progressively increases tracing and impact treatment", () => {
    const common = resolveWeaponVfx("Common", 1, "standard");
    const rare = resolveWeaponVfx("Rare", 1, "standard");
    const sr = resolveWeaponVfx("SR", 1, "standard");
    const ssr = resolveWeaponVfx("SSR", 1, "standard");
    expect([common.trailLayers, rare.trailLayers, sr.trailLayers, ssr.trailLayers]).toEqual([0, 1, 1, 2]);
    expect(common.impactScale).toBeLessThan(rare.impactScale);
    expect(rare.impactScale).toBeLessThan(sr.impactScale);
    expect(sr.impactScale).toBeLessThan(ssr.impactScale);
  });

  it("uses stars only as a bounded polish increment", () => {
    const oneStar = resolveWeaponVfx("SSR", 1, "starfall_rail");
    const fiveStar = resolveWeaponVfx("SSR", 99, "starfall_rail");
    expect(fiveStar.coreWidthScale).toBeGreaterThan(oneStar.coreWidthScale);
    expect(fiveStar.coreWidthScale - oneStar.coreWidthScale).toBeLessThan(0.11);
    expect(fiveStar.spriteKey).toBe("weapon_lance_ssr");
  });

  it("falls back safely for missing loadout metadata", () => {
    expect(resolveWeaponVfx(undefined, Number.NaN, undefined)).toMatchObject({
      tier: "common",
      family: "pulse",
      spriteKey: "weapon_pulse_common",
      trailLayers: 0,
    });
  });
});
