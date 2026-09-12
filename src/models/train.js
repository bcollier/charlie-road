// A 14-tile train: locomotive plus four carriages, built facing +X and
// centred on x = 0 (spans -7 … +7). One cached mesh per colour.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { RAIL } from '../config.js';

const ENGINE = 0x3a3a48;
const CAR = 0x4b5a70;
const STRIPE = 0xe84545;

export function createTrain() {
  const L = RAIL.TRAIN_LENGTH;
  const boxes = [];
  const front = L / 2;

  // Locomotive: 2.6 long at the front.
  const ex = front - 1.3;
  boxes.push(
    box(ex, 0.55, 0, 2.6, 0.8, 0.9, ENGINE),
    box(ex + 0.3, 1.05, 0, 1.4, 0.24, 0.8, ENGINE),          // cab roof
    box(ex, 0.42, 0, 2.62, 0.14, 0.92, STRIPE),               // stripe
    box(ex + 1.31, 0.6, 0, 0.02, 0.5, 0.7, P.GLASS),          // windscreen
    box(ex + 0.9, 0.95, 0, 0.6, 0.02, 0.76, P.GLASS),
    box(ex + 1.31, 0.3, 0.3, 0.02, 0.12, 0.16, P.VEHICLE_WHITE),
    box(ex + 1.31, 0.3, -0.3, 0.02, 0.12, 0.16, P.VEHICLE_WHITE),
  );

  // Four carriages behind, 2.6 long with 0.2 gaps.
  let x = front - 2.6 - 0.2 - 1.3;
  for (let i = 0; i < 4; i++) {
    boxes.push(
      box(x, 0.58, 0, 2.6, 0.8, 0.9, CAR),
      box(x, 1.0, 0, 2.5, 0.06, 0.84, P.VEHICLE_WHITE),        // roof
      box(x, 0.7, 0.46, 2.2, 0.28, 0.02, P.GLASS),             // windows
      box(x, 0.7, -0.46, 2.2, 0.28, 0.02, P.GLASS),
      box(x, 0.42, 0, 2.62, 0.1, 0.92, STRIPE),
    );
    x -= 2.8;
  }

  // Wheels along the whole length.
  for (let wx = -front + 0.5; wx < front; wx += 1.3) {
    boxes.push(box(wx, 0.12, 0.42, 0.34, 0.24, 0.12, P.TYRE), box(wx, 0.12, -0.42, 0.34, 0.24, 0.12, P.TYRE));
  }

  return buildVoxelMesh(boxes, { name: 'train' });
}
