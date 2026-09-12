// HUD and overlays as DOM over the WebGL canvas: score/best, the ball
// counter, pause and mute buttons, the title card with the outfit picker,
// the pause card, and the game-over card with death-specific copy.
// Overlays are pointer-transparent so a tap anywhere still reaches the
// canvas; only buttons and the picker take pointer events.

import { ACCESSORIES, SLOTS, isUnlocked } from './models/accessories.js';

const DEATH_COPY = {
  squashed: 'OUCH',
  drowned: 'SPLASH',
  trainHit: 'CHOO CHOO',
  eagle: 'BIRD!',
};

export function createUI(root, h) {
  root.innerHTML = `
    <div class="hud" id="hud">
      <div class="score" id="hud-score">0</div>
      <div class="best" id="hud-best">BEST 0</div>
    </div>
    <div class="hud-right" id="hud-right">
      <div class="balls"><span class="ball-icon"></span><span id="hud-balls-n">0</span></div>
      <div class="hud-buttons">
        <button class="hud-btn" id="btn-pause" aria-label="Pause" title="Pause (P)">II</button>
        <button class="hud-btn" id="btn-mute" aria-label="Mute" title="Mute (M)">♪</button>
      </div>
    </div>

    <div class="overlay title-overlay" id="title" hidden>
      <div class="card title-top">
        <div class="logo"><span>CHARLIE</span><span class="logo-road">ROAD</span></div>
        <div class="tagline">a dog with attitude · fetch every ball</div>
        <div class="title-stats"><span id="title-best">BEST 0</span><span class="dot">·</span><span id="title-balls">0 balls fetched</span></div>
      </div>
      <div class="card title-bottom">
        <div class="card-hint pulse">tap or press space to fetch</div>
        <div class="picker" id="picker"></div>
      </div>
    </div>

    <div class="overlay" id="pause" hidden>
      <div class="card">
        <div class="card-title">PAUSED</div>
        <button class="big-btn" id="btn-resume">RESUME</button>
        <div class="card-hint">esc or P to resume</div>
      </div>
    </div>

    <div class="overlay" id="gameover" hidden>
      <div class="card">
        <div class="card-title" id="go-title">OUCH</div>
        <div class="card-score" id="go-score">0</div>
        <div class="card-best" id="go-best">BEST 0</div>
        <div class="card-new" id="go-new" hidden>NEW BEST!</div>
        <div class="card-balls" id="go-balls" hidden></div>
        <div class="card-hint">tap or press space to go again</div>
        <button class="small-btn" id="btn-outfits">OUTFITS</button>
      </div>
    </div>
  `;
  const $ = (id) => root.querySelector('#' + id);
  const els = {
    score: $('hud-score'), best: $('hud-best'), balls: $('hud-balls-n'),
    pauseBtn: $('btn-pause'), muteBtn: $('btn-mute'),
    title: $('title'), titleBest: $('title-best'), titleBalls: $('title-balls'), picker: $('picker'),
    pause: $('pause'), resume: $('btn-resume'),
    gameover: $('gameover'), goTitle: $('go-title'), goScore: $('go-score'), goBest: $('go-best'), goNew: $('go-new'), goBalls: $('go-balls'), outfits: $('btn-outfits'),
  };

  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  els.pauseBtn.addEventListener('pointerup', stop(() => h.onPause()));
  els.muteBtn.addEventListener('pointerup', stop(() => h.onMute()));
  els.resume.addEventListener('pointerup', stop(() => h.onPause()));
  els.outfits.addEventListener('pointerup', stop(() => h.onOutfits()));
  for (const b of [els.pauseBtn, els.muteBtn, els.resume, els.outfits]) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  let lastScore = -1, lastBest = -1, lastBalls = -1;

  function renderPicker(ballsTotal, equipped) {
    els.picker.innerHTML = '';
    for (const a of ACCESSORIES) {
      const unlocked = isUnlocked(a.id, ballsTotal);
      const on = equipped[a.slot] === a.id;
      const b = document.createElement('button');
      b.className = 'chip' + (unlocked ? '' : ' locked') + (on ? ' on' : '');
      b.dataset.id = a.id;
      b.innerHTML = `<span class="swatch" style="background:${a.swatch}"></span><span class="chip-name">${a.name}</span><span class="chip-cost">${unlocked ? (on ? 'ON' : 'OFF') : a.cost + ' balls'}</span>`;
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('pointerup', stop(() => h.onEquip(a.id)));
      els.picker.appendChild(b);
    }
  }

  return {
    setScore(n) { if (n !== lastScore) { lastScore = n; els.score.textContent = String(n); } },
    setBest(n) { if (n !== lastBest) { lastBest = n; els.best.textContent = 'BEST ' + n; } },
    setBalls(n) { if (n !== lastBalls) { lastBalls = n; els.balls.textContent = String(n); } },
    setMuted(m) { els.muteBtn.textContent = m ? '×' : '♪'; els.muteBtn.classList.toggle('off', m); },
    setHudVisible(v) { $('hud').hidden = !v; },

    showTitle({ best, ballsTotal, equipped }) {
      els.titleBest.textContent = 'BEST ' + best;
      els.titleBalls.textContent = ballsTotal + (ballsTotal === 1 ? ' ball fetched' : ' balls fetched');
      renderPicker(ballsTotal, equipped);
      els.title.hidden = false;
    },
    hideTitle() { els.title.hidden = true; },
    renderPicker,

    showPause() { els.pause.hidden = false; },
    hidePause() { els.pause.hidden = true; },

    showGameOver({ type, score, best, isNew, ballsRun }) {
      els.goTitle.textContent = DEATH_COPY[type] || 'OUCH';
      els.goScore.textContent = String(score);
      els.goBest.textContent = 'BEST ' + best;
      els.goNew.hidden = !isNew;
      els.goBalls.hidden = !ballsRun;
      els.goBalls.innerHTML = `<span class="ball-icon small"></span> +${ballsRun} ${ballsRun === 1 ? 'ball' : 'balls'}`;
      els.gameover.hidden = false;
    },
    hideGameOver() { els.gameover.hidden = true; },
  };
}
