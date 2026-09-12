// Charlie: American cocker spaniel, liver and white. Faces -Z.
//
// The four silhouette cues that make him a cocker rather than a springer:
// domed skull, short muzzle with a pronounced stop, long low-set feathered
// ears, and big round eyes. Ears and tail are their own groups so they can
// swing; the head is its own group so it can tilt. See SPEC.md §4.1, §5.2.

import * as THREE from 'three';
import { buildVoxelMesh, box, material } from '../voxel.js';
import { PALETTE as P } from '../palette.js';
import { PLAYER, BALL } from '../config.js';
import { buildBallGeometry } from './ball.js';

const TWO_PI = Math.PI * 2;

export function createCharlie() {
  const root = new THREE.Group();

  // ---- Body (root space) ----
  const body = buildVoxelMesh([
    box(0, 0.21, 0.04, 0.44, 0.30, 0.54, P.FUR_WHITE),
    box(0, 0.09, 0.06, 0.48, 0.10, 0.50, P.FUR_WHITE),   // belly feathering
    box(0, 0.365, 0.10, 0.46, 0.06, 0.30, P.LIVER),      // saddle
    box(-0.15, 0.06, -0.17, 0.12, 0.14, 0.12, P.FUR_WHITE),
    box(0.15, 0.06, -0.17, 0.12, 0.14, 0.12, P.FUR_WHITE),
    box(-0.15, 0.06, 0.19, 0.12, 0.14, 0.12, P.FUR_WHITE),
    box(0.15, 0.06, 0.19, 0.12, 0.14, 0.12, P.FUR_WHITE),
    box(0, 0.40, -0.20, 0.37, 0.06, 0.24, P.COLLAR),
    box(0, 0.36, -0.325, 0.05, 0.05, 0.03, P.TAG),
  ], { name: 'charlie-body' });
  root.add(body);

  // ---- Head (own group so it can tilt) ----
  const head = new THREE.Group();
  head.position.set(0, 0.46, -0.28);
  const headMesh = buildVoxelMesh([
    box(0, 0.11, 0, 0.34, 0.30, 0.28, P.LIVER),           // skull
    box(0, 0.27, 0.01, 0.28, 0.07, 0.22, P.LIVER),        // dome (cue 1)
    box(0, 0.14, -0.142, 0.10, 0.28, 0.02, P.FUR_WHITE),  // blaze
    box(0, -0.01, -0.17, 0.19, 0.12, 0.10, P.FUR_WHITE),  // short muzzle (cue 2)
    box(0, 0.02, -0.235, 0.10, 0.08, 0.04, P.NOSE),
    box(-0.10, 0.14, -0.145, 0.07, 0.07, 0.02, P.EYE),     // big round eyes (cue 4)
    box(0.10, 0.14, -0.145, 0.07, 0.07, 0.02, P.EYE),
    box(-0.115, 0.155, -0.16, 0.025, 0.025, 0.025, P.FUR_WHITE), // glints, upper-outer
    box(0.085, 0.155, -0.16, 0.025, 0.025, 0.025, P.FUR_WHITE),
  ], { name: 'charlie-head' });
  head.add(headMesh);

  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.11), material(P.TONGUE));
  tongue.position.set(0, -0.05, -0.21);
  tongue.castShadow = true;
  tongue.visible = false;
  head.add(tongue);

  // ---- Ears: low-set pivots, long, feathered tips (cue 3) ----
  // The camera looks down from behind, so the ears must read from above: a
  // top ledge that sticks out past the skull, a flap that splays outward, and
  // a wider feathered tip. Base splay is EAR_SPLAY; animation adds to it.
  const EAR_SPLAY = 0.22;
  function makeEar(side) {
    const g = new THREE.Group();
    g.position.set(side * 0.19, 0.18, -0.01);
    g.add(buildVoxelMesh([
      box(side * 0.02, 0.02, 0, 0.14, 0.09, 0.22, P.LIVER_DARK),   // top ledge
      box(side * 0.03, -0.20, 0, 0.11, 0.42, 0.26, P.LIVER_DARK),  // flap
      box(side * 0.04, -0.40, 0.01, 0.13, 0.12, 0.24, P.LIVER_DARK), // feathered tip
    ], { name: side < 0 ? 'charlie-earL' : 'charlie-earR' }));
    return g;
  }
  const earL = makeEar(-1);
  const earR = makeEar(1);
  head.add(earL, earR);

  // ---- Ball carried in the mouth once he has fetched one ----
  const mouthBall = new THREE.Mesh(buildBallGeometry(), material(P.BALL));
  mouthBall.scale.setScalar(0.16 / BALL.DIAMETER);
  mouthBall.position.set(0, -0.04, -0.26);
  mouthBall.castShadow = true;
  mouthBall.visible = false;
  head.add(mouthBall);

  root.add(head);

  // ---- Tail: docked, carried up, never stops ----
  const tail = new THREE.Group();
  tail.position.set(0, 0.34, 0.29);
  tail.add(buildVoxelMesh([
    box(0, 0.09, 0.05, 0.10, 0.20, 0.10, P.LIVER),
    box(0, 0.20, 0.06, 0.12, 0.06, 0.12, P.LIVER_LIGHT),   // lighter tip so it reads from above
  ], { name: 'charlie-tail' }));
  root.add(tail);

  // ---- Animation state ----
  // Each ear is a damped spring on its pitch angle (ω_n 18, ζ 0.35).
  const ear = { L: { a: 0, v: 0 }, R: { a: 0, v: 0 } };
  const K = 18 * 18;
  const C = 2 * 0.35 * 18;
  const tilt = { a: 0, turn: 0, side: 1, timer: 0 };

  /**
   * Drive the rig from the player's state.
   * @param dt seconds
   * @param s  { vy, vx, idle, celebrate (0..1 progress or -1), carrying, facingAngle, moving }
   */
  function animate(dt, s) {
    const celebrating = s.celebrate >= 0 && s.celebrate < 1;

    // Ears: lag the vertical velocity, clamp, spring toward it. Lateral
    // velocity rolls both ears the opposite way; celebration flares them out.
    const target = THREE.MathUtils.clamp(-0.55 * s.vy, -0.9, 0.9);
    for (const k of ['L', 'R']) {
      const e = ear[k];
      e.v += (K * (target - e.a) - C * e.v) * dt;
      e.a += e.v * dt;
    }
    earL.rotation.x = ear.L.a;
    earR.rotation.x = ear.R.a;
    const lag = THREE.MathUtils.clamp(-0.4 * s.vx, -0.5, 0.5);
    const flare = celebrating ? 0.7 * Math.sin(Math.PI * s.celebrate) : 0;
    // Positive z-rotation moves a hanging tip toward +X, so the left ear
    // splays outward with a negative angle and the right with a positive one.
    earL.rotation.z = -EAR_SPLAY + lag - flare;
    earR.rotation.z = EAR_SPLAY + lag + flare;

    // Tail: 6 Hz / 0.25 rad idle, 14 Hz / 0.50 rad when celebrating.
    const f = celebrating ? 14 : 6;
    const amp = celebrating ? 0.50 : 0.25;
    tail.rotation.y = amp * Math.sin(TWO_PI * f * s.time);

    // Idle attitude: after IDLE_TILT_AFTER seconds without input, the cocker
    // head-tilt, alternating sides, tongue out — and he looks back over his
    // shoulder toward the camera, which is the only time the player sees his
    // face. Cancels the instant he moves.
    const idling = s.idle >= PLAYER.IDLE_TILT_AFTER && !s.moving && !celebrating;
    if (idling) {
      tilt.timer += dt;
      if (tilt.timer > 2.2) { tilt.timer = 0; tilt.side = -tilt.side; }
      const goal = 0.35 * tilt.side;
      tilt.a += (goal - tilt.a) * Math.min(1, dt / 0.25 * 3);
      // Look back over the RIGHT shoulder, always. The camera sits at +X/+Z,
      // and a -115° turn is the one that actually points his face at it
      // (dot with the view direction is 0.35; the other side is 0.09).
      tilt.turn += (-2.0 - tilt.turn) * Math.min(1, dt / 0.35 * 3);
    } else {
      tilt.a += (0 - tilt.a) * Math.min(1, dt * 18);
      tilt.turn += (0 - tilt.turn) * Math.min(1, dt * 18);
      tilt.timer = 0;
    }
    head.rotation.set(0, tilt.turn, tilt.a);

    tongue.visible = celebrating || (s.idle >= PLAYER.IDLE_TILT_AFTER && !s.moving);
    mouthBall.visible = !!s.carrying;

    // Facing, plus the celebration spin layered on top. Cosmetic only:
    // nothing here touches the logical position or the input queue.
    let spin = 0;
    if (celebrating) {
      const t = s.celebrate;
      const eased = 1 - Math.pow(1 - t, 3);
      spin = TWO_PI * eased;
    }
    root.rotation.y = s.facingAngle + spin;
  }

  return { root, head, earL, earR, tail, tongue, mouthBall, animate };
}
