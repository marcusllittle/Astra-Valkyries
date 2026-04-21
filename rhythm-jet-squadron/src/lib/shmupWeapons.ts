import {
  SHMUP_BALANCE,
  type ShmupPrimaryKey,
  resolvePrimaryKey,
} from "./shmupBalance";

export interface PlayerPrimaryState {
  x: number;
  y: number;
  radius: number;
  weaponLevel: number;
  overdriveActive: boolean;
  shotColorOverride?: string | null;
  precisionRoute?: boolean;
  aggressiveRoute?: boolean;
}

export interface PrimaryBulletSpec {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  coreColor: string;
  length: number;
  maxLife: number;
  driftVx?: number;
  oscillateAmp?: number;
  oscillateFreq?: number;
  oscillatePhase?: number;
  boomerangTurnAt?: number;
  boomerangReturnVy?: number;
  pierce?: number;
  homingTurnRate?: number;
  homingRange?: number;
}

export function getPrimaryFireInterval(
  primaryKeyRaw: string | null | undefined,
  overdriveActive: boolean,
  aggressiveRoute: boolean
): number {
  const primaryKey = resolvePrimaryKey(primaryKeyRaw);
  const baseInterval = overdriveActive
    ? SHMUP_BALANCE.primaries[primaryKey].overdriveFireInterval
    : SHMUP_BALANCE.primaries[primaryKey].baseFireInterval;
  if (!aggressiveRoute) return baseInterval;
  return baseInterval / SHMUP_BALANCE.passives.aggressiveRoute.fireRateMult;
}

function levelDamageScale(level: number): number {
  if (level <= 1) return 1;
  if (level === 2) return 1.18;
  if (level === 3) return 1.38;
  return 1.6;
}

function withPrimaryColors(
  primaryKey: ShmupPrimaryKey,
  overrideColor: string | null | undefined
): { color: string; coreColor: string } {
  const defaults = SHMUP_BALANCE.primaries[primaryKey];
  return {
    color: overrideColor ?? defaults.color,
    coreColor: defaults.coreColor,
  };
}

function spread(scale: number, precisionRoute: boolean): number {
  if (!precisionRoute) return scale;
  return scale * SHMUP_BALANCE.passives.precisionRoute.spreadMult;
}

function speed(baseSpeed: number, precisionRoute: boolean): number {
  if (!precisionRoute) return baseSpeed;
  return baseSpeed * SHMUP_BALANCE.passives.precisionRoute.bulletSpeedMult;
}

function damage(
  baseDamage: number,
  level: number,
  precisionRoute: boolean,
  aggressiveRoute: boolean
): number {
  let value = baseDamage * levelDamageScale(level);
  if (precisionRoute) value *= SHMUP_BALANCE.passives.precisionRoute.damageMult;
  if (aggressiveRoute) value *= SHMUP_BALANCE.passives.aggressiveRoute.damageMult;
  return value;
}

function createBullet(
  primaryKey: ShmupPrimaryKey,
  state: PlayerPrimaryState,
  overrides: Partial<PrimaryBulletSpec>
): PrimaryBulletSpec {
  const base = SHMUP_BALANCE.primaries[primaryKey];
  const colors = withPrimaryColors(primaryKey, state.shotColorOverride);
  return {
    x: state.x,
    y: state.y - state.radius - 6,
    vx: 0,
    vy: -speed(base.speed, Boolean(state.precisionRoute)),
    radius: base.radius,
    damage: damage(
      base.damage,
      state.weaponLevel,
      Boolean(state.precisionRoute),
      Boolean(state.aggressiveRoute)
    ),
    color: colors.color,
    coreColor: colors.coreColor,
    length: base.length,
    maxLife: base.life,
    ...overrides,
  };
}

export function spawnPrimaryShots(
  primaryKeyRaw: string | null | undefined,
  state: PlayerPrimaryState,
  timeNowMs: number
): PrimaryBulletSpec[] {
  const primaryKey = resolvePrimaryKey(primaryKeyRaw);
  const level = Math.max(1, Math.min(6, state.weaponLevel));
  const precisionRoute = Boolean(state.precisionRoute);
  const aggressiveRoute = Boolean(state.aggressiveRoute);
  const shots: PrimaryBulletSpec[] = [];

  switch (primaryKey) {
    case "flare_lance": {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            radius: 3.8,
            length: 34,
            vy: -speed(920, precisionRoute),
            damage: damage(2.18, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.35,
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            radius: 4.2,
            length: 37,
            vy: -speed(980, precisionRoute),
            damage: damage(2.25, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.3,
          }),
          createBullet(primaryKey, state, {
            y: state.y - state.radius - 14,
            radius: 3.2,
            length: 26,
            vy: -speed(860, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.2,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 7,
            radius: 3.9,
            length: 32,
            vy: -speed(940, precisionRoute),
            damage: damage(1.84, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.35,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 7,
            radius: 3.9,
            length: 32,
            vy: -speed(940, precisionRoute),
            damage: damage(1.84, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.35,
          }),
          createBullet(primaryKey, state, {
            radius: 3.2,
            length: 24,
            vy: -speed(1010, precisionRoute),
            damage: damage(1.08, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.1,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          radius: level >= 6 ? 5.8 : level >= 5 ? 5.2 : 4.8,
          length: level >= 6 ? 54 : level >= 5 ? 48 : 42,
          vy: -speed(level >= 6 ? 1120 : level >= 5 ? 1080 : 1040, precisionRoute),
          damage: damage(level >= 6 ? 3.4 : level >= 5 ? 3.0 : 2.7, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 6 : level >= 5 ? 5 : 4,
          maxLife: 1.3,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 14,
          radius: 3.9,
          length: level >= 5 ? 36 : 30,
          vy: -speed(level >= 5 ? 980 : 940, precisionRoute),
          damage: damage(level >= 5 ? 1.82 : 1.5, level, precisionRoute, aggressiveRoute),
          pierce: level >= 5 ? 3 : 2,
          maxLife: 1.35,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 14,
          radius: 3.9,
          length: level >= 5 ? 36 : 30,
          vy: -speed(level >= 5 ? 980 : 940, precisionRoute),
          damage: damage(level >= 5 ? 1.82 : 1.5, level, precisionRoute, aggressiveRoute),
          pierce: level >= 5 ? 3 : 2,
          maxLife: 1.35,
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x - 28,
            radius: 3.2,
            length: 28,
            vy: -speed(920, precisionRoute),
            vx: -spread(90, precisionRoute),
            damage: damage(1.12, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.25,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 28,
            radius: 3.2,
            length: 28,
            vy: -speed(920, precisionRoute),
            vx: spread(90, precisionRoute),
            damage: damage(1.12, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.25,
          }),
        ] : []),
        ...(level >= 6 ? [
          createBullet(primaryKey, state, {
            x: state.x - 42,
            radius: 2.8,
            length: 24,
            vy: -speed(860, precisionRoute),
            vx: -spread(150, precisionRoute),
            damage: damage(0.96, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.15,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 42,
            radius: 2.8,
            length: 24,
            vy: -speed(860, precisionRoute),
            vx: spread(150, precisionRoute),
            damage: damage(0.96, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.15,
          }),
        ] : [])
      );
      break;
    }
    case "lunar_stream": {
      const phase = timeNowMs / 220;

      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 10,
            vy: -speed(590, precisionRoute),
            damage: damage(0.82, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 32,
            oscillateFreq: 8.2,
            oscillatePhase: phase,
            radius: 3.6,
            length: 13,
            maxLife: 1.95,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 10,
            vy: -speed(590, precisionRoute),
            damage: damage(0.82, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 32,
            oscillateFreq: 8.2,
            oscillatePhase: phase + Math.PI,
            radius: 3.6,
            length: 13,
            maxLife: 1.95,
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 12,
            vy: -speed(610, precisionRoute),
            damage: damage(0.88, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 44,
            oscillateFreq: 8.8,
            oscillatePhase: phase,
            radius: 3.8,
            length: 14,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 12,
            vy: -speed(610, precisionRoute),
            damage: damage(0.88, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 44,
            oscillateFreq: 8.8,
            oscillatePhase: phase + Math.PI,
            radius: 3.8,
            length: 14,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vy: -speed(650, precisionRoute),
            damage: damage(0.96, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 24,
            oscillateFreq: 10.4,
            oscillatePhase: phase + Math.PI * 0.5,
            radius: 3.9,
            length: 14,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 14,
            vy: -speed(620, precisionRoute),
            damage: damage(0.94, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 46,
            oscillateFreq: 9.2,
            oscillatePhase: phase,
            radius: 4,
            length: 14,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vy: -speed(670, precisionRoute),
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 26,
            oscillateFreq: 10.8,
            oscillatePhase: phase + Math.PI * 0.5,
            radius: 4.1,
            length: 15,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 14,
            vy: -speed(620, precisionRoute),
            damage: damage(0.94, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 46,
            oscillateFreq: 9.2,
            oscillatePhase: phase + Math.PI,
            radius: 4,
            length: 14,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 22,
          vy: -speed(620, precisionRoute),
          damage: damage(0.86, level, precisionRoute, aggressiveRoute),
          oscillateAmp: 58,
          oscillateFreq: 8.5,
          oscillatePhase: phase,
          radius: 3.8,
          length: 14,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 10,
          vy: -speed(650, precisionRoute),
          damage: damage(0.96, level, precisionRoute, aggressiveRoute),
          oscillateAmp: 44,
          oscillateFreq: 9.6,
          oscillatePhase: phase + Math.PI * 0.3,
          radius: 4,
          length: 15,
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          vy: -speed(level >= 6 ? 760 : 700, precisionRoute),
          damage: damage(level >= 6 ? 1.28 : 1.08, level, precisionRoute, aggressiveRoute),
          oscillateAmp: level >= 6 ? 18 : 28,
          oscillateFreq: 11.2,
          oscillatePhase: phase + Math.PI * 0.6,
          radius: level >= 6 ? 4.8 : 4.2,
          length: level >= 6 ? 22 : 16,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 10,
          vy: -speed(650, precisionRoute),
          damage: damage(0.96, level, precisionRoute, aggressiveRoute),
          oscillateAmp: 44,
          oscillateFreq: 9.6,
          oscillatePhase: phase + Math.PI,
          radius: 4,
          length: 15,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 22,
          vy: -speed(620, precisionRoute),
          damage: damage(0.86, level, precisionRoute, aggressiveRoute),
          oscillateAmp: 58,
          oscillateFreq: 8.5,
          oscillatePhase: phase + Math.PI * 1.35,
          radius: 3.8,
          length: 14,
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x - 34,
            vy: -speed(610, precisionRoute),
            damage: damage(0.72, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 70,
            oscillateFreq: 7.8,
            oscillatePhase: phase + Math.PI * 0.15,
            radius: 3.4,
            length: 13,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 34,
            vy: -speed(610, precisionRoute),
            damage: damage(0.72, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 70,
            oscillateFreq: 7.8,
            oscillatePhase: phase + Math.PI * 1.15,
            radius: 3.4,
            length: 13,
          }),
        ] : []),
        ...(level >= 6 ? [
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 18,
            vy: -speed(820, precisionRoute),
            damage: damage(1.36, level, precisionRoute, aggressiveRoute),
            oscillateAmp: 0,
            oscillateFreq: 0,
            oscillatePhase: phase,
            radius: 4.2,
            length: 24,
            pierce: 2,
          }),
        ] : [])
      );
      break;
    }
    case "surge_arc": {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 10,
            vx: -spread(120, precisionRoute),
            driftVx: -spread(90, precisionRoute),
            vy: -speed(570, precisionRoute),
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 10,
            vx: spread(120, precisionRoute),
            driftVx: spread(90, precisionRoute),
            vy: -speed(570, precisionRoute),
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 11,
            vx: -spread(165, precisionRoute),
            driftVx: -spread(120, precisionRoute),
            vy: -speed(580, precisionRoute),
            damage: damage(1.06, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vx: 0,
            vy: -speed(620, precisionRoute),
            damage: damage(1.18, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 11,
            vx: spread(165, precisionRoute),
            driftVx: spread(120, precisionRoute),
            vy: -speed(580, precisionRoute),
            damage: damage(1.06, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 24,
            vx: -spread(260, precisionRoute),
            driftVx: -spread(170, precisionRoute),
            vy: -speed(530, precisionRoute),
            damage: damage(0.84, level, precisionRoute, aggressiveRoute),
            radius: 3.4,
            length: 12,
          }),
          createBullet(primaryKey, state, {
            x: state.x - 10,
            vx: -spread(130, precisionRoute),
            driftVx: -spread(105, precisionRoute),
            vy: -speed(590, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vx: 0,
            vy: -speed(640, precisionRoute),
            damage: damage(1.2, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 10,
            vx: spread(130, precisionRoute),
            driftVx: spread(105, precisionRoute),
            vy: -speed(590, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 24,
            vx: spread(260, precisionRoute),
            driftVx: spread(170, precisionRoute),
            vy: -speed(530, precisionRoute),
            damage: damage(0.84, level, precisionRoute, aggressiveRoute),
            radius: 3.4,
            length: 12,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 30,
          vx: -spread(level >= 6 ? 360 : 320, precisionRoute),
          driftVx: -spread(level >= 6 ? 220 : 190, precisionRoute),
          vy: -speed(level >= 6 ? 540 : 520, precisionRoute),
          damage: damage(level >= 6 ? 0.9 : 0.78, level, precisionRoute, aggressiveRoute),
          radius: 3.2,
          length: 11,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 17,
          vx: -spread(level >= 5 ? 250 : 220, precisionRoute),
          driftVx: -spread(level >= 5 ? 185 : 160, precisionRoute),
          vy: -speed(level >= 5 ? 585 : 560, precisionRoute),
          damage: damage(level >= 5 ? 1.02 : 0.9, level, precisionRoute, aggressiveRoute),
          radius: 3.6,
          length: 12,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 6,
          vx: -spread(level >= 5 ? 125 : 105, precisionRoute),
          driftVx: -spread(level >= 5 ? 108 : 90, precisionRoute),
          vy: -speed(level >= 5 ? 640 : 610, precisionRoute),
          damage: damage(level >= 5 ? 1.14 : 1.02, level, precisionRoute, aggressiveRoute),
          radius: level >= 6 ? 4.1 : 3.8,
          length: level >= 6 ? 16 : 14,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 6,
          vx: spread(level >= 5 ? 125 : 105, precisionRoute),
          driftVx: spread(level >= 5 ? 108 : 90, precisionRoute),
          vy: -speed(level >= 5 ? 640 : 610, precisionRoute),
          damage: damage(level >= 5 ? 1.14 : 1.02, level, precisionRoute, aggressiveRoute),
          radius: level >= 6 ? 4.1 : 3.8,
          length: level >= 6 ? 16 : 14,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 17,
          vx: spread(level >= 5 ? 250 : 220, precisionRoute),
          driftVx: spread(level >= 5 ? 185 : 160, precisionRoute),
          vy: -speed(level >= 5 ? 585 : 560, precisionRoute),
          damage: damage(level >= 5 ? 1.02 : 0.9, level, precisionRoute, aggressiveRoute),
          radius: 3.6,
          length: 12,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 30,
          vx: spread(level >= 6 ? 360 : 320, precisionRoute),
          driftVx: spread(level >= 6 ? 220 : 190, precisionRoute),
          vy: -speed(level >= 6 ? 540 : 520, precisionRoute),
          damage: damage(level >= 6 ? 0.9 : 0.78, level, precisionRoute, aggressiveRoute),
          radius: 3.2,
          length: 11,
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 14,
            vx: -spread(level >= 6 ? 42 : 28, precisionRoute),
            driftVx: -spread(level >= 6 ? 30 : 18, precisionRoute),
            vy: -speed(level >= 6 ? 720 : 680, precisionRoute),
            damage: damage(level >= 6 ? 1.18 : 0.92, level, precisionRoute, aggressiveRoute),
            radius: level >= 6 ? 4.2 : 3.8,
            length: level >= 6 ? 20 : 16,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 14,
            vx: spread(level >= 6 ? 42 : 28, precisionRoute),
            driftVx: spread(level >= 6 ? 30 : 18, precisionRoute),
            vy: -speed(level >= 6 ? 720 : 680, precisionRoute),
            damage: damage(level >= 6 ? 1.18 : 0.92, level, precisionRoute, aggressiveRoute),
            radius: level >= 6 ? 4.2 : 3.8,
            length: level >= 6 ? 20 : 16,
          }),
        ] : [])
      );
      break;
    }
    case "starfall_rail": {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            radius: 3.2,
            length: 34,
            vy: -speed(1020, precisionRoute),
            damage: damage(2.42, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.15,
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            radius: 3.3,
            length: 34,
            vy: -speed(1040, precisionRoute),
            damage: damage(2.48, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.2,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 15,
            radius: 2.8,
            length: 25,
            vy: -speed(1100, precisionRoute),
            damage: damage(0.96, level, precisionRoute, aggressiveRoute),
            pierce: 1,
            maxLife: 1.05,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 8,
            radius: 3.2,
            length: 33,
            vy: -speed(1010, precisionRoute),
            damage: damage(1.88, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.2,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 8,
            radius: 3.2,
            length: 33,
            vy: -speed(1010, precisionRoute),
            damage: damage(1.88, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 1.2,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          radius: level >= 6 ? 4.1 : 3.8,
          length: level >= 6 ? 46 : 40,
          vy: -speed(level >= 6 ? 1140 : 1100, precisionRoute),
          damage: damage(level >= 6 ? 2.64 : 2.42, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 5 : 4,
          maxLife: 1.18,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 11,
          radius: 3.2,
          length: level >= 5 ? 34 : 31,
          vy: -speed(level >= 5 ? 1070 : 1040, precisionRoute),
          damage: damage(level >= 5 ? 1.68 : 1.52, level, precisionRoute, aggressiveRoute),
          pierce: level >= 5 ? 3 : 2,
          maxLife: 1.15,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 11,
          radius: 3.2,
          length: level >= 5 ? 34 : 31,
          vy: -speed(level >= 5 ? 1070 : 1040, precisionRoute),
          damage: damage(level >= 5 ? 1.68 : 1.52, level, precisionRoute, aggressiveRoute),
          pierce: level >= 5 ? 3 : 2,
          maxLife: 1.15,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 22,
          radius: 2.7,
          length: 27,
          vy: -speed(1000, precisionRoute),
          damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          pierce: 2,
          maxLife: 1.08,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 22,
          radius: 2.7,
          length: 27,
          vy: -speed(1000, precisionRoute),
          damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          pierce: 2,
          maxLife: 1.08,
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 20,
            radius: level >= 6 ? 3.2 : 2.9,
            length: level >= 6 ? 32 : 28,
            vy: -speed(level >= 6 ? 1260 : 1200, precisionRoute),
            damage: damage(level >= 6 ? 1.4 : 1.12, level, precisionRoute, aggressiveRoute),
            pierce: level >= 6 ? 3 : 2,
            maxLife: 1.02,
          }),
        ] : [])
      );
      break;
    }
    case "aurora_harmonics": {
      const phase = timeNowMs / 190;

      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 10,
            vy: -speed(640, precisionRoute),
            oscillateAmp: 26,
            oscillateFreq: 9.5,
            oscillatePhase: phase,
            radius: 4.7,
            length: 17,
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 10,
            vy: -speed(640, precisionRoute),
            oscillateAmp: 26,
            oscillateFreq: 9.5,
            oscillatePhase: phase + Math.PI,
            radius: 4.7,
            length: 17,
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 12,
            vy: -speed(650, precisionRoute),
            oscillateAmp: 36,
            oscillateFreq: 9.8,
            oscillatePhase: phase,
            radius: 4.9,
            length: 18,
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 12,
            vy: -speed(650, precisionRoute),
            oscillateAmp: 36,
            oscillateFreq: 9.8,
            oscillatePhase: phase + Math.PI,
            radius: 4.9,
            length: 18,
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vy: -speed(690, precisionRoute),
            oscillateAmp: 18,
            oscillateFreq: 11,
            oscillatePhase: phase + Math.PI * 0.5,
            radius: 5.2,
            length: 19,
            damage: damage(1.14, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 14,
            vy: -speed(650, precisionRoute),
            oscillateAmp: 40,
            oscillateFreq: 10,
            oscillatePhase: phase,
            radius: 5,
            length: 19,
            damage: damage(1.06, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vy: -speed(700, precisionRoute),
            oscillateAmp: 20,
            oscillateFreq: 11.4,
            oscillatePhase: phase + Math.PI * 0.5,
            radius: 5.4,
            length: 20,
            damage: damage(1.18, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 14,
            vy: -speed(650, precisionRoute),
            oscillateAmp: 40,
            oscillateFreq: 10,
            oscillatePhase: phase + Math.PI,
            radius: 5,
            length: 19,
            damage: damage(1.06, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 26,
          vy: -speed(625, precisionRoute),
          oscillateAmp: level >= 6 ? 66 : 56,
          oscillateFreq: 9.1,
          oscillatePhase: phase,
          radius: 4.7,
          length: 18,
          damage: damage(level >= 6 ? 0.98 : 0.88, level, precisionRoute, aggressiveRoute),
        }),
        createBullet(primaryKey, state, {
          x: state.x - 13,
          vy: -speed(level >= 5 ? 675 : 650, precisionRoute),
          oscillateAmp: level >= 5 ? 46 : 40,
          oscillateFreq: 10,
          oscillatePhase: phase + Math.PI * 0.4,
          radius: 5,
          length: 20,
          damage: damage(level >= 5 ? 1.12 : 1.02, level, precisionRoute, aggressiveRoute),
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          vy: -speed(level >= 6 ? 780 : level >= 5 ? 735 : 710, precisionRoute),
          oscillateAmp: level >= 6 ? 10 : level >= 5 ? 18 : 24,
          oscillateFreq: 12.2,
          oscillatePhase: phase + Math.PI * 0.7,
          radius: level >= 6 ? 5.9 : level >= 5 ? 5.6 : 5.4,
          length: level >= 6 ? 28 : level >= 5 ? 24 : 21,
          damage: damage(level >= 6 ? 1.44 : level >= 5 ? 1.3 : 1.2, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 2 : level >= 5 ? 1 : 0,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 13,
          vy: -speed(level >= 5 ? 675 : 650, precisionRoute),
          oscillateAmp: level >= 5 ? 46 : 40,
          oscillateFreq: 10,
          oscillatePhase: phase + Math.PI,
          radius: 5,
          length: 20,
          damage: damage(level >= 5 ? 1.12 : 1.02, level, precisionRoute, aggressiveRoute),
        }),
        createBullet(primaryKey, state, {
          x: state.x + 26,
          vy: -speed(625, precisionRoute),
          oscillateAmp: level >= 6 ? 66 : 56,
          oscillateFreq: 9.1,
          oscillatePhase: phase + Math.PI * 1.35,
          radius: 4.7,
          length: 18,
          damage: damage(level >= 6 ? 0.98 : 0.88, level, precisionRoute, aggressiveRoute),
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 18,
            vy: -speed(level >= 6 ? 705 : 670, precisionRoute),
            oscillateAmp: 34,
            oscillateFreq: 8.4,
            oscillatePhase: phase + Math.PI * 0.18,
            radius: 4.4,
            length: 18,
            damage: damage(level >= 6 ? 0.98 : 0.82, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 18,
            vy: -speed(level >= 6 ? 705 : 670, precisionRoute),
            oscillateAmp: 34,
            oscillateFreq: 8.4,
            oscillatePhase: phase + Math.PI * 1.18,
            radius: 4.4,
            length: 18,
            damage: damage(level >= 6 ? 0.98 : 0.82, level, precisionRoute, aggressiveRoute),
          }),
        ] : [])
      );
      break;
    }
    case "void_rake": {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 12,
            vx: -spread(120, precisionRoute),
            vy: -speed(510, precisionRoute),
            radius: 4.6,
            length: 15,
            maxLife: 1.45,
            damage: damage(1.25, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 12,
            vx: spread(120, precisionRoute),
            vy: -speed(510, precisionRoute),
            radius: 4.6,
            length: 15,
            maxLife: 1.45,
            damage: damage(1.25, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 16,
            vx: -spread(210, precisionRoute),
            vy: -speed(500, precisionRoute),
            radius: 4.8,
            length: 16,
            maxLife: 1.55,
            damage: damage(1.28, level, precisionRoute, aggressiveRoute),
            pierce: 1,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vx: 0,
            vy: -speed(540, precisionRoute),
            radius: 4.3,
            length: 15,
            maxLife: 1.5,
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 16,
            vx: spread(210, precisionRoute),
            vy: -speed(500, precisionRoute),
            radius: 4.8,
            length: 16,
            maxLife: 1.55,
            damage: damage(1.28, level, precisionRoute, aggressiveRoute),
            pierce: 1,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 16,
            vx: -spread(190, precisionRoute),
            vy: -speed(470, precisionRoute),
            boomerangTurnAt: 0.76,
            boomerangReturnVy: 340,
            radius: 4.7,
            length: 16,
            maxLife: 1.8,
            damage: damage(1.22, level, precisionRoute, aggressiveRoute),
            pierce: 1,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vx: 0,
            vy: -speed(520, precisionRoute),
            radius: 4.2,
            length: 15,
            maxLife: 1.6,
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 16,
            vx: spread(190, precisionRoute),
            vy: -speed(470, precisionRoute),
            boomerangTurnAt: 0.76,
            boomerangReturnVy: 340,
            radius: 4.7,
            length: 16,
            maxLife: 1.8,
            damage: damage(1.22, level, precisionRoute, aggressiveRoute),
            pierce: 1,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 24,
          vx: -spread(level >= 6 ? 290 : 250, precisionRoute),
          vy: -speed(level >= 6 ? 490 : 460, precisionRoute),
          boomerangTurnAt: level >= 6 ? 0.42 : 0.5,
          boomerangReturnVy: level >= 6 ? 430 : 380,
          radius: level >= 6 ? 5.1 : 4.8,
          length: level >= 6 ? 18 : 16,
          maxLife: 1.9,
          damage: damage(level >= 6 ? 1.42 : 1.25, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 2 : 1,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 11,
          vx: -spread(level >= 5 ? 150 : 130, precisionRoute),
          vy: -speed(level >= 5 ? 520 : 490, precisionRoute),
          boomerangTurnAt: level >= 5 ? 0.46 : 0.54,
          boomerangReturnVy: level >= 5 ? 410 : 370,
          radius: level >= 5 ? 4.7 : 4.5,
          length: level >= 5 ? 17 : 16,
          maxLife: 1.9,
          damage: damage(level >= 5 ? 1.26 : 1.14, level, precisionRoute, aggressiveRoute),
          pierce: 1,
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          vx: 0,
          vy: -speed(level >= 6 ? 610 : level >= 5 ? 565 : 530, precisionRoute),
          boomerangTurnAt: level >= 6 ? 0.56 : level >= 5 ? 0.62 : 0,
          boomerangReturnVy: level >= 6 ? 470 : level >= 5 ? 430 : 0,
          radius: level >= 6 ? 4.9 : level >= 5 ? 4.5 : 4.2,
          length: level >= 6 ? 18 : level >= 5 ? 16 : 15,
          maxLife: level >= 5 ? 1.95 : 1.6,
          damage: damage(level >= 6 ? 1.2 : level >= 5 ? 1.08 : 1.02, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 2 : level >= 5 ? 1 : 0,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 11,
          vx: spread(level >= 5 ? 150 : 130, precisionRoute),
          vy: -speed(level >= 5 ? 520 : 490, precisionRoute),
          boomerangTurnAt: level >= 5 ? 0.46 : 0.54,
          boomerangReturnVy: level >= 5 ? 410 : 370,
          radius: level >= 5 ? 4.7 : 4.5,
          length: level >= 5 ? 17 : 16,
          maxLife: 1.9,
          damage: damage(level >= 5 ? 1.26 : 1.14, level, precisionRoute, aggressiveRoute),
          pierce: 1,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 24,
          vx: spread(level >= 6 ? 290 : 250, precisionRoute),
          vy: -speed(level >= 6 ? 490 : 460, precisionRoute),
          boomerangTurnAt: level >= 6 ? 0.42 : 0.5,
          boomerangReturnVy: level >= 6 ? 430 : 380,
          radius: level >= 6 ? 5.1 : 4.8,
          length: level >= 6 ? 18 : 16,
          maxLife: 1.9,
          damage: damage(level >= 6 ? 1.42 : 1.25, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 2 : 1,
        })
      );
      break;
    }
    case "photon_laser": {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            radius: 4.4,
            length: 44,
            vy: -speed(1120, precisionRoute),
            damage: damage(1.02, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 0.78,
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 8,
            radius: 4.1,
            length: 42,
            vy: -speed(1100, precisionRoute),
            damage: damage(0.98, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 0.82,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 8,
            radius: 4.1,
            length: 42,
            vy: -speed(1100, precisionRoute),
            damage: damage(0.98, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 0.82,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 14,
            vx: -spread(48, precisionRoute),
            radius: 3.9,
            length: 40,
            vy: -speed(1080, precisionRoute),
            damage: damage(0.92, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 0.86,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            radius: 4.6,
            length: 46,
            vy: -speed(1140, precisionRoute),
            damage: damage(1.08, level, precisionRoute, aggressiveRoute),
            pierce: 3,
            maxLife: 0.82,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 14,
            vx: spread(48, precisionRoute),
            radius: 3.9,
            length: 40,
            vy: -speed(1080, precisionRoute),
            damage: damage(0.92, level, precisionRoute, aggressiveRoute),
            pierce: 2,
            maxLife: 0.86,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 26,
          vx: -spread(level >= 6 ? 160 : 140, precisionRoute),
          radius: 3.8,
          length: level >= 6 ? 40 : 37,
          vy: -speed(level >= 6 ? 1060 : 1020, precisionRoute),
          damage: damage(level >= 6 ? 0.84 : 0.74, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 2 : 1,
          maxLife: 0.92,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 11,
          vx: -spread(level >= 5 ? 78 : 65, precisionRoute),
          radius: 4.1,
          length: level >= 5 ? 43 : 39,
          vy: -speed(level >= 5 ? 1115 : 1080, precisionRoute),
          damage: damage(level >= 5 ? 1.02 : 0.9, level, precisionRoute, aggressiveRoute),
          pierce: level >= 5 ? 3 : 2,
          maxLife: 0.86,
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          radius: level >= 6 ? 5.4 : level >= 5 ? 5.1 : 4.8,
          length: level >= 6 ? 62 : level >= 5 ? 54 : 48,
          vy: -speed(level >= 6 ? 1260 : level >= 5 ? 1210 : 1160, precisionRoute),
          damage: damage(level >= 6 ? 1.42 : level >= 5 ? 1.28 : 1.16, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 6 : level >= 5 ? 5 : 4,
          maxLife: 0.8,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 11,
          vx: spread(level >= 5 ? 78 : 65, precisionRoute),
          radius: 4.1,
          length: level >= 5 ? 43 : 39,
          vy: -speed(level >= 5 ? 1115 : 1080, precisionRoute),
          damage: damage(level >= 5 ? 1.02 : 0.9, level, precisionRoute, aggressiveRoute),
          pierce: level >= 5 ? 3 : 2,
          maxLife: 0.86,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 26,
          vx: spread(level >= 6 ? 160 : 140, precisionRoute),
          radius: 3.8,
          length: level >= 6 ? 40 : 37,
          vy: -speed(level >= 6 ? 1060 : 1020, precisionRoute),
          damage: damage(level >= 6 ? 0.84 : 0.74, level, precisionRoute, aggressiveRoute),
          pierce: level >= 6 ? 2 : 1,
          maxLife: 0.92,
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 18,
            radius: level >= 6 ? 4.2 : 3.8,
            length: level >= 6 ? 34 : 28,
            vy: -speed(level >= 6 ? 1320 : 1240, precisionRoute),
            damage: damage(level >= 6 ? 0.98 : 0.8, level, precisionRoute, aggressiveRoute),
            pierce: level >= 6 ? 4 : 2,
            maxLife: 0.74,
          }),
        ] : [])
      );
      break;
    }
    case "homing_missiles": {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            radius: 4.8,
            length: 12,
            vy: -speed(390, precisionRoute),
            damage: damage(1.45, level, precisionRoute, aggressiveRoute),
            maxLife: 2.2,
            homingTurnRate: 3.4,
            homingRange: 320,
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 11,
            vx: -spread(80, precisionRoute),
            radius: 4.7,
            length: 12,
            vy: -speed(370, precisionRoute),
            damage: damage(1.28, level, precisionRoute, aggressiveRoute),
            maxLife: 2.25,
            homingTurnRate: 3.8,
            homingRange: 340,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 11,
            vx: spread(80, precisionRoute),
            radius: 4.7,
            length: 12,
            vy: -speed(370, precisionRoute),
            damage: damage(1.28, level, precisionRoute, aggressiveRoute),
            maxLife: 2.25,
            homingTurnRate: 3.8,
            homingRange: 340,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 16,
            vx: -spread(120, precisionRoute),
            radius: 4.6,
            length: 12,
            vy: -speed(360, precisionRoute),
            damage: damage(1.1, level, precisionRoute, aggressiveRoute),
            maxLife: 2.3,
            homingTurnRate: 4.2,
            homingRange: 350,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vx: 0,
            radius: 5,
            length: 13,
            vy: -speed(400, precisionRoute),
            damage: damage(1.34, level, precisionRoute, aggressiveRoute),
            maxLife: 2.25,
            homingTurnRate: 4.5,
            homingRange: 360,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 16,
            vx: spread(120, precisionRoute),
            radius: 4.6,
            length: 12,
            vy: -speed(360, precisionRoute),
            damage: damage(1.1, level, precisionRoute, aggressiveRoute),
            maxLife: 2.3,
            homingTurnRate: 4.2,
            homingRange: 350,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 26,
          vx: -spread(170, precisionRoute),
          radius: 4.5,
          length: 11,
          vy: -speed(350, precisionRoute),
          damage: damage(0.96, level, precisionRoute, aggressiveRoute),
          maxLife: 2.35,
          homingTurnRate: level >= 6 ? 5.1 : 4.7,
          homingRange: level >= 6 ? 395 : 370,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 12,
          vx: -spread(105, precisionRoute),
          radius: 4.6,
          length: 11,
          vy: -speed(370, precisionRoute),
          damage: damage(1.08, level, precisionRoute, aggressiveRoute),
          maxLife: 2.35,
          homingTurnRate: level >= 6 ? 5.35 : 4.9,
          homingRange: level >= 6 ? 405 : 380,
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          vx: 0,
          radius: level >= 6 ? 5.6 : 5.2,
          length: level >= 6 ? 15 : 13,
          vy: -speed(level >= 6 ? 450 : 415, precisionRoute),
          damage: damage(level >= 6 ? 1.54 : 1.36, level, precisionRoute, aggressiveRoute),
          maxLife: 2.35,
          homingTurnRate: level >= 6 ? 5.8 : 5.2,
          homingRange: level >= 6 ? 430 : 390,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 12,
          vx: spread(105, precisionRoute),
          radius: 4.6,
          length: 11,
          vy: -speed(370, precisionRoute),
          damage: damage(1.08, level, precisionRoute, aggressiveRoute),
          maxLife: 2.35,
          homingTurnRate: level >= 6 ? 5.35 : 4.9,
          homingRange: level >= 6 ? 405 : 380,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 26,
          vx: spread(170, precisionRoute),
          radius: 4.5,
          length: 11,
          vy: -speed(350, precisionRoute),
          damage: damage(0.96, level, precisionRoute, aggressiveRoute),
          maxLife: 2.35,
          homingTurnRate: level >= 6 ? 5.1 : 4.7,
          homingRange: level >= 6 ? 395 : 370,
        }),
        ...(level >= 5 ? [
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 16,
            vx: -spread(level >= 6 ? 52 : 40, precisionRoute),
            radius: 4.2,
            length: 10,
            vy: -speed(level >= 6 ? 390 : 365, precisionRoute),
            damage: damage(level >= 6 ? 0.94 : 0.76, level, precisionRoute, aggressiveRoute),
            maxLife: 2.15,
            homingTurnRate: level >= 6 ? 6.2 : 5.5,
            homingRange: level >= 6 ? 360 : 330,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            y: state.y - state.radius - 16,
            vx: spread(level >= 6 ? 52 : 40, precisionRoute),
            radius: 4.2,
            length: 10,
            vy: -speed(level >= 6 ? 390 : 365, precisionRoute),
            damage: damage(level >= 6 ? 0.94 : 0.76, level, precisionRoute, aggressiveRoute),
            maxLife: 2.15,
            homingTurnRate: level >= 6 ? 6.2 : 5.5,
            homingRange: level >= 6 ? 360 : 330,
          }),
        ] : [])
      );
      break;
    }
    case "blazing_laser": {
      // Blazing Lazers-style: thin beam → twin beams → triple + side beams → full power spread
      if (level === 1) {
        // Single focused beam
        shots.push(
          createBullet(primaryKey, state, {
            radius: 3.6,
            length: 52,
            vy: -speed(1200, precisionRoute),
            damage: damage(0.72, level, precisionRoute, aggressiveRoute),
            pierce: 3,
            maxLife: 0.65,
          })
        );
        break;
      }

      if (level === 2) {
        // Twin parallel beams — the classic double laser
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 6,
            radius: 3.8,
            length: 56,
            vy: -speed(1220, precisionRoute),
            damage: damage(0.68, level, precisionRoute, aggressiveRoute),
            pierce: 3,
            maxLife: 0.68,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 6,
            radius: 3.8,
            length: 56,
            vy: -speed(1220, precisionRoute),
            damage: damage(0.68, level, precisionRoute, aggressiveRoute),
            pierce: 3,
            maxLife: 0.68,
          })
        );
        break;
      }

      if (level === 3) {
        // Triple beam — center power beam flanked by two side beams
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 12,
            radius: 3.6,
            length: 50,
            vy: -speed(1180, precisionRoute),
            damage: damage(0.58, level, precisionRoute, aggressiveRoute),
            pierce: 3,
            maxLife: 0.72,
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            radius: 4.4,
            length: 62,
            vy: -speed(1260, precisionRoute),
            damage: damage(0.82, level, precisionRoute, aggressiveRoute),
            pierce: 4,
            maxLife: 0.7,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 12,
            radius: 3.6,
            length: 50,
            vy: -speed(1180, precisionRoute),
            damage: damage(0.58, level, precisionRoute, aggressiveRoute),
            pierce: 3,
            maxLife: 0.72,
          })
        );
        break;
      }

      // Level 4: Full power — wide beam spread like max-power Blazing Lazers
      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 20,
          vx: -spread(60, precisionRoute),
          radius: 3.4,
          length: 46,
          vy: -speed(1140, precisionRoute),
          damage: damage(0.48, level, precisionRoute, aggressiveRoute),
          pierce: 2,
          maxLife: 0.74,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 8,
          radius: 4,
          length: 58,
          vy: -speed(1240, precisionRoute),
          damage: damage(0.66, level, precisionRoute, aggressiveRoute),
          pierce: 4,
          maxLife: 0.7,
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          radius: 5,
          length: 68,
          vy: -speed(1300, precisionRoute),
          damage: damage(0.92, level, precisionRoute, aggressiveRoute),
          pierce: 5,
          maxLife: 0.68,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 8,
          radius: 4,
          length: 58,
          vy: -speed(1240, precisionRoute),
          damage: damage(0.66, level, precisionRoute, aggressiveRoute),
          pierce: 4,
          maxLife: 0.7,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 20,
          vx: spread(60, precisionRoute),
          radius: 3.4,
          length: 46,
          vy: -speed(1140, precisionRoute),
          damage: damage(0.48, level, precisionRoute, aggressiveRoute),
          pierce: 2,
          maxLife: 0.74,
        })
      );
      break;
    }
    case "standard":
    default: {
      if (level === 1) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 8,
            vy: -speed(620, precisionRoute),
            damage: damage(1.1, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 8,
            vy: -speed(620, precisionRoute),
            damage: damage(1.1, level, precisionRoute, aggressiveRoute),
          })
        );
        break;
      }

      if (level === 2) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 8,
            vy: -speed(640, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 8,
            vy: -speed(640, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x,
            vy: -speed(750, precisionRoute),
            damage: damage(1.2, level, precisionRoute, aggressiveRoute),
            radius: 4.2,
            length: 18,
          })
        );
        break;
      }

      if (level === 3) {
        shots.push(
          createBullet(primaryKey, state, {
            x: state.x - 8,
            vy: -speed(640, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x + 8,
            vy: -speed(640, precisionRoute),
            damage: damage(1.04, level, precisionRoute, aggressiveRoute),
          }),
          createBullet(primaryKey, state, {
            x: state.x - 22,
            vx: -spread(170, precisionRoute),
            vy: -speed(580, precisionRoute),
            damage: damage(0.9, level, precisionRoute, aggressiveRoute),
            radius: 3.6,
            length: 13,
          }),
          createBullet(primaryKey, state, {
            x: state.x + 22,
            vx: spread(170, precisionRoute),
            vy: -speed(580, precisionRoute),
            damage: damage(0.9, level, precisionRoute, aggressiveRoute),
            radius: 3.6,
            length: 13,
          })
        );
        break;
      }

      shots.push(
        createBullet(primaryKey, state, {
          x: state.x - 30,
          vx: -spread(280, precisionRoute),
          vy: -speed(540, precisionRoute),
          damage: damage(0.74, level, precisionRoute, aggressiveRoute),
          radius: 3.2,
          length: 12,
        }),
        createBullet(primaryKey, state, {
          x: state.x - 12,
          vx: -spread(120, precisionRoute),
          vy: -speed(620, precisionRoute),
          damage: damage(0.96, level, precisionRoute, aggressiveRoute),
          radius: 3.8,
          length: 14,
        }),
        createBullet(primaryKey, state, {
          x: state.x,
          vx: 0,
          vy: -speed(760, precisionRoute),
          damage: damage(1.22, level, precisionRoute, aggressiveRoute),
          radius: 4.4,
          length: 20,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 12,
          vx: spread(120, precisionRoute),
          vy: -speed(620, precisionRoute),
          damage: damage(0.96, level, precisionRoute, aggressiveRoute),
          radius: 3.8,
          length: 14,
        }),
        createBullet(primaryKey, state, {
          x: state.x + 30,
          vx: spread(280, precisionRoute),
          vy: -speed(540, precisionRoute),
          damage: damage(0.74, level, precisionRoute, aggressiveRoute),
          radius: 3.2,
          length: 12,
        })
      );
      break;
    }
  }

  return shots;
}
