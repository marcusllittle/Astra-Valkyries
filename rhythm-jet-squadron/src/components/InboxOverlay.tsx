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
const FORCE_UNLOCK_ALL_MESSAGES = true;

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
const PLACEHOLDER_MESSAGES: InboxMessageTemplate[] = [
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
        url: `${CUSTOM_INBOX_DIR}/nova_after_hours.png`,
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
        url: `${CUSTOM_INBOX_DIR}/rex_afterburn.png`,
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
        url: `${CUSTOM_INBOX_DIR}/yuki_midnight_archive.png`,
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
        posterUrl: `${CUSTOM_INBOX_DIR}/nova_after_hours.png`,
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

function getInboxMessages(save: SaveData): InboxMessage[] {
  return PLACEHOLDER_MESSAGES
    .filter((message) => FORCE_UNLOCK_ALL_MESSAGES || message.isUnlocked(save))
    .map(({ isUnlocked: _isUnlocked, ...message }) => ({
      ...message,
      read: false,
    }));
}

function AttachmentImage({ attachment }: { attachment: InboxAttachment }) {
  const [src, setSrc] = useState(() => resolveAssetUrl(attachment.url) ?? attachment.url);

  useEffect(() => {
    setSrc(resolveAssetUrl(attachment.url) ?? attachment.url);
  }, [attachment.url]);

  return (
    <img
      src={src}
      alt={attachment.alt ?? attachment.label ?? ""}
      onError={() => {
        if (!attachment.fallbackUrl) return;
        const fallbackSrc = resolveAssetUrl(attachment.fallbackUrl) ?? attachment.fallbackUrl;
        if (fallbackSrc !== src) {
          setSrc(fallbackSrc);
        }
      }}
      style={{
        width: "100%",
        maxHeight: "340px",
        display: "block",
        objectFit: "cover",
      }}
    />
  );
}

interface InboxOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InboxOverlay({ isOpen, onClose }: InboxOverlayProps) {
  const { save } = useGame();
  const [readState, setReadState] = useState(loadInboxState);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

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
        <AttachmentImage attachment={attachment} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: "min(92vw, 840px)", height: "min(84vh, 620px)",
        background: "linear-gradient(180deg, #0a1628 0%, #040612 100%)",
        border: "1px solid rgba(102,217,239,0.3)", borderRadius: "16px",
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
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Message list */}
          <div style={{
            width: "260px", borderRight: "1px solid rgba(102,217,239,0.1)",
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
                }}>
                  {msg.preview ?? msg.body}
                </div>
              </button>
            ))}
          </div>

          {/* Message detail */}
          <div style={{ flex: 1, padding: "22px", overflowY: "auto" }}>
            {selectedMessage ? (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ color: "#66d9ef", fontSize: "18px", margin: "0 0 6px", fontFamily: "monospace" }}>
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
        </div>
      </div>
    </div>
  );
}

export function getUnreadCount(save: SaveData): number {
  const state = loadInboxState();
  return getInboxMessages(save).filter((message) => !state[message.id]).length;
}
