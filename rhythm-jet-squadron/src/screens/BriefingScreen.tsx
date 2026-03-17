import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DIALOGUE_SCRIPTS, type DialogueNode, type DialogueScript } from "../data/dialogues";
import DialogueBox from "../components/DialogueBox";

export default function BriefingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scriptId, returnTo } = (location.state as { scriptId?: string; returnTo?: string }) ?? {};

  const script = DIALOGUE_SCRIPTS.find(s => s.id === scriptId);
  const [currentNodeId, setCurrentNodeId] = useState(script?.startNodeId ?? "");
  const [lineIndex, setLineIndex] = useState(0);

  const currentNode = script?.nodes.find(n => n.id === currentNodeId);

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
      navigate(returnTo ?? "/shmup", { replace: true, state: location.state });
    }
  }, [currentNode, lineIndex, navigate, returnTo, location.state]);

  const handleChoice = useCallback((nextNodeId: string) => {
    setCurrentNodeId(nextNodeId);
    setLineIndex(0);
  }, []);

  const handleSkip = useCallback(() => {
    navigate(returnTo ?? "/shmup", { replace: true, state: location.state });
  }, [navigate, returnTo, location.state]);

  if (!script || !currentNode) {
    // No script found, go to destination
    navigate(returnTo ?? "/shmup", { replace: true, state: location.state });
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
      }}>
        {line?.portrait ? (
          <img src={line.portrait} alt={line.speaker} style={{
            maxHeight: "60%", objectFit: "contain", opacity: 0.9,
            filter: "drop-shadow(0 0 20px rgba(102,217,239,0.3))",
          }} />
        ) : (
          <div style={{
            width: "180px", height: "240px", borderRadius: "8px",
            background: "rgba(102,217,239,0.1)", border: "1px solid rgba(102,217,239,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(102,217,239,0.4)", fontFamily: "monospace", fontSize: "14px",
            textAlign: "center", padding: "12px",
          }}>
            {line?.speaker ?? "???"}
          </div>
        )}
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
