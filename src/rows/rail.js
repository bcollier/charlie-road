// A railway row: ballast, two rails, sleepers, a crossing signal on the
// first track of a group, and a train on a deterministic cycle:
//   warn → sweep → cooldown, offset by the row's phase, all from t.
// Exposes `state`, `trainX` and a hitbox for collision. See SPEC.md §5.7.

import * as THREE from 'three';
import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { RAIL } from '../config.js';
import { LANE_HALF, WALL_MIN, WALL_MAX } from '../rules/worldgen.js';
import { createTrain } from '../models/train.js';
import { createSignal } from '../models/signal.js';

const SLAB_W = WALL_MAX - WALL_MIN + 1;
const SWEEP_DIST = LANE_HALF * 2 + RAIL.TRAIN_LENGTH;
const SWEEP_TIME = SWEEP_DIST / RAIL.TRAIN_SPEED;

let bedGeo = null;
function railBed() {
  const boxes = [
    box(0, -0.27, 0, SLAB_W, 0.46, 1, P.BALLAST),
    box(0, -0.01, 0.28, SLAB_W, 0.06, 0.07, P.RAIL),
    box(0, -0.01, -0.28, SLAB_W, 0.06, 0.07, P.RAIL),
  ];
  for (let x = WALL_MIN; x <= WALL_MAX; x += 0.5) boxes.push(box(x, -0.045, 0, 0.22, 0.05, 0.86, P.SLEEPER));
  return boxes;
}

export function createRailRow(desc) {
  const group = new THREE.Group();
  group.position.z = -desc.index;

  group.add(buildVoxelMesh(railBed(), { name: 'rail-bed', castShadow: false }));

  const train = createTrain();
  train.visible = false;
  if (desc.dir < 0) train.rotation.y = Math.PI;
  group.add(train);

  // Signals flank the middle lanes on the seam with the previous row, so at
  // least one is always inside a portrait view (which spans ±3.25 tiles).
  // At the field edge they'd be invisible on a phone whenever Charlie is
  // near the centre — and the warning is the whole point of them.
  const signals = [];
  if (desc.laneIndex === 0) {
    for (const x of RAIL.SIGNAL_XS) {
      const s = createSignal();
      s.group.position.set(x, 0, 0.5);
      group.add(s.group);
      signals.push(s);
    }
  }
  const signal = signals[0] || null;

  const period = desc.warn + SWEEP_TIME + desc.cooldown;
  const startX = -desc.dir * (LANE_HALF + RAIL.TRAIN_LENGTH / 2);

  const row = {
    desc,
    group,
    signal,
    state: 'idle',      // 'warn' | 'train' | 'idle'
    trainX: null,
    trainBox: { x: 0, z: -desc.index, w: RAIL.TRAIN_LENGTH * 0.98, d: 0.9 },
    warnStartedAt: -1,  // for the ding

    update(t) {
      const u = ((t + desc.phase) % period + period) % period;
      let st;
      if (u < desc.warn) st = 'warn';
      else if (u < desc.warn + SWEEP_TIME) st = 'train';
      else st = 'idle';
      if (st === 'warn' && row.state !== 'warn') row.warnStartedAt = t;
      row.state = st;
      if (st === 'train') {
        row.trainX = startX + desc.dir * RAIL.TRAIN_SPEED * (u - desc.warn);
        train.position.x = row.trainX;
        train.visible = true;
        row.trainBox.x = row.trainX;
      } else {
        row.trainX = null;
        train.visible = false;
      }
    },

    /** Set by the world after all rows update: any track in the group warning. */
    setSignal(on, t) { for (const s of signals) s.set(on, t); },

    dispose() { group.removeFromParent(); },
  };
  row.update(0);
  return row;
}
