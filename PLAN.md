# Charlie Road — 4-Hour Rebuild Plan

**Goal:** a faithful, polished *Crossy Road* replica starring Charlie — an American cocker spaniel with attitude who lives for chasing tennis balls, wherever that may take him — running as a static site on GitHub Pages with no build step.

**Status:** planning only. Nothing has been built yet.
**Authoritative build document:** [`SPEC.md`](SPEC.md). This file holds the research and rationale behind it.

---

## 1. What we learned from v1 (the 30-minute build)

`index.html` (v1) is ~430 lines of vanilla canvas-2D. It works, and the spec discipline in `.kiro/specs/` is worth keeping. But five of the seven prompts in `kiro_prompt_log.md` were spent fighting the same two problems — **the isometric projection** and **painter's-algorithm depth sorting** — and neither is fixable inside a canvas-2D approach.

### Keep

| Thing | Why |
|---|---|
| Row-based world model (`rows[]` indexed by row number) | Correct abstraction; carries over unchanged |
| Lookahead generation (`ensureRowsAhead`) | Right idea, just needs recycling on the other end |
| Delta-time movement + 100 ms `dt` clamp | Correct and necessary |
| "No more than N consecutive hazard rows" | Core fairness guarantee; will be extended |
| The requirements/design/tasks habit | Good process artifact for the course |

### Discard

| Thing | Why |
|---|---|
| `isoX`/`isoY` + `drawIsoCube` + the `drawables` sort array | Fake 3D. Cannot produce real occlusion, shadows, or hop arcs |
| Sorting by `col + row` | **Structurally broken.** A vehicle spans 1.2–1.6 columns but gets one scalar sort key, so it sorts as a point. That *is* the "car pixels are covered up weirdly" bug from prompt 7 — never fixed, only made rarer |
| Instant teleport movement | No hop = no game feel |
| Fixed 900×700 canvas | Not responsive; unplayable on a phone |

### Real bugs in v1 worth naming (so we don't reproduce them)

1. **Vehicle position means two different things.** `drawVehicleIso` treats `v.col` as the *left edge*; `checkCollision` treats it as the *centre* (`Math.abs(v.col - playerCol) < v.size * 0.6`). Hitboxes sit half a car off the sprites.
2. **Collision ignores the depth axis** — only X distance is tested, regardless of hop progress.
3. **`resetGame()` sets `lastTime = 0`** mid-session, so the first frame after a restart eats the full 100 ms clamp and every vehicle jumps.
4. **Vehicle spawn can wrap onto itself.** The loop runs `col` to `COLS + 4` while `wrapWidth = COLS + 8`, so the last car can be placed on top of the first.
5. No pause, no high score, no persistence, no audio, no touch input.

**Verdict: rewrite the renderer, port the world model.**

---

## 2. What the real game actually does

Sources: App Store listing, five high-res gameplay screenshots (`reference/cr_*.png`), the Crossy Road wiki, the BlueStacks mechanics guide.

### Terrain types

| Type | Contents | Death |
|---|---|---|
| **Grass** | Alternating light/dark green bands, voxel trees (3 heights), rocks | — (trees block movement) |
| **Road** | 1–4 adjacent lanes; cars, 2-tile trucks, buses. Per-lane direction and speed | Squashed |
| **Railway** | 1–3 tracks sharing one crossing signal; trains sweep the field very fast | Launched |
| **River** | Logs (2–3 tiles) and lily pads drifting; you *ride* them | Drowned |

### The two pressure mechanics (this is what makes it Crossy Road and not Frogger)

1. **The camera auto-scrolls forward** and never stops. You are always being pushed.
2. **The eagle**, triggered by idling ~5 s *or* falling behind the camera's trailing edge. The idle window shrinks as your score climbs. Any move — including a sidestep — resets it.

Both are absent from v1, and they're the difference between "a Frogger clone" and "Crossy Road."

### Visual style — measured, not guessed

The camera is **orthographic with a shallow yaw**, not textbook 45° isometric. Measuring long edges — logs, rails, road bands — across three screenshots, the lane axis tilts **≈13° down to the right**, consistently.

Solving `tan(yaw) · sin(pitch) = tan(13°)`:

> **pitch ≈ 57° above horizon, yaw ≈ 15°**

Cross-check: predicted row-band thickness ÷ tile width = `sin(pitch)/cos²(yaw)` ≈ 0.93, matching the screenshots (~120 px bands at ~130 px tiles). A stock isometric camera would sit at 30° and look visibly wrong. This is the highest-fidelity risk, so it gets built and eyeballed first.

### Palette — sampled from the screenshots

```
Sky #72D8FF · Grass #6E9E30 / #557D27 · Bush #6C8B57 / #425438
Asphalt #50506B · Markings #E3E0FF · Water #5BA8E1 · Log #625052 + #7C9B5D moss
Ballast #404754 · Sleepers #703939 · Sand #E5A967 · Vehicle white #D8EAFF
```

---

## 3. Charlie

Reference photos in `reference/charlie/`. **American cocker spaniel, liver and white.**

**Who he is:** a fun-loving dog with attitude who lives for chasing tennis balls, wherever that may take him. That last clause is the entire game design. He is not crossing eight lanes of traffic because he has weighed the risk — he's crossing because there's a ball over there. The player is not steering a cautious animal; they're barely keeping up with an enthusiastic one.

That has to show in how he moves, not just in the README: a tail that never stops, a cocky head-tilt when he's kept waiting at a kerb, and a celebration that is frankly disproportionate to one tennis ball.

**Cocker, not springer** — the distinction drives real geometry, and getting it wrong is the most likely way he ends up looking like a generic dog:

| | Cocker (Charlie) | Springer |
|---|---|---|
| Skull | Domed, rounded, tall | Flatter |
| Muzzle | **Short, with a pronounced stop** | Long |
| Ears | Long, **low-set**, heavily feathered | Shorter, set higher |
| Eyes | Large, round, prominent | Smaller, more almond |
| Body | Compact, short-backed, feathered skirt | Longer, leggier |

The short muzzle and low ear-set are the two that matter most at ~40 px. Full box geometry is in SPEC §4.1.

The features that have to read at that size:

1. **Long low droopy brown ears** — his signature, and a gift for animation. They swing on the hop arc and flare on the celebration spin.
2. **Domed skull and short muzzle**, with a **white blaze** up the centre splitting the brown.
3. **Mostly white body** with a **brown saddle patch** across the back.
4. **Big round eyes** — most of the "attitude" lives here.
5. **Short tail** that wags constantly, faster on a pickup.
6. **Pink tongue**, out when he's excited or bored.
7. **He already carries a tennis ball in his mouth** in the figurine photo, so that's canon: Charlie holds a ball once he's fetched one.

Stylised palette (saturated up from the photos — Crossy Road's palette is flat and punchy, and the photos are shot in shade):

```
Liver mid #6E4026 · Liver dark #5A3520 · Liver light #8B5A38
Fur white #F7F3EA · Fur shadow #D8D0C2 · Nose #3D2A1E
Eye #2A1C12 · Tongue #E8899B · Collar #4A5560 · Tag #E8B93C
Tennis ball #D9E534 · Seam #F5F7EC
```

**One concern worth raising up front.** Crossy Road's chicken is bright white-and-yellow against green and grey — enormous contrast. Charlie is brown-and-white, and the brown sits uncomfortably close to the asphalt (`#50506B`) and the log brown (`#625052`) in value. Mitigations, in order of preference:

1. Push his white to `#F7F3EA` (brighter than the vehicle white) so the body always pops, and keep the brown for head/ears/saddle only.
2. A hard, high-contrast drop shadow directly under him — already in the renderer.
3. If it still doesn't read, a classic toon outline (a scaled-up backface-rendered black shell). Cheap, one extra mesh, and very much in the voxel-game idiom.

I'll build 1 and 2, check it against a road row, and add 3 only if needed.

---

## 4. Technical decision: three.js, vendored, no build step

**three.js r186 (`0.186.0`), `three.module.js` committed to `vendor/`, loaded through an `<script type="importmap">`.**

Why this over more canvas-2D:

- The entire depth-sorting bug class **disappears** into the GPU depth buffer.
- Real shadows — the crisp offset drop shadows are a signature of the look, and they're free with one `DirectionalLight`.
- Hop arcs, ear swing, squash-and-stretch, camera damping, and death animations become transform work instead of bespoke maths.

Why vendoring over a CDN: 384 KB minified (~95 KB gzipped), no runtime network dependency, works offline, and it preserves the spirit of v1's "no external requests" rule. Still **zero build tooling** — no npm install, no bundler, no transpile.

**Two tradeoffs to be explicit about:**

- ES modules are CORS-blocked over `file://`, so double-clicking the HTML stops working and local preview needs any static server (`python3 -m http.server 8000`). **GitHub Pages is entirely unaffected** — it serves over HTTPS, which is all modules require, so hosting still needs no server process, no build and no config beyond `.nojekyll`. The cost is one command during development, nothing in production.
- A `package.json` containing only `{"type":"module"}` is needed so plain `node` can run the unit tests. **No dependencies, nothing to install** — it does not make this an npm project and does not affect Pages.

### One architectural idea worth calling out

All voxel models are built by a shared `buildVoxelMesh(boxes)` that **merges every box of the same colour into a single `BufferGeometry`**. A car becomes ~4 draw calls instead of ~30; a tennis ball becomes 2 instead of 20. Animated parts (Charlie's ears, his tail, his head) each get their own merged group so they can still move. This is what makes a scene full of cars, trees, logs and balls stay at 60 fps on a phone.

### Testability

Game *rules* live in `src/rules/*.js` as **pure functions with no three.js and no DOM import** — world generation, the difficulty curve, collision maths, log attachment, the eagle timer. `tests/run.js` runs them under plain `node`, no dependencies, exits nonzero on failure. A seeded PRNG (`mulberry32`) makes world generation deterministic, which also gives us a `?seed=` debug URL.

This matters more than usual here: during a long autonomous run there's no human watching, so the fairness guarantees need to be *machine-checked*, not eyeballed.

---

## 5. Schedule — eight blocks

Ordered riskiest-first. **Block 2 is the safety checkpoint**: if everything after it goes wrong, there's still a real, complete game.

| # | Time | Work | Milestone |
|---|---|---|---|
| **0** | 0:00–0:20 | `git init`, v1 → `v1/`, module skeleton, vendor three.js, `.nojekyll`, `package.json`. Renderer, ortho camera at 57°/15°, lights, shadow rig, resize. One grass row + a placeholder cube. | **The camera reads as Crossy Road** — compared side by side with `reference/cr_*.png` |
| **1** | 0:20–0:55 | `buildVoxelMesh`. Charlie: body, head, ears, tail, collar. Hop state machine, arc, squash, ear swing, tail wag, facing, input buffering. Keyboard + touch. Camera follow + auto-scroll. Field bounds. | **Hopping Charlie feels great** |
| **2** | 0:55–1:35 | Row pool + recycler, seeded generator, difficulty curve. Grass (bands, trees, rocks). Roads, markings, car/truck/bus, directional traffic with guaranteed gaps. Collision + squash death. Score HUD. Worldgen + collision tests. | **Core game playable end to end** ← safety checkpoint |
| **3** | 1:35–2:05 | Water rows, logs, lily pads, riding at fractional X, drown + splash. River fairness tests. | Rivers work |
| **4** | 2:05–2:30 | Rail rows, signal flash, train cycle, train death. Eagle: both triggers, warning shadow, grab. | All four terrains + both pressure mechanics |
| **5** | 2:30–3:00 | **Tennis balls**: bounce, spin, pickup, **celebration spin**, carry-in-mouth, sparkles. WebAudio SFX. **High score + persistence.** | The Charlie-specific heart of the game |
| **6** | 3:00–3:35 | Title screen, pause, game-over card with `NEW BEST!`, mute, balls-fetched stat. Accessories if time (see below). | It's a complete game, not a demo |
| **7** | 3:35–4:00 | Particles, death camera beat, perf pass, mobile test at 390×844 + landscape, tests green, README, dev-log screenshots, deploy prep. | **Ship-ready** |

### What changed from the first draft

- **Dropped**: the 12-character roster and the 100-coin gacha. With Charlie as *the* character they no longer make sense, and that frees ~35 minutes for the things you actually asked for.
- **Added**: Charlie's rigged model with animated ears and tail (Block 1), and a full block for tennis balls, the celebration, audio and persistence (Block 5).
- **Replacement for the gacha, now confirmed and in scope** (Block 6): tennis balls unlock **accessories for Charlie**, all four modelled from your photos — the **red heart bandana** (`IMG_8224`), the **turquoise sunglasses** (`IMG_2100`), the **gold bow tie** (`IMG_6040`) and the **red-and-white striped sweater** (`IMG_8789`). Three slots (head / neck / body), so sunglasses + bandana + sweater can be worn at once; bow tie and bandana share the neck slot. Unlocks are thresholds against the *lifetime* ball total rather than a wallet you spend down, so a great run is never punished by leaving you poorer. Geometry and costs are in SPEC §4.2.

### Scope tiers if we run behind

- **Must** (Blocks 0–5): four terrains, hop feel, eagle, auto-scroll, tennis balls + celebration, audio, high score, mobile.
- **Should** (Block 6): full UI shell, accessories.
- **Cut first**: the sweater (most geometry, least readable at size), extra particle types, extra world themes.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| **Camera angle never quite looks right** | Built first, in Block 0, reference images open. Pitch/yaw are two constants in `config.js`; retuning is a 10-second loop |
| **Charlie reads as mud against asphalt** | Brightened white + hard drop shadow; toon outline held in reserve (§3) |
| **Log riding eats the schedule** — fractional coordinates interacting with hop, collision and bounds | Gets its own 30-minute block. If it overruns, ship grid-snapped logs (easier, slightly less faithful) and revisit in Block 7 |
| **Celebration animation gets the player killed** | Spec'd as *cosmetic only* — it never blocks input or moves the logical position (SPEC §5.4). A blocking animation on a road would be genuinely unfair |
| **Autonomous run drifts from spec** | `SPEC.md` is authoritative with machine-checkable acceptance criteria; `node tests/run.js` gates the fairness rules; a git commit at each block milestone gives rollback points |
| **`file://` stops working**, so a grader who double-clicks the file sees a blank page | The deliverable is a Pages URL, linked at the top of the README. Local preview documented with three one-line options. If opening the raw file ever becomes a hard requirement, the fallback is three.js r147 (the last UMD build) loaded as a classic script — it costs the module structure and the node-testable `src/rules/` split, which is why it is not the default |
| **Mobile perf with shadows** | Merged geometries, shared materials, row recycling. Quality toggle drops the shadow map to 1024 and clamps DPR to 2. Measured in Block 7, not assumed |
| **Losing the homework paper trail** | v1 preserved at `v1/index.html`; screenshot at each block milestone for `development_log.docx`; prompt log updated as we go |

---

## 7. Deployment

Static files at repo root, `.nojekyll` present, Pages serving from `main` / root. No build, no Actions workflow, nothing to install.

**Creating the GitHub repo and pushing is human-gated** — it publishes the project publicly, and that's your call, not mine to make mid-run. The spec's definition of done stops at "verified locally and deploy-ready," with the exact commands in the README ready for you to run.

`reference/` is gitignored — those are App Store screenshots and photos of your dog, and neither belongs in a public repo.

---

## 8. Two notes on the autonomous run

**The unit tests are the safety net.** The fairness guarantees — never an uncrossable road, never an unreachable river, never a walled-off row — are exactly the things that silently rot during a long unattended run and that you'd only discover by dying unfairly. They're machine-checked.

**Visual fidelity still needs your eyes.** The Chrome extension isn't connected in this session, so I can't screenshot my own work. If you connect it (`/mcp`, or the Claude in Chrome extension), I can drive the game in a real browser, screenshot each milestone, and self-correct the camera and palette without you. That would meaningfully raise the ceiling on what an unattended run can achieve — and the screenshots would drop straight into your dev log. Worth two minutes before you start it.
