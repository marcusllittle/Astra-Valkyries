import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => {
      onComplete();
    });
  }, [src, onComplete]);

  return (
    <div
      className={`cutin-overlay ${allowPointerThrough ? "cutin-overlay-pass-through" : ""}`.trim()}
    >
      <video
        ref={videoRef}
        className="cutin-video"
        src={src}
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
