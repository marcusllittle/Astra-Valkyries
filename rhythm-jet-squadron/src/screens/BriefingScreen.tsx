import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DIALOGUE_SCRIPTS, getDialogueForMap } from "../data/dialogues";
import DialogueBox from "../components/DialogueBox";
import { useGame } from "../context/GameContext";
import { resolveAssetUrl } from "../lib/assetUrl";

interface BriefingLocationState {
  scriptId?: string;
  returnTo?: string;
}

export default function BriefingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { save } = useGame();
  const { scriptId, returnTo } = (location.state as BriefingLocationState) ?? {};

  const script = useMemo(() => {
    if (scriptId) return DIALOGUE_SCRIPTS.find((entry) => entry.id === scriptId);
    if (save.selectedMapId) {
      return getDialogueForMap(save.selectedMapId, "pre_mission");
    }
    return DIALOGUE_SCRIPTS.find((entry) => entry.trigger === "pre_mission");
  }, [save.selectedMapId, scriptId]);

  const resolvedVideoUrl = resolveAssetUrl(script?.videoUrl);
  const directRoute = script?.nextRoute ?? returnTo ?? "/shmup";
  const videoReturnTo = script?.nextRoute ?? "/shmup";
  const [currentNodeId, setCurrentNodeId] = useState(script?.startNodeId ?? "");
  const [lineIndex, setLineIndex] = useState(0);

  const currentNode = script?.nodes.find(n => n.id === currentNodeId);

  useEffect(() => {
    setCurrentNodeId(script?.startNodeId ?? "");
    setLineIndex(0);
  }, [script?.id]);

  const navigateAfterDialogue = useCallback(() => {
    if (script?.nextVideoUrl) {
      navigate("/video-cutscene", {
        replace: true,
        state: {
          videoUrl: script.nextVideoUrl,
          returnTo: videoReturnTo,
        },
      });
      return;
    }

    navigate(directRoute, { replace: true });
  }, [directRoute, navigate, script?.nextVideoUrl, videoReturnTo]);

  useEffect(() => {
    if (!script) {
      navigate(directRoute, { replace: true });
    }
  }, [directRoute, navigate, script]);

  const handleNext = useCallback(() => {
    if (!currentNode) return;
    if (lineIndex < currentNode.lines.length - 1) {
      setLineIndex(prev => prev + 1);
      return;
    }
    // End of lines in this node
    if (currentNode.nextNodeId) {
      setCurrentNodeId(currentNode.nextNodeId);
      setLineIndex(0);
    } else {
      // End of dialogue
      navigateAfterDialogue();
    }
  }, [currentNode, lineIndex, navigateAfterDialogue]);

  const handleChoice = useCallback((nextNodeId: string) => {
    setCurrentNodeId(nextNodeId);
    setLineIndex(0);
  }, []);

  const handleSkip = useCallback(() => {
    navigateAfterDialogue();
  }, [navigateAfterDialogue]);

  if (!script || !currentNode) {
    return null;
  }

  const line = currentNode.lines[lineIndex];
  const isLastLine = lineIndex === currentNode.lines.length - 1;
  const showChoices = isLastLine && currentNode.choices && currentNode.choices.length > 0;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#040612",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      {resolvedVideoUrl && (
        <video
          key={resolvedVideoUrl}
          src={resolvedVideoUrl}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {resolvedVideoUrl && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(2,4,12,0.28) 0%, rgba(2,4,12,0.52) 45%, rgba(2,4,12,0.82) 100%)",
        }} />
      )}

      {/* Background starfield effect */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(54,138,255,0.08) 0%, transparent 60%)",
      }} />

      {/* Portrait area */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: line?.position === "right" ? "flex-end" : "flex-start",
        padding: "0 40px",
        position: "relative",
        zIndex: 1,
      }}>
        {line?.portrait ? (
          <img src={line.portrait} alt={line.speaker} style={{
            maxHeight: "60%", objectFit: "contain", opacity: 0.9,
            filter: "drop-shadow(0 0 20px rgba(102,217,239,0.3))",
          }} />
        ) : !resolvedVideoUrl ? (
          <div style={{
            width: "180px", height: "240px", borderRadius: "8px",
            background: "rgba(102,217,239,0.1)", border: "1px solid rgba(102,217,239,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(102,217,239,0.4)", fontFamily: "monospace", fontSize: "14px",
            textAlign: "center", padding: "12px",
          }}>
            {line?.speaker ?? "???"}
          </div>
        ) : null}
      </div>

      {/* Skip button */}
      <button onClick={handleSkip} style={{
        position: "absolute", top: "16px", right: "16px", zIndex: 10,
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
        color: "rgba(255,255,255,0.6)", padding: "6px 16px", borderRadius: "4px",
        cursor: "pointer", fontFamily: "monospace", fontSize: "12px",
      }}>
        SKIP &#x25B6;&#x25B6;
      </button>

      {/* Dialogue box */}
      {line && (
        <DialogueBox
          line={line}
          onNext={handleNext}
          choices={showChoices ? currentNode.choices : undefined}
          onChoice={handleChoice}
        />
      )}
    </div>
  );
}
