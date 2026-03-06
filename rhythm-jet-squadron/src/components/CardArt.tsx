import { useState } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";

interface CardArtProps {
  title: string;
  artUrl?: string;
  artPlaceholder: string;
  rarity?: string;
  className?: string;
}

export default function CardArt({
  title,
  artUrl,
  artPlaceholder,
  rarity,
  className = "",
}: CardArtProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolvedArtUrl = resolveAssetUrl(artUrl);
  const showImage = Boolean(resolvedArtUrl) && failedUrl !== resolvedArtUrl;

  return (
    <div
      className={`card-art ${className}`.trim()}
      style={{ background: artPlaceholder }}
      data-rarity={rarity?.toLowerCase()}
    >
      {showImage ? (
        <img
          src={resolvedArtUrl}
          alt={title}
          className="card-art-img"
          loading="lazy"
          onError={() => setFailedUrl(resolvedArtUrl ?? null)}
        />
      ) : (
        <span className="card-art-label">{title}</span>
      )}
    </div>
  );
}
