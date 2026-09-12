// Charlie's hop state machine: buffered input, one tile per hop, sine arc,
// landing squash, facing, idle timer, and the cosmetic-only celebration.
// Logical position is (x, row); rendered position is (px, py, pz). Everything
// that could kill him (collision, water, eagle) reads the rendered position
// every step. See SPEC.md §5.1–5.4.

import { PLAYER, FIELD, BALL } from './config.js';

const DIRS = {
  up:    { dx: 0,  drow: 1,  angle: 0 },
  right: { dx: 1,  drow: 0,  angle: -Math.PI / 2 },
  down:  { dx: 0,  drow: -1, angle: Math.PI },
  left:  { dx: -1, drow: 0,  angle: Math.PI / 2 },
};

export function createPlayer() {
  return {
    x: 0, row: 0,               // logical tile (x fractional while riding a log)
    px: 0, py: 0, pz: 0,        // rendered world position
    vx: 0, vy: 0,               // rendered velocity, for the ear springs
    facing: 'up',
    facingAngle: 0,
    hop: null,                  // { fromX, fromRow, toX, toRow, t }
    queue: [],
    squash: 0,                  // seconds of landing squash remaining
    scale: [1, 1, 1],
    idle: 0,                    // seconds since the last successful move
    hopsChained: 0,             // consecutive hops without idling (hop pitch)
    celebrate: -1,              // -1 idle, else 0..1 progress
    carrying: false,
    alive: true,
    onPlatform: null,           // set by the river system when riding a log
    moved: false,               // has the player ever moved (starts auto-scroll)
    lastHopAt: -1,
  };
}

/** Queue a move if the buffer has room. Returns true if accepted. */
export function queueMove(p, dir) {
  if (!p.alive || !DIRS[dir]) return false;
  if (p.queue.length >= PLAYER.INPUT_BUFFER) return false;
  p.queue.push(dir);
  return true;
}

export function clearQueue(p) {
  p.queue.length = 0;
}

/** Start the celebration layer. Never blocks input. */
export function celebrate(p) {
  p.celebrate = 0;
  p.carrying = true;
}

/**
 * Advance the player one step.
 * @param p player
 * @param dt seconds
 * @param world { canMoveTo(x, row) -> bool, minRow: number, time: number }
 */
export function updatePlayer(p, dt, world) {
  const prevPx = p.px, prevPy = p.py;

  // Celebration progress (cosmetic layer; runs regardless of hop state).
  if (p.celebrate >= 0) {
    p.celebrate += dt / BALL.CELEBRATE_DURATION;
    if (p.celebrate >= 1) p.celebrate = -1;
  }

  if (p.hop) {
    const h = p.hop;
    h.t += dt / PLAYER.HOP_DURATION;
    const t = Math.min(1, h.t);
    // Riding a log: the origin drifts with the platform, so hop relative to it.
    p.px = h.fromX + (h.toX - h.fromX) * t;
    p.pz = -(h.fromRow + (h.toRow - h.fromRow) * t);
    let arc = Math.sin(Math.PI * t) * PLAYER.HOP_HEIGHT;
    if (p.celebrate >= 0) arc += Math.sin(Math.PI * p.celebrate) * BALL.CELEBRATE_LIFT;
    p.py = arc;
    if (h.t >= 1) {
      p.x = h.toX;
      p.row = h.toRow;
      p.hop = null;
      p.squash = PLAYER.SQUASH_TIME;
      p.py = 0;
    }
  } else {
    // Standing (possibly drifting on a platform, which updates p.x directly).
    p.px = p.x;
    p.pz = -p.row;
    let lift = 0;
    if (p.celebrate >= 0) lift = Math.sin(Math.PI * p.celebrate) * BALL.CELEBRATE_LIFT;
    p.py = lift;
    p.idle += dt;
  }

  // Landing squash, then relax.
  if (p.squash > 0) {
    p.squash -= dt;
    const k = Math.max(0, p.squash / PLAYER.SQUASH_TIME);
    p.scale = [1 + (PLAYER.SQUASH_SCALE[0] - 1) * k, 1 + (PLAYER.SQUASH_SCALE[1] - 1) * k, 1 + (PLAYER.SQUASH_SCALE[2] - 1) * k];
  } else {
    p.scale = [1, 1, 1];
  }

  // Consume the buffer when free to hop.
  if (!p.hop && p.queue.length && p.alive) {
    const dir = p.queue.shift();
    const d = DIRS[dir];
    p.facing = dir;
    p.facingAngle = d.angle;
    // Hop from the fractional position (on a log) to the nearest tile in that direction.
    const toX = d.dx !== 0 ? Math.round(p.x) + d.dx : Math.round(p.x);
    const toRow = p.row + d.drow;
    const inField = toX >= FIELD.MIN_X && toX <= FIELD.MAX_X && toRow >= (world.minRow ?? 0);
    if (inField && world.canMoveTo(toX, toRow)) {
      p.hop = { fromX: p.x, fromRow: p.row, toX, toRow, t: 0 };
      p.onPlatform = null;
      p.hopsChained = (world.time - p.lastHopAt) < 0.5 ? p.hopsChained + 1 : 0;
      p.lastHopAt = world.time;
      p.idle = 0;
      p.moved = true;
      world.onHop && world.onHop(p, dir);
    } else {
      // Blocked: still face that way and reset idle (a bump counts as intent).
      p.idle = 0;
      world.onBlocked && world.onBlocked(p, dir);
    }
  }

  // Velocities for the ear physics.
  if (dt > 0) {
    p.vx = (p.px - prevPx) / dt;
    p.vy = (p.py - prevPy) / dt;
  }
}
