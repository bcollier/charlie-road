// difficulty(score) → every score-dependent tunable, from one clamped ramp.
// t = min(score, 300) / 300. Pure: no three.js, no DOM. See SPEC.md §3.4, §3.6.

import { DIFF, SAUCER } from '../config.js';

const lerp = (a, b, t) => a + (b - a) * t;

export function difficulty(score) {
  const t = Math.max(0, Math.min(1, score / DIFF.SCORE_CAP));
  const gapMin = Math.max(DIFF.MIN_GAP, lerp(DIFF.VEHICLE_GAP_MIN.start, DIFF.VEHICLE_GAP_MIN.end, t));
  return {
    t,
    vehicleSpeed: [
      lerp(DIFF.VEHICLE_SPEED.start[0], DIFF.VEHICLE_SPEED.end[0], t),
      lerp(DIFF.VEHICLE_SPEED.start[1], DIFF.VEHICLE_SPEED.end[1], t),
    ],
    vehicleGapMin: gapMin,
    logSpeed: [
      lerp(DIFF.LOG_SPEED.start[0], DIFF.LOG_SPEED.end[0], t),
      lerp(DIFF.LOG_SPEED.start[1], DIFF.LOG_SPEED.end[1], t),
    ],
    hazardChance: lerp(DIFF.HAZARD_CHANCE.start, DIFF.HAZARD_CHANCE.end, t),
    maxHazardRun: Math.floor(lerp(DIFF.MAX_HAZARD_RUN.start, DIFF.MAX_HAZARD_RUN.end, t)),
    autoScroll: lerp(DIFF.AUTO_SCROLL.start, DIFF.AUTO_SCROLL.end, t),
    idleLimit: idleLimit(score),
  };
}

/** Saucer idle window: piecewise-linear over SAUCER.IDLE_LIMIT, clamped. */
export function idleLimit(score) {
  const pts = SAUCER.IDLE_LIMIT;
  if (score <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [s0, v0] = pts[i - 1];
    const [s1, v1] = pts[i];
    if (score <= s1) return lerp(v0, v1, (score - s0) / (s1 - s0));
  }
  return pts[pts.length - 1][1];
}
