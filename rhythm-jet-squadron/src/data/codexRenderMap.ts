export const CODEX_RENDER_OVERRIDES: Record<string, string> = {
  "lore-aegis": "/assets/_codex_audit/boss_dreadnought.png",
  "lore-helios": "/assets/cutins/scenes/solar_rift_briefing.png",
  "lore-cryo": "/assets/cutins/scenes/abyss_crown_briefing.png",
  "lore-tank": "/assets/shmup/boss_dreadnought.svg",
  "lore-valkyrie": "/assets/cutins/scenes/nebula_runway_briefing.png",
  "lore-void-collective": "/assets/cutins/scenes/abyss_crown_briefing.png",
};

export function getCodexRenderOverride(loreId: string): string | undefined {
  return CODEX_RENDER_OVERRIDES[loreId];
}
