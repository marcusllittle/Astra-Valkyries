export type ShmupPrimaryKey =
  | "standard"
  | "flare_lance"
  | "lunar_stream"
  | "surge_arc"
  | "starfall_rail"
  | "aurora_harmonics"
  | "void_rake"
  | "photon_laser"
  | "homing_missiles";

export type ShmupSecondaryKey =
  | "none"
  | "bomb"
  | "shieldPulse"
  | "barrier"
  | "emp"
  | "drones"
  | "crystalBomb";

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
  };
} = {
  primaries: {
    standard: {
      baseFireInterval: 0.15,
      overdriveFireInterval: 0.1,
      damage: 1.08,
      speed: 620,
      radius: 4,
      length: 15,
      life: 1.6,
      color: "#74c0fc",
      coreColor: "#f8f9fa",
    },
    flare_lance: {
      baseFireInterval: 0.24,
      overdriveFireInterval: 0.17,
      damage: 2.2,
      speed: 860,
      radius: 3.8,
      length: 26,
      life: 1.45,
      color: "#ff9f43",
      coreColor: "#fff4d9",
    },
    lunar_stream: {
      baseFireInterval: 0.095,
      overdriveFireInterval: 0.068,
      damage: 0.8,
      speed: 560,
      radius: 3.6,
      length: 13,
      life: 1.85,
      color: "#8e7dff",
      coreColor: "#ebe7ff",
    },
    surge_arc: {
      baseFireInterval: 0.17,
      overdriveFireInterval: 0.12,
      damage: 1.1,
      speed: 560,
      radius: 4.1,
      length: 15,
      life: 1.75,
      color: "#ff5ca8",
      coreColor: "#ffe4f3",
    },
    starfall_rail: {
      baseFireInterval: 0.26,
      overdriveFireInterval: 0.18,
      damage: 2.45,
      speed: 980,
      radius: 3.4,
      length: 28,
      life: 1.15,
      color: "#4dd4ff",
      coreColor: "#e6f9ff",
    },
    aurora_harmonics: {
      baseFireInterval: 0.14,
      overdriveFireInterval: 0.096,
      damage: 1.18,
      speed: 660,
      radius: 5.2,
      length: 17,
      life: 1.85,
      color: "#67ffd4",
      coreColor: "#ebfff8",
    },
    void_rake: {
      baseFireInterval: 0.22,
      overdriveFireInterval: 0.15,
      damage: 1.45,
      speed: 430,
      radius: 4.8,
      length: 16,
      life: 1.5,
      color: "#b494ff",
      coreColor: "#f3ebff",
    },
    photon_laser: {
      baseFireInterval: 0.09,
      overdriveFireInterval: 0.06,
      damage: 0.95,
      speed: 980,
      radius: 4,
      length: 34,
      life: 0.95,
      color: "#d0bfff",
      coreColor: "#f8f0ff",
    },
    homing_missiles: {
      baseFireInterval: 0.24,
      overdriveFireInterval: 0.17,
      damage: 1.5,
      speed: 420,
      radius: 4.8,
      length: 13,
      life: 2,
      color: "#ffd58a",
      coreColor: "#fff8db",
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
      cooldownMs: 4200,
      durationMs: 0,
      usesCharges: false,
    },
    barrier: {
      cooldownMs: 9200,
      durationMs: 3000,
      usesCharges: false,
    },
    emp: {
      cooldownMs: 7600,
      durationMs: 2200,
      usesCharges: false,
    },
    drones: {
      cooldownMs: 11500,
      durationMs: 10000,
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
    droneFireInterval: 0.24,
    droneDamage: 0.75,
    droneShotSpeed: 700,
    crystalFreezeMs: 1500,
    crystalShatterRadius: 172,
    crystalShatterEnemyDamage: 6,
    crystalShatterBossDamage: 25,
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
