// Charlie's outfits, each modelled from a photo in reference/charlie/.
// Three slots (head / neck / body), one item per slot, any combination.
// Unlocks are thresholds against the lifetime ball total. See SPEC.md §4.2.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

// Shades first: their temples and top bar read from the game's behind-and-
// above camera, so the first unlock is one you can actually see.
export const ACCESSORIES = [
  { id: 'sunglasses', name: 'Shades',  slot: 'head', cost: 10,  swatch: '#5cc6d4', parent: 'head' },
  { id: 'bandana',    name: 'Bandana', slot: 'neck', cost: 25,  swatch: '#d8382f', parent: 'root' },
  { id: 'bowtie',     name: 'Bow tie', slot: 'neck', cost: 50,  swatch: '#e8b93c', parent: 'root' },
  { id: 'sweater',    name: 'Sweater', slot: 'body', cost: 100, swatch: '#d23b44', parent: 'root' },
];

export const SLOTS = ['head', 'neck', 'body'];

const BUILD = {
  // Red heart bandana (IMG_8224), tied the way a real one is: a band around
  // the neck over the collar, the bib draped over the shoulders at the front,
  // and a knot with two tails at the BACK — the side the camera sees.
  bandana: () => buildVoxelMesh([
    box(0, 0.41, -0.20, 0.41, 0.09, 0.30, P.BANDANA),           // neck band (over the collar)
    box(0, 0.40, -0.27, 0.50, 0.07, 0.12, P.BANDANA),           // draped over the shoulder tops
    box(0, 0.36, -0.26, 0.34, 0.16, 0.05, P.BANDANA),           // bib
    box(0, 0.30, -0.255, 0.28, 0.06, 0.05, P.BANDANA),
    box(0, 0.25, -0.25, 0.20, 0.06, 0.05, P.BANDANA),
    box(0, 0.20, -0.245, 0.12, 0.06, 0.05, P.BANDANA),
    box(0, 0.43, -0.04, 0.12, 0.10, 0.08, P.BANDANA),           // knot at the back
    box(-0.07, 0.37, -0.02, 0.06, 0.16, 0.05, P.BANDANA),       // tails hanging down the back
    box(0.07, 0.36, -0.02, 0.06, 0.18, 0.05, P.BANDANA),
    box(-0.09, 0.38, -0.288, 0.03, 0.03, 0.02, P.BANDANA_SPOT), // heart print
    box(0.07, 0.34, -0.286, 0.03, 0.03, 0.02, P.BANDANA_SPOT),
    box(-0.02, 0.29, -0.282, 0.03, 0.03, 0.02, P.BANDANA_SPOT),
    box(0.05, 0.25, -0.277, 0.03, 0.03, 0.02, P.BANDANA_SPOT),
    box(-0.15, 0.415, -0.20, 0.03, 0.03, 0.02, P.BANDANA_SPOT),
    box(0.16, 0.415, -0.20, 0.03, 0.03, 0.02, P.BANDANA_SPOT),
    box(0.19, 0.415, -0.12, 0.02, 0.03, 0.03, P.BANDANA_SPOT),
  ], { name: 'acc-bandana' }),

  // Turquoise sunglasses (IMG_2100): sized to the cocker's big eyes.
  sunglasses: () => buildVoxelMesh([
    box(0, 0.15, -0.148, 0.30, 0.04, 0.03, P.SHADES_FRAME),
    box(-0.10, 0.13, -0.158, 0.12, 0.10, 0.02, P.SHADES_LENS),
    box(0.10, 0.13, -0.158, 0.12, 0.10, 0.02, P.SHADES_LENS),
    box(-0.10, 0.185, -0.155, 0.13, 0.02, 0.025, P.SHADES_FRAME),
    box(0.10, 0.185, -0.155, 0.13, 0.02, 0.025, P.SHADES_FRAME),
    box(-0.165, 0.14, -0.07, 0.02, 0.03, 0.16, P.SHADES_FRAME),
    box(0.165, 0.14, -0.07, 0.02, 0.03, 0.16, P.SHADES_FRAME),
  ], { name: 'acc-sunglasses' }),

  // Gold bow tie (IMG_6040), with a thin gold band around the neck so it
  // reads from above, and wings wide enough to poke past the head.
  bowtie: () => buildVoxelMesh([
    box(0, 0.415, -0.20, 0.40, 0.05, 0.28, P.BOWTIE),           // neck band
    box(0, 0.38, -0.35, 0.06, 0.07, 0.05, P.BOWTIE),            // knot
    box(-0.11, 0.38, -0.345, 0.14, 0.11, 0.04, P.BOWTIE),       // wings
    box(0.11, 0.38, -0.345, 0.14, 0.11, 0.04, P.BOWTIE),
  ], { name: 'acc-bowtie' }),

  // Red-and-white striped sweater (IMG_8789): bands wrapping the body.
  sweater: () => {
    const boxes = [];
    let i = 0;
    for (let z = -0.22; z <= 0.28 + 1e-6; z += 0.10, i++) {
      boxes.push(box(0, 0.22, z, 0.47, 0.33, 0.09, i % 2 ? P.SWEATER_WHITE : P.SWEATER_RED));
    }
    return buildVoxelMesh(boxes, { name: 'acc-sweater' });
  },
};

export function byId(id) { return ACCESSORIES.find(a => a.id === id) || null; }

/** A standalone mesh of an item, for the unlock fly-in and the dress-up drop. */
export function buildAccessoryMesh(id) {
  return BUILD[id] ? BUILD[id]() : null;
}

/** True once the lifetime total reaches the item's threshold. */
export function isUnlocked(id, ballsTotal) {
  const a = byId(id);
  return !!a && ballsTotal >= a.cost;
}

/**
 * Attach the equipped items to the rig and remove any others.
 * @param charlie the rig from createCharlie()
 * @param equipped { head, neck, body } → item id or null
 */
export function applyAccessories(charlie, equipped) {
  for (const parent of [charlie.root, charlie.head]) {
    for (const c of [...parent.children]) if (c.userData.accessory) parent.remove(c);
  }
  for (const slot of SLOTS) {
    const id = equipped[slot];
    const a = id && byId(id);
    if (!a) continue;
    const mesh = BUILD[id]();
    mesh.userData.accessory = id;
    (a.parent === 'head' ? charlie.head : charlie.root).add(mesh);
  }
}
