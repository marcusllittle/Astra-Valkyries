import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LORE_ENTRIES, type LoreEntry } from "../data/lore";

const CATEGORIES = [
  { key: "pilot", label: "PILOTS" },
  { key: "zone", label: "ZONES" },
  { key: "boss", label: "BOSSES" },
  { key: "enemy", label: "ENEMIES" },
  { key: "faction", label: "FACTIONS" },
] as const;

export default function CodexScreen() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("pilot");
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);

  const entries = LORE_ENTRIES.filter(e => e.category === activeCategory);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "linear-gradient(180deg, #040612 0%, #0a1628 100%)",
      color: "#e0e0e0", fontFamily: "monospace", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: "16px 20px",
        borderBottom: "1px solid rgba(102,217,239,0.2)",
      }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "none", color: "#66d9ef",
          cursor: "pointer", fontSize: "16px", fontFamily: "monospace", marginRight: "16px",
        }}>
          &#x25C0; BACK
        </button>
        <h1 style={{ fontSize: "18px", color: "#66d9ef", letterSpacing: "3px", margin: 0 }}>
          CODEX
        </h1>
      </div>

      {/* Category tabs */}
      <div style={{
        display: "flex", gap: "4px", padding: "12px 20px",
        borderBottom: "1px solid rgba(102,217,239,0.1)",
      }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setSelectedEntry(null); }} style={{
            background: activeCategory === cat.key ? "rgba(102,217,239,0.2)" : "rgba(255,255,255,0.05)",
            border: activeCategory === cat.key ? "1px solid rgba(102,217,239,0.4)" : "1px solid rgba(255,255,255,0.1)",
            color: activeCategory === cat.key ? "#66d9ef" : "rgba(255,255,255,0.5)",
            padding: "6px 14px", borderRadius: "4px", cursor: "pointer",
            fontFamily: "monospace", fontSize: "11px", letterSpacing: "1px",
          }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Entry list */}
        <div style={{
          width: "240px", borderRight: "1px solid rgba(102,217,239,0.1)",
          overflowY: "auto", padding: "8px 0",
        }}>
          {entries.map(entry => (
            <button key={entry.id} onClick={() => setSelectedEntry(entry)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 16px",
              background: selectedEntry?.id === entry.id ? "rgba(102,217,239,0.15)" : "transparent",
              border: "none", color: selectedEntry?.id === entry.id ? "#66d9ef" : "rgba(255,255,255,0.7)",
              cursor: "pointer", fontFamily: "monospace", fontSize: "13px",
              borderLeft: selectedEntry?.id === entry.id ? "2px solid #66d9ef" : "2px solid transparent",
            }}>
              {entry.title}
            </button>
          ))}
        </div>

        {/* Entry detail */}
        <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
          {selectedEntry ? (
            <>
              <h2 style={{ color: "#66d9ef", fontSize: "20px", marginBottom: "16px", letterSpacing: "1px" }}>
                {selectedEntry.title}
              </h2>
              {selectedEntry.imageUrl && (
                <img src={selectedEntry.imageUrl} alt={selectedEntry.title} style={{
                  maxWidth: "100%", maxHeight: "300px", objectFit: "contain",
                  marginBottom: "16px", borderRadius: "4px",
                  border: "1px solid rgba(102,217,239,0.2)",
                }} />
              )}
              <p style={{ lineHeight: "1.8", fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
                {selectedEntry.content}
              </p>
            </>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
              color: "rgba(255,255,255,0.3)", fontSize: "14px",
            }}>
              Select an entry to read
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
