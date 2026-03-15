# Astra Valkyries

A minimal rhythm game MVP built with Vite + React + TypeScript.

### Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

If you want wallet balance, rewards, shop spending, and leaderboard to use a local `havnai-core`:

```bash
cp .env.example .env
# start havnai-core separately, then run:
npm run dev
```

By default, Vite proxies `/api` to `http://127.0.0.1:5001`, which matches the local `havnai-core` default.

### Packaging Targets

These commands are additive and do not change the browser dev loop (`npm run dev`).

```bash
# Desktop app (run packaged build locally in Electron)
npm run desktop:start

# Desktop installers
npm run desktop:build:mac   # builds DMG on macOS
npm run desktop:build:win   # builds NSIS EXE installer

# Mobile wrappers (Capacitor)
npm run mobile:add:android  # one-time setup
npm run mobile:add:ios      # one-time setup
npm run mobile:sync
npm run mobile:android      # opens Android Studio project
npm run mobile:ios          # opens Xcode project
```

Notes:
- Windows `.exe` generation is most reliable on a Windows runner/machine.
- iOS packaging requires macOS + Xcode + Apple Developer signing.
- Android packaging requires Android Studio + SDK/keystore setup.

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

**Art + cutins live in `public/assets`:**

- `public/assets/pilots/`
- `public/assets/outfits/`
- `public/assets/cutins/`

**Data wiring:**

- Pilots: `src/data/pilots.json` (`artUrl`, optional `feverCutinUrl`)
- Outfits: `src/data/outfits.json` (`artUrl`, optional `cutinUrl`)

**Naming convention:**

- lowercase snake case filenames, e.g. `nova_starling.png`, `aurora_borealis.png`, `nova_fever.mp4`
- keep extensions explicit in JSON URLs

**Fallback behavior:**

- Cards always render the JSON `artPlaceholder` gradient base.
- If `artUrl` exists, the image overlays it.
- If image loading fails, the image hides and the gradient remains.

**Audio tracks**: Add audio files to `public/audio/`, then in `PlayScreen.tsx` create an `Audio` element and start playback when the countdown finishes in sync with `clockRef.current.start()`.

**Regenerating beatmaps**:
```bash
npx tsx src/data/generateBeatmaps.ts > src/data/tracks.json
```
