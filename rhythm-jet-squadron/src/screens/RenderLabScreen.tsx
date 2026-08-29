import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RenderLabMedia from "../components/RenderLabMedia";
import type { RenderLabMediaSource } from "../components/RenderLabMedia";
import { useRenderLab } from "../context/RenderLabContext";
import { renderLabPreviewCatalog } from "../generated/renderLabPreviewCatalog";
import type { RenderLabMode } from "../lib/renderLabPreview";

const MODES: { id: RenderLabMode; label: string }[] = [
  { id: "current", label: "CURRENT" },
  { id: "all", label: "ALL CANDIDATES" },
  { id: "custom", label: "CUSTOM" },
];

export default function RenderLabScreen() {
  const navigate = useNavigate();
  const { enabled, mode, overrides, setMode, setOverride, usesCandidate } = useRenderLab();
  const [screenFilter, setScreenFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState<number | "all">("all");
  const [mediaSources, setMediaSources] = useState<Record<string, RenderLabMediaSource>>({});
  const entries = useMemo(() => Object.values(renderLabPreviewCatalog), []);
  const screens = useMemo(
    () => [...new Set(entries.flatMap((entry) => entry.screens))].sort(),
    [entries],
  );
  const phases = useMemo(() => [...new Set(entries.map((entry) => entry.phase))].sort(), [entries]);
  const visibleEntries = entries.filter((entry) =>
    (screenFilter === "all" || entry.screens.includes(screenFilter)) &&
    (phaseFilter === "all" || entry.phase === phaseFilter));

  if (!enabled) {
    return (
      <main className="screen renderlab-screen">
        <button className="btn btn-back" onClick={() => navigate("/")}>← HOME</button>
        <section className="renderlab-disabled panel-surface">
          <span>Development tool</span>
          <h1>Render Lab preview is disabled</h1>
          <p>Launch this workspace with <code>npm run dev:renderlab</code>.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="screen renderlab-screen">
      <header className="renderlab-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← PLAY GAME</button>
        <div>
          <span className="renderlab-kicker">Development preview console</span>
          <h1>RENDER LAB</h1>
          <p>Preview candidate media without changing production approvals.</p>
        </div>
        <strong className="renderlab-count">{entries.length} MANIFEST ENTRIES</strong>
      </header>

      <div className="renderlab-mode-selector" role="group" aria-label="Render Lab preview mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={mode === item.id ? "active" : ""}
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="renderlab-status-strip">
        <strong>{mode === "current" ? "Shipping asset set" : mode === "all" ? "Every candidate forced on" : "Per-asset selection"}</strong>
        <span>Local browser state only. Manifest decisions and production media are unchanged.</span>
      </section>

      <nav className="renderlab-screen-filters" aria-label="Filter candidates by screen">
        <button className={screenFilter === "all" ? "active" : ""} onClick={() => setScreenFilter("all")}>ALL</button>
        {screens.map((screen) => (
          <button key={screen} className={screenFilter === screen ? "active" : ""} onClick={() => setScreenFilter(screen)}>
            {screen.replace(/-/g, " ").toUpperCase()}
          </button>
        ))}
      </nav>

      <nav className="renderlab-phase-filters" aria-label="Filter candidates by production phase">
        <button className={phaseFilter === "all" ? "active" : ""} onClick={() => setPhaseFilter("all")}>ALL PHASES</button>
        {phases.map((phase) => (
          <button key={phase} className={phaseFilter === phase ? "active" : ""} onClick={() => setPhaseFilter(phase)}>
            PHASE {phase}
          </button>
        ))}
      </nav>

      <div className="renderlab-grid">
        {visibleEntries.map((entry) => {
          const selected = usesCandidate(entry.id);
          return (
            <article className={`renderlab-entry ${selected ? "selected" : ""}`} key={entry.id}>
              <div className="renderlab-entry-media">
                <RenderLabMedia
                  entry={entry}
                  decorative
                  onSourceChange={(source) => setMediaSources((current) =>
                    current[entry.id] === source ? current : { ...current, [entry.id]: source })}
                />
                {mediaSources[entry.id] === "missing" && (
                  <div className="renderlab-media-missing">NO CANDIDATE RENDER</div>
                )}
                <span>{entry.kind.replace(/-/g, " ")}</span>
              </div>
              <div className="renderlab-entry-body">
                <div className="renderlab-entry-heading">
                  <strong>{entry.id.replace(/-/g, " ")}</strong>
                  <span className={`renderlab-status renderlab-status-${entry.status}`}>{entry.status}</span>
                </div>
                <span className="renderlab-entry-screens">{entry.screens.join(" · ") || "marketing"}</span>
                <div className="renderlab-source-state" data-source={mediaSources[entry.id] ?? "checking"}>
                  {(mediaSources[entry.id] ?? "checking").replace(/-/g, " ")}
                </div>
                {(entry.provenance || entry.render || entry.destination) && (
                  <dl className="renderlab-metadata">
                    {entry.provenance && <><dt>Source</dt><dd>{entry.provenance.package ?? entry.provenance.sourceType}</dd></>}
                    {entry.render?.resolution && <><dt>Render</dt><dd>{entry.render.resolution}{entry.render.durationSeconds ? ` · ${entry.render.durationSeconds}s` : ""}{entry.render.reviewFormat ? ` · ${entry.render.reviewFormat}` : ""}</dd></>}
                    {entry.destination && <><dt>Destination</dt><dd>{entry.destination}</dd></>}
                  </dl>
                )}
                <p>{entry.note ?? "No review note recorded."}</p>
                <label className="renderlab-override">
                  <input
                    type="checkbox"
                    checked={mode === "all" || (mode === "custom" && overrides[entry.id] === true)}
                    disabled={mode !== "custom"}
                    onChange={(event) => setOverride(entry.id, event.target.checked)}
                  />
                  <span>{selected ? "Candidate active" : "Current asset"}</span>
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
