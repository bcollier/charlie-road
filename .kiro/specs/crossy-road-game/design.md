# Design Document — Crossy Road (Browser, Single-File)

## Overview

A single-file static web game implemented in plain HTML, CSS, and JavaScript with no build tools or external dependencies. All rendering is done on an HTML5 Canvas using colored rectangles. The game is structured as a module-pattern script with a `requestAnimationFrame` game loop, a grid-based world model, and a procedural row generator.

Because there are no build tools, all code lives inline in one `index.html`. The architecture is deliberately flat: a handful of clearly named functions and a single mutable `state` object. No classes, no frameworks, no imports.

---

## Architecture

### File Structure

```
index.html          ← single deliverable file
  <style>           ← canvas centering, body background
  <canvas id="game">
  <script>          ← all game logic
```

### Module Layout (within `<script>`)

```
Constants           — tile size, canvas dimensions, colors, speed range, etc.
State               — single object holding all mutable game state
Input               — keydown listener; sets pending move flags
World Gen           — generateRow(), ensureRowsAhead()
Rendering           — drawWorld(), drawPlayer(), drawVehicles(), drawHUD(), drawGameOver()
Physics             — moveVehicles(dt), checkCollision()
Game Logic          — handleInput(), updateScore(), resetGame()
Game Loop           — tick(timestamp) via requestAnimationFrame
Init                — canvas setup, first world generation, loop start
```

---

## State Model

```javascript
const state = {
  // Player
  playerCol: 5,          // grid column (0-indexed, 0 = left edge)
  playerRow: 0,          // grid row (0 = start; increases going forward/up)
  maxRow: 0,             // furthest row ever reached (used for score)
  score: 0,

  // World
  rows: [],              // array of row descriptors, indexed by row number
                         // rows[i] exists once generated

  // Loop
  lastTime: 0,           // timestamp of previous frame
  gameOver: false,

  // Input
  pendingMove: null,     // { dr, dc } or null — consumed once per frame
};
```

### Row Descriptor

```javascript
{
  type: 'safe' | 'traffic',
  color: '#2d5a27' | '#555555',   // background fill color
  // traffic rows only:
  direction: 1 | -1,              // 1 = left→right, -1 = right→left
  speed: Number,                  // tiles/second, range [2, 8]
  vehicles: [
    { x: Number }                 // current pixel x-position (float)
  ]
}
```

---

## Constants

```javascript
const COLS = 11;                 // grid columns visible
const TILE = 54;                 // pixels per tile
const CANVAS_W = COLS * TILE;    // 594
const CANVAS_H = 600;            // fixed height
const PLAYER_START_COL = Math.floor(COLS / 2);  // 5
const VEHICLE_W = TILE * 1.6;    // vehicle width in pixels
const VEHICLE_H = TILE * 0.7;    // vehicle height in pixels
const LOOKAHEAD = 10;            // rows to generate ahead of player
const GENERATE_TRIGGER = 5;      // generate more when within this many rows of furthest

// Colors
const COLOR_SAFE   = '#3a7d44';
const COLOR_TRAFFIC = '#666666';
const COLOR_PLAYER  = '#f5c518';
const COLOR_VEHICLE = '#e84545';
const COLOR_ROAD_LINE = '#ffffff';
```

---

## Components

### World Generation — `generateRow(rowIndex)`

Decides the type of the new row and populates it:

1. Row 0 is always `safe`.
2. Count consecutive traffic rows at the tail of `state.rows`. If count is already 3, force `safe`.
3. Otherwise pick `traffic` with 70% probability, `safe` with 30%.
4. For traffic rows: pick direction randomly, speed uniformly in `[2, 8]`, then place vehicles by stepping across the row width in increments of at least `VEHICLE_W + 2*TILE` with a random jitter.

```javascript
function generateRow(rowIndex) { /* ... */ }
```

`ensureRowsAhead()` is called at the top of each `tick()`:

```javascript
function ensureRowsAhead() {
  const target = state.playerRow + LOOKAHEAD;
  while (state.rows.length <= target) {
    generateRow(state.rows.length);
  }
}
```

### Input — `keydown` listener

```javascript
const KEYS = {
  ArrowUp: { dr: 1, dc: 0 }, w: { dr: 1, dc: 0 },
  ArrowDown: { dr: -1, dc: 0 }, s: { dr: -1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 }, a: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 }, d: { dr: 0, dc: 1 },
};

document.addEventListener('keydown', e => {
  if (KEYS[e.key]) {
    e.preventDefault();
    state.pendingMove = KEYS[e.key];
  }
});
```

Only one move is consumed per frame (the last one registered). This gives responsive, one-tile-per-keypress movement.

### Player Movement — `handleInput()`

Called once per `tick()` before rendering:

```javascript
function handleInput() {
  if (state.gameOver || !state.pendingMove) return;
  const { dr, dc } = state.pendingMove;
  state.pendingMove = null;

  const newRow = state.playerRow + dr;
  const newCol = state.playerCol + dc;

  // Clamp col
  if (newCol < 0 || newCol >= COLS) return;

  // Prevent moving behind camera bottom (player can't be below row 0
  // relative to camera, i.e., newRow must be >= cameraBottomRow)
  const cameraBottomRow = state.playerRow - Math.floor(CANVAS_H / TILE / 2);
  if (newRow < Math.max(0, cameraBottomRow)) return;

  state.playerRow = newRow;
  state.playerCol = newCol;
  updateScore();
}
```

### Score — `updateScore()`

```javascript
function updateScore() {
  if (state.playerRow > state.maxRow) {
    state.maxRow = state.playerRow;
    state.score = state.maxRow;
  }
}
```

### Camera / Rendering

The camera offset is computed fresh each frame — no stored camera state is needed:

```javascript
function cameraOffsetY() {
  // pixel y of player tile top when player is centered vertically
  const playerPixelY = (CANVAS_H / 2) - (TILE / 2);
  // world pixel origin for row 0 top is: playerPixelY + state.playerRow * TILE
  return playerPixelY + state.playerRow * TILE;
}
```

Row `r` is drawn at canvas y = `cameraOffsetY() - r * TILE`.

### Vehicle Movement — `moveVehicles(dt)`

```javascript
function moveVehicles(dt) {
  const dtSec = dt / 1000;
  for (const row of state.rows) {
    if (row.type !== 'traffic') continue;
    const dx = row.direction * row.speed * TILE * dtSec;
    for (const v of row.vehicles) {
      v.x += dx;
      // Wrap: off right → reenter from left (with buffer), and vice versa
      const wrapWidth = CANVAS_W + VEHICLE_W * 2;
      if (v.x > CANVAS_W + VEHICLE_W) v.x -= wrapWidth;
      if (v.x < -VEHICLE_W)           v.x += wrapWidth;
    }
  }
}
```

### Collision Detection — `checkCollision()`

Player occupies pixel rect: `(playerCol * TILE, 0, TILE, TILE)` in world-tile space. Vehicles occupy their pixel rect in the same space. Per-frame overlap check on the player's current row only:

```javascript
function checkCollision() {
  const row = state.rows[state.playerRow];
  if (!row || row.type !== 'safe') {
    const px = state.playerCol * TILE;
    const py = 0; // relative within row, same for all
    for (const v of (row?.vehicles ?? [])) {
      const overlapX = Math.max(0, Math.min(px + TILE, v.x + VEHICLE_W) - Math.max(px, v.x));
      const overlapY = Math.min(TILE, VEHICLE_H); // vehicles are shorter than tile
      const overlapArea = overlapX * overlapY;
      if (overlapArea > 0.5 * TILE * TILE) {
        state.gameOver = true;
        return;
      }
    }
  }
}
```

### Rendering Pipeline — `draw()`

```javascript
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const camY = cameraOffsetY();

  // Draw rows (safe + traffic backgrounds)
  // Draw vehicles
  // Draw player
  // Draw score HUD (top-left)

  if (state.gameOver) drawGameOverOverlay();
}
```

Each row is drawn for all rows where `camY - r * TILE` is within `[-TILE, CANVAS_H]`.

### Game Over Overlay — `drawGameOverOverlay()`

Semi-transparent dark rectangle covering the canvas, then centered text:
- "GAME OVER" (large, white)
- "Score: N" (medium, white)
- "[ R ] Restart" (small, white) — also handled by keyboard listener for `r` / `Enter`

Restart is also triggered by click anywhere on the overlay.

### Reset — `resetGame()`

```javascript
function resetGame() {
  state.playerCol = PLAYER_START_COL;
  state.playerRow = 0;
  state.maxRow = 0;
  state.score = 0;
  state.rows = [];
  state.lastTime = 0;
  state.gameOver = false;
  state.pendingMove = null;
  ensureRowsAhead();
}
```

### Game Loop — `tick(timestamp)`

```javascript
function tick(timestamp) {
  let dt = timestamp - state.lastTime;
  if (dt > 100) dt = 100;          // clamp
  state.lastTime = timestamp;

  ensureRowsAhead();
  handleInput();
  if (!state.gameOver) {
    moveVehicles(dt);
    checkCollision();
  }
  draw();
  requestAnimationFrame(tick);
}
```

---

## Data Flow

```
keydown → state.pendingMove
                          ↓
tick() → ensureRowsAhead() → state.rows grows
       → handleInput()     → state.playerRow/Col updated, score updated
       → moveVehicles(dt)  → vehicle x positions updated
       → checkCollision()  → state.gameOver may become true
       → draw()            → canvas repainted
```

---

## Error Handling

- **Row access out of bounds**: `ensureRowsAhead()` always pre-generates rows before `handleInput()` and `checkCollision()` run, so `state.rows[state.playerRow]` is always defined.
- **First frame dt spike**: `state.lastTime = 0` causes a huge dt on frame 1. The 100ms clamp absorbs this — vehicles jump by at most `8 tiles/sec × 0.1sec = 0.8 tiles` on frame 1, which is imperceptible.
- **Tab switch / pause**: dt clamp handles the position jump that would otherwise occur when the tab is re-focused.
- **Boundary movement**: `handleInput()` silently ignores moves that would take the player out of bounds — no error state needed.

---

## Visual Design

| Element         | Color      | Notes                                  |
|----------------|------------|----------------------------------------|
| Safe row        | `#3a7d44`  | Dark green                             |
| Traffic row     | `#666666`  | Medium gray                            |
| Player          | `#f5c518`  | Yellow, high contrast on both row types|
| Vehicle         | `#e84545`  | Red                                    |
| Score text      | `#ffffff`  | White, 18px bold, top-left             |
| Game over BG    | `rgba(0,0,0,0.6)` | Semi-transparent overlay        |
| Game over text  | `#ffffff`  | White                                  |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Movement changes position by exactly one tile

*For any* valid player grid position and any movement direction (up, down, left, right), if the move is within bounds and the game is not over, the player's new position must differ from the old position by exactly one tile in the specified direction and zero tiles in the perpendicular direction.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 2: Game over suppresses movement

*For any* player position and any movement key, when `state.gameOver` is true, the player's position after calling `handleInput()` must equal the player's position before the call.

**Validates: Requirements 3.5**

---

### Property 3: Camera always centers the player

*For any* value of `state.playerRow`, the canvas y-coordinate at which the player tile is drawn must equal `CANVAS_H / 2 - TILE / 2` (within one pixel of integer rounding).

**Validates: Requirements 4.1, 4.2**

---

### Property 4: World always has sufficient lookahead

*For any* player row position after `ensureRowsAhead()` runs, the number of generated rows beyond the player's current row must be at least `LOOKAHEAD` (10).

**Validates: Requirements 4.3, 5.4**

---

### Property 5: No run of more than 3 consecutive traffic rows

*For any* contiguous subsequence of generated rows, the maximum length of an uninterrupted run of `type === 'traffic'` rows must be ≤ 3.

**Validates: Requirements 5.3**

---

### Property 6: Traffic row attributes are within valid ranges

*For any* generated traffic row, the `speed` field must be in the inclusive range [2, 8], the `direction` field must be either 1 or -1, and each pair of vehicles within the row must have a horizontal gap of at least 2 tiles.

**Validates: Requirements 5.5**

---

### Property 7: Vehicle position update is proportional to delta-time

*For any* vehicle with speed `s`, direction `d`, and a frame delta-time `dt` (in milliseconds), after calling `moveVehicles(dt)` the vehicle's x-position must change by exactly `d * s * TILE * (dt / 1000)` pixels (modulo wrap-around).

**Validates: Requirements 6.1, 6.3**

---

### Property 8: Vehicle wrapping preserves row membership

*For any* vehicle whose x-position after movement exceeds `CANVAS_W + VEHICLE_W`, the wrapped x-position must be less than `-VEHICLE_W + wrapWidth - CANVAS_W` (i.e., it re-enters from the opposite side within one vehicle-width of the edge). The inverse holds for vehicles crossing the left boundary.

**Validates: Requirements 6.2**

---

### Property 9: Overlap calculation correctly classifies collisions

*For any* player tile position (col, row) and any vehicle rectangle (x, width, height), the computed overlap area between the player bounding box and the vehicle bounding box must equal `max(0, min(pRight, vRight) - max(pLeft, vLeft)) * min(TILE, VEHICLE_H)`, and a collision must be detected if and only if this area exceeds `0.5 * TILE * TILE`.

**Validates: Requirements 7.1**

---

### Property 10: Score is monotonically non-decreasing and increments on new max row

*For any* sequence of player row movements, the score after each move must be ≥ the score before the move; and the score must equal the maximum row index ever reached by the player across all moves in that sequence.

**Validates: Requirements 8.2, 8.3**

---

### Property 11: Delta-time is clamped to 100ms

*For any* raw delta-time value `rawDt`, the value used for physics updates must equal `Math.min(rawDt, 100)`.

**Validates: Requirements 10.3**

---

### Property 12: Reset produces a canonical initial state

*For any* game state (any score, player position, world contents, game-over flag), calling `resetGame()` must result in `state.playerRow === 0`, `state.playerCol === PLAYER_START_COL`, `state.score === 0`, `state.maxRow === 0`, `state.gameOver === false`, and `state.rows` containing at least `LOOKAHEAD` generated rows starting from row 0.

**Validates: Requirements 9.5**
