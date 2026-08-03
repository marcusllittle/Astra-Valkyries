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
  | "overcharge"
  // Nova's signature kit
  | "chronoLock"
  | "novaBurst"
  | "blinkLance"
  | "riposte"
  // Rex: the ex-racer. Speed as a weapon, kills that feed kills.
  | "afterburn"
  | "detonationChain"
  // Yuki: electronic warfare and precision execution.
  | "systemHijack"
  | "zeroPoint"
  | "temporalEcho"
  | "superbloom"
  | "starfallSwarm"
  | "decoyBurn"
  | "tideGuard";

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
    chronoLockMs: number;
    chronoBankMax: number;
    chronoReleaseSpeed: number;
    chronoBankDamageMult: number;
    /** Blast area as a fraction of the actual viewport, not a fixed radius. */
    novaBurstScreenFraction: number;
    novaBurstDamage: number;
    novaBurstBossDamage: number;
    blinkLanceDistance: number;
    blinkLanceCorridor: number;
    blinkLanceDamage: number;
    blinkLanceBossDamage: number;
    riposteReturnDamage: number;
    riposteMaxHeld: number;
    afterburnMs: number;
    afterburnSpeedMult: number;
    afterburnRamDamage: number;
    afterburnRamBossDamage: number;
    afterburnTrailDamage: number;
    detonationChainRadius: number;
    detonationChainDamage: number;
    detonationChainBossDamage: number;
    detonationChainMaxLinks: number;
    zeroPointMarks: number;
    zeroPointDelayMs: number;
    zeroPointDamage: number;
    zeroPointBossDamage: number;
    echoWindowMs: number;
    echoMaxGhosts: number;
    echoFireInterval: number;
    echoDamage: number;
    superbloomRadius: number;
    superbloomDamage: number;
    superbloomBossDamage: number;
    superbloomGenerations: number;
    superbloomSpread: number;
    superbloomStageMs: number;
    starfallLances: number;
    starfallFireInterval: number;
    starfallShotSpeed: number;
    starfallDamage: number;
    starfallBounces: number;
    decoyLifeMs: number;
    decoyBlastRadius: number;
    decoyDamage: number;
    decoyBossDamage: number;
    tideGuardNodes: number;
    tideGuardNodeHp: number;
    tideGuardMaxCharge: number;
    tideGuardDischarge: number;
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
    temporalEcho: { cooldownMs: 7600, durationMs: 3200, usesCharges: false },
    superbloom: { cooldownMs: 0, durationMs: 0, usesCharges: true, baseCharges: 2, ssrBonusCharges: 2, bonusMaxCharges: 1 },
    starfallSwarm: { cooldownMs: 9000, durationMs: 11000, usesCharges: false },
    decoyBurn: { cooldownMs: 6800, durationMs: 3400, usesCharges: false },
    tideGuard: { cooldownMs: 9600, durationMs: 6000, usesCharges: false },
    afterburn: { cooldownMs: 8200, durationMs: 2600, usesCharges: false },
    detonationChain: { cooldownMs: 0, durationMs: 0, usesCharges: true, baseCharges: 2, ssrBonusCharges: 2, bonusMaxCharges: 1 },
    systemHijack: { cooldownMs: 7400, durationMs: 400, usesCharges: false },
    zeroPoint: { cooldownMs: 8800, durationMs: 700, usesCharges: false },
    barrelRoll: {
      cooldownMs: 1800,
      durationMs: 360,
      usesCharges: false,
    },
    chronoLock: {
      cooldownMs: 9000,
      durationMs: 1900,
      usesCharges: false,
    },
    novaBurst: {
      cooldownMs: 0,
      durationMs: 0,
      usesCharges: true,
      baseCharges: 2,
      ssrBonusCharges: 2,
      bonusMaxCharges: 1,
    },
    blinkLance: {
      cooldownMs: 3600,
      durationMs: 260,
      usesCharges: false,
    },
    riposte: {
      cooldownMs: 6400,
      durationMs: 3200,
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
    chronoLockMs: 1900,
    chronoBankMax: 40,
    chronoReleaseSpeed: 1150,
    chronoBankDamageMult: 1.45,
    novaBurstScreenFraction: 0.26,
    novaBurstDamage: 7,
    novaBurstBossDamage: 30,
    blinkLanceDistance: 340,
    blinkLanceCorridor: 46,
    blinkLanceDamage: 4,
    blinkLanceBossDamage: 16,
    riposteReturnDamage: 2.6,
    riposteMaxHeld: 24,
    afterburnMs: 2600,
    afterburnSpeedMult: 1.85,
    afterburnRamDamage: 6,
    afterburnRamBossDamage: 12,
    afterburnTrailDamage: 1.6,
    detonationChainRadius: 120,
    detonationChainDamage: 5,
    detonationChainBossDamage: 18,
    detonationChainMaxLinks: 8,
    zeroPointMarks: 6,
    zeroPointDelayMs: 700,
    zeroPointDamage: 12,
    zeroPointBossDamage: 34,
    echoWindowMs: 3200,
    echoMaxGhosts: 3,
    echoFireInterval: 0.16,
    echoDamage: 1.1,
    superbloomRadius: 118,
    superbloomDamage: 5,
    superbloomBossDamage: 14,
    superbloomGenerations: 3,
    superbloomSpread: 132,
    superbloomStageMs: 260,
    starfallLances: 4,
    starfallFireInterval: 0.34,
    starfallShotSpeed: 520,
    starfallDamage: 1.5,
    starfallBounces: 3,
    decoyLifeMs: 3400,
    decoyBlastRadius: 128,
    decoyDamage: 5,
    decoyBossDamage: 14,
    tideGuardNodes: 6,
    tideGuardNodeHp: 4,
    tideGuardMaxCharge: 18,
    tideGuardDischarge: 1.4,
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
