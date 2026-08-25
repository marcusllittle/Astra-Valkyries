import type { Outfit } from "../types";
import type { ShmupSecondaryKey } from "./shmupBalance";

export type SecondaryVfxKind = "burst" | "shield" | "sigil" | "target";
export type SecondaryVfxSpriteKey = `secondary${Capitalize<SecondaryVfxKind>}`;

export type SecondaryVfxProfile = {
  kind: SecondaryVfxKind;
  spriteKey: SecondaryVfxSpriteKey;
  color: string;
  layers: number;
  scale: number;
  glow: number;
  spin: number;
};

const KIND_BY_SECONDARY: Record<ShmupSecondaryKey, SecondaryVfxKind> = {
  none: "sigil",
  bomb: "burst",
  shieldPulse: "shield",
  barrier: "shield",
  emp: "sigil",
  drones: "target",
  crystalBomb: "burst",
  barrelRoll: "target",
  phaseShift: "sigil",
  vortex: "sigil",
  mirrorShield: "shield",
  overcharge: "burst",
  chronoLock: "sigil",
  novaBurst: "burst",
  blinkLance: "target",
  riposte: "shield",
  afterburn: "burst",
  detonationChain: "burst",
  systemHijack: "sigil",
  zeroPoint: "target",
  temporalEcho: "sigil",
  superbloom: "burst",
  starfallSwarm: "target",
  shadowPulse: "target",
  thunderStrike: "burst",
  decoyBurn: "target",
  tideGuard: "shield",
};

const COLOR_BY_KIND: Record<SecondaryVfxKind, string> = {
  burst: "#ffd43b",
  shield: "#74c0fc",
  sigil: "#b197fc",
  target: "#67e8f9",
};

const RARITY_VALUES: Record<Outfit["rarity"], Pick<SecondaryVfxProfile, "layers" | "scale" | "glow">> = {
  Common: { layers: 1, scale: 0.86, glow: 10 },
  Rare: { layers: 1, scale: 1, glow: 14 },
  SR: { layers: 2, scale: 1.15, glow: 19 },
  SSR: { layers: 3, scale: 1.32, glow: 25 },
};

export const SECONDARY_VFX_ASSET_PATHS: Record<SecondaryVfxSpriteKey, string> = {
  secondaryBurst: "/assets/shmup/blender-vfx/secondary_burst.png",
  secondaryShield: "/assets/shmup/blender-vfx/secondary_shield.png",
  secondarySigil: "/assets/shmup/blender-vfx/secondary_sigil.png",
  secondaryTarget: "/assets/shmup/blender-vfx/secondary_target.png",
};

export function resolveSecondaryVfx(
  secondary: ShmupSecondaryKey,
  rarity: Outfit["rarity"] | null | undefined,
  stars: number | null | undefined,
): SecondaryVfxProfile {
  const kind = KIND_BY_SECONDARY[secondary];
  const tier = RARITY_VALUES[rarity ?? "Common"] ?? RARITY_VALUES.Common;
  const safeStars = Number.isFinite(stars) ? Math.max(1, Math.min(5, Math.floor(stars ?? 1))) : 1;
  const starPolish = (safeStars - 1) * 0.018;
  const spriteKey = `secondary${kind[0].toUpperCase()}${kind.slice(1)}` as SecondaryVfxSpriteKey;

  return {
    kind,
    spriteKey,
    color: COLOR_BY_KIND[kind],
    layers: tier.layers,
    scale: tier.scale + starPolish,
    glow: tier.glow + (safeStars - 1),
    spin: kind === "sigil" ? -1.25 : kind === "target" ? 0.8 : kind === "shield" ? 0.35 : 0,
  };
}
