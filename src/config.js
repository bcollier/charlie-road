// Every tunable constant in one place. Distances are in tiles (1 tile = 1 world
// unit); times are in seconds; angles are in radians. See SPEC.md §3.

const DEG = Math.PI / 180;

// ---- Camera (§3.1) ---------------------------------------------------------
// Orthographic camera derived by measuring the tilt of lanes in real gameplay
// screenshots: lanes run ~13° down to the right, which solves to this rig.
export const CAM = {
  PITCH: 57 * DEG,        // elevation above the horizon
  YAW: 15 * DEG,          // positive = camera offset toward +X, lanes tilt down-right
  DISTANCE: 60,           // only affects near/far placement (orthographic)
  NEAR: 1,
  FAR: 200,
  VIEW_TILES_X: 6.5,      // tiles across in portrait (reference shows ~6.4); landscape is driven by MIN_VIEW_Z
  MIN_VIEW_Z: 9,          // minimum rows visible (landscape clamp)
  LEAD: 1.5,              // rows the camera target sits ahead of the player
  LERP_K: 8.0,            // exponential damping rate: t = 1 - exp(-k*dt)
};

// Derived projection factors: how many camera-space units one tile spans.
export const TILE_SCREEN_X = Math.cos(CAM.YAW);                 // one tile along X
export const ROW_SCREEN_Y = Math.cos(CAM.YAW) * Math.sin(CAM.PITCH); // one row along -Z

// ---- Field and world (§3.2) -------------------------------------------------
export const FIELD = {
  MIN_X: -6,
  MAX_X: 6,               // 13 tiles wide
  START_SAFE_ROWS: 6,
  ROWS_AHEAD: 20,
  ROWS_BEHIND_KEEP: 8,
};

// ---- Simulation -------------------------------------------------------------
export const SIM = {
  DT_CLAMP: 0.1,          // never simulate more than this per frame (tab switch etc)
  MAX_STEP: 1 / 60,       // frame dt is split into substeps no larger than this
};

// ---- Player (§3.3) ----------------------------------------------------------
export const PLAYER = {
  HOP_DURATION: 0.16,
  HOP_HEIGHT: 0.55,
  SQUASH_TIME: 0.07,
  SQUASH_SCALE: [1.18, 0.75, 1.18],
  INPUT_BUFFER: 2,
  IDLE_TILT_AFTER: 1.2,   // seconds idle before the cocker head-tilt
};

// ---- Difficulty (§3.4): t = min(score, 300) / 300 ---------------------------
export const DIFF = {
  SCORE_CAP: 300,
  VEHICLE_SPEED: { start: [2.5, 4.5], end: [4.0, 9.0] },
  VEHICLE_GAP_MIN: { start: 5.0, end: 2.8 },
  MIN_GAP: 2.5,
  LOG_SPEED: { start: [1.2, 2.0], end: [2.0, 3.2] },
  HAZARD_CHANCE: { start: 0.55, end: 0.80 },
  MAX_HAZARD_RUN: { start: 2, end: 4.99 },
  AUTO_SCROLL: { start: 0.55, end: 1.40 },
  HAZARD_WEIGHTS: { road: 0.55, river: 0.25, rail: 0.20 },
  GROUP: { road: [1, 4], river: [1, 3], rail: [1, 3], grass: [1, 2] },
};

// ---- Hazards (§3.5) ---------------------------------------------------------
export const VEHICLES = {
  car:   { len: 1.6, w: 0.90, h: 0.75 },
  bus:   { len: 3.0, w: 0.95, h: 1.05 },
  truck: { len: 3.8, w: 0.95, h: 1.10, cab: 1.2, trailer: 2.6 },
  HITBOX_LEN: 0.92,
  HITBOX_W: 0.85,
};

export const RIVER = {
  LOG_LENGTHS: [2, 3],
  LILYPAD_LEN: 1,
  MAX_PLATFORM_GAP: 3.0,
  ATTACH_TOLERANCE: 0.25,
};

export const RAIL = {
  WARN: [1.6, 2.2],
  TRAIN_SPEED: 20,
  TRAIN_LENGTH: 14,
  COOLDOWN: [2.5, 5.0],
  SIGNAL_XS: [-3.5, 3.5],   // on the row seam, flanking the middle lanes: always one in a portrait view
};

// ---- Eagle (§3.6) -----------------------------------------------------------
export const EAGLE = {
  IDLE_LIMIT: [[0, 5.0], [150, 3.0], [300, 2.0]], // piecewise-linear (score, seconds)
  WARN: 0.8,
  SWOOP: 0.55,
};

// ---- Tennis balls (§3.7) ----------------------------------------------------
export const BALL = {
  SPAWN_CHANCE: 0.18,
  DIAMETER: 0.30,
  BOUNCE_PERIOD: 0.85,
  BOUNCE_HEIGHT: 0.42,
  SPIN: 1.2,
  PICKUP_RADIUS: 0.5,
  CELEBRATE_DURATION: 0.50,
  CELEBRATE_LIFT: 0.25,
  CELEBRATE_SPARKS: 8,
};

// ---- Rendering --------------------------------------------------------------
export const RENDER = {
  MAX_PIXEL_RATIO: 2,
  SHADOW_MAP_DESKTOP: 2048,
  SHADOW_MAP_MOBILE: 1024,
  SHADOW_HALF_EXTENT: 16,  // shadow camera ortho half-size in world units
};
