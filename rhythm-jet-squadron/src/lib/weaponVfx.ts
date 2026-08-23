import type { Outfit, ShmupKit } from "../types";

export type WeaponVfxTier = "common" | "rare" | "sr" | "ssr";
export type WeaponVfxFamily = "lance" | "pulse" | "blade" | "missile";
export type WeaponProjectileSpriteKey = `weapon_${WeaponVfxFamily}_${WeaponVfxTier}`;

export type WeaponVfxProfile = {
  tier: WeaponVfxTier;
  family: WeaponVfxFamily;
  spriteKey: WeaponProjectileSpriteKey;
  coreLengthScale: number;
  coreWidthScale: number;
  trailLayers: number;
  trailLengthScale: number;
  trailWidthScale: number;
  trailAlpha: number;
  glow: number;
  muzzleScale: number;
  impactScale: number;
};

export const WEAPON_PROJECTILE_ASSET_PATHS: Record<WeaponProjectileSpriteKey, string> = Object.fromEntries(
  (["lance", "pulse", "blade", "missile"] as const).flatMap((family) =>
    (["common", "rare", "sr", "ssr"] as const).map((tier) => [
      `weapon_${family}_${tier}` as WeaponProjectileSpriteKey,
      `/assets/shmup/blender-vfx/weapon_${family}_${tier}.png`,
    ]),
  ),
) as Record<WeaponProjectileSpriteKey, string>;

export function weaponFamilyForPrimary(primary: ShmupKit["primary"] | null | undefined): WeaponVfxFamily {
  switch (primary) {
    case "flare_lance":
    case "starfall_rail":
    case "photon_laser":
    case "blazing_laser":
      return "lance";
    case "void_rake":
      return "blade";
    case "homing_missiles":
      return "missile";
    case "lunar_stream":
    case "surge_arc":
    case "aurora_harmonics":
    case "standard":
    default:
      return "pulse";
  }
}

export function weaponTierForRarity(rarity: Outfit["rarity"] | null | undefined): WeaponVfxTier {
  switch (rarity) {
    case "SSR":
      return "ssr";
    case "SR":
      return "sr";
    case "Rare":
      return "rare";
    case "Common":
    default:
      return "common";
  }
}

export function resolveWeaponVfx(
  rarity: Outfit["rarity"] | null | undefined,
  stars: number | null | undefined,
  primary: ShmupKit["primary"] | null | undefined,
): WeaponVfxProfile {
  const tier = weaponTierForRarity(rarity);
  const family = weaponFamilyForPrimary(primary);
  const safeStars = Number.isFinite(stars) ? Math.max(1, Math.min(5, Math.floor(stars ?? 1))) : 1;
  const starPolish = (safeStars - 1) * 0.018;
  const tierValues: Record<WeaponVfxTier, Omit<WeaponVfxProfile, "tier" | "family" | "spriteKey">> = {
    common: {
      coreLengthScale: 1,
      coreWidthScale: 1,
      trailLayers: 0,
      trailLengthScale: 0,
      trailWidthScale: 0,
      trailAlpha: 0,
      glow: 8,
      muzzleScale: 0.72,
      impactScale: 0.72,
    },
    rare: {
      coreLengthScale: 1.08,
      coreWidthScale: 1.16,
      trailLayers: 1,
      trailLengthScale: 1,
      trailWidthScale: 1,
      trailAlpha: 0.28,
      glow: 12,
      muzzleScale: 0.92,
      impactScale: 0.92,
    },
    sr: {
      coreLengthScale: 1.16,
      coreWidthScale: 1.36,
      trailLayers: 1,
      trailLengthScale: 1.28,
      trailWidthScale: 1.18,
      trailAlpha: 0.38,
      glow: 17,
      muzzleScale: 1.14,
      impactScale: 1.18,
    },
    ssr: {
      coreLengthScale: 1.24,
      coreWidthScale: 1.62,
      trailLayers: 2,
      trailLengthScale: 1.58,
      trailWidthScale: 1.38,
      trailAlpha: 0.48,
      glow: 23,
      muzzleScale: 1.42,
      impactScale: 1.52,
    },
  };
  const values = tierValues[tier];

  return {
    tier,
    family,
    spriteKey: `weapon_${family}_${tier}`,
    ...values,
    coreLengthScale: values.coreLengthScale + starPolish,
    coreWidthScale: values.coreWidthScale + starPolish * 1.4,
    muzzleScale: values.muzzleScale + starPolish,
    impactScale: values.impactScale + starPolish,
  };
}
