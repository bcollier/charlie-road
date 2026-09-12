# Implementation Plan: Crossy Road (Browser, Single-File)

## Overview

Implement the game as a single `index.html` file with all CSS and JavaScript inline. The tasks are sequenced so the game is playable after step 3, with collision detection, scoring, and polish added incrementally afterward.

## Tasks

- [ ] 1. Scaffold the HTML file with canvas, constants, and state
  - [ ] 1.1 Create `index.html` with inline `<style>` (body background, canvas centering), a `<canvas id="game">`, and an empty `<script>` block
    - Set `COLS`, `TILE`, `CANVAS_W`, `CANVAS_H`, `PLAYER_START_COL`, `VEHICLE_W`, `VEHICLE_H`, `LOOKAHEAD`, `GENERATE_TRIGGER` constants
    - Set color constants: `COLOR_SAFE`, `COLOR_TRAFFIC`, `COLOR_PLAYER`, `COLOR_VEHICLE`
    - Define the `state` object with all fields from the design (`playerCol`, `playerRow`, `maxRow`, `score`, `rows`, `lastTime`, `gameOver`, `pendingMove`)
    - Obtain the 2D canvas context and size the canvas element to `CANVAS_W × CANVAS_H`
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [ ] 2. Implement world generation
  - [ ] 2.1 Write `generateRow(rowIndex)` and `ensureRowsAhead()`
    - Row 0 is always `safe`
    - Count consecutive trailing traffic rows; force `safe` if count ≥ 3
    - Otherwise pick `traffic` with 70% probability, `safe` with 30%
    - For traffic rows: random direction (±1), speed uniform in [2, 8], vehicles spaced at least `VEHICLE_W + 2*TILE` apart with random jitter
    - `ensureRowsAhead()` generates rows until `state.rows.length > state.playerRow + LOOKAHEAD`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test for world generation (Property 4 & 5)
    - **Property 4: World always has sufficient lookahead** — after `ensureRowsAhead()`, `state.rows.length >= state.playerRow + LOOKAHEAD`
    - **Property 5: No run of more than 3 consecutive traffic rows**
    - **Validates: Requirements 5.3, 5.4**

- [ ] 3. Implement input handling, player movement, rendering, and the game loop (makes the game playable)
  - [ ] 3.1 Write the `keydown` listener that sets `state.pendingMove`
    - Map ArrowUp/W, ArrowDown/S, ArrowLeft/A, ArrowRight/D to `{ dr, dc }` deltas
    - Call `e.preventDefault()` to suppress page scroll
    - Ignore input when `state.gameOver` is true
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Write `handleInput()` and `updateScore()`
    - Consume `state.pendingMove` once per frame; clamp column to [0, COLS-1]; prevent moving below camera bottom
    - `updateScore()`: update `state.maxRow` and `state.score` when player reaches a new max row
    - _Requirements: 3.1–3.7, 8.1, 8.2, 8.3_

  - [ ] 3.3 Write `cameraOffsetY()` and `draw()`
    - `cameraOffsetY()` computes the stateless pixel offset so the player tile is vertically centered
    - `draw()` clears canvas, iterates visible rows to fill row backgrounds, draws player rectangle, draws score HUD text (top-left, white, bold)
    - Skip rows outside `[-TILE, CANVAS_H]` for efficiency
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 4.1, 4.2, 8.4_

  - [ ] 3.4 Write `tick(timestamp)` and bootstrap with `requestAnimationFrame`
    - Clamp `dt` to 100ms; call `ensureRowsAhead()`, `handleInput()`, `draw()` each frame (vehicles/collision skipped until task 4)
    - Call `ensureRowsAhead()` + `requestAnimationFrame(tick)` at init to start the loop
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 3.5 Write property tests for movement and camera (Properties 1, 2, 3)
    - **Property 1: Movement changes position by exactly one tile**
    - **Property 2: Game over suppresses movement**
    - **Property 3: Camera always centers the player** — drawn player y equals `CANVAS_H/2 - TILE/2`
    - **Validates: Requirements 3.1–3.5, 4.1, 4.2**

- [ ] 4. Checkpoint — game should be playable (player moves, world scrolls, score increments)
  - Ensure rows generate, camera follows player, score counts up. Ask the user if questions arise.

- [ ] 5. Implement vehicle movement and rendering
  - [ ] 5.1 Write `moveVehicles(dt)` and add vehicle drawing to `draw()`
    - Update each vehicle's `x` by `direction * speed * TILE * (dt/1000)` pixels
    - Wrap: if `v.x > CANVAS_W + VEHICLE_W` subtract `wrapWidth`; if `v.x < -VEHICLE_W` add `wrapWidth` (where `wrapWidth = CANVAS_W + VEHICLE_W * 2`)
    - In `draw()`, for each visible traffic row draw each vehicle as a `COLOR_VEHICLE` rectangle sized `VEHICLE_W × VEHICLE_H`, vertically centered in the row
    - Wire `moveVehicles(dt)` into `tick()` (guard with `!state.gameOver`)
    - _Requirements: 2.4, 6.1, 6.2, 6.3_

  - [ ]* 5.2 Write property tests for vehicle physics (Properties 6, 7, 8)
    - **Property 6: Traffic row attributes are within valid ranges** (speed ∈ [2,8], direction ∈ {-1,1}, vehicle gaps ≥ 2 tiles)
    - **Property 7: Vehicle position update is proportional to delta-time**
    - **Property 8: Vehicle wrapping preserves row membership**
    - **Validates: Requirements 5.5, 6.1, 6.2, 6.3**

- [ ] 6. Implement collision detection and game-over overlay
  - [ ] 6.1 Write `checkCollision()` and wire it into `tick()`
    - Check only the player's current row; skip if row is `safe`
    - Overlap formula: `overlapX = max(0, min(px+TILE, v.x+VEHICLE_W) - max(px, v.x))`, `overlapY = min(TILE, VEHICLE_H)`; set `state.gameOver = true` if `overlapX * overlapY > 0.5 * TILE * TILE`
    - _Requirements: 7.1, 7.2_

  - [ ] 6.2 Write `drawGameOverOverlay()` and `resetGame()`
    - Overlay: semi-transparent `rgba(0,0,0,0.6)` rect; centered white text for "GAME OVER", "Score: N", and "[ R ] Restart"
    - `resetGame()` restores all state fields to initial values and calls `ensureRowsAhead()`
    - Wire overlay into `draw()`; add `r`/`Enter` keyboard handler and canvas click handler to call `resetGame()` when `state.gameOver`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 6.3 Write property tests for collision and reset (Properties 9, 11, 12)
    - **Property 9: Overlap calculation correctly classifies collisions**
    - **Property 11: Delta-time is clamped to 100ms**
    - **Property 12: Reset produces a canonical initial state**
    - **Validates: Requirements 7.1, 9.5, 10.3_

  - [ ]* 6.4 Write property test for score monotonicity (Property 10)
    - **Property 10: Score is monotonically non-decreasing and equals max row reached**
    - **Validates: Requirements 8.2, 8.3**

- [ ] 7. Final checkpoint — full game playable with collision, scoring, and restart
  - Verify vehicles move, collision triggers game over, overlay appears, R/click restarts cleanly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The game is fully playable after completing tasks 1–4 (no vehicles yet, but movement and scrolling work)
- Vehicles and collision detection are added in tasks 5–6
- All property tests reference specific properties from the design document's "Correctness Properties" section
- The single-file constraint means there is no module bundler — all code runs in one `<script>` tag in global scope

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4"] }
  ]
}
```
