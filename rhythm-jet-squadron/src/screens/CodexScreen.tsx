import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LORE_ENTRIES, type LoreEntry } from "../data/lore";

const CATEGORIES = [
  { key: "pilot", label: "PILOTS", icon: "✦" },
  { key: "zone", label: "ZONES", icon: "◎" },
  { key: "boss", label: "BOSSES", icon: "⚠" },
  { key: "enemy", label: "ENEMIES", icon: "◈" },
  { key: "faction", label: "FACTIONS", icon: "⬢" },
] as const;

function getCategoryTone(category: LoreEntry["category"]) {
  switch (category) {
    case "pilot":
      return { glow: "rgba(102,217,239,0.24)", accent: "#66d9ef", kicker: "Pilot dossier" };
    case "zone":
      return { glow: "rgba(166,140,255,0.24)", accent: "#a78bfa", kicker: "Sector file" };
    case "boss":
      return { glow: "rgba(255,122,143,0.24)", accent: "#ff7a8f", kicker: "Threat record" };
    case "enemy":
      return { glow: "rgba(255,209,102,0.24)", accent: "#ffd166", kicker: "Contact report" };
    case "faction":
    default:
      return { glow: "rgba(106,224,160,0.24)", accent: "#6ae0a0", kicker: "Faction brief" };
  }
}

function summarizeEntry(entry: LoreEntry): string {
  const firstSentence = entry.content.split(/(?<=[.!?])\s+/)[0]?.trim();
  return firstSentence || entry.content;
}

export default function CodexScreen() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("pilot");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const entries = useMemo(
    () => LORE_ENTRIES.filter((entry) => entry.category === activeCategory),
    [activeCategory],
  );

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null;
  const categoryInfo = CATEGORIES.find((category) => category.key === activeCategory) ?? CATEGORIES[0];
  const tone = getCategoryTone((selectedEntry?.category as LoreEntry["category"]) ?? "pilot");

  return (
    <div className="screen codex-screen">
      <div className="codex-shell panel-surface" style={{ boxShadow: `0 0 40px ${tone.glow}` }}>
        <header className="codex-header">
          <button className="btn btn-back" onClick={() => navigate("/spaceport")}>
            ← Back
          </button>
          <div className="codex-header-copy">
            <span className="codex-kicker">Archive Terminal</span>
            <h1 className="codex-title">Codex</h1>
            <p className="codex-subtitle">Squad intel, sector dossiers, and threat records.</p>
          </div>
        </header>

        <div className="codex-category-row">
          {CATEGORIES.map((category) => (
            <button
              key={category.key}
              type="button"
              className={`codex-category-chip ${activeCategory === category.key ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(category.key);
                setSelectedEntryId(null);
              }}
            >
              <span aria-hidden="true">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        <div className="codex-layout">
          <aside className="codex-list-panel">
            <div className="codex-section-head">
              <span className="codex-section-kicker">Category</span>
              <h2 className="codex-section-title">{categoryInfo.label}</h2>
            </div>
            <div className="codex-entry-list">
              {entries.map((entry) => {
                const active = selectedEntry?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`codex-entry-card ${active ? "active" : ""}`}
                    onClick={() => setSelectedEntryId(entry.id)}
                  >
                    <span className="codex-entry-title">{entry.title}</span>
                    <span className="codex-entry-summary">{summarizeEntry(entry)}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="codex-detail-panel">
            {selectedEntry ? (
              <>
                <div className="codex-detail-hero" style={{ borderColor: tone.glow }}>
                  <div>
                    <span className="codex-detail-kicker" style={{ color: tone.accent }}>{tone.kicker}</span>
                    <h2 className="codex-detail-title">{selectedEntry.title}</h2>
                  </div>
                  <span className="codex-detail-badge" style={{ borderColor: tone.glow, color: tone.accent }}>
                    {categoryInfo.label.slice(0, -1) || categoryInfo.label}
                  </span>
                </div>

                {selectedEntry.imageUrl ? (
                  <img
                    src={selectedEntry.imageUrl}
                    alt={selectedEntry.title}
                    className="codex-detail-image"
                  />
                ) : (
                  <div className="codex-detail-placeholder" style={{ boxShadow: `inset 0 0 40px ${tone.glow}` }}>
                    <span>{categoryInfo.icon}</span>
                  </div>
                )}

                <p className="codex-detail-body">{selectedEntry.content}</p>
              </>
            ) : (
              <div className="codex-empty">No entries available.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
