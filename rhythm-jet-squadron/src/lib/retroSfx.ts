/**
 * Procedural retro sound effects via Web Audio API.
 * No external audio files needed — all sounds are generated.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Short square-wave blip for cursor movement. */
export function cursorMove() {
  const ac = getCtx();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(660, now + 0.06);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.08);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** Rising two-tone chime for menu confirm. */
export function menuConfirm() {
  const ac = getCtx();
  const now = ac.currentTime;

  // First tone
  const osc1 = ac.createOscillator();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(440, now);

  const g1 = ac.createGain();
  g1.gain.setValueAtTime(0.2, now);
  g1.gain.linearRampToValueAtTime(0, now + 0.08);

  osc1.connect(g1).connect(ac.destination);
  osc1.start(now);
  osc1.stop(now + 0.08);

  // Second tone (higher, delayed)
  const osc2 = ac.createOscillator();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(880, now + 0.06);

  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0, now);
  g2.gain.setValueAtTime(0.2, now + 0.06);
  g2.gain.linearRampToValueAtTime(0, now + 0.18);

  osc2.connect(g2).connect(ac.destination);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.18);
}

/** Sparkle/whoosh for "PRESS START" transition. */
export function pressStart() {
  const ac = getCtx();
  const now = ac.currentTime;

  // Sine sweep
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.25);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.25);

  // White noise burst
  const bufLen = Math.floor(ac.sampleRate * 0.06);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.15, now);
  ng.gain.linearRampToValueAtTime(0, now + 0.06);

  noise.connect(ng).connect(ac.destination);
  noise.start(now);
}
