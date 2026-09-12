// The eagle: dark body, white head, yellow beak, two flapping wing groups.
// Built facing +X; the system rotates it toward its velocity.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createEagle() {
  const root = new THREE.Group();
  root.add(buildVoxelMesh([
    box(0, 0, 0, 0.95, 0.36, 0.42, P.EAGLE_BODY),
    box(0.58, 0.16, 0, 0.36, 0.32, 0.34, P.EAGLE_HEAD),
    box(0.82, 0.12, 0, 0.16, 0.1, 0.12, P.EAGLE_BEAK),
    box(0.66, 0.24, 0.12, 0.06, 0.06, 0.06, P.EYE),
    box(0.66, 0.24, -0.12, 0.06, 0.06, 0.06, P.EYE),
    box(-0.6, 0.04, 0, 0.36, 0.08, 0.4, P.EAGLE_HEAD),      // tail
    box(0.1, -0.22, 0.1, 0.1, 0.1, 0.08, P.EAGLE_BEAK),      // talons
    box(0.1, -0.22, -0.1, 0.1, 0.1, 0.08, P.EAGLE_BEAK),
  ], { name: 'eagle-body' }));

  function wing(side) {
    const g = new THREE.Group();
    g.position.set(0, 0.14, side * 0.2);
    g.add(buildVoxelMesh([
      box(0, 0, side * 0.62, 0.72, 0.06, 1.24, P.EAGLE_BODY),
      box(-0.1, 0, side * 1.35, 0.5, 0.06, 0.24, P.EAGLE_BODY),
      box(-0.25, 0, side * 1.5, 0.3, 0.06, 0.12, P.EAGLE_BODY),
    ], { name: side < 0 ? 'eagle-wingL' : 'eagle-wingR' }));
    return g;
  }
  const wingL = wing(-1), wingR = wing(1);
  root.add(wingL, wingR);

  return {
    root,
    /** Flap: wings rotate about the body axis, opposite signs per side. */
    animate(t, intensity = 1) {
      const a = 0.55 * intensity * Math.sin(t * 14);
      wingL.rotation.x = a;
      wingR.rotation.x = -a;
    },
  };
}
