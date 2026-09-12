// Camera follow and auto-scroll.
//
// The view target damps toward a desired point that follows Charlie's x
// (clamped so the field edge never shows) and the greater of his row and a
// scroll frontier that creeps forward once he has moved. He sits ~65% down
// the screen — the lead is a fraction of the frustum so it holds across
// aspects. If he falls behind the trailing visible row, the eagle comes.

import { CAM, FIELD, ROW_SCREEN_Y, TILE_SCREEN_X } from './config.js';

const PLAYER_SCREEN_FRAC = 0.30;   // fraction of half-height below centre
const SCROLL_START_DELAY = 1.0;    // seconds after the first move
const SCROLL_MAX_LAG = 2;          // frontier never falls further behind than this

export function createCamera(view) {
  const cam = {
    x: 0,
    row: 0,
    scrollRow: 0,
    scrolling: false,
    scrollDelay: SCROLL_START_DELAY,
    leadRows: 0,

    reset() {
      cam.x = 0; cam.row = 0; cam.scrollRow = 0;
      cam.scrolling = false; cam.scrollDelay = SCROLL_START_DELAY;
      cam.apply(true);
    },

    /** Rows visible below the target: the trailing edge, for the eagle. */
    trailingRow() {
      const f = view.frustum;
      const rowsBelow = (f.halfH + f.halfH * PLAYER_SCREEN_FRAC) / ROW_SCREEN_Y;
      return cam.row + cam.leadRows - rowsBelow;
    },

    update(dt, player, autoScrollSpeed) {
      const f = view.frustum;
      cam.leadRows = (f.halfH * PLAYER_SCREEN_FRAC) / ROW_SCREEN_Y;

      // Auto-scroll frontier.
      if (player.moved && !cam.scrolling) {
        cam.scrollDelay -= dt;
        if (cam.scrollDelay <= 0) cam.scrolling = true;
      }
      if (cam.scrolling) cam.scrollRow += autoScrollSpeed * dt;
      if (cam.scrollRow < player.row - SCROLL_MAX_LAG) cam.scrollRow = player.row - SCROLL_MAX_LAG;

      const desiredRow = Math.max(-player.pz, cam.scrollRow);

      // Follow x, but never show past the field edge.
      const visHalf = Math.min(f.halfW / TILE_SCREEN_X, (FIELD.MAX_X - FIELD.MIN_X) / 2);
      const lo = FIELD.MIN_X + visHalf, hi = FIELD.MAX_X - visHalf;
      const desiredX = lo > hi ? 0 : Math.min(hi, Math.max(lo, player.px));

      const k = 1 - Math.exp(-CAM.LERP_K * dt);
      cam.x += (desiredX - cam.x) * k;
      cam.row += (desiredRow - cam.row) * k;
      cam.apply(false);
    },

    apply(snap) {
      view.setTarget(cam.x, 0, -(cam.row + cam.leadRows));
    },
  };
  return cam;
}
