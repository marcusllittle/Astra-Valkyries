export const CODEX_RENDER_OVERRIDES: Record<string, string> = {
  "lore-aegis": "/assets/codex/renders/aegis_dreadnought_codex.png",
  "lore-helios": "/assets/codex/renders/helios_tyrant_codex.png",
  "lore-cryo": "/assets/codex/renders/cryo_leviathan_codex.png",
  "lore-tank": "/assets/codex/renders/tank_fortress_codex.png",
  "lore-valkyrie": "/assets/codex/renders/valkyrie_squadron_codex.png",
  "lore-void-collective": "/assets/codex/renders/void_collective_codex.png",
};

export function getCodexRenderOverride(loreId: string): string | undefined {
  return CODEX_RENDER_OVERRIDES[loreId];
}
