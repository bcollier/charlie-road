// A lily pad: a plus-shaped voxel disc with a notch, one colour, one draw
// call. Top face at y ≈ 0.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createLilypad() {
  return buildVoxelMesh([
    box(0, -0.02, 0, 0.82, 0.06, 0.58, P.BUSH_A),
    box(0, -0.02, 0, 0.58, 0.06, 0.82, P.BUSH_A),
    box(0.22, -0.02, 0.22, 0.34, 0.06, 0.34, P.BUSH_A),
    box(-0.22, -0.02, 0.22, 0.34, 0.06, 0.34, P.BUSH_A),
    box(-0.22, -0.02, -0.22, 0.34, 0.06, 0.34, P.BUSH_A),
    // the notch: the +x/-z quadrant is left open
  ], { name: 'lilypad' });
}
