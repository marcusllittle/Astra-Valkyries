# Astra Valkyries Prompt Bible

This document defines the visual prompt system for Astra Valkyries so future images, cut-ins, and video prompts stay coherent across the project.

This first version is anchored partly to an existing successful sample:
- anime-style confident female space pilot
- cockpit framing
- glossy blue high-tech bodysuit
- premium sci-fi interior lighting
- attractive but clean, polished, game-usable presentation

The goal is not to clone one image forever. The goal is to lock in the **visual language** that makes Astra feel like one world.

---

## 1. Core Astra Visual Identity

### Tone
Astra Valkyries should feel:
- premium
- stylish
- futuristic
- anime-cinematic
- confident
- sleek rather than cluttered
- sensual in silhouette/material polish when appropriate, but still usable for game presentation

### Visual keywords
- premium sci-fi
- cockpit elegance
- tactical glamour
- polished high-tech surfaces
- luminous control panels
- cinematic anime character rendering
- confident pilot posture
- clean face rendering
- strong silhouette clarity
- rich blue, gold, silver, black, violet, neon accents depending on faction/pilot

### Avoid
- muddy lighting
- generic fantasy clothing when sci-fi should dominate
- flat backgrounds
- noisy over-detailed cockpit clutter
- inconsistent face shape from image to image
- exaggerated distortions that break premium character appeal
- random color drift between related assets

---

## 2. Identity Anchor Rules

When identity anchors are available:
- let anchors do the heavy work of facial consistency
- keep prompts focused on:
  - expression
n  - pose
  - wardrobe
  - lighting
  - framing
  - environment
- avoid over-describing facial geometry unless the anchor needs support

### Prompting rule
With anchor-driven images, write prompts like:
- who they are in scene terms
- what they are wearing
- where they are
- what mood the shot should have
- how the camera sees them

Do **not** rely on giant face-description paragraphs as the primary identity mechanism once anchors are active.

---

## 3. Asset Categories and Prompt Strategy

### A. Pilot Portraits
Use for:
- selection cards
- codex
- inbox portraits
- profile art

#### Prompt structure
- character role
- emotional tone
- framing
- wardrobe tier
- environment hint
- premium rendering language

#### Template
`highly detailed anime portrait of [pilot role], confident expression, premium sci-fi pilot aesthetic, [hair / styling if needed], [signature suit description], cinematic cockpit or command deck lighting, clean face rendering, polished eyes, sleek futuristic materials, premium game key art, high detail, sharp focus`

---

### B. Pilot Fever / Hero Cut-ins
Use for:
- overdrive moments
- pilot spotlight sequences
- launch or victory inserts

#### Desired feel
- dynamic
- iconic
- more dramatic than portrait art
- stronger contrast and motion energy

#### Template
`dynamic anime cut-in of [pilot name/role], intense confident expression, high-speed sci-fi energy, glowing interface light, motion streaks, premium pilot suit, cinematic action framing, dramatic lighting, bold silhouette, polished high-detail game cut-in art`

---

### C. Outfit Reveal Art
Use for:
- collection
- shop
- unlock reveals
- rarity showcase

#### Desired feel
- fashion-forward
- premium materials
- clear silhouette read
- attractive pose without losing game usability

#### Template
`highly detailed anime fashion portrait of [pilot/character] wearing [outfit name/style], premium futuristic bodysuit / armor design, glossy advanced materials, clean silhouette, luxury sci-fi styling, cinematic studio lighting, polished character art, high-end game unlock illustration`

---

### D. Cockpit / Mission Briefing Visuals
Use for:
- pre-sortie scenes
- story moments
- command bridge/in-cockpit shots

#### Desired feel
- composed
- intimate but premium
- directional lighting
- readable panel environment

#### Template
`cinematic anime scene of [pilot] seated in a futuristic cockpit, glowing instrument panels, premium sci-fi interior, calm confident expression, elegant posture, polished suit materials, soft cinematic key light, high detail, premium narrative game illustration`

This is the category your current example strongly supports.

---

### E. Environment / Stage Art
Use for:
- zone intros
- codex cards
- mission cards
- boss lead-ins

#### Desired feel
- large-scale
- atmospheric
- readable at a glance
- tied to zone identity

#### Template
`cinematic sci-fi environment art of [zone description], premium futuristic worldbuilding, atmospheric lighting, strong depth, polished technology, dramatic color contrast, high-detail anime-inspired environment concept art`

---

## 4. Camera Language

### Portrait camera
- chest-up or waist-up
- slightly heroic angle when needed
- avoid extreme fisheye unless intentionally dramatic

### Cut-in camera
- diagonal framing
- strong silhouette
- action-first composition

### Cockpit camera
- medium shot or seated three-quarter shot
- enough cockpit detail to feel real, not enough to overwhelm the character

### Fashion/reveal camera
- full or three-quarter body
- designed to show silhouette and material quality clearly

---

## 5. Lighting Rules

### Default Astra lighting
- cinematic, controlled, premium
- cool sci-fi ambient fill
- stronger key light for face and chest area
- colored panel light or environment accent okay

### Good lighting adjectives
- cinematic lighting
- premium sci-fi glow
- polished cockpit illumination
- dramatic but clean contrast
- soft key light with luminous instrument reflections
- premium studio-anime lighting

### Avoid
- flat bright wash
- muddy shadows
- random rainbow lighting with no motivation
- overbloom that kills readability

---

## 6. Material Rules

Astra visuals work best when materials feel deliberate.

### Strong material language
- glossy advanced bodysuit
- polished alloy armor trim
- matte-black tactical paneling
- luminous seams
- brushed titanium accents
- reflective cockpit glass
- soft illuminated control surfaces

### Avoid
- vague “cool armor” wording
- too many competing materials in one shot
- muddy cloth descriptions when sleek sci-fi material is the goal

---

## 7. Prompt Construction Pattern

Use this order:

1. **subject**
2. **role or identity in scene terms**
3. **pose / framing**
4. **wardrobe / material language**
5. **environment**
6. **lighting**
7. **quality / presentation language**

### Example pattern
`[subject], [role], [pose/framing], [wardrobe], [environment], [lighting], [presentation quality]`

---

## 8. Example Prompt Anchors

### Example A, cockpit portrait
`highly detailed anime illustration of a confident female space pilot seated in a futuristic cockpit, direct calm eye contact, sleek glossy deep-blue high-tech pilot suit, premium sci-fi interior with luminous control panels, cinematic cool lighting with soft face highlights, polished character rendering, sharp focus, premium game key art`

### Example B, pilot fever cut-in
`dynamic anime cut-in of an elite space pilot activating overdrive, intense confident expression, glowing cockpit reflections, high-speed energy streaks, premium blue-black combat suit, dramatic cinematic lighting, bold silhouette, polished high-detail game cut-in art`

### Example C, outfit reveal
`premium anime fashion illustration of a starfighter pilot wearing a luxury futuristic bodysuit with metallic blue-black surfaces and silver trim, elegant confident pose, sleek sci-fi styling, cinematic studio lighting, polished high-end game unlock art`

---

## 9. Negative Prompt Strategy

Negative prompts should be category-specific, not bloated by default.

### Baseline clean negative prompt
`extra fingers, too many fingers, mutated hands, bad hands, malformed hands, extra limbs, duplicate face, blurry, low quality, text, logo, watermark, jpeg artifacts, cropped, deformed anatomy`

### Important rule
Do **not** overload every prompt with giant generic negative lists unless testing proves they help. Astra should prioritize:
- clean silhouette
- face consistency
- hand cleanup
- artifact avoidance

not enormous prompt sludge.

---

## 10. Video Prompt Extension Rules

When converting a still prompt into a video prompt:
- keep the same subject, wardrobe, and environment language
- add only motion, camera, and timing instructions

### Additions for video prompts
- subtle camera push-in
- cockpit panel light flicker
- hair sway or suit shine shift
- breathing / posture micro-movement
- controlled cinematic motion

### Example extension
`subtle cinematic push-in, cockpit panel lights pulsing softly, slight posture shift, soft reflective highlights moving across the suit, premium sci-fi mood, smooth controlled motion`

---

## 11. Immediate Prompt Pack to Build Next

### P1
- 3 pilot portrait prompts
- 3 pilot fever/cutin prompts
- 6 outfit reveal prompts
- 3 cockpit/briefing prompts
- 3 launch/return transition prompts

### P2
- zone intro prompts
- boss intro prompts
- inbox portrait variation prompts
- title/hero art prompts

---

## 12. How to Use This Bible

Before generating new Astra art:
1. pick the asset category
2. pick the relevant prompt template
3. fill in pilot/outfit/scene specifics
4. use identity anchors where available
5. keep style consistent across batches
6. save the exact generation recipe with the resulting image

This is the foundation for scaling Astra’s visual content without losing coherence.
