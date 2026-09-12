// Outfit unlocks. When the lifetime ball total crosses an item's threshold
// mid-run, the item flies in, spins above Charlie's head with confetti and a
// jingle, then shoots away — cosmetic, never blocks. The item is remembered
// as pending; at the start of the next game it drops out of the sky onto
// him, he puts it on, and does his excited spin. That one holds input for
// ~1.3 s, on the safe starting grass, with moves buffered.

import * as THREE from 'three';
import { ACCESSORIES, byId, buildAccessoryMesh, applyAccessories } from './models/accessories.js';

const FLY_IN = 0.6, HOLD = 1.0, FLY_OUT = 0.5;
const DROP = 0.7, WEAR_HOLD = 0.6;

export function createUnlocks({ scene, charlie, audio, particles, ui, storage, state }) {
  let pending = storage.get('pendingWear', null);
  let flyer = null;
  let dress = null;

  function standalone(id) {
    const m = buildAccessoryMesh(id);
    if (!m) return null;
    // Items are modelled in Charlie's local space around his neck/head; recentre so they spin about themselves.
    const bb = new THREE.Box3().setFromObject(m);
    const c = bb.getCenter(new THREE.Vector3());
    for (const child of m.children) child.position.sub(c);
    m.scale.setScalar(1.6);
    scene.add(m);
    return m;
  }

  return {
    /** Call when the lifetime total changes. Announces every threshold crossed. */
    check(prevTotal, newTotal, p) {
      for (const a of ACCESSORIES) {
        if (prevTotal < a.cost && newTotal >= a.cost) this.announce(a, p);
      }
    },

    announce(a, p) {
      if (flyer) { scene.remove(flyer.mesh); flyer = null; }
      const mesh = standalone(a.id);
      if (!mesh) return;
      flyer = { mesh, t: 0, item: a };
      pending = a.id;
      storage.set('pendingWear', pending);
      ui.toast('UNLOCKED!', a.name.toUpperCase() + ' · WEAR IT NEXT RUN', 2400);
      audio.unlock();
      particles.spawn('confetti', p.px, 1.2, p.pz);
    },

    /** Runs every step in any phase; animates the fly-in. */
    update(dt, p, time) {
      if (!flyer) return;
      flyer.t += dt;
      const t = flyer.t;
      const m = flyer.mesh;
      const over = new THREE.Vector3(p.px, 1.7, p.pz);
      if (t < FLY_IN) {
        const k = t / FLY_IN, e = 1 - Math.pow(1 - k, 3);
        m.position.set(p.px + 3.5 * (1 - e), 1.7 + 3 * (1 - e), p.pz - 3 * (1 - e));
      } else if (t < FLY_IN + HOLD) {
        m.position.copy(over);
        m.position.y += 0.15 * Math.sin((t - FLY_IN) * 8);
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) particles.spawn('sparkle', m.position.x, m.position.y, m.position.z);
      } else if (t < FLY_IN + HOLD + FLY_OUT) {
        const k = (t - FLY_IN - HOLD) / FLY_OUT, e = k * k;
        m.position.set(over.x - 2 * e, over.y + 6 * e, over.z - 4 * e);
      } else {
        scene.remove(m); flyer = null; return;
      }
      m.rotation.y = time * 6;
      m.rotation.x = 0.3 * Math.sin(time * 3);
    },

    hasPending() { return !!pending && !!byId(pending); },
    pendingItem() { return byId(pending); },

    /** Begin the dress-up at game start. Returns the total duration. */
    startDressUp(p) {
      const a = byId(pending);
      pending = null;
      storage.set('pendingWear', null);
      if (!a) return 0;
      const mesh = standalone(a.id);
      dress = { mesh, t: 0, item: a, worn: false };
      audio.whoosh();
      return DROP + WEAR_HOLD;
    },

    /** Returns true when the dress-up has finished. */
    updateDressUp(dt, p, time, onWorn) {
      if (!dress) return true;
      dress.t += dt;
      const t = dress.t;
      const m = dress.mesh;
      if (t < DROP) {
        const k = t / DROP, e = k * k;                       // accelerating fall
        m.position.set(p.px, 0.9 + 4.5 * (1 - e), p.pz);
        m.rotation.y = time * 5;
      } else if (!dress.worn) {
        dress.worn = true;
        scene.remove(m);
        // Put it on.
        state.equipped[dress.item.slot] = dress.item.id;
        storage.set('accessory', state.equipped);
        applyAccessories(charlie, state.equipped);
        ui.renderPicker(state.ballsTotal, state.equipped);
        particles.spawn('confetti', p.px, 0.8, p.pz);
        particles.spawn('sparkle', p.px, 0.6, p.pz);
        audio.unlock();
        audio.bark();
        onWorn && onWorn(dress.item);
      }
      if (t >= DROP + WEAR_HOLD) { dress = null; return true; }
      return false;
    },

    reset() {
      if (flyer) { scene.remove(flyer.mesh); flyer = null; }
      if (dress) { scene.remove(dress.mesh); dress = null; }
    },
  };
}
