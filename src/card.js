// The shareable card: a "shiny trading card" of Charlie in his outfit with
// the run's score, rendered to a PNG. Charlie is photographed with a second
// camera into an offscreen render target (front-on, looking up), then
// composed onto a 2D canvas with a holographic background.

import * as THREE from 'three';
import { byId } from './models/accessories.js';

const W = 600, H = 900, SNAP = 512;

export function createCard({ renderer, scene, charlie }) {
  const rt = new THREE.WebGLRenderTarget(SNAP, SNAP, { samples: 4 });
  const cam = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 60);
  const pixels = new Uint8Array(SNAP * SNAP * 4);

  /** Photograph Charlie: pose him for the camera, render, restore. */
  function snapshot() {
    const root = charlie.root;
    const saved = { pos: root.position.clone(), rot: root.rotation.clone(), scale: root.scale.clone(), head: charlie.head.rotation.clone(), vis: root.visible };
    root.visible = true;
    root.scale.set(1, 1, 1);
    root.position.y = 0;                            // he may be squashed, sunk or airborne
    root.rotation.set(0, Math.PI + 0.35, 0);       // facing the viewer, a touch to the side
    charlie.head.rotation.set(-0.45, 0, 0.18);     // looking up, head cocked
    const p = root.position;
    cam.position.set(p.x + 1.4, p.y + 1.6, p.z + 2.6);
    cam.lookAt(p.x, p.y + 0.42, p.z);
    cam.updateProjectionMatrix();

    const prevTarget = renderer.getRenderTarget();
    const prevBg = scene.background;
    const prevAlpha = renderer.getClearAlpha();
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, SNAP, SNAP, pixels);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(0x000000, prevAlpha);
    scene.background = prevBg;

    root.position.copy(saved.pos); root.rotation.copy(saved.rot); root.scale.copy(saved.scale);
    charlie.head.rotation.copy(saved.head); root.visible = saved.vis;

    // GL rows are bottom-up; flip into an ImageData.
    const c = document.createElement('canvas');
    c.width = SNAP; c.height = SNAP;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SNAP, SNAP);
    for (let y = 0; y < SNAP; y++) {
      const src = (SNAP - 1 - y) * SNAP * 4, dst = y * SNAP * 4;
      img.data.set(pixels.subarray(src, src + SNAP * 4), dst);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function outlined(ctx, text, x, y, size, fill, align = 'center') {
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.16);
    ctx.strokeStyle = '#1b1b2a';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  /**
   * Build the card. Returns { dataUrl, blob }.
   * @param info { score, best, ballsRun, ballsTotal, equipped, daily, dateStr, isNew }
   */
  async function make(info) {
    const photo = snapshot();
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Holographic ground: a soft rainbow sweep with diagonal light streaks.
    const g = ctx.createLinearGradient(0, 0, W, H);
    ['#ffd6e8', '#fff3b0', '#c8f7d0', '#c6e7ff', '#e6d0ff', '#ffd6e8'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.35;
    for (let i = -H; i < W + H; i += 46) {
      ctx.fillStyle = i % 92 === 0 ? '#ffffff' : '#ffffff00';
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 18, 0); ctx.lineTo(i + 18 - H, H); ctx.lineTo(i - H, H); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Frame.
    ctx.lineWidth = 12; ctx.strokeStyle = '#1b1b2a';
    roundRect(ctx, 16, 16, W - 32, H - 32, 34); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#ffffffaa';
    roundRect(ctx, 30, 30, W - 60, H - 60, 26); ctx.stroke();

    // Title.
    outlined(ctx, 'CHARLIE', W / 2, 92, 76, '#ffffff');
    outlined(ctx, 'ROAD', W / 2, 150, 46, '#d9e534');

    // Photo window.
    ctx.save();
    roundRect(ctx, 90, 190, W - 180, 360, 28); ctx.clip();
    const pg = ctx.createLinearGradient(0, 190, 0, 550);
    pg.addColorStop(0, '#72d8ff'); pg.addColorStop(1, '#6e9e30');
    ctx.fillStyle = pg; ctx.fillRect(90, 190, W - 180, 360);
    ctx.drawImage(photo, 60, 150, W - 120, W - 120);
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#1b1b2a'; roundRect(ctx, 90, 190, W - 180, 360, 28); ctx.stroke();

    // Score block.
    outlined(ctx, String(info.score), W / 2, 640, 120, '#ffffff');
    outlined(ctx, (info.daily ? 'DAILY BEST ' : 'BEST ') + info.best, W / 2, 716, 30, '#ffffff');
    if (info.isNew) outlined(ctx, 'NEW BEST!', W / 2, 760, 30, '#d9e534');

    // Balls and outfit.
    const balls = `● ${info.ballsRun} fetched this run · ${info.ballsTotal} lifetime`;
    outlined(ctx, balls, W / 2, info.isNew ? 806 : 776, 22, '#d9e534');
    const names = ['head', 'neck', 'body'].map(s => info.equipped[s] && byId(info.equipped[s])).filter(Boolean).map(a => a.name);
    outlined(ctx, names.length ? 'wearing: ' + names.join(' · ') : 'au naturel', W / 2, info.isNew ? 842 : 812, 20, '#ffffff');

    // Footer.
    ctx.font = '900 16px "Arial Black", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1b1b2a';
    ctx.fillText((info.daily ? 'DAILY · ' : '') + info.dateStr, 52, H - 52);
    ctx.textAlign = 'right';
    ctx.fillText('a dog with attitude', W - 52, H - 52);

    const dataUrl = c.toDataURL('image/png');
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    return { dataUrl, blob };
  }

  return { make };
}
