# Requirements Document

## Introduction

A browser-based Crossy Road clone delivered as a single static HTML file with no build tools or external assets. The game renders using colored rectangles on an HTML5 Canvas element. The player navigates a character forward through rows of oncoming traffic, avoiding collisions, and accumulating a score. The game is self-contained so it can be hosted directly on GitHub Pages.

## Glossary

- **Game**: The browser application that runs the Crossy Road clone.
- **Player**: The user-controlled character represented as a colored rectangle on the grid.
- **Tile**: A single grid cell; the unit of movement and layout.
- **Row**: A horizontal strip of tiles spanning the full canvas width; the fundamental unit of world structure.
- **Safe Row**: A row containing no moving vehicles (e.g., the starting row and grass rows between traffic bands).
- **Traffic Row**: A row through which vehicles move horizontally at a fixed speed.
- **Vehicle**: A colored rectangle that moves horizontally across a Traffic Row at a constant speed.
- **Score**: The highest number of rows the Player has advanced forward from the starting position during the current session.
- **Game Over State**: The state entered when a Vehicle occupies the same tile as the Player.
- **Game Over Screen**: The overlay displayed during the Game Over State showing the final Score and a restart control.
- **Camera**: The viewport logic that keeps the Player tile vertically centered on the canvas as the world scrolls.
- **World**: The infinite (procedurally generated) sequence of Rows the Player travels through.
- **Canvas**: The HTML5 `<canvas>` element on which all game elements are drawn.

## Requirements

### Requirement 1 — Single-File Static Delivery

**User Story:** As a developer, I want the entire game in one HTML file, so that it can be hosted on GitHub Pages without a build step or server configuration.

#### Acceptance Criteria

1. THE Game SHALL be fully contained within a single `.html` file that includes all CSS and JavaScript inline.
2. THE Game SHALL require no external network requests (no CDN scripts, no external stylesheets, no external image or font files).
3. WHEN a user opens the HTML file directly in a browser via `file://` or over HTTP(S), THE Game SHALL load and run without errors.

---

### Requirement 2 — Canvas Rendering

**User Story:** As a player, I want to see the game world rendered as colored rectangles, so that the game is visually clear without requiring image assets.

#### Acceptance Criteria

1. THE Game SHALL render all game elements — Player, Vehicles, Rows, and score text — exclusively on an HTML5 Canvas element.
2. THE Game SHALL draw Safe Rows in a distinct background color (e.g., dark green) and Traffic Rows in a distinct background color (e.g., gray), differentiated from each other.
3. THE Game SHALL draw the Player as a solid-colored rectangle that contrasts with all Row background colors.
4. THE Game SHALL draw each Vehicle as a solid-colored rectangle that contrasts with the Traffic Row background color.
5. THE Game SHALL render the current Score as a numeric text label in the top-left area of the Canvas at all times during active gameplay.

---

### Requirement 3 — Grid-Based Player Movement

**User Story:** As a player, I want to move one tile at a time with each keypress, so that the game feels like classic Crossy Road with precise, discrete steps.

#### Acceptance Criteria

1. WHEN the player presses the ArrowUp key or the W key, THE Game SHALL move the Player one Tile forward (toward increasing row index).
2. WHEN the player presses the ArrowDown key or the S key, THE Game SHALL move the Player one Tile backward (toward decreasing row index).
3. WHEN the player presses the ArrowLeft key or the A key, THE Game SHALL move the Player one Tile to the left.
4. WHEN the player presses the ArrowRight key or the D key, THE Game SHALL move the Player one Tile to the right.
5. WHILE the Game is in the Game Over State, THE Game SHALL ignore all movement key inputs.
6. IF a movement key would move the Player beyond the left or right boundary of the World, THEN THE Game SHALL keep the Player at the boundary Tile and not move.
7. IF a movement key would move the Player behind the row at the bottom edge of the visible Camera view, THEN THE Game SHALL keep the Player at the current position and not move backward off screen.

---

### Requirement 4 — Camera / World Scrolling

**User Story:** As a player, I want the camera to follow my character so I can always see several rows ahead and behind me.

#### Acceptance Criteria

1. THE Game SHALL render the world such that the Player Tile remains vertically centered on the Canvas.
2. WHEN the Player moves to a new Row, THE Camera SHALL update the viewport offset so the Player Tile returns to the vertical center of the Canvas on the next rendered frame.
3. THE Game SHALL procedurally generate new Rows ahead of the Player so that at least 5 Safe or Traffic Rows are always visible above the Player's current position.

---

### Requirement 5 — Procedural World Generation

**User Story:** As a player, I want an endless world of traffic rows so that the game has no fixed end.

#### Acceptance Criteria

1. THE Game SHALL generate the World as an unbounded sequence of Rows extending forward from the Player's starting position.
2. THE Game SHALL place a Safe Row at the Player's starting row.
3. THE Game SHALL generate Traffic Rows and Safe Rows in a pattern such that no more than 3 consecutive Traffic Rows appear without a Safe Row between them.
4. WHEN the Player advances within 5 Rows of the furthest-generated Row, THE Game SHALL generate at least 10 additional Rows beyond the current furthest Row.
5. THE Game SHALL assign each Traffic Row a lane direction (left-to-right or right-to-left), a vehicle speed (in tiles per second, between 2 and 8 inclusive), and a set of Vehicles with randomised starting positions spaced at least 2 Tiles apart.

---

### Requirement 6 — Vehicle Movement

**User Story:** As a player, I want vehicles to move continuously so I must time my crossings.

#### Acceptance Criteria

1. WHILE the Game is in the active play state, THE Game SHALL move each Vehicle horizontally across its Traffic Row at the speed assigned to that row.
2. WHEN a Vehicle reaches the edge of the visible canvas area plus one Tile of off-screen buffer, THE Game SHALL wrap the Vehicle to the opposite side of the row.
3. THE Game SHALL update Vehicle positions based on elapsed time (delta-time) so that movement speed is consistent regardless of frame rate.

---

### Requirement 7 — Collision Detection

**User Story:** As a player, I want the game to detect when a vehicle hits me so that the challenge is meaningful.

#### Acceptance Criteria

1. WHEN a Vehicle's bounding rectangle overlaps the Player's bounding rectangle by more than 50% of the Player's Tile area, THE Game SHALL transition to the Game Over State.
2. THE Game SHALL check for Player–Vehicle overlap on every rendered frame during the active play state.

---

### Requirement 8 — Scoring

**User Story:** As a player, I want to see my score increase as I move forward so I have a goal to beat.

#### Acceptance Criteria

1. THE Game SHALL initialise the Score to 0 at the start of each session.
2. WHEN the Player moves to a Row with a higher index than the Player's previously recorded maximum Row index, THE Game SHALL increment the Score by 1.
3. WHEN the Player moves backward, THE Game SHALL keep the Score at the current value and not decrement it.
4. THE Game SHALL display the current Score on the Canvas continuously during the active play state.

---

### Requirement 9 — Game Over Screen

**User Story:** As a player, I want a clear game-over state with my final score and a restart option so I can try again immediately.

#### Acceptance Criteria

1. WHEN the Game transitions to the Game Over State, THE Game SHALL display a Game Over Screen overlay on the Canvas.
2. THE Game Over Screen SHALL display the text "Game Over" prominently.
3. THE Game Over Screen SHALL display the final Score achieved in the session.
4. THE Game Over Screen SHALL display a restart control labelled "Restart".
5. WHEN the player activates the restart control, THE Game SHALL reset all game state — including Player position, Score, World rows, and Vehicle positions — and return to the active play state.
6. WHILE the Game is in the Game Over State, THE Game SHALL continue rendering the world and vehicles in the background behind the overlay.

---

### Requirement 10 — Game Loop

**User Story:** As a developer, I want a reliable game loop so that movement and rendering are smooth.

#### Acceptance Criteria

1. THE Game SHALL drive the game loop using `requestAnimationFrame` to synchronise updates with the browser's refresh cycle.
2. THE Game SHALL compute a delta-time value on each frame as the elapsed milliseconds since the previous frame.
3. IF the computed delta-time exceeds 100 milliseconds, THEN THE Game SHALL clamp the delta-time to 100 milliseconds to prevent large position jumps after tab switching or pausing.
