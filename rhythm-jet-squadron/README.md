# Astra Valkyries

A minimal rhythm game MVP built with Vite + React + TypeScript.

### Quick Start

```bash
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
src/
├── data/                    # Game data (JSON)
│   ├── pilots.json          # 3 pilots with stats and perks
│   ├── outfits.json         # 20 outfits across 4 rarities
│   ├── tracks.json          # 3 tracks with beatmaps
│   └── generateBeatmaps.ts  # Deterministic beatmap generator
├── lib/                     # Game engine
│   ├── timing.ts            # Song clock and timing windows
│   ├── scoring.ts           # Score tracker, combo, fever system
│   └── gacha.ts             # Pull system with rarity rates
├── context/
│   └── GameContext.tsx      # Global state + localStorage persistence
├── screens/                 # All game screens
│   ├── HomeScreen.tsx       # Main menu
│   ├── HangarScreen.tsx     # Pilot + outfit selection
│   ├── TrackSelectScreen.tsx
│   ├── PlayScreen.tsx       # Canvas-based gameplay
│   ├── ResultsScreen.tsx
│   ├── ShopScreen.tsx
│   ├── CollectionScreen.tsx
│   └── SettingsScreen.tsx
├── types.ts
├── App.tsx
├── main.tsx
└── index.css
```

### Game Features

- **3-lane rhythm gameplay** with canvas rendering
- **Timing windows**: Perfect (±50ms), Good (±120ms)
- **Combo system** with score multiplier scaling
- **Fever meter** fills on hits, activates 10s of +1.5x score
- **3 pilots** with unique perks
- **20 outfits** across Common/Rare/SR/SSR rarities
- **Gacha shop**: 1-pull (120 credits) and 10-pull (1000 credits)
- **Duplicate shards** system with star upgrades (up to 5 stars)
- **localStorage persistence** for all progress
- **Mobile support** with on-screen tap buttons

### Adding Real Assets

**Pilot/Outfit art**: Replace the `artPlaceholder` gradient string in the JSON data files with an image path, then update the `card-art` div in `HangarScreen.tsx` and `CollectionScreen.tsx` to render an `<img>` tag.

**Audio tracks**: Add audio files to `public/audio/`, then in `PlayScreen.tsx` create an `Audio` element and start playback when the countdown finishes in sync with `clockRef.current.start()`.

**Regenerating beatmaps**:
```bash
npx tsx src/data/generateBeatmaps.ts > src/data/tracks.json
```
