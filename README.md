# PIXELVERSE — Enter Another Reality

**Production:** `https://pixelverse-tawny.vercel.app`

A concept website for a fictional independent game-world studio. Instead of a trailer and a feature grid, the page opens on **The Drift**, a floating miniature world rendered in real-time 3D. You orbit it, fly to its six locations, lift each one out of the island as a diorama and read its lore, while a game HUD tracks how much of the map you have charted.

> Fictional concept brand — portfolio project. PIXELVERSE, The Drift, Driftlight, Undertide and Neon Orchard are invented. There is no real studio, game or playtest.

---

## Concept

PIXELVERSE's position is simple: **build the world before the game**. The site proves it by making the world the first thing you touch. Every section after the hero shows another side of that philosophy, framed as a screen you would find in a game:

| # | Section | Composition | What it does |
|---|---|---|---|
| 01 | **World** | Full-bleed 3D island, HUD level select, lore panel, control bar | Signature interaction: orbit, fly to locations, lift dioramas, chart the map, change time of day |
| 02 | **Pipeline** | Pinned horizontal track (desktop), stacked cards (mobile) | Seed → Landform → Ecology → Settlement → Lore → Play, drawn as one isometric island that gains a layer per card |
| 03 | **Worlds** | Save-file select screen | Three fictional projects plus an "empty slot", each with generated pixel-art cover art |
| 04 | **Quest log** | Sticky progress panel + expandable quest list | How the studio tracks its own (fictional) progress |
| 05 | **Crafts** | Character-select screen | Four studio disciplines as classes with pixel sprites and abilities |
| 06 | **Playtest** | "Press start" save-file form | Validated sign-up that clearly states nothing is sent |

## Brand & positioning

- **Name:** PIXELVERSE: the smallest unit of an image, and an entire universe built from it.
- **Line:** Enter Another Reality.
- **Positioning:** a small, world-first studio making gentle exploration games. Craft over scale, places over plots.
- **Voice:** warm, curious, a little wry; written like in-game flavour text. No invented clients, awards, sales figures or testimonials.

## Audience

Players who love exploration and cosy games, plus publishers, collaborators and potential hires who want to see how the studio thinks before they see a pitch deck.

## Art direction

A toy-like miniature lit at dusk, framed by a crisp pixel HUD. It is deliberately the opposite of a glowing particle network: solid, faceted, cel-shaded objects with ink outlines, real shadows and warm key light.

- **Palette:** void `#0D0B2A`, pink `#FF5DA2`, cyan `#5DF2FF`, sun `#FFE45D`, with violet rock strata and teal grass derived from them.
- **3D look:** flat-shaded `MeshToonMaterial` with a 4-step gradient ramp, inverted-hull ink outlines, soft shadow maps, hemisphere + key + rim lighting, three time-of-day presets (dusk, night, dawn) that also retint the CSS sky behind the transparent canvas.
- **HUD language:** pixel frames made from notched box-shadows, stepped (`steps()`) motion, blinking cursors, pixel icons, save-file and quest-log metaphors.
- **Imagery:** 100% original: the procedural island, a hand-built SVG fallback diorama, an isometric build-up generator, pixel cover art generated in code and 16×16 class sprites.
- **Logo:** a floating island drawn in pixels (grass, a pink tree, a sun and a waterfall dripping off the edge) beside a pixel-built wordmark.

## Typography

- **Display:** Tektur (500/700/800) for headlines only: squared, game-like and confident.
- **Text & functional labels:** Readex Pro (400/500/600). All numbers, location names, level numbers, HUD values and form labels use Readex Pro so they stay legible at small sizes.
- Fluid sizes with `clamp()`. Headings use `overflow-wrap: normal` and are sized to fit at 360 px.

## Motion language

Motion behaves like a game, not a slideshow:

- **Flights:** the camera flies between locations on an eased arc while the view offset shifts to make room for the lore panel.
- **Diorama pop:** the selected location lifts out of the island on a spring with slight overshoot, revealing its own rock underside, while a ring pulses where it came from.
- **Ambient life:** lighthouse beam, windmills, smoke from the Crown, fireflies, waterfall spray, a drifting airship, bobbing islets and clouds.
- **Stepped UI:** HUD panels open with stepped clip wipes, headings "pixel-wipe" into view, save files flicker as they load, class sprites idle on two frames.

## Signature interaction — how to use it

- **Orbit:** drag the island (mouse or one finger sideways). Vertical swipes on touch still scroll the page.
- **Zoom:** Ctrl/⌘ + scroll, pinch, or the + / − buttons. (Plain scrolling only zooms right after you have grabbed the island, so the page never traps the wheel.)
- **Visit a location:** click the 3D object, its pin, or a row in **Level select**. The camera flies there, the diorama lifts and the lore panel opens. Use Previous / Next to tour, or **Full view** / Escape to return.
- **Keyboard:** focus the world (Tab) and use ← → to orbit, ↑ ↓ to tilt, + − to zoom; keys 1–6 visit locations; Escape returns.
- **Time of day:** cycle Dusk → Night → Dawn. Night switches on the lighthouse and windows.
- **Chart the map:** each new location you open is marked found (session only). Find all six to unlock the *Cartographer* achievement.
- **Pause motion:** stops all ambient animation and auto-rotation.

## Tech

- Static HTML/CSS/ES modules, no build step.
- Three.js 0.169.0 + `OrbitControls` via import map from jsDelivr.
- `world.js`: procedural scene graph (island strata, six location builders, ambient life). `scene.js`: renderer, lights, time-of-day tweening, camera flights, picking, marker projection. `fallback.js`: SVG diorama. `sections.js`: isometric generator, pixel renderer, save slots, class select, form. `data.js`: shared location lore.
- Hand-written JS ≈ 96 KB.

## Local development

```bash
npx serve .
```

Open the printed URL. Modules require a local server (not `file://`).

## Accessibility

- Semantic landmarks, one `<h1>`, skip link, visible `:focus-visible` on every control.
- Every 3D interaction has a DOM equivalent: location pins are real buttons, the level select is a list of buttons, orbit/zoom/reset/time/motion are buttons, and the world region has keyboard controls with written instructions.
- Location changes are announced through a polite live region; keyboard activation moves focus into the lore panel and Escape returns it.
- Save slots are an ARIA tablist and crafts a radiogroup, both with arrow-key navigation. The form has inline, associated error messages.
- `prefers-reduced-motion`: no auto-rotation or ambient animation, camera moves and time changes are instant, and CSS animation is removed. Motion can be switched on manually.

## Performance

- One WebGL context; DPR capped at 2 (1.5 on small screens); shadows and some decoration disabled on small or low-core devices.
- The render loop stops when the hero is offscreen or the tab is hidden, and only redraws on demand when motion is paused.
- Three.js is loaded lazily after a WebGL check; without WebGL (or if the CDN fails) a designed SVG diorama with the same pins and lore takes over.

## Known limitations

- The 3D world uses many small meshes rather than merged geometry; it is tuned for clarity over draw-call count.
- Discovery progress is stored in `sessionStorage` only and resets per tab.
- Projects, quests and playtest details are fictional.

## Credit

Designed & built by Saad Bashir — https://www.linkedin.com/in/saadbashirmarketing/
