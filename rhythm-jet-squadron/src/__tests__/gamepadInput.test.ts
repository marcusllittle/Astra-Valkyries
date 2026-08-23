import { describe, expect, it, vi } from "vitest";
import {
  applyRadialDeadzone,
  findActiveGamepad,
  readGameplayGamepad,
  rumbleGamepad,
  type GamepadButtonLike,
  type GamepadLike,
} from "../lib/gamepadInput";

function gamepad(overrides: Partial<GamepadLike> = {}): GamepadLike {
  const buttons: GamepadButtonLike[] = Array.from({ length: 18 }, () => ({
    pressed: false,
    value: 0,
  }));
  return {
    connected: true,
    index: 0,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons,
    ...overrides,
  };
}

function setButton(input: GamepadLike, index: number, value = 1): void {
  (input.buttons as GamepadButtonLike[])[index] = {
    pressed: value >= 0.5,
    value,
  };
}

describe("gamepad input", () => {
  it("removes stick drift and remaps useful travel to the full range", () => {
    expect(applyRadialDeadzone(0.08, -0.1)).toEqual({ x: 0, y: 0 });
    expect(applyRadialDeadzone(1, 0)).toEqual({ x: 1, y: 0 });
    expect(applyRadialDeadzone(0.6, 0).x).toBeCloseTo(0.5);
  });

  it("uses the D-pad without allowing diagonal movement to exceed unit speed", () => {
    const input = gamepad();
    setButton(input, 12);
    setButton(input, 15);
    const result = readGameplayGamepad(input);
    expect(result.moveX).toBeCloseTo(Math.SQRT1_2);
    expect(result.moveY).toBeCloseTo(-Math.SQRT1_2);
  });

  it("maps A and right trigger to secondary and Menu to pause", () => {
    const input = gamepad();
    setButton(input, 7, 0.8);
    setButton(input, 9);
    expect(readGameplayGamepad(input)).toMatchObject({
      secondaryPressed: true,
      pausePressed: true,
      confirmPressed: false,
    });
  });

  it("keeps the active pad and otherwise prefers a standard mapping", () => {
    const generic = gamepad({ index: 2, mapping: "" });
    const standard = gamepad({ index: 4 });
    expect(findActiveGamepad([generic, standard], 2)?.index).toBe(2);
    expect(findActiveGamepad([generic, standard])?.index).toBe(4);
  });

  it("uses supported dual-rumble actuators with clamped magnitudes", async () => {
    const playEffect = vi.fn().mockResolvedValue(undefined);
    const input = gamepad({ vibrationActuator: { playEffect } });
    await expect(rumbleGamepad(input, 120, 2, -1)).resolves.toBe(true);
    expect(playEffect).toHaveBeenCalledWith("dual-rumble", {
      duration: 120,
      startDelay: 0,
      strongMagnitude: 1,
      weakMagnitude: 0,
    });
  });
});
