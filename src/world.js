// The world: instantiates rows from the generator ahead of the camera,
// recycles them behind it, and answers movement and collision queries.
// Row r sits at z = -r. Rivers and rails plug in during Blocks 3–4.

import { FIELD } from './config.js';
import { createGenerator } from './rules/worldgen.js';
import { createGrassRow } from './rows/grass.js';
import { createRoadRow } from './rows/road.js';
import { createRiverRow } from './rows/river.js';
import { createPlaceholderRow } from './rows/placeholder.js';

const BUILDERS = {
  grass: createGrassRow,
  road: createRoadRow,
  river: createRiverRow,
  rail: createPlaceholderRow,    // real builder lands in Block 4
};

export function createWorld(scene, seed, extraBuilders = {}) {
  const builders = { ...BUILDERS, ...extraBuilders };
  let gen = createGenerator(seed);
  const rows = new Map();   // index → row instance

  function instantiate(desc) {
    const build = builders[desc.type] || builders.grass;
    const row = build(desc);
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
      for (const r of rows.values()) r.update(t);
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
