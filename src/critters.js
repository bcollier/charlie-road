// Critters that cross grass rows: the caterpillar toy (inches across like a
// snake; catch it for +5, Charlie plays with it, then leaves it lying on the
// grass) and squirrels (dash-and-pause, panic when he's close; catch for +3).
// Rows carry `desc.critter` from the generator; instances spawn when the row
// comes within view and its delay has elapsed.

import * as THREE from 'three';
import { CATERPILLAR, SQUIRREL, FIELD } from './config.js';
import { createCaterpillar } from './models/caterpillar.js';
import { createSquirrel } from './models/squirrel.js';

const EDGE = FIELD.MAX_X + 3;

export function createCritters({ scene, world, charlie, audio, particles, ui, awardBalls, celebrate }) {
  const live = new Map();     // row index → instance
  let toy = null;             // { model, until } caterpillar in his mouth
  const dropped = [];         // caterpillars left on the grass: { model, row }

  function lcg(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function spawnCaterpillar(row, now) {
    const d = row.desc.critter;
    const model = createCaterpillar();
    model.root.position.z = -row.desc.index;
    model.root.visible = false;
    scene.add(model.root);
    return {
      kind: 'caterpillar', row: row.desc.index, dir: d.dir, t0: now + d.delay, model, done: false, caught: false,
      update(dt, now, p, canCatch) {
        if (now < this.t0) return;
        model.root.visible = true;
        const headX = -this.dir * EDGE + this.dir * CATERPILLAR.SPEED * (now - this.t0);
        model.pose(headX, this.dir, now);
        const tailX = headX - this.dir * CATERPILLAR.SEG_LEN * (CATERPILLAR.SEGMENTS - 1);
        if (this.dir > 0 ? tailX > EDGE : tailX < -EDGE) { this.done = true; return; }
        if (!canCatch || Math.abs(-p.pz - this.row) > 0.45) return;
        for (let i = 0; i < CATERPILLAR.SEGMENTS; i++) {
          const x = headX - this.dir * i * CATERPILLAR.SEG_LEN;
          if (Math.abs(p.px - x) < 0.5) { this.catch(p, now); return; }
        }
      },
      catch(p, now) {
        this.caught = true; this.done = true;
        awardBalls(CATERPILLAR.VALUE, p.px, p.pz, p);
        audio.squeakSeries(3);
        ui.toast('CATERPILLAR!', '+' + CATERPILLAR.VALUE + ' balls', 1600);
        particles.spawn('confetti', p.px, 0.8, p.pz);
        celebrate(p);
        // Into his mouth: reparent under the head, held sideways.
        scene.remove(model.root);
        model.root.position.set(0, -0.06, -0.3);
        model.root.scale.setScalar(0.55);
        charlie.head.add(model.root);
        toy = { model, until: now + CATERPILLAR.PLAY_TIME };
      },
      dispose() { if (!this.caught) scene.remove(model.root); },
    };
  }

  function spawnSquirrel(row, now) {
    const d = row.desc.critter;
    const model = createSquirrel();
    model.root.position.z = -row.desc.index;
    model.root.visible = false;
    scene.add(model.root);
    const rnd = lcg(row.desc.index + 17);
    return {
      kind: 'squirrel', row: row.desc.index, dir: d.dir, t0: now + d.delay, model, done: false,
      x: -d.dir * (FIELD.MAX_X + 1), mode: 'run', modeUntil: now + d.delay + CATERPILLAR.SEG_LEN, panic: false,
      update(dt, now, p, canCatch) {
        if (now < this.t0) return;
        model.root.visible = true;
        const onRow = Math.abs(-p.pz - this.row) < 1.2;
        if (canCatch && onRow && Math.abs(p.px - this.x) < SQUIRREL.PANIC_RADIUS && !this.panic) {
          this.panic = true;
          this.dir = Math.sign(this.x - p.px) || this.dir;
          audio.squirrelChitter();
        }
        let running;
        if (this.panic) {
          this.x += this.dir * SQUIRREL.PANIC_SPEED * dt; running = true;
          // Cornered at the field edge it turns and darts back past him —
          // the catch window — until it has bounced enough times to escape.
          if (Math.abs(this.x) > FIELD.MAX_X + 0.3 && (this.bounces || 0) < SQUIRREL.PANIC_BOUNCES) {
            this.bounces = (this.bounces || 0) + 1;
            this.dir = -this.dir;
            this.x = Math.sign(this.x) * (FIELD.MAX_X + 0.3);
            audio.squirrelChitter();
          }
        }
        else if (this.mode === 'run') {
          this.x += this.dir * SQUIRREL.DASH_SPEED * dt; running = true;
          if (now > this.modeUntil) { this.mode = 'pause'; this.modeUntil = now + SQUIRREL.PAUSE[0] + rnd() * (SQUIRREL.PAUSE[1] - SQUIRREL.PAUSE[0]); }
        } else {
          running = false;
          if (now > this.modeUntil) { this.mode = 'run'; this.modeUntil = now + SQUIRREL.DASH / SQUIRREL.DASH_SPEED; }
        }
        model.root.position.x = this.x;
        model.root.rotation.y = this.dir > 0 ? 0 : Math.PI;
        model.animate(now, running);
        if (Math.abs(this.x) > EDGE) { this.done = true; return; }
        if (canCatch && Math.abs(-p.pz - this.row) < 0.45 && Math.abs(p.px - this.x) < 0.5) this.catch(p, now);
      },
      catch(p) {
        this.done = true;
        awardBalls(SQUIRREL.VALUE, p.px, p.pz, p);
        audio.squirrelChitter();
        audio.bark();
        ui.toast('SQUIRREL!', '+' + SQUIRREL.VALUE + ' balls', 1300);
        particles.spawn('dust', this.x, 0.2, -this.row);
        particles.spawn('sparkle', this.x, 0.4, -this.row);
        celebrate(p);
      },
      dispose() { scene.remove(model.root); },
    };
  }

  return {
    get holdingToy() { return !!toy; },
    get live() { return live; },

    update(dt, p, now, camRow, phase) {
      const canCatch = phase === 'playing';
      // Spawn for rows coming into view.
      for (const r of world.rows.values()) {
        const c = r.desc.critter;
        if (!c || live.has(r.desc.index) || r.critterSpawned) continue;
        const rel = r.desc.index - camRow;
        if (rel < -2 || rel > 12) continue;
        r.critterSpawned = true;
        live.set(r.desc.index, c.kind === 'caterpillar' ? spawnCaterpillar(r, now) : spawnSquirrel(r, now));
      }
      for (const [i, c] of live) {
        if (!world.row(i)) { c.dispose(); live.delete(i); continue; }
        c.update(dt, now, p, canCatch);
        if (c.done) { c.dispose(); live.delete(i); }
      }
      // The toy in his mouth wriggles; after PLAY_TIME he drops it on the grass.
      if (toy) {
        toy.model.poseInMouth(now);
        if (now >= toy.until || !p.alive) {
          charlie.head.remove(toy.model.root);
          const row = world.row(Math.round(-p.pz));
          const m = toy.model;
          m.root.scale.setScalar(0.8);
          m.root.rotation.set(0, 0, 0);
          if (row) { m.root.position.set(p.px, 0, 0); row.group.add(m.root); dropped.push({ model: m, row }); }
          else scene.remove(m.root);
          m.poseDropped(now);
          particles.spawn('dust', p.px, 0.1, p.pz);
          audio.squeak();
          toy = null;
        }
      }
      for (let i = dropped.length - 1; i >= 0; i--) if (!world.row(dropped[i].row.desc.index)) dropped.splice(i, 1);
    },

    reset() {
      for (const c of live.values()) c.dispose();
      live.clear();
      if (toy) { charlie.head.remove(toy.model.root); toy = null; }
      dropped.length = 0;
    },
  };
}
