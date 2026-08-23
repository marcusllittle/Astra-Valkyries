import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DIALOGUE_SCRIPTS, getDialogueForMap } from "../data/dialogues";
import DialogueBox from "../components/DialogueBox";
import { useGame } from "../context/GameContext";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";
import {
  fetchNetworkSnapshot,
  type NetworkNode,
} from "../lib/havnApi";
import { humanizeMachineName } from "../lib/networkForge";
import {
  getMapCinematic,
  getPilotLaunchClip,
  unseenCinematicClips,
} from "../lib/missionCinematics";

interface BriefingLocationState {
  scriptId?: string;
  returnTo?: string;
}


const MAP_BRIEFING_NOTES: Record<string, { label: string; tone: string; accent: string }> = {
  "nebula-runway": { label: "Slipstream corridor", tone: "Fast patrol lane with layered drone pressure.", accent: "#66d9ef" },
  "solar-rift": { label: "Thermal surge zone", tone: "High heat, aggressive siege patterns, low breathing room.", accent: "#ff9f43" },
  "abyss-crown": { label: "Deep void breach", tone: "Cold-space attrition with heavier elite resistance.", accent: "#74c0fc" },
};

export default function BriefingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { save, selectCreatorNode } = useGame();
  const { scriptId, returnTo } = (location.state as BriefingLocationState) ?? {};

  const script = useMemo(() => {
    if (scriptId) return DIALOGUE_SCRIPTS.find((entry) => entry.id === scriptId);
    if (save.selectedMapId) return getDialogueForMap(save.selectedMapId, "pre_mission");
    return DIALOGUE_SCRIPTS.find((entry) => entry.trigger === "pre_mission");
  }, [save.selectedMapId, scriptId]);

  const directRoute = script?.nextRoute ?? returnTo ?? "/shmup";
  const [currentNodeId, setCurrentNodeId] = useState(script?.startNodeId ?? "");
  const [lineIndex, setLineIndex] = useState(0);
  const [creatorNodes, setCreatorNodes] = useState<NetworkNode[]>([]);
  const [networkOffline, setNetworkOffline] = useState(false);
  const [motionUnavailable, setMotionUnavailable] = useState(false);

  const currentNode = script?.nodes.find((n) => n.id === currentNodeId);
  const mapId = script?.mapId ?? save.selectedMapId ?? "nebula-runway";
  const note = MAP_BRIEFING_NOTES[mapId] ?? MAP_BRIEFING_NOTES["nebula-runway"];
  const selectedPilot = pilotsData.find((pilot) => pilot.id === save.selectedPilotId) ?? null;
  const selectedOutfit = outfitsData.find((outfit) => outfit.id === save.selectedOutfitId) ?? null;
  const mapCinematic = getMapCinematic(mapId);
  const artwork = mapCinematic?.poster ?? selectedOutfit?.artUrl ?? selectedPilot?.artUrl ?? "/assets/pilots/nova_starling.png";
  const loadoutLabel = [selectedPilot?.name, selectedOutfit?.name].filter(Boolean).join(" • ");

  useEffect(() => {
    setCurrentNodeId(script?.startNodeId ?? "");
    setLineIndex(0);
    setMotionUnavailable(false);
  }, [script?.id]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const loadCreators = async () => {
      const result = await fetchNetworkSnapshot();
      if (cancelled) return;
      setNetworkOffline(result.offline);
      if (result.data) {
        setCreatorNodes(
          result.data.nodes
            .filter((node) => node.online && node.role === "creator")
            .sort((a, b) => (b.performance?.success_rate ?? 0) - (a.performance?.success_rate ?? 0)),
        );
      }
      timer = window.setTimeout(loadCreators, 12000);
    };
    void loadCreators();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!script) {
      navigate(directRoute, { replace: true });
    }
  }, [directRoute, navigate, script]);

  const navigateAfterDialogue = useCallback(() => {
    const clips = unseenCinematicClips(
      [getPilotLaunchClip(save.selectedPilotId, mapId)],
      save.seenCutscenes,
    );
    if (clips.length > 0) {
      navigate("/video-cutscene", {
        replace: true,
        state: { clips, returnTo: directRoute },
      });
      return;
    }
    navigate(directRoute, { replace: true });
  }, [directRoute, mapId, navigate, save.seenCutscenes, save.selectedPilotId]);

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
    navigate(directRoute, { replace: true });
  }, [directRoute, navigate]);

  if (!script || !currentNode) return null;

  const line = currentNode.lines[lineIndex];
  const isLastLine = lineIndex === currentNode.lines.length - 1;
  const showChoices = isLastLine && currentNode.choices && currentNode.choices.length > 0;
  const preferredCreator = creatorNodes.find((node) => node.node_id === save.preferredCreatorNodeId);

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
          <section className="briefing-creator-route" aria-label="Creator routing">
            <div className="briefing-creator-head">
              <span>Creator Wingman</span>
              <strong>
                {preferredCreator
                  ? preferredCreator.node_name || preferredCreator.node_id
                  : save.preferredCreatorNodeId
                    ? "Fallback armed"
                    : "Auto route"}
              </strong>
            </div>
            <div className="briefing-creator-options">
              <button
                type="button"
                className={!save.preferredCreatorNodeId ? "is-active" : ""}
                onClick={() => selectCreatorNode(null)}
              >
                <span>AUTO</span>
                <small>Fastest</small>
              </button>
              {creatorNodes.slice(0, 3).map((node) => (
                <button
                  key={node.node_id}
                  type="button"
                  className={save.preferredCreatorNodeId === node.node_id ? "is-active" : ""}
                  onClick={() => selectCreatorNode(node.node_id)}
                  title={node.gpu?.gpu_name || node.node_id}
                >
                  <span>{node.node_name || humanizeMachineName(node.node_id)}</span>
                  <small>{Math.round((node.performance?.success_rate ?? 0) * 100)}% reliable</small>
                </button>
              ))}
            </div>
            <small className="briefing-creator-status">
              {networkOffline
                ? "Mesh unavailable · automatic routing remains active"
                : save.preferredCreatorNodeId && !preferredCreator
                  ? "Selected creator is offline · automatic failover enabled"
                  : preferredCreator
                    ? "15-second priority claim · automatic failover enabled"
                    : `${creatorNodes.length} creator${creatorNodes.length === 1 ? "" : "s"} available`}
            </small>
          </section>
        </section>

        <section className="briefing-dialogue-stage briefing-dialogue-stage-art">
          <div className="briefing-stage-backdrop" style={{ boxShadow: `0 0 60px ${note.accent}22` }}>
            {mapCinematic?.video && !motionUnavailable ? (
              <video
                className="briefing-art-video"
                src={mapCinematic.video}
                poster={artwork}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onError={() => setMotionUnavailable(true)}
              />
            ) : artwork ? (
              <img className="briefing-art-image" src={artwork} alt="Mission briefing art" />
            ) : (
              <div className="briefing-art-placeholder">✦</div>
            )}
            <div className="briefing-stage-wash" />
            {mapCinematic?.video && !motionUnavailable ? (
              <span className="briefing-motion-status">LTX tactical feed</span>
            ) : null}
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
