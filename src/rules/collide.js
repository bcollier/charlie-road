// Collision and platform maths. Everything takes centres and full sizes in
// tiles. Pure: no three.js, no DOM. See SPEC.md §5.5–5.6.

import { VEHICLES, RIVER } from '../config.js';

/** Do two 1-D spans (centre, full width) overlap? */
export function spansOverlap(ax, aw, bx, bw) {
  return Math.abs(ax - bx) < (aw + bw) / 2;
}

/** Axis-aligned overlap of two footprints {x, z, w, d} (centres, full sizes). */
export function aabb(a, b) {
  return spansOverlap(a.x, a.w, b.x, b.w) && spansOverlap(a.z, a.d, b.z, b.d);
}

/** Charlie's footprint at a rendered position. */
export function playerBox(px, pz) {
  return { x: px, z: pz, w: 0.44, d: 0.54 };
}

/** A vehicle's forgiving hitbox at its current x on row z. */
export function vehicleBox(x, rowZ, kind) {
  const v = VEHICLES[kind];
  return { x, z: rowZ, w: v.len * VEHICLES.HITBOX_LEN, d: v.w * VEHICLES.HITBOX_W };
}

/** Wrap a lane coordinate into [-half, half). */
export function wrapLane(x, half) {
  const L = half * 2;
  return ((((x + half) % L) + L) % L) - half;
}

/**
 * Find the platform (log/lily pad) under x, if any. Platforms are
 * { x, len }; attachment tolerates ATTACH_TOLERANCE beyond the half-length.
 */
export function findPlatform(x, platforms) {
  for (const p of platforms) {
    if (Math.abs(x - p.x) <= p.len / 2 + RIVER.ATTACH_TOLERANCE) return p;
  }
  return null;
}
