// A road lane: asphalt slab, dashed centre line on the boundary with the
// previous lane of the same group, and its vehicles. Vehicle positions are a
// pure function of simulated time — x = wrap(x0 + dir·speed·t) — so there is
// no per-frame accumulation, no drift, and collision can be evaluated at any
// instant. One field is the truth for both rendering and the hitbox.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { LANE_HALF, WALL_MIN, WALL_MAX } from '../rules/worldgen.js';
import { wrapLane } from '../rules/collide.js';
import { createCar } from '../models/car.js';
import { createTruck } from '../models/truck.js';
import { createBus } from '../models/bus.js';

const SLAB_W = WALL_MAX - WALL_MIN + 1;
const SLAB_H = 0.48;   // a hair lower than grass: a kerb

const BUILD = { car: createCar, truck: createTruck, bus: createBus };

export function createRoadRow(desc) {
  const group = new THREE.Group();
  group.position.z = -desc.index;

  group.add(buildVoxelMesh([
    box(0, -SLAB_H / 2 - 0.02, 0, SLAB_W, SLAB_H, 1, P.ASPHALT),
  ], { name: 'asphalt', castShadow: false }));

  // Dashes along the seam with the previous lane (z = +0.5 in row space).
  if (desc.laneIndex > 0) {
    const dashes = [];
    for (let x = WALL_MIN; x <= WALL_MAX; x += 1) dashes.push(box(x, -0.01, 0.5, 0.5, 0.02, 0.07, P.MARKING));
    group.add(buildVoxelMesh(dashes, { name: 'road-dashes', castShadow: false, receiveShadow: false }));
  }

  const vehicles = desc.vehicles.map(v => {
    const mesh = BUILD[v.kind](v.color);
    if (desc.dir < 0) mesh.rotation.y = Math.PI;
    mesh.position.y = 0;
    group.add(mesh);
    return { ...v, mesh, x: v.x0 };
  });

  // A bark freezes the lane: while frozen, the lane's own clock stops (the
  // offset accumulates), so positions stay a pure function of lane time.
  let lastT = 0, tOffset = 0, frozenUntil = -1, flinchAt = -1;

  function update(t) {
    const dt = t - lastT;
    lastT = t;
    if (t < frozenUntil && dt > 0) tOffset += dt;
    const te = t - tOffset;
    const f = t - flinchAt;
    const flinch = (f >= 0 && f < 0.3) ? 0.16 * Math.sin(Math.PI * f / 0.3) : 0;
    for (const v of vehicles) {
      v.x = wrapLane(v.x0 + desc.dir * desc.speed * te, LANE_HALF);
      v.mesh.position.x = v.x;
      v.mesh.position.y = flinch;
    }
  }
  update(0);

  return {
    desc,
    group,
    vehicles,
    update,
    get frozen() { return lastT < frozenUntil; },
    freeze(t, seconds) { frozenUntil = Math.max(frozenUntil, t + seconds); flinchAt = t; },
    dispose() { group.removeFromParent(); },
  };
}
