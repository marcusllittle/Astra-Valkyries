import { useState } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";

interface CardArtProps {
  title: string;
  artUrl?: string;
  artPlaceholder: string;
  rarity?: string;
  className?: string;
}

function isVideoUrl(url: string): boolean {
  return /\.mp4$/i.test(url);
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
  const showMedia = Boolean(resolvedArtUrl) && failedUrl !== resolvedArtUrl;
  const isVideo = resolvedArtUrl ? isVideoUrl(resolvedArtUrl) : false;

  return (
    <div
      className={`card-art ${className}`.trim()}
      style={{ background: artPlaceholder }}
      data-rarity={rarity?.toLowerCase()}
    >
      {showMedia ? (
        isVideo ? (
          <video
            src={resolvedArtUrl}
            className="card-art-img"
            autoPlay
            loop
            muted
            playsInline
            onError={() => setFailedUrl(resolvedArtUrl ?? null)}
          />
        ) : (
          <img
            src={resolvedArtUrl}
            alt={title}
            className="card-art-img"
            loading="lazy"
            onError={() => setFailedUrl(resolvedArtUrl ?? null)}
          />
        )
      ) : (
        <span className="card-art-label">{title}</span>
      )}
    </div>
  );
}
