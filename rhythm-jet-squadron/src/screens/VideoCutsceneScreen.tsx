import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { resolveAssetUrl } from "../lib/assetUrl";
import type { CinematicClip } from "../lib/missionCinematics";

interface VideoCutsceneLocationState {
  clips?: CinematicClip[];
  videoUrl?: string;
  returnTo?: string;
}

function legacyClip(videoUrl: string): CinematicClip {
  return {
    id: `legacy:${videoUrl}`,
    src: videoUrl,
    eyebrow: "Cinematic",
    title: "Astra Valkyries",
    source: "hybrid",
  };
}

export default function VideoCutsceneScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { markCutsceneSeen } = useGame();
  const state = (location.state as VideoCutsceneLocationState) ?? {};
  const clips = useMemo(() => {
    if (Array.isArray(state.clips) && state.clips.length > 0) return state.clips;
    return state.videoUrl ? [legacyClip(state.videoUrl)] : [];
  }, [state.clips, state.videoUrl]);
  const destination = state.returnTo ?? "/";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clipIndex, setClipIndex] = useState(0);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [failedClipIds, setFailedClipIds] = useState<string[]>([]);
  const activeClip = clips[clipIndex];
  const resolvedVideoUrl = resolveAssetUrl(activeClip?.src);
  const resolvedPoster = resolveAssetUrl(activeClip?.poster);

  const finishSequence = useCallback(() => {
    navigate(destination, { replace: true });
  }, [destination, navigate]);

  const completeClip = useCallback(() => {
    if (!activeClip) {
      finishSequence();
      return;
    }
    markCutsceneSeen(activeClip.id);
    if (clipIndex < clips.length - 1) {
      setClipIndex((current) => current + 1);
    } else {
      finishSequence();
    }
  }, [activeClip, clipIndex, clips.length, finishSequence, markCutsceneSeen]);

  const skipSequence = useCallback(() => {
    clips.forEach((clip) => markCutsceneSeen(clip.id));
    finishSequence();
  }, [clips, finishSequence, markCutsceneSeen]);

  useEffect(() => {
    if (!activeClip || !resolvedVideoUrl) finishSequence();
  }, [activeClip, finishSequence, resolvedVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl) return;
    let cancelled = false;

    const startPlayback = async () => {
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        if (!cancelled) setNeedsAudioUnlock(false);
      } catch {
        video.muted = true;
        try {
          await video.play();
        } catch {
          // The visible controls remain available after blocked autoplay.
        }
        if (!cancelled) setNeedsAudioUnlock(true);
      }
    };

    void startPlayback();
    return () => {
      cancelled = true;
    };
  }, [clipIndex, resolvedVideoUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skipSequence();
      if (event.key === "Enter" || event.key === " ") completeClip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completeClip, skipSequence]);

  const enableSound = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    await video.play();
    setNeedsAudioUnlock(false);
  }, []);

  if (!activeClip || !resolvedVideoUrl) return null;

  return (
    <main className="cinematic-screen" aria-label={activeClip.title}>
      <video
        ref={videoRef}
        key={activeClip.id}
        className="cinematic-media"
        src={resolvedVideoUrl}
        poster={resolvedPoster}
        autoPlay
        playsInline
        preload="auto"
        onEnded={completeClip}
        onError={() => {
          setFailedClipIds((current) => [...current, activeClip.id]);
          completeClip();
        }}
      />
      <div className="cinematic-vignette" aria-hidden="true" />

      <header className="cinematic-header">
        <div className="cinematic-title">
          <span>{activeClip.eyebrow}</span>
          <strong>{activeClip.title}</strong>
        </div>
        <div className="cinematic-controls">
          {needsAudioUnlock ? (
            <button type="button" className="cinematic-control" onClick={() => void enableSound()}>
              SOUND ON
            </button>
          ) : null}
          <button type="button" className="cinematic-control" onClick={skipSequence}>
            SKIP
          </button>
        </div>
      </header>

      <footer className="cinematic-footer">
        <div className="cinematic-segments" aria-label={`Clip ${clipIndex + 1} of ${clips.length}`}>
          {clips.map((clip, index) => (
            <span
              key={clip.id}
              className={index < clipIndex ? "is-complete" : index === clipIndex ? "is-active" : ""}
            />
          ))}
        </div>
        <span className="cinematic-source">
          {failedClipIds.length > 0 ? "Fallback route active" : `${activeClip.source.toUpperCase()} sequence`}
        </span>
      </footer>
    </main>
  );
}
