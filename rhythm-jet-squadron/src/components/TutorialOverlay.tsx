/**
 * TutorialOverlay — multi-step first-play onboarding shown before the shmup
 * game loop begins. Persists dismissal to localStorage so it only appears once.
 */

import { useState, useCallback } from "react";

const TUTORIAL_STORAGE_KEY = "astra.tutorialSeen";

export function hasTutorialBeenSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

interface TutorialStep {
  title: string;
  lines: string[];
  keys?: { label: string; desc: string }[];
}

const STEPS: TutorialStep[] = [
  {
    title: "Movement",
    lines: [
      "Your ship auto-fires. Focus on positioning to dodge bullets and line up shots.",
    ],
    keys: [
      { label: "WASD / Arrows", desc: "Move your ship" },
      { label: "Touch Pad", desc: "Drag to move (mobile)" },
    ],
  },
  {
    title: "Secondary Weapon",
    lines: [
      "Each outfit comes with a secondary ability — bombs, barriers, EMP blasts, or drones.",
      "Some secondaries use limited charges. Collect bomb pickups to restock.",
    ],
    keys: [
      { label: "Shift", desc: "Fire secondary" },
      { label: "Touch Button", desc: "Fire secondary (mobile)" },
    ],
  },
  {
    title: "Power Chips & Overdrive",
    lines: [
      "Defeating enemies drops power chips. Collect them to level up your weapon (max Lv 4) and fill the Overdrive meter.",
      "When Overdrive activates, your score multiplier skyrockets. Keep killing enemies to extend it.",
    ],
  },
  {
    title: "Boss Battle",
    lines: [
      "Survive the waves and a boss will appear. Bosses have multiple phases with escalating attacks.",
      "Defeat the boss to advance to the next stage. Good luck, pilot!",
    ],
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step >= STEPS.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      markTutorialSeen();
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const skip = useCallback(() => {
    markTutorialSeen();
    onComplete();
  }, [onComplete]);

  return (
    <div className="tutorial-overlay" onClick={advance}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-step-indicator">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tutorial-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            />
          ))}
        </div>

        <h3 className="tutorial-title">{current.title}</h3>

        {current.lines.map((line, i) => (
          <p key={i} className="tutorial-line">{line}</p>
        ))}

        {current.keys && (
          <div className="tutorial-keys">
            {current.keys.map((k) => (
              <div key={k.label} className="tutorial-key-row">
                <kbd className="tutorial-kbd">{k.label}</kbd>
                <span>{k.desc}</span>
              </div>
            ))}
          </div>
        )}

        <div className="tutorial-actions">
          <button className="btn btn-text tutorial-skip" onClick={skip}>
            Skip
          </button>
          <button className="btn btn-primary tutorial-next" onClick={advance}>
            {isLast ? "Launch!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
