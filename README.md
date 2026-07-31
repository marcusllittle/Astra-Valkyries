# Astra Valkyries

Astra Valkyries is a stylized arcade action game built with React, TypeScript, and Vite.

The game combines shmup combat with character-driven progression, narrative sequences, missions, and optional HavnAI wallet-linked rewards.

## What the game includes

- **Arcade shmup combat** with weapon upgrades, boss encounters, and run grading
- **Pilot, ship, and outfit loadouts** with stat and kit interactions
- **Progression systems** including pilot XP, levels, achievements, and unlock tracking
- **Mission structure** with daily and weekly objectives
- **Narrative presentation** via briefing, debrief, codex, inbox, and cutscene screens
- **Spaceport hub flow** for navigating the game's broader systems
- **HavnAI integration** for wallet connection, shared balance display, leaderboard, and HAI rewards
- **Web, desktop, and mobile packaging** through Vite, Electron, and Capacitor

## Project structure

The playable app lives in `rhythm-jet-squadron/`. That folder name is a legacy artifact — the product identity is **Astra Valkyries**. A rename is planned but deferred to avoid breaking Vercel's build cache.

```text
README.md
vercel.json
docs/
rhythm-jet-squadron/
  src/
    components/    # overlays, dialogue, tutorials, toasts, UI helpers
    context/       # GameContext and WalletContext
    data/          # pilots, ships, outfits, lore, dialogue, modifiers
    lib/           # combat systems, progression, missions, API helpers
    screens/       # all game screens and hub destinations
    App.tsx        # route wiring
    main.tsx       # app entry point
    index.css      # core styling and responsive layout rules
  electron/        # desktop wrapper
  public/          # static assets, cutins, art, audio
  capacitor.config.ts
  package.json
```

## Main routes

| Route | Screen |
|---|---|
| `/` | Title screen / main menu |
| `/hangar` | Pilot, ship, outfit, map loadout |
| `/shmup` | Active combat run |
| `/shmup-results` | Post-run grading and HAI rewards |
| `/spaceport` | Command hub |
| `/missions` | Daily and weekly objectives |
| `/collection` | Unlock and reward browsing |
| `/leaderboard` | HavnAI-linked online rankings |
| `/codex` | Lore and world reference |
| `/briefing` | Pre-mission dialogue |
| `/video-cutscene` | Cinematic transitions |
| `/shop` | Progression shop |
| `/settings` | Audio, controls, utility |

## Quick start

```bash
cd rhythm-jet-squadron
npm install
npm run dev
```

Then open `http://localhost:5173`.

## HavnAI integration

To connect to a local `havnai-core` during development:

```bash
cd rhythm-jet-squadron
cp .env.example .env
npm run dev
```

By default the dev server proxies `/api` to `http://127.0.0.1:5001`. HAI rewards require a MetaMask wallet connected in-game.

## CI

GitHub Actions runs on every push and PR to `main`:

1. `npm ci` — install dependencies
2. `tsc -b --noEmit` — full type check
3. `npm run build` — Vite production build

See `.github/workflows/ci.yml`.

## Packaging

### Desktop

```bash
npm run desktop:start          # dev run with Electron
npm run desktop:build:mac      # macOS DMG
npm run desktop:build:win      # Windows NSIS installer
npm run desktop:build          # both
```

### Mobile

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

Notes: Windows installers build best on Windows. iOS requires macOS + Xcode + signing. Android requires Android Studio + SDK.

## Architecture

### State

- **GameContext** — local save data, credits, inventory, loadout, progression, missions, achievements, persistence
- **WalletContext** — MetaMask connection, wallet restore/connect/disconnect, shared HavnAI credit balance

### Data-driven systems

Most game config lives in source data files:

- `pilots.json` / `ships.json` / `outfits.json`
- `dialogues.ts` / `lore.ts` / `modifiers.ts` / `skillTrees.ts`
