// An articulated truck: coloured cab at the front (+X), white trailer behind.
// 3.8 long overall (cab 1.2 + trailer 2.6), 0.95 wide, 1.1 tall.

import { buildVoxelMesh, box } from '../voxel.js';
import { PALETTE as P } from '../palette.js';

export function createTruck(color) {
  const cabX = 1.3, trailerX = -0.6;
  return buildVoxelMesh([
    box(cabX, 0.55, 0, 1.2, 0.8, 0.95, color),                 // cab
    box(cabX, 1.0, 0, 1.1, 0.1, 0.9, P.VEHICLE_WHITE),         // cab roof
    box(cabX + 0.61, 0.72, 0, 0.02, 0.42, 0.8, P.GLASS),       // windscreen
    box(cabX, 0.72, 0.48, 0.6, 0.3, 0.02, P.GLASS),            // cab side windows
    box(cabX, 0.72, -0.48, 0.6, 0.3, 0.02, P.GLASS),
    box(trailerX, 0.66, 0, 2.6, 0.9, 0.95, P.VEHICLE_WHITE),   // trailer
    box(trailerX, 0.20, 0, 2.4, 0.08, 0.7, P.TYRE),            // chassis (tyre-black: 4 colours total)
    box(cabX, 0.14, 0.44, 0.34, 0.28, 0.14, P.TYRE),           // wheels
    box(cabX, 0.14, -0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(-1.5, 0.14, 0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(-1.5, 0.14, -0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(-0.3, 0.14, 0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(-0.3, 0.14, -0.44, 0.34, 0.28, 0.14, P.TYRE),
    box(1.91, 0.36, 0.32, 0.02, 0.12, 0.16, P.HEADLIGHT),      // headlights
    box(1.91, 0.36, -0.32, 0.02, 0.12, 0.16, P.HEADLIGHT),
    box(-1.91, 0.36, 0.32, 0.02, 0.1, 0.14, P.TAILLIGHT),
    box(-1.91, 0.36, -0.32, 0.02, 0.1, 0.14, P.TAILLIGHT),
  ], { name: 'truck' });
}
