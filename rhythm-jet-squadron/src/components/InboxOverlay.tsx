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
      body: "Clean run. Clean enough that I figured you earned something off-record for once.\n\n- Nova",
    },
    {
      subject: "After-hours channel",
      body: "No command voice, no tactical jargon, no helmet. Just a better signal after a good sortie.\n\n- Nova",
    },
    {
      subject: "Private send",
      body: "You cleared the lane, so I sent something that wasn't another stack of telemetry. Try to appreciate the upgrade.\n\n- Nova",
    },
    {
      subject: "Keep this one close",
      body: "You looked like you needed one nice thing after the run. I decided to be generous.\n\n- Nova",
    },
    {
      subject: "Post-sortie indulgence",
      body: "Mission complete, pressure off, and suddenly I felt like being distracting on purpose. Funny how that happens.\n\n- Nova",
    },
    {
      subject: "Unread priority",
      body: "You brought the ship back in one piece. That gets you access to better material than the official briefing archive.\n\n- Nova",
    },
  ],
  Rex: [
    {
      subject: "Still focused?",
      body: "You survived the run, so let's see if your concentration survives this too.\n\n- Rex",
    },
    {
      subject: "Afterburn drop",
      body: "Successful sortie, hot engines, bad judgment. That's usually when the fun mail gets sent.\n\n- Rex",
    },
    {
      subject: "You can handle this",
      body: "You cleared the mission, so I assumed you could handle a little extra heat in your inbox.\n\n- Rex",
    },
    {
      subject: "Off-channel",
      body: "Not for command review. Not for squad logs. Just for the person who actually finished the fight.\n\n- Rex",
    },
    {
      subject: "Post-combat static",
      body: "Adrenaline's still high after that run. Seemed smarter to dump it into your inbox than start a hallway incident.\n\n- Rex",
    },
    {
      subject: "Victory tax",
      body: "You win, I send something reckless. Call it a tradition if you keep performing like that.\n\n- Rex",
    },
  ],
  Yuki: [
    {
      subject: "Archive access",
      body: "You completed the sortie. I thought you deserved something quieter than another performance breakdown.\n\n- Yuki",
    },
    {
      subject: "For your eyes only",
      body: "The official reports are useful. They are also an incomplete version of me. This is better.\n\n- Yuki",
    },
    {
      subject: "Midnight transmission",
      body: "No strategic importance. No tactical relevance. It felt right to send after a successful run.\n\n- Yuki",
    },
    {
      subject: "Closer than usual",
      body: "You flew well. I noticed. This message is what happens when I stop pretending I did not.\n\n- Yuki",
    },
    {
      subject: "Quiet reward",
      body: "Some people celebrate loudly. I prefer a cleaner signal, sent to the person who earned it.\n\n- Yuki",
    },
    {
      subject: "Personal archive",
      body: "You get mission logs from everyone else. I thought you might want the version with a little less distance in it.\n\n- Yuki",
    },
  ],
};

function inferPilotSender(filename: string): PilotSender {
  const lower = filename.toLowerCase();
  if (lower.includes("nova")) return "Nova";
  if (lower.includes("rex")) return "Rex";
  if (lower.includes("yuki")) return "Yuki";

  let hash = 0;
  for (let index = 0; index < filename.length; index += 1) {
    hash = (hash + filename.charCodeAt(index)) % PILOT_SENDERS.length;
  }

  return PILOT_SENDERS[hash];
}

function buildPilotInboxMessages(): InboxMessageTemplate[] {
  const now = Date.now();
  return PILOT_INBOX_IMAGE_FILES.map((filename, index) => {
    const sender = inferPilotSender(filename);
    const sequence = String(index + 1).padStart(2, "0");
    const pool = PILOT_MESSAGE_POOLS[sender];
    const variant = pool[index % pool.length];
    return {
      id: `msg-pilot-image-${filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      sender,
      subject: variant.subject,
      preview: `Image attachment • ${sender}`,
      body: variant.body,
      attachments: [
        {
          id: `pilot-image-${sequence}`,
          type: "image",
          url: `${PILOT_INBOX_DIR}/${filename}`,
          fallbackUrl: `/assets/outfits/${sender === "Nova" ? "cosmic_surge" : sender === "Rex" ? "solar_flare" : "lunar_eclipse"}.png`,
          alt: `${sender} inbox portrait`,
          label: `${sender} transmission`,
        },
      ],
      timestamp: now - index * 90000,
      isUnlocked: (save) => save.totalBossKills >= index + 1 || save.totalRuns >= (index + 1) * 2,
    };
  });
}

function loadInboxState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
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
    body: "Our scouts report increased enemy activity in the Nebula Runway sector. New heavy units have been deployed — codename 'Tank Fortress'. These armored platforms feature rotating shield generators. Focus fire during shield downtime windows.\n\nStay sharp out there.",
    timestamp: Date.now() - 43200000,
    isUnlocked: () => true,
  },
  {
    id: "msg-nova-personal",
    sender: "Nova",
    subject: "You were staring. I checked.",
    preview: "Image attachment • Nova",
    body: "You do that thing after a sortie where you act calm and then absolutely fail to hide your eyes.\n\nSo here. Off-duty Nova. Consider this a reward for surviving your first real run.\n\nIf that expression on your face gets any more obvious, I'm charging you for the view.\n\n- Nova",
    attachments: [
      {
        id: "nova-photo",
        type: "image",
        url: `${PILOT_INBOX_DIR}/nova_after_hours.png`,
        fallbackUrl: "/assets/outfits/cosmic_surge.png",
        alt: "Nova off-duty portrait",
        label: "Nova portrait",
      },
    ],
    timestamp: Date.now() - 5400000,
    isUnlocked: (save) => save.totalRuns >= 1,
  },
  {
    id: "msg-rex-personal",
    sender: "Rex",
    subject: "Try not to lose focus",
    preview: "Image attachment • Rex",
    body: "Cleared Nebula and suddenly you look like you can handle premium distractions.\n\nTell me this shot doesn't work and I'll call you a liar to your face.\n\nIf it does work, maybe keep that reaction in a private channel. Or don't. I'm flexible.\n\n- Rex",
    attachments: [
      {
        id: "rex-photo",
        type: "image",
        url: `${PILOT_INBOX_DIR}/rex_afterburn.png`,
        fallbackUrl: "/assets/outfits/solar_flare.png",
        alt: "Rex portrait in Solar Flare outfit",
        label: "Rex portrait",
      },
    ],
    timestamp: Date.now() - 3300000,
    isUnlocked: (save) => Boolean(save.bestGrades["nebula-runway"]),
  },
  {
    id: "msg-yuki-personal",
    sender: "Yuki",
    subject: "For your eyes only",
    preview: "Image attachment • Yuki",
    body: "You get battle telemetry, accuracy logs, and mission records. That is an unforgivably sterile version of me.\n\nThis one is better. Quieter. Closer.\n\nIf you're blushing, good. It means you were paying attention.\n\n- Yuki",
    attachments: [
      {
        id: "yuki-photo",
        type: "image",
        url: `${PILOT_INBOX_DIR}/yuki_midnight_archive.png`,
        fallbackUrl: "/assets/outfits/lunar_eclipse.png",
        alt: "Yuki portrait in Lunar Eclipse outfit",
        label: "Yuki portrait",
      },
    ],
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
    id: "msg-command-after-abyss",
    sender: "HQ Command",
    subject: "Crew Morale Advisory",
    preview: "Pilots requesting more direct communication",
    body: "Your post-sortie performance has had an observable effect on squad morale.\n\nUnofficial translation: several pilots are now using priority channels to flirt with you instead of filing clean debriefs.\n\nCommand will allow this to continue as long as mission readiness remains unaffected.",
    timestamp: Date.now() - 300000,
    isUnlocked: (save) => Boolean(save.bestGrades["abyss-crown"]),
  },
];

const PLACEHOLDER_MESSAGES: InboxMessageTemplate[] = [...buildPilotInboxMessages(), ...BASE_MESSAGES];

function getInboxMessages(save: SaveData): InboxMessage[] {
  return PLACEHOLDER_MESSAGES
    .filter((message) => FORCE_UNLOCK_ALL_MESSAGES || message.isUnlocked(save))
    .map(({ isUnlocked: _isUnlocked, ...message }) => ({
      ...message,
      read: false,
    }));
}

function AttachmentImage({ attachment, onHoldStart, onHoldEnd }: { attachment: InboxAttachment; onHoldStart?: (src: string) => void; onHoldEnd?: () => void }) {
  const [src, setSrc] = useState(() => resolveAssetUrl(attachment.url) ?? attachment.url);

  useEffect(() => {
    setSrc(resolveAssetUrl(attachment.url) ?? attachment.url);
  }, [attachment.url]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onHoldStart?.(src);
  };

  const handlePointerUp = () => {
    onHoldEnd?.();
  };

  return (
    <img
      src={src}
      alt={attachment.alt ?? attachment.label ?? ""}
      draggable={false}
      onError={() => {
        if (!attachment.fallbackUrl) return;
        const fallbackSrc = resolveAssetUrl(attachment.fallbackUrl) ?? attachment.fallbackUrl;
        if (fallbackSrc !== src) {
          setSrc(fallbackSrc);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: "100%",
        display: "block",
        objectFit: "contain",
        borderRadius: "6px",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    />
  );
}

function ImageLightbox({ src, onRelease }: { src: string; onRelease: () => void }) {
  useEffect(() => {
    const handleUp = () => onRelease();
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [onRelease]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        touchAction: "none",
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "8px",
          boxShadow: "0 0 60px rgba(102, 217, 239, 0.15)",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      />
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

export default function InboxOverlay({ isOpen, onClose }: InboxOverlayProps) {
  const { save } = useGame();
  const [readState, setReadState] = useState(loadInboxState);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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

  useEffect(() => {
    saveInboxState(readState);
  }, [readState]);

  useEffect(() => {
    if (!isOpen || messages.length === 0 || selectedMessageId) return;
    const firstUnread = messages.find((message) => !message.read) ?? messages[0];
    setSelectedMessageId(firstUnread.id);
  }, [isOpen, messages, selectedMessageId]);

  useEffect(() => {
    if (!selectedMessageId) return;
    const stillVisible = messages.some((message) => message.id === selectedMessageId);
    if (!stillVisible) {
      setSelectedMessageId(messages[0]?.id ?? null);
    }
  }, [messages, selectedMessageId]);

  const selectMessage = (msg: InboxMessage) => {
    setSelectedMessageId(msg.id);
    setReadState(prev => ({ ...prev, [msg.id]: true }));
  };

  const renderAttachment = (attachment: InboxAttachment) => {
    const resolvedUrl = resolveAssetUrl(attachment.url);
    if (!resolvedUrl) return null;

    const mediaFrameStyle = {
      marginBottom: "16px",
      borderRadius: "10px",
      overflow: "hidden" as const,
      border: "1px solid rgba(102,217,239,0.18)",
      background: "rgba(2, 8, 18, 0.88)",
      boxShadow: "0 14px 28px rgba(0, 0, 0, 0.22)",
    };

    if (attachment.type === "video") {
      return (
        <div key={attachment.id} style={mediaFrameStyle}>
          <div style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(102,217,239,0.12)",
            color: "rgba(102,217,239,0.8)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}>
            {attachment.label ?? "Video attachment"}
          </div>
          <video
            src={resolvedUrl}
            poster={resolveAssetUrl(attachment.posterUrl)}
            controls
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              maxHeight: "320px",
              display: "block",
              background: "#000",
              objectFit: "contain",
            }}
          />
        </div>
      );
    }

    return (
      <div key={attachment.id} style={mediaFrameStyle}>
        <AttachmentImage attachment={attachment} onHoldStart={setLightboxSrc} onHoldEnd={() => setLightboxSrc(null)} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
    {lightboxSrc && <ImageLightbox src={lightboxSrc} onRelease={() => setLightboxSrc(null)} />}
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: isMobile ? "100vw" : "min(92vw, 840px)",
        height: isMobile ? "100vh" : "min(84vh, 620px)",
        background: "linear-gradient(180deg, #0a1628 0%, #040612 100%)",
        border: isMobile ? "none" : "1px solid rgba(102,217,239,0.3)",
        borderRadius: isMobile ? 0 : "16px",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid rgba(102,217,239,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#66d9ef", fontFamily: "monospace", fontSize: "16px", letterSpacing: "2px" }}>
              INBOX
            </span>
            {unreadCount > 0 && (
              <span style={{
                background: "#ff6b6b", color: "#fff", padding: "2px 8px",
                borderRadius: "10px", fontSize: "11px", fontFamily: "monospace",
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.5)",
            cursor: "pointer", fontSize: "18px", fontFamily: "monospace",
          }}>
            {"\u2715"}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
          {/* Message list - show when no message selected on mobile, always on desktop */}
          {(!isMobile || !selectedMessageId) && (
          <div style={{
            width: isMobile ? "100%" : "260px",
            flex: isMobile ? 1 : undefined,
            borderRight: isMobile ? "none" : "1px solid rgba(102,217,239,0.1)",
            overflowY: "auto",
            background: "linear-gradient(180deg, rgba(8,16,30,0.94) 0%, rgba(5,10,20,0.88) 100%)",
          }}>
            {messages.map(msg => (
              <button key={msg.id} onClick={() => selectMessage(msg)} style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "14px 16px", cursor: "pointer",
                background: selectedMessage?.id === msg.id ? "rgba(102,217,239,0.12)" : "transparent",
                border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontFamily: "monospace",
              }}>
                <div style={{
                  fontSize: "11px", color: msg.read ? "rgba(255,255,255,0.4)" : "#66d9ef",
                  marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px",
                }}>
                  {!msg.read && <span style={{ display: "inline-block", width: "6px", height: "6px", background: "#66d9ef", borderRadius: "50%" }} />}
                  {msg.sender}
                </div>
                <div style={{
                  fontSize: "12px", color: msg.read ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  marginBottom: "6px",
                }}>
                  {msg.subject}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.38)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {msg.preview ?? msg.body}
                </div>
              </button>
            ))}
          </div>
          )}

          {/* Message detail - show when message selected on mobile, always on desktop */}
          {(!isMobile || selectedMessageId) && (
          <div style={{ flex: 1, padding: isMobile ? "14px" : "22px", overflowY: "auto" }}>
            {selectedMessage ? (
              <>
                {isMobile && (
                  <button onClick={() => setSelectedMessageId(null)} style={{
                    background: "none", border: "1px solid rgba(102,217,239,0.3)",
                    color: "#66d9ef", padding: "6px 14px", borderRadius: "8px",
                    cursor: "pointer", fontFamily: "monospace", fontSize: "12px",
                    marginBottom: "14px",
                  }}>
                    ← Back to messages
                  </button>
                )}
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ color: "#66d9ef", fontSize: isMobile ? "16px" : "18px", margin: "0 0 6px", fontFamily: "monospace" }}>
                    {selectedMessage.subject}
                  </h3>
                  <div style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}>
                    <span>From: {selectedMessage.sender}</span>
                    <span>{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                {selectedMessage.attachments?.map(renderAttachment)}
                <p style={{
                  color: "rgba(255,255,255,0.8)", fontSize: "13px",
                  lineHeight: "1.7", fontFamily: "monospace", whiteSpace: "pre-wrap",
                }}>
                  {selectedMessage.body}
                </p>
              </>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: "rgba(255,255,255,0.3)", fontSize: "13px",
                fontFamily: "monospace",
              }}>
                Select a message to read
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export function getUnreadCount(save: SaveData): number {
  const state = loadInboxState();
  return getInboxMessages(save).filter((message) => !state[message.id]).length;
}
