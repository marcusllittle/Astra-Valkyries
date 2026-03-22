import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveAssetUrl } from "../lib/assetUrl";

interface VideoCutsceneLocationState {
  videoUrl?: string;
  returnTo?: string;
}

export default function VideoCutsceneScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { videoUrl, returnTo } = (location.state as VideoCutsceneLocationState) ?? {};
  const resolvedVideoUrl = resolveAssetUrl(videoUrl);
  const destination = returnTo ?? "/";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const handleComplete = useCallback(() => {
    navigate(destination, { replace: true });
  }, [destination, navigate]);

  useEffect(() => {
    if (!resolvedVideoUrl) {
      handleComplete();
    }
  }, [handleComplete, resolvedVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl) {
      setNeedsAudioUnlock(false);
      return;
    }

    let cancelled = false;

    const startPlayback = async () => {
      try {
        video.currentTime = 0;
        video.muted = false;
        video.volume = 1;
        await video.play();
        if (!cancelled) {
          setNeedsAudioUnlock(false);
        }
      } catch {
        video.muted = true;
        try {
          await video.play();
        } catch {
          // User interaction fallback below.
        }
        if (!cancelled) {
          setNeedsAudioUnlock(true);
        }
      }
    };

    void startPlayback();

    return () => {
      cancelled = true;
    };
  }, [resolvedVideoUrl]);

  const handleEnableSound = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;
    await video.play();
    setNeedsAudioUnlock(false);
  }, []);

  if (!resolvedVideoUrl) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#02040c",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        key={resolvedVideoUrl}
        src={resolvedVideoUrl}
        autoPlay
        playsInline
        preload="auto"
        onEnded={handleComplete}
        onError={handleComplete}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(2,4,12,0.18) 0%, rgba(2,4,12,0.48) 100%)",
        }}
      />

      <button
        onClick={handleComplete}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 1,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.24)",
          color: "rgba(255,255,255,0.76)",
          padding: "6px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "12px",
          letterSpacing: "0.08em",
        }}
      >
        SKIP
      </button>

      {needsAudioUnlock && (
        <button
          onClick={() => {
            void handleEnableSound();
          }}
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 1,
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.24)",
            color: "rgba(255,255,255,0.88)",
            padding: "6px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "12px",
            letterSpacing: "0.08em",
          }}
        >
          SOUND ON
        </button>
      )}
    </div>
  );
}
