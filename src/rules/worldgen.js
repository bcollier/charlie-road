// Procedural row generator. Emits plain row descriptors, one at a time, from
// a seeded RNG, honouring the fairness invariants in SPEC.md §6:
//
//   1. the first START_SAFE_ROWS rows are empty grass
//   2. never more than maxHazardRun(difficulty) consecutive hazard rows
//   3. every road lane keeps a gap ≥ max(MIN_GAP, vehicleGapMin), wrap included
//   4. every river row keeps every platform gap ≤ MAX_PLATFORM_GAP, wrap included
//   5. every grass row leaves ≥ 2 free columns, none at x=0 near the start,
//      and shares ≥ 3 free columns with an adjacent grass row
//   6. vehicles never overlap, wrap included
//
// Difficulty is a function of the row index, since the score on reaching a
// row is approximately that index. Pure: no three.js, no DOM.

import { FIELD, DIFF, VEHICLES, RIVER, RAIL, BALL, GOLDEN, CATERPILLAR, SQUIRREL } from '../config.js';
import { VEHICLE_COLORS } from '../palette.js';
import { createRng } from './rng.js';
import { difficulty } from './difficulty.js';

export const LANE_HALF = 12;                 // movers wrap within [-12, 12)
export const WALL_MIN = FIELD.MIN_X - 6;     // decorative tree wall beyond the field
export const WALL_MAX = FIELD.MAX_X + 6;
export const MIN_SHARED_FREE = 3;

const FIELD_COLS = [];
for (let x = FIELD.MIN_X; x <= FIELD.MAX_X; x++) FIELD_COLS.push(x);

const VEHICLE_KINDS = { car: 0.6, truck: 0.2, bus: 0.2 };

export function createGenerator(seed) {
  const rng = createRng(seed);
  const st = {
    index: 0,
    pending: [],
    hazardRun: 0,
    runStart: 0,           // row index where the current hazard run began
    prevGrassFree: null,   // Set of free columns in the previous row, if grass
  };

  function wall() {
    const w = [];
    for (let x = WALL_MIN; x <= WALL_MAX; x++) {
      if (x >= FIELD.MIN_X && x <= FIELD.MAX_X) continue;
      if (rng.chance(0.85)) w.push({ x, kind: 'tree', height: rng.int(1, 3) });
    }
    return w;
  }

  function grassRow(i, empty, afterHazard = false) {
    const d = difficulty(i);
    let obstacles = [];
    if (!empty) {
      const maxCount = 2 + Math.round(d.t * 2);            // 2 → 4
      const count = rng.int(0, maxCount);
      const cols = FIELD_COLS.slice();
      for (let n = 0; n < count && cols.length; n++) {
        const k = rng.int(0, cols.length - 1);
        const x = cols.splice(k, 1)[0];
        if (x === 0 && i < FIELD.START_SAFE_ROWS + 2) continue;
        obstacles.push({ x, kind: rng.chance(0.8) ? 'tree' : 'rock', height: rng.int(1, 3) });
      }
      // Invariant 5: keep ≥ 2 free columns and ≥ 3 shared with the previous
      // grass row, so a walkable path always exists between them.
      const free = () => new Set(FIELD_COLS.filter(x => !obstacles.some(o => o.x === x)));
      const shared = (f) => st.prevGrassFree ? [...f].filter(x => st.prevGrassFree.has(x)).length : Infinity;
      while (obstacles.length && (free().size < 2 || shared(free()) < MIN_SHARED_FREE)) obstacles.pop();
    }
    const free = new Set(FIELD_COLS.filter(x => !obstacles.some(o => o.x === x)));
    st.prevGrassFree = free;
    let ball = null;
    if (!empty && rng.chance(BALL.SPAWN_CHANCE)) {
      const open = [...free];
      // Golden balls favour the first grass after a hazard run: the reward
      // sits just past the risk.
      const golden = rng.chance(afterHazard ? GOLDEN.CHANCE_AFTER_HAZARD : GOLDEN.CHANCE_ANYWHERE);
      ball = { x: rng.pick(open), golden };
    }
    // Critters: a caterpillar or a squirrel crossing this row, occasionally.
    let critter = null;
    if (!empty && i >= CATERPILLAR.MIN_ROW && rng.chance(CATERPILLAR.CHANCE)) critter = { kind: 'caterpillar', dir: rng.chance(0.5) ? 1 : -1, delay: rng.range(0, 4) };
    else if (!empty && i >= SQUIRREL.MIN_ROW && rng.chance(SQUIRREL.CHANCE)) critter = { kind: 'squirrel', dir: rng.chance(0.5) ? 1 : -1, delay: rng.range(0, 3) };
    return { index: i, type: 'grass', obstacles, wall: wall(), ball, critter };
  }

  function roadRow(i, laneIndex, laneCount) {
    const d = difficulty(i);
    const dir = rng.chance(0.5) ? 1 : -1;
    const speed = rng.range(d.vehicleSpeed[0], d.vehicleSpeed[1]);
    const gapMin = d.vehicleGapMin;
    const L = LANE_HALF * 2;
    const start = rng.range(-LANE_HALF, -LANE_HALF + gapMin);
    const vehicles = [];
    let x = start;
    // Every gap, including the one across the wrap seam, is ≥ gapMin (invariant 3, 6).
    for (;;) {
      const kind = rng.weighted(VEHICLE_KINDS);
      const len = VEHICLES[kind].len;
      if (x + len + gapMin > start + L) break;
      vehicles.push({ x0: x + len / 2, kind, color: rng.pick(VEHICLE_COLORS) });
      x += len + gapMin + rng.range(0, gapMin * 0.8);
    }
    let ball = null;
    if (rng.chance(BALL.SPAWN_CHANCE)) ball = { x: rng.int(FIELD.MIN_X, FIELD.MAX_X) };
    st.prevGrassFree = null;
    return { index: i, type: 'road', dir, speed, vehicles, laneIndex, laneCount, ball };
  }

  function riverRow(i, laneIndex, laneCount) {
    const d = difficulty(i);
    const dir = rng.chance(0.5) ? 1 : -1;
    const speed = rng.range(d.logSpeed[0], d.logSpeed[1]);
    const L = LANE_HALF * 2;
    const MAXG = RIVER.MAX_PLATFORM_GAP;
    const start = rng.range(-LANE_HALF, -LANE_HALF + 1);
    const platforms = [];
    let x = start;
    for (;;) {
      const lily = rng.chance(0.25);
      const len = lily ? RIVER.LILYPAD_LEN : rng.pick(RIVER.LOG_LENGTHS);
      if (x + len > start + L) break;
      platforms.push({ x0: x + len / 2, len, kind: lily ? 'lilypad' : 'log' });
      x += len + rng.range(1.0, MAXG);
    }
    // Invariant 4: close the wrap seam with lily pads until its gap ≤ MAXG.
    let lastEnd = platforms[platforms.length - 1].x0 + platforms[platforms.length - 1].len / 2;
    let trailing = start + L - lastEnd;
    while (trailing > MAXG) {
      const gap = rng.range(1.0, Math.min(MAXG, trailing - 1));
      const px = lastEnd + gap;
      platforms.push({ x0: px + 0.5, len: 1, kind: 'lilypad' });
      lastEnd = px + 1;
      trailing = start + L - lastEnd;
    }
    st.prevGrassFree = null;
    return { index: i, type: 'river', dir, speed, platforms, laneIndex, laneCount, ball: null };
  }

  function railRow(i, laneIndex, laneCount) {
    st.prevGrassFree = null;
    return {
      index: i, type: 'rail', laneIndex, laneCount,
      warn: rng.range(RAIL.WARN[0], RAIL.WARN[1]),
      cooldown: rng.range(RAIL.COOLDOWN[0], RAIL.COOLDOWN[1]),
      phase: rng.range(0, 4),
      dir: rng.chance(0.5) ? 1 : -1,
      ball: null,
    };
  }

  function planGroup() {
    const i = st.index;
    if (i < FIELD.START_SAFE_ROWS) {
      st.pending.push(grassRow(i, true));
      st.index++;
      st.hazardRun = 0;
      return;
    }
    const d = difficulty(i);
    // Invariant 2 is judged against the difficulty where the current hazard
    // run BEGAN, not the current row: a player who entered a run at score 99
    // was promised at most 2 rows, and crossing 100 mid-run must not extend it.
    const runCap = st.hazardRun > 0 ? difficulty(st.runStart).maxHazardRun : d.maxHazardRun;
    let type = 'grass';
    if (st.hazardRun < runCap && rng.chance(d.hazardChance)) type = rng.weighted(DIFF.HAZARD_WEIGHTS);

    if (type === 'grass') {
      const size = rng.int(DIFF.GROUP.grass[0], DIFF.GROUP.grass[1]);
      for (let k = 0; k < size; k++) st.pending.push(grassRow(st.index++, false, k === 0 && st.hazardRun > 0));
      st.hazardRun = 0;
      return;
    }
    if (st.hazardRun === 0) st.runStart = i;
    let size = rng.int(DIFF.GROUP[type][0], DIFF.GROUP[type][1]);
    size = Math.max(1, Math.min(size, runCap - st.hazardRun));
    for (let k = 0; k < size; k++) {
      const idx = st.index++;
      if (type === 'road') st.pending.push(roadRow(idx, k, size));
      else if (type === 'river') st.pending.push(riverRow(idx, k, size));
      else st.pending.push(railRow(idx, k, size));
    }
    st.hazardRun += size;
  }

  return {
    seed,
    next() {
      if (!st.pending.length) planGroup();
      return st.pending.shift();
    },
    get index() { return st.index; },
  };
}

/** Generate the first n rows of a seed — used by the tests. */
export function generateRows(seed, n) {
  const g = createGenerator(seed);
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(g.next());
  return rows;
}
