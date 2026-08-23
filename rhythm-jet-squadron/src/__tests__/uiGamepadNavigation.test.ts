import { describe, expect, it } from "vitest";
import type { GamepadButtonLike, GamepadLike } from "../lib/gamepadInput";
import {
  findDirectionalTarget,
  readUiGamepad,
  type NavigationRect,
} from "../lib/uiGamepadNavigation";

function gamepad(overrides: Partial<GamepadLike> = {}): GamepadLike {
  return {
    connected: true,
    index: 0,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
    ...overrides,
  };
}

function withButton(index: number): GamepadLike {
  const input = gamepad();
  (input.buttons as GamepadButtonLike[])[index] = { pressed: true, value: 1 };
  return input;
}

function rect(left: number, top: number, width = 100, height = 40): NavigationRect {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

describe("UI gamepad navigation", () => {
  it("maps standard face, back, and start buttons", () => {
    expect(readUiGamepad(withButton(0)).confirmPressed).toBe(true);
    expect(readUiGamepad(withButton(1)).backPressed).toBe(true);
    expect(readUiGamepad(withButton(9)).startPressed).toBe(true);
  });

  it("ignores stick drift and uses the dominant axis", () => {
    expect(readUiGamepad(gamepad({ axes: [0.2, -0.3] })).direction).toBeNull();
    expect(readUiGamepad(gamepad({ axes: [0.8, -0.6] })).direction).toBe("right");
    expect(readUiGamepad(gamepad({ axes: [0.4, -0.9] })).direction).toBe("up");
  });

  it("moves through a horizontal row by geometry", () => {
    const items = [rect(0, 0), rect(120, 0), rect(240, 0)];
    expect(findDirectionalTarget(items, 1, "left")).toBe(0);
    expect(findDirectionalTarget(items, 1, "right")).toBe(2);
  });

  it("prefers the aligned target in a grid", () => {
    const items = [rect(0, 0), rect(120, 0), rect(0, 80), rect(120, 80)];
    expect(findDirectionalTarget(items, 0, "down")).toBe(2);
    expect(findDirectionalTarget(items, 0, "right")).toBe(1);
  });

  it("wraps to the opposite edge when a row ends", () => {
    const items = [rect(0, 0), rect(120, 0), rect(240, 0)];
    expect(findDirectionalTarget(items, 2, "right")).toBe(0);
    expect(findDirectionalTarget(items, 0, "left")).toBe(2);
  });
});
