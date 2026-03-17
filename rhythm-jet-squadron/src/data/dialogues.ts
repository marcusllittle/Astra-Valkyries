export interface DialogueLine {
  speaker: string;
  text: string;
  portrait?: string;
  position?: "left" | "right";
  mood?: string;
}

export interface DialogueChoice {
  label: string;
  nextNodeId: string;
}

export interface DialogueNode {
  id: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  nextNodeId?: string;
}

export interface DialogueScript {
  id: string;
  trigger: "pre_mission" | "post_mission" | "inbox" | "spaceport";
  mapId?: string;
  pilotId?: string;
  requiredCondition?: string;
  nodes: DialogueNode[];
  startNodeId: string;
}

export const DIALOGUE_SCRIPTS: DialogueScript[] = [
  {
    id: "briefing-nebula-runway",
    trigger: "pre_mission",
    mapId: "nebula-runway",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "Valkyrie squadron, you are cleared for launch.", position: "left", mood: "neutral" },
          { speaker: "Command", text: "The Nebula Runway is swarming with hostile drones. Clear a path to the sector gate.", position: "left", mood: "neutral" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Nova", text: "Copy that, Command. Weapons hot, systems green.", position: "right", mood: "excited" },
          { speaker: "Nova", text: "Let's light them up.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "briefing-solar-rift",
    trigger: "pre_mission",
    mapId: "solar-rift",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "Warning: Solar Rift sector detected extreme thermal readings.", position: "left", mood: "worried" },
          { speaker: "Command", text: "The Helios Tyrant has been spotted. Proceed with extreme caution.", position: "left", mood: "worried" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Rex", text: "Heat shielding at maximum. I've seen worse.", position: "right", mood: "neutral" },
          { speaker: "Rex", text: "Engaging combat protocols.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "briefing-abyss-crown",
    trigger: "pre_mission",
    mapId: "abyss-crown",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "This is it, Valkyrie. The Abyss Crown — deepest point of the void sector.", position: "left", mood: "worried" },
          { speaker: "Command", text: "The Cryo Leviathan lurks within. No squadron has returned intact.", position: "left", mood: "worried" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Yuki", text: "Then we'll be the first. Lock and load.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
  // ── Post-mission dialogues ──
  {
    id: "debrief-nebula-runway",
    trigger: "post_mission",
    mapId: "nebula-runway",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "Nebula Runway cleared. Excellent work, Valkyrie.", position: "left", mood: "neutral" },
          { speaker: "Nova", text: "Hostiles neutralized. Returning to base.", position: "right", mood: "happy" },
          { speaker: "Command", text: "Intelligence reports movement in the Solar Rift. Stand by for new orders.", position: "left", mood: "serious" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "debrief-solar-rift",
    trigger: "post_mission",
    mapId: "solar-rift",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "Solar Rift secured. The Helios Tyrant won't be troubling us for a while.", position: "left", mood: "neutral" },
          { speaker: "Rex", text: "Barely broke a sweat. What's next?", position: "right", mood: "happy" },
          { speaker: "Command", text: "The Abyss Crown awaits. Prepare yourself — this won't be easy.", position: "left", mood: "worried" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "debrief-abyss-crown",
    trigger: "post_mission",
    mapId: "abyss-crown",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "Unbelievable. The Abyss Crown is clear. You actually did it.", position: "left", mood: "happy" },
          { speaker: "Yuki", text: "Told you we'd be the first. The void bows to no one.", position: "right", mood: "happy" },
          { speaker: "Command", text: "Report to the Spaceport. You've earned some rest… and a reward.", position: "left", mood: "neutral" },
        ],
      },
    ],
    startNodeId: "start",
  },
];

export function getDialogueForMap(mapId: string, trigger: "pre_mission" | "post_mission"): DialogueScript | undefined {
  return DIALOGUE_SCRIPTS.find(s => s.trigger === trigger && s.mapId === mapId);
}
