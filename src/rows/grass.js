// A grass row: an alternating-green slab spanning the field plus the
// decorative tree wall beyond it, with trees and rocks on the obstacle
// columns. Everything is static, so the slab and every obstacle are merged
// into ONE mesh per colour — about five draw calls per row instead of ~45.
// The layout is unique per row, so this mesh is not cached by name.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { WALL_MIN, WALL_MAX } from '../rules/worldgen.js';
import { treeBoxes } from '../models/tree.js';
import { rockBoxes } from '../models/rock.js';

const SLAB_W = WALL_MAX - WALL_MIN + 1;
const SLAB_H = 0.5;

export function createGrassRow(desc) {
  const group = new THREE.Group();
  group.position.z = -desc.index;

  const top = desc.index % 2 ? P.GRASS_B : P.GRASS_A;
  const boxes = [box(0, -SLAB_H / 2, 0, SLAB_W, SLAB_H, 1, top)];
  for (const o of [...(desc.obstacles || []), ...(desc.wall || [])]) {
    if (o.kind === 'rock') boxes.push(...rockBoxes(o.x));
    else boxes.push(...treeBoxes(o.height, o.x));
  }
  const mesh = buildVoxelMesh(boxes);
  group.add(mesh);

  return {
    desc,
    group,
    update() {},
    dispose() {
      group.removeFromParent();
      // Unique geometry: free it. Materials are shared and stay.
      for (const m of mesh.children) m.geometry.dispose();
    },
  };
}
