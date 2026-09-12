// A river row: a sunken water slab and its drifting logs and lily pads.
// Like vehicles, platform positions are a pure function of time. The
// adjacent grass slabs sit higher, so their side faces read as banks.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { LANE_HALF, WALL_MIN, WALL_MAX } from '../rules/worldgen.js';
import { wrapLane } from '../rules/collide.js';
import { createLog } from '../models/log.js';
import { createLilypad } from '../models/lilypad.js';

const SLAB_W = WALL_MAX - WALL_MIN + 1;
export const WATER_TOP = -0.16;

export function createRiverRow(desc) {
  const group = new THREE.Group();
  group.position.z = -desc.index;

  group.add(buildVoxelMesh([
    box(0, WATER_TOP - 0.17, 0, SLAB_W, 0.34, 1, P.WATER),
  ], { name: 'water', castShadow: false }));

  const platforms = desc.platforms.map(p => {
    const mesh = p.kind === 'log' ? createLog(p.len) : createLilypad();
    group.add(mesh);
    return { ...p, mesh, x: p.x0 };
  });

  function update(t) {
    for (const p of platforms) {
      p.x = wrapLane(p.x0 + desc.dir * desc.speed * t, LANE_HALF);
      p.mesh.position.x = p.x;
      // A gentle bob so the water reads as water.
      p.mesh.position.y = 0.015 * Math.sin(t * 2.2 + p.x0 * 1.7);
    }
  }
  update(0);

  return {
    desc,
    group,
    platforms,
    update,
    dispose() { group.removeFromParent(); },
  };
}
