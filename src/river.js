// Log riding. On landing in a river row Charlie either attaches to the
// platform under him — and from then on drifts with it at a fractional x —
// or drowns. Drifting past the field edge drowns him too. The hop state
// machine reads p.x each step, so subsequent hops start from wherever the
// log has carried him. See SPEC.md §5.6.

import { FIELD } from './config.js';
import { findPlatform } from './rules/collide.js';

const OFF_FIELD = 0.6;   // how far past the last column the log may carry him

export function createRiverSystem(world, die) {
  return {
    /** Called by the player state machine the instant a hop completes. */
    onLanded(p) {
      const row = world.row(p.row);
      if (!row || row.desc.type !== 'river') { p.onPlatform = null; return; }
      const plat = findPlatform(p.x, row.platforms);
      if (!plat) { die('drowned'); return; }
      p.onPlatform = { row: p.row, plat, offset: p.x - plat.x };
    },

    /** Runs after world.update(t) and before the player step: carry him. */
    update(p) {
      if (!p.onPlatform || p.hop || !p.alive) return;
      p.x = p.onPlatform.plat.x + p.onPlatform.offset;
      if (p.x < FIELD.MIN_X - OFF_FIELD || p.x > FIELD.MAX_X + OFF_FIELD) die('drowned');
    },
  };
}
