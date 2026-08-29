import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RenderLabMedia from "../components/RenderLabMedia";
import type { RenderLabMediaSource } from "../components/RenderLabMedia";
import { useRenderLab } from "../context/RenderLabContext";
import { renderLabPreviewCatalog } from "../generated/renderLabPreviewCatalog";
import type { RenderLabMode } from "../lib/renderLabPreview";
import {
  readRenderLabReviewDecisions,
  writeRenderLabReviewDecision,
  type RenderLabReviewDecision,
} from "../lib/renderLabReview";

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
  const [reviewEntryId, setReviewEntryId] = useState(() => new URLSearchParams(window.location.search).get("review"));
  const [reviewDecisions, setReviewDecisions] = useState(readRenderLabReviewDecisions);
  const reviewMediaRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => Object.values(renderLabPreviewCatalog), []);
  const screens = useMemo(
    () => [...new Set(entries.flatMap((entry) => entry.screens))].sort(),
    [entries],
  );
  const phases = useMemo(() => [...new Set(entries.map((entry) => entry.phase))].sort(), [entries]);
  const visibleEntries = entries.filter((entry) =>
    (screenFilter === "all" || entry.screens.includes(screenFilter)) &&
    (phaseFilter === "all" || entry.phase === phaseFilter));
  const reviewEntry = reviewEntryId ? renderLabPreviewCatalog[reviewEntryId] : undefined;

  useEffect(() => {
    if (!reviewEntry) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReviewEntryId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [reviewEntry]);

  const openReview = (id: string) => {
    setReviewEntryId(id);
    window.history.replaceState(null, "", `/renderlab?review=${encodeURIComponent(id)}`);
  };

  const closeReview = () => {
    setReviewEntryId(null);
    window.history.replaceState(null, "", "/renderlab");
  };

  const decide = (decision: RenderLabReviewDecision) => {
    if (!reviewEntry) return;
    setReviewDecisions((current) => writeRenderLabReviewDecision(reviewEntry.id, decision, current));
  };

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
                <button className="renderlab-review-button" type="button" onClick={() => openReview(entry.id)}>
                  REVIEW
                </button>
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

      {reviewEntry && (
        <div className="renderlab-review-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeReview();
        }}>
          <section className="renderlab-review-workspace" role="dialog" aria-modal="true" aria-labelledby="renderlab-review-title">
            <header className="renderlab-review-header">
              <div>
                <span className="renderlab-kicker">Current versus candidate</span>
                <h2 id="renderlab-review-title">{reviewEntry.id.replace(/-/g, " ")}</h2>
              </div>
              <button className="renderlab-icon-button" type="button" aria-label="Close review" title="Close review" onClick={closeReview}>×</button>
            </header>

            <div className="renderlab-comparison">
              <figure className="renderlab-comparison-pane">
                <figcaption><strong>CURRENT SHIPPING</strong><span>What players see now</span></figcaption>
                <div className="renderlab-comparison-media">
                  {reviewEntry.currentReviewAsset ? (
                    <img src={reviewEntry.currentReviewAsset} alt={`Current shipping ${reviewEntry.screens.join(" ")} screen`} />
                  ) : (
                    <div className="renderlab-reference-missing">
                      <strong>NO CAPTURE YET</strong>
                      <span>The current asset remains active until a review reference is captured.</span>
                    </div>
                  )}
                </div>
              </figure>

              <figure className="renderlab-comparison-pane renderlab-candidate-pane">
                <figcaption><strong>UNREAL CANDIDATE</strong><span>{reviewEntry.render?.resolution ?? "Render pending"}</span></figcaption>
                <div className="renderlab-comparison-media" ref={reviewMediaRef}>
                  <RenderLabMedia entry={reviewEntry} />
                  <button
                    className="renderlab-fullscreen-button"
                    type="button"
                    aria-label="View candidate full screen"
                    title="View candidate full screen"
                    onClick={() => reviewMediaRef.current?.requestFullscreen()}
                  >⛶</button>
                </div>
              </figure>
            </div>

            <div className="renderlab-review-details">
              <div>
                <strong>{reviewEntry.provenance?.package ?? reviewEntry.provenance?.sourceType ?? "Source not recorded"}</strong>
                <p>{reviewEntry.note ?? "No review note recorded."}</p>
              </div>
              <dl className="renderlab-metadata">
                <dt>Status</dt><dd>{reviewEntry.status}</dd>
                <dt>Destination</dt><dd>{reviewEntry.destination ?? "Not assigned"}</dd>
                <dt>Review</dt><dd>{reviewDecisions[reviewEntry.id]?.replace(/-/g, " ") ?? "Undecided"}</dd>
              </dl>
            </div>

            <footer className="renderlab-review-actions">
              <span>DEV REVIEW ONLY. This records local intent and does not approve or ship the manifest entry.</span>
              <div role="group" aria-label="Local review decision">
                <button className={reviewDecisions[reviewEntry.id] === "keep-current" ? "active" : ""} onClick={() => decide("keep-current")}>KEEP CURRENT</button>
                <button className={reviewDecisions[reviewEntry.id] === "revise" ? "active revise" : ""} onClick={() => decide("revise")}>REVISE</button>
                <button className={reviewDecisions[reviewEntry.id] === "approve-candidate" ? "active approve" : ""} onClick={() => decide("approve-candidate")}>APPROVE CANDIDATE</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
