import {
  renderMediaCatalog,
  type GeneratedRenderMediaEntry,
} from "../generated/renderMediaCatalog";
import { resolveAssetUrl } from "./assetUrl";

export interface RenderMediaSource {
  kind: string;
  src: string;
  fallbackSrc?: string;
  poster?: string;
  usesHd: boolean;
}

export function resolveRenderMediaEntry(
  entry: GeneratedRenderMediaEntry,
  preferHd = true,
): RenderMediaSource {
  const hd = resolveAssetUrl(entry.hd) ?? entry.hd;
  const fallback = resolveAssetUrl(entry.fallback) ?? entry.fallback;
  const poster = resolveAssetUrl(entry.poster);

  if (!preferHd) {
    return { kind: entry.kind, src: fallback, poster, usesHd: false };
  }

  return {
    kind: entry.kind,
    src: hd,
    fallbackSrc: fallback,
    poster,
    usesHd: true,
  };
}

export function getApprovedRenderMedia(
  id: string,
  options: { preferHd?: boolean } = {},
): RenderMediaSource | undefined {
  const entry = renderMediaCatalog[id];
  if (!entry) return undefined;
  return resolveRenderMediaEntry(entry, options.preferHd ?? true);
}
