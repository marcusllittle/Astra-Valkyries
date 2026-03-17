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

  return (
    <div className="screen spaceport-screen">
      <header className="spaceport-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← HOME</button>
        <h2 className="spaceport-title">SPACEPORT</h2>
        <div className="spaceport-pilot-info">
          <span className="pilot-name">{pilotName}</span>
          <span className="pilot-level">LV.{pilotLevel}</span>
        </div>
      </header>

      <div className="spaceport-status-bar">
        <div className="status-credits">
          <span className="credit-icon">✦</span> {save.credits.toLocaleString()}
        </div>
        <div className="status-runs">
          Runs: {save.totalRuns} | Kills: {save.totalKills.toLocaleString()}
        </div>
      </div>

      <div className="spaceport-grid">
        {AREAS.map((area) => (
          <button
            key={area.label}
            className="spaceport-area-card"
            onClick={() => {
              if (area.label === "INBOX") {
                setInboxOpen(true);
              } else if (area.route) {
                navigate(area.route);
              }
            }}
          >
            <span className="area-icon">{area.icon}</span>
            <span className="area-label">{area.label}</span>
            <span className="area-desc">{area.desc}</span>
            {area.label === "INBOX" && unreadCount > 0 && (
              <span className="area-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="spaceport-quick-launch">
        <button className="btn btn-primary btn-large" onClick={() => navigate("/briefing")}>
          LAUNCH MISSION
        </button>
      </div>

      {inboxOpen && <InboxOverlay isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />}
    </div>
  );
}
