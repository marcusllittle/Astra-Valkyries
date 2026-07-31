// Curation layer for codex art: map a lore entry id to an image path to
// override that entry's imageUrl (see CodexScreen). Keep this for cases
// where a newer/better render should show without touching lore.ts.
//
// Currently empty: every entry's imageUrl in lore.ts is the best art we
// have — boss/enemy threat records use the actual in-game renders, and
// zone dossiers use the briefing vistas.
export const CODEX_RENDER_OVERRIDES: Record<string, string> = {};

export function getCodexRenderOverride(loreId: string): string | undefined {
  return CODEX_RENDER_OVERRIDES[loreId];
}
