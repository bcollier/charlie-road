// A squirrel: compact body, pale belly, big curled tail. Built facing +X
// (its running direction). squirrelBoxes() so the saucer can seat one in
// its dome; createSquirrel() for the live one with a separate tail group.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function squirrelBoxes(ox = 0, oy = 0, oz = 0, s = 1) {
  const b = (x, y, z, w, h, d, c) => box(ox + x * s, oy + y * s, oz + z * s, w * s, h * s, d * s, c);
  return [
    b(0, 0.16, 0, 0.36, 0.22, 0.22, P.SQUIRREL),           // body
    b(-0.02, 0.12, 0, 0.30, 0.14, 0.16, P.SQUIRREL_BELLY),  // belly
    b(0.20, 0.30, 0, 0.18, 0.18, 0.20, P.SQUIRREL),         // head
    b(0.30, 0.27, 0, 0.06, 0.08, 0.10, P.SQUIRREL_BELLY),   // muzzle
    b(0.33, 0.29, 0, 0.03, 0.04, 0.04, P.NOSE),
    b(0.24, 0.34, 0.11, 0.05, 0.05, 0.02, P.EYE),            // eyes
    b(0.24, 0.34, -0.11, 0.05, 0.05, 0.02, P.EYE),
    b(0.17, 0.42, 0.07, 0.05, 0.08, 0.05, P.SQUIRREL),       // ears
    b(0.17, 0.42, -0.07, 0.05, 0.08, 0.05, P.SQUIRREL),
    b(0.10, 0.06, 0.08, 0.08, 0.10, 0.06, P.SQUIRREL),       // legs
    b(0.10, 0.06, -0.08, 0.08, 0.10, 0.06, P.SQUIRREL),
    b(-0.12, 0.06, 0.08, 0.08, 0.10, 0.06, P.SQUIRREL),
    b(-0.12, 0.06, -0.08, 0.08, 0.10, 0.06, P.SQUIRREL),
  ];
}

export function tailBoxes(s = 1) {
  const b = (x, y, z, w, h, d, c) => box(x * s, y * s, z * s, w * s, h * s, d * s, c);
  return [
    b(-0.24, 0.20, 0, 0.14, 0.26, 0.16, P.SQUIRREL_TAIL),
    b(-0.24, 0.40, 0, 0.18, 0.20, 0.20, P.SQUIRREL_TAIL),
    b(-0.18, 0.54, 0, 0.16, 0.14, 0.18, P.SQUIRREL_TAIL),
  ];
}

export function createSquirrel() {
  const root = new THREE.Group();
  root.add(buildVoxelMesh(squirrelBoxes(), { name: 'squirrel' }));
  const tail = new THREE.Group();
  tail.position.set(-0.18, 0.12, 0);
  tail.add(buildVoxelMesh(tailBoxes().map(b => ({ ...b, x: b.x + 0.18, y: b.y - 0.12 })), { name: 'squirrel-tail' }));
  root.add(tail);
  return {
    root, tail,
    animate(t, running) {
      tail.rotation.z = running ? 0.35 * Math.sin(t * 22) : 0.12 * Math.sin(t * 5);
      root.position.y = running ? Math.abs(Math.sin(t * 16)) * 0.12 : 0;
    },
  };
}
