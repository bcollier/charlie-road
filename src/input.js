// Keyboard, tap and swipe. Tap = forward, swipe ≥ 24 px = that direction.
// Arrow keys and space are prevented from scrolling the page. See SPEC.md §7.

const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const SWIPE_PX = 24;

/**
 * @param {object} h handlers: onMove(dir), onAction(), onPause(), onMute()
 * @param {HTMLElement} surface element receiving pointer input
 */
export function createInput(h, surface) {
  function onKey(e) {
    const dir = KEY_DIRS[e.code];
    if (dir) {
      e.preventDefault();
      if (!e.repeat) h.onMove(dir);
      return;
    }
    switch (e.code) {
      case 'Space':
      case 'Enter':
        e.preventDefault();
        if (!e.repeat) h.onAction();
        break;
      case 'Escape':
      case 'KeyP':
        if (!e.repeat) h.onPause();
        break;
      case 'KeyM':
        if (!e.repeat) h.onMute();
        break;
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
