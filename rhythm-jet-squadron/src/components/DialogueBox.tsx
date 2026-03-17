import { useState, useEffect, useRef } from "react";
import type { DialogueLine, DialogueChoice } from "../data/dialogues";

interface DialogueBoxProps {
  line: DialogueLine;
  onNext: () => void;
  choices?: DialogueChoice[];
  onChoice?: (nextNodeId: string) => void;
}

const TYPEWRITER_SPEED = 30; // ms per character

export default function DialogueBox({ line, onNext, choices, onChoice }: DialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    let charIndex = 0;
    intervalRef.current = window.setInterval(() => {
      charIndex++;
      setDisplayedText(line.text.slice(0, charIndex));
      if (charIndex >= line.text.length) {
        setIsComplete(true);
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      }
    }, TYPEWRITER_SPEED);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [line.text]);

  const handleClick = () => {
    if (!isComplete) {
      // Skip typewriter
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setDisplayedText(line.text);
      setIsComplete(true);
      return;
    }
    if (choices && choices.length > 0) return; // wait for choice
    onNext();
  };

  return (
    <div onClick={handleClick} style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7))",
      padding: "20px 24px 28px", cursor: "pointer", minHeight: "140px",
      borderTop: "1px solid rgba(102,217,239,0.3)",
    }}>
      <div style={{
        color: "#66d9ef", fontSize: "13px", fontWeight: "bold",
        textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px",
        fontFamily: "monospace",
      }}>
        {line.speaker}
      </div>
      <div style={{
        color: "#e0e0e0", fontSize: "16px", lineHeight: "1.6",
        fontFamily: "monospace", minHeight: "48px",
      }}>
        {displayedText}
        {!isComplete && <span style={{ opacity: 0.5 }}>&#x2588;</span>}
      </div>
      {isComplete && choices && choices.length > 0 && (
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          {choices.map((choice) => (
            <button key={choice.nextNodeId} onClick={(e) => {
              e.stopPropagation();
              onChoice?.(choice.nextNodeId);
            }} style={{
              background: "rgba(102,217,239,0.15)", border: "1px solid rgba(102,217,239,0.4)",
              color: "#66d9ef", padding: "8px 20px", borderRadius: "4px", cursor: "pointer",
              fontFamily: "monospace", fontSize: "14px",
            }}>
              {choice.label}
            </button>
          ))}
        </div>
      )}
      {isComplete && (!choices || choices.length === 0) && (
        <div style={{
          position: "absolute", bottom: "12px", right: "20px",
          color: "rgba(102,217,239,0.6)", fontSize: "12px", fontFamily: "monospace",
          animation: "pulse 1.5s ease-in-out infinite",
        }}>
          &#x25B6; TAP TO CONTINUE
        </div>
      )}
    </div>
  );
}
