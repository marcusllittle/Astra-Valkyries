import { useEffect, useMemo, useState } from "react";
import type { RenderLabCandidateEntry } from "../generated/renderLabPreviewCatalog";
import { resolveRenderLabCandidate } from "../lib/renderLabPreview";

interface RenderLabMediaProps {
  entry: RenderLabCandidateEntry;
  className?: string;
  decorative?: boolean;
  onSourceChange?: (source: "candidate" | "fallback" | "missing") => void;
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov)(?:[?#]|$)/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|avif|gif)(?:[?#]|$)/i;

export default function RenderLabMedia({
  entry,
  className,
  decorative = false,
  onSourceChange,
}: RenderLabMediaProps) {
  const sources = useMemo(() => resolveRenderLabCandidate(entry), [entry]);
  const candidateIsRenderable = Boolean(
    sources.candidateSrc &&
    (VIDEO_EXTENSIONS.test(sources.candidateSrc) || IMAGE_EXTENSIONS.test(sources.candidateSrc)),
  );
  const [failedCandidate, setFailedCandidate] = useState(!candidateIsRenderable);
  const [failedFallback, setFailedFallback] = useState(false);
  const src = failedCandidate || !candidateIsRenderable ? sources.fallbackSrc : sources.candidateSrc;
  const source = src ? (failedCandidate ? "fallback" : "candidate") : "missing";
  const isRenderable = Boolean(src && (VIDEO_EXTENSIONS.test(src) || IMAGE_EXTENSIONS.test(src)));

  useEffect(() => {
    onSourceChange?.(failedFallback ? "missing" : source);
  }, [failedFallback, onSourceChange, source]);

  if (!src || failedFallback || !isRenderable) return null;

  const fail = () => {
    if (!failedCandidate && sources.fallbackSrc && sources.fallbackSrc !== sources.candidateSrc) {
      setFailedCandidate(true);
    } else {
      setFailedFallback(true);
    }
  };

  const common = {
    className,
    onError: fail,
    "data-renderlab-entry": entry.id,
    "data-renderlab-source": source,
  };

  if (VIDEO_EXTENSIONS.test(src)) {
    return (
      <video
        {...common}
        src={src}
        poster={sources.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={decorative ? undefined : entry.id.replace(/-/g, " ")}
      />
    );
  }

  if (IMAGE_EXTENSIONS.test(src)) {
    return (
      <img
        {...common}
        src={src}
        alt={decorative ? "" : entry.id.replace(/-/g, " ")}
        aria-hidden={decorative || undefined}
      />
    );
  }

  return null;
}
