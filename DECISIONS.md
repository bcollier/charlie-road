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
