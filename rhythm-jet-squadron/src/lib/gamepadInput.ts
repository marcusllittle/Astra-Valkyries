export const GAMEPAD_STICK_DEADZONE = 0.2;

export interface GamepadButtonLike {
  pressed: boolean;
  value: number;
}

export interface GamepadLike {
  connected: boolean;
  index: number;
  mapping?: string;
  axes: readonly number[];
  buttons: readonly GamepadButtonLike[];
  vibrationActuator?: {
    playEffect: (
      type: "dual-rumble",
      options: {
        duration: number;
        startDelay: number;
        strongMagnitude: number;
        weakMagnitude: number;
      },
    ) => Promise<unknown>;
  } | null;
}

export interface GameplayGamepadInput {
  connected: boolean;
  index: number | null;
  moveX: number;
  moveY: number;
  secondaryPressed: boolean;
  pausePressed: boolean;
  confirmPressed: boolean;
}

export const EMPTY_GAMEPAD_INPUT: GameplayGamepadInput = {
  connected: false,
  index: null,
  moveX: 0,
  moveY: 0,
  secondaryPressed: false,
  pausePressed: false,
  confirmPressed: false,
};

function buttonPressed(gamepad: GamepadLike, index: number): boolean {
  const button = gamepad.buttons[index];
  return Boolean(button && (button.pressed || button.value >= 0.5));
}

export function applyRadialDeadzone(
  rawX: number,
  rawY: number,
  deadzone = GAMEPAD_STICK_DEADZONE,
): { x: number; y: number } {
  const x = Number.isFinite(rawX) ? rawX : 0;
  const y = Number.isFinite(rawY) ? rawY : 0;
  const magnitude = Math.hypot(x, y);
  const safeDeadzone = Math.max(0, Math.min(0.95, deadzone));
  if (magnitude <= safeDeadzone) return { x: 0, y: 0 };

  const clampedMagnitude = Math.min(1, magnitude);
  const remappedMagnitude = (clampedMagnitude - safeDeadzone) / (1 - safeDeadzone);
  return {
    x: (x / magnitude) * remappedMagnitude,
    y: (y / magnitude) * remappedMagnitude,
  };
}

export function readGameplayGamepad(gamepad?: GamepadLike | null): GameplayGamepadInput {
  if (!gamepad?.connected) return { ...EMPTY_GAMEPAD_INPUT };

  const dpadX = (buttonPressed(gamepad, 15) ? 1 : 0) - (buttonPressed(gamepad, 14) ? 1 : 0);
  const dpadY = (buttonPressed(gamepad, 13) ? 1 : 0) - (buttonPressed(gamepad, 12) ? 1 : 0);
  const movement = dpadX !== 0 || dpadY !== 0
    ? applyRadialDeadzone(dpadX, dpadY, 0)
    : applyRadialDeadzone(gamepad.axes[0] ?? 0, gamepad.axes[1] ?? 0);

  return {
    connected: true,
    index: gamepad.index,
    moveX: movement.x,
    moveY: movement.y,
    secondaryPressed: buttonPressed(gamepad, 0) || buttonPressed(gamepad, 7),
    pausePressed: buttonPressed(gamepad, 9),
    confirmPressed: buttonPressed(gamepad, 0),
  };
}

export function findActiveGamepad(
  gamepads: ArrayLike<GamepadLike | null>,
  preferredIndex?: number | null,
): GamepadLike | null {
  const connected = Array.from(gamepads).filter(
    (gamepad): gamepad is GamepadLike => Boolean(gamepad?.connected),
  );
  if (preferredIndex != null) {
    const preferred = connected.find((gamepad) => gamepad.index === preferredIndex);
    if (preferred) return preferred;
  }
  return connected.find((gamepad) => gamepad.mapping === "standard") ?? connected[0] ?? null;
}

export async function rumbleGamepad(
  gamepad: GamepadLike | null,
  duration: number,
  strongMagnitude: number,
  weakMagnitude: number,
): Promise<boolean> {
  const actuator = gamepad?.vibrationActuator;
  if (!actuator) return false;
  try {
    await actuator.playEffect("dual-rumble", {
      duration: Math.max(0, duration),
      startDelay: 0,
      strongMagnitude: Math.max(0, Math.min(1, strongMagnitude)),
      weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
    });
    return true;
  } catch {
    return false;
  }
}
