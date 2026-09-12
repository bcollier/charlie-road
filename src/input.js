// Keyboard, tap and swipe. Tap = forward, swipe ≥ 24 px = that direction.
// Arrow keys and space are prevented from scrolling the page. See SPEC.md §7.

// Keyed on both `code` and `key`: some virtual keyboards, IMEs and synthetic
// events set only one of them.
const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', KeyS: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', KeyA: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', KeyD: 'right', d: 'right', D: 'right',
};
const KEY_ACTION = new Set(['Space', 'Enter', ' ']);
const KEY_PAUSE = new Set(['Escape', 'KeyP', 'p', 'P']);
const KEY_MUTE = new Set(['KeyM', 'm', 'M']);
const KEY_BARK = new Set(['KeyB', 'b', 'B']);

const SWIPE_PX = 24;

/**
 * @param {object} h handlers: onMove(dir), onAction(), onPause(), onMute()
 * @param {HTMLElement} surface element receiving pointer input
 */
export function createInput(h, surface) {
  function onKey(e) {
    const dir = KEY_DIRS[e.code] || KEY_DIRS[e.key];
    if (dir) {
      e.preventDefault();
      if (!e.repeat) h.onMove(dir);
      return;
    }
    if (KEY_ACTION.has(e.code) || KEY_ACTION.has(e.key)) {
      e.preventDefault();
      if (!e.repeat) h.onAction();
    } else if (KEY_PAUSE.has(e.code) || KEY_PAUSE.has(e.key)) {
      if (!e.repeat) h.onPause();
    } else if (KEY_MUTE.has(e.code) || KEY_MUTE.has(e.key)) {
      if (!e.repeat) h.onMute();
    } else if (KEY_BARK.has(e.code) || KEY_BARK.has(e.key)) {
      e.preventDefault();
      if (!e.repeat && h.onBark) h.onBark();
    }
  }
  window.addEventListener('keydown', onKey);

  // Pointer: one gesture at a time. Tap → forward; swipe → direction.
  let start = null;
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  }
  function up(e) {
    if (!start || (start.id !== undefined && e.pointerId !== start.id)) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < SWIPE_PX) {
      h.onTap ? h.onTap() : h.onMove('up');
      return;
    }
    if (adx > ady) h.onMove(dx > 0 ? 'right' : 'left');
    else h.onMove(dy > 0 ? 'down' : 'up');
  }
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', () => { start = null; });

  return {
    dispose() {
      window.removeEventListener('keydown', onKey);
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointerup', up);
    },
  };
}
