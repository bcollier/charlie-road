// A squat two-block boulder. rockBoxes() for merging into a row mesh.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function rockBoxes(ox = 0) {
  return [
    box(ox, 0.18, 0, 0.62, 0.36, 0.52, P.ROCK),
    box(ox + 0.08, 0.44, -0.04, 0.34, 0.18, 0.30, P.ROCK),
  ];
}

export function createRock() {
  return buildVoxelMesh(rockBoxes(), { name: 'rock' });
}
