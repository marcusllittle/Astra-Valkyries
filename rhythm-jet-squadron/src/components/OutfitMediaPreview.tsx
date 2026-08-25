import { useEffect, useState, type ReactNode } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";
import { summarizeOutfitKit } from "../lib/outfitKits";
import type { Outfit } from "../types";

interface OutfitMediaPreviewProps {
  outfit: Outfit;
  pilotName?: string;
  status: string;
  stars?: number;
  progress?: string;
  action?: ReactNode;
  onClose: () => void;
}

const RARITY_COLORS: Record<Outfit["rarity"], string> = {
  Common: "#a8a8a8",
  Rare: "#339af0",
  SR: "#be4bdb",
  SSR: "#ffd43b",
};

export default function OutfitMediaPreview({ outfit, pilotName, status, stars, progress, action, onClose }: OutfitMediaPreviewProps) {
  const [motionFailed, setMotionFailed] = useState(false);
  const motionUrl = outfit.cutsceneArtUrl
    ? resolveAssetUrl(outfit.cutsceneArtUrl) ?? outfit.cutsceneArtUrl
    : undefined;
  const imageUrl = outfit.artUrl
    ? resolveAssetUrl(outfit.artUrl) ?? outfit.artUrl
    : undefined;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="card-preview-overlay" onClick={onClose}>
      <section
        className="outfit-media-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outfit-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="outfit-media-close" onClick={onClose} aria-label="Close outfit preview">
          &times;
        </button>

        <div className="outfit-media-stage" style={{ background: outfit.artPlaceholder }}>
          {motionUrl && !motionFailed ? (
            <video
              key={motionUrl}
              className="outfit-media-visual"
              src={motionUrl}
              poster={imageUrl}
              autoPlay
              muted
              loop
              playsInline
              onError={() => setMotionFailed(true)}
            />
          ) : imageUrl ? (
            <img className="outfit-media-visual" src={imageUrl} alt={outfit.name} />
          ) : (
            <span className="outfit-media-fallback">{outfit.name}</span>
          )}
          <div className="outfit-media-grade" style={{ color: RARITY_COLORS[outfit.rarity] }}>
            {outfit.rarity}
          </div>
        </div>

        <div className="outfit-media-details">
          <div className="outfit-media-heading">
            <span>{pilotName ?? "Pilot Loadout"}</span>
            <h3 id="outfit-preview-title">{outfit.name}</h3>
            <p>{status}</p>
          </div>
          <div className="outfit-media-readout">
            <span>Combat system</span>
            <strong>{summarizeOutfitKit(outfit)}</strong>
          </div>
          {stars !== undefined && (
            <div className="outfit-media-readout">
              <span>Calibration</span>
              <strong aria-label={`${stars} of 5 stars`}>
                {"★".repeat(stars)}{"☆".repeat(5 - stars)}
              </strong>
            </div>
          )}
          {progress && (
            <div className="outfit-media-readout">
              <span>Upgrade progress</span>
              <strong>{progress}</strong>
            </div>
          )}
          {action && <div className="outfit-media-actions">{action}</div>}
        </div>
      </section>
    </div>
  );
}
