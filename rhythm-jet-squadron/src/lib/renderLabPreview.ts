import type { RenderLabCandidateEntry } from "../generated/renderLabPreviewCatalog";
import { resolveAssetUrl } from "./assetUrl";

export type RenderLabMode = "current" | "all" | "custom";
export type RenderLabOverrides = Readonly<Record<string, boolean>>;

export const RENDER_LAB_MODE_KEY = "astra.renderLab.previewMode";
export const RENDER_LAB_OVERRIDES_KEY = "astra.renderLab.overrides";

export const isRenderLabBuild =
  import.meta.env.DEV && import.meta.env.VITE_RENDERLAB_PREVIEW === "true";

export function shouldUseRenderLabCandidate(
  mode: RenderLabMode,
  id: string,
  overrides: RenderLabOverrides,
  previewEnabled = isRenderLabBuild,
): boolean {
  if (!previewEnabled || mode === "current") return false;
  if (mode === "all") return true;
  return overrides[id] === true;
}

export function resolveRenderLabCandidate(entry: RenderLabCandidateEntry) {
  return {
    candidateSrc: entry.candidate
      ? resolveAssetUrl(entry.candidate) ?? entry.candidate
      : undefined,
    fallbackSrc: entry.fallback
      ? resolveAssetUrl(entry.fallback) ?? entry.fallback
      : undefined,
    poster: entry.poster
      ? resolveAssetUrl(entry.poster) ?? entry.poster
      : undefined,
  };
}

export function readRenderLabMode(): RenderLabMode {
  if (!isRenderLabBuild || typeof window === "undefined") return "current";
  const stored = window.localStorage.getItem(RENDER_LAB_MODE_KEY);
  return stored === "all" || stored === "custom" || stored === "current"
    ? stored
    : "current";
}

export function readRenderLabOverrides(): Record<string, boolean> {
  if (!isRenderLabBuild || typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RENDER_LAB_OVERRIDES_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
