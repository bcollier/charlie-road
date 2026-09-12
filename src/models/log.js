// A floating log, 2 or 3 tiles long, with a mossy top. Its top face sits at
// y ≈ 0 so Charlie stands on it at his normal height. Two colours → two
// draw calls, cached per length.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createLog(len = 2) {
  return buildVoxelMesh([
    box(0, -0.13, 0, len, 0.28, 0.82, P.LOG),
    box(0, 0.015, 0, len - 0.24, 0.03, 0.56, P.LOG_MOSS),
    box(-len / 2 + 0.08, 0.015, 0.2, 0.16, 0.03, 0.16, P.LOG_MOSS),
    box(len / 2 - 0.12, 0.015, -0.18, 0.2, 0.03, 0.14, P.LOG_MOSS),
  ], { name: 'log' + len });
}
