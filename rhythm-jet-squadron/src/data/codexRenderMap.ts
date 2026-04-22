export const CODEX_RENDER_OVERRIDES: Record<string, string> = {
  "lore-aegis": "/assets/bosses/abyss-crown-splash.png",
  "lore-helios": "/assets/cutins/scenes/solar_rift_briefing.png",
  "lore-cryo": "/assets/bosses/abyss-crown-concept.png",
  "lore-drifter": "/assets/enemies/light/drifter-concept.png",
  "lore-tank": "/assets/enemies/miniboss/warden-concept.png",
  "lore-dreadnought-enemy": "/assets/bosses/abyss-crown-gameplay.png",
  "lore-valkyrie": "/assets/cutins/scenes/nebula_runway_briefing.png",
  "lore-void-collective": "/assets/bosses/abyss-crown-concept.png",
};

export function getCodexRenderOverride(loreId: string): string | undefined {
  return CODEX_RENDER_OVERRIDES[loreId];
}
