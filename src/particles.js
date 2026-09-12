// A pooled particle system on one InstancedMesh: one draw call regardless
// of count. Small cubes with velocity, gravity, and a lifetime that scales
// them down to nothing. Kinds: sparkle (ball pickup), splash (water),
// puff (squash dust), fur (train hit).

import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

const MAX = 96;
const GRAVITY = -9;

const KINDS = {
  sparkle: { colors: [P.BALL, P.BALL_SEAM, 0xffffff], count: 8, speed: [2.2, 3.6], up: [2.5, 4.5], size: 0.09, life: 0.55, gravity: -6 },
  splash:  { colors: [P.FOAM, P.WATER, 0xcfefff], count: 14, speed: [0.8, 2.2], up: [2.0, 4.0], size: 0.1, life: 0.6, gravity: GRAVITY },
  puff:    { colors: [0xd8d0c2, 0xbdb5a8, 0xf0ebe0], count: 10, speed: [1.2, 2.6], up: [0.3, 1.2], size: 0.12, life: 0.5, gravity: -2 },
  fur:     { colors: [P.FUR_WHITE, P.LIVER, P.LIVER_LIGHT], count: 12, speed: [1.5, 3.5], up: [2.0, 5.0], size: 0.08, life: 0.8, gravity: GRAVITY },
};

export function createParticles(scene) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 0.1, gravity: GRAVITY, rot: 0, spin: 0 });
  // Park every instance at zero scale so unused slots draw nothing.
  for (let i = 0; i < MAX; i++) { dummy.position.set(0, -100, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, color.set(0xffffff)); }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  let rngState = 12345;
  const rnd = () => { rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 4294967296; };
  const range = (lo, hi) => lo + (hi - lo) * rnd();

  function spawn(kind, x, y, z) {
    const k = KINDS[kind];
    if (!k) return;
    let n = 0;
    for (let i = 0; i < MAX && n < k.count; i++) {
      const p = pool[i];
      if (p.alive) continue;
      const a = rnd() * Math.PI * 2;
      const sp = range(k.speed[0], k.speed[1]);
      p.alive = true;
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp; p.vy = range(k.up[0], k.up[1]);
      p.life = p.maxLife = k.life * range(0.7, 1.1);
      p.size = k.size * range(0.7, 1.3);
      p.gravity = k.gravity;
      p.rot = rnd() * Math.PI; p.spin = range(-9, 9);
      mesh.setColorAt(i, color.set(k.colors[Math.floor(rnd() * k.colors.length)]));
      n++;
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function update(dt) {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      any = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        dummy.position.set(0, -100, 0); dummy.scale.setScalar(0);
      } else {
        p.vy += p.gravity * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.02 && p.vy < 0) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
        p.rot += p.spin * dt;
        const s = p.size * Math.min(1, p.life / (p.maxLife * 0.4));
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rot, p.rot * 0.7, 0);
        dummy.scale.setScalar(s);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    if (any) mesh.instanceMatrix.needsUpdate = true;
  }

  function clear() {
    for (let i = 0; i < MAX; i++) { pool[i].alive = false; dummy.position.set(0, -100, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { spawn, update, clear, mesh };
}
