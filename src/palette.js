// Every colour in the game. World values were sampled from real gameplay
// screenshots; Charlie's were saturated up from photos shot in shade, because
// Crossy Road's palette is flat and punchy. See SPEC.md §3.8.

export const PALETTE = {
  // World
  SKY: 0x72d8ff,
  GRASS_A: 0x6e9e30,
  GRASS_B: 0x557d27,
  GRASS_SIDE: 0x4a6e22,
  BUSH_A: 0x6c8b57,
  BUSH_B: 0x425438,
  ASPHALT: 0x50506b,
  ASPHALT_ALT: 0x79758b,
  MARKING: 0xe3e0ff,
  WATER: 0x5ba8e1,
  WATER_DEEP: 0x3f8fc4,
  FOAM: 0xffffff,
  LOG: 0x625052,
  LOG_MOSS: 0x7c9b5d,
  BALLAST: 0x404754,
  SLEEPER: 0x703939,
  RAIL: 0x8883a8,
  VEHICLE_WHITE: 0xd8eaff,
  TYRE: 0x000000,
  GLASS: 0x1f2937,
  TREE_TRUNK: 0x6b4a2f,
  TREE_LEAF_A: 0x4e8a2b,
  TREE_LEAF_B: 0x3c6e22,
  ROCK: 0x9a9aa8,
  SIGNAL_POLE: 0xe6e6e6,
  SIGNAL_RED: 0xff2a2a,
  SIGNAL_OFF: 0x5a1a1a,
  DIRT: 0xb38957,
  SAND: 0xe5a967,

  // Charlie
  LIVER: 0x6e4026,
  LIVER_DARK: 0x5a3520,
  LIVER_LIGHT: 0x8b5a38,
  FUR_WHITE: 0xf7f3ea,
  FUR_SHADOW: 0xd8d0c2,
  NOSE: 0x3d2a1e,
  EYE: 0x2a1c12,
  TONGUE: 0xe8899b,
  COLLAR: 0x4a5560,
  TAG: 0xe8b93c,

  // Ball
  BALL: 0xd9e534,
  BALL_SEAM: 0xf5f7ec,

  // Accessories
  SHADES_FRAME: 0x5cc6d4,
  SHADES_LENS: 0x1e2126,
  BANDANA: 0xd8382f,
  BANDANA_SPOT: 0xf5f1e8,
  SWEATER_RED: 0xd23b44,
  SWEATER_WHITE: 0xf0ede4,
  BOWTIE: 0xe8b93c,

  // Eagle
  EAGLE_BODY: 0x3b2a20,
  EAGLE_HEAD: 0xf2efe6,
  EAGLE_BEAK: 0xe8b93c,

  // Golden ball
  GOLD: 0xffd23a,
  GOLD_SEAM: 0xfff4c2,

  // Caterpillar (IMG_2328 — tie-dye plush, stylised up)
  CAT_PINK: 0xff4fa3,
  CAT_YELLOW: 0xffe23a,
  CAT_BLUE: 0x46b4ff,
  CAT_LIME: 0x8ce03a,
  CAT_ORANGE: 0xff8a2a,
  CAT_PURPLE: 0xb06cff,
  CAT_EYE: 0x1b1b2a,
  CAT_CHEEK: 0xff8fc0,

  // Squirrel
  SQUIRREL: 0x8a5a3c,
  SQUIRREL_BELLY: 0xe8d9c4,
  SQUIRREL_TAIL: 0xa0704c,

  // Vehicle lights (own materials so they can glow at night)
  HEADLIGHT: 0xfff6c0,
  TAILLIGHT: 0xff3b3b,
};

// Sky and light keyframes for the day cycle, in order around the loop.
export const DAY_CYCLE = [
  { at: 0.00, sky: 0x72d8ff, ambient: 1.35, sun: 1.9, sunColor: 0xffffff, sunY: 10 },   // day
  { at: 0.30, sky: 0x86d4ff, ambient: 1.30, sun: 1.8, sunColor: 0xfff4e0, sunY: 9 },
  { at: 0.48, sky: 0xf4a26b, ambient: 0.95, sun: 1.5, sunColor: 0xffb070, sunY: 4 },    // dusk
  { at: 0.62, sky: 0x2b2f6e, ambient: 0.55, sun: 0.9, sunColor: 0x9fb4ff, sunY: 6 },    // night
  { at: 0.80, sky: 0x1b2350, ambient: 0.50, sun: 0.8, sunColor: 0x8fa8ff, sunY: 7 },
  { at: 0.92, sky: 0xf7b58a, ambient: 1.00, sun: 1.5, sunColor: 0xffc890, sunY: 4 },    // dawn
  { at: 1.00, sky: 0x72d8ff, ambient: 1.35, sun: 1.9, sunColor: 0xffffff, sunY: 10 },
];

// Vehicle body colours, cycled per spawn.
export const VEHICLE_COLORS = [
  0xe84545, 0x3b82f6, 0x8b5cf6, 0x10b981, 0xf59e0b, 0xec4899, 0x14b8a6, 0xf97316,
];
