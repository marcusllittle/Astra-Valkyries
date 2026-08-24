import { describe, expect, it } from "vitest";
import {
  createBossArmStates,
  damageBossArm,
  findNearestBossTarget,
  getBossArmHealthRatio,
  getBossHomeY,
  getBossPartLayout,
  hitTestBossParts,
} from "../lib/bossEncounter";

describe("segmented boss encounter", () => {
  it("keeps the Goliath framed on a short mobile landscape", () => {
    const layout = getBossPartLayout({
      archetype: "dreadnought",
      x: 422,
      y: 64,
      radius: 58,
      canvasWidth: 844,
      canvasHeight: 250,
      displayScale: 250 / 540,
      mobile: true,
    });

    const totalWidth =
      layout.rightArm.x + layout.rightArm.radiusX -
      (layout.leftArm.x - layout.leftArm.radiusX);
    expect(layout.bodyHeight).toBeLessThanOrEqual(100);
    expect(totalWidth).toBeLessThan(844 * 0.36);
    expect(totalWidth).toBeGreaterThan(layout.bodyWidth * 1.45);
    expect(getBossHomeY(250, layout.bodyHeight, true)).toBeLessThan(76);
  });

  it("targets the core and both independent arms", () => {
    const arms = createBossArmStates(620);
    const layout = getBossPartLayout({
      archetype: "dreadnought",
      x: 640,
      y: 128,
      radius: 58,
      canvasWidth: 1280,
      canvasHeight: 540,
      displayScale: 1,
      mobile: false,
    });

    expect(hitTestBossParts(layout, arms, layout.leftArm.x, layout.leftArm.y)).toBe("leftArm");
    expect(hitTestBossParts(layout, arms, layout.core.x, layout.core.y)).toBe("core");
    expect(hitTestBossParts(layout, arms, layout.rightArm.x, layout.rightArm.y)).toBe("rightArm");
  });

  it("stops targeting a destroyed arm", () => {
    const arms = createBossArmStates(620);
    const layout = getBossPartLayout({
      archetype: "tyrant",
      x: 640,
      y: 128,
      radius: 54,
      canvasWidth: 1280,
      canvasHeight: 540,
      displayScale: 1,
      mobile: false,
    });
    arms.left.destroyed = true;
    arms.left.hp = 0;

    expect(getBossArmHealthRatio(arms.left)).toBe(0);
    expect(hitTestBossParts(layout, arms, layout.leftArm.x, layout.leftArm.y)).toBeNull();
    expect(findNearestBossTarget(layout, arms, layout.leftArm.x, layout.leftArm.y, 500)).not.toEqual({
      x: layout.leftArm.x,
      y: layout.leftArm.y,
    });
  });

  it("severs an arm only when its own health is exhausted", () => {
    const arms = createBossArmStates(620);

    expect(damageBossArm(arms.left, arms.left.maxHp - 1)).toBe(false);
    expect(arms.left.destroyed).toBe(false);
    expect(damageBossArm(arms.left, 1)).toBe(true);
    expect(arms.left).toMatchObject({ hp: 0, destroyed: true, detachAge: 0 });
    expect(arms.right.destroyed).toBe(false);
  });
});
