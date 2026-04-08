# Astra-Valkyries

Astra Valkyries is a stylized arcade action game built with React, TypeScript, and Vite.

The current project is no longer a tiny rhythm prototype. It now plays more like a character-driven space-combat game with shmup combat, loadouts, progression, narrative sequences, missions, and optional HavnAI wallet-linked rewards.

## What the game includes

- **Arcade shmup combat** with weapon upgrades, boss encounters, and run grading
- **Pilot, ship, and outfit loadouts** with stat and kit interactions
- **Progression systems** including pilot XP, levels, achievements, and unlock tracking
- **Mission structure** with daily and weekly objectives
- **Narrative presentation** via briefing, debrief, codex, inbox, and cutscene screens
- **Spaceport hub flow** for navigating the game’s broader systems
- **Optional HavnAI integration** for wallet connection, shared balance display, leaderboard, and reward hooks
- **Web, desktop, and mobile packaging paths** through Vite, Electron, and Capacitor

## Project structure

The playable app lives in:

```text
rhythm-jet-squadron/
```

That folder name is legacy. The actual game and product identity are **Astra Valkyries**.

Top-level notable files:

```text
README.md
vercel.json
docs/
rhythm-jet-squadron/
```

Inside the app:

```text
rhythm-jet-squadron/
├── src/
│   ├── components/          # overlays, dialogue, tutorials, toasts, UI helpers
│   ├── context/             # game state and wallet state
│   ├── data/                # pilots, ships, outfits, lore, dialogue, modifiers
│   ├── lib/                 # combat systems, progression, missions, API helpers
│   ├── screens/             # game screens and hub destinations
│   ├── App.tsx              # route wiring
│   ├── main.tsx             # app entry point
│   └── index.css            # core styling and responsive layout rules
├── electron/                # desktop wrapper entry
├── public/                  # static assets, cutins, art, audio
├── capacitor.config.ts      # mobile wrapper config
└── package.json
```

## Main routes/screens

The current app includes these primary screens:

- `/` — title screen and main menu
- `/hangar` — pilot, ship, outfit, and map loadout selection
- `/shmup` — active combat run
- `/shmup-results` — post-run grading and rewards
- `/spaceport` — command hub for surrounding systems
- `/missions` — daily and weekly objectives
- `/collection` — unlock and reward browsing
- `/leaderboard` — HavnAI-linked online rankings
- `/codex` — lore and world reference
- `/briefing` — pre-mission dialogue flow
- `/video-cutscene` — cinematic transitions
- `/shop` — progression/shop loop
- `/settings` — audio, controls, and utility settings

## Quick start

```bash
cd rhythm-jet-squadron
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## HavnAI integration notes

If you want Astra to talk to a local `havnai-core` during development:

```bash
cd rhythm-jet-squadron
cp .env.example .env
npm run dev
```

By default, local browser development proxies `/api` to:

```text
http://127.0.0.1:5001
```

Relevant env values live in:

- `rhythm-jet-squadron/.env.example`

## Packaging targets

### Desktop

```bash
npm run desktop:start
npm run desktop:build:mac
npm run desktop:build:win
npm run desktop:build
```

### Mobile

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

Notes:
- Windows installers are best built on Windows
- iOS builds require macOS + Xcode + signing
- Android builds require Android Studio + SDK setup

## Current architecture notes

### State

The app primarily uses two top-level contexts:

- **GameContext**
  - local save data
  - credits
  - inventory/loadout
  - progression
  - missions
  - achievements
  - persistence

- **WalletContext**
  - MetaMask connection
  - wallet restore/connect/disconnect
  - shared HavnAI credit balance

### Data-driven systems

A lot of the game is configured through source data files, including:

- `pilots.json`
- `ships.json`
- `outfits.json`
- `dialogues.ts`
- `lore.ts`
- `modifiers.ts`
- `skillTrees.ts`

## Known product reality

This repo still contains some naming and structural leftovers from an earlier rhythm-game prototype phase. The current codebase has moved well beyond that.

If you are new to the repo, trust the code and current routes over the old prototype language.

## Recommended next cleanup

High-value follow-up improvements for the repo itself:

- align folder naming with Astra Valkyries branding
- keep README and in-app architecture docs current
- continue improving mobile control ergonomics on real devices
- tighten onboarding for first-time players
- keep gameplay balancing separate from narrative/hub polish where possible
