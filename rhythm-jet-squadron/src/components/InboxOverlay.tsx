import { useEffect, useMemo, useState } from "react";
import { resolveAssetUrl } from "../lib/assetUrl";
import { useGame } from "../context/GameContext";
import type { SaveData } from "../types";

type InboxAttachmentType = "image" | "video";

interface InboxAttachment {
  id: string;
  type: InboxAttachmentType;
  url: string;
  fallbackUrl?: string;
  label?: string;
  alt?: string;
  posterUrl?: string;
}

interface InboxMessageTemplate {
  id: string;
  sender: string;
  subject: string;
  body: string;
  preview?: string;
  attachments?: InboxAttachment[];
  timestamp: number;
  isUnlocked: (save: SaveData) => boolean;
}

interface InboxMessage extends Omit<InboxMessageTemplate, "isUnlocked"> {
  read: boolean;
}

const INBOX_STORAGE_KEY = "astra-inbox-state";
const CUSTOM_INBOX_DIR = "/assets/inbox";
const PILOT_INBOX_DIR = `${CUSTOM_INBOX_DIR}/pilot`;
const FORCE_UNLOCK_ALL_MESSAGES = false;
// The portraits are shipped with the game and are the reward carried by
// these transmissions. Keep preview copy and attachment delivery tied to the
// same switch so a message can never promise media that it does not render.
const ENABLE_INBOX_IMAGE_ATTACHMENTS = true;

/** Preview line for a pilot message, honest about whether art will render. */
function previewFor(sender: string): string {
  return ENABLE_INBOX_IMAGE_ATTACHMENTS
    ? `Image attachment • ${sender}`
    : `Private channel • ${sender}`;
}

const PILOT_INBOX_IMAGE_FILES = [
  "job-0293e3f9670d.png",
  "job-0feff59650c1.png",
  "job-1580c67cba0f.png",
  "job-1687718dedbf.png",
  "job-18b83f002d3b.png",
  "job-2317c2a76cdc.png",
  "job-237ac4c28a05.png",
  "job-258f5069a9e4.png",
  "job-25f9ce72f4e2.png",
  "job-299abd761385.png",
  "job-34ef4ae85ab8.png",
  "job-37591a4dc553.png",
  "job-3aa7dfe3dfa3.png",
  "job-40de6c7f66cc.png",
  "job-4224aad1302c.png",
  "job-5428198ab8a5.png",
  "job-579cef10eb54.png",
  "job-59925ccb90b1.png",
  "job-59c948a2dbc7.png",
  "job-5f6b4a3883cb.png",
  "job-61d20b642ea6.png",
  "job-662b0357b0b1.png",
  "job-6e32a6cafbc4.png",
  "job-6e47ae953da7.png",
  "job-7497ff27a6a8.png",
  "job-79e2f2901e2a.png",
  "job-7fb136e70f43.png",
  "job-86907f0b405c.png",
  "job-8dfef186deab.png",
  "job-8ef63e85efd5.png",
  "job-936676db1aef.png",
  "job-96defc2175e0.png",
  "job-9d45b881640c.png",
  "job-a7472bd3f2ad.png",
  "job-ab584110f2bc.png",
  "job-b07dad412efa.png",
  "job-b69d7cf835ba.png",
  "job-b7976885127b.png",
  "job-c3365d5992bb.png",
  "job-c4ef8033e72a.png",
  "job-cd0d5fbdbe10.png",
  "job-cf915b36f797.png",
  "job-db91ab3c40d9.png",
  "job-e00bddb9cd48.png",
  "job-e2befefa71c4.png",
  "job-e44077260ed9.png",
  "job-e9f257f7c4ca.png",
  "job-ed54caae2fec.png",
  "job-efe967b1cac5.png",
  "job-ff6ef5ead0f2.png",
  "nova_after_hours.png",
  "rex_afterburn.png",
  "yuki_midnight_archive.png",
] as const;

const PILOT_SENDERS = ["Nova", "Rex", "Yuki"] as const;
type PilotSender = (typeof PILOT_SENDERS)[number];

const PILOT_MESSAGE_POOLS: Record<PilotSender, Array<{ subject: string; body: string }>> = {
  Nova: [
    {
      subject: "Caught you looking",
      body: "You flew well. I felt generous. Enjoy the view and try not to get weird about it.\n\n- Nova",
    },
    {
      subject: "After-hours channel",
      body: "Off-duty transmission. No briefing language, no squad chatter, no excuses. Just me.\n\n- Nova",
    },
    {
      subject: "Private send",
      body: "Before you ask, yes, this was meant for you. Don't make me regret having good taste.\n\n- Nova",
    },
    {
      subject: "Keep this one close",
      body: "Thought you'd want something better than telemetry and mission logs for once.\n\n- Nova",
    },
    {
      subject: "You earned this",
      body: "I don't hand these out to just anyone. The run was clean and so was your focus.\n\nDon't make it weird.\n\n- Nova",
    },
    {
      subject: "Off the record",
      body: "Command doesn't see this channel. Neither does the squad. It's just ours now.\n\nI wasn't sure I'd say that. Now I have.\n\n- Nova",
    },
    {
      subject: "Admit it",
      body: "You've been checking your inbox more than your threat radar.\n\nI respect the priorities.\n\n- Nova",
    },
    {
      subject: "No context needed",
      body: "You'll understand what this is. You've been paying attention.\n\nGood.\n\n- Nova",
    },
    {
      subject: "Between sorties",
      body: "There's a gap in the briefing schedule. I used it productively.\n\nSo did you, apparently — you're reading this instead of sleeping.\n\n- Nova",
    },
    {
      subject: "Signal strength: high",
      body: "Your attention doesn't waver much. I've noticed.\n\nThis is what that gets you.\n\n- Nova",
    },
    {
      subject: "Still thinking about the last run",
      body: "The way you held formation right up until you had to break was actually kind of beautiful.\n\nThis is what beautiful gets you.\n\n- Nova",
    },
    {
      subject: "Prelaunch ritual",
      body: "I have a thing I do before every sortie. You wouldn't know about it.\n\nNow you have a version of it.\n\n- Nova",
    },
  ],
  Rex: [
    {
      subject: "Still focused?",
      body: "Consider this a stress test for your concentration. If it fails, that's not my problem.\n\n- Rex",
    },
    {
      subject: "Afterburn drop",
      body: "You cleared the run, so I sent something with a little more heat behind it. Don't waste it.\n\n- Rex",
    },
    {
      subject: "You can handle this",
      body: "If this scrambles your thoughts, maybe you needed the practice.\n\n- Rex",
    },
    {
      subject: "Off-channel",
      body: "Not for command, not for the squad, not for the archive. Just your inbox.\n\n- Rex",
    },
    {
      subject: "Heat signature",
      body: "You run hot under pressure. So do I.\n\nMake of that what you will.\n\n- Rex",
    },
    {
      subject: "Post-mission window",
      body: "Adrenaline drops fast after a clean kill streak. Here's something to keep it elevated.\n\n- Rex",
    },
    {
      subject: "No questions",
      body: "I don't explain my decisions in the field. I don't explain this one either.\n\nJust open it.\n\n- Rex",
    },
    {
      subject: "High score: distraction",
      body: "You're going to look at this and lose ten seconds of mission prep.\n\nWorth it. Probably.\n\n- Rex",
    },
    {
      subject: "Throttle check",
      body: "Some people can't handle full power.\n\nI'm betting you can.\n\n- Rex",
    },
    {
      subject: "Unscheduled transmission",
      body: "Command didn't authorize this. I sent it anyway.\n\nI do that sometimes.\n\n- Rex",
    },
    {
      subject: "Full burn",
      body: "You don't hold back when it counts. Neither do I.\n\nThis is what that looks like outside the cockpit.\n\n- Rex",
    },
    {
      subject: "Second pass",
      body: "The first run was to see what you could do. You passed.\n\nSecond pass is a reward.\n\n- Rex",
    },
  ],
  Yuki: [
    {
      subject: "Archive access",
      body: "This transmission is quieter than my mission logs, but probably more useful to you.\n\n- Yuki",
    },
    {
      subject: "For your eyes only",
      body: "You get the formal reports already. I thought you deserved the version with less distance in it.\n\n- Yuki",
    },
    {
      subject: "Midnight transmission",
      body: "No tactical value. No strategic importance. I sent it anyway.\n\n- Yuki",
    },
    {
      subject: "Closer than usual",
      body: "If this feels more personal than my normal messages, that was intentional.\n\n- Yuki",
    },
    {
      subject: "Encrypted send",
      body: "I ran three encryption layers on this. Not because it's required.\n\nBecause I wanted it to feel like it was only for you.\n\n- Yuki",
    },
    {
      subject: "Rest cycle",
      body: "I don't sleep well before deployments. So I sent this instead.\n\nNow it's your problem too.\n\n- Yuki",
    },
    {
      subject: "Precision drop",
      body: "You're careful. Deliberate. I notice those things.\n\nThis is the version of me that matches that energy.\n\n- Yuki",
    },
    {
      subject: "Low-emission channel",
      body: "Minimum interference. Maximum signal.\n\nThat's the idea. You can decide if it worked.\n\n- Yuki",
    },
    {
      subject: "Secondary file",
      body: "The official record has the mission stats. This file has something else entirely.\n\n- Yuki",
    },
    {
      subject: "Observation note",
      body: "I watch the data more than most. I also watched the last run.\n\nYou're worth observing.\n\n- Yuki",
    },
    {
      subject: "Quiet sector",
      body: "There's a lull between engagements. I used it to think about something I don't usually admit.\n\nThen I sent you this.\n\n- Yuki",
    },
    {
      subject: "Subzero calm",
      body: "People think I'm cold because I'm focused. They're not wrong.\n\nBut there are exceptions.\n\n- Yuki",
    },
  ],
};

// Pilot image flow: run-count gated so images arrive over the course of
// play instead of all showing up at once. The 3 named pilot portraits
// (nova_after_hours, rex_afterburn, yuki_midnight_archive) are excluded
// here because BASE_MESSAGES below already has hand-written entries for
// them gated by specific mission grades - including them in the batch
// would duplicate the image under a canned subject line.
const PILOT_BATCH_IMAGE_FILES = PILOT_INBOX_IMAGE_FILES.filter((name) =>
  name.startsWith("job-")
);

// First few inbox rewards come quickly, then the drip slows so later
// unlocks still feel earned instead of flooding all at once.
function unlocksAtRun(index: number): number {
  if (index < 6) return index + 1;
  if (index < 18) return 6 + Math.ceil((index - 5) * 1.5);
  return 24 + (index - 17) * 2;
}

function batchMessageUnlocked(save: SaveData, index: number): boolean {
  const requiredRuns = unlocksAtRun(index);
  const successfulClears = Object.values(save.zoneClears ?? {}).reduce((sum, count) => sum + count, 0);
  const bossMomentum = save.totalBossKills * 2;
  return save.totalRuns + successfulClears + bossMomentum >= requiredRuns;
}

function buildPilotInboxMessages(): InboxMessageTemplate[] {
  // Base timestamp pinned so the spread across messages stays deterministic
  // for the session. Newer (lower index) messages appear most recent.
  const now = Date.now();
  return PILOT_BATCH_IMAGE_FILES.map((filename, index) => {
    // Round-robin pilot assignment so each pilot gets an even share of the
    // batch instead of filename-hash bias. index 0 → Nova, 1 → Rex, 2 → Yuki...
    const sender = PILOT_SENDERS[index % PILOT_SENDERS.length];
    const sequence = String(index + 1).padStart(2, "0");
    const pool = PILOT_MESSAGE_POOLS[sender];
    const variant = pool[index % pool.length];
    return {
      id: `msg-pilot-image-${filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      sender,
      subject: variant.subject,
      preview: previewFor(sender),
      body: variant.body,
      attachments: ENABLE_INBOX_IMAGE_ATTACHMENTS
        ? [
            {
              id: `pilot-image-${sequence}`,
              type: "image",
              url: `${PILOT_INBOX_DIR}/${filename}`,
              fallbackUrl: `/assets/outfits/${sender === "Nova" ? "cosmic_surge" : sender === "Rex" ? "solar_flare" : "lunar_eclipse"}.png`,
              alt: `${sender} inbox portrait`,
              label: `${sender} transmission`,
            },
          ]
        : undefined,
      // Newer messages at lower index surface first; timestamps are offset
      // far enough apart that the spread reads as "arrived over days".
      timestamp: now - index * 1000 * 60 * 60 * 3, // 3h apart
      isUnlocked: (save) => batchMessageUnlocked(save, index),
    };
  });
}

function loadInboxState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
    );
  } catch {
    return {};
  }
}

function saveInboxState(state: Record<string, boolean>) {
  localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(state));
}

// Placeholder messages - in production these come from the server
const BASE_MESSAGES: InboxMessageTemplate[] = [
  {
    id: "msg-welcome",
    sender: "HQ Command",
    subject: "Welcome to the Valkyrie Program",
    preview: "Elite squadron onboarding packet",
    body: "Pilot, welcome aboard. You've been selected for the most elite squadron in the fleet. Your skill, courage, and determination will be tested beyond measure. Report to the hangar for your first briefing.\n\nThe stars await.",
    timestamp: Date.now() - 86400000,
    isUnlocked: () => true,
  },
  {
    id: "msg-intel-nebula",
    sender: "Intelligence Division",
    subject: "Nebula Runway - Threat Assessment",
    preview: "Heavy enemy activity confirmed",
    body: "Our scouts report increased enemy activity in the Nebula Runway sector. New heavy units have been deployed - codename 'Tank Fortress'. These armored platforms feature rotating shield generators. Focus fire during shield downtime windows.\n\nStay sharp out there.",
    timestamp: Date.now() - 43200000,
    isUnlocked: () => true,
  },
  {
    id: "msg-nova-personal",
    sender: "Nova",
    subject: "You were staring. I checked.",
    preview: previewFor("Nova"),
    body: "You do that thing after a sortie where you act calm and then absolutely fail to hide your eyes.\n\nSo here. Off-duty Nova. Consider this a reward for surviving your first real run.\n\nIf that expression on your face gets any more obvious, I'm charging you for the view.\n\n- Nova",
    attachments: ENABLE_INBOX_IMAGE_ATTACHMENTS
      ? [
          {
            id: "nova-photo",
            type: "image",
            url: `${PILOT_INBOX_DIR}/nova_after_hours.png`,
            fallbackUrl: "/assets/outfits/cosmic_surge.png",
            alt: "Nova off-duty portrait",
            label: "Nova portrait",
          },
        ]
      : undefined,
    timestamp: Date.now() - 5400000,
    isUnlocked: (save) => save.totalRuns >= 1,
  },
  {
    id: "msg-rex-personal",
    sender: "Rex",
    subject: "Try not to lose focus",
    preview: previewFor("Rex"),
    body: "Cleared Nebula and suddenly you look like you can handle premium distractions.\n\nTell me this shot doesn't work and I'll call you a liar to your face.\n\nIf it does work, maybe keep that reaction in a private channel. Or don't. I'm flexible.\n\n- Rex",
    attachments: ENABLE_INBOX_IMAGE_ATTACHMENTS
      ? [
          {
            id: "rex-photo",
            type: "image",
            url: `${PILOT_INBOX_DIR}/rex_afterburn.png`,
            fallbackUrl: "/assets/outfits/solar_flare.png",
            alt: "Rex portrait in Solar Flare outfit",
            label: "Rex portrait",
          },
        ]
      : undefined,
    timestamp: Date.now() - 3300000,
    isUnlocked: (save) => Boolean(save.bestGrades["nebula-runway"]),
  },
  {
    id: "msg-yuki-personal",
    sender: "Yuki",
    subject: "For your eyes only",
    preview: previewFor("Yuki"),
    body: "You get battle telemetry, accuracy logs, and mission records. That is an unforgivably sterile version of me.\n\nThis one is better. Quieter. Closer.\n\nIf you're blushing, good. It means you were paying attention.\n\n- Yuki",
    attachments: ENABLE_INBOX_IMAGE_ATTACHMENTS
      ? [
          {
            id: "yuki-photo",
            type: "image",
            url: `${PILOT_INBOX_DIR}/yuki_midnight_archive.png`,
            fallbackUrl: "/assets/outfits/lunar_eclipse.png",
            alt: "Yuki portrait in Lunar Eclipse outfit",
            label: "Yuki portrait",
          },
        ]
      : undefined,
    timestamp: Date.now() - 2100000,
    isUnlocked: (save) => Boolean(save.bestGrades["solar-rift"]),
  },
  {
    id: "msg-nova-video",
    sender: "Nova",
    subject: "Replay this when you miss me",
    preview: "Video attachment • Nova",
    body: "Cockpit lights, open channel, no witnesses. Seemed unfair not to use the moment.\n\nIf you watch this more than once, I want honesty about why.\n\nActually, no. I already know why.\n\n- Nova",
    attachments: [
      {
        id: "nova-video",
        type: "video",
        url: "/assets/cutins/nova_fever.mp4",
        posterUrl: `${PILOT_INBOX_DIR}/nova_after_hours.png`,
        label: "Nova cockpit video",
      },
    ],
    timestamp: Date.now() - 900000,
    isUnlocked: (save) => Boolean(save.bestGrades["nebula-runway"]) && save.totalRuns >= 2,
  },
  {
    id: "msg-rex-video",
    sender: "Rex",
    subject: "Full burn. Private channel.",
    preview: "Video attachment • Rex",
    body: "You keep asking what I look like when the heat spikes and the comms go quiet. Consider the question answered.\n\nTry to keep up on the next run.\n\n- Rex",
    attachments: [
      {
        id: "rex-video",
        type: "video",
        url: "/assets/cutins/rex_fever.mp4",
        posterUrl: `${PILOT_INBOX_DIR}/rex_afterburn.png`,
        label: "Rex afterburn video",
      },
    ],
    timestamp: Date.now() - 780000,
    isUnlocked: (save) => Boolean(save.bestGrades["solar-rift"]) && save.totalRuns >= 3,
  },
  {
    id: "msg-yuki-video",
    sender: "Yuki",
    subject: "Do not archive this",
    preview: "Video attachment • Yuki",
    body: "The official archive gets clean footage and tactical overlays. You get this version.\n\nNo annotations. No distance. Just the moment as it was.\n\n- Yuki",
    attachments: [
      {
        id: "yuki-video",
        type: "video",
        url: "/assets/cutins/yuki_fever.mp4",
        posterUrl: `${PILOT_INBOX_DIR}/yuki_midnight_archive.png`,
        label: "Yuki midnight video",
      },
    ],
    timestamp: Date.now() - 700000,
    isUnlocked: (save) => Boolean(save.bestGrades["abyss-crown"]) && save.totalRuns >= 4,
  },
  {
    id: "msg-grade-a-brief",
    sender: "Flight Ops",
    subject: "A-Rank review posted",
    preview: "Performance bracket elevated",
    body: "Your last sortie cleared the A-rank threshold. That puts you above the noise floor and squarely on command's radar.\n\nExpect sharper resistance and better rewards from here on out.",
    timestamp: Date.now() - 620000,
    isUnlocked: (save) => Object.values(save.bestGrades).some((grade) => grade === "A" || grade === "S"),
  },
  {
    id: "msg-boss-kill-directive",
    sender: "HQ Command",
    subject: "Boss kill confirmation",
    preview: "Priority sortie clearance raised",
    body: "Confirmed: hostile command unit destroyed. That kill changes your standing immediately.\n\nPilots notice things like that. So does Command.",
    timestamp: Date.now() - 520000,
    isUnlocked: (save) => save.totalBossKills >= 1,
  },
  {
    id: "msg-repeat-clear-nova",
    sender: "Nova",
    subject: "You keep coming back cleaner",
    preview: "Private channel ping • Nova",
    body: "One clean run is talent. Doing it again means you know exactly what you're doing.\n\nThat makes you more interesting.\n\n- Nova",
    timestamp: Date.now() - 470000,
    isUnlocked: (save) => (save.zoneClears["nebula-runway"] ?? 0) >= 2,
  },
  {
    id: "msg-repeat-clear-rex",
    sender: "Rex",
    subject: "Still alive. Still hot.",
    preview: "Private channel ping • Rex",
    body: "You keep stacking clears like you're trying to show off.\n\nIt's working.\n\n- Rex",
    timestamp: Date.now() - 420000,
    isUnlocked: (save) => (save.zoneClears["solar-rift"] ?? 0) >= 2 || save.totalBossKills >= 2,
  },
  {
    id: "msg-repeat-clear-yuki",
    sender: "Yuki",
    subject: "Pattern confirmed",
    preview: "Private channel ping • Yuki",
    body: "The first clear could have been momentum. Repeating it means the pattern is real.\n\nI prefer repeatable things.\n\n- Yuki",
    timestamp: Date.now() - 390000,
    isUnlocked: (save) => (save.zoneClears["abyss-crown"] ?? 0) >= 1 || save.totalBossKills >= 3,
  },
  {
    id: "msg-command-after-abyss",
    sender: "HQ Command",
    subject: "Crew Morale Advisory",
    preview: "Pilots requesting more direct communication",
    body: "Your post-sortie performance has had an observable effect on squad morale.\n\nUnofficial translation: several pilots are now using priority channels to flirt with you instead of filing clean debriefs.\n\nCommand will allow this to continue as long as mission readiness remains unaffected.",
    timestamp: Date.now() - 300000,
    isUnlocked: (save) => Boolean(save.bestGrades["abyss-crown"]),
  },
  {
    id: "msg-s-rank-command",
    sender: "Strategic Command",
    subject: "S-rank sortie flagged",
    preview: "Top-bracket combat review",
    body: "Your S-rank combat review has been circulated to senior command staff.\n\nThat is not routine. Maintain pressure. The squad is starting to orbit around your results.",
    timestamp: Date.now() - 180000,
    isUnlocked: (save) => Object.values(save.bestGrades).includes("S"),
  },
];

const PLACEHOLDER_MESSAGES: InboxMessageTemplate[] = [...buildPilotInboxMessages(), ...BASE_MESSAGES];

function getInboxMessages(save: SaveData): InboxMessage[] {
  return PLACEHOLDER_MESSAGES
    .filter((message) => FORCE_UNLOCK_ALL_MESSAGES || message.isUnlocked(save))
    .map((message) => ({
      id: message.id,
      sender: message.sender,
      subject: message.subject,
      body: message.body,
      preview: message.preview,
      attachments: message.attachments,
      timestamp: message.timestamp,
      read: false,
    }));
}

function AttachmentImage({ attachment, onOpen }: { attachment: InboxAttachment; onOpen: (src: string) => void }) {
  const [src, setSrc] = useState(() => resolveAssetUrl(attachment.url) ?? attachment.url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="inbox-media-error" role="status">
        <span aria-hidden="true">⌁</span>
        <strong>Attachment unavailable</strong>
        <small>The transmission text is still intact.</small>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`inbox-image-button ${loaded ? "is-loaded" : ""}`}
      onClick={() => onOpen(src)}
      aria-label={`Open ${attachment.label ?? "image attachment"} full screen`}
    >
      <img
        src={src}
        alt={attachment.alt ?? attachment.label ?? ""}
        draggable={false}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          const fallbackSrc = attachment.fallbackUrl
            ? resolveAssetUrl(attachment.fallbackUrl) ?? attachment.fallbackUrl
            : null;
          if (fallbackSrc && fallbackSrc !== src) {
            setLoaded(false);
            setSrc(fallbackSrc);
            return;
          }
          setFailed(true);
        }}
      />
      <span className="inbox-media-expand">
        <span aria-hidden="true">↗</span> View full frame
      </span>
    </button>
  );
}

function AttachmentVideo({ attachment }: { attachment: InboxAttachment }) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveAssetUrl(attachment.url) ?? attachment.url;

  return (
    <div className="inbox-media-frame inbox-media-frame--video">
      <div className="inbox-media-caption">
        <span><span className="inbox-media-type" aria-hidden="true">▶</span>{attachment.label ?? "Video attachment"}</span>
        <span className="inbox-media-secure">Encrypted clip</span>
      </div>
      {failed ? (
        <div className="inbox-media-error" role="status">
          <span aria-hidden="true">⌁</span>
          <strong>Clip could not be loaded</strong>
          <small>Try reopening this transmission.</small>
        </div>
      ) : (
        <video
          src={resolvedUrl}
          poster={resolveAssetUrl(attachment.posterUrl)}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {

  return (
    <div
      className="inbox-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button type="button" className="inbox-lightbox-close" onClick={onClose} aria-label="Close image preview">×</button>
      <img
        src={src}
        alt=""
        draggable={false}
      />
      <span className="inbox-lightbox-hint">Press Esc or click outside to close</span>
    </div>
  );
}

interface InboxOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

type InboxFilter = "all" | "unread" | "media";

function senderKey(sender: string): string {
  const normalized = sender.toLowerCase();
  if (normalized === "nova" || normalized === "rex" || normalized === "yuki") return normalized;
  if (normalized.includes("command") || normalized.includes("ops")) return "command";
  return "intel";
}

function senderInitials(sender: string): string {
  return sender
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatListTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function InboxOverlay({ isOpen, onClose }: InboxOverlayProps) {
  const { save } = useGame();
  const [readState, setReadState] = useState(loadInboxState);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const isMobile = useIsMobile();

  const messages = useMemo(
    () =>
      getInboxMessages(save)
        .sort((left, right) => right.timestamp - left.timestamp)
        .map((message) => ({
          ...message,
          read: readState[message.id] ?? message.read,
        })),
    [readState, save]
  );

  const unreadCount = messages.filter(m => !m.read).length;
  const selectedMessage = messages.find((message) => message.id === selectedMessageId) ?? null;
  const visibleMessages = useMemo(() => {
    const filtered = messages.filter((message) => {
      if (filter === "unread") return !message.read;
      if (filter === "media") return Boolean(message.attachments?.length);
      return true;
    });
    if (selectedMessage && !filtered.some((message) => message.id === selectedMessage.id)) {
      return [selectedMessage, ...filtered];
    }
    return filtered;
  }, [filter, messages, selectedMessage]);
  const selectedVisibleIndex = visibleMessages.findIndex((message) => message.id === selectedMessageId);

  useEffect(() => {
    saveInboxState(readState);
  }, [readState]);

  useEffect(() => {
    if (!isOpen || isMobile || messages.length === 0 || selectedMessageId) return;
    const firstUnread = messages.find((message) => !message.read) ?? messages[0];
    const frame = window.requestAnimationFrame(() => {
      setSelectedMessageId(firstUnread.id);
      setReadState((previous) => previous[firstUnread.id] ? previous : { ...previous, [firstUnread.id]: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, isOpen, messages, selectedMessageId]);

  useEffect(() => {
    if (!selectedMessageId) return;
    const stillVisible = messages.some((message) => message.id === selectedMessageId);
    if (!stillVisible) {
      const frame = window.requestAnimationFrame(() => setSelectedMessageId(messages[0]?.id ?? null));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [messages, selectedMessageId]);

  const selectMessage = (msg: InboxMessage) => {
    setSelectedMessageId(msg.id);
    setReadState(prev => ({ ...prev, [msg.id]: true }));
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (lightboxSrc) setLightboxSrc(null);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, lightboxSrc, onClose]);

  const markAllRead = () => {
    setReadState((previous) => ({
      ...previous,
      ...Object.fromEntries(messages.map((message) => [message.id, true])),
    }));
  };

  const renderAttachment = (attachment: InboxAttachment) => {
    if (attachment.type === "video") {
      return <AttachmentVideo key={attachment.id} attachment={attachment} />;
    }

    return (
      <div key={attachment.id} className="inbox-media-frame inbox-media-frame--image">
        <div className="inbox-media-caption">
          <span><span className="inbox-media-type" aria-hidden="true">◇</span>{attachment.label ?? "Image attachment"}</span>
          <span className="inbox-media-secure">Private frame</span>
        </div>
        <AttachmentImage attachment={attachment} onOpen={setLightboxSrc} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div
        className="inbox-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section className="inbox-shell" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
          <header className="inbox-header">
            <div className="inbox-heading">
              <span className="inbox-signal-mark" aria-hidden="true"><i /><i /><i /></span>
              <div>
                <span className="inbox-eyebrow">Valkyrie private network</span>
                <div className="inbox-title-row">
                  <h2 id="inbox-title">Squadron Comms</h2>
                  {unreadCount > 0 && <span className="inbox-unread-badge">{unreadCount} new</span>}
                </div>
              </div>
            </div>
            <div className="inbox-header-actions">
              <button type="button" className="inbox-mark-read" onClick={markAllRead} disabled={unreadCount === 0}>
                <span aria-hidden="true">✓✓</span> Mark all read
              </button>
              <button type="button" className="inbox-close" onClick={onClose} aria-label="Close inbox">×</button>
            </div>
          </header>

          <div className="inbox-toolbar">
            <div className="inbox-channel-status">
              <span className="inbox-live-dot" aria-hidden="true" />
              Secure channel online
              <span className="inbox-message-total">{messages.length} transmissions</span>
            </div>
            <div className="inbox-filters" aria-label="Filter transmissions">
              {(["all", "unread", "media"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={filter === option ? "is-active" : ""}
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option === "all" ? "All" : option === "unread" ? `Unread ${unreadCount || ""}` : "Media"}
                </button>
              ))}
            </div>
          </div>

          <div className={`inbox-layout ${selectedMessageId ? "has-selection" : ""}`}>
            <aside className="inbox-list-pane" aria-hidden={isMobile && Boolean(selectedMessageId)}>
              <div className="inbox-list-scroll">
                {visibleMessages.length > 0 ? visibleMessages.map((message) => {
                  const key = senderKey(message.sender);
                  const mediaType = message.attachments?.some((attachment) => attachment.type === "video")
                    ? "video"
                    : message.attachments?.length
                      ? "image"
                      : null;
                  return (
                    <button
                      type="button"
                      key={message.id}
                      className={`inbox-list-item ${selectedMessageId === message.id ? "is-selected" : ""} ${message.read ? "is-read" : "is-unread"}`}
                      onClick={() => selectMessage(message)}
                      tabIndex={isMobile && Boolean(selectedMessageId) ? -1 : 0}
                    >
                      <span className="inbox-item-accent" data-sender={key} aria-hidden="true" />
                      <span className="inbox-avatar" data-sender={key}>{senderInitials(message.sender)}</span>
                      <span className="inbox-item-copy">
                        <span className="inbox-item-topline">
                          <strong>{message.sender}</strong>
                          <time dateTime={new Date(message.timestamp).toISOString()}>{formatListTime(message.timestamp)}</time>
                        </span>
                        <span className="inbox-item-subject">{message.subject}</span>
                        <span className="inbox-item-preview">
                          {mediaType && <span className={`inbox-item-media inbox-item-media--${mediaType}`}>{mediaType === "video" ? "▶ Clip" : "◇ Image"}</span>}
                          {message.preview ?? message.body}
                        </span>
                      </span>
                      {!message.read && <span className="inbox-item-unread" aria-label="Unread" />}
                    </button>
                  );
                }) : (
                  <div className="inbox-list-empty">
                    <span aria-hidden="true">⌁</span>
                    <strong>No transmissions here</strong>
                    <small>Try a different filter.</small>
                  </div>
                )}
              </div>
            </aside>

            <main className="inbox-detail-pane" aria-hidden={isMobile && !selectedMessageId}>
              {selectedMessage ? (
                <article key={selectedMessage.id} className={`inbox-message ${selectedMessage.attachments?.length ? "has-media" : ""}`}>
                  <button type="button" className="inbox-back-to-list" onClick={() => setSelectedMessageId(null)}>
                    <span aria-hidden="true">←</span> Transmissions
                  </button>

                  <div className="inbox-message-layout">
                    {selectedMessage.attachments?.length ? (
                      <div className="inbox-attachments">{selectedMessage.attachments.map(renderAttachment)}</div>
                    ) : null}

                    <div className="inbox-message-copy">
                      <div className="inbox-message-channel">
                        <span className="inbox-channel-chip"><span aria-hidden="true">●</span> Direct transmission</span>
                        <span className="inbox-encryption">E2E / AES-256</span>
                      </div>
                      <header className="inbox-message-header">
                        <div className="inbox-detail-sender">
                          <span className="inbox-avatar inbox-avatar--large" data-sender={senderKey(selectedMessage.sender)}>
                            {senderInitials(selectedMessage.sender)}
                          </span>
                          <span>
                            <small>From</small>
                            <strong>{selectedMessage.sender}</strong>
                          </span>
                        </div>
                        <time dateTime={new Date(selectedMessage.timestamp).toISOString()}>
                          {new Date(selectedMessage.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </header>
                      <h3>{selectedMessage.subject}</h3>
                      <p className="inbox-message-body">{selectedMessage.body}</p>

                      <footer className="inbox-message-footer">
                        <span><i aria-hidden="true" /> Transmission authenticated</span>
                        <div className="inbox-message-nav">
                          <button
                            type="button"
                            disabled={selectedVisibleIndex <= 0}
                            onClick={() => selectMessage(visibleMessages[selectedVisibleIndex - 1])}
                            aria-label="Open newer transmission"
                          >
                            ←
                          </button>
                          <span>{selectedVisibleIndex + 1} / {visibleMessages.length}</span>
                          <button
                            type="button"
                            disabled={selectedVisibleIndex < 0 || selectedVisibleIndex >= visibleMessages.length - 1}
                            onClick={() => selectMessage(visibleMessages[selectedVisibleIndex + 1])}
                            aria-label="Open older transmission"
                          >
                            →
                          </button>
                        </div>
                      </footer>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="inbox-detail-empty">
                  <span className="inbox-empty-orbit" aria-hidden="true"><i /><i /></span>
                  <span className="inbox-eyebrow">Awaiting selection</span>
                  <h3>Choose a transmission</h3>
                  <p>Mission intel and private pilot media will appear here.</p>
                </div>
              )}
            </main>
          </div>
        </section>
      </div>
    </>
  );
}

// This read helper intentionally lives beside the module-private message table.
// eslint-disable-next-line react-refresh/only-export-components
export function getUnreadCount(save: SaveData): number {
  const state = loadInboxState();
  return getInboxMessages(save).filter((message) => !state[message.id]).length;
}
