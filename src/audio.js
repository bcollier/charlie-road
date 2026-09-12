// Synthesised sound effects — WebAudio only, no asset files. The context is
// created lazily on the first user gesture (autoplay policy). Mute persists.
// See SPEC.md §8.

import { storage } from './storage.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let muted = storage.get('muted', false);

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  const now = () => ctx.currentTime;

  function env(node, t0, a, peak, d, end = 0.0001) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(end, t0 + a + d);
  }

  function tone(type, f0, f1, dur, peak, t0 = now(), filter = null) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, 0.005, peak, dur);
    o.connect(g);
    if (filter) { g.connect(filter); filter.connect(master); } else g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, peak, t0 = now(), filterType = 'lowpass', f0 = 2000, f1 = 300) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, 0.005, peak, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0);
    s.stop(t0 + dur + 0.05);
  }

  const api = {
    get muted() { return muted; },
    /** Call on any user gesture so the context can start. */
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      storage.set('muted', muted);
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, now(), 0.02);
      return muted;
    },

    hop(chain = 0) {
      if (!ensure()) return;
      const f = 380 * Math.pow(1.045, Math.min(chain, 12));
      tone('square', f, f * 1.25, 0.07, 0.12);
    },
    blocked() {
      if (!ensure()) return;
      tone('square', 160, 120, 0.06, 0.08);
    },
    ballPickup() {
      if (!ensure()) return;
      const t = now();
      tone('sine', 880, 880, 0.07, 0.18, t);
      tone('sine', 1320, 1320, 0.1, 0.18, t + 0.07);
      api.bark(t + 0.16);
    },
    bark(t0 = now()) {
      if (!ensure()) return;
      for (let i = 0; i < 2; i++) {
        const t = t0 + i * 0.13;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.2;
        tone('sawtooth', 320, 170, 0.09, 0.22, t, bp);
        noise(0.06, 0.12, t, 'bandpass', 900, 500);
      }
    },
    squash() {
      if (!ensure()) return;
      const t = now();
      tone('sine', 130, 45, 0.16, 0.35, t);
      noise(0.12, 0.2, t, 'lowpass', 1200, 200);
    },
    splash() {
      if (!ensure()) return;
      noise(0.38, 0.28, now(), 'lowpass', 3200, 250);
    },
    trainHorn() {
      if (!ensure()) return;
      const t = now();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      tone('sawtooth', 220, 220, 0.6, 0.14, t, lp);
      const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 1400;
      tone('sawtooth', 277, 277, 0.6, 0.12, t, lp2);
    },
    signalDing() {
      if (!ensure()) return;
      tone('sine', 1760, 1700, 0.11, 0.1);
    },
    eagleScreech() {
      if (!ensure()) return;
      const t = now();
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(1500, t);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.5);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 28;
      const lg = ctx.createGain(); lg.gain.value = 45;
      lfo.connect(lg); lg.connect(o.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2;
      const g = ctx.createGain(); env(g, t, 0.02, 0.2, 0.5);
      o.connect(bp); bp.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    newBest() {
      if (!ensure()) return;
      const t = now();
      [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.1, 0.1, t + i * 0.09));
    },
    whoosh() {
      if (!ensure()) return;
      noise(0.25, 0.12, now(), 'bandpass', 600, 2400);
    },

    // ---- Round two -----------------------------------------------------------
    /** The big commanding WOOF for the bark button. */
    barkCommand() {
      if (!ensure()) return;
      const t = now();
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.9;
      tone('sawtooth', 300, 130, 0.18, 0.4, t, bp);
      noise(0.12, 0.22, t, 'bandpass', 800, 400);
      const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 480; bp2.Q.value = 0.9;
      tone('sawtooth', 260, 120, 0.16, 0.34, t + 0.17, bp2);
    },
    /** Brakes locking up. */
    screech() {
      if (!ensure()) return;
      const t = now();
      noise(0.38, 0.18, t, 'bandpass', 2600, 1900);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(1900, t); o.frequency.linearRampToValueAtTime(1500, t + 0.35);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 40; const lg = ctx.createGain(); lg.gain.value = 120;
      lfo.connect(lg); lg.connect(o.frequency);
      const g = ctx.createGain(); env(g, t, 0.01, 0.07, 0.35);
      o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.4); lfo.stop(t + 0.4);
    },
    /** A rubber squeaky toy: in-breath and out-breath. */
    squeak(t0 = now()) {
      if (!ensure()) return;
      tone('sine', 900, 1500, 0.12, 0.22, t0);
      tone('sine', 1300, 650, 0.16, 0.18, t0 + 0.13);
    },
    squeakSeries(n = 3) {
      if (!ensure()) return;
      const t = now();
      for (let i = 0; i < n; i++) api.squeak(t + i * 0.34);
    },
    /** Pickup ding whose pitch climbs with the combo. */
    comboPickup(mult = 1) {
      if (!ensure()) return;
      const t = now();
      const k = Math.pow(1.12, Math.max(0, mult - 1));
      tone('sine', 880 * k, 880 * k, 0.07, 0.18, t);
      tone('sine', 1320 * k, 1320 * k, 0.1, 0.18, t + 0.07);
      api.bark(t + 0.16);
    },
    /** Unlock jingle: rising arpeggio with a shimmer on top. */
    unlock() {
      if (!ensure()) return;
      const t = now();
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.14, 0.12, t + i * 0.08));
      tone('sine', 2093, 2637, 0.5, 0.06, t + 0.4);
    },
    /** Zoomies: a rising whoosh. */
    zoomies() {
      if (!ensure()) return;
      const t = now();
      noise(0.5, 0.16, t, 'bandpass', 400, 3200);
      tone('sine', 300, 900, 0.4, 0.08, t);
    },
    squirrelChitter() {
      if (!ensure()) return;
      const t = now();
      for (let i = 0; i < 4; i++) tone('sine', 2600 + i * 150, 3100, 0.05, 0.08, t + i * 0.07);
    },
    /** Golden ball: a bright chime. */
    goldChime() {
      if (!ensure()) return;
      const t = now();
      [1319, 1568, 2093].forEach((f, i) => tone('sine', f, f, 0.25, 0.1, t + i * 0.06));
    },
    /** The saucer's theremin whirr; returns a stop() for the warning phase. */
    saucerWhirr() {
      if (!ensure()) return () => {};
      const t = now();
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 420;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 6; const lg = ctx.createGain(); lg.gain.value = 40;
      lfo.connect(lg); lg.connect(o.frequency);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.3);
      o.connect(g); g.connect(master); o.start(t); lfo.start(t);
      let stopped = false;
      return () => { if (stopped) return; stopped = true; const s = now(); g.gain.setTargetAtTime(0.0001, s, 0.15); o.stop(s + 0.6); lfo.stop(s + 0.6); };
    },
    /** Tractor beam engaging, then the zip away. */
    beamUp() {
      if (!ensure()) return;
      const t = now();
      tone('sine', 300, 1400, 1.1, 0.12, t);
      tone('triangle', 150, 700, 1.1, 0.06, t);
    },
    zipAway() {
      if (!ensure()) return;
      const t = now();
      tone('sawtooth', 900, 2400, 0.35, 0.1, t);
      noise(0.3, 0.1, t, 'bandpass', 1200, 4000);
    },
  };
  return api;
}
