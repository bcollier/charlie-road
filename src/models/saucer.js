// The squirrels' flying saucer: a two-tier hull (the upper tier rotated 45°
// for an octagonal silhouette), a translucent dome with a squirrel pilot,
// blinking rim lights, and a tractor beam cone that only shows when it has
// locked on. Built at the origin; the system positions it.

import * as THREE from 'three';
import { buildVoxelMesh, box, material } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { squirrelBoxes } from './squirrel.js';

const HULL = 0xb8c0cc;
const HULL_DARK = 0x8a93a3;
const DOME = 0x9be8ff;
const BEAM = 0x7ff3ff;

export function createSaucer() {
  const root = new THREE.Group();

  const lower = buildVoxelMesh([
    box(0, 0, 0, 1.7, 0.16, 1.7, HULL),
    box(0, -0.13, 0, 1.0, 0.12, 1.0, HULL_DARK),
    box(0, 0.14, 0, 1.15, 0.14, 1.15, HULL),
  ], { name: 'saucer-hull' });
  root.add(lower);
  const upper = buildVoxelMesh([box(0, 0, 0, 1.7, 0.16, 1.7, HULL), box(0, 0.14, 0, 1.15, 0.14, 1.15, HULL)], { name: 'saucer-hull2' });
  upper.rotation.y = Math.PI / 4;
  root.add(upper);

  // Rim lights: their own material so they can blink.
  const lightMat = new THREE.MeshLambertMaterial({ color: P.CAT_PINK, emissive: P.CAT_PINK, emissiveIntensity: 0.6 });
  const lightMat2 = new THREE.MeshLambertMaterial({ color: P.CAT_YELLOW, emissive: P.CAT_YELLOW, emissiveIntensity: 0.6 });
  const lightGeo = new THREE.BoxGeometry(0.14, 0.1, 0.14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = new THREE.Mesh(lightGeo, i % 2 ? lightMat : lightMat2);
    m.position.set(Math.cos(a) * 0.78, 0.0, Math.sin(a) * 0.78);
    m.castShadow = false;
    root.add(m);
  }

  // Dome with the pilot inside.
  const dome = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.72),
    new THREE.MeshLambertMaterial({ color: DOME, transparent: true, opacity: 0.45, depthWrite: false }));
  dome.position.y = 0.42;
  dome.castShadow = false;
  const pilot = buildVoxelMesh(squirrelBoxes(0, 0, 0, 0.55), { name: 'saucer-pilot' });
  pilot.position.set(-0.08, 0.22, 0);
  pilot.rotation.y = -Math.PI / 2;   // face -Z, toward the viewer
  root.add(pilot, dome);

  // Tractor beam: a cone from the hull down to the ground, additive cyan.
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: BEAM, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.visible = false;
  beam.castShadow = false;
  root.add(beam);

  // Searchlight disc on the ground (separate: not a child, sits at y≈0).
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24),
    new THREE.MeshBasicMaterial({ color: BEAM, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = 0.015;
  spot.visible = false;

  return {
    root, beam, spot, dome, pilot,
    /** Bob, spin the hull, blink the lights. */
    animate(t, bob = 1) {
      root.rotation.y = t * 0.9;
      upper.rotation.y = Math.PI / 4 - t * 1.8;
      root.position.y += 0.0;
      lightMat.emissiveIntensity = 0.4 + 0.6 * (Math.sin(t * 9) > 0 ? 1 : 0);
      lightMat2.emissiveIntensity = 0.4 + 0.6 * (Math.sin(t * 9) > 0 ? 0 : 1);
      pilot.rotation.y = -Math.PI / 2 - t * 0.9 + 0.3 * Math.sin(t * 3);   // pilot stays facing us-ish, peers around
    },
    /** Stretch the beam from the hull down to `height` below it. */
    setBeam(height, on) {
      beam.visible = on;
      if (!on) return;
      beam.scale.set(1, height, 1);
      beam.position.y = -height / 2;
    },
  };
}
