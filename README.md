# Astra-Valkyries

## Rhythm Jet Squadron

A minimal rhythm game MVP built with Vite + React + TypeScript.

### Quick Start

```bash
cd rhythm-jet-squadron
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Lane 1 (Left) | A | Tap red button |
| Lane 2 (Center) | S | Tap green button |
| Lane 3 (Right) | D | Tap blue button |
| Pause/Resume | Esc | Pause button |

### Project Structure

```
rhythm-jet-squadron/
├── src/
│   ├── data/                    # Game data (JSON)
│   │   ├── pilots.json          # 3 pilots with stats and perks
│   │   ├── outfits.json         # 20 outfits across 4 rarities
│   │   ├── tracks.json          # 3 tracks with beatmaps
│   │   └── generateBeatmaps.ts  # Deterministic beatmap generator
│   ├── lib/                     # Game engine
│   │   ├── timing.ts            # Song clock and timing windows
│   │   ├── scoring.ts           # Score tracker, combo, fever system
│   │   └── gacha.ts             # Pull system with rarity rates
│   ├── context/
│   │   └── GameContext.tsx       # Global state + localStorage persistence
│   ├── screens/                 # All game screens
│   │   ├── HomeScreen.tsx       # Main menu
│   │   ├── HangarScreen.tsx     # Pilot + outfit selection
│   │   ├── TrackSelectScreen.tsx # Track picker
│   │   ├── PlayScreen.tsx       # Canvas-based gameplay
│   │   ├── ResultsScreen.tsx    # Score breakdown
│   │   ├── ShopScreen.tsx       # Gacha pulls
│   │   ├── CollectionScreen.tsx # Owned outfits
│   │   └── SettingsScreen.tsx   # Game settings
│   ├── types.ts                 # TypeScript type definitions
│   ├── App.tsx                  # Router setup
│   ├── main.tsx                 # Entry point
│   └── index.css                # All styles
└── package.json
```

### Game Features

- **3-lane rhythm gameplay** with canvas rendering
- **Timing windows**: Perfect (±50ms), Good (±120ms)
- **Combo system** with score multiplier scaling
- **Fever meter** fills on hits, activates 10s of +1.5x score
- **3 pilots** with unique perks (wider perfect window, combo bonus, longer fever)
- **20 outfits** across Common/Rare/SR/SSR rarities
- **Gacha shop** with 1-pull (120 credits) and 10-pull (1000 credits)
- **Duplicate shards** system with outfit star upgrades (up to 5 stars)
- **localStorage persistence** for all progress
- **Mobile support** with on-screen tap buttons

### Adding Real Assets

The game uses gradient placeholders for all art. To add real images:

1. **Pilot/Outfit art**: Replace the `artPlaceholder` gradient string in the JSON data files with an image path, then update the `card-art` div in `HangarScreen.tsx` and `CollectionScreen.tsx` to render an `<img>` tag instead of a CSS background.

2. **Audio tracks**: Add audio files to `public/audio/`, then in `PlayScreen.tsx`:
   - Create an `Audio` element
   - Start playback when the countdown finishes (in sync with `clockRef.current.start()`)
   - Pause/resume audio in `togglePause()`

3. **SFX**: Add sound files and play them on hit judgments using the Web Audio API. The `sfxVolume` setting is already wired up in `GameContext`.

4. **Background art**: Replace the dark background in `.play-canvas` rendering or add background elements to the canvas draw loop.

### Regenerating Beatmaps

```bash
cd rhythm-jet-squadron
npx tsx src/data/generateBeatmaps.ts > src/data/tracks.json
```

Edit `generateBeatmaps.ts` to change BPM, density, patterns, or seed values for different beatmap outputs.
