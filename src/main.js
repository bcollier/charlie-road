// Bootstrap, the fixed-step main loop, and the ?debug=1 harness.
//
// All simulation goes through step(dt). requestAnimationFrame only decides when
// and how many times to call it; the harness can call it directly, which is
// how time-dependent behaviour gets verified in a backgrounded tab where rAF
// never fires. See SPEC.md §9a.

import * as THREE from 'three';
import { SIM, FIELD, DIFF } from './config.js';
import { PALETTE } from './palette.js';
import { createScene } from './scene.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createCharlie } from './models/charlie.js';
import { createPlayer, updatePlayer, queueMove, clearQueue, celebrate } from './player.js';
import { stats as voxelStats } from './voxel.js';

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
  player: createPlayer(),
};

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + String(e.reason)));

// ---- Scene ------------------------------------------------------------------
const canvas = document.getElementById('game');
const view = createScene(canvas);
const { renderer, scene, camera } = view;
const cam = createCamera(view);

// Block 1 placeholder world: grass bands with one asphalt strip so Charlie's
// contrast can be judged on both (A3). Replaced by the real generator in Block 2.
const slabGeo = new THREE.BoxGeometry(FIELD.MAX_X - FIELD.MIN_X + 1, 0.5, 1);
for (let r = 0; r < 24; r++) {
  const road = r >= 4 && r <= 6;
  const color = road ? PALETTE.ASPHALT : (r % 2 ? PALETTE.GRASS_B : PALETTE.GRASS_A);
  const m = new THREE.Mesh(slabGeo, new THREE.MeshLambertMaterial({ color }));
  m.position.set(0, road ? -0.27 : -0.25, -r);
  m.receiveShadow = true;
  scene.add(m);
}

const charlie = createCharlie();
scene.add(charlie.root);

// ---- World hooks the player needs (real ones arrive in Block 2) -----------
const world = {
  time: 0,
  minRow: 0,
  canMoveTo: (x, row) => true,
  onHop: null,
  onBlocked: null,
};

// ---- Input ------------------------------------------------------------------
createInput({
  onMove: (dir) => { if (state.phase === 'playing') queueMove(state.player, dir); },
  onAction: () => {},
  onPause: () => {},
  onMute: () => {},
}, canvas);

// ---- Simulation -------------------------------------------------------------
function autoScrollSpeed() {
  const t = Math.min(state.score, DIFF.SCORE_CAP) / DIFF.SCORE_CAP;
  return DIFF.AUTO_SCROLL.start + (DIFF.AUTO_SCROLL.end - DIFF.AUTO_SCROLL.start) * t;
}

function step(dt) {
  state.time += dt;
  state.frame += 1;
  world.time = state.time;

  const p = state.player;
  if (state.phase === 'playing') {
    updatePlayer(p, dt, world);
    if (p.row > state.score) state.score = p.row;
    cam.update(dt, p, autoScrollSpeed());
  }

  // Sync the rig to the player.
  charlie.root.position.set(p.px, p.py, p.pz);
  charlie.root.scale.set(p.scale[0], p.scale[1], p.scale[2]);
  charlie.animate(dt, {
    time: state.time,
    vx: p.vx, vy: p.vy,
    idle: p.idle,
    moving: !!p.hop,
    celebrate: p.celebrate,
    carrying: p.carrying,
    facingAngle: p.facingAngle,
  });
}

function render() {
  renderer.render(scene, camera);
}

function reset(seed) {
  if (seed !== undefined) state.seed = seed;
  state.time = 0; state.frame = 0; state.score = 0;
  state.player = createPlayer();
  state.phase = 'playing';
  cam.reset();
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

window.addEventListener('resize', () => view.resize());
view.resize();
cam.reset();
requestAnimationFrame(frame);

// ---- Debug harness (§9a) ---------------------------------------------------
if (DEBUG) {
  window.__game = {
    state,
    step,
    steps(n, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); render(); return state; },
    input(dir) { return queueMove(state.player, dir); },
    reset(seed) { reset(seed); render(); return state.seed; },
    celebrate() { celebrate(state.player); },
    stats() {
      const info = renderer.info;
      return {
        fps: Math.round(fps),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        frame: state.frame,
        time: Number(state.time.toFixed(3)),
        visibility: document.visibilityState,
        voxel: voxelStats(),
        cam: { x: +cam.x.toFixed(2), row: +cam.row.toFixed(2), scroll: +cam.scrollRow.toFixed(2), trailing: +cam.trailingRow().toFixed(2) },
      };
    },
    errors,
    view,
    cam,
    charlie,
    THREE,
  };
  const hud = document.createElement('div');
  hud.id = 'debug';
  document.body.appendChild(hud);
  setInterval(() => {
    const s = window.__game.stats();
    const p = state.player;
    hud.textContent = `fps ${s.fps}  calls ${s.drawCalls}  t ${s.time}  ${s.visibility}  | pos ${p.x.toFixed(1)},${p.row}  cam ${s.cam.row}  scroll ${s.cam.scroll}  score ${state.score}`;
  }, 250);
}
