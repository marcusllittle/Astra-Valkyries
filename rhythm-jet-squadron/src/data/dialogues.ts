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
          { speaker: "Command", text: "Valkyrie squadron, launch clearance granted. Nebula Runway is contested and getting worse by the minute.", position: "left", mood: "neutral" },
          { speaker: "Command", text: "Enemy patrol craft are stacking in the corridor around a hardened command hull. If that lane closes, the whole route closes with it.", position: "left", mood: "serious" },
          { speaker: "Command", text: "Break the screen, keep the pressure on, and do not let the Dreadnought settle into firing position.", position: "left", mood: "serious" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Nova", text: "That corridor only feels crowded because nobody's taught them how to die in sequence yet.", position: "right", mood: "happy" },
          { speaker: "Nova", text: "I'll open the line, hold center mass, and cut the command hull apart when it shows itself.", position: "right", mood: "serious" },
          { speaker: "Nova", text: "Keep up with me and this turns from blockade to wreckage pretty fast.", position: "right", mood: "excited" },
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
          { speaker: "Command", text: "Solar Rift is running beyond projected thermal limits. Hull stress and weapons bloom will both spike inside the flare wall.", position: "left", mood: "worried" },
          { speaker: "Command", text: "The Helios Tyrant is using the heat haze as cover and pushing heavy fire lanes straight through the sector core.", position: "left", mood: "serious" },
          { speaker: "Command", text: "Stay mobile, punish the openings, and do not give the platform time to establish a firing rhythm.", position: "left", mood: "serious" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Rex", text: "Good. If the air is trying to kill us too, at least the fight has some personality.", position: "right", mood: "happy" },
          { speaker: "Rex", text: "I want the Tyrant angry, overheating, and making mistakes before it realizes what's happening.", position: "right", mood: "serious" },
          { speaker: "Rex", text: "You keep the pressure on and I'll make the whole sector feel like an engine fire.", position: "right", mood: "excited" },
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
          { speaker: "Command", text: "Abyss Crown is the deepest breach in the void line. Sensor dropout is severe and long-range tracking is effectively dead inside the descent channel.", position: "left", mood: "worried" },
          { speaker: "Command", text: "The Cryo Leviathan is not behaving like a conventional command unit. It moves like an ambush and controls space like weather.", position: "left", mood: "serious" },
          { speaker: "Command", text: "If the formation breaks, recover it immediately. If the void goes quiet, assume that's the trap.", position: "left", mood: "serious" },
        ],
        nextNodeId: "pilot-response",
      },
      {
        id: "pilot-response",
        lines: [
          { speaker: "Yuki", text: "Quiet sectors don't scare me. They just mean the real pattern hasn't shown itself yet.", position: "right", mood: "neutral" },
          { speaker: "Yuki", text: "I'll read the gaps, track the cold fronts, and cut into the Leviathan when it overcommits.", position: "right", mood: "serious" },
          { speaker: "Yuki", text: "Stay precise. The void only gets to feel infinite if we panic.", position: "right", mood: "excited" },
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
          { speaker: "Command", text: "Nebula Runway is open again. Corridor pressure collapsed the moment that Dreadnought lost central control.", position: "left", mood: "happy" },
          { speaker: "Nova", text: "They folded exactly the way bad formations always do. Too much armor, not enough discipline.", position: "right", mood: "happy" },
          { speaker: "Command", text: "Convoys are already moving. That single clear bought us breathing room across the whole line.", position: "left", mood: "neutral" },
          { speaker: "Nova", text: "Then let's not waste the opening. If the next sector wants to posture, we can educate it too.", position: "right", mood: "excited" },
          { speaker: "Command", text: "Understood. Solar Rift is flashing hot. Recover, rearm, and expect the next briefing immediately.", position: "left", mood: "serious" },
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
          { speaker: "Command", text: "Solar Rift secured. The Helios Tyrant has gone dark and the thermal wall is finally breaking apart.", position: "left", mood: "happy" },
          { speaker: "Rex", text: "It talked big for something that came apart that clean. I almost wanted a second round.", position: "right", mood: "happy" },
          { speaker: "Command", text: "You forced the platform off its rhythm before it could stabilize. That prevented a sector-wide burn cascade.", position: "left", mood: "neutral" },
          { speaker: "Rex", text: "Good. Means all that aggression was technically responsible behavior.", position: "right", mood: "excited" },
          { speaker: "Command", text: "Do not get comfortable. Abyss Crown is next, and nothing in that sector behaves like the targets you've seen so far.", position: "left", mood: "worried" },
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
          { speaker: "Command", text: "Confirmed. Abyss Crown is clear. The Leviathan's signal collapsed and the entire void channel is stabilizing around the breach.", position: "left", mood: "happy" },
          { speaker: "Yuki", text: "It was always going to break once we proved it could bleed. The rest was patience.", position: "right", mood: "happy" },
          { speaker: "Command", text: "No squadron has ever returned from that descent with a kill confirmation. You just rewrote the operational model for the whole front.", position: "left", mood: "serious" },
          { speaker: "Yuki", text: "Good. The old model was built around fear and incomplete data. I prefer cleaner numbers.", position: "right", mood: "neutral" },
          { speaker: "Command", text: "Return to Spaceport. You've earned recovery time, formal honors, and whatever private celebration the squad has clearly been planning.", position: "left", mood: "happy" },
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
