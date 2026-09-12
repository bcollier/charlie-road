// Charlie's caterpillar toy (IMG_2328): a chain of tie-dye plush segments
// with a big yellow head that is over-the-top happy — huge white eyes, a
// wide black smile, pink cheeks, two antennae. Segments are separate meshes
// sharing the ball geometry so the whole thing can inch and wiggle.

import * as THREE from 'three';
import { buildVoxelMesh, box, material } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { BALL, CATERPILLAR } from '../config.js';
import { buildBallGeometry } from './ball.js';

const COLORS = [P.CAT_PINK, P.CAT_YELLOW, P.CAT_BLUE, P.CAT_LIME, P.CAT_ORANGE, P.CAT_PURPLE];

export function createCaterpillar(n = CATERPILLAR.SEGMENTS) {
  const root = new THREE.Group();
  const geo = buildBallGeometry();
  const segScale = (CATERPILLAR.SEG_LEN * 1.12) / BALL.DIAMETER;
  const segments = [];

  // Head: a bigger yellow ball with the face on +X.
  const head = new THREE.Group();
  const headBall = new THREE.Mesh(geo, material(P.CAT_YELLOW));
  headBall.scale.setScalar(segScale * 1.35);
  headBall.castShadow = true;
  head.add(headBall);
  const r = CATERPILLAR.SEG_LEN * 1.12 * 1.35 / 2;   // head radius
  const face = [];
  // Eyes: huge whites with pupils — pure delight. Big enough to read from above.
  for (const z of [-0.12, 0.12]) {
    face.push(box(r * 0.84, 0.12, z, 0.12, 0.14, 0.13, 0xffffff));
    face.push(box(r * 0.99, 0.14, z * 0.9, 0.06, 0.07, 0.06, P.CAT_EYE));
  }
  // Smile: a wide arc of seven cubes, ends turned up high.
  for (const z of [-0.2, -0.13, -0.066, 0, 0.066, 0.13, 0.2]) {
    const y = -0.01 - 0.1 * (1 - (z / 0.2) * (z / 0.2));
    face.push(box(r * 0.93, y, z, 0.06, 0.055, 0.075, P.CAT_EYE));
  }
  face.push(box(r * 0.8, -0.02, -0.25, 0.07, 0.07, 0.07, P.CAT_CHEEK));
  face.push(box(r * 0.8, -0.02, 0.25, 0.07, 0.07, 0.07, P.CAT_CHEEK));
  // Antennae.
  for (const z of [-0.09, 0.09]) {
    face.push(box(0.04, r + 0.08, z, 0.04, 0.16, 0.04, P.CAT_YELLOW));
    face.push(box(0.04, r + 0.18, z, 0.07, 0.07, 0.07, P.CAT_PINK));
  }
  head.add(buildVoxelMesh(face, { name: 'caterpillar-face' }));
  root.add(head);
  segments.push(head);

  for (let i = 1; i < n; i++) {
    const m = new THREE.Mesh(geo, material(COLORS[i % COLORS.length]));
    m.scale.setScalar(segScale);
    m.castShadow = true;
    root.add(m);
    segments.push(m);
  }

  return {
    root, head, segments,
    /**
     * Lay the chain out behind the head along X, wiggling in Z and inching in Y.
     * @param headX head centre (row-local x); dir ±1 travel direction; t time
     */
    pose(headX, dir, t) {
      for (let i = 0; i < segments.length; i++) {
        const x = headX - dir * i * CATERPILLAR.SEG_LEN;
        const z = CATERPILLAR.WIGGLE * Math.sin(x * 2.2 + t * 5);
        const hump = Math.max(0, Math.sin(x * 3 - t * 7));
        segments[i].position.set(x, 0.2 + 0.1 * hump, z);
        segments[i].rotation.y = 0;
      }
      // Face forward-and-toward-the-viewer (45° off the travel axis) so the
      // eyes and smile read from the game's camera instead of in profile.
      head.rotation.y = dir > 0 ? -Math.PI / 4 : Math.PI + Math.PI / 4;
      head.rotation.z = 0.12 * Math.sin(t * 6);
    },
    /** Held sideways in Charlie's mouth, wriggling. Local coordinates of the mouth. */
    poseInMouth(t) {
      const n = segments.length;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * CATERPILLAR.SEG_LEN * 0.5;
        segments[i].position.set(x, 0.05 * Math.sin(x * 6 + t * 12), 0.02 * Math.sin(t * 9 + i));
      }
      head.rotation.y = -Math.PI / 2;   // face toward the camera side
      head.rotation.z = 0.3 * Math.sin(t * 10);
    },
    /** Dropped on the grass, lying across the tile, still smiling. */
    poseDropped(t) {
      const n = segments.length;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * CATERPILLAR.SEG_LEN * 0.8;
        segments[i].position.set(x, 0.2, 0.15 * Math.sin(x * 2.2));
      }
      head.rotation.y = -Math.PI / 2;
      head.rotation.z = 0;
    },
  };
}
