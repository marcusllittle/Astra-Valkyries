import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";

interface CardArtProps {
  title: string;
  artUrl?: string;
  motionArtUrl?: string;
  artPlaceholder: string;
  rarity?: string;
  className?: string;
  motionMode?: "auto" | "hold" | "never";
}

function isVideoUrl(url: string): boolean {
  return /\.mp4$/i.test(url);
}

export default function CardArt({
  title,
  artUrl,
  motionArtUrl,
  artPlaceholder,
  rarity,
  className = "",
  motionMode = "never",
}: CardArtProps) {
  const holdDelayMs = 150;
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [failedMotionUrl, setFailedMotionUrl] = useState<string | null>(null);
  const [holdingMotion, setHoldingMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const resolvedArtUrl = artUrl ? resolveAssetUrl(artUrl) ?? artUrl : undefined;
  const resolvedMotionArtUrl = motionArtUrl
    ? resolveAssetUrl(motionArtUrl) ?? motionArtUrl
    : undefined;
  const fallbackMotionArtUrl =
    !resolvedMotionArtUrl && resolvedArtUrl && isVideoUrl(resolvedArtUrl)
      ? resolvedArtUrl
      : undefined;
  const imageUrl =
    resolvedArtUrl && !isVideoUrl(resolvedArtUrl) && failedImageUrl !== resolvedArtUrl
      ? resolvedArtUrl
      : undefined;
  const motionUrl = [resolvedMotionArtUrl, fallbackMotionArtUrl].find(
    (url) => Boolean(url) && failedMotionUrl !== url,
  );
  const shouldPlayMotion =
    Boolean(motionUrl) &&
    (motionMode === "auto" || (motionMode === "hold" && holdingMotion));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!shouldPlayMotion) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    video.currentTime = 0;
    void video.play().catch(() => {
      setFailedMotionUrl(motionUrl ?? null);
      setHoldingMotion(false);
    });
  }, [motionUrl, shouldPlayMotion]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const startMotionHold = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (motionMode !== "hold" || !motionUrl) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(() => {
      setHoldingMotion(true);
      holdTimerRef.current = null;
    }, holdDelayMs);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const stopMotionHold = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (motionMode !== "hold") return;
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setHoldingMotion(false);
  };

  return (
    <div
      className={`card-art ${className}`.trim()}
      style={{ background: artPlaceholder }}
      data-rarity={rarity?.toLowerCase()}
      onPointerDown={startMotionHold}
      onPointerUp={stopMotionHold}
      onPointerCancel={stopMotionHold}
    >
      {shouldPlayMotion && motionUrl ? (
        <video
          ref={videoRef}
          src={motionUrl}
          className="card-art-img"
          muted
          playsInline
          onEnded={() => setHoldingMotion(false)}
          onError={() => {
            setFailedMotionUrl(motionUrl);
            setHoldingMotion(false);
          }}
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="card-art-img"
          loading="lazy"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        <span className="card-art-label">{title}</span>
      )}
    </div>
  );
}
