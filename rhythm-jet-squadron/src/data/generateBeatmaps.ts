/**
 * Beatmap generator utility.
 * Run with: npx ts-node src/data/generateBeatmaps.ts
 * Or just use the pre-generated tracks.json.
 *
 * This generates deterministic beatmaps based on BPM and duration.
 * Patterns alternate between single-lane hits and simple multi-lane patterns.
 */

interface Note {
  t: number; // time in ms
  lane: 0 | 1 | 2;
  type: "tap";
}

interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  difficulty: "Easy" | "Normal" | "Hard";
  beatmap: Note[];
}

// Deterministic pseudo-random using seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateBeatmap(
  bpm: number,
  durationSec: number,
  seed: number,
  density: number = 1.0
): Note[] {
  const rand = seededRandom(seed);
  const notes: Note[] = [];
  const beatInterval = 60000 / bpm; // ms per beat
  const totalBeats = Math.floor((durationSec * 1000) / beatInterval);

  // Start 2 beats in, end 2 beats early
  for (let i = 2; i < totalBeats - 2; i++) {
    const t = Math.round(i * beatInterval);

    // Skip some beats based on density
    if (rand() > density) continue;

    // Pick a pattern
    const patternRoll = rand();

    if (patternRoll < 0.5) {
      // Single note
      const lane = Math.floor(rand() * 3) as 0 | 1 | 2;
      notes.push({ t, lane, type: "tap" });
    } else if (patternRoll < 0.75) {
      // Two notes on different lanes
      const l1 = Math.floor(rand() * 3) as 0 | 1 | 2;
      let l2 = Math.floor(rand() * 3) as 0 | 1 | 2;
      while (l2 === l1) l2 = (Math.floor(rand() * 3)) as 0 | 1 | 2;
      notes.push({ t, lane: l1, type: "tap" });
      // Add second note slightly offset for half-beat patterns
      const offset = Math.round(beatInterval / 2);
      notes.push({ t: t + offset, lane: l2, type: "tap" });
    } else {
      // Staircase: quick succession across lanes
      const lanes: (0 | 1 | 2)[] =
        rand() < 0.5 ? [0, 1, 2] : [2, 1, 0];
      const step = Math.round(beatInterval / 3);
      lanes.forEach((lane, idx) => {
        notes.push({ t: t + idx * step, lane, type: "tap" });
      });
    }
  }

  // Sort by time and deduplicate (no two notes at same time+lane)
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  const seen = new Set<string>();
  return notes.filter((n) => {
    const key = `${n.t}-${n.lane}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const tracks: Track[] = [
  {
    id: "track_neon_highway",
    title: "Neon Highway",
    artist: "Synthwave Pilots",
    bpm: 120,
    duration: 70,
    difficulty: "Easy",
    beatmap: generateBeatmap(120, 70, 42, 0.65),
  },
  {
    id: "track_stellar_pursuit",
    title: "Stellar Pursuit",
    artist: "Cosmic Beats",
    bpm: 140,
    duration: 80,
    difficulty: "Normal",
    beatmap: generateBeatmap(140, 80, 137, 0.75),
  },
  {
    id: "track_void_storm",
    title: "Void Storm",
    artist: "Dark Nebula",
    bpm: 160,
    duration: 90,
    difficulty: "Hard",
    beatmap: generateBeatmap(160, 90, 256, 0.85),
  },
];

// Output JSON
console.log(JSON.stringify(tracks, null, 2));
