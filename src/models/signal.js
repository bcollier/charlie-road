// A level-crossing signal: a pole with two lights that flash alternately
// while a train is coming. Lights swap between two shared materials.

import * as THREE from 'three';
import { buildVoxelMesh, box, material } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createSignal() {
  const g = new THREE.Group();
  g.add(buildVoxelMesh([
    box(0, 0.6, 0, 0.12, 1.2, 0.12, P.SIGNAL_POLE),
    box(0, 1.15, 0, 0.62, 0.16, 0.14, P.SIGNAL_POLE),
    box(0, 0.62, 0, 0.16, 0.12, 0.16, P.SIGNAL_RED),          // pole band
    box(0, 0.9, 0, 0.16, 0.12, 0.16, P.SIGNAL_RED),
    box(0, 0.02, 0, 0.3, 0.06, 0.3, P.BALLAST),
  ], { name: 'signal' }));

  const lightGeo = new THREE.BoxGeometry(0.16, 0.16, 0.1);
  const lights = [-0.2, 0.2].map(x => {
    const m = new THREE.Mesh(lightGeo, material(P.SIGNAL_OFF));
    m.position.set(x, 1.15, 0.1);
    m.castShadow = false;
    g.add(m);
    return m;
  });

  const off = material(P.SIGNAL_OFF), on = material(P.SIGNAL_RED);
  let flashing = false;

  return {
    group: g,
    /** @param t simulated time, for the 4 Hz alternation. */
    set(isFlashing, t) {
      flashing = isFlashing;
      if (!flashing) { lights[0].material = off; lights[1].material = off; return; }
      const a = Math.floor(t * 8) % 2 === 0;
      lights[0].material = a ? on : off;
      lights[1].material = a ? off : on;
    },
    get flashing() { return flashing; },
  };
}
