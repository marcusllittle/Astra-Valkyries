/**
 * Procedural chiptune music generator — Blazing Lazers inspired.
 *
 * Uses Web Audio API oscillators to create driving FM-synth style tracks.
 * Each "track" is a looping sequence of notes scheduled via setTimeout.
 * Supports: 3 level themes, boss theme, death jingle, victory fanfare, title theme.
 */

import { getAudioCtx, getMusicBus } from "./audioEngine";

// ─── Note helpers ─────────────────────────────────────────────

const NOTE_FREQS: Record<string, number> = {};
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
for (let oct = 0; oct <= 8; oct++) {
  for (let i = 0; i < 12; i++) {
    NOTE_FREQS[`${NOTE_NAMES[i]}${oct}`] = 440 * Math.pow(2, ((oct - 4) + (i - 9) / 12));
  }
}

function noteFreq(name: string): number {
  return NOTE_FREQS[name] ?? 440;
}

// ─── Sequencer types ──────────────────────────────────────────

interface NoteEvent {
  freq: number;
  dur: number; // beats
  vel?: number; // 0-1
}

interface TrackVoice {
  wave: OscillatorType;
  notes: (NoteEvent | null)[]; // null = rest
  gain: number;
  detune?: number;
  filterFreq?: number;
}

interface TrackDef {
  bpm: number;
  voices: TrackVoice[];
  loopBars: number; // how many bars before looping (each bar = notes.length / 16)
}

function getStepBeats(note: NoteEvent | null): number {
  return note?.dur ?? 1;
}

function getVoiceDurationBeats(voice: TrackVoice): number {
  return voice.notes.reduce((sum, note) => sum + getStepBeats(note), 0);
}

// ─── Active music state ───────────────────────────────────────

let _activeTrack: string | null = null;
let _stopFn: ((fadeMs?: number) => void) | null = null;

export function stopMusic(fadeMs = 300) {
  if (_stopFn) {
    _stopFn(fadeMs);
    _stopFn = null;
  }
  _activeTrack = null;
}

export function isPlaying(trackId?: string): boolean {
  if (trackId) return _activeTrack === trackId;
  return _activeTrack !== null;
}

// ─── Playback engine ──────────────────────────────────────────

function playTrack(trackId: string, def: TrackDef, loop: boolean = true) {
  if (_activeTrack === trackId) return;
  stopMusic(0);
  _activeTrack = trackId;

  const ac = getAudioCtx();
  const musicBus = getMusicBus();
  const beatDur = 60 / def.bpm;
  const loopDurationSeconds = Math.max(...def.voices.map(getVoiceDurationBeats)) * beatDur;
  const scheduleLeadSeconds = 0.05;
  let cancelled = false;
  const activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  let loopTimeout: ReturnType<typeof setTimeout> | null = null;
  let cleanupTimeout: ReturnType<typeof setTimeout> | null = null;
  let cleanedUp = false;

  // Master gain for fade-out
  const masterGain = ac.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(musicBus);

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    for (const node of activeNodes) {
      try { node.osc.stop(); } catch { /* ignore duplicate stop calls */ }
      try { node.gain.disconnect(); } catch { /* ignore duplicate disconnects */ }
    }
    activeNodes.length = 0;
    masterGain.disconnect();
  };

  function scheduleLoop(startTime: number) {
    if (cancelled) return;

    for (const voice of def.voices) {
      let t = startTime;
      for (const note of voice.notes) {
        if (cancelled) return;
        if (note) {
          const dur = note.dur * beatDur;
          const osc = ac.createOscillator();
          osc.type = voice.wave;
          osc.frequency.value = note.freq;
          if (voice.detune) osc.detune.value = voice.detune;

          const env = ac.createGain();
          const vol = voice.gain * (note.vel ?? 1);
          env.gain.setValueAtTime(0, t);
          env.gain.linearRampToValueAtTime(vol, t + 0.008);
          env.gain.setValueAtTime(vol, t + dur * 0.7);
          env.gain.linearRampToValueAtTime(0, t + dur * 0.95);

          if (voice.filterFreq) {
            const filter = ac.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = voice.filterFreq;
            filter.Q.value = 2;
            osc.connect(filter).connect(env).connect(masterGain);
          } else {
            osc.connect(env).connect(masterGain);
          }

          osc.start(t);
          osc.stop(t + dur);
          activeNodes.push({ osc, gain: env });
          t += dur;
        } else {
          t += beatDur;
        }
      }
    }

    if (loop) {
      const nextStartTime = startTime + loopDurationSeconds;
      const loopDelayMs = Math.max(0, (nextStartTime - ac.currentTime - scheduleLeadSeconds) * 1000);
      loopTimeout = setTimeout(() => {
        if (!cancelled) scheduleLoop(nextStartTime);
      }, loopDelayMs);
    }
  }

  scheduleLoop(ac.currentTime + scheduleLeadSeconds);

  _stopFn = (fadeMs = 300) => {
    cancelled = true;
    if (loopTimeout) clearTimeout(loopTimeout);
    if (cleanupTimeout) clearTimeout(cleanupTimeout);

    const fadeSeconds = Math.max(0, fadeMs) / 1000;
    const fadeTime = ac.currentTime;
    masterGain.gain.cancelScheduledValues(fadeTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, fadeTime);

    if (fadeSeconds > 0) {
      masterGain.gain.linearRampToValueAtTime(0, fadeTime + fadeSeconds);
      cleanupTimeout = setTimeout(cleanup, fadeMs + 100);
    } else {
      masterGain.gain.setValueAtTime(0, fadeTime);
      cleanup();
    }
  };
}

// ─── One-shot jingles (don't interrupt, play over) ────────────

function playJingle(ac: AudioContext, musicBus: GainNode, notes: { freq: number; start: number; dur: number; wave: OscillatorType; vol: number }[]) {
  for (const n of notes) {
    const osc = ac.createOscillator();
    osc.type = n.wave;
    osc.frequency.value = n.freq;
    const env = ac.createGain();
    env.gain.setValueAtTime(0, ac.currentTime + n.start);
    env.gain.linearRampToValueAtTime(n.vol, ac.currentTime + n.start + 0.01);
    env.gain.setValueAtTime(n.vol, ac.currentTime + n.start + n.dur * 0.7);
    env.gain.linearRampToValueAtTime(0, ac.currentTime + n.start + n.dur);
    osc.connect(env).connect(musicBus);
    osc.start(ac.currentTime + n.start);
    osc.stop(ac.currentTime + n.start + n.dur);
  }
}

// ─── Helper to build note arrays ──────────────────────────────

function n(note: string, dur = 1, vel = 1): NoteEvent {
  return { freq: noteFreq(note), dur, vel };
}

function rest(): null { return null; }

// ─── TRACK DEFINITIONS ───────────────────────────────────────
// Blazing Lazers feel: driving bass, fast arpeggios, square/saw leads

// Level 1: Nebula Runway — energetic, classic shmup opening
const NEBULA_RUNWAY: TrackDef = {
  bpm: 150,
  loopBars: 4,
  voices: [
    // Lead melody — square wave
    {
      wave: "square",
      gain: 0.12,
      notes: [
        n("E5", 0.5), n("G5", 0.5), n("A5", 0.5), n("B5", 0.5),
        n("A5", 1), n("G5", 0.5), n("E5", 0.5),
        n("D5", 0.5), n("E5", 0.5), n("G5", 1),
        n("A5", 0.5), n("G5", 0.5), n("E5", 1),

        n("E5", 0.5), n("G5", 0.5), n("A5", 0.5), n("B5", 0.5),
        n("D6", 1), n("B5", 0.5), n("A5", 0.5),
        n("G5", 0.5), n("A5", 0.5), n("B5", 1),
        n("A5", 1), rest(), rest(),

        n("B5", 0.5), n("A5", 0.5), n("G5", 0.5), n("E5", 0.5),
        n("D5", 1), n("E5", 0.5), n("G5", 0.5),
        n("A5", 0.5), n("B5", 0.5), n("A5", 1),
        n("G5", 0.5), n("E5", 0.5), n("D5", 1),

        n("E5", 0.5), n("G5", 0.5), n("B5", 0.5), n("D6", 0.5),
        n("E6", 1), n("D6", 0.5), n("B5", 0.5),
        n("A5", 1), n("G5", 1),
        n("E5", 2),
      ],
    },
    // Bass — sawtooth, driving eighth notes
    {
      wave: "sawtooth",
      gain: 0.1,
      filterFreq: 800,
      notes: [
        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
        n("A2", 0.5), n("A2", 0.5), n("A3", 0.5), n("A2", 0.5),
        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("G2", 0.5), n("G2", 0.5), n("G3", 0.5), n("G2", 0.5),

        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
        n("G2", 0.5), n("G2", 0.5), n("G3", 0.5), n("G2", 0.5),
        n("A2", 0.5), n("A2", 0.5), n("A3", 0.5), n("A2", 0.5),
        n("B2", 0.5), n("B2", 0.5), n("B3", 0.5), n("B2", 0.5),

        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("A2", 0.5), n("A2", 0.5), n("A3", 0.5), n("A2", 0.5),
        n("G2", 0.5), n("G2", 0.5), n("G3", 0.5), n("G2", 0.5),

        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
        n("A2", 0.5), n("A2", 0.5), n("A3", 0.5), n("A2", 0.5),
        n("B2", 0.5), n("B2", 0.5), n("B3", 0.5), n("B2", 0.5),
        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
      ],
    },
    // Arpeggio layer — triangle
    {
      wave: "triangle",
      gain: 0.08,
      notes: [
        n("E4", 0.25), n("G4", 0.25), n("B4", 0.25), n("E5", 0.25),
        n("A4", 0.25), n("C5", 0.25), n("E5", 0.25), n("A5", 0.25),
        n("D4", 0.25), n("F#4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("G4", 0.25), n("B4", 0.25), n("D5", 0.25), n("G5", 0.25),

        n("E4", 0.25), n("G4", 0.25), n("B4", 0.25), n("E5", 0.25),
        n("G4", 0.25), n("B4", 0.25), n("D5", 0.25), n("G5", 0.25),
        n("A4", 0.25), n("C5", 0.25), n("E5", 0.25), n("A5", 0.25),
        n("B4", 0.25), n("D#5", 0.25), n("F#5", 0.25), n("B5", 0.25),

        n("E4", 0.25), n("G4", 0.25), n("B4", 0.25), n("E5", 0.25),
        n("D4", 0.25), n("F#4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("A4", 0.25), n("C5", 0.25), n("E5", 0.25), n("A5", 0.25),
        n("G4", 0.25), n("B4", 0.25), n("D5", 0.25), n("G5", 0.25),

        n("E4", 0.25), n("G4", 0.25), n("B4", 0.25), n("E5", 0.25),
        n("A4", 0.25), n("C5", 0.25), n("E5", 0.25), n("A5", 0.25),
        n("B4", 0.25), n("D#5", 0.25), n("F#5", 0.25), n("B5", 0.25),
        n("E4", 0.25), n("G4", 0.25), n("B4", 0.25), n("E5", 0.25),
      ],
    },
  ],
};

// Level 2: Solar Rift — more aggressive, minor key
const SOLAR_RIFT: TrackDef = {
  bpm: 160,
  loopBars: 4,
  voices: [
    // Lead — sawtooth, aggressive melody
    {
      wave: "sawtooth",
      gain: 0.1,
      filterFreq: 3000,
      notes: [
        n("A5", 0.5), n("C6", 0.5), n("D6", 0.5), n("E6", 0.5),
        n("D6", 1), n("C6", 0.5), n("A5", 0.5),
        n("G5", 0.5), n("A5", 0.5), n("C6", 1),
        n("D6", 0.5), n("C6", 0.5), n("A5", 1),

        n("A5", 0.5), n("C6", 0.5), n("E6", 0.5), n("F6", 0.5),
        n("E6", 1), n("D6", 0.5), n("C6", 0.5),
        n("A5", 1), n("G5", 0.5), n("A5", 0.5),
        n("C6", 1), rest(), rest(),

        n("F5", 0.5), n("G5", 0.5), n("A5", 0.5), n("C6", 0.5),
        n("D6", 1), n("C6", 0.5), n("A5", 0.5),
        n("G5", 1), n("F5", 0.5), n("G5", 0.5),
        n("A5", 1), n("G5", 1),

        n("A5", 0.5), n("C6", 0.5), n("E6", 1),
        n("F6", 0.5), n("E6", 0.5), n("D6", 0.5), n("C6", 0.5),
        n("D6", 1), n("C6", 1),
        n("A5", 2),
      ],
    },
    // Bass — pumping
    {
      wave: "sawtooth",
      gain: 0.11,
      filterFreq: 600,
      notes: [
        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("G1", 0.5), n("G1", 0.5), n("G2", 0.5), n("G1", 0.5),
        n("C2", 0.5), n("C2", 0.5), n("C3", 0.5), n("C2", 0.5),

        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
        n("F1", 0.5), n("F1", 0.5), n("F2", 0.5), n("F1", 0.5),
        n("G1", 0.5), n("G1", 0.5), n("G2", 0.5), n("G1", 0.5),

        n("F1", 0.5), n("F1", 0.5), n("F2", 0.5), n("F1", 0.5),
        n("G1", 0.5), n("G1", 0.5), n("G2", 0.5), n("G1", 0.5),
        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),

        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("E2", 0.5), n("E2", 0.5), n("E3", 0.5), n("E2", 0.5),
        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
      ],
    },
    // Arpeggios — square
    {
      wave: "square",
      gain: 0.06,
      notes: [
        n("A3", 0.25), n("C4", 0.25), n("E4", 0.25), n("A4", 0.25),
        n("D4", 0.25), n("F4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("G3", 0.25), n("B3", 0.25), n("D4", 0.25), n("G4", 0.25),
        n("C4", 0.25), n("E4", 0.25), n("G4", 0.25), n("C5", 0.25),

        n("A3", 0.25), n("C4", 0.25), n("E4", 0.25), n("A4", 0.25),
        n("E4", 0.25), n("G#4", 0.25), n("B4", 0.25), n("E5", 0.25),
        n("F3", 0.25), n("A3", 0.25), n("C4", 0.25), n("F4", 0.25),
        n("G3", 0.25), n("B3", 0.25), n("D4", 0.25), n("G4", 0.25),

        n("F3", 0.25), n("A3", 0.25), n("C4", 0.25), n("F4", 0.25),
        n("G3", 0.25), n("B3", 0.25), n("D4", 0.25), n("G4", 0.25),
        n("A3", 0.25), n("C4", 0.25), n("E4", 0.25), n("A4", 0.25),
        n("E4", 0.25), n("G#4", 0.25), n("B4", 0.25), n("E5", 0.25),

        n("A3", 0.25), n("C4", 0.25), n("E4", 0.25), n("A4", 0.25),
        n("D4", 0.25), n("F4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("E4", 0.25), n("G#4", 0.25), n("B4", 0.25), n("E5", 0.25),
        n("A3", 0.25), n("C4", 0.25), n("E4", 0.25), n("A4", 0.25),
      ],
    },
  ],
};

// Level 3: Abyss Crown — dark, heavy, D minor
const ABYSS_CROWN: TrackDef = {
  bpm: 140,
  loopBars: 4,
  voices: [
    // Lead — square, dark melody
    {
      wave: "square",
      gain: 0.11,
      notes: [
        n("D5", 1), n("F5", 0.5), n("A5", 0.5),
        n("G5", 1), n("F5", 0.5), n("E5", 0.5),
        n("D5", 0.5), n("C5", 0.5), n("D5", 1),
        n("A4", 1), rest(), rest(),

        n("D5", 0.5), n("E5", 0.5), n("F5", 0.5), n("A5", 0.5),
        n("G5", 1), n("A5", 0.5), n("Bb5", 0.5),
        n("A5", 1), n("G5", 0.5), n("F5", 0.5),
        n("E5", 1), n("D5", 1),

        n("Bb4", 0.5), n("C5", 0.5), n("D5", 1),
        n("F5", 1), n("E5", 0.5), n("D5", 0.5),
        n("C5", 0.5), n("D5", 0.5), n("E5", 1),
        n("D5", 1), n("C5", 1),

        n("D5", 0.5), n("F5", 0.5), n("A5", 0.5), n("D6", 0.5),
        n("C6", 1), n("Bb5", 0.5), n("A5", 0.5),
        n("G5", 1), n("F5", 1),
        n("D5", 2),
      ],
    },
    // Bass — heavy
    {
      wave: "sawtooth",
      gain: 0.12,
      filterFreq: 500,
      notes: [
        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("Bb1", 0.5), n("Bb1", 0.5), n("Bb2", 0.5), n("Bb1", 0.5),
        n("C2", 0.5), n("C2", 0.5), n("C3", 0.5), n("C2", 0.5),
        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),

        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("G1", 0.5), n("G1", 0.5), n("G2", 0.5), n("G1", 0.5),
        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
        n("Bb1", 0.5), n("Bb1", 0.5), n("Bb2", 0.5), n("Bb1", 0.5),

        n("Bb1", 0.5), n("Bb1", 0.5), n("Bb2", 0.5), n("Bb1", 0.5),
        n("F2", 0.5), n("F2", 0.5), n("F3", 0.5), n("F2", 0.5),
        n("C2", 0.5), n("C2", 0.5), n("C3", 0.5), n("C2", 0.5),
        n("G1", 0.5), n("G1", 0.5), n("G2", 0.5), n("G1", 0.5),

        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
        n("Bb1", 0.5), n("Bb1", 0.5), n("Bb2", 0.5), n("Bb1", 0.5),
        n("A1", 0.5), n("A1", 0.5), n("A2", 0.5), n("A1", 0.5),
        n("D2", 0.5), n("D2", 0.5), n("D3", 0.5), n("D2", 0.5),
      ],
    },
    // Arpeggios — triangle, dark chords
    {
      wave: "triangle",
      gain: 0.07,
      notes: [
        n("D4", 0.25), n("F4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("Bb3", 0.25), n("D4", 0.25), n("F4", 0.25), n("Bb4", 0.25),
        n("C4", 0.25), n("E4", 0.25), n("G4", 0.25), n("C5", 0.25),
        n("A3", 0.25), n("C4", 0.25), n("E4", 0.25), n("A4", 0.25),

        n("D4", 0.25), n("F4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("G3", 0.25), n("Bb3", 0.25), n("D4", 0.25), n("G4", 0.25),
        n("A3", 0.25), n("C#4", 0.25), n("E4", 0.25), n("A4", 0.25),
        n("Bb3", 0.25), n("D4", 0.25), n("F4", 0.25), n("Bb4", 0.25),

        n("Bb3", 0.25), n("D4", 0.25), n("F4", 0.25), n("Bb4", 0.25),
        n("F3", 0.25), n("A3", 0.25), n("C4", 0.25), n("F4", 0.25),
        n("C4", 0.25), n("E4", 0.25), n("G4", 0.25), n("C5", 0.25),
        n("G3", 0.25), n("Bb3", 0.25), n("D4", 0.25), n("G4", 0.25),

        n("D4", 0.25), n("F4", 0.25), n("A4", 0.25), n("D5", 0.25),
        n("Bb3", 0.25), n("D4", 0.25), n("F4", 0.25), n("Bb4", 0.25),
        n("A3", 0.25), n("C#4", 0.25), n("E4", 0.25), n("A4", 0.25),
        n("D4", 0.25), n("F4", 0.25), n("A4", 0.25), n("D5", 0.25),
      ],
    },
  ],
};

// Boss theme — intense, fast, chromatic
const BOSS_THEME: TrackDef = {
  bpm: 175,
  loopBars: 2,
  voices: [
    {
      wave: "sawtooth",
      gain: 0.12,
      filterFreq: 4000,
      notes: [
        n("E5", 0.25), n("F5", 0.25), n("G5", 0.25), n("A5", 0.25),
        n("Bb5", 0.5), n("A5", 0.25), n("G5", 0.25),
        n("F5", 0.25), n("E5", 0.25), n("D5", 0.25), n("E5", 0.25),
        n("F5", 0.5), n("E5", 0.5),

        n("A5", 0.25), n("Bb5", 0.25), n("C6", 0.25), n("Bb5", 0.25),
        n("A5", 0.5), n("G5", 0.25), n("F5", 0.25),
        n("E5", 0.25), n("G5", 0.25), n("Bb5", 0.25), n("A5", 0.25),
        n("G5", 0.5), n("E5", 0.5),
      ],
    },
    {
      wave: "square",
      gain: 0.13,
      filterFreq: 500,
      notes: [
        n("E2", 0.25), n("E2", 0.25), n("E3", 0.25), n("E2", 0.25),
        n("F2", 0.25), n("F2", 0.25), n("F3", 0.25), n("F2", 0.25),
        n("D2", 0.25), n("D2", 0.25), n("D3", 0.25), n("D2", 0.25),
        n("E2", 0.25), n("E2", 0.25), n("E3", 0.25), n("E2", 0.25),

        n("A1", 0.25), n("A1", 0.25), n("A2", 0.25), n("A1", 0.25),
        n("Bb1", 0.25), n("Bb1", 0.25), n("Bb2", 0.25), n("Bb1", 0.25),
        n("C2", 0.25), n("C2", 0.25), n("C3", 0.25), n("C2", 0.25),
        n("E2", 0.25), n("E2", 0.25), n("E3", 0.25), n("E2", 0.25),
      ],
    },
  ],
};

// Title screen — majestic, heroic, slower
const TITLE_THEME: TrackDef = {
  bpm: 110,
  loopBars: 4,
  voices: [
    {
      wave: "triangle",
      gain: 0.1,
      notes: [
        n("E4", 2), n("G4", 1), n("A4", 1),
        n("B4", 2), n("A4", 1), n("G4", 1),
        n("E4", 1), n("D4", 1), n("E4", 2),
        n("G4", 2), n("A4", 2),

        n("B4", 2), n("D5", 1), n("E5", 1),
        n("D5", 2), n("B4", 1), n("A4", 1),
        n("G4", 1), n("A4", 1), n("B4", 2),
        n("E4", 4),
      ],
    },
    {
      wave: "sine",
      gain: 0.09,
      notes: [
        n("E2", 2), n("E2", 2),
        n("G2", 2), n("G2", 2),
        n("A2", 2), n("A2", 2),
        n("B2", 2), n("B2", 2),

        n("E2", 2), n("E2", 2),
        n("G2", 2), n("A2", 2),
        n("B2", 2), n("B2", 2),
        n("E2", 4),
      ],
    },
    {
      wave: "square",
      gain: 0.04,
      notes: [
        n("E3", 0.5), n("G3", 0.5), n("B3", 0.5), n("E4", 0.5),
        n("E3", 0.5), n("G3", 0.5), n("B3", 0.5), n("E4", 0.5),
        n("G3", 0.5), n("B3", 0.5), n("D4", 0.5), n("G4", 0.5),
        n("G3", 0.5), n("B3", 0.5), n("D4", 0.5), n("G4", 0.5),

        n("A3", 0.5), n("C4", 0.5), n("E4", 0.5), n("A4", 0.5),
        n("A3", 0.5), n("C4", 0.5), n("E4", 0.5), n("A4", 0.5),
        n("B3", 0.5), n("D#4", 0.5), n("F#4", 0.5), n("B4", 0.5),
        n("B3", 0.5), n("D#4", 0.5), n("F#4", 0.5), n("B4", 0.5),

        n("E3", 0.5), n("G3", 0.5), n("B3", 0.5), n("E4", 0.5),
        n("E3", 0.5), n("G3", 0.5), n("B3", 0.5), n("E4", 0.5),
        n("G3", 0.5), n("B3", 0.5), n("D4", 0.5), n("G4", 0.5),
        n("A3", 0.5), n("C4", 0.5), n("E4", 0.5), n("A4", 0.5),

        n("B3", 0.5), n("D#4", 0.5), n("F#4", 0.5), n("B4", 0.5),
        n("B3", 0.5), n("D#4", 0.5), n("F#4", 0.5), n("B4", 0.5),
        n("E3", 0.5), n("G3", 0.5), n("B3", 0.5), n("E4", 0.5),
        n("E3", 0.5), n("G3", 0.5), n("B3", 0.5), n("E4", 0.5),
      ],
    },
  ],
};

// ─── Map ID to track ──────────────────────────────────────────

const LEVEL_TRACKS: Record<string, TrackDef> = {
  "nebula-runway": NEBULA_RUNWAY,
  "solar-rift": SOLAR_RIFT,
  "abyss-crown": ABYSS_CROWN,
};

// ─── Public API ───────────────────────────────────────────────

export function playLevelMusic(mapId: string) {
  const def = LEVEL_TRACKS[mapId] ?? NEBULA_RUNWAY;
  playTrack(`level-${mapId}`, def, true);
}

export function playBossMusic() {
  playTrack("boss", BOSS_THEME, true);
}

export function playTitleMusic() {
  playTrack("title", TITLE_THEME, true);
}

/** Short death jingle — descending minor, no loop */
export function playDeathJingle() {
  stopMusic(0);
  const ac = getAudioCtx();
  const musicBus = getMusicBus();
  const bps = 3; // notes per second
  const step = 1 / bps;
  playJingle(ac, musicBus, [
    { freq: noteFreq("A4"), start: 0, dur: step * 0.9, wave: "square", vol: 0.14 },
    { freq: noteFreq("F4"), start: step, dur: step * 0.9, wave: "square", vol: 0.13 },
    { freq: noteFreq("D4"), start: step * 2, dur: step * 0.9, wave: "square", vol: 0.12 },
    { freq: noteFreq("C4"), start: step * 3, dur: step * 1.2, wave: "square", vol: 0.1 },
    { freq: noteFreq("A3"), start: step * 4, dur: step * 2, wave: "square", vol: 0.09 },
    // Bass thud
    { freq: noteFreq("D2"), start: step * 2, dur: step * 3, wave: "sawtooth", vol: 0.12 },
    { freq: noteFreq("A1"), start: step * 4, dur: step * 3, wave: "sawtooth", vol: 0.1 },
  ]);
}

/** Victory fanfare — triumphant ascending phrase */
export function playVictoryFanfare() {
  stopMusic(0);
  const ac = getAudioCtx();
  const musicBus = getMusicBus();
  const step = 0.18;
  playJingle(ac, musicBus, [
    // Fanfare melody
    { freq: noteFreq("E5"), start: 0, dur: step * 1.5, wave: "square", vol: 0.13 },
    { freq: noteFreq("G5"), start: step * 1.5, dur: step * 1.5, wave: "square", vol: 0.13 },
    { freq: noteFreq("B5"), start: step * 3, dur: step * 1.5, wave: "square", vol: 0.14 },
    { freq: noteFreq("E6"), start: step * 4.5, dur: step * 3, wave: "square", vol: 0.15 },
    { freq: noteFreq("D6"), start: step * 7.5, dur: step * 1.5, wave: "square", vol: 0.13 },
    { freq: noteFreq("E6"), start: step * 9, dur: step * 4, wave: "square", vol: 0.15 },
    // Harmony
    { freq: noteFreq("B4"), start: 0, dur: step * 1.5, wave: "triangle", vol: 0.08 },
    { freq: noteFreq("E5"), start: step * 1.5, dur: step * 1.5, wave: "triangle", vol: 0.08 },
    { freq: noteFreq("G5"), start: step * 3, dur: step * 1.5, wave: "triangle", vol: 0.09 },
    { freq: noteFreq("B5"), start: step * 4.5, dur: step * 3, wave: "triangle", vol: 0.1 },
    { freq: noteFreq("A5"), start: step * 7.5, dur: step * 1.5, wave: "triangle", vol: 0.08 },
    { freq: noteFreq("B5"), start: step * 9, dur: step * 4, wave: "triangle", vol: 0.1 },
    // Bass
    { freq: noteFreq("E2"), start: 0, dur: step * 4, wave: "sawtooth", vol: 0.1 },
    { freq: noteFreq("G2"), start: step * 4.5, dur: step * 3, wave: "sawtooth", vol: 0.1 },
    { freq: noteFreq("E2"), start: step * 9, dur: step * 4, wave: "sawtooth", vol: 0.1 },
  ]);
}
