# Astra Valkyries Production Checklist

This checklist turns the current Astra Valkyries prototype-to-product gap into a concrete production plan.

Status markers:
- `[x]` Exists and is usable
- `[~]` Exists but needs improvement or broader coverage
- `[ ]` Missing
- `P1/P2/P3` Priority

---

## 1. Visual Identity and Key Art

### Brand / Hero Assets
- [ ] **P1** Title key art for Astra Valkyries
- [ ] **P1** Main menu hero backdrop set
- [ ] **P2** Alternate menu backdrop variations by progression/state
- [ ] **P2** Promotional splash art for web/storefront/social
- [ ] **P3** Event/seasonal promo variants

### Logo / UI Brand Polish
- [~] **P2** Branded UI consistency pass across title, hub, missions, results
- [ ] **P2** Style guide for typography, glow language, framing, color hierarchy

---

## 2. Pilot Content

### Static Pilot Assets
- [x] **P1** Pilot card art exists
- [~] **P1** Pilot art consistency and final quality pass
- [ ] **P2** Alternate portrait expressions for dialogue/inbox use
- [ ] **P2** High-resolution portrait masters for future marketing and cut-ins

### Pilot Motion / Cinematic Assets
- [~] **P1** Some pilot/cutin motion exists, but coverage is inconsistent
- [ ] **P1** Fever activation clip for each pilot
- [ ] **P1** Briefing intro clip for each pilot
- [ ] **P2** Post-sortie / return-to-port pilot clip set
- [ ] **P2** Pilot-specific victory/grade reaction moments

### Pilot Narrative Content
- [~] **P2** Dialogue framework exists
- [ ] **P1** First-run pilot guidance voice lines/text
- [ ] **P2** Pilot-specific inbox message chains
- [ ] **P2** Pilot lore unlock progression in codex

---

## 3. Ship Content

### Static Ship Assets
- [x] **P1** Ship art/cards exist
- [~] **P1** Ship art quality/consistency pass
- [ ] **P2** Distinct ship glamor shots for hangar and collection

### Ship Presentation
- [ ] **P1** Launch visual pass so ships feel premium before sortie
- [ ] **P2** Ship-specific deploy/boost flourish visuals
- [ ] **P2** Better ship silhouette readability in combat

---

## 4. Outfit Content

### Static Outfit Assets
- [x] **P1** Outfit art exists for many items
- [~] **P1** Outfit quality consistency pass across rarity tiers
- [ ] **P1** Coverage audit for every outfit to ensure no missing or weak assets

### Motion / Showcase Assets
- [~] **P1** Some outfit cutscene/cutin assets exist
- [ ] **P1** Motion reveal coverage for all flagship SR/SSR outfits
- [ ] **P2** Reveal clip coverage for top Common/Rare looks used early
- [ ] **P2** Premium showcase framing for collection/shop inspection

### Reward Presentation
- [ ] **P1** Better SSR/SR reveal moments
- [ ] **P2** Distinct rarity presentation language (sound, glow, camera, timing)

---

## 5. Combat Presentation

### Backgrounds / Stage Identity
- [~] **P1** Functional combat exists, but stage identity feels lighter than hub polish
- [ ] **P1** Zone-specific background sets for each map
- [ ] **P1** Parallax / depth pass for combat scenes
- [ ] **P2** Environmental effects by zone (debris, nebula, storms, glows, etc.)

### Enemy / Boss Presentation
- [~] **P1** Boss framework exists, but spectacle can be stronger
- [ ] **P1** Boss intro visual treatment for each major encounter
- [ ] **P2** Enemy faction visual identity pass
- [ ] **P2** Better elite/miniboss arrival language

### FX / Feedback
- [~] **P1** Core combat feedback exists
- [ ] **P1** Stronger hit, kill, and explosion feedback
- [ ] **P1** Stronger overdrive activation feel
- [ ] **P2** Better pickup readability and reward juice
- [ ] **P2** Clearer weapon differentiation via visuals/audio

---

## 6. Onboarding and UX Scaffolding

### First-Run Guidance
- [x] **P1** First-run guidance improvements added on current branch
- [~] **P1** Needs real-device/player testing for clarity
- [ ] **P1** First-run briefing sequence refinement
- [ ] **P2** Optional guided first sortie narrative wrapper

### Loadout Clarity
- [x] **P1** Early loadout tips added on current branch
- [ ] **P1** Recommended starter build labeling improvements
- [ ] **P2** Better “what changed” feedback when swapping pilot/ship/outfit

### Results / Reward Guidance
- [x] **P1** Results next-step guidance improved on current branch
- [~] **P1** Reward punch improved, but still needs playtest validation
- [ ] **P2** Unlock summary / stronger “what changed” result framing

---

## 7. Hub / Meta Content

### Spaceport
- [x] **P1** Early-game hub guidance improved on current branch
- [~] **P1** Still needs content density and stronger long-term reasons to return
- [ ] **P2** More reactive Spaceport messaging after milestones

### Missions
- [x] **P1** Missions framing improved for early game
- [ ] **P1** Better mission reward anticipation and payoff visuals
- [ ] **P2** Mission category flavor / commander voice framing

### Collection / Shop / Codex
- [~] **P1** Structure exists
- [ ] **P1** Collection reward presentation upgrade
- [ ] **P2** Shop banner/content polish
- [ ] **P2** Codex entry density and unlock pacing improvement

### Inbox
- [~] **P1** Inbox framework exists and is high potential
- [ ] **P1** Core inbox message content pass
- [ ] **P2** Pilot-specific inbox chains
- [ ] **P2** Boss/mission/inventory milestone inbox events

---

## 8. Cutscenes and Video Pipeline

### Existing Video Support
- [x] **P1** Video cutscene screen exists
- [x] **P1** Motion asset support exists in multiple places
- [~] **P1** Actual coverage is uneven and not productionized

### Missing Cutscene Coverage
- [ ] **P1** Launch sequence set
- [ ] **P1** Return-to-port sequence set
- [ ] **P1** Major boss encounter intros
- [ ] **P1** High-rarity reveal clips
- [ ] **P2** Pilot-specific progression moments
- [ ] **P2** Mission completion cinematic stingers

### Video Workflow Scaffolding
- [ ] **P1** Define target durations by clip type
- [ ] **P1** Define aspect ratios and resolution targets
- [ ] **P1** Define naming convention for stills, motion clips, and in-game references
- [ ] **P1** Establish Grok or other video-generation workflow test process
- [ ] **P2** Compression/optimization rules for game-ready video assets

---

## 9. Prompt System / Content Generation Pipeline

### Prompt Bible
- [ ] **P1** Visual style bible for Astra Valkyries
- [ ] **P1** Pilot portrait prompt templates
- [ ] **P1** Outfit prompt templates
- [ ] **P1** Cutscene still prompt templates
- [ ] **P1** Environment / stage prompt templates
- [ ] **P1** Motion/video extension prompt templates

### Consistency Rules
- [ ] **P1** Character identity anchors per pilot
- [ ] **P1** Material / lighting rules for premium Astra look
- [ ] **P2** Camera language guide for portraits, gameplay support art, and cinematics
- [ ] **P2** Negative prompt strategy by asset category

---

## 10. Technical / Production Cleanup

### Asset Tracking
- [ ] **P1** Build a full asset coverage matrix for pilots, ships, outfits, maps, transitions, and hub systems
- [ ] **P1** Mark every referenced asset as exists / weak / missing / placeholder
- [ ] **P2** Add docs for asset naming and storage structure

### Repo / Project Structure
- [x] **P1** README rewrite completed on current branch
- [ ] **P2** Decide whether `rhythm-jet-squadron/` should be renamed or documented as legacy naming
- [ ] **P2** Add architecture/content pipeline documentation for future production work

---

# Recommended Execution Order

## Phase 1: Production Groundwork
1. Build asset coverage matrix
2. Build prompt bible
3. Define video workflow constraints and naming

## Phase 2: Highest-Impact Content
1. Pilot motion/cutin consistency
2. Launch / return / major transition clips
3. SR/SSR reveal quality pass
4. Combat background and boss presentation improvements

## Phase 3: World Density
1. Inbox content
2. Codex content expansion
3. Mission flavor and hub reactivity

## Phase 4: Final Smoothing
1. Reward punch pass
2. Flow continuity between screens
3. Marketing/key-art package

---

# Immediate Next Steps

## Recommended next actions
- [x] Build the **asset coverage matrix** from current files and data references
- [x] Create the **Astra visual prompt bible**
- [ ] Define the **video clip production workflow** for Grok or equivalent tools
- [ ] Assign newly generated pilot images to concrete roles (inbox, briefing, codex, replacement candidate, etc.)
- [ ] Identify which existing in-game assets should stay versus be selectively replaced

These should guide the next content integration phase.

---

## Current checkpoint

### Completed groundwork
- Astra production checklist created
- asset coverage matrix created
- prompt bible created
- render scorecard created
- active prompt pack workflow established
- first live model comparisons completed

### Current model winners for Astra still-image work
Most promising so far:
- `perfectdeliberate_v60`
- `aMixIllustrious_aMix`

### Current strategy
Astra already has a meaningful amount of usable in-game art.
The goal now is **selective integration**, not replacing everything indiscriminately.

Priority for new images:
1. inbox portraits
2. briefing portraits
3. codex/profile refreshes
4. transition stills
5. selective replacement of weaker existing art
