# Charlie Road — Build Specification

**This document is authoritative.** Rationale and research live in [`PLAN.md`](PLAN.md); where the two disagree, this file wins.

---

## 0. The Goal

> **GOAL — done when all five hold:**
> 1. Every task checkbox in §11 is ticked.
> 2. Every acceptance criterion in §10 is verified (A1–A24).
> 3. `node tests/run.js` exits 0 with zero failures.
> 4. A 90-second play session produces zero uncaught exceptions and zero console errors, at ≥50 fps on desktop.
> 5. The game is deploy-ready for GitHub Pages: `.nojekyll` present, every path relative, no build step, and it runs correctly when served over plain HTTP (verify with any static server, e.g. `python3 -m http.server 8000`).

**Repo:** `bcollier/charlie-road`, already created and **private**.

**Branch: `rebuild`.** All build work happens here. `main` holds the plan and the v1 prototype and must not be touched — merging `rebuild` into `main` is the owner's review step, not part of the goal. Commit at the end of every block and push to `origin/rebuild`.

**Human-gated, explicitly outside the goal:** changing the repo to public and enabling GitHub Pages. That publishes the project to the open internet and is the owner's decision, not the build's. Leave the repo private; the README documents the two commands.

**Checkpoint discipline:** `git commit` at the end of every block in §11. Never leave the tree broken across a block boundary.

---

## 1. Product

A *Crossy Road* replica starring **Charlie**, an American cocker spaniel: a fun-loving dog with attitude who lives for chasing tennis balls — wherever that may take him.

Which, here, is straight across eight lanes of traffic. He hops forward through endless roads, rivers and railways, fetching **bouncing tennis balls** and doing a spin of delight each time he gets one. Endless, score = rows advanced, high score saved in the browser.

**Charlie's attitude is a design requirement, not flavour text.** It should be legible in how he moves: a cocky head-tilt when he's kept waiting, a tail that never stops, a celebration that is frankly too much for one tennis ball. He is not a cautious animal. The game should feel like it is barely keeping up with him.

**Platform:** static site, GitHub Pages, no build step. Desktop keyboard + mobile touch.

---

## 2. Stack and layout

- **three.js r186** (`0.186.0`), `build/three.module.js` committed verbatim to `vendor/`, loaded via `<script type="importmap">`. No CDN, no npm install, no bundler.
- `package.json` contains exactly `{"type":"module","private":true}` — needed only so plain `node` can run the tests. No dependencies.
- **Hosting requires nothing.** GitHub Pages serves static files over HTTPS, which is all this needs: no server process, no build, no Actions workflow, no configuration beyond `.nojekyll`. Push and it is live.
- The one consequence of using ES modules is **local preview**: browsers block module imports over `file://`, so double-clicking `index.html` shows a blank page. Any static server fixes it — `python3 -m http.server 8000` (Python ships with macOS), `npx serve`, or a VS Code Live Server. **This is a dev-preview convenience, not a runtime dependency**, and it has no bearing on Pages.

```
index.html            importmap, canvas, HUD/overlay DOM
styles.css            HUD, title, pause, game-over, buttons
.nojekyll
package.json          {"type":"module","private":true}
README.md             run + deploy instructions
vendor/three.module.js
src/
  main.js             bootstrap, RAF loop, game state machine
  config.js           every tunable constant (§3)
  palette.js          every colour (§3.7)
  scene.js            renderer, camera rig, lights, shadow frustum, resize
  camera.js           follow damping + auto-scroll
  voxel.js            buildVoxelMesh() — merged-geometry builder (§4)
  world.js            row instantiation, object pool, recycling
  rows/{grass,road,river,rail}.js
  models/{charlie,accessories,car,truck,bus,train,tree,rock,log,lilypad,ball,signal,eagle}.js
  player.js           hop state machine, log riding, deaths, celebration
  hazards.js          vehicle/log/train spawn + movement
  balls.js            tennis ball spawn, bounce, pickup
  eagle.js
  particles.js
  input.js            keyboard, swipe, tap zones
  audio.js            WebAudio synthesised SFX (no asset files)
  ui.js               HUD, title, pause, game over
  storage.js          localStorage with in-memory fallback
  rules/              PURE — no three.js, no DOM. node-testable.
    rng.js            mulberry32 seeded PRNG
    difficulty.js     difficulty(score)
    worldgen.js       planRow() -> plain row descriptor
    collide.js        AABB overlap, log attachment
    eagle.js          idleLimit(score)
tests/run.js          plain node, no deps, exit 1 on failure
v1/index.html         the 30-minute build, preserved
reference/            tracked — gameplay screenshots + photos of Charlie
```

**Hard rule:** nothing in `src/rules/` may import three.js or touch the DOM. Everything else may.

---

## 3. Constants

All distances in **tiles**; 1 tile = 1 world unit. All times in seconds.

### 3.1 Camera
```
PITCH        = 57° (0.9948 rad)     // elevation above horizon
YAW          = 15° (0.2618 rad)     // sign chosen so lanes tilt DOWN to the right
ORTHO_DEPTH  = 200                  // near/far span
VIEW_TILES_X = 11                   // desired horizontal tiles
MIN_VIEW_Z   = 9                    // minimum rows visible (landscape clamp)
CAM_LEAD     = 1.5                  // rows the camera sits ahead of the player
CAM_LERP_K   = 8.0                  // exponential damping: t = 1 - exp(-k*dt)
```
Frustum: `halfW = VIEW_TILES_X/2`, `halfH = halfW/aspect`; if `halfH*2 < MIN_VIEW_Z` then `halfH = MIN_VIEW_Z/2` and `halfW = halfH*aspect`.

**If the lanes tilt the wrong way, flip the sign of `YAW`.** Verify against `reference/cr_s031.png` before proceeding past Block 0.

### 3.2 Field and world
```
FIELD_MIN_X = -6 ; FIELD_MAX_X = 6     // 13 tiles wide
START_SAFE_ROWS = 6
ROWS_AHEAD = 20 ; ROWS_BEHIND_KEEP = 8
DT_CLAMP = 0.1                          // seconds
```

### 3.3 Player
```
HOP_DURATION   = 0.16
HOP_HEIGHT     = 0.55
SQUASH_TIME    = 0.07 ; SQUASH_SCALE = (1.18, 0.75, 1.18)
INPUT_BUFFER   = 2                       // queued moves
FACE_SNAP      = instant on hop start
```

### 3.4 Difficulty — `t = min(score, 300) / 300`, all lerps clamped
```
vehicleSpeed   : [2.5, 4.5] -> [4.0, 9.0]   tiles/s
vehicleGapMin  : 5.0 -> 2.8                 tiles (never below MIN_GAP = 2.5)
logSpeed       : [1.2, 2.0] -> [2.0, 3.2]   tiles/s
hazardChance   : 0.55 -> 0.80
maxHazardRun   : floor(lerp(2, 4.99, t))    // 2 -> 4
autoScroll     : 0.55 -> 1.40               rows/s
eagleIdleLimit : see 3.6
```
Hazard type weights: road 0.55, river 0.25, rail 0.20.
Group sizes: road 1–4, river 1–3, rail 1–3. Safe runs: 1–2 grass rows.

### 3.5 Hazards
```
car    len 1.6  w 0.9  h 0.75
bus    len 3.0  w 0.95 h 1.05
truck  len 3.8  (cab 1.2 + trailer 2.6)  w 0.95 h 1.10
hitbox = visual * (0.92 length, 0.85 width)      // slightly forgiving

log lengths 2 or 3 ; lilypad 1
RIVER_MAX_PLATFORM_GAP = 3.0                      // fairness
ATTACH_TOLERANCE = 0.25                           // beyond half-length

TRAIN_WARN     = 1.6–2.2
TRAIN_SPEED    = 20
TRAIN_LENGTH   = 14
TRAIN_COOLDOWN = 2.5–5.0
SIGNAL_X       = FIELD_MAX_X + 0.5
```

### 3.6 Eagle
```
idleLimit(score): 5.0 at 0 -> 3.0 at 150 -> 2.0 at 300+, piecewise linear, clamped [2.0, 5.0]
EAGLE_WARN  = 0.8    // shadow grows over Charlie
EAGLE_SWOOP = 0.55
```
Reset the idle timer on **any** successful move, including sideways and backward.
Second trigger: Charlie's row falls behind the camera's trailing visible row.

### 3.7 Tennis balls
```
BALL_SPAWN_CHANCE   = 0.18        // per eligible row (grass and road only)
BALL_DIAMETER       = 0.30
BALL_BOUNCE_PERIOD  = 0.85
BALL_BOUNCE_HEIGHT  = 0.42
BALL_SPIN           = 1.2 rad/s
BALL_PICKUP_RADIUS  = 0.5
CELEBRATE_DURATION  = 0.50
CELEBRATE_LIFT      = 0.25        // extra hop height
CELEBRATE_SPARKS    = 8
```

### 3.8 Palette
```
// World (measured from reference/cr_*.png)
SKY #72D8FF · GRASS_A #6E9E30 · GRASS_B #557D27 · BUSH #6C8B57 / #425438
ASPHALT #50506B · ASPHALT_ALT #79758B · MARKING #E3E0FF
WATER #5BA8E1 · WATER_DEEP #3F8FC4 · FOAM #FFFFFF
LOG #625052 · LOG_MOSS #7C9B5D · BALLAST #404754 · SLEEPER #703939 · RAIL #8883A8
VEHICLE_WHITE #D8EAFF · TYRE #000000 · GLASS #1F2937
TREE_TRUNK #6B4A2F · TREE_LEAF_A #4E8A2B · TREE_LEAF_B #3C6E22

// Charlie
LIVER #6E4026 · LIVER_DARK #5A3520 · LIVER_LIGHT #8B5A38
FUR_WHITE #F7F3EA · FUR_SHADOW #D8D0C2 · NOSE #3D2A1E
EYE #2A1C12 · TONGUE #E8899B · COLLAR #4A5560 · TAG #E8B93C

// Ball
BALL #D9E534 · BALL_SEAM #F5F7EC

// Accessories (stylised up from reference/charlie/)
SHADES_FRAME #5CC6D4 · SHADES_LENS #1E2126
BANDANA #D8382F · BANDANA_SPOT #F5F1E8
SWEATER_RED #D23B44 · SWEATER_WHITE #F0EDE4
BOWTIE #E8B93C
```

---

## 4. Voxel model system

`buildVoxelMesh(boxes) -> THREE.Group`, where `boxes` is `[{x, y, z, w, h, d, color}]` in tile units, `y` up, centre-origin.

Implementation: group boxes by colour; for each colour concatenate translated box vertex data into **one** `BufferGeometry`; one `MeshLambertMaterial` per colour; `castShadow = true`, `receiveShadow = true`. Result is one mesh per distinct colour, not one per box.

Materials and geometries are **cached and shared** across every instance of a model. A hundred cars must not create a hundred materials.

Animated parts get their own group so they can transform independently.

### 4.1 Charlie

**American cocker spaniel**, liver and white. Facing **−Z** (away from camera). Overall ~0.62 w × 0.82 d × 0.78 h.

The four silhouette cues that make him read as a cocker rather than a springer — get these right and the rest is detail:

1. **Domed skull.** Rounded and tall, not flat.
2. **Very short muzzle with a pronounced stop** — a sharp step down from the brow. A long muzzle reads as a springer instantly.
3. **Long, low-set, heavily feathered ears** that hang well below the jaw.
4. **Large, round, prominent eyes.**

Plus a compact short-backed body with feathering (the "skirt") along the belly and legs.

**Group `root`**
- `body`   (0, 0.21, 0.04) size (0.44, 0.30, 0.54) — FUR_WHITE
- `skirt`  (0, 0.09, 0.06) size (0.48, 0.10, 0.50) — FUR_WHITE (belly feathering; slightly wider than `body`)
- `saddle` (0, 0.365, 0.10) size (0.46, 0.06, 0.30) — LIVER
- `legFL` (−0.15, 0.06, −0.17) size (0.12, 0.14, 0.12) — FUR_WHITE
- `legFR` (+0.15, 0.06, −0.17) · `legBL` (−0.15, 0.06, +0.19) · `legBR` (+0.15, 0.06, +0.19)
- `collar` (0, 0.40, −0.20) size (0.37, 0.06, 0.24) — COLLAR
- `tag`    (0, 0.36, −0.325) size (0.05, 0.05, 0.03) — TAG

**Group `head`** at (0, 0.46, −0.28), coordinates local to it
- `skull`  (0, 0.11, 0) size (0.34, 0.30, 0.28) — LIVER
- `dome`   (0, 0.27, 0.01) size (0.28, 0.07, 0.22) — LIVER (rounds the crown — cue 1)
- `blaze`  (0, 0.14, −0.142) size (0.10, 0.28, 0.02) — FUR_WHITE
- `muzzle` (0, −0.01, −0.17) size (0.19, 0.12, 0.10) — FUR_WHITE (short and set low — cue 2)
- `nose`   (0, 0.02, −0.235) size (0.10, 0.08, 0.04) — NOSE
- `eyeL/R` (∓0.10, 0.14, −0.145) size (0.07, 0.07, 0.02) — EYE (cue 4), each with a (0.025)³ FUR_WHITE glint set to the upper-outer corner
- `tongue` (0, −0.05, −0.21) size (0.07, 0.03, 0.11) — TONGUE (hidden unless celebrating or idle-panting)

**Group `earL`** pivot (−0.175, 0.16, −0.01) in head space — low-set (cue 3)
- `ear`     (0, −0.21, 0) size (0.09, 0.42, 0.24) — LIVER_DARK
- `feather` (0, −0.40, 0.01) size (0.11, 0.11, 0.22) — LIVER_DARK (the wavy flare at the tip)

`earR` mirrored.

**Group `tail`** pivot (0, 0.34, 0.28) in root space; box (0, 0.06, 0.06) size (0.09, 0.15, 0.09) — LIVER. Docked short and carried level, as in the photos.

**Group `mouthBall`** parented to `head` at (0, −0.04, −0.26), shared ball geometry (§4.3) at 0.16 scale. Visible whenever `ballsThisRun > 0`.

**Verification:** if he reads as a springer, the muzzle is too long or the ears are set too high. Compare against `reference/charlie/IMG_0467.jpeg` (head-on) and `IMG_8224.jpeg` (full body).

### 4.2 Accessories

Four accessories, each modelled from a photo in `reference/charlie/`, each built with `buildVoxelMesh` and parented to an existing group. **Three slots, one item per slot, multiple slots equippable at once.**

| Item | Slot | Parent | Cost (balls) | Reference | Geometry |
|---|---|---|---|---|---|
| **Bandana** | neck | `root` | 10 | `IMG_8224` | Triangle bib below the collar: plate (0, 0.36, −0.26) size (0.34, 0.16, 0.04) plus a tapering stack of 3 plates descending to (0, 0.20, −0.24) — BANDANA, with 4 scattered (0.03)³ BANDANA_SPOT cubes for the heart print |
| **Sunglasses** | head | `head` | 25 | `IMG_2100` | Bridge (0, 0.15, −0.148) size (0.30, 0.04, 0.03) — SHADES_FRAME; two lenses (∓0.10, 0.13, −0.158) size (0.12, 0.10, 0.02) — SHADES_LENS (sized to the cocker's larger eyes); two temples (∓0.165, 0.14, −0.07) size (0.02, 0.03, 0.16) — SHADES_FRAME |
| **Bow tie** | neck | `root` | 50 | `IMG_6040` | Centre knot (0, 0.38, −0.35) size (0.05, 0.06, 0.04); two wings (∓0.08, 0.38, −0.345) size (0.10, 0.10, 0.03) — all BOWTIE |
| **Sweater** | body | `root` | 100 | `IMG_8789` | Six alternating horizontal bands wrapping the body, each (0, 0.22, z) size (0.47, 0.33, 0.09) for z from −0.22 to +0.28 in steps of 0.10 — alternating SWEATER_RED / SWEATER_WHITE. Renders slightly larger than `body` so it reads as worn over the fur |

Unlocks are permanent, paid from the **lifetime** `charlie.ballsTotal` (buying does not spend it — it is a threshold, not a wallet, so a good run is never punished). Equipped slots persist in `charlie.accessory` as `{head, neck, body}`.

Accessories are visible on the title screen, during play, and on the game-over card. They are cosmetic only and must not affect hitboxes.

### 4.3 Tennis ball

3×3×3 cube lattice with the 8 corners omitted (19 cubes), merged, scaled to `BALL_DIAMETER` — BALL. Plus 8 small BALL_SEAM cubes forming a ring around the equator. **Geometry built once at startup and shared by every ball**, including the one in Charlie's mouth.

---

## 5. Mechanics

### 5.1 Hop
Horizontal lerp; vertical `sin(π·t)·HOP_HEIGHT`. Landing squash for `SQUASH_TIME`. Facing snaps to the direction of travel on hop start. Up to `INPUT_BUFFER` moves queue so rapid taps chain smoothly.

### 5.2 Ear and tail animation
- **Ears**: rotate about local X by `clamp(-0.55 · dY/dt, -0.9, 0.9)` plus a damped spring (ω 18, ζ 0.35), so they lift on the rise and trail on the fall. Small outward Z-roll proportional to lateral velocity.
- **Tail**: continuous sine wag — 6 Hz / 0.25 rad idle, 14 Hz / 0.50 rad while celebrating. It never fully stops.
- **Idle attitude**: after 1.2 s without input, Charlie does the cocker head-tilt — `head.rotation.z` to ±0.35 rad over 0.25 s, held, alternating sides on each repeat, with the tongue showing. It cancels the instant a move is queued. This is the main carrier of his personality during the dead time before the player commits to a gap, and it doubles as a readable tell that the eagle timer is running.

### 5.3 Movement rules
Blocked by trees, rocks, field bounds, and moving back past the camera's trailing row. Moving *onto* a road or river is always permitted; death resolves on landing.

### 5.4 Tennis balls and the celebration — **cosmetic only**

Balls bounce in place: `y = r + BALL_BOUNCE_HEIGHT · |sin(2π·t / BALL_BOUNCE_PERIOD)|`, squashing (y 0.75, xz 1.15) for 0.08 s around ground contact, spinning at `BALL_SPIN`, casting a real shadow. Each ball gets a random phase offset.

Pickup when `distance(charlie, ball) < BALL_PICKUP_RADIUS`, tested every frame against the interpolated position. On pickup: increment `ballsThisRun` and the persisted total, play the ding + bark, emit `CELEBRATE_SPARKS` sparkles, show the ball in Charlie's mouth, and start the celebration.

**The celebration is a purely visual layer and must never block, delay, or redirect input.**
- `root.rotation.y` gains a full 2π over `CELEBRATE_DURATION`, eased `easeOutCubic`, applied *on top of* the facing rotation.
- `+CELEBRATE_LIFT` extra height via a `sin(π·t)` bump added to the hop arc.
- Ears flare outward (Z-roll ±0.7 rad), tail wags fast, tongue shows.
- The logical position, hop state machine, collision and input queue are **untouched**. Hopping during a celebration blends the spin out over 0.1 s.

Rationale: taking control away mid-road would get the player killed through no fault of their own. Crossy Road never does this, and neither do we.

### 5.5 Collision
Per-frame AABB against Charlie's **interpolated** position, not just the destination tile — a car sweeping through mid-hop kills. **A vehicle's position is its centre, and the renderer and the hitbox read the same field.** (v1's bug #1 was two conflicting conventions; this is fixed by construction.)

### 5.6 Log riding
On landing in a river row, test Charlie's X against every platform span. Hit → attach; he then drifts at the platform's velocity at a **fractional X**. Miss → drown. Subsequent hops move ±1 tile *from the fractional position*, preserving the offset. Drifting past a field bound is death.

### 5.7 Trains
Per rail group: `idle → warning (red flash + ding) → sweep → cooldown`, using §3.5 timings. Standing on a track during the sweep is death.

### 5.8 Deaths
`squashed` (flatten to y-scale 0.15), `drowned` (sink + splash particles), `trainHit` (launch + spin), `eagle` (grab + lift off-screen). Each holds for 0.9 s with the camera easing in, then the game-over card.

### 5.9 Score and persistence
Score = highest row reached, 1 point per row, never decrements.

`storage.js` wraps `localStorage` in try/catch with an in-memory fallback (private browsing must not throw). Keys:
```
charlie.highScore   number
charlie.ballsTotal  number
charlie.muted       boolean
charlie.plays       number
charlie.accessory   {head,neck,body} equipped slots, each string|null
charlie.unlocked    string[]  ids of purchased accessories
```
High score is shown on the title screen, as `BEST n` under the live score during play, and on the game-over card — with a `NEW BEST!` celebration when beaten.

---

## 6. World generation — fairness guarantees

These are **invariants**, machine-checked in `tests/run.js`:

1. Rows `0 … START_SAFE_ROWS-1` are grass with no obstacles.
2. No more than `maxHazardRun(score)` consecutive hazard rows without a grass row.
3. Every road lane has at least one gap ≥ `max(2.5, vehicleGapMin)` tiles.
4. Every river row has platforms with no gap exceeding `RIVER_MAX_PLATFORM_GAP`.
5. Every grass row leaves ≥ 2 free columns; no obstacle at `x = 0` on a row within 2 of the start.
6. Vehicles within a lane never overlap, and wrap without overlapping (v1's bug #4).

Generation is driven by a seeded `mulberry32`. `?seed=N` in the URL reproduces a run exactly.

---

## 7. Input

- **Keyboard**: `↑/W` forward, `↓/S` back, `←/A` left, `→/D` right. `Space`/`Enter` start and restart. `Esc`/`P` pause. `M` mute.
- **Touch**: tap = forward; swipe ≥ 24 px = that direction. Tap-to-restart on game over.
- `preventDefault` on arrows and space so the page never scrolls.
- Input is ignored while dying; the buffer is cleared on death and on restart.

---

## 8. Audio — WebAudio, synthesised, zero asset files

`hop` (short square blip, pitch rising with consecutive hops) · `ballPickup` (two-tone ding) · `bark` (filtered noise burst + pitch envelope) · `squash` (low thud) · `splash` (noise with a downward sweep) · `trainHorn` (two detuned saws) · `signalDing` · `eagleScreech` (descending saw with vibrato) · `newBest` (short arpeggio).

`AudioContext` is created lazily on the first user gesture (autoplay policy). Mute persists.

---

## 9. Performance

- Merged geometries, shared materials, row pooling and recycling (§2).
- Shadow map 2048 desktop / 1024 mobile; the shadow camera is a tight ortho box following the camera target.
- `devicePixelRatio` clamped to 2.
- Target: ≥50 fps desktop, ≥30 fps on a mid-range phone, ≤120 draw calls in a typical frame.

---

## 9a. Debug harness — required, and load-bearing for verification

`?debug=1` overlays fps, draw calls, row types and hitboxes, **and exposes a control surface on `window.__game`:**

```js
window.__game = {
  state,                  // live game state (read/write)
  step(dt),               // advance the simulation by dt seconds, ONE fixed tick,
                          // independent of requestAnimationFrame
  steps(n, dt = 1/60),    // advance n fixed ticks
  input(dir),             // queue a move: 'up' | 'down' | 'left' | 'right'
  reset(seed),            // restart deterministically from a seed
  stats(),                // { fps, drawCalls, rows, entities }
  errors                  // array of everything caught by window.onerror
}
```

**Why this is mandatory rather than nice-to-have.** A browser tab that is not the foreground tab reports `document.visibilityState === "hidden"`, and Chrome stops firing `requestAnimationFrame` in it entirely. Screenshots of such a tab still succeed — they just show a **frozen** frame. Verified in this session against v1: after seven `ArrowUp` presses the player had not moved and `pendingMove` sat unconsumed, purely because the tab was backgrounded.

Every time-dependent acceptance criterion — traffic movement (A6), log drift (A7), the train cycle (A8), the eagle timers (A9), auto-scroll (A10), ball bounce (A11), the celebration (A12) — would silently appear to pass while nothing was actually running. **Do not verify any of these from screenshots alone.** Drive them through `__game.steps()` and assert on `__game.state`, which works regardless of tab visibility, then use screenshots for appearance only.

The main loop must therefore route all simulation through the same fixed-step function `step(dt)` that this exposes, with `requestAnimationFrame` only deciding *when* and *how many times* to call it. That is good practice anyway — it makes the physics frame-rate independent and the whole game reproducible from a seed.

`__game` is created **only** when `?debug=1` is present, so the shipped game has no such surface.

---

## 10. Acceptance criteria

| # | Criterion | How it's verified |
|---|---|---|
| A1 | Lanes tilt ≈13° down-right; the scene reads as Crossy Road | Side-by-side with `reference/cr_s031.png` |
| A2 | Charlie is recognisably an **American cocker spaniel** — domed skull, short muzzle, long low ears, big round eyes — not a springer | Visual, against `reference/charlie/IMG_0467.jpeg` |
| A3 | Charlie reads clearly against grass **and** asphalt | Visual, on a road row |
| A4 | Ears swing on the hop; tail always wags; the idle head-tilt fires after 1.2 s | Visual |
| A5 | Hop is one tile per input, 0.16 s, with an arc and landing squash; rapid taps chain | Play |
| A6 | All four terrain types generate and behave per §5 | Play + tests |
| A7 | Logs carry Charlie at fractional X; missing one drowns him; drifting off-field kills | Play + tests |
| A8 | Trains warn with a flashing signal and a ding before sweeping | Play |
| A9 | Eagle fires on idle **and** on falling behind the camera | Play |
| A10 | Camera auto-scrolls and never stops | Play |
| A11 | Tennis balls bounce, spin, and cast a shadow | Visual |
| A12 | Collecting one triggers the spin celebration **without blocking input** | Hop mid-celebration; Charlie moves immediately |
| A13 | Charlie carries a ball in his mouth after the first pickup | Visual |
| A14 | **High score persists across a full page reload and browser restart** | Reload; `localStorage` inspected |
| A15 | `NEW BEST!` shows only when the previous best is beaten | Play |
| A16 | Balls-fetched total persists | Reload |
| A17 | `localStorage` being unavailable does not throw | Test in a private window |
| A18 | All four accessories render correctly on Charlie, unlock at their ball thresholds, equip one per slot, and persist across reload | Play + reload |
| A19 | Playable on a phone: tap + swipe, correct layout at 390×844 portrait and landscape | Device/emulator |
| A20 | All §6 invariants hold over 2,000 generated rows across 50 seeds | `node tests/run.js` |
| A21 | Zero console errors in a 90-second session; ≥50 fps desktop | `?debug=1` |
| A22 | `?debug=1` exposes `window.__game` with a working `step`/`steps`/`input`/`reset`/`stats`; stepping advances the simulation in a **backgrounded** tab | `__game.steps(60)` then assert state changed |
| A23 | Served over plain HTTP it runs with **zero** network requests beyond the origin — no CDN, no fonts, no analytics | DevTools Network, via any static server |
| A24 | v1 preserved at `v1/index.html` and still opens | Open it |

---

## 11. Task list

### Block 0 — Foundation and camera (0:00–0:20)
- [x] Move v1: `git mv index.html v1/index.html` (and `index.backup.html` alongside it). Repo, `.gitignore` and README already exist
- [x] `package.json`, `.nojekyll`, `index.html` with importmap, `styles.css`
- [x] Vendor `three.module.js` r186 into `vendor/`
- [x] `config.js`, `palette.js`
- [x] `scene.js`: renderer, ortho camera rig (§3.1), ambient + directional light, shadow frustum, resize
- [x] Fixed-step main loop: all simulation through `step(dt)`; rAF only decides when and how many times to call it
- [x] `?debug=1` harness exposing `window.__game` per §9a (A22) — build it now; every later time-dependent criterion depends on it
- [x] One grass row + placeholder cube; **verify A1 against the reference** — do not proceed until it matches
- [x] Commit

### Block 1 — Charlie and hop feel (0:20–0:55)
- [x] `voxel.js` `buildVoxelMesh` with per-colour merging and caching
- [x] `models/charlie.js` per §4.1
- [x] `player.js` hop state machine, arc, squash, facing, input buffer
- [x] Ear spring + tail wag (§5.2)
- [x] `input.js` keyboard + touch
- [x] `camera.js` follow damping + auto-scroll
- [x] Field bounds; A2, A3, A4, A5
- [x] Commit

### Block 2 — World, grass, roads — **SAFETY CHECKPOINT** (0:55–1:35)
- [x] `rules/rng.js`, `rules/difficulty.js`, `rules/worldgen.js`
- [x] `world.js` row pool + recycling
- [x] `rows/grass.js`; `models/{tree,rock}.js`
- [x] `rows/road.js`; `models/{car,truck,bus}.js`; `hazards.js` traffic
- [x] `rules/collide.js` + squash death
- [x] Score HUD + `BEST`
- [x] `tests/run.js` covering invariants 1, 2, 3, 5, 6
- [x] Commit — **the game must be playable end to end here**

### Block 3 — River (1:35–2:05)
- [x] `rows/river.js`; `models/{log,lilypad}.js`
- [x] Log drift, attachment, fractional X, off-field death
- [x] Drown death + splash particles
- [x] Tests: invariant 4, attachment maths; A7
- [x] Commit

### Block 4 — Rail and eagle (2:05–2:30)
- [x] `rows/rail.js`; `models/{train,signal}.js`; warning cycle
- [x] `eagle.js`: both triggers, warning shadow, swoop, grab
- [x] `rules/eagle.js` + tests; A8, A9, A10
- [x] Commit

### Block 5 — Tennis balls, audio, persistence (2:30–3:00)
- [x] `models/ball.js` shared geometry (§4.3)
- [x] `balls.js`: spawn, bounce, spin, shadow, pickup
- [x] Celebration spin per §5.4 — **cosmetic only**
- [x] Ball in mouth; `particles.js` sparkles
- [x] `audio.js` full SFX set
- [x] `storage.js` with fallback; high score + balls total wired through
- [x] A11–A17
- [x] Commit

### Block 6 — UI shell (3:00–3:35)
- [x] Title screen: Charlie on grass, best score, balls fetched, start prompt
- [x] Pause, mute, game-over card with score / `BEST` / `NEW BEST!` / restart
- [x] Death camera beat (§5.8)
- [x] `models/accessories.js`: bandana, sunglasses, bow tie, sweater (§4.2)
- [x] Accessory picker on the title screen: 3 slots, lock state + ball cost, persisted (A18)
- [x] Commit

### Block 7 — Polish, perf, ship prep (3:35–4:00)
- [ ] Particle polish; tyre smoke; feathers→fur puff
- [ ] Perf pass to §9 targets; quality toggle
- [ ] Mobile test 390×844 portrait + landscape (A19)
- [ ] `node tests/run.js` green (A20)
- [ ] 90-second clean session (A21), harness check (A22), local server check (A23), v1 check (A24)
- [ ] README, milestone screenshots for `development_log.docx`, prompt log updated
- [ ] Final commit and `git push origin rebuild` — **do not merge to `main`, do not make the repo public, do not enable Pages**

---

## 12. Out of scope

Multiple playable characters, the coin gacha, extra world themes, daily challenges, leaderboards, multiplayer, and any server component.
