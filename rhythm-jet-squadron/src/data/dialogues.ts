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
  videoUrl?: string;
  nextVideoUrl?: string;
  nextRoute?: string;
  nodes: DialogueNode[];
  startNodeId: string;
}

export const DIALOGUE_SCRIPTS: DialogueScript[] = [
  {
    id: "briefing-nebula-runway",
    trigger: "pre_mission",
    mapId: "nebula-runway",
    videoUrl: "/assets/cutins/nova/nova_mission_briefing.mp4",
    nextVideoUrl: "/assets/cutins/nova/nova_leaving_port.mp4",
    nextRoute: "/shmup",
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

  // ── Spaceport / between-mission banter ──────────────────────────────
  {
    id: "spaceport-nova-01",
    trigger: "spaceport",
    pilotId: "pilot_nova",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Nova", text: "You're still here? Good. I was starting to think you'd gone soft on me.", position: "right", mood: "neutral" },
          { speaker: "Nova", text: "There's intel coming in from the outer corridor. Nothing official yet. Just noise.", position: "right", mood: "serious" },
          { speaker: "Nova", text: "But noise has a way of turning into something. Stay sharp.", position: "right", mood: "neutral" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "spaceport-nova-02",
    trigger: "spaceport",
    pilotId: "pilot_nova",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Nova", text: "Not going to pretend the last run was easy. But you kept formation where it counted.", position: "right", mood: "neutral" },
          { speaker: "Nova", text: "That matters more than you know. The route only holds if the pilot holds it.", position: "right", mood: "happy" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "spaceport-rex-01",
    trigger: "spaceport",
    pilotId: "pilot_rex",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Rex", text: "Solar Rift shook the whole system when we hit the Helios Tyrant. You feel that?", position: "right", mood: "excited" },
          { speaker: "Rex", text: "Next run's going to be harder. I'm already looking forward to it.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "spaceport-rex-02",
    trigger: "spaceport",
    pilotId: "pilot_rex",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Rex", text: "I've been watching your flight data. You're getting more aggressive. I like it.", position: "right", mood: "happy" },
          { speaker: "Rex", text: "Don't overthink the angles. Trust your reflexes and push the throttle.", position: "right", mood: "neutral" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "spaceport-yuki-01",
    trigger: "spaceport",
    pilotId: "pilot_yuki",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Yuki", text: "Abyss Crown has a pattern. Cold fronts, predictable gaps. I've mapped three entry windows.", position: "right", mood: "neutral" },
          { speaker: "Yuki", text: "The Cryo Leviathan doesn't guard all of them. That's the exploit.", position: "right", mood: "serious" },
          { speaker: "Yuki", text: "I'll send you the data before next launch.", position: "right", mood: "neutral" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "spaceport-yuki-02",
    trigger: "spaceport",
    pilotId: "pilot_yuki",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Yuki", text: "You've been running quieter lately. Fewer unnecessary maneuvers. Good instinct.", position: "right", mood: "neutral" },
          { speaker: "Yuki", text: "Precision isn't slow. It's just deliberate. There's a difference.", position: "right", mood: "happy" },
        ],
      },
    ],
    startNodeId: "start",
  },

  // ── Boss-specific alternate briefings / rematch flavour ─────────────
  {
    id: "briefing-nebula-runway-hard",
    trigger: "pre_mission",
    mapId: "nebula-runway",
    requiredCondition: "nebula-runway-cleared-once",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "Nebula Runway again. The Aegis Dreadnought has been rearmed and redeployed.", position: "left", mood: "worried" },
          { speaker: "Command", text: "New shield configuration on the second pass. Don't assume the same approach works.", position: "left", mood: "serious" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Nova", text: "Rearmed? Good. I was bored.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "briefing-solar-rift-hard",
    trigger: "pre_mission",
    mapId: "solar-rift",
    requiredCondition: "solar-rift-cleared-once",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "The Helios Tyrant is back online. Thermal readings are off the charts this time.", position: "left", mood: "worried" },
          { speaker: "Command", text: "New minion wave pattern. It's calling in escorts. Watch your flanks.", position: "left", mood: "serious" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Rex", text: "More heat. More targets. Works for me.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
  {
    id: "briefing-abyss-crown-hard",
    trigger: "pre_mission",
    mapId: "abyss-crown",
    requiredCondition: "abyss-crown-cleared-once",
    nodes: [
      {
        id: "start",
        lines: [
          { speaker: "Command", text: "It came back. The Cryo Leviathan doesn't stay dead.", position: "left", mood: "worried" },
          { speaker: "Command", text: "Deeper sector. Colder readings. The void is pushing back.", position: "left", mood: "serious" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Yuki", text: "I mapped the gaps last time. I know exactly where to hit it.", position: "right", mood: "serious" },
          { speaker: "Yuki", text: "This time it stays down.", position: "right", mood: "excited" },
        ],
      },
    ],
    startNodeId: "start",
  },
];

export function getDialogueForMap(mapId: string, trigger: "pre_mission" | "post_mission"): DialogueScript | undefined {
  return DIALOGUE_SCRIPTS.find(s => s.trigger === trigger && s.mapId === mapId);
}

export function getSpaceportDialogue(pilotId: string, index: number): DialogueScript | undefined {
  const matches = DIALOGUE_SCRIPTS.filter(s => s.trigger === "spaceport" && s.pilotId === pilotId);
  return matches[index % matches.length];
}
