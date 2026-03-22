import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getUnreadCount } from "../components/InboxOverlay";
import InboxOverlay from "../components/InboxOverlay";

const AREAS = [
  { label: "HANGAR", desc: "Select loadout & launch", route: "/hangar", icon: "🚀" },
  { label: "MISSIONS", desc: "Daily & weekly challenges", route: "/missions", icon: "📋" },
  { label: "INBOX", desc: "Pilot transmissions", route: null, icon: "📨" },
  { label: "CODEX", desc: "Lore & bestiary", route: "/codex", icon: "📖" },
  { label: "COLLECTION", desc: "Outfits & gallery", route: "/collection", icon: "👗" },
  { label: "SHOP", desc: "Gacha & store", route: "/shop", icon: "🛒" },
] as const;

export default function SpaceportScreen() {
  const navigate = useNavigate();
  const { save } = useGame();
  const [inboxOpen, setInboxOpen] = useState(false);
  const unreadCount = getUnreadCount();

  const pilotName = save.selectedPilotId?.replace("pilot_", "").toUpperCase() ?? "PILOT";
  const pilotLevel = save.pilotLevel[save.selectedPilotId ?? ""] ?? 1;
  const credits = save.credits.toLocaleString();
  const kills = save.totalKills.toLocaleString();
  const inboxStatus = unreadCount > 0 ? `${unreadCount} unread transmissions` : "No pending transmissions";

  return (
    <div className="screen spaceport-screen">
      <div className="spaceport-atmosphere" aria-hidden="true" />

      <div className="spaceport-shell panel-surface">
        <header className="spaceport-command-bar">
          <div className="spaceport-command-stack">
            <button className="btn btn-back spaceport-home-btn" onClick={() => navigate("/")}>
              ← HOME
            </button>

            <div className="spaceport-title-block">
              <span className="spaceport-kicker">Orbital Command Nexus</span>
              <h1 className="spaceport-title">SPACEPORT</h1>
              <p className="spaceport-subtitle">
                Your premium command hub for deployment, intel, logistics, and squad readiness.
              </p>
            </div>
          </div>

          <div className="spaceport-top-stats">
            <div className="spaceport-stat-card">
              <span className="spaceport-stat-label">Assigned Pilot</span>
              <strong className="spaceport-stat-value">{pilotName}</strong>
              <span className="spaceport-stat-meta">LV.{pilotLevel} command clearance</span>
            </div>

            <div className="spaceport-stat-card">
              <span className="spaceport-stat-label">Credits</span>
              <strong className="spaceport-stat-value spaceport-stat-value-gold">
                <span className="credit-icon">✦</span> {credits}
              </strong>
              <span className="spaceport-stat-meta">Fleet purchasing power online</span>
            </div>

            <div className="spaceport-stat-card">
              <span className="spaceport-stat-label">Combat Ledger</span>
              <strong className="spaceport-stat-value">{save.totalRuns} runs</strong>
              <span className="spaceport-stat-meta">{kills} kills confirmed</span>
            </div>
          </div>
        </header>

        <div className="spaceport-layout">
          <section className="spaceport-destination-panel panel-surface">
            <div className="spaceport-section-head">
              <div>
                <span className="spaceport-section-kicker">Hub Destinations</span>
                <h2 className="spaceport-section-title">Operational Access</h2>
              </div>
              <p className="spaceport-section-note">
                Move through ship systems, mission control, and squad archives without leaving the dock.
              </p>
            </div>

            <div className="spaceport-grid">
              {AREAS.map((area) => (
                <button
                  key={area.label}
                  type="button"
                  className="spaceport-area-card"
                  onClick={() => {
                    if (area.label === "INBOX") {
                      setInboxOpen(true);
                    } else if (area.route) {
                      navigate(area.route);
                    }
                  }}
                >
                  <span className="spaceport-area-glow" aria-hidden="true" />

                  <div className="spaceport-area-head">
                    <span className="spaceport-area-icon">{area.icon}</span>
                    <div className="spaceport-area-copy">
                      <span className="spaceport-area-label">{area.label}</span>
                      <span className="spaceport-area-desc">{area.desc}</span>
                    </div>
                    <span className="spaceport-area-arrow" aria-hidden="true">↗</span>
                  </div>

                  <span className="spaceport-area-meta">
                    {area.label === "INBOX" ? inboxStatus : "Open terminal"}
                  </span>

                  {area.label === "INBOX" && unreadCount > 0 && (
                    <span className="spaceport-area-badge">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <aside className="spaceport-side-column">
            <section className="spaceport-visual-panel panel-surface">
              <span className="spaceport-section-kicker">Dockside Readiness</span>
              <h2 className="spaceport-visual-title">Command Deck Online</h2>
              <p className="spaceport-visual-copy">
                All major systems are synchronized. The squadron is staged, the slipstream lane is clear,
                and priority terminals are waiting for your command.
              </p>

              <div className="spaceport-visual-core" aria-hidden="true">
                <div className="spaceport-core-ring spaceport-core-ring-outer" />
                <div className="spaceport-core-ring spaceport-core-ring-mid" />
                <div className="spaceport-core-ring spaceport-core-ring-inner" />
                <div className="spaceport-core-pulse" />
              </div>

              <div className="spaceport-visual-metrics">
                <div className="spaceport-visual-metric">
                  <span className="spaceport-visual-metric-label">Inbox</span>
                  <strong>{unreadCount > 0 ? `${unreadCount} pending` : "Clear"}</strong>
                </div>
                <div className="spaceport-visual-metric">
                  <span className="spaceport-visual-metric-label">Pilot Status</span>
                  <strong>Ready</strong>
                </div>
              </div>
            </section>

            <section className="spaceport-launch-panel">
              <div className="spaceport-launch-copy">
                <span className="spaceport-section-kicker">Primary Flight Path</span>
                <h2 className="spaceport-launch-title">Launch Mission</h2>
                <p className="spaceport-launch-desc">
                  Depart the port, enter the briefing channel, and roll directly into the next operation.
                </p>
              </div>

              <button
                className="btn btn-primary btn-large spaceport-launch-btn"
                onClick={() => navigate("/briefing")}
              >
                LAUNCH MISSION
              </button>
            </section>
          </aside>
        </div>
      </div>

      {inboxOpen && <InboxOverlay isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />}
    </div>
  );
}
