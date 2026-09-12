// Voxel trees in three heights: a trunk and one to three tiers of canopy.
// treeBoxes() returns the raw box list so a row can merge all its trees
// into one mesh per colour; createTree() is the standalone version.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

const SPECS = {
  1: { trunk: 0.35, tiers: [[0.62, 0.55, P.TREE_LEAF_A]] },
  2: { trunk: 0.45, tiers: [[0.72, 0.55, P.TREE_LEAF_B], [0.55, 0.42, P.TREE_LEAF_A]] },
  3: { trunk: 0.55, tiers: [[0.78, 0.5, P.TREE_LEAF_B], [0.64, 0.45, P.TREE_LEAF_A], [0.42, 0.4, P.TREE_LEAF_B]] },
};

/** Boxes for a tree of `height` at x offset `ox`. */
export function treeBoxes(height = 2, ox = 0) {
  const s = SPECS[height] || SPECS[2];
  const boxes = [box(ox, s.trunk / 2, 0, 0.22, s.trunk, 0.22, P.TREE_TRUNK)];
  let y = s.trunk;
  for (const [w, h, color] of s.tiers) {
    boxes.push(box(ox, y + h / 2, 0, w, h, w, color));
    y += h;
  }
  return boxes;
}

export function createTree(height = 2) {
  return buildVoxelMesh(treeBoxes(height), { name: 'tree' + height });
}
