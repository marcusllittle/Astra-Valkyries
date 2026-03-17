import { useState, useEffect } from "react";

interface InboxMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  imageUrl?: string;
  read: boolean;
  timestamp: number;
}

const INBOX_STORAGE_KEY = "astra-inbox-state";

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
const PLACEHOLDER_MESSAGES: InboxMessage[] = [
  {
    id: "msg-welcome",
    sender: "HQ Command",
    subject: "Welcome to the Valkyrie Program",
    body: "Pilot, welcome aboard. You've been selected for the most elite squadron in the fleet. Your skill, courage, and determination will be tested beyond measure. Report to the hangar for your first briefing.\n\nThe stars await.",
    read: false,
    timestamp: Date.now() - 86400000,
  },
  {
    id: "msg-intel-nebula",
    sender: "Intelligence Division",
    subject: "Nebula Runway - Threat Assessment",
    body: "Our scouts report increased enemy activity in the Nebula Runway sector. New heavy units have been deployed — codename 'Tank Fortress'. These armored platforms feature rotating shield generators. Focus fire during shield downtime windows.\n\nStay sharp out there.",
    read: false,
    timestamp: Date.now() - 43200000,
  },
  {
    id: "msg-nova-personal",
    sender: "Nova",
    subject: "Hey, about yesterday...",
    body: "I know that last sortie was rough. But we made it through, didn't we? That's what matters.\n\nLet's grab something at the station cantina after the next mission. My treat.\n\n- Nova",
    imageUrl: undefined, // Placeholder for generated image
    read: false,
    timestamp: Date.now() - 3600000,
  },
];

interface InboxOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InboxOverlay({ isOpen, onClose }: InboxOverlayProps) {
  const [readState, setReadState] = useState(loadInboxState);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);

  const messages = PLACEHOLDER_MESSAGES.map(m => ({
    ...m,
    read: readState[m.id] ?? m.read,
  }));

  const unreadCount = messages.filter(m => !m.read).length;

  useEffect(() => {
    saveInboxState(readState);
  }, [readState]);

  const selectMessage = (msg: InboxMessage) => {
    setSelectedMessage(msg);
    setReadState(prev => ({ ...prev, [msg.id]: true }));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: "min(90vw, 700px)", height: "min(80vh, 550px)",
        background: "linear-gradient(180deg, #0a1628 0%, #040612 100%)",
        border: "1px solid rgba(102,217,239,0.3)", borderRadius: "8px",
        display: "flex", flexDirection: "column", overflow: "hidden",
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
            width: "220px", borderRight: "1px solid rgba(102,217,239,0.1)",
            overflowY: "auto",
          }}>
            {messages.map(msg => (
              <button key={msg.id} onClick={() => selectMessage(msg)} style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "12px 14px", cursor: "pointer",
                background: selectedMessage?.id === msg.id ? "rgba(102,217,239,0.15)" : "transparent",
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
                }}>
                  {msg.subject}
                </div>
              </button>
            ))}
          </div>

          {/* Message detail */}
          <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
            {selectedMessage ? (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ color: "#66d9ef", fontSize: "16px", margin: "0 0 6px", fontFamily: "monospace" }}>
                    {selectedMessage.subject}
                  </h3>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontFamily: "monospace" }}>
                    From: {selectedMessage.sender}
                  </div>
                </div>
                {selectedMessage.imageUrl && (
                  <div style={{
                    marginBottom: "16px", borderRadius: "4px", overflow: "hidden",
                    border: "1px solid rgba(102,217,239,0.2)",
                  }}>
                    <img src={selectedMessage.imageUrl} alt="" style={{
                      width: "100%", maxHeight: "300px", objectFit: "cover",
                    }} />
                  </div>
                )}
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

export function getUnreadCount(): number {
  const state = loadInboxState();
  return PLACEHOLDER_MESSAGES.filter(m => !state[m.id]).length;
}
