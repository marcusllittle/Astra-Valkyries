export type BossEncounterArchetype = "dreadnought" | "tyrant" | "leviathan";
export type BossArmSide = "left" | "right";
export type BossPartId = "leftArm" | "core" | "rightArm";

export interface BossArmState {
  hp: number;
  maxHp: number;
  destroyed: boolean;
  detachAge: number;
}

export interface BossArmStates {
  left: BossArmState;
  right: BossArmState;
}

export interface BossPartBounds {
  id: BossPartId;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  muzzleX: number;
  muzzleY: number;
}

export interface BossPartLayout {
  bodyWidth: number;
  bodyHeight: number;
  armExtension: number;
  core: BossPartBounds;
  leftArm: BossPartBounds;
  rightArm: BossPartBounds;
}

interface BossPartLayoutInput {
  archetype: BossEncounterArchetype;
  x: number;
  y: number;
  radius: number;
  canvasWidth: number;
  canvasHeight: number;
  displayScale: number;
  mobile: boolean;
}

const BOSS_ASPECT_RATIOS: Record<BossEncounterArchetype, number> = {
  dreadnought: 832 / 592,
  tyrant: 768 / 736,
  leviathan: 736 / 768,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createBossArmStates(coreMaxHp: number): BossArmStates {
  const armMaxHp = Math.max(60, Math.round(coreMaxHp * 0.24));
  const createArm = (): BossArmState => ({
    hp: armMaxHp,
    maxHp: armMaxHp,
    destroyed: false,
    detachAge: 0,
  });

  return {
    left: createArm(),
    right: createArm(),
  };
}

export function getBossArmHealthRatio(arm: BossArmState): number {
  if (arm.destroyed) return 0;
  return clamp(arm.hp / arm.maxHp, 0, 1);
}

export function getLivingBossArmCount(arms: BossArmStates): number {
  return Number(!arms.left.destroyed) + Number(!arms.right.destroyed);
}

export function damageBossArm(arm: BossArmState, damage: number): boolean {
  if (arm.destroyed || damage <= 0) return false;
  arm.hp = Math.max(0, arm.hp - damage);
  if (arm.hp > 0) return false;
  arm.destroyed = true;
  arm.detachAge = 0;
  return true;
}

export function getBossPartLayout({
  archetype,
  x,
  y,
  radius,
  canvasWidth,
  canvasHeight,
  displayScale,
  mobile,
}: BossPartLayoutInput): BossPartLayout {
  const widthLimit = canvasWidth * (mobile ? 0.25 : 0.3);
  const heightLimit = canvasHeight * (mobile ? 0.4 : 0.48);
  const bodyWidth = Math.max(
    76,
    Math.min(radius * 4.4 * displayScale, widthLimit),
  );
  const bodyHeight = Math.max(
    68,
    Math.min(bodyWidth * BOSS_ASPECT_RATIOS[archetype], heightLimit),
  );
  const armExtension = Math.min(
    canvasWidth * (mobile ? 0.07 : 0.035),
    bodyWidth * 0.46,
  );
  const armOffsetX = bodyWidth * 0.305 + armExtension;
  const coreRadiusX = Math.max(22, Math.min(radius, bodyWidth * 0.23));
  const coreRadiusY = Math.max(
    coreRadiusX * 1.15,
    Math.min(bodyHeight * 0.34, radius * 1.15),
  );
  const armRadiusX = Math.max(18, bodyWidth * 0.17);
  const armRadiusY = Math.max(
    22,
    Math.min(bodyHeight * 0.36, radius * 0.95),
  );

  const makeArm = (side: BossArmSide): BossPartBounds => {
    const direction = side === "left" ? -1 : 1;
    const armX = x + direction * armOffsetX;
    return {
      id: side === "left" ? "leftArm" : "rightArm",
      x: armX,
      y: y + bodyHeight * 0.04,
      radiusX: armRadiusX,
      radiusY: armRadiusY,
      muzzleX: armX + direction * bodyWidth * 0.045,
      muzzleY: y + bodyHeight * 0.36,
    };
  };

  return {
    bodyWidth,
    bodyHeight,
    armExtension,
    core: {
      id: "core",
      x,
      y,
      radiusX: coreRadiusX,
      radiusY: coreRadiusY,
      muzzleX: x,
      muzzleY: y + coreRadiusY * 0.82,
    },
    leftArm: makeArm("left"),
    rightArm: makeArm("right"),
  };
}

export function getBossHomeY(
  canvasHeight: number,
  bodyHeight: number,
  mobile: boolean,
): number {
  if (!mobile) return 128;
  const minimum = bodyHeight * 0.48 + 8;
  const maximum = Math.max(minimum, canvasHeight * 0.3);
  return clamp(canvasHeight * 0.22, minimum, maximum);
}

export function isPointInsideBossPart(
  part: BossPartBounds,
  x: number,
  y: number,
  padding = 0,
): boolean {
  const radiusX = part.radiusX + padding;
  const radiusY = part.radiusY + padding;
  const normalizedX = (x - part.x) / radiusX;
  const normalizedY = (y - part.y) / radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

export function hitTestBossParts(
  layout: BossPartLayout,
  arms: BossArmStates,
  x: number,
  y: number,
  padding = 0,
): BossPartId | null {
  const candidates: BossPartBounds[] = [];
  if (!arms.left.destroyed) candidates.push(layout.leftArm);
  if (!arms.right.destroyed) candidates.push(layout.rightArm);
  candidates.push(layout.core);

  let closest: BossPartBounds | null = null;
  let closestScore = Number.POSITIVE_INFINITY;
  for (const part of candidates) {
    if (!isPointInsideBossPart(part, x, y, padding)) continue;
    const dx = (x - part.x) / (part.radiusX + padding);
    const dy = (y - part.y) / (part.radiusY + padding);
    const score = dx * dx + dy * dy;
    if (score < closestScore) {
      closest = part;
      closestScore = score;
    }
  }
  return closest?.id ?? null;
}

export function findNearestBossTarget(
  layout: BossPartLayout,
  arms: BossArmStates,
  x: number,
  y: number,
  maxRange: number,
): { x: number; y: number } | null {
  const candidates = [
    ...(!arms.left.destroyed ? [layout.leftArm] : []),
    ...(!arms.right.destroyed ? [layout.rightArm] : []),
    layout.core,
  ];
  let closest: BossPartBounds | null = null;
  let closestDistance = maxRange * maxRange;
  for (const part of candidates) {
    const dx = x - part.x;
    const dy = y - part.y;
    const distance = dx * dx + dy * dy;
    if (distance <= closestDistance) {
      closest = part;
      closestDistance = distance;
    }
  }
  return closest ? { x: closest.x, y: closest.y } : null;
}
