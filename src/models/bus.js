// A city bus. 3.0 long, 0.95 wide, 1.05 tall. Faces +X.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createBus(color) {
  return buildVoxelMesh([
    box(0, 0.55, 0, 3.0, 0.72, 0.95, color),                 // body
    box(0, 0.96, 0, 2.9, 0.1, 0.9, P.VEHICLE_WHITE),         // roof
    box(0.1, 0.74, 0.48, 2.4, 0.3, 0.02, P.GLASS),           // side windows
    box(0.1, 0.74, -0.48, 2.4, 0.3, 0.02, P.GLASS),
    box(1.51, 0.72, 0, 0.02, 0.44, 0.8, P.GLASS),            // windscreen
    box(-1.51, 0.72, 0, 0.02, 0.36, 0.8, P.GLASS),           // rear window
    box(1.0, 0.14, 0.44, 0.34, 0.28, 0.14, P.TYRE),          // wheels
    box(1.0, 0.14, -0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(-1.0, 0.14, 0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(-1.0, 0.14, -0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(1.51, 0.34, 0.32, 0.02, 0.12, 0.16, P.HEADLIGHT),     // headlights
    box(1.51, 0.34, -0.32, 0.02, 0.12, 0.16, P.HEADLIGHT),
    box(-1.51, 0.34, 0.32, 0.02, 0.1, 0.14, P.TAILLIGHT),
    box(-1.51, 0.34, -0.32, 0.02, 0.1, 0.14, P.TAILLIGHT),
  ], { name: 'bus' });
}
