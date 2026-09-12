// Bootstrap, the fixed-step main loop, and the ?debug=1 harness.
//
// All simulation goes through step(dt). requestAnimationFrame only decides when
// and how many times to call it; the harness can call it directly, which is
// how time-dependent behaviour gets verified in a backgrounded tab where rAF
// never fires. See SPEC.md §9a.

import * as THREE from 'three';
import { SIM, FIELD } from './config.js';
import { PALETTE } from './palette.js';
import { createScene } from './scene.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';

// ---- State ------------------------------------------------------------------
// One plain object holding everything the simulation knows. Rendering reads it;
// nothing else writes it except step().
export const state = {
  phase: 'playing',   // 'title' | 'playing' | 'dying' | 'gameover' | 'paused'
  time: 0,            // simulated seconds
  frame: 0,           // simulation steps taken
  seed: Number(params.get('seed')) || (Date.now() % 1_000_000),
  score: 0,
  player: { x: 0, row: 0 },
  cam: { x: 0, row: 0 },
};

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + String(e.reason)));

// ---- Scene ------------------------------------------------------------------
const canvas = document.getElementById('game');
const view = createScene(canvas);
const { renderer, scene, camera } = view;

// Block 0 placeholder world: one grass row across the field and a cube standing
// where Charlie will. Enough to judge the camera against the reference shots.
const grassGeo = new THREE.BoxGeometry(FIELD.MAX_X - FIELD.MIN_X + 1, 0.5, 1);
for (let r = 0; r < 12; r++) {
  const mat = new THREE.MeshLambertMaterial({ color: r % 2 ? PALETTE.GRASS_B : PALETTE.GRASS_A });
  const m = new THREE.Mesh(grassGeo, mat);
  m.position.set(0, -0.25, -r);
  m.receiveShadow = true;
  scene.add(m);
}
const cube = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6),
  new THREE.MeshLambertMaterial({ color: PALETTE.FUR_WHITE }));
cube.position.set(0, 0.35, 0);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

// ---- Simulation -------------------------------------------------------------
function step(dt) {
  state.time += dt;
  state.frame += 1;
  // Camera target: ahead of the player by CAM.LEAD rows (real follow logic lands in Block 1).
  view.setTarget(state.cam.x, 0, -(state.cam.row + 1.5));
}

function render() {
  renderer.render(scene, camera);
}

// ---- Loop -------------------------------------------------------------------
let last = performance.now();
let fpsAcc = 0, fpsFrames = 0, fps = 0;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > SIM.DT_CLAMP) dt = SIM.DT_CLAMP;
  if (dt < 0) dt = 0;

  // Split the frame into substeps no larger than MAX_STEP so fast movers can
  // never tunnel through a hitbox on a slow frame.
  const n = Math.max(1, Math.ceil(dt / SIM.MAX_STEP));
  const sub = dt / n;
  for (let i = 0; i < n; i++) step(sub);

  render();

  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) { fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0; }
  requestAnimationFrame(frame);
}

function onResize() {
  view.resize();
}
window.addEventListener('resize', onResize);
onResize();
requestAnimationFrame(frame);

// ---- Debug harness (§9a) ---------------------------------------------------
if (DEBUG) {
  window.__game = {
    state,
    step,
    steps(n, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); render(); return state; },
    input(dir) { /* wired in Block 1 */ return dir; },
    reset(seed) { /* wired in Block 2 */ return seed; },
    stats() {
      const info = renderer.info;
      return {
        fps: Math.round(fps),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        frame: state.frame,
        time: Number(state.time.toFixed(3)),
        visibility: document.visibilityState,
      };
    },
    errors,
    view,
    THREE,
  };
  const hud = document.createElement('div');
  hud.id = 'debug';
  document.body.appendChild(hud);
  setInterval(() => {
    const s = window.__game.stats();
    hud.textContent = `fps ${s.fps}  calls ${s.drawCalls}  tris ${s.triangles}  t ${s.time}  ${s.visibility}`;
  }, 250);
}
