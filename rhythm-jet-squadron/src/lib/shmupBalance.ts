export type ShmupPrimaryKey =
  | "standard"
  | "flare_lance"
  | "lunar_stream"
  | "surge_arc"
  | "starfall_rail"
  | "aurora_harmonics"
  | "void_rake"
  | "photon_laser"
  | "homing_missiles"
  | "blazing_laser";

export type ShmupSecondaryKey =
  | "none"
  | "bomb"
  | "shieldPulse"
  | "barrier"
  | "emp"
  | "drones"
  | "crystalBomb"
  | "barrelRoll"
  | "phaseShift"
  | "vortex"
  | "mirrorShield"
  | "overcharge";

export type ShmupPassiveKey =
  | "smallerHitbox"
  | "overdriveLoop"
  | "precisionRoute"
  | "aggressiveRoute"
  | "extraShield"
  | "shieldRegen";

export interface PrimaryBalance {
  baseFireInterval: number;
  overdriveFireInterval: number;
  damage: number;
  speed: number;
  radius: number;
  length: number;
  life: number;
  color: string;
  coreColor: string;
}

export interface SecondaryBalance {
  cooldownMs: number;
  durationMs: number;
  usesCharges: boolean;
  baseCharges?: number;
  ssrBonusCharges?: number;
  bonusMaxCharges?: number;
}

export const SHMUP_BALANCE: {
  primaries: Record<ShmupPrimaryKey, PrimaryBalance>;
  secondaries: Record<ShmupSecondaryKey, SecondaryBalance>;
  passives: {
    overdriveLoopDurationMult: number;
    precisionRoute: {
      bulletSpeedMult: number;
      spreadMult: number;
      damageMult: number;
    };
    aggressiveRoute: {
      fireRateMult: number;
      damageMult: number;
      hpPenalty: number;
      damageTakenMult: number;
    };
    extraShieldHp: number;
    shieldRegen: {
      perSecond: number;
      delayMs: number;
    };
  };
  effects: {
    shieldPulseRadius: number;
    shieldPulseEnemyDamage: number;
    shieldPulseBossDamage: number;
    empEnemyTimeScale: number;
    empBulletSpeedScale: number;
    droneFireInterval: number;
    droneDamage: number;
    droneShotSpeed: number;
    crystalFreezeMs: number;
    crystalShatterRadius: number;
    crystalShatterEnemyDamage: number;
    crystalShatterBossDamage: number;
    barrelRollDurationMs: number;
    barrelRollDeflectRadius: number;
    barrelRollDeflectDamage: number;
    phaseShiftDistance: number;
    phaseShiftGhostDamage: number;
    phaseShiftGhostBossDamage: number;
    phaseShiftGhostRadius: number;
    vortexRadius: number;
    vortexPullStrength: number;
    vortexDurationMs: number;
    vortexDetonateDamage: number;
    vortexDetonateBossDamage: number;
    mirrorShieldLayers: number;
    mirrorShieldReflectDamage: number;
    mirrorShieldReflectBossDamage: number;
    overchargeFireRateMult: number;
    overchargeDamageMult: number;
    overchargeShotCountBonus: number;
  };
} = {
  primaries: {
    standard: {
      baseFireInterval: 0.13,
      overdriveFireInterval: 0.075,
      damage: 1.15,
      speed: 680,
      radius: 4.2,
      length: 16,
      life: 1.5,
      color: "#74c0fc",
      coreColor: "#f8f9fa",
    },
    flare_lance: {
      baseFireInterval: 0.22,
      overdriveFireInterval: 0.13,
      damage: 2.6,
      speed: 920,
      radius: 3.5,
      length: 32,
      life: 1.3,
      color: "#ff9f43",
      coreColor: "#fff4d9",
    },
    lunar_stream: {
      baseFireInterval: 0.08,
      overdriveFireInterval: 0.05,
      damage: 0.72,
      speed: 580,
      radius: 3.2,
      length: 11,
      life: 1.9,
      color: "#8e7dff",
      coreColor: "#ebe7ff",
    },
    surge_arc: {
      baseFireInterval: 0.15,
      overdriveFireInterval: 0.09,
      damage: 1.2,
      speed: 600,
      radius: 4.4,
      length: 14,
      life: 1.8,
      color: "#ff5ca8",
      coreColor: "#ffe4f3",
    },
    starfall_rail: {
      baseFireInterval: 0.28,
      overdriveFireInterval: 0.16,
      damage: 3.0,
      speed: 1100,
      radius: 3.0,
      length: 36,
      life: 1.0,
      color: "#4dd4ff",
      coreColor: "#e6f9ff",
    },
    aurora_harmonics: {
      baseFireInterval: 0.12,
      overdriveFireInterval: 0.07,
      damage: 1.05,
      speed: 680,
      radius: 5.6,
      length: 18,
      life: 1.9,
      color: "#67ffd4",
      coreColor: "#ebfff8",
    },
    void_rake: {
      baseFireInterval: 0.2,
      overdriveFireInterval: 0.12,
      damage: 1.6,
      speed: 480,
      radius: 5.2,
      length: 18,
      life: 1.6,
      color: "#b494ff",
      coreColor: "#f3ebff",
    },
    photon_laser: {
      baseFireInterval: 0.075,
      overdriveFireInterval: 0.045,
      damage: 0.85,
      speed: 1050,
      radius: 3.8,
      length: 40,
      life: 0.85,
      color: "#d0bfff",
      coreColor: "#f8f0ff",
    },
    homing_missiles: {
      baseFireInterval: 0.22,
      overdriveFireInterval: 0.14,
      damage: 1.7,
      speed: 460,
      radius: 5.2,
      length: 14,
      life: 2.2,
      color: "#ffd58a",
      coreColor: "#fff8db",
    },
    blazing_laser: {
      baseFireInterval: 0.06,
      overdriveFireInterval: 0.038,
      damage: 0.62,
      speed: 1300,
      radius: 3.4,
      length: 56,
      life: 0.65,
      color: "#ff4444",
      coreColor: "#ffcccc",
    },
  },
  secondaries: {
    none: { cooldownMs: 0, durationMs: 0, usesCharges: false },
    bomb: {
      cooldownMs: 850,
      durationMs: 0,
      usesCharges: true,
      baseCharges: 3,
      ssrBonusCharges: 2,
      bonusMaxCharges: 1,
    },
    shieldPulse: {
      cooldownMs: 3200,
      durationMs: 0,
      usesCharges: false,
    },
    barrier: {
      cooldownMs: 7600,
      durationMs: 3600,
      usesCharges: false,
    },
    emp: {
      cooldownMs: 5600,
      durationMs: 2800,
      usesCharges: false,
    },
    drones: {
      cooldownMs: 8200,
      durationMs: 12000,
      usesCharges: false,
    },
    crystalBomb: {
      cooldownMs: 1200,
      durationMs: 0,
      usesCharges: true,
      baseCharges: 2,
      ssrBonusCharges: 2,
      bonusMaxCharges: 1,
    },
    barrelRoll: {
      cooldownMs: 1800,
      durationMs: 360,
      usesCharges: false,
    },
    phaseShift: {
      cooldownMs: 2800,
      durationMs: 220,
      usesCharges: false,
    },
    vortex: {
      cooldownMs: 6200,
      durationMs: 3800,
      usesCharges: false,
    },
    mirrorShield: {
      cooldownMs: 5600,
      durationMs: 5200,
      usesCharges: false,
    },
    overcharge: {
      cooldownMs: 7200,
      durationMs: 5200,
      usesCharges: false,
    },
  },
  passives: {
    overdriveLoopDurationMult: 1.2,
    precisionRoute: {
      bulletSpeedMult: 1.12,
      spreadMult: 0.74,
      damageMult: 1.09,
    },
    aggressiveRoute: {
      fireRateMult: 1.15,
      damageMult: 1.12,
      hpPenalty: 1,
      damageTakenMult: 1.2,
    },
    extraShieldHp: 1,
    shieldRegen: {
      perSecond: 0.22,
      delayMs: 3000,
    },
  },
  effects: {
    shieldPulseRadius: 132,
    shieldPulseEnemyDamage: 3.2,
    shieldPulseBossDamage: 10,
    empEnemyTimeScale: 0.55,
    empBulletSpeedScale: 0.5,
    droneFireInterval: 0.18,
    droneDamage: 1.05,
    droneShotSpeed: 820,
    crystalFreezeMs: 1500,
    crystalShatterRadius: 172,
    crystalShatterEnemyDamage: 6,
    crystalShatterBossDamage: 25,
    // Barrel Roll: quick invincible dodge that deflects bullets back at enemies
    barrelRollDurationMs: 320,
    barrelRollDeflectRadius: 80,
    barrelRollDeflectDamage: 2.5,
    // Phase Shift: teleport forward leaving a damaging afterimage trail
    phaseShiftDistance: 180,
    phaseShiftGhostDamage: 4,
    phaseShiftGhostBossDamage: 15,
    phaseShiftGhostRadius: 110,
    // Vortex: black hole that pulls enemies/bullets inward then detonates
    vortexRadius: 160,
    vortexPullStrength: 280,
    vortexDurationMs: 3200,
    vortexDetonateDamage: 8,
    vortexDetonateBossDamage: 30,
    // Mirror Shield: multi-layer reflective barrier, reflects bullets back
    mirrorShieldLayers: 4,
    mirrorShieldReflectDamage: 1.8,
    mirrorShieldReflectBossDamage: 6,
    // Overcharge: supercharges primary weapon fire rate + damage
    overchargeFireRateMult: 0.38,
    overchargeDamageMult: 2.1,
    overchargeShotCountBonus: 3,
  },
};

const PRIMARY_KEYS = new Set<ShmupPrimaryKey>(Object.keys(SHMUP_BALANCE.primaries) as ShmupPrimaryKey[]);
const SECONDARY_KEYS = new Set<ShmupSecondaryKey>(Object.keys(SHMUP_BALANCE.secondaries) as ShmupSecondaryKey[]);
const PASSIVE_KEYS = new Set<ShmupPassiveKey>([
  "smallerHitbox",
  "overdriveLoop",
  "precisionRoute",
  "aggressiveRoute",
  "extraShield",
  "shieldRegen",
]);

export function resolvePrimaryKey(primaryKey: string | null | undefined): ShmupPrimaryKey {
  if (primaryKey && PRIMARY_KEYS.has(primaryKey as ShmupPrimaryKey)) {
    return primaryKey as ShmupPrimaryKey;
  }
  return "standard";
}

export function resolveSecondaryKey(secondaryKey: string | null | undefined): ShmupSecondaryKey {
  if (secondaryKey && SECONDARY_KEYS.has(secondaryKey as ShmupSecondaryKey)) {
    return secondaryKey as ShmupSecondaryKey;
  }
  return "none";
}

export function sanitizePassiveKeys(passiveKeys: string[] | null | undefined): ShmupPassiveKey[] {
  if (!passiveKeys || passiveKeys.length === 0) return [];
  const cleaned: ShmupPassiveKey[] = [];
  for (const key of passiveKeys) {
    if (PASSIVE_KEYS.has(key as ShmupPassiveKey)) {
      cleaned.push(key as ShmupPassiveKey);
    }
  }
  return cleaned;
}
