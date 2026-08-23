import { describe, expect, it } from "vitest";
import {
  FLAWLESS_ROUTE_OVERDRIVE,
  flawlessRouteReward,
  isFlawlessRoute,
} from "../lib/tacticalObjectives";

describe("flawless route objective", () => {
  it("requires the damage counter to remain unchanged", () => {
    expect(isFlawlessRoute(2, 2)).toBe(true);
    expect(isFlawlessRoute(2, 3)).toBe(false);
  });

  it("rewards consecutive clean deployments with a bounded streak bonus", () => {
    expect(flawlessRouteReward(0, 0, 1)).toEqual({
      score: 1_000,
      overdrive: FLAWLESS_ROUTE_OVERDRIVE,
      streak: 1,
    });
    expect(flawlessRouteReward(1, 0, 1).score).toBe(1_250);
    expect(flawlessRouteReward(99, 0, 1).score).toBe(2_250);
  });

  it("respects later-loop pressure and run score modifiers", () => {
    expect(flawlessRouteReward(0, 2, 1.5).score).toBe(2_100);
    expect(flawlessRouteReward(0, 0, 0.5).score).toBe(500);
  });
});
