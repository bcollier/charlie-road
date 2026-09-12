// Stand-in slabs for row types whose real builders land in later blocks:
// water-blue for rivers, ballast-grey for rails. Walkable and harmless, so
// the Block 2 checkpoint is playable end to end.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { WALL_MIN, WALL_MAX } from '../rules/worldgen.js';

const SLAB_W = WALL_MAX - WALL_MIN + 1;

export function createPlaceholderRow(desc) {
  const group = new THREE.Group();
  group.position.z = -desc.index;
  const color = desc.type === 'river' ? P.WATER : P.BALLAST;
  group.add(buildVoxelMesh([box(0, -0.30, 0, SLAB_W, 0.5, 1, color)], { name: 'placeholder-' + desc.type, castShadow: false }));
  return { desc, group, update() {}, dispose() { group.removeFromParent(); } };
}
