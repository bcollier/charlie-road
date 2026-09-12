// The bark. B key, the on-screen button, or a phone shake. Every vehicle in
// Charlie's row and the next BARK.ROWS_AHEAD rows slams to a stop for
// BARK.FREEZE seconds (trains are unimpressed), and a saucer that is still
// only searching for him gets scared off. Cooldown BARK.COOLDOWN.

import { BARK } from './config.js';

export function createBark({ world, audio, particles, saucer }) {
  let readyAt = 0;
  let lastShake = -1e9;
  let shakeStarted = false;

  const api = {
    /** 0 → just barked, 1 → ready. For the button's fill. */
    charge(t) { return Math.min(1, Math.max(0, 1 - (readyAt - t) / BARK.COOLDOWN)); },
    ready(t) { return t >= readyAt; },
    reset() { readyAt = 0; },

    /** Returns true if the bark happened. */
    bark(t, p) {
      if (t < readyAt) { audio.blocked(); return false; }
      readyAt = t + BARK.COOLDOWN;
      const here = Math.round(-p.pz);
      let stopped = 0;
      for (let i = here; i <= here + BARK.ROWS_AHEAD; i++) {
        const r = world.row(i);
        if (r && r.desc.type === 'road') { r.freeze(t, BARK.FREEZE); stopped += r.vehicles.length; }
      }
      audio.barkCommand();
      if (stopped) audio.screech();
      particles.spawn('bark', p.px, 0.55, p.pz);
      if (saucer && saucer.state.phase === 'warn') saucer.scare();
      p.idle = 0;
      return true;
    },

    /**
     * Shake-to-bark. iOS requires DeviceMotionEvent.requestPermission() from a
     * user gesture, so `request()` must be called from a tap; elsewhere the
     * listener starts immediately.
     */
    installShake(onShake) {
      const handler = (e) => {
        const a = e.acceleration || e.accelerationIncludingGravity;
        if (!a) return;
        const base = e.acceleration ? 0 : 9.81;
        const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
        const nowMs = performance.now();
        if (Math.abs(mag - base) > BARK.SHAKE_G && nowMs - lastShake > BARK.SHAKE_DEBOUNCE * 1000) {
          lastShake = nowMs;
          onShake();
        }
      };
      const start = () => { if (shakeStarted) return; shakeStarted = true; window.addEventListener('devicemotion', handler); };
      const DME = window.DeviceMotionEvent;
      if (DME && typeof DME.requestPermission === 'function') {
        return {
          needsGesture: true,
          request() { DME.requestPermission().then((s) => { if (s === 'granted') start(); }).catch(() => {}); },
        };
      }
      if (DME) start();
      return { needsGesture: false, request() {} };
    },
  };
  return api;
}
