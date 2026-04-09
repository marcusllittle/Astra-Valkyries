import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DIALOGUE_SCRIPTS, getDialogueForMap } from "../data/dialogues";
import DialogueBox from "../components/DialogueBox";
import { useGame } from "../context/GameContext";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";

interface BriefingLocationState {
  scriptId?: string;
  returnTo?: string;
}


const MAP_BRIEFING_SCENE_ART: Record<string, string> = {
  "nebula-runway": "/assets/cutins/scenes/nebula_runway_briefing.png",
  "solar-rift": "/assets/cutins/scenes/solar_rift_briefing.png",
  "abyss-crown": "/assets/cutins/scenes/abyss_crown_briefing.png",
};

const MAP_BRIEFING_NOTES: Record<string, { label: string; tone: string; accent: string }> = {
  "nebula-runway": { label: "Slipstream corridor", tone: "Fast patrol lane with layered drone pressure.", accent: "#66d9ef" },
  "solar-rift": { label: "Thermal surge zone", tone: "High heat, aggressive siege patterns, low breathing room.", accent: "#ff9f43" },
  "abyss-crown": { label: "Deep void breach", tone: "Cold-space attrition with heavier elite resistance.", accent: "#74c0fc" },
};

export default function BriefingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { save } = useGame();
  const { scriptId, returnTo } = (location.state as BriefingLocationState) ?? {};

  const script = useMemo(() => {
    if (scriptId) return DIALOGUE_SCRIPTS.find((entry) => entry.id === scriptId);
    if (save.selectedMapId) return getDialogueForMap(save.selectedMapId, "pre_mission");
    return DIALOGUE_SCRIPTS.find((entry) => entry.trigger === "pre_mission");
  }, [save.selectedMapId, scriptId]);

  const directRoute = script?.nextRoute ?? returnTo ?? "/shmup";
  const [currentNodeId, setCurrentNodeId] = useState(script?.startNodeId ?? "");
  const [lineIndex, setLineIndex] = useState(0);

  const currentNode = script?.nodes.find((n) => n.id === currentNodeId);
  const mapId = script?.mapId ?? save.selectedMapId ?? "nebula-runway";
  const note = MAP_BRIEFING_NOTES[mapId] ?? MAP_BRIEFING_NOTES["nebula-runway"];
  const selectedPilot = pilotsData.find((pilot) => pilot.id === save.selectedPilotId) ?? null;
  const selectedOutfit = outfitsData.find((outfit) => outfit.id === save.selectedOutfitId) ?? null;
  const artwork = MAP_BRIEFING_SCENE_ART[mapId] ?? selectedOutfit?.artUrl ?? selectedPilot?.artUrl ?? "/assets/pilots/nova_starling.png";
  const loadoutLabel = [selectedPilot?.name, selectedOutfit?.name].filter(Boolean).join(" • ");

  useEffect(() => {
    setCurrentNodeId(script?.startNodeId ?? "");
    setLineIndex(0);
  }, [script?.id]);

  useEffect(() => {
    if (!script) {
      navigate(directRoute, { replace: true });
    }
  }, [directRoute, navigate, script]);

  const navigateAfterDialogue = useCallback(() => {
    navigate(directRoute, { replace: true });
  }, [directRoute, navigate]);

  const handleNext = useCallback(() => {
    if (!currentNode) return;
    if (lineIndex < currentNode.lines.length - 1) {
      setLineIndex((prev) => prev + 1);
      return;
    }
    if (currentNode.nextNodeId) {
      setCurrentNodeId(currentNode.nextNodeId);
      setLineIndex(0);
    } else {
      navigateAfterDialogue();
    }
  }, [currentNode, lineIndex, navigateAfterDialogue]);

  const handleChoice = useCallback((nextNodeId: string) => {
    setCurrentNodeId(nextNodeId);
    setLineIndex(0);
  }, []);

  const handleSkip = useCallback(() => {
    navigateAfterDialogue();
  }, [navigateAfterDialogue]);

  if (!script || !currentNode) return null;

  const line = currentNode.lines[lineIndex];
  const isLastLine = lineIndex === currentNode.lines.length - 1;
  const showChoices = isLastLine && currentNode.choices && currentNode.choices.length > 0;

  return (
    <div className="briefing-screen-shell">
      <div className="briefing-screen-atmosphere" aria-hidden="true" />
      <div className="briefing-screen-grid">
        <section className="briefing-hero-panel">
          <button className="btn btn-secondary briefing-skip-btn" onClick={handleSkip}>
            Skip
          </button>
          <div className="briefing-hero-copy">
            <span className="briefing-kicker">Mission Briefing</span>
            <h1 className="briefing-title">{script.mapId?.replace(/-/g, " ") ?? "Launch"}</h1>
            <p className="briefing-subtitle">{note.tone}</p>
            {loadoutLabel ? <span className="briefing-loadout-tag">{loadoutLabel}</span> : null}
          </div>
          <div className="briefing-map-note" style={{ borderColor: `${note.accent}44` }}>
            <span className="briefing-map-note-label">Zone Read</span>
            <strong style={{ color: note.accent }}>{note.label}</strong>
          </div>
        </section>

        <section className="briefing-dialogue-stage briefing-dialogue-stage-art">
          <div className="briefing-stage-backdrop" style={{ boxShadow: `0 0 60px ${note.accent}22` }}>
            {artwork ? (
              <img className="briefing-art-image" src={artwork} alt="Mission briefing art" />
            ) : (
              <div className="briefing-art-placeholder">✦</div>
            )}
            <div className="briefing-stage-wash" />
          </div>
          <DialogueBox
            line={line}
            onNext={handleNext}
            choices={showChoices ? currentNode.choices : undefined}
            onChoice={handleChoice}
          />
        </section>
      </div>
    </div>
  );
}
