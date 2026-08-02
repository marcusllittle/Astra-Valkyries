/**
 * Mouse control must not turn the speed stats into decoration.
 *
 * The obvious implementation — ship position = cursor position — would
 * never read shipSpeed. Every ship's speed modifier and three skill nodes
 * (Quick Thrusters +5%, Afterburner +10%, Ghost Step +3%) would keep
 * displaying their numbers in the Hangar and the Skills screen while
 * changing nothing in a run. That is the exact bug class this codebase
 * keeps producing, so the guard against it is a test rather than a comment.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { followStep, toCanvasPoint } from "../lib/shmupInput";

const ORIGIN = { x: 0, y: 0 };

describe("followStep", () => {
  it("moves toward the target", () => {
    const next = followStep(ORIGIN, { x: 100, y: 0 }, 50, 1);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(100);
  });

  // -- the load-bearing property ----------------------------------------

  it("a faster ship covers more ground in the same frame", () => {
    const slow = followStep(ORIGIN, { x: 1000, y: 0 }, 100, 0.016);
    const fast = followStep(ORIGIN, { x: 1000, y: 0 }, 200, 0.016);
    expect(fast.x).toBeGreaterThan(slow.x);
  });

  it("speed scales the step linearly, so a +5% node is worth 5%", () => {
    const base = followStep(ORIGIN, { x: 1000, y: 0 }, 100, 0.016);
    const buffed = followStep(ORIGIN, { x: 1000, y: 0 }, 105, 0.016);
    expect(buffed.x / base.x).toBeCloseTo(1.05, 5);
  });

  it("never exceeds speed * dt, so the cursor cannot teleport the ship", () => {
    // Cursor flicked to the far corner in one frame.
    const next = followStep(ORIGIN, { x: 5000, y: 5000 }, 300, 0.016);
    const travelled = Math.hypot(next.x, next.y);
    expect(travelled).toBeCloseTo(300 * 0.016, 5);
  });

  // -- settling ----------------------------------------------------------

  it("lands exactly on the cursor when it is within reach", () => {
    // Remaining distance (3,4)=5 is under the 100*0.016=1.6 budget? No —
    // give it a budget that clearly covers the gap.
    const next = followStep(ORIGIN, { x: 3, y: 4 }, 1000, 0.016);
    expect(next).toEqual({ x: 3, y: 4 });
  });

  it("does not oscillate once it has arrived", () => {
    const target = { x: 42, y: 42 };
    const first = followStep(target, target, 500, 0.016);
    const second = followStep(first, target, 500, 0.016);
    expect(first).toEqual(target);
    expect(second).toEqual(target);
  });

  // -- degenerate input --------------------------------------------------

  it("holds position on a zero-length frame", () => {
    expect(followStep({ x: 10, y: 10 }, { x: 900, y: 900 }, 300, 0)).toEqual({
      x: 10,
      y: 10,
    });
  });

  it("holds position at zero speed rather than snapping", () => {
    // A hypothetical 0-speed run must not become teleportation.
    expect(followStep({ x: 10, y: 10 }, { x: 900, y: 900 }, 0, 0.016)).toEqual({
      x: 10,
      y: 10,
    });
  });

  it("tolerates negative speed and dt without producing NaN", () => {
    const next = followStep({ x: 5, y: 5 }, { x: 90, y: 90 }, -50, -1);
    expect(Number.isFinite(next.x)).toBe(true);
    expect(Number.isFinite(next.y)).toBe(true);
  });
});

describe("toCanvasPoint", () => {
  it("maps client coordinates into canvas space", () => {
    const rect = { left: 0, top: 0, width: 800, height: 600 };
    expect(toCanvasPoint(400, 300, rect, 800, 600)).toEqual({ x: 400, y: 300 });
  });

  it("accounts for a canvas whose backing store is larger than its box", () => {
    // A 2x DPR canvas: the ship would track a cursor at half the real
    // position without this.
    const rect = { left: 0, top: 0, width: 800, height: 600 };
    expect(toCanvasPoint(400, 300, rect, 1600, 1200)).toEqual({ x: 800, y: 600 });
  });

  it("accounts for the canvas being offset in the page", () => {
    const rect = { left: 100, top: 50, width: 800, height: 600 };
    expect(toCanvasPoint(500, 350, rect, 800, 600)).toEqual({ x: 400, y: 300 });
  });

  it("does not divide by zero before layout", () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    const point = toCanvasPoint(10, 10, rect, 800, 600);
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
  });
});

describe("the sim actually uses the speed-capped path", () => {
  it("mouse movement goes through followStep with shipSpeed", () => {
    // Guards against someone later 'simplifying' this to a direct
    // assignment of the cursor position, which is what kills the stats.
    const sim = readFileSync(
      fileURLToPath(new URL("../screens/ShmupPlayScreen.tsx", import.meta.url)),
      "utf8",
    );
    expect(sim).toMatch(/followStep\(/);
    const call = sim.slice(sim.indexOf("followStep("), sim.indexOf("followStep(") + 220);
    expect(call, "followStep must be passed shipSpeed, not a constant").toMatch(
      /shipSpeed/,
    );
  });

  it("touch devices are excluded from mouse steering", () => {
    const sim = readFileSync(
      fileURLToPath(new URL("../screens/ShmupPlayScreen.tsx", import.meta.url)),
      "utf8",
    );
    expect(sim).toMatch(/controlScheme === "mouse" && !showTouchControls/);
  });
});
