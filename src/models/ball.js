// Tennis ball: a 3×3×3 cube lattice with the eight corners omitted (19 cubes)
// plus a ring of eight small seam cubes around the equator, merged into one
// geometry per colour and built ONCE — every ball on the field and the one in
// Charlie's mouth share it. See SPEC.md §4.3.

import * as THREE from 'three';
import { buildVoxelMesh, box, material } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { BALL } from '../config.js';

let ballGeo = null;
let seamGeo = null;

function build() {
  const u = BALL.DIAMETER / 3;             // one lattice cube
  const cubes = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 3) continue; // drop corners
        cubes.push(box(x * u, y * u, z * u, u, u, u, P.BALL));
      }
  const seams = [];
  const r = BALL.DIAMETER / 2 + 0.004;
  const s = u * 0.55;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    seams.push(box(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.35, Math.sin(a) * r * 0.82, s, s, s, P.BALL_SEAM));
  }
  const g = buildVoxelMesh(cubes, { name: 'ball' });
  const sg = buildVoxelMesh(seams, { name: 'ball-seam' });
  ballGeo = g.children[0].geometry;
  seamGeo = sg.children[0].geometry;
}

export function buildBallGeometry() {
  if (!ballGeo) build();
  return ballGeo;
}

/** A complete ball mesh group (body + seams), sharing the cached geometry. */
export function createBallMesh(golden = false) {
  if (!ballGeo) build();
  const g = new THREE.Group();
  const body = new THREE.Mesh(ballGeo, material(golden ? P.GOLD : P.BALL));
  const seam = new THREE.Mesh(seamGeo, material(golden ? P.GOLD_SEAM : P.BALL_SEAM));
  body.castShadow = seam.castShadow = true;
  body.receiveShadow = seam.receiveShadow = false;
  g.add(body, seam);
  return g;
}
