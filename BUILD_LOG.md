# Build log — the four-hour rebuild

Block-by-block account of the autonomous build session, for the development log. The prompt that started it is at the bottom. Screenshots per block are in `screenshots/`; every judgement call is in `DECISIONS.md`.

The method throughout: build, then **drive the game through the `?debug=1` harness in the browser and assert on state** — a backgrounded tab freezes `requestAnimationFrame`, so a screenshot of a frozen world looks identical to a running one. Screenshots were used for appearance; numbers were used for behaviour.

---

## Block 0 — Foundation and camera

Vendored three.js r186 (two files — the build imports a sibling `three.core.js`), importmap `index.html`, config and palette modules, the scene rig with the orthographic camera at 57° pitch / 15° yaw, a fixed-step main loop, and the debug harness.

**Camera gate:** projected a unit tile onto the screen and measured 12.67° lane tilt and a 0.899 row/tile ratio — both exactly as derived from the reference screenshots. Portrait frustum verified at 7 tiles across via a CSS-constrained canvas since the window would not resize.

`screenshots/block0-camera-rig.jpg`

## Block 1 — Charlie and hop feel

Voxel builder with per-colour merging; Charlie as a rigged model — body, head group, two ear groups on damped springs, tail, tongue, mouth ball; the hop state machine with a two-move buffer; camera follow and auto-scroll.

First look showed the spec's flush vertical ears vanished into the skull from the game's behind-and-above camera. Reworked with a top ledge and outward splay so they read from above — that *is* the cocker silhouette at gameplay scale. Added the over-the-shoulder glance when idle, after computing which shoulder actually points his face at the camera.

Verified: buffer takes 2 and rejects a 3rd, arc peaks at 0.53, landing at ~10 steps, ears at −0.57 rad at the apex, celebration spins 5.33 rad at t=0.47 with ears flared ±0.92.

`screenshots/block1-*.{jpg,png}`

## Block 2 — World, grass, roads — the safety checkpoint

Pure rule modules (seeded RNG, difficulty curve, collision maths, group-based generator) and the node test suite. **First test run caught a real bug:** hazard runs were being extended whenever the row index crossed a difficulty threshold mid-run. Fixed by judging the cap at the row the run began. 127 checks pass over 50 seeds × 2,000 rows.

Draw calls went 498 → ~104–151 by merging each grass row's slab, trees and rocks into one mesh per colour, capping vehicles at four colours, and hiding rows outside the frustum band explicitly (a 25-tile row's bounding sphere never leaves the frustum on its own).

Verified: vehicles advance exactly `dir·speed` per second, a hop in front of a car dies `squashed`, `best=6` lands in `localStorage`, reset returns to a clean state, the game-over card waits the full 0.9 s.

`screenshots/block2-*.jpg`

## Block 3 — Rivers

Sunken water slab, logs with mossy tops, lily pads, all drifting as pure functions of time. On landing Charlie attaches to the platform under him or drowns; attached, he drifts at a fractional x, and later hops start from wherever the log carried him. Water-to-water hops keep the fraction; water-to-ground hops snap to the grid.

Verified on seed 7's two-row river: attach offset −0.009, drift 1.647 tiles in 1 s at speed 1.647, fractional x kept across the river-to-river hop, snapped to 1 onto grass, a gap drowns him, riding off the field kills at x=6.62 after 4.0 s.

`screenshots/block3-*.jpg`

## Block 4 — Railways and the eagle

Rail rows with a 14-tile train on a deterministic warn → sweep → cooldown cycle and crossing signals that flash while any track in the group is warning. The eagle with both triggers — idling past the score-dependent limit, or falling behind the camera — each starting a cancellable 0.8 s warning shadow.

Signals were moved from the field edge to x=±3.5 after screenshots showed the edge position is never in frame in portrait — the warning is the whole point of the signal.

Verified on seed 8: cycle timings match the descriptor to the frame, a hop onto the track dies `trainHit` launched in the train's direction, the idle warning starts at 4.2 s and a hop cancels it, standing still commits at 5.0 s, the eagle lands on him and lifts him from y=2.8 to 8.9, and the behind-camera trigger fires as `behind`.

`screenshots/block4-*.jpg`

## Block 5 — Tennis balls, audio, particles, persistence

Balls bounce on a rectified sine with a contact squash and a real shadow. Pickup starts the celebration — a full spin with flared ears, fast tail, tongue out — **layered on top of movement so it never blocks input**: a `left` hop accepted at celebrate=0.9 moved him immediately. WebAudio-synthesised SFX with no asset files; a pooled `InstancedMesh` particle system. Lifetime ball total persists and survives a reload; M toggles mute with the value stored.

Learned that the extension's synthetic keys set only `event.key`, and that after a hard reload the page can lose focus and receive no key events at all — the keyboard handler now accepts both `code` and `key`, and the tests click the canvas first.

`screenshots/block5-*.{jpg,png}`

## Block 6 — Title, pause, game-over, outfits

Title screen with the logo, best score, lifetime balls and the outfit picker; pause that freezes the clock; game-over card with death-specific copy and this run's balls. Four accessories from Charlie's photos — bandana, sunglasses, bow tie, striped sweater — across three slots, unlocked by lifetime ball thresholds, persisted.

On the title Charlie faces the viewer and looks up, which is where the cocker cues and the outfits actually get seen. Fixed the eagle's grab point drifting when the warning was skipped, which had sent the camera to row 168.

`screenshots/block6-*.{jpg,png}`

## Round two — after the first play-test

Requested after playing the live site: bark (B / button / shake) that stops traffic, a cuter pressure mechanic than the eagle (it became the squirrels' flying saucer), a bandana you can actually see, shades as the first unlock, an unlock fly-in and a dress-up at the next start, on-screen controls, and a `?enable_all_outfits=yes` flag. Plus seven of the ten suggested features — golden balls, fetch combo, zoomies, the caterpillar toy, squirrels, the day cycle, the daily challenge — and the shareable card.

Built in five commits on `features`, each verified through the harness before the next. Notable finds along the way: the squirrel was uncatchable at 7.5 tiles/s (now 5.2 with an edge bounce), the caterpillar's smile only showed in profile (now angled at the camera), the card photographed a drowned Charlie underground (now posed for the photo), and two of my own test harnesses lied to me — one held a stale player reference across `reset()`, one counted blocked inputs as hops.

`screenshots/round2-*`

## Block 7 — Verification and ship prep

See the final report and the acceptance table in `SPEC.md` §10.

---

## The goal prompt

```
Build Charlie Road to completion. SPEC.md in this repo is authoritative;
PLAN.md has the research and reasoning behind it. Read both before you
start, and re-read the relevant section of SPEC.md at the top of each
block rather than working from memory.

GOAL — you are done when all of these hold:
  1. Every task checkbox in SPEC.md §11 is ticked.
  2. Every acceptance criterion in SPEC.md §10 is verified (A1–A24).
  3. `node tests/run.js` exits 0 with zero failures.
  4. A 90-second play session: zero uncaught exceptions, zero console
     errors, >=50 fps on desktop.
  5. Deploy-ready for GitHub Pages: .nojekyll present, every path
     relative, no build step, runs correctly served over plain HTTP.
  6. All work committed and pushed to origin/rebuild.
```

(Full prompt, with the HOW TO WORK and DO NOT sections, in the session transcript.)
