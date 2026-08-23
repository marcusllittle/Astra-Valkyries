import { describe, expect, it } from "vitest";
import {
  GRAZE_CHAIN_MULTIPLIER_CAP,
  GRAZE_CHAIN_TIMEOUT_MS,
  grazeReward,
} from "../lib/masteryScoring";

describe("graze mastery scoring", () => {
  it("starts and continues a chain inside the timing window", () => {
    expect(grazeReward(0, 0, 500)).toMatchObject({ chain: 1, score: 30 });
    expect(grazeReward(1, 500, 500 + GRAZE_CHAIN_TIMEOUT_MS)).toMatchObject({
      chain: 2,
      score: 30,
    });
  });

  it("resets the chain after the timing window", () => {
    expect(grazeReward(8, 500, 501 + GRAZE_CHAIN_TIMEOUT_MS).chain).toBe(1);
  });

  it("raises the reward every five chained grazes", () => {
    expect(grazeReward(4, 500, 600)).toMatchObject({ chain: 5, chainMultiplier: 1 });
    expect(grazeReward(5, 500, 600)).toMatchObject({ chain: 6, chainMultiplier: 1.2 });
  });

  it("caps chain scaling", () => {
    expect(grazeReward(100, 500, 600).chainMultiplier).toBe(GRAZE_CHAIN_MULTIPLIER_CAP);
  });

  it("applies combat and run score multipliers", () => {
    expect(grazeReward(0, 0, 500, 2, 1.5).score).toBe(90);
  });

  it("sanitizes invalid chain and multiplier inputs", () => {
    expect(grazeReward(Number.NaN, Number.NaN, Number.NaN, -2, Number.NaN)).toEqual({
      chain: 1,
      chainMultiplier: 1,
      score: 0,
      overdrive: 0.6,
    });
  });
});
