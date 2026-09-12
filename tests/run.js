// Fairness and rules tests. Plain node, no dependencies:
//   node tests/run.js
// Exits 1 on any failure. Covers the invariants in SPEC.md §6 over
// 2,000 rows × 50 seeds, plus the difficulty curve, the eagle timer,
// collision maths, and RNG determinism.

import { FIELD, DIFF, RIVER, VEHICLES } from '../src/config.js';
import { createRng } from '../src/rules/rng.js';
import { difficulty, idleLimit } from '../src/rules/difficulty.js';
import { generateRows, LANE_HALF, MIN_SHARED_FREE } from '../src/rules/worldgen.js';
import { spansOverlap, aabb, wrapLane, findPlatform, vehicleBox, playerBox } from '../src/rules/collide.js';

let pass = 0, fail = 0;
const failures = [];
function check(cond, msg) {
  if (cond) pass++;
  else { fail++; if (failures.length < 40) failures.push(msg); }
}
function section(name) { process.stdout.write(`\n${name}\n`); }

const SEEDS = 50, ROWS = 2000;
const HAZARD = new Set(['road', 'river', 'rail']);

// ---- RNG -------------------------------------------------------------------
section('rng');
{
  const a = createRng(123), b = createRng(123);
  let same = true;
  for (let i = 0; i < 1000; i++) if (a.next() !== b.next()) same = false;
  check(same, 'same seed → same sequence');
  const c = createRng(124);
  let diff = false;
  for (let i = 0; i < 100; i++) if (a.next() !== c.next()) diff = true;
  check(diff, 'different seed → different sequence');
  const r = createRng(9);
  let inRange = true;
  for (let i = 0; i < 10000; i++) { const v = r.next(); if (v < 0 || v >= 1) inRange = false; }
  check(inRange, 'next() in [0,1)');
  let intOk = true;
  for (let i = 0; i < 10000; i++) { const v = r.int(-6, 6); if (v < -6 || v > 6 || !Number.isInteger(v)) intOk = false; }
  check(intOk, 'int(lo,hi) inclusive integer');
}

// ---- Difficulty ------------------------------------------------------------
section('difficulty');
{
  let prev = difficulty(0);
  let monotone = true, clamped = true;
  for (let s = 1; s <= 600; s++) {
    const d = difficulty(s);
    if (d.vehicleSpeed[1] < prev.vehicleSpeed[1] - 1e-9 || d.hazardChance < prev.hazardChance - 1e-9 ||
        d.maxHazardRun < prev.maxHazardRun || d.autoScroll < prev.autoScroll - 1e-9 || d.vehicleGapMin > prev.vehicleGapMin + 1e-9) monotone = false;
    if (d.vehicleGapMin < DIFF.MIN_GAP - 1e-9) clamped = false;
    prev = d;
  }
  check(monotone, 'difficulty is monotone in score');
  check(clamped, 'vehicleGapMin never below MIN_GAP');
  const d0 = difficulty(0), dMax = difficulty(300), dOver = difficulty(9999);
  check(d0.maxHazardRun === 2 && dMax.maxHazardRun === 4, `maxHazardRun 2 → 4 (got ${d0.maxHazardRun} → ${dMax.maxHazardRun})`);
  check(JSON.stringify(dMax) === JSON.stringify(dOver), 'difficulty clamps at SCORE_CAP');
  check(Math.abs(idleLimit(0) - 5) < 1e-9 && Math.abs(idleLimit(150) - 3) < 1e-9 && Math.abs(idleLimit(300) - 2) < 1e-9 && idleLimit(5000) === 2, 'eagle idle limit 5 → 3 → 2, clamped');
  let idleMono = true;
  for (let s = 1; s <= 400; s++) if (idleLimit(s) > idleLimit(s - 1) + 1e-9) idleMono = false;
  check(idleMono, 'eagle idle limit never increases');
}

// ---- Collision maths -------------------------------------------------------
section('collide');
{
  check(spansOverlap(0, 1, 0.9, 1) && !spansOverlap(0, 1, 1.0, 1) && !spansOverlap(0, 1, 1.1, 1), 'spansOverlap edge cases');
  check(aabb({ x: 0, z: 0, w: 1, d: 1 }, { x: 0.5, z: 0.5, w: 1, d: 1 }) && !aabb({ x: 0, z: 0, w: 1, d: 1 }, { x: 2, z: 0, w: 1, d: 1 }), 'aabb');
  check(Math.abs(wrapLane(12, 12) - (-12)) < 1e-9 && Math.abs(wrapLane(-12.5, 12) - 11.5) < 1e-9 && Math.abs(wrapLane(3, 12) - 3) < 1e-9, 'wrapLane');
  const plats = [{ x: 0, len: 2 }, { x: 5, len: 1 }];
  check(findPlatform(1.2, plats) === plats[0] && findPlatform(1.3, plats) === null && findPlatform(5.7, plats) === plats[1] && findPlatform(3, plats) === null, 'findPlatform with tolerance');
  const car = vehicleBox(0, 0, 'car');
  check(Math.abs(car.w - VEHICLES.car.len * VEHICLES.HITBOX_LEN) < 1e-9, 'vehicle hitbox is forgiving');
  check(aabb(playerBox(0.5, 0), car) && !aabb(playerBox(1.2, 0), car), 'player vs car');
}

// ---- World generation invariants ------------------------------------------
section('worldgen');
{
  let firstSafe = true, runOk = true, roadGap = true, riverGap = true, grassFree = true, grassShared = true, noOverlap = true, noStartBlock = true, ballsOnFree = true;
  let totalRoad = 0, totalRiver = 0, totalRail = 0, totalGrass = 0;
  let worstRun = 0;

  for (let seed = 1; seed <= SEEDS; seed++) {
    const rows = generateRows(seed * 7919, ROWS);
    check(rows.length === ROWS, `seed ${seed}: generated ${ROWS} rows`);
    check(rows.every((r, i) => r.index === i), `seed ${seed}: indices are sequential`);

    // 1. start rows
    for (let i = 0; i < FIELD.START_SAFE_ROWS; i++) {
      if (rows[i].type !== 'grass' || rows[i].obstacles.length) firstSafe = false;
    }

    // 2. hazard run length vs difficulty at the run start
    let run = 0, runStart = 0;
    for (let i = 0; i < ROWS; i++) {
      if (HAZARD.has(rows[i].type)) { if (run === 0) runStart = i; run++; worstRun = Math.max(worstRun, run); }
      else run = 0;
      if (run > difficulty(runStart).maxHazardRun) { runOk = false; if (failures.length < 40) failures.push(`seed ${seed}: hazard run ${run} > ${difficulty(runStart).maxHazardRun} at row ${i}`); }
    }

    let prevGrass = null;
    for (const r of rows) {
      if (r.type === 'grass') {
        totalGrass++;
        const occupied = new Set(r.obstacles.map(o => o.x));
        const free = [];
        for (let x = FIELD.MIN_X; x <= FIELD.MAX_X; x++) if (!occupied.has(x)) free.push(x);
        if (free.length < 2) grassFree = false;
        if (r.index < FIELD.START_SAFE_ROWS + 2 && occupied.has(0)) noStartBlock = false;
        if (prevGrass && prevGrass.index === r.index - 1) {
          const shared = free.filter(x => !prevGrass.free.has(x)).length;
          if (free.length - shared < MIN_SHARED_FREE) { grassShared = false; if (failures.length < 40) failures.push(`seed ${seed}: row ${r.index} shares ${free.length - shared} free cols with previous grass`); }
        }
        for (const o of r.obstacles) if (o.x < FIELD.MIN_X || o.x > FIELD.MAX_X) grassFree = false;
        if (r.ball && occupied.has(r.ball.x)) ballsOnFree = false;
        prevGrass = { index: r.index, free: new Set(free) };
      } else {
        prevGrass = null;
      }

      if (r.type === 'road') {
        totalRoad++;
        const d = difficulty(r.index);
        const need = Math.max(DIFF.MIN_GAP, d.vehicleGapMin) - 1e-9;
        const vs = r.vehicles.map(v => ({ x: v.x0, len: VEHICLES[v.kind].len })).sort((a, b) => a.x - b.x);
        if (vs.length === 0) { roadGap = false; if (failures.length < 40) failures.push(`seed ${seed}: road ${r.index} has no vehicles`); }
        let maxGap = 0;
        for (let k = 0; k < vs.length; k++) {
          const a = vs[k], b = vs[(k + 1) % vs.length];
          let gap = (b.x - b.len / 2) - (a.x + a.len / 2);
          if (k === vs.length - 1) gap += LANE_HALF * 2;   // across the wrap seam
          if (gap < -1e-9) { noOverlap = false; if (failures.length < 40) failures.push(`seed ${seed}: road ${r.index} vehicles overlap (gap ${gap.toFixed(2)})`); }
          maxGap = Math.max(maxGap, gap);
          if (vs.length === 1) maxGap = LANE_HALF * 2 - a.len;
        }
        if (maxGap < need) { roadGap = false; if (failures.length < 40) failures.push(`seed ${seed}: road ${r.index} max gap ${maxGap.toFixed(2)} < ${need.toFixed(2)}`); }
        if (r.speed < d.vehicleSpeed[0] - 1e-9 || r.speed > d.vehicleSpeed[1] + 1e-9) roadGap = false;
      }

      if (r.type === 'river') {
        totalRiver++;
        const ps = r.platforms.map(p => ({ x: p.x0, len: p.len })).sort((a, b) => a.x - b.x);
        if (ps.length === 0) riverGap = false;
        for (let k = 0; k < ps.length; k++) {
          const a = ps[k], b = ps[(k + 1) % ps.length];
          let gap = (b.x - b.len / 2) - (a.x + a.len / 2);
          if (k === ps.length - 1) gap += LANE_HALF * 2;
          if (gap < -1e-9) { noOverlap = false; if (failures.length < 40) failures.push(`seed ${seed}: river ${r.index} platforms overlap`); }
          if (gap > RIVER.MAX_PLATFORM_GAP + 1e-9) { riverGap = false; if (failures.length < 40) failures.push(`seed ${seed}: river ${r.index} gap ${gap.toFixed(2)} > ${RIVER.MAX_PLATFORM_GAP}`); }
        }
      }
      if (r.type === 'rail') totalRail++;
    }
  }

  check(firstSafe, `inv 1: first ${FIELD.START_SAFE_ROWS} rows are empty grass`);
  check(runOk, `inv 2: hazard runs never exceed maxHazardRun (worst ${worstRun})`);
  check(roadGap, 'inv 3: every road lane has a crossable gap and in-range speed');
  check(riverGap, `inv 4: every river gap ≤ ${RIVER.MAX_PLATFORM_GAP}`);
  check(grassFree, 'inv 5a: grass rows keep ≥ 2 free in-field columns');
  check(noStartBlock, 'inv 5b: nothing at x=0 near the start');
  check(grassShared, `inv 5c: adjacent grass rows share ≥ ${MIN_SHARED_FREE} free columns`);
  check(noOverlap, 'inv 6: vehicles and platforms never overlap, wrap included');
  check(ballsOnFree, 'balls never spawn on an obstacle');
  check(totalRoad > 0 && totalRiver > 0 && totalRail > 0 && totalGrass > 0, `all row types occur (grass ${totalGrass}, road ${totalRoad}, river ${totalRiver}, rail ${totalRail})`);

  const a = generateRows(42, 300), b = generateRows(42, 300);
  check(JSON.stringify(a) === JSON.stringify(b), 'same seed → identical world');
}

// ---- Report ----------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
