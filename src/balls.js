// Tennis balls on the ground: bounce in place on a rectified sine, squash on
// contact, spin slowly, cast a real shadow. Every ball shares one geometry.
// Pickup is tested against Charlie's interpolated position each step.
// See SPEC.md §3.7, §5.4.

import { BALL, GOLDEN } from './config.js';
import { createBallMesh } from './models/ball.js';

const R = BALL.DIAMETER / 2;
const TWO_PI = Math.PI * 2;

export function createBall(x, rowIndex, phase = 0, golden = false) {
  const mesh = createBallMesh(golden);
  mesh.position.set(x, R, 0);
  const H = golden ? GOLDEN.BOUNCE_HEIGHT : BALL.BOUNCE_HEIGHT;
  const ball = {
    x, row: rowIndex, mesh, phase, golden,
    collected: false,
    update(t) {
      if (ball.collected) return;
      const u = (t / BALL.BOUNCE_PERIOD + phase) % 1;
      const s = Math.abs(Math.sin(TWO_PI * u / 2));            // 0 at contact, 1 at apex, once per period
      mesh.position.y = R + H * s;
      // Squash for ~0.08 s around contact.
      const nearGround = Math.min(1, (H * s) / 0.06);
      const sq = 1 - nearGround;
      mesh.scale.set(1 + 0.15 * sq, 1 - 0.25 * sq, 1 + 0.15 * sq);
      mesh.rotation.y = t * BALL.SPIN + phase * 6;
      mesh.rotation.z = 0.25 * Math.sin(t * 0.9 + phase * 4);
    },
    collect() {
      ball.collected = true;
      mesh.visible = false;
    },
  };
  return ball;
}
