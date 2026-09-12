// The eagle. Two triggers — idling past the score-dependent limit, or falling
// behind the camera's trailing row. Either starts a warning: a shadow grows
// over Charlie for EAGLE.WARN seconds, during which moving (or catching back
// up) cancels it. If it completes, the eagle commits: swoops in, grabs him,
// and lifts off with him. See SPEC.md §3.6, §5.8.

import * as THREE from 'three';
import { EAGLE } from './config.js';
import { createEagle } from './models/eagle.js';

const LIFT_TIME = 1.0;

export function createEagleSystem(scene, die) {
  const model = createEagle();
  model.root.visible = false;
  scene.add(model.root);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.visible = false;
  scene.add(shadow);

  const s = { phase: 'none', t: 0, reason: null, grab: null };

  function startWarning(reason) { s.phase = 'warn'; s.t = 0; s.reason = reason; shadow.visible = true; }
  function cancel() { s.phase = 'none'; s.t = 0; s.reason = null; shadow.visible = false; }

  return {
    state: s,
    model,
    shadow,

    reset() { cancel(); s.grab = null; model.root.visible = false; },

    /** Playing-phase update. Calls die('eagle') when the warning completes. */
    update(dt, p, idleLimit, trailingRow) {
      const idleDanger = !p.hop && p.idle >= idleLimit - EAGLE.WARN;
      const behind = (-p.pz) < trailingRow;
      if (s.phase === 'none') {
        if (idleDanger) startWarning('idle');
        else if (behind) startWarning('behind');
        else return;
      }
      if (s.phase !== 'warn') return;
      if (!idleDanger && !behind) { cancel(); return; }
      s.t += dt;
      const k = Math.min(1, s.t / EAGLE.WARN);
      shadow.position.set(p.px, 0.012, p.pz);
      shadow.scale.setScalar(0.3 + 1.1 * k);
      if (s.t >= EAGLE.WARN) {
        s.phase = 'swoop';
        s.t = 0;
        s.grab = { x: p.px, z: p.pz };
        model.root.visible = true;
        die('eagle');
      }
    },

    /** Dying-phase update for death.type === 'eagle'. Owns Charlie's position once grabbed. */
    updateDying(p, deathT, time) {
      const g = s.grab || { x: p.px, z: p.pz };
      const from = new THREE.Vector3(g.x + 2.5, 6.5, g.z - 5);
      const at = new THREE.Vector3(g.x, 0.45, g.z);
      let pos, yaw;
      if (deathT < EAGLE.SWOOP) {
        const k = deathT / EAGLE.SWOOP;
        const e = 1 - Math.pow(1 - k, 3);
        pos = from.clone().lerp(at, e);
        yaw = Math.atan2(-(at.z - from.z), at.x - from.x);
        shadow.visible = true;
        shadow.position.set(g.x, 0.012, g.z);
        shadow.scale.setScalar(1.4 - 0.5 * k);
        model.animate(time, 1);
      } else {
        const k = Math.min(1, (deathT - EAGLE.SWOOP) / LIFT_TIME);
        const e = k * k;
        const lift = new THREE.Vector3(-1.5, 9, -7);
        pos = at.clone().addScaledVector(lift, e);
        yaw = Math.atan2(-lift.z, lift.x);
        shadow.visible = false;
        p.px = pos.x; p.py = pos.y - 0.55; p.pz = pos.z;
        model.animate(time, 1.4);
      }
      model.root.position.copy(pos);
      model.root.rotation.y = yaw;
    },
  };
}
