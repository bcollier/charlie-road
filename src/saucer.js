// The squirrels' flying saucer — the thing that comes for Charlie when he
// dawdles or falls behind. Two triggers, same as before: idling past the
// score-dependent limit, or dropping behind the camera's trailing row.
//
//   warn   — the saucer hovers in high above and a searchlight sweeps in and
//            tightens on him for SAUCER.WARN seconds. Moving, catching up, or
//            barking scares it off.
//   beam   — it locks on: the tractor beam engages and he rises, spinning,
//            into the dome.
//   zip    — the saucer tilts and shoots away with him.

import * as THREE from 'three';
import { SAUCER } from './config.js';
import { createSaucer } from './models/saucer.js';

const HOVER_Y = 6.0;
const BEAM_TIME = 1.2;
const ZIP_TIME = 0.5;

export function createSaucerSystem(scene, die, audio) {
  const model = createSaucer();
  model.root.visible = false;
  scene.add(model.root);
  scene.add(model.spot);

  const s = { phase: 'none', t: 0, reason: null, grab: null, stopWhirr: null };

  function startWarning(reason, p) {
    s.phase = 'warn'; s.t = 0; s.reason = reason;
    model.root.visible = true;
    model.spot.visible = true;
    model.root.position.set(p.px + 3.5, HOVER_Y + 1.5, p.pz - 4);
    s.stopWhirr = audio ? audio.saucerWhirr() : null;
  }
  function cancel() {
    s.phase = 'none'; s.t = 0; s.reason = null;
    model.root.visible = false;
    model.spot.visible = false;
    model.setBeam(0, false);
    if (s.stopWhirr) { s.stopWhirr(); s.stopWhirr = null; }
  }

  return {
    state: s,
    model,

    reset() { cancel(); s.grab = null; },

    /** A bark scares a searching saucer off. */
    scare() {
      if (s.phase !== 'warn') return false;
      cancel();
      if (audio) audio.squirrelChitter();
      return true;
    },

    /** Playing-phase update. Calls die('abducted') when the warning completes. */
    update(dt, p, idleLimit, trailingRow, time) {
      const idleDanger = !p.hop && p.idle >= idleLimit - SAUCER.WARN;
      const behind = (-p.pz) < trailingRow;
      if (s.phase === 'none') {
        if (idleDanger) startWarning('idle', p);
        else if (behind) startWarning('behind', p);
        else return;
      }
      if (s.phase !== 'warn') return;
      if (!idleDanger && !behind) { cancel(); return; }
      s.t += dt;
      const k = Math.min(1, s.t / SAUCER.WARN);
      // Saucer glides in over him; the searchlight sweeps in and tightens.
      const target = new THREE.Vector3(p.px, HOVER_Y + 0.25 * Math.sin(time * 3), p.pz - 0.3);
      model.root.position.lerp(target, 1 - Math.exp(-4 * dt));
      const sweep = (1 - k) * 1.6;
      model.spot.position.set(p.px + Math.sin(time * 7) * sweep, 0.015, p.pz + Math.cos(time * 5) * sweep * 0.6);
      model.spot.scale.setScalar(1.6 - 0.9 * k);
      model.animate(time, 1);
      if (s.t >= SAUCER.WARN) {
        s.phase = 'beam';
        s.t = 0;
        s.grab = { x: p.px, z: p.pz };
        if (s.stopWhirr) { s.stopWhirr(); s.stopWhirr = null; }
        if (audio) { audio.beamUp(); audio.squirrelChitter(); }
        die('abducted');
      }
    },

    /** Dying-phase update for death.type === 'abducted'. Owns Charlie's position. */
    updateDying(p, deathT, time) {
      if (!s.grab) { s.grab = { x: p.px, z: p.pz }; model.root.visible = true; }
      const g = s.grab;
      const hover = new THREE.Vector3(g.x, HOVER_Y, g.z);
      if (deathT < BEAM_TIME) {
        const k = deathT / BEAM_TIME;
        const e = k * k * (3 - 2 * k);
        model.root.position.copy(hover);
        model.setBeam(HOVER_Y - 0.2, true);
        model.spot.visible = true;
        model.spot.position.set(g.x, 0.015, g.z);
        model.spot.scale.setScalar(0.7 + 0.15 * Math.sin(time * 20));
        p.px = g.x; p.pz = g.z;
        p.py = e * (HOVER_Y - 0.6);
        p.spinY = time * 7;                       // spins as he rises
        p.scale = [1 - 0.25 * e, 1 - 0.25 * e, 1 - 0.25 * e];
        model.animate(time, 1);
      } else {
        const k = Math.min(1, (deathT - BEAM_TIME) / ZIP_TIME);
        const e = k * k;
        if (k === 0 || (deathT - BEAM_TIME) < 0.02) { if (audio) audio.zipAway(); }
        model.setBeam(0, false);
        model.spot.visible = false;
        const zip = new THREE.Vector3(2, 6, -14);
        model.root.position.copy(hover).addScaledVector(zip, e);
        model.root.rotation.z = -0.5 * e;
        p.px = model.root.position.x; p.py = model.root.position.y - 0.4; p.pz = model.root.position.z;
        p.scale = [0.75, 0.75, 0.75];
        model.animate(time, 1);
      }
    },
  };
}
