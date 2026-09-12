// The world: instantiates rows from the generator ahead of the camera,
// recycles them behind it, and answers movement and collision queries.
// Row r sits at z = -r. Rivers and rails plug in during Blocks 3–4.

import { FIELD } from './config.js';
import { createGenerator } from './rules/worldgen.js';
import { createGrassRow } from './rows/grass.js';
import { createRoadRow } from './rows/road.js';
import { createRiverRow } from './rows/river.js';
import { createRailRow } from './rows/rail.js';
import { createBall } from './balls.js';

const BUILDERS = {
  grass: createGrassRow,
  road: createRoadRow,
  river: createRiverRow,
  rail: createRailRow,
};

export function createWorld(scene, seed, extraBuilders = {}) {
  const builders = { ...BUILDERS, ...extraBuilders };
  let gen = createGenerator(seed);
  const rows = new Map();   // index → row instance

  function instantiate(desc) {
    const build = builders[desc.type] || builders.grass;
    const row = build(desc);
    row.ball = null;
    if (desc.ball) {
      row.ball = createBall(desc.ball.x, desc.index, (desc.index * 0.37) % 1);
      row.group.add(row.ball.mesh);
    }
    rows.set(desc.index, row);
    scene.add(row.group);
    return row;
  }

  const world = {
    seed,
    rows,

    /**
     * Keep ROWS_AHEAD rows generated past `frontRow`; drop those far behind
     * `backRow`. Rows outside the visible band are hidden rather than drawn:
     * a merged row is 25 tiles wide, so its bounding sphere never leaves the
     * frustum and three.js would draw every generated row (twice, with the
     * shadow pass). `visBehind`/`visAhead` come from the camera's frustum.
     */
    ensure(frontRow, backRow, visLo = -Infinity, visHi = Infinity) {
      while (gen.index <= frontRow + FIELD.ROWS_AHEAD) instantiate(gen.next());
      const cutoff = Math.floor(backRow) - FIELD.ROWS_BEHIND_KEEP;
      const lo = visLo, hi = visHi;
      for (const [i, row] of rows) {
        if (i < cutoff) { row.dispose(); rows.delete(i); continue; }
        row.group.visible = i >= lo && i <= hi;
      }
    },

    row(i) { return rows.get(i) || null; },

    obstacleAt(x, i) {
      const r = rows.get(i);
      if (!r || r.desc.type !== 'grass') return false;
      return r.desc.obstacles.some(o => o.x === x);
    },

    isWater(i) {
      const r = rows.get(i);
      return !!r && r.desc.type === 'river';
    },

    canMoveTo(x, i) {
      if (x < FIELD.MIN_X || x > FIELD.MAX_X || i < 0) return false;
      const r = rows.get(i);
      if (!r) return false;
      return !world.obstacleAt(x, i);
    },

    /** Advance every dynamic row to simulated time t. */
    update(t) {
      for (const r of rows.values()) { r.update(t); if (r.ball) r.ball.update(t); }
      // A rail group shares one signal, on its first track: it flashes if
      // any track in the group is in its warning window.
      for (const r of rows.values()) {
        if (r.desc.type !== 'rail' || !r.signal) continue;
        let warn = false;
        for (let k = 0; k < r.desc.laneCount; k++) {
          const q = rows.get(r.desc.index + k);
          if (q && q.state === 'warn') { warn = true; break; }
        }
        r.setSignal(warn, t);
      }
    },

    /** True if a train is in its warning window on any track of the group containing row i. */
    trainWarning(i) {
      const r = rows.get(i);
      if (!r || r.desc.type !== 'rail') return false;
      const first = i - r.desc.laneIndex;
      for (let k = 0; k < r.desc.laneCount; k++) {
        const q = rows.get(first + k);
        if (q && q.state === 'warn') return true;
      }
      return false;
    },

    reset(newSeed) {
      for (const r of rows.values()) r.dispose();
      rows.clear();
      world.seed = newSeed;
      gen = createGenerator(newSeed);
    },
  };
  return world;
}
