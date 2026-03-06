const PRIMARY_NAMES: Record<string, string> = {
  standard: "Standard Burst",
  flare_lance: "Flare Lance",
  lunar_stream: "Lunar Stream",
  surge_arc: "Surge Arc",
  starfall_rail: "Starfall Rail",
  aurora_harmonics: "Aurora Harmonics",
  void_rake: "Void Rake",
  photon_laser: "Photon Laser",
  homing_missiles: "Homing Missiles",
};

const SECONDARY_NAMES: Record<string, string> = {
  none: "No Secondary",
  bomb: "Bomb Launcher",
  shieldPulse: "Shield Pulse",
  barrier: "Aegis Barrier",
  emp: "EMP Burst",
  drones: "Support Drones",
  crystalBomb: "Crystal Bomb",
};

const PASSIVE_NAMES: Record<string, string> = {
  smallerHitbox: "Compact Hitbox",
  overdriveLoop: "Overdrive Loop",
  precisionRoute: "Precision Route",
  aggressiveRoute: "Aggressive Route",
  extraShield: "Extra Shield",
  shieldRegen: "Shield Regen",
};

export function primaryName(primaryKey: string | null | undefined): string {
  if (!primaryKey) return PRIMARY_NAMES.standard;
  return PRIMARY_NAMES[primaryKey] ?? "Unknown Primary";
}

export function secondaryName(secondaryKey: string | null | undefined): string {
  if (!secondaryKey) return SECONDARY_NAMES.none;
  return SECONDARY_NAMES[secondaryKey] ?? "Unknown Secondary";
}

export function passiveName(passiveKey: string | null | undefined): string {
  if (!passiveKey) return "Unknown Passive";
  return PASSIVE_NAMES[passiveKey] ?? "Unknown Passive";
}

export function passiveNames(passiveKeys: string[]): string[] {
  return passiveKeys.map((key) => passiveName(key));
}
