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
  };
  return api;
}
