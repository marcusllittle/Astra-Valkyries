import { useEffect, useState } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";

interface AmbientRenderLoopProps {
  src: string;
  poster: string;
  className?: string;
}

function getReducedMotionPreference(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AmbientRenderLoop({
  src,
  poster,
  className = "",
}: AmbientRenderLoopProps) {
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const resolvedSrc = resolveAssetUrl(src) ?? src;
  const resolvedPoster = resolveAssetUrl(poster) ?? poster;
  const videoFailed = failedSrc === resolvedSrc;
  const videoReady = readySrc === resolvedSrc;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  return (
    <div className={`ambient-render-loop ${className}`.trim()} aria-hidden="true">
      <img className="ambient-render-loop-poster" src={resolvedPoster} alt="" />
      {!reducedMotion && !videoFailed && (
        <video
          className={`ambient-render-loop-video ${videoReady ? "is-ready" : ""}`}
          src={resolvedSrc}
          poster={resolvedPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          onPlaying={() => setReadySrc(resolvedSrc)}
          onError={() => setFailedSrc(resolvedSrc)}
        />
      )}
    </div>
  );
}
