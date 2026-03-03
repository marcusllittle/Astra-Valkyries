import { useState } from "react";

interface CardArtProps {
  artUrl?: string;
  placeholder: string;
  label: string;
  className?: string;
}

export default function CardArt({
  artUrl,
  placeholder,
  label,
  className = "",
}: CardArtProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(artUrl) && failedUrl !== artUrl;

  return (
    <div
      className={`card-art ${className}`.trim()}
      style={showImage ? undefined : { background: placeholder }}
    >
      {showImage ? (
        <img
          src={artUrl}
          alt={label}
          className="card-art-image"
          loading="lazy"
          onError={() => setFailedUrl(artUrl ?? null)}
        />
      ) : (
        <span className="card-art-label">{label}</span>
      )}
    </div>
  );
}
