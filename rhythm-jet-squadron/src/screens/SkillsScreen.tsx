/**
 * Skill tree screen — spend the points a pilot has earned by levelling.
 *
 * The trees have existed in data/skillTrees.ts since they were written and
 * had no screen, so no player has ever spent a point. Every node here maps
 * to a real effect via lib/skillEffects.ts; nothing on this screen is
 * decorative.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import {
  canUnlockSkill,
  getSkillPointsForLevel,
  getSkillTree,
  getSpentPoints,
  type SkillNode,
} from "../data/skillTrees";
import type { Pilot } from "../types";
import pilotsData from "../data/pilots.json";

const BRANCH_COLORS = ["#66d9ef", "#f783ac", "#ffd43b"];

export default function SkillsScreen() {
  const navigate = useNavigate();
  const { save, unlockSkill } = useGame();
  const pilots = pilotsData as Pilot[];
  const [activePilotId, setActivePilotId] = useState<string>(
    save.selectedPilotId ?? pilots[0]?.id ?? "",
  );

  const tree = getSkillTree(activePilotId);
  const unlocked = useMemo(
    () => save.pilotSkills[activePilotId] ?? [],
    [save.pilotSkills, activePilotId],
  );

  const level = save.pilotLevel[activePilotId] ?? 1;
  const earned = getSkillPointsForLevel(level);
  const spent = getSpentPoints(unlocked, activePilotId);
  const available = earned - spent;

  const nodesByBranch = useMemo(() => {
    if (!tree) return [];
    return tree.branches.map((branch, index) => ({
      branch,
      index,
      nodes: tree.nodes
        .filter((node) => node.branch === index)
        .sort((a, b) => a.tier - b.tier),
    }));
  }, [tree]);

  const renderNode = (node: SkillNode) => {
    const isUnlocked = unlocked.includes(node.id);
    const canUnlock = canUnlockSkill(node.id, activePilotId, unlocked, available);
    const blockedBy =
      node.prerequisite && !unlocked.includes(node.prerequisite)
        ? tree?.nodes.find((n) => n.id === node.prerequisite)?.name
        : null;

    let state = "locked";
    if (isUnlocked) state = "unlocked";
    else if (canUnlock) state = "available";

    return (
      <button
        key={node.id}
        className={`skill-node skill-node-${state}`}
        disabled={!canUnlock}
        onClick={() => canUnlock && unlockSkill(activePilotId, node.id)}
      >
        <div className="skill-node-head">
          <strong>{node.name}</strong>
          <span className="skill-node-cost">
            {isUnlocked ? "OWNED" : `${node.cost} SP`}
          </span>
        </div>
        <span className="skill-node-effect">{node.effect.description}</span>
        {!isUnlocked && blockedBy && (
          <span className="skill-node-blocked">Needs {blockedBy}</span>
        )}
        {!isUnlocked && !blockedBy && !canUnlock && (
          <span className="skill-node-blocked">
            Needs {node.cost - available} more point{node.cost - available === 1 ? "" : "s"}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="screen skills-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <div className="header-title-stack">
          <h2>Skills</h2>
          <p>Spend the points your pilots earn by levelling up.</p>
        </div>
      </div>

      <div className="collection-filter-tabs">
        {pilots.map((pilot) => (
          <button
            key={pilot.id}
            className={`collection-tab ${pilot.id === activePilotId ? "active" : ""}`}
            onClick={() => setActivePilotId(pilot.id)}
          >
            {pilot.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="skills-summary">
        <span>
          Level <strong>{level}</strong>
        </span>
        <span>
          Available <strong className={available > 0 ? "skills-points-ready" : ""}>{available}</strong> SP
        </span>
        <span>
          Spent <strong>{spent}</strong> / {earned}
        </span>
      </div>

      {available === 0 && spent === 0 && (
        <p className="empty-msg">
          No skill points yet. Pilots earn one point every two levels — fly a
          run to start levelling {pilots.find((p) => p.id === activePilotId)?.name.split(" ")[0]}.
        </p>
      )}

      {!tree ? (
        <p className="empty-msg">No skill tree for this pilot.</p>
      ) : (
        <div className="skills-branches">
          {nodesByBranch.map(({ branch, index, nodes }) => (
            <section key={branch.name} className="skills-branch">
              <div
                className="skills-branch-head"
                style={{ borderColor: BRANCH_COLORS[index % BRANCH_COLORS.length] }}
              >
                <strong style={{ color: BRANCH_COLORS[index % BRANCH_COLORS.length] }}>
                  {branch.name}
                </strong>
                <span>{branch.description}</span>
              </div>
              <div className="skills-branch-nodes">{nodes.map(renderNode)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
