// Renderer, orthographic camera rig, lights and shadow frustum.
//
// Coordinate system: X runs along a lane (left/right), Y is up, and rows lie
// along Z with row r centred at z = -r, so "forward" is -Z, away from the
// camera. The camera sits behind and above the target, offset toward +X by
// CAM.YAW so lanes tilt down to the right on screen as they do in the real game.

import * as THREE from 'three';
import { CAM, RENDER, TILE_SCREEN_X, ROW_SCREEN_Y } from './config.js';
import { PALETTE } from './palette.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.MAX_PIXEL_RATIO));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.SKY);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, CAM.NEAR, CAM.FAR);
  camera.up.set(0, 1, 0);

  // Direction from the target to the camera.
  const camDir = new THREE.Vector3(
    Math.sin(CAM.YAW) * Math.cos(CAM.PITCH),
    Math.sin(CAM.PITCH),
    Math.cos(CAM.YAW) * Math.cos(CAM.PITCH),
  );

  // Flat, bright, hard-shadowed: strong ambient so the faces turned away from
  // the light (the ones the camera sees) stay readable, and one directional
  // light from behind-left so shadows fall down-right on screen.
  const ambient = new THREE.AmbientLight(0xffffff, 1.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.castShadow = true;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const shadowSize = isMobile ? RENDER.SHADOW_MAP_MOBILE : RENDER.SHADOW_MAP_DESKTOP;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const e = RENDER.SHADOW_HALF_EXTENT;
  sun.shadow.camera.left = -e;
  sun.shadow.camera.right = e;
  sun.shadow.camera.top = e;
  sun.shadow.camera.bottom = -e;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const sunOffset = new THREE.Vector3(-5, 10, -4).normalize().multiplyScalar(30);

  const target = new THREE.Vector3(0, 0, 0);

  function setTarget(x, y, z) {
    target.set(x, y, z);
    camera.position.copy(target).addScaledVector(camDir, CAM.DISTANCE);
    camera.lookAt(target);
    // The shadow frustum follows the view so its texels are spent where we look.
    sun.position.copy(target).add(sunOffset);
    sun.target.position.copy(target);
    sun.target.updateMatrixWorld();
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;

    // Portrait fits VIEW_TILES_X tiles across; landscape is instead clamped so
    // at least MIN_VIEW_Z rows stay visible, which widens the view to show most
    // of the field on a desktop. Both expressed in camera-space units.
    let halfW = (CAM.VIEW_TILES_X / 2) * TILE_SCREEN_X;
    let halfH = halfW / aspect;
    const minHalfH = (CAM.MIN_VIEW_Z / 2) * ROW_SCREEN_Y;
    if (halfH < minHalfH) {
      halfH = minHalfH;
      halfW = halfH * aspect;
    }
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    return { w, h, aspect, halfW, halfH };
  }

  setTarget(0, 0, 0);
  resize();

  return { renderer, scene, camera, sun, ambient, target, setTarget, resize, camDir };
}
