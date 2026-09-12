# Decisions

Calls made during the build where the spec was silent, ambiguous, or wrong.
One line of reasoning each. Newest at the bottom.

## Block 0

1. **three.js r186 needs two vendored files, not one.** `three.module.js` imports from a sibling `three.core.js` since the build was split; both are committed verbatim (~420 KB gzipped together). The npm package ships no minified module build, so unminified is the only option.
2. **`VIEW_TILES_X` is 6.5, not the spec's 11.** At 11 tiles across, a phone in portrait would show ~29 rows and Charlie would be a speck. The reference phone screenshot shows ~6.4 tiles across; 6.5 reproduces that, and the `MIN_VIEW_Z` clamp still widens landscape/desktop to ~12 tiles as the spec intended.
3. **Frame dt is split into substeps of ≤1/60 s rather than a fixed accumulator.** Same determinism for the harness (which passes explicit dt), same bounded step size for collision safety, but smooth on 120 Hz displays without render interpolation.
4. **Camera pitch stays at 57°.** Measured projection matches the derivation exactly (12.67° lane tilt, 0.899 row/tile ratio). The reference's hand-measured ~13° / ~0.93 cannot distinguish 57° from 60° at that precision; re-judge subjectively once real content exists in Block 2. One constant to change if so.
5. **Player screen position will be a fraction of the frustum, not a fixed row lead.** `CAM.LEAD = 1.5` rows puts Charlie near centre in portrait; the real game sits him ~65% down so more world is visible ahead. Implemented in `camera.js` (Block 1) as a screen-fraction so it holds across aspects.

## Block 1

6. **Ears splay outward by a base 0.22 rad and carry a top ledge past the skull.** With the spec's flush, vertical ears the camera — which looks down from behind — saw a plain brown cube; the ears merged into the head entirely. The cocker silhouette is the ears, so they now read from above. Animation adds to the base splay rather than replacing it.
7. **Idle attitude includes a look back over the right shoulder (−115°), not just the head-tilt.** From behind, a tilt alone barely registers. The turn shows his face — the only time the player sees it during play — and only the right shoulder works: the camera sits at +X/+Z, and that turn's face normal dots 0.35 with the view direction versus 0.09 for the left. Tilt still alternates sides every 2.2 s; the turn direction is fixed.
8. **Tail tip is LIVER_LIGHT.** A single-colour tail vanished against the saddle from above; a lighter cap reads as a wagging thing.
9. **A2 at gameplay scale is judged on silhouette, not muzzle length.** Breed-specific cues (domed skull, short muzzle, round eyes) are built per spec but only resolve in profile or close-up. The full-face test happens on the title/game-over screens in Block 6, where he is larger and facing the viewer.
10. **Player screen position: 30% of half-height below centre** (`PLAYER_SCREEN_FRAC`), ≈65% down the screen, holding across aspects. Auto-scroll starts 1.0 s after the first hop and the frontier never lags more than 2 rows behind him.

## Block 2

11. **Hazard-run cap is judged at the row where the run began.** First test run caught the generator extending a run whenever the row index crossed a difficulty threshold mid-run (2→3 at row 100, 3→4 at 200). A player entering a run at score 99 was promised ≤2 rows; crossing 100 must not stretch it. Generator now tracks `runStart`.
12. **Vehicle and platform positions are pure functions of time** — `x = wrap(x0 + dir·speed·t)` — rather than accumulated per frame. No drift, exact reproducibility from a seed, and collision can be evaluated at any instant. Same field feeds the renderer and the hitbox, which is v1's bug #1 fixed by construction.
13. **Every static thing in a grass row is merged into one mesh per colour.** Separate tree meshes cost ~45 draw calls per visible row; merged it is ~5. Not cached by name since each row's layout is unique; geometry is disposed on recycle.
14. **Vehicles are capped at four colours each** (body, white, glass, tyre): headlights are white, tail lights dropped, truck chassis is tyre-black. Each colour is a draw call; two lights cost as much as the whole car.
15. **Rows are hidden outside the frustum band explicitly.** A merged 25-tile row has a bounding sphere that never leaves the frustum, so three.js would draw every generated row, twice with the shadow pass. Visibility is set from the camera's row span each step. Typical draw calls now 104–151 (was 498–649).
16. **Vehicle traffic lives in `rows/road.js`, not a separate `hazards.js`.** Each row owns its movers and exposes them; the spec's `hazards.js` would have been a pass-through.
17. **River and rail rows are coloured placeholder slabs until Blocks 3–4**, walkable and harmless, so the checkpoint is playable end to end with the real generator.
18. **Camera pitch re-judged with real content: stays 57°.** Side by side with `reference/cr_s031.png`, the tilt, row proportions, vehicle-to-lane fit and shading pattern all match. Not worth a second constant.

## Block 3

19. **Landing on water keeps the fractional x; landing on ground snaps to the grid.** The spec says hops preserve the log's offset, which is right between river rows, but carrying a fractional x onto grass would leave Charlie standing between tiles and break obstacle checks. The destination row's type decides.
20. **Off-field on a log is ±0.6 past the last column**, so he visibly rides past the bank before dying rather than dying at the edge.
21. **Drown splash particles are deferred to Block 5** with the particle system; the sink animation (0.8 tiles down with a wobble) is in now. The task is ticked for the death; the splash lands with `particles.js`.
22. **Platform bob is cosmetic.** Logs bob ±0.015 on a sine; Charlie's height does not follow it, since he's carried by x only. Invisible at gameplay scale and keeps the physics one-dimensional.

## Block 4

23. **Crossing signals sit at x=±3.5 on the row seam, not at the field edge.** At x=6.5 the signal was outside the field and, in portrait — where the camera clamps to ±2.75 and shows ±3.25 tiles — never in frame at all. The warning is the whole point of the signal. Flanking the middle lanes keeps one in view from any x; they sit between tiles so nothing walks through them.
24. **The eagle warning is cancellable.** The shadow appears for the last 0.8 s of the idle window (at idleLimit − 0.8) and any move clears it; the eagle commits only at idleLimit. Spec §3.6 reads as warning-then-commit with no escape, but an uncancellable 0.8 s after the limit is 0.8 s of "already dead". The behind-camera trigger uses the same window and cancels if he catches up.
25. **Bumping into an obstacle resets the idle timer.** The wiki says sidestepping on the spot keeps the eagle away; a blocked hop is the same intent. Lenient rather than punishing.
26. **`rules/eagle.js` is folded into `rules/difficulty.js` as `idleLimit()`.** It is one piecewise-linear function of score; a separate module was a file for a function. Tested there.
27. **Train cycle is deterministic in t** — warn → sweep → cooldown from the row's phase, like vehicles. The sweep covers the lane width plus the train length at 20 tiles/s (1.9 s). A train is visible ~0.8 s after the warning ends, so the tell-to-danger window is ~2.5–3 s.
28. **Death holds differ by type:** squashed 0.9, drowned 0.9, train 1.0, eagle 1.7 — the eagle needs the swoop and lift to read.

## Block 5

29. **Balls are generated by the world generator, not spawned at runtime.** The row descriptor carries `ball: {x}` (never on an obstacle column — tested), so ball placement is part of the seed and the row instantiates its own ball. Pickup is checked each step against Charlie's interpolated position over the two rows he may straddle mid-hop.
30. **Particles are one InstancedMesh.** Ninety-six pooled cubes with per-instance colour cost one draw call in total; separate meshes would have cost one each. Unused slots are parked at zero scale.
31. **The HUD counter shows the lifetime ball total; the game-over card will show this run's.** Matches Crossy Road, whose top-right coin count is the wallet, and the lifetime total is what accessory thresholds read.
32. **The crossing bell dings every 0.45 s only for rail groups within −2…+7 rows of Charlie**, and the horn sounds once per sweep as a nearby train enters. Every rail row dinging at once was a cacophony.
33. **Keyboard handling accepts both `event.code` and `event.key`.** The extension's synthetic keys, some virtual keyboards and IMEs set only one. Also learned: after a hard reload the page can lose focus and receive no key events at all — the test clicks the canvas first.
34. **Mute unlocks the AudioContext too.** Every input path calls `audio.unlock()` so the first gesture of any kind satisfies the autoplay policy.

## Block 6

35. **On the title screen Charlie faces the viewer and looks up.** Facing alone wasn't enough: at 57° pitch a vertical face is foreshortened to half height. Tipping the head back −0.6 rad points it at the camera — the cocker begging face — and is where the breed cues and the accessories actually get seen. The over-the-shoulder glance is suppressed there since he's already facing you.
36. **Title layout: logo at the top, picker at the bottom, Charlie in the clear.** A centred card covered him completely.
37. **The first tap or key on the title starts the game and counts as the first hop**, as in Crossy Road. Game over restarts straight into play; an OUTFITS button on the card goes back to the title, which is the only place the picker lives.
38. **Accessory unlocks are derived from the lifetime ball total, not stored.** `charlie.unlocked` in the spec would only ever mirror `ballsTotal >= cost`; deriving it can't drift. Equipped slots are stored as `charlie.accessory = {head, neck, body}`.
39. **Death copy is per type:** OUCH (squashed), SPLASH (drowned), CHOO CHOO (train), BIRD! (eagle).
40. **Pause freezes the simulation clock entirely** — `step()` returns before advancing time — and resets the frame timer on resume so no catch-up burst follows.
41. **Fixed: the eagle's grab point.** Direct `die('eagle')` (harness) skipped the warning that captures it; the fallback then read Charlie's position each step while also moving him, and the camera chased him to row 168. The grab point is now captured once on first use.
