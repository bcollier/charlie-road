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
};

// Vehicle body colours, cycled per spawn.
export const VEHICLE_COLORS = [
  0xe84545, 0x3b82f6, 0x8b5cf6, 0x10b981, 0xf59e0b, 0xec4899, 0x14b8a6, 0xf97316,
];
