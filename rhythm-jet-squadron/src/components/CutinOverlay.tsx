import { useEffect, useRef } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";

interface CutinOverlayProps {
  src: string;
  onComplete: () => void;
  allowPointerThrough?: boolean;
}

export default function CutinOverlay({
  src,
  onComplete,
  allowPointerThrough = false,
}: CutinOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resolvedSrc = resolveAssetUrl(src) ?? src;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => {
      onComplete();
    });
  }, [resolvedSrc, onComplete]);

  return (
    <div
      className={`cutin-overlay ${allowPointerThrough ? "cutin-overlay-pass-through" : ""}`.trim()}
    >
      <video
        ref={videoRef}
        className="cutin-video"
        src={resolvedSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={onComplete}
        onError={onComplete}
      />
    </div>
  );
}
