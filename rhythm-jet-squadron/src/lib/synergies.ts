/** Synergy system - pilot + ship + outfit combo bonuses */

export interface Synergy {
  id: string;
  name: string;
  description: string;
  condition: {
    pilotId?: string;
    shipId?: string;
    outfitRarity?: string;
    outfitId?: string;
  };
  bonus: {
    damagePercent?: number;
    hpBonus?: number;
    scorePercent?: number;
    overdrivePercent?: number;
    speedPercent?: number;
  };
}

export const SYNERGIES: Synergy[] = [
  {
    id: "nova-interceptor",
    name: "Born to Fly",
    description: "Nova + Astra Interceptor: +10% speed, +5% damage",
    condition: { pilotId: "pilot_nova", shipId: "ship_astra_interceptor" },
    bonus: { speedPercent: 10, damagePercent: 5 },
  },
  {
    id: "rex-lancer",
    name: "Iron Lance",
    description: "Rex + Valkyrie Lancer: +15% damage, +1 HP",
    condition: { pilotId: "pilot_rex", shipId: "ship_valkyrie_lancer" },
    bonus: { damagePercent: 15, hpBonus: 1 },
  },
  {
    id: "yuki-seraph",
    name: "Silent Guardian",
    description: "Yuki + Seraph Guard: +10% score, +10% overdrive gain",
    condition: { pilotId: "pilot_yuki", shipId: "ship_seraph_guard" },
    bonus: { scorePercent: 10, overdrivePercent: 10 },
  },
  {
    id: "nova-ssr",
    name: "Ace Custom",
    description: "Nova + SSR outfit: +8% damage, +5% score",
    condition: { pilotId: "pilot_nova", outfitRarity: "SSR" },
    bonus: { damagePercent: 8, scorePercent: 5 },
  },
  {
    id: "rex-ssr",
    name: "Heavy Custom",
    description: "Rex + SSR outfit: +1 HP, +10% damage",
    condition: { pilotId: "pilot_rex", outfitRarity: "SSR" },
    bonus: { hpBonus: 1, damagePercent: 10 },
  },
  {
    id: "yuki-ssr",
    name: "Shadow Custom",
    description: "Yuki + SSR outfit: +15% score, +5% speed",
    condition: { pilotId: "pilot_yuki", outfitRarity: "SSR" },
    bonus: { scorePercent: 15, speedPercent: 5 },
  },
];

export function getActiveSynergies(pilotId: string, shipId: string, outfitRarity?: string, outfitId?: string): Synergy[] {
  return SYNERGIES.filter(synergy => {
    const c = synergy.condition;
    if (c.pilotId && c.pilotId !== pilotId) return false;
    if (c.shipId && c.shipId !== shipId) return false;
    if (c.outfitRarity && c.outfitRarity !== outfitRarity) return false;
    if (c.outfitId && c.outfitId !== outfitId) return false;
    return true;
  });
}

export function aggregateSynergyBonuses(synergies: Synergy[]): {
  damagePercent: number;
  hpBonus: number;
  scorePercent: number;
  overdrivePercent: number;
  speedPercent: number;
} {
  return synergies.reduce((acc, s) => ({
    damagePercent: acc.damagePercent + (s.bonus.damagePercent ?? 0),
    hpBonus: acc.hpBonus + (s.bonus.hpBonus ?? 0),
    scorePercent: acc.scorePercent + (s.bonus.scorePercent ?? 0),
    overdrivePercent: acc.overdrivePercent + (s.bonus.overdrivePercent ?? 0),
    speedPercent: acc.speedPercent + (s.bonus.speedPercent ?? 0),
  }), { damagePercent: 0, hpBonus: 0, scorePercent: 0, overdrivePercent: 0, speedPercent: 0 });
}
