import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import outfitsData from "../data/outfits.json";
import pilotsData from "../data/pilots.json";
import {
  FORM_SHIFT_DEFINITIONS,
  toPrototypeCinematicClip,
} from "../lib/formShift";
import { resolveAssetUrl } from "../lib/assetUrl";

const LTX_PROMPT = `Create a short premium anime-inspired science-fiction transformation cinematic using the two supplied reference images.

Character: adult pilot Nova Starling from Astra Valkyries. Preserve her face, hairstyle, body proportions, expression, and visual identity throughout.

Beginning: Nova stands in the exact Standard Flight Suit shown in the first reference image. Use a controlled slow camera push. She activates a glowing wrist control as blue-white scan lines and precise energy rings rise around her.

Transformation: use a bright controlled energy flash to conceal the suit transition. Avoid exposed nudity. The effect should read as advanced armor and fabric materializing over the existing flight suit.

Ending: reveal the exact Starfall Armor shown in the second reference image. Armor panels, luminous seams, and starlight particles settle into place. Nova turns slightly and finishes in a confident combat-ready hero pose. Hold the final pose for at least half a second.

Technical direction: 5 to 7 seconds, 16:9, stable framing, smooth movement, clean silhouette, premium game cinematic, no text, no logos, no extra limbs, no face drift, no body morphing, no clothing distortion, no abrupt camera movement.`;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  paddingBottom: "3rem",
};

const workspaceStyle: CSSProperties = {
  display: "grid",
  gap: "1.25rem",
  width: "min(1100px, calc(100% - 2rem))",
  margin: "0 auto",
};

const referencesStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1rem",
};

const referenceCardStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  padding: "1rem",
  overflow: "hidden",
};

const referenceImageStyle: CSSProperties = {
  display: "block",
  width: "100%",
  aspectRatio: "4 / 5",
  objectFit: "cover",
  borderRadius: "0.75rem",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
};

export default function FormShiftPrototypeScreen() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const definition = FORM_SHIFT_DEFINITIONS[0];

  const pilot = useMemo(
    () => pilotsData.find((item) => item.id === definition.pilotId),
    [definition.pilotId],
  );
  const fromOutfit = useMemo(
    () => outfitsData.find((item) => item.id === definition.fromOutfitId),
    [definition.fromOutfitId],
  );
  const toOutfit = useMemo(
    () => outfitsData.find((item) => item.id === definition.toOutfitId),
    [definition.toOutfitId],
  );

  const playPrototype = () => {
    navigate("/video-cutscene", {
      state: {
        clips: [toPrototypeCinematicClip(definition)],
        returnTo: "/form-shift-prototype",
      },
    });
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(LTX_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this HavnAI/LTX prompt:", LTX_PROMPT);
    }
  };

  return (
    <div className="screen form-shift-prototype-screen" style={pageStyle}>
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Form Shift Lab</h2>
      </div>

      <main style={workspaceStyle}>
        <section className="panel-surface" style={{ padding: "1.25rem" }}>
          <span className="rarity-badge">Prototype 01</span>
          <h1 style={{ margin: "0.75rem 0 0.4rem" }}>{definition.label}</h1>
          <p style={{ margin: 0, maxWidth: "70ch", opacity: 0.82 }}>
            This isolated lab proves the in-game presentation before the final HavnAI/LTX
            transformation is generated. The current button plays the existing Starfall
            motion asset as a stand-in; replacing one configured path upgrades the same
            flow to the real transformation clip.
          </p>
        </section>

        <section style={referencesStyle} aria-label="Form shift reference images">
          <article className="panel-surface" style={referenceCardStyle}>
            <span className="rarity-badge">Starting configuration</span>
            <img
              src={resolveAssetUrl(definition.startReference)}
              alt={`${pilot?.name ?? "Nova"} wearing ${fromOutfit?.name ?? "the standard suit"}`}
              style={referenceImageStyle}
            />
            <div>
              <strong>{fromOutfit?.name ?? "Standard Flight Suit"}</strong>
              <p style={{ margin: "0.35rem 0 0", opacity: 0.72 }}>
                First-frame identity and camera reference.
              </p>
            </div>
          </article>

          <article className="panel-surface" style={referenceCardStyle}>
            <span className="rarity-badge">Target configuration</span>
            <img
              src={resolveAssetUrl(definition.endReference)}
              alt={`${pilot?.name ?? "Nova"} wearing ${toOutfit?.name ?? "Starfall Armor"}`}
              style={referenceImageStyle}
            />
            <div>
              <strong>{toOutfit?.name ?? "Starfall Armor"}</strong>
              <p style={{ margin: "0.35rem 0 0", opacity: 0.72 }}>
                Final-frame outfit, silhouette, and lighting reference.
              </p>
            </div>
          </article>
        </section>

        <section className="panel-surface" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div>
            <span className="rarity-badge">Runtime test</span>
            <h3 style={{ margin: "0.65rem 0 0.35rem" }}>Preview the presentation shell</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              The preview uses <code>{definition.prototypeVideoSrc}</code>. After HavnAI
              generates the real clip, export it to <code>{definition.targetVideoSrc}</code>
              and switch the definition to that source.
            </p>
          </div>
          <div style={actionsStyle}>
            <button className="btn btn-primary" onClick={playPrototype}>
              Play Current Prototype
            </button>
            <button className="btn btn-secondary" onClick={() => void copyPrompt()}>
              {copied ? "Prompt Copied" : "Copy HavnAI / LTX Prompt"}
            </button>
          </div>
        </section>

        <section className="panel-surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Success criteria</h3>
          <p style={{ marginBottom: 0, opacity: 0.8 }}>
            Preserve Nova’s identity, clearly communicate Standard Suit → Starfall Armor,
            finish within seven seconds, survive mobile playback, and make the upgrade feel
            valuable enough that a player would replay it from Collection.
          </p>
        </section>
      </main>
    </div>
  );
}
