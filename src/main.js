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
import { createSaucerSystem } from './saucer.js';
import { createBark } from './bark.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createUI } from './ui.js';
import { storage } from './storage.js';
import { BALL } from './config.js';
import { createCharlie } from './models/charlie.js';
import { applyAccessories, isUnlocked, byId, SLOTS, setUnlockAll } from './models/accessories.js';
import { createPlayer, updatePlayer, queueMove, clearQueue, celebrate, zoomiesActive } from './player.js';
import { createUnlocks } from './unlocks.js';
import { createCritters } from './critters.js';
import { createDayCycle } from './daycycle.js';
import { difficulty, idleLimit } from './rules/difficulty.js';
import { aabb, playerBox, vehicleBox } from './rules/collide.js';
import { stats as voxelStats } from './voxel.js';
import { GOLDEN, COMBO } from './config.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const FIXED_SEED = params.has('seed') ? Number(params.get('seed')) : null;
// ?enable_all_outfits=yes (or ?outfits=all): every outfit available, for testing the wardrobe.
const ALL_OUTFITS = /^(yes|1|true)$/i.test(params.get('enable_all_outfits') || '') || params.get('outfits') === 'all';
setUnlockAll(ALL_OUTFITS);

// Seconds each death plays out before the game-over card.
const DEATH_HOLD = { squashed: 0.9, drowned: 0.9, trainHit: 1.0, abducted: 1.9 };

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
  combo: 0,           // chained pickups inside COMBO.WINDOW
  lastPickupAt: -1e9,
  equipped: Object.assign({ head: null, neck: null, body: null }, storage.get('accessory', {})),
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
const ui = createUI(document.getElementById('ui'), {
  onPause: () => togglePause(),
  onMute: () => { audio.unlock(); ui.setMuted(audio.toggleMute()); },
  onOutfits: () => enterTitle(),
  onEquip: (id) => equip(id),
  onBark: () => doBark(),
});
const charlie = createCharlie();
scene.add(charlie.root);
// Unlock thresholds can change between versions: drop anything no longer earned.
for (const slot of SLOTS) {
  if (state.equipped[slot] && !isUnlocked(state.equipped[slot], state.ballsTotal)) state.equipped[slot] = null;
}
applyAccessories(charlie, state.equipped);

// ---- Hooks the player state machine needs ---------------------------------
const audio = createAudio();
const particles = createParticles(scene);
const river = createRiverSystem(world, (type) => die(type));
const saucer = createSaucerSystem(scene, (type) => die(type), audio);
const bark = createBark({ world, audio, particles, saucer });
const unlocks = createUnlocks({ scene, charlie, audio, particles, ui, storage, state });
const critters = createCritters({ scene, world, charlie, audio, particles, ui, awardBalls: (n, x, z, p) => awardBalls(n, x, z, p), celebrate: (p) => celebrate(p) });
const daycycle = createDayCycle(view);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const CONTROLS_TEXT = IS_TOUCH
  ? 'Tap to hop · Swipe to steer · Shake or 🐶 to bark'
  : '↑ ↓ ← → or W A S D to move · B to bark · P pause · M mute';
const hooks = {
  time: 0,
  minRow: 0,
  canMoveTo: (x, row) => world.canMoveTo(x, row),
  isWater: (row) => world.isWater(row),
  onLanded: (p) => river.onLanded(p),
  onHop: (p) => { audio.hop(p.hopsChained); if (++hopsThisRun === 8) ui.hideHint(); },
  onZoomies: (p) => { audio.zoomies(); ui.toast('ZOOMIES!', '', 1100); particles.spawn('dust', p.px, 0.1, p.pz); },
  onBlocked: () => audio.blocked(),
};

// ---- Input ------------------------------------------------------------------
// A move or tap starts the game from the title (and counts as the first hop),
// restarts from game over, and is ignored while paused or dying.
// Shake-to-bark. On iOS the motion permission prompt must come from a tap,
// so it is requested on the first gesture of the session.
const shake = bark.installShake(() => doBark());
let shakeRequested = false;
function firstGesture() {
  audio.unlock();
  if (!shakeRequested && shake.needsGesture) { shakeRequested = true; shake.request(); }
}

function doBark() {
  firstGesture();
  if (state.phase !== 'playing') return;
  bark.bark(state.time, state.player);
}

function onMoveInput(dir) {
  firstGesture();
  switch (state.phase) {
    case 'title': startGame(); queueMove(state.player, dir); break;
    case 'dressing':                     // buffered; fires the moment he's dressed
    case 'playing': queueMove(state.player, dir); break;
    case 'gameover': restart(); break;
  }
}
createInput({
  onMove: onMoveInput,
  onTap: () => onMoveInput('up'),
  onAction: () => { firstGesture(); if (state.phase === 'title') startGame(); else if (state.phase === 'gameover') restart(); else if (state.phase === 'paused') togglePause(); },
  onPause: () => togglePause(),
  onMute: () => { audio.unlock(); ui.setMuted(audio.toggleMute()); },
  onBark: () => doBark(),
}, canvas);

function enterTitle() {
  reset(FIXED_SEED ?? (Date.now() % 1_000_000));
  state.phase = 'title';
  state.player.facingAngle = Math.PI;          // face the viewer on the title
  ui.hideGameOver();
  ui.hideHint();
  ui.setHudVisible(false);                     // the title carries its own best/balls
  ui.setControls(CONTROLS_TEXT);
  ui.showTitle({ best: state.best, ballsTotal: state.ballsTotal, equipped: state.equipped });
}

let hopsThisRun = 0;
function startGame() {
  if (state.phase !== 'title') return;
  state.player.idle = 0;
  state.player.facingAngle = 0;
  hopsThisRun = 0;
  ui.hideTitle();
  ui.setHudVisible(true);
  // Keep the controls on screen for the first few hops of a fresh visit.
  if (state.plays < 3) ui.showHint(CONTROLS_TEXT);
  // A newly earned outfit drops onto him first; moves tapped meanwhile are buffered.
  if (unlocks.hasPending()) {
    state.phase = 'dressing';
    unlocks.startDressUp(state.player);
  } else {
    state.phase = 'playing';
  }
}

function togglePause() {
  if (state.phase === 'playing') { state.phase = 'paused'; ui.showPause(); }
  else if (state.phase === 'paused') { state.phase = 'playing'; ui.hidePause(); last = performance.now(); }
}

function equip(id) {
  const a = byId(id);
  if (!a || !isUnlocked(id, state.ballsTotal)) return false;
  state.equipped[a.slot] = state.equipped[a.slot] === id ? null : id;
  storage.set('accessory', state.equipped);
  applyAccessories(charlie, state.equipped);
  ui.renderPicker(state.ballsTotal, state.equipped);
  audio.hop(3);
  return true;
}

// ---- Death ------------------------------------------------------------------
function die(type) {
  if (state.phase !== 'playing') return;
  state.phase = 'dying';
  const p = state.player;
  const rowHere = world.row(Math.round(-p.pz));
  state.death = { type, t: 0, dir: rowHere && rowHere.desc.dir ? rowHere.desc.dir : 1 };
  p.alive = false;
  clearQueue(p);
  p.hop = null;
  p.onPlatform = null;
  p.celebrate = -1;
  state.combo = 0;
  switch (type) {
    case 'squashed': audio.squash(); particles.spawn('puff', p.px, 0.1, p.pz); break;
    case 'drowned':  audio.splash(); particles.spawn('splash', p.px, 0.05, p.pz); break;
    case 'trainHit': audio.squash(); audio.whoosh(); particles.spawn('fur', p.px, 0.4, p.pz); break;
    case 'abducted': break;   // the saucer system plays its own beam-up
  }
}

function finishDeath() {
  state.phase = 'gameover';
  state.plays += 1;
  storage.set('plays', state.plays);
  state.newBest = state.score > state.best;
  if (state.newBest) {
    state.best = state.score;
    storage.set('highScore', state.best);
    audio.newBest();
  }
  ui.setBest(state.best);
  ui.showGameOver({ type: state.death.type, score: state.score, best: state.best, isNew: state.newBest, ballsRun: state.ballsRun });
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
  state.combo = 0; state.lastPickupAt = -1e9;
  world.reset(seed);
  cam.reset();
  saucer.reset();
  bark.reset();
  unlocks.reset();
  critters.reset();
  daycycle.reset();
  particles.clear();
  trainAudio.lastDing = -1;
  trainAudio.hornedAt.clear();
  charlie.root.rotation.set(0, 0, 0);
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
    if (!r) continue;
    if (r.desc.type === 'road') {
      for (const v of r.vehicles) {
        if (aabb(pb, vehicleBox(v.x, -i, v.kind))) return die('squashed');
      }
    } else if (r.desc.type === 'rail' && r.trainX !== null) {
      if (aabb(pb, r.trainBox)) return die('trainHit');
    }
  }
}

// ---- Tennis balls -----------------------------------------------------------
function checkBalls(p) {
  const lo = Math.floor(-p.pz - 0.5), hi = Math.ceil(-p.pz + 0.5);
  for (let i = lo; i <= hi; i++) {
    const r = world.row(i);
    const b = r && r.ball;
    if (!b || b.collected) continue;
    const dx = p.px - b.x, dz = p.pz - (-i);
    if (dx * dx + dz * dz < BALL.PICKUP_RADIUS * BALL.PICKUP_RADIUS) {
      b.collect();
      // Combo: chained pickups inside the window multiply the value (capped).
      state.combo = (state.time - state.lastPickupAt <= COMBO.WINDOW) ? state.combo + 1 : 1;
      state.lastPickupAt = state.time;
      const mult = Math.min(state.combo, COMBO.MAX_MULT);
      const value = (b.golden ? GOLDEN.VALUE : 1) * mult;
      awardBalls(value, b.x, -i, p);
      celebrate(p);
      particles.spawn(b.golden ? 'gold' : 'sparkle', b.x, 0.3, -i);
      if (b.golden) { audio.goldChime(); ui.toast('GOLDEN!', '+' + value + ' balls', 1300); }
      audio.comboPickup(mult);
      if (state.combo >= 2) ui.showCombo(state.combo);
    }
  }
}

/** Add balls to the run and lifetime totals, persist, and announce any unlock crossed. */
function awardBalls(n, x, z, p) {
  const prev = state.ballsTotal;
  state.ballsRun += n;
  state.ballsTotal += n;
  storage.set('ballsTotal', state.ballsTotal);
  ui.setBalls(state.ballsTotal);
  unlocks.check(prev, state.ballsTotal, p);
}

// ---- Train sounds -----------------------------------------------------------
// The bell dings every 0.45 s while a nearby group is warning; the horn
// sounds once as a nearby train starts its sweep.
const trainAudio = { lastDing: -1, hornedAt: new Map() };
function checkTrainSounds(p) {
  const here = Math.round(-p.pz);
  let warning = false;
  for (let i = here - 2; i <= here + 7; i++) {
    const r = world.row(i);
    if (!r || r.desc.type !== 'rail') continue;
    if (r.state === 'warn') warning = true;
    if (r.state === 'train' && r.trainX !== null) {
      const key = i + ':' + Math.floor(state.time / 5);
      const startedAgo = r.desc.dir > 0 ? r.trainX + 19 : 19 - r.trainX;   // tiles since the sweep began
      if (startedAgo < 2 && !trainAudio.hornedAt.has(key)) { trainAudio.hornedAt.set(key, true); audio.trainHorn(); }
    }
  }
  if (warning && state.time - trainAudio.lastDing > 0.45) { trainAudio.lastDing = state.time; audio.signalDing(); }
  if (trainAudio.hornedAt.size > 64) trainAudio.hornedAt.clear();
}

// ---- Simulation -------------------------------------------------------------
function step(dt) {
  if (state.phase === 'paused') return;          // frozen: nothing advances

  state.time += dt;
  state.frame += 1;
  hooks.time = state.time;

  const p = state.player;
  world.update(state.time);

  unlocks.update(dt, p, state.time);
  critters.update(dt, p, state.time, cam.row, state.phase);
  daycycle.update(state.score);

  if (state.phase === 'title') {
    // Traffic runs behind the card; Charlie idles (and does his head-tilt).
    p.idle += dt;
    p.px = p.x; p.py = 0; p.pz = -p.row;
    p.vx = 0; p.vy = 0;
  } else if (state.phase === 'dressing') {
    // The new outfit drops onto him; he puts it on and celebrates, then play begins.
    p.px = p.x; p.py = p.celebrate >= 0 ? Math.sin(Math.PI * p.celebrate) * BALL.CELEBRATE_LIFT : 0; p.pz = -p.row;
    p.vx = 0; p.vy = 0;
    if (p.celebrate >= 0) { p.celebrate += dt / BALL.CELEBRATE_DURATION; if (p.celebrate >= 1) p.celebrate = -1; }
    const done = unlocks.updateDressUp(dt, p, state.time, () => celebrate(p));
    if (done) { state.phase = 'playing'; p.idle = 0; }
  } else if (state.phase === 'playing') {
    hooks.minRow = Math.max(0, Math.ceil(cam.trailingRow()));
    river.update(p);            // carry him on a log before the hop machine reads p.x
    updatePlayer(p, dt, hooks);
    if (p.row > state.score) { state.score = p.row; ui.setScore(state.score); }
    checkCollisions(p);
    if (state.phase === 'playing') {
      checkBalls(p);
      checkTrainSounds(p);
      saucer.update(dt, p, idleLimit(state.score), cam.trailingRow(), state.time);
      ui.setBarkCharge(bark.charge(state.time));
      if (state.combo && state.time - state.lastPickupAt > COMBO.WINDOW) state.combo = 0;
      if (zoomiesActive(p, state.time) && state.frame % 2 === 0) particles.spawn('zoom', p.px, 0.25, p.pz + 0.3);
    }
    cam.update(dt, p, difficulty(state.score).autoScroll);
    ensureWorld(p);
  } else if (state.phase === 'dying') {
    state.death.t += dt;
    const t = state.death.t;
    switch (state.death.type) {
      case 'drowned':
        // Sink below the surface, with a wobble as he goes.
        p.py = -Math.min(0.8, t * 1.6);
        p.px = p.x + 0.04 * Math.sin(t * 22);
        p.scale = [1, 1, 1];
        break;
      case 'trainHit':
        // Launched along the train's direction, up and over.
        p.py = Math.max(0, 5.5 * t * (1.1 - t));
        p.px = p.x + state.death.dir * 3.2 * t;
        p.scale = [1, 1, 1];
        break;
      case 'abducted':
        saucer.updateDying(p, t, state.time);
        break;
      default: {
        // Squash: flatten fast, spread a little.
        const k = Math.min(1, t / 0.12);
        p.scale = [1 + 0.45 * k, 1 - 0.85 * k, 1 + 0.45 * k];
        p.py = 0;
      }
    }
    p.vx = 0; p.vy = 0;
    cam.update(dt, p, 0);
    if (t >= (DEATH_HOLD[state.death.type] ?? 0.9)) finishDeath();
  }

  particles.update(dt);

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
    title: state.phase === 'title',
    zoomies: zoomiesActive(p, state.time),
    shake: critters.holdingToy,
  });
  // Train hit: tumble end over end while airborne. Abducted: spin as he rises.
  const dying = state.phase === 'dying';
  charlie.root.rotation.z = (dying && state.death.type === 'trainHit') ? state.death.t * 16 : 0;
  if (dying && state.death.type === 'abducted') charlie.root.rotation.y += p.spinY || 0;
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
ui.setMuted(audio.muted);
enterTitle();
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
    enterTitle, startGame, togglePause, equip,
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
    bark: () => doBark(),
    awardBalls: (n) => awardBalls(n, state.player.px, state.player.pz, state.player),
    view, cam, world, charlie, saucer, barkSys: bark, unlocks, critters, daycycle, river, audio, particles, ui, storage, THREE,
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
