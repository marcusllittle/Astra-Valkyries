import { describe, expect, it } from "vitest";
import { resolveSecondaryVfx, SECONDARY_VFX_ASSET_PATHS } from "../lib/secondaryVfx";

describe("secondary VFX profiles", () => {
  it("gives each gameplay role an authored visual language", () => {
    expect(resolveSecondaryVfx("novaBurst", "Common", 1).kind).toBe("burst");
    expect(resolveSecondaryVfx("mirrorShield", "Common", 1).kind).toBe("shield");
    expect(resolveSecondaryVfx("chronoLock", "Common", 1).kind).toBe("sigil");
    expect(resolveSecondaryVfx("blinkLance", "Common", 1).kind).toBe("target");
  });

  it("progressively layers and enlarges effects by outfit rarity", () => {
    const profiles = (["Common", "Rare", "SR", "SSR"] as const).map((rarity) =>
      resolveSecondaryVfx("overcharge", rarity, 1),
    );
    expect(profiles.map((profile) => profile.layers)).toEqual([1, 1, 2, 3]);
    expect(profiles[0].scale).toBeLessThan(profiles[1].scale);
    expect(profiles[1].scale).toBeLessThan(profiles[2].scale);
    expect(profiles[2].scale).toBeLessThan(profiles[3].scale);
  });

  it("keeps star polish bounded and exposes every authored asset", () => {
    const oneStar = resolveSecondaryVfx("systemHijack", "SSR", 1);
    const fiveStar = resolveSecondaryVfx("systemHijack", "SSR", 99);
    expect(fiveStar.scale - oneStar.scale).toBeLessThan(0.08);
    expect(Object.keys(SECONDARY_VFX_ASSET_PATHS)).toEqual([
      "secondaryBurst",
      "secondaryShield",
      "secondarySigil",
      "secondaryTarget",
    ]);
  });
});
