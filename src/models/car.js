// A hatchback. Built facing +X; a lane moving -X rotates it by π.
// Dimensions from SPEC.md §3.5: 1.6 long, 0.9 wide, 0.75 tall.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createCar(color) {
  return buildVoxelMesh([
    box(0, 0.30, 0, 1.6, 0.36, 0.9, color),                 // body
    box(-0.1, 0.61, 0, 0.9, 0.26, 0.8, P.VEHICLE_WHITE),    // roof
    box(0.36, 0.60, 0, 0.04, 0.22, 0.7, P.GLASS),           // windscreen
    box(-0.56, 0.60, 0, 0.04, 0.2, 0.7, P.GLASS),           // rear window
    box(-0.1, 0.60, 0.41, 0.7, 0.18, 0.02, P.GLASS),        // side windows
    box(-0.1, 0.60, -0.41, 0.7, 0.18, 0.02, P.GLASS),
    box(0.5, 0.12, 0.42, 0.3, 0.24, 0.12, P.TYRE),          // wheels
    box(0.5, 0.12, -0.42, 0.3, 0.24, 0.12, P.TYRE),
    box(-0.5, 0.12, 0.42, 0.3, 0.24, 0.12, P.TYRE),
    box(-0.5, 0.12, -0.42, 0.3, 0.24, 0.12, P.TYRE),
    box(0.81, 0.32, 0.3, 0.02, 0.1, 0.14, P.HEADLIGHT),     // lights have their own materials so they can glow at night
    box(0.81, 0.32, -0.3, 0.02, 0.1, 0.14, P.HEADLIGHT),
    box(-0.81, 0.32, 0.3, 0.02, 0.08, 0.12, P.TAILLIGHT),
    box(-0.81, 0.32, -0.3, 0.02, 0.08, 0.12, P.TAILLIGHT),
  ], { name: 'car' });
}
