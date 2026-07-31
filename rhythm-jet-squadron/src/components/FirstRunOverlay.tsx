import { useEffect, useState } from "react";

const STORAGE_KEY = "astra_first_run_done";

type Step = {
  title: string;
  body: string;
  icon: string;
};

const STEPS: Step[] = [
  {
    icon: "🚀",
    title: "Welcome to Astra Valkyries",
    body: "Pick a pilot, arm your ship, and fly combat runs through deep space. Each run earns a grade — perfect it to unlock new gear and abilities.",
  },
  {
    icon: "⚔️",
    title: "Combat & Progression",
    body: "Destroy enemy formations, survive boss waves, and upgrade your loadout between runs. Pilot XP and achievements carry across sessions.",
  },
  {
    icon: "🌐",
    title: "Connect to Earn (Optional)",
    body: "Link a MetaMask wallet to earn HAI tokens for high-scoring runs. Your balance syncs with the HavnAI platform — no wallet required to play.",
  },
  {
    icon: "🏆",
    title: "Leaderboard",
    body: "Top runs are posted to a live global leaderboard. Connect your wallet to see your rank and daily earnings progress.",
  },
];

export default function FirstRunOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        <div style={styles.icon}>{current.icon}</div>
        <h2 style={styles.title}>{current.title}</h2>
        <p style={styles.body}>{current.body}</p>

        <div style={styles.dots}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.dot,
                background: i === step ? "#7ecfff" : "#334",
              }}
            />
          ))}
        </div>

        <div style={styles.actions}>
          <button style={styles.skip} onClick={dismiss}>
            Skip
          </button>
          <button style={styles.next} onClick={next}>
            {isLast ? "Start Playing" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.82)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "1rem",
  },
  card: {
    background: "#0d1117",
    border: "1px solid #1e3a5f",
    borderRadius: "12px",
    padding: "2rem",
    maxWidth: "380px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 0 40px rgba(126,207,255,0.12)",
  },
  icon: {
    fontSize: "2.8rem",
    marginBottom: "0.75rem",
  },
  title: {
    color: "#7ecfff",
    fontSize: "1.15rem",
    fontWeight: 700,
    margin: "0 0 0.75rem",
    letterSpacing: "0.02em",
  },
  body: {
    color: "#a8b8cc",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: "0 0 1.5rem",
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: "6px",
    marginBottom: "1.5rem",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    transition: "background 0.2s",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
  },
  skip: {
    background: "transparent",
    border: "1px solid #334",
    color: "#6b7a8d",
    padding: "0.5rem 1.25rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  next: {
    background: "#1a5fa8",
    border: "none",
    color: "#fff",
    padding: "0.5rem 1.5rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
};
