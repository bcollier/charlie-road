// Bootstrap, the fixed-step main loop, the game state machine, and the
// ?debug=1 harness.
//
// All simulation goes through step(dt). requestAnimationFrame only decides when
// and how many times to call it; the harness can call it directly, which is
// how time-dependent behaviour gets verified in a backgrounded tab where rAF
// never fires. See SPEC.md §9a.

import * as THREE from 'three';
import { SIM, FIELD, ROW_SCREEN_Y } from './config.js';
import { createScene } from './scene.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createRiverSystem } from './river.js';
import { createUI } from './ui.js';
import { storage } from './storage.js';
import { createCharlie } from './models/charlie.js';
import { createPlayer, updatePlayer, queueMove, clearQueue, celebrate } from './player.js';
import { difficulty } from './rules/difficulty.js';
import { aabb, playerBox, vehicleBox } from './rules/collide.js';
import { stats as voxelStats } from './voxel.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const FIXED_SEED = params.has('seed') ? Number(params.get('seed')) : null;

const DEATH_HOLD = 0.9;

// ---- State ------------------------------------------------------------------
export const state = {
  phase: 'playing',   // 'title' | 'playing' | 'dying' | 'gameover' | 'paused'
  time: 0,
  frame: 0,
  seed: FIXED_SEED ?? (Date.now() % 1_000_000),
  score: 0,
  best: storage.get('highScore', 0),
  ballsRun: 0,
  ballsTotal: storage.get('ballsTotal', 0),
  plays: storage.get('plays', 0),
  death: null,        // { type, t }
  newBest: false,
  player: createPlayer(),
};

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + String(e.reason)));

// ---- Scene & systems --------------------------------------------------------
const canvas = document.getElementById('game');
const view = createScene(canvas);
const { renderer, scene, camera } = view;
const cam = createCamera(view);
const world = createWorld(scene, state.seed);
const ui = createUI(document.getElementById('ui'));
const charlie = createCharlie();
scene.add(charlie.root);

// ---- Hooks the player state machine needs ---------------------------------
const river = createRiverSystem(world, (type) => die(type));
const hooks = {
  time: 0,
  minRow: 0,
  canMoveTo: (x, row) => world.canMoveTo(x, row),
  isWater: (row) => world.isWater(row),
  onLanded: (p) => river.onLanded(p),
  onHop: null,
  onBlocked: null,
};

// ---- Input ------------------------------------------------------------------
function onAction() {
  if (state.phase === 'gameover') restart();
}
createInput({
  onMove: (dir) => { if (state.phase === 'playing') queueMove(state.player, dir); else if (state.phase === 'gameover') restart(); },
  onTap: () => { if (state.phase === 'playing') queueMove(state.player, 'up'); else onAction(); },
  onAction,
  onPause: () => {},
  onMute: () => {},
}, canvas);

// ---- Death ------------------------------------------------------------------
function die(type) {
  if (state.phase !== 'playing') return;
  state.phase = 'dying';
  state.death = { type, t: 0 };
  const p = state.player;
  p.alive = false;
  clearQueue(p);
  p.hop = null;
  p.onPlatform = null;
  p.celebrate = -1;
}

function finishDeath() {
  state.phase = 'gameover';
  state.plays += 1;
  storage.set('plays', state.plays);
  state.newBest = state.score > state.best;
  if (state.newBest) {
    state.best = state.score;
    storage.set('highScore', state.best);
  }
  ui.setBest(state.best);
  ui.showGameOver(state.score, state.best, state.newBest);
}

function restart() {
  const seed = FIXED_SEED ?? (Date.now() % 1_000_000);
  reset(seed);
}

function reset(seed) {
  state.seed = seed;
  state.time = 0; state.frame = 0; state.score = 0; state.ballsRun = 0;
  state.death = null; state.newBest = false;
  state.player = createPlayer();
  state.phase = 'playing';
  ui.hideGameOver();
  ui.setScore(0);
  world.reset(seed);
  cam.reset();
  ensureWorld(state.player);
  world.update(0);
}

// ---- World upkeep ----------------------------------------------------------
// Generate ahead of whichever is further forward (camera or Charlie), recycle
// behind whichever is further back, and show only the rows the frustum can see.
function ensureWorld(p) {
  const front = Math.max(cam.row, p.row);
  const back = Math.min(cam.row, p.row);
  const span = view.frustum.halfH / ROW_SCREEN_Y;      // rows from target to screen edge
  const target = cam.row + cam.leadRows;
  world.ensure(front, back, target - span - 1.5, target + span + 3);
}

// ---- Collision --------------------------------------------------------------
function checkCollisions(p) {
  const pb = playerBox(p.px, p.pz);
  const lo = Math.floor(-p.pz - 0.5), hi = Math.ceil(-p.pz + 0.5);
  for (let i = lo; i <= hi; i++) {
    const r = world.row(i);
    if (!r || r.desc.type !== 'road') continue;
    for (const v of r.vehicles) {
      if (aabb(pb, vehicleBox(v.x, -i, v.kind))) return die('squashed');
    }
  }
}

// ---- Simulation -------------------------------------------------------------
function step(dt) {
  state.time += dt;
  state.frame += 1;
  hooks.time = state.time;

  const p = state.player;
  world.update(state.time);

  if (state.phase === 'playing') {
    hooks.minRow = Math.max(0, Math.ceil(cam.trailingRow()));
    river.update(p);            // carry him on a log before the hop machine reads p.x
    updatePlayer(p, dt, hooks);
    if (p.row > state.score) { state.score = p.row; ui.setScore(state.score); }
    checkCollisions(p);
    cam.update(dt, p, difficulty(state.score).autoScroll);
    ensureWorld(p);
  } else if (state.phase === 'dying') {
    state.death.t += dt;
    const t = state.death.t;
    if (state.death.type === 'drowned') {
      // Sink below the surface, with a wobble as he goes.
      p.py = -Math.min(0.8, t * 1.6);
      p.px = p.x + 0.04 * Math.sin(t * 22);
      p.scale = [1, 1, 1];
    } else {
      // Squash: flatten fast, spread a little.
      const k = Math.min(1, t / 0.12);
      p.scale = [1 + 0.45 * k, 1 - 0.85 * k, 1 + 0.45 * k];
      p.py = 0;
    }
    p.vx = 0; p.vy = 0;
    cam.update(dt, p, 0);
    if (state.death.t >= DEATH_HOLD) finishDeath();
  }

  // Sync the rig.
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

// ---- Loop -------------------------------------------------------------------
let last = performance.now();
let fpsAcc = 0, fpsFrames = 0, fps = 0;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > SIM.DT_CLAMP) dt = SIM.DT_CLAMP;
  if (dt < 0) dt = 0;
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
ui.setBest(state.best);
ui.setBalls(state.ballsTotal);
reset(state.seed);
requestAnimationFrame(frame);

// ---- Debug harness (§9a) ---------------------------------------------------
if (DEBUG) {
  window.__game = {
    state,
    step,
    steps(n, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); render(); return state; },
    input(dir) { return queueMove(state.player, dir); },
    reset(seed) { reset(seed ?? state.seed); render(); return state.seed; },
    celebrate() { celebrate(state.player); },
    die,
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
        rows: world.rows.size,
        cam: { x: +cam.x.toFixed(2), row: +cam.row.toFixed(2), scroll: +cam.scrollRow.toFixed(2), trailing: +cam.trailingRow().toFixed(2) },
      };
    },
    rowTypes(from, to) {
      const L = { grass: 'g', road: 'r', river: 'w', rail: 't' };
      const out = [];
      for (let i = from; i <= to; i++) { const r = world.row(i); out.push(r ? L[r.desc.type] : '.'); }
      return out.join('');
    },
    errors,
    view, cam, world, charlie, ui, storage, THREE,
  };
  const hud = document.createElement('div');
  hud.id = 'debug';
  document.body.appendChild(hud);
  setInterval(() => {
    const s = window.__game.stats();
    const p = state.player;
    hud.textContent = `fps ${s.fps}  calls ${s.drawCalls}  rows ${s.rows}  t ${s.time}  ${s.visibility}  | ${state.phase}  pos ${p.x.toFixed(1)},${p.row}  cam ${s.cam.row}  scroll ${s.cam.scroll}  score ${state.score}  seed ${state.seed}`;
  }, 250);
}
