// Day → dusk → night → dawn as the score climbs, one full day per
// DAYCYCLE.PERIOD_ROWS. Interpolates the DAY_CYCLE keyframes into the sky
// colour, ambient and sun intensity, sun colour and elevation (long dusk
// shadows), and makes vehicle lights glow after dark.

import * as THREE from 'three';
import { DAYCYCLE } from './config.js';
import { DAY_CYCLE, PALETTE as P } from './palette.js';
import { material } from './voxel.js';

export function createDayCycle(view) {
  const a = new THREE.Color(), b = new THREE.Color();
  let lastU = -1;
  const head = material(P.HEADLIGHT);
  const tail = material(P.TAILLIGHT);
  head.emissive = new THREE.Color(P.HEADLIGHT);
  tail.emissive = new THREE.Color(P.TAILLIGHT);
  head.emissiveIntensity = 0;
  tail.emissiveIntensity = 0;

  function apply(u) {
    let i = 0;
    while (i < DAY_CYCLE.length - 2 && DAY_CYCLE[i + 1].at <= u) i++;
    const k0 = DAY_CYCLE[i], k1 = DAY_CYCLE[i + 1];
    const t = (u - k0.at) / (k1.at - k0.at);
    const e = t * t * (3 - 2 * t);
    view.scene.background = a.set(k0.sky).lerp(b.set(k1.sky), e).clone();
    view.ambient.intensity = k0.ambient + (k1.ambient - k0.ambient) * e;
    view.sun.intensity = k0.sun + (k1.sun - k0.sun) * e;
    view.sun.color.set(k0.sunColor).lerp(b.set(k1.sunColor), e);
    view.setSunElevation(k0.sunY + (k1.sunY - k0.sunY) * e);
    // Darkness 0..1 drives the lights.
    const dark = THREE.MathUtils.clamp((1.35 - view.ambient.intensity) / 0.85, 0, 1);
    head.emissiveIntensity = dark * 1.3;
    tail.emissiveIntensity = dark * 1.1;
  }

  return {
    /** Fraction of the day for a score. */
    phase(score) { return (score % DAYCYCLE.PERIOD_ROWS) / DAYCYCLE.PERIOD_ROWS; },
    update(score) {
      const u = this.phase(score);
      if (Math.abs(u - lastU) < 0.0005) return;
      lastU = u;
      apply(u);
    },
    reset() { lastU = -1; apply(0); },
  };
}
