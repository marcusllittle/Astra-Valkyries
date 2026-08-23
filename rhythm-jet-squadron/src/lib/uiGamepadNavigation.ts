import type { GamepadLike } from "./gamepadInput";

export type UiNavigationDirection = "up" | "down" | "left" | "right";

export interface UiGamepadInput {
  connected: boolean;
  direction: UiNavigationDirection | null;
  confirmPressed: boolean;
  backPressed: boolean;
  startPressed: boolean;
}

export interface NavigationRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export const EMPTY_UI_GAMEPAD_INPUT: UiGamepadInput = {
  connected: false,
  direction: null,
  confirmPressed: false,
  backPressed: false,
  startPressed: false,
};

const UI_STICK_THRESHOLD = 0.55;

function buttonPressed(gamepad: GamepadLike, index: number): boolean {
  const button = gamepad.buttons[index];
  return Boolean(button && (button.pressed || button.value >= 0.5));
}

export function readUiGamepad(gamepad?: GamepadLike | null): UiGamepadInput {
  if (!gamepad?.connected) return { ...EMPTY_UI_GAMEPAD_INPUT };

  const axisX = gamepad.axes[0] ?? 0;
  const axisY = gamepad.axes[1] ?? 0;
  const horizontal = (buttonPressed(gamepad, 15) || axisX >= UI_STICK_THRESHOLD ? 1 : 0)
    - (buttonPressed(gamepad, 14) || axisX <= -UI_STICK_THRESHOLD ? 1 : 0);
  const vertical = (buttonPressed(gamepad, 13) || axisY >= UI_STICK_THRESHOLD ? 1 : 0)
    - (buttonPressed(gamepad, 12) || axisY <= -UI_STICK_THRESHOLD ? 1 : 0);

  let direction: UiNavigationDirection | null = null;
  if (horizontal !== 0 || vertical !== 0) {
    if (Math.abs(axisX) > Math.abs(axisY) || (horizontal !== 0 && vertical === 0)) {
      direction = horizontal > 0 ? "right" : "left";
    } else {
      direction = vertical > 0 ? "down" : "up";
    }
  }

  return {
    connected: true,
    direction,
    confirmPressed: buttonPressed(gamepad, 0),
    backPressed: buttonPressed(gamepad, 1),
    startPressed: buttonPressed(gamepad, 9),
  };
}

function center(rect: NavigationRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function findDirectionalTarget(
  rects: readonly NavigationRect[],
  currentIndex: number,
  direction: UiNavigationDirection,
): number | null {
  const current = rects[currentIndex];
  if (!current || rects.length < 2) return null;
  const origin = center(current);
  let bestIndex: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  rects.forEach((rect, index) => {
    if (index === currentIndex) return;
    const target = center(rect);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const primary = direction === "left" ? -dx
      : direction === "right" ? dx
        : direction === "up" ? -dy
          : dy;
    if (primary <= 4) return;
    const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 1.8 + Math.hypot(dx, dy) * 0.08;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex !== null) return bestIndex;

  const candidates = rects
    .map((rect, index) => ({ rect, index, point: center(rect) }))
    .filter(({ index }) => index !== currentIndex);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (direction === "down") return a.point.y - b.point.y || Math.abs(a.point.x - origin.x) - Math.abs(b.point.x - origin.x);
    if (direction === "up") return b.point.y - a.point.y || Math.abs(a.point.x - origin.x) - Math.abs(b.point.x - origin.x);
    if (direction === "right") return a.point.x - b.point.x || Math.abs(a.point.y - origin.y) - Math.abs(b.point.y - origin.y);
    return b.point.x - a.point.x || Math.abs(a.point.y - origin.y) - Math.abs(b.point.y - origin.y);
  });
  return candidates[0]?.index ?? null;
}
