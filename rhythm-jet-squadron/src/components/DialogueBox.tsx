import { useState, useEffect, useRef } from "react";
import type { DialogueLine, DialogueChoice } from "../data/dialogues";

interface DialogueBoxProps {
  line: DialogueLine;
  onNext: () => void;
  choices?: DialogueChoice[];
  onChoice?: (nextNodeId: string) => void;
}

const TYPEWRITER_SPEED = 24;

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
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setDisplayedText(line.text);
      setIsComplete(true);
      return;
    }
    if (choices && choices.length > 0) return;
    onNext();
  };

  return (
    <div className="dialogue-box-shell" onClick={handleClick}>
      <div className="dialogue-box-panel">
        <div className="dialogue-box-speaker">{line.speaker}</div>
        <div className="dialogue-box-text">
          {displayedText}
          {!isComplete && <span className="dialogue-box-cursor">&#x2588;</span>}
        </div>
        {isComplete && choices && choices.length > 0 && (
          <div className="dialogue-box-choices">
            {choices.map((choice) => (
              <button
                key={choice.nextNodeId}
                className="dialogue-box-choice"
                onClick={(e) => {
                  e.stopPropagation();
                  onChoice?.(choice.nextNodeId);
                }}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
        {isComplete && (!choices || choices.length === 0) && (
          <div className="dialogue-box-continue">&#x25B6; CONTINUE</div>
        )}
      </div>
    </div>
  );
}
