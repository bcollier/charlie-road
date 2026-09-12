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
  abducted: 'ABDUCTED!',
};

export function createUI(root, h) {
  root.innerHTML = `
    <div class="hud" id="hud">
      <div class="score" id="hud-score">0</div>
      <div class="best" id="hud-best">BEST 0</div>
      <div class="daily-tag" id="hud-daily" hidden>DAILY</div>
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
        <div class="controls" id="controls"></div>
        <div class="title-actions"><button class="small-btn daily-btn" id="btn-daily">DAILY CHALLENGE · <span id="daily-best">best 0</span></button></div>
        <div class="picker" id="picker"></div>
      </div>
    </div>

    <div class="overlay" id="cardview" hidden>
      <div class="card-frame">
        <img id="card-img" alt="Charlie Road card">
        <div class="card-actions">
          <a class="small-btn" id="card-save" download="charlie-road.png" href="#">SAVE</a>
          <button class="small-btn" id="card-share" hidden>SHARE</button>
          <button class="small-btn" id="card-close">CLOSE</button>
        </div>
      </div>
    </div>

    <button class="bark-btn" id="btn-bark" aria-label="Bark (B)" title="Bark (B)"><span class="bark-fill" id="bark-fill"></span><span class="bark-face">🐶</span><span class="bark-label">BARK</span></button>
    <div class="hint-bar" id="hintbar" hidden></div>
    <div class="toast" id="toast" hidden><div class="toast-title" id="toast-title"></div><div class="toast-sub" id="toast-sub"></div></div>
    <div class="combo" id="combo" hidden></div>

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
        <div class="go-actions">
          <button class="small-btn" id="btn-card">CARD</button>
          <button class="small-btn" id="btn-outfits">OUTFITS</button>
        </div>
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
    controls: $('controls'), barkBtn: $('btn-bark'), barkFill: $('bark-fill'), hintbar: $('hintbar'),
    toast: $('toast'), toastTitle: $('toast-title'), toastSub: $('toast-sub'), combo: $('combo'),
    dailyTag: $('hud-daily'), dailyBtn: $('btn-daily'), dailyBest: $('daily-best'),
    cardBtn: $('btn-card'), cardView: $('cardview'), cardImg: $('card-img'), cardSave: $('card-save'), cardShare: $('card-share'), cardClose: $('card-close'),
  };

  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  els.pauseBtn.addEventListener('pointerup', stop(() => h.onPause()));
  els.muteBtn.addEventListener('pointerup', stop(() => h.onMute()));
  els.resume.addEventListener('pointerup', stop(() => h.onPause()));
  els.outfits.addEventListener('pointerup', stop(() => h.onOutfits()));
  els.barkBtn.addEventListener('pointerup', stop(() => h.onBark && h.onBark()));
  els.dailyBtn.addEventListener('pointerup', stop(() => h.onDaily && h.onDaily()));
  els.cardBtn.addEventListener('pointerup', stop(() => h.onCard && h.onCard()));
  els.cardClose.addEventListener('pointerup', stop(() => api.hideCard()));
  els.cardShare.addEventListener('pointerup', stop(() => h.onCardShare && h.onCardShare()));
  // The save link must keep its default (download) behaviour; only stop the canvas from seeing it.
  els.cardSave.addEventListener('pointerup', (e) => e.stopPropagation());
  els.cardSave.addEventListener('click', (e) => e.stopPropagation());
  for (const b of [els.pauseBtn, els.muteBtn, els.resume, els.outfits, els.barkBtn, els.dailyBtn, els.cardBtn, els.cardClose, els.cardShare, els.cardSave]) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  let lastScore = -1, lastBest = -1, lastBalls = -1, lastCharge = -1;
  let toastTimer = null, comboTimer = null;

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

  const api = {
    setScore(n) { if (n !== lastScore) { lastScore = n; els.score.textContent = String(n); } },
    setDaily(on) { els.dailyTag.hidden = !on; },
    setDailyBest(n) { els.dailyBest.textContent = 'best ' + n; },
    showCard(dataUrl, canShare) {
      els.cardImg.src = dataUrl;
      els.cardSave.href = dataUrl;
      els.cardShare.hidden = !canShare;
      // The card takes over the screen; the game-over card comes back on close.
      api._goWasShown = !els.gameover.hidden;
      els.gameover.hidden = true;
      els.cardView.hidden = false;
    },
    hideCard() {
      if (els.cardView.hidden) return;
      els.cardView.hidden = true;
      if (api._goWasShown) els.gameover.hidden = false;
    },
    setBest(n) { if (n !== lastBest) { lastBest = n; els.best.textContent = 'BEST ' + n; } },
    setBalls(n) { if (n !== lastBalls) { lastBalls = n; els.balls.textContent = String(n); } },
    setMuted(m) { els.muteBtn.textContent = m ? '×' : '♪'; els.muteBtn.classList.toggle('off', m); },
    setHudVisible(v) { $('hud').hidden = !v; },

    /** 0..1 — the bark button fills back up over the cooldown. */
    setBarkCharge(f) {
      const q = Math.round(f * 40) / 40;
      if (q === lastCharge) return;
      lastCharge = q;
      els.barkFill.style.height = (q * 100) + '%';
      els.barkBtn.classList.toggle('ready', q >= 1);
    },
    setBarkVisible(v) { els.barkBtn.hidden = !v; },
    setControls(text) { els.controls.textContent = text; },
    showHint(text) { els.hintbar.textContent = text; els.hintbar.hidden = false; },
    hideHint() { els.hintbar.hidden = true; },

    /** A big centred announcement that fades on its own. */
    toast(title, sub = '', ms = 1800) {
      els.toastTitle.textContent = title;
      els.toastSub.textContent = sub;
      els.toastSub.hidden = !sub;
      els.toast.hidden = false;
      els.toast.classList.remove('in');
      void els.toast.offsetWidth;          // restart the animation
      els.toast.classList.add('in');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { els.toast.hidden = true; }, ms);
    },

    /** ×N COMBO pop near the score. */
    showCombo(n) {
      if (n < 2) { els.combo.hidden = true; return; }
      els.combo.textContent = '×' + n + ' COMBO';
      els.combo.hidden = false;
      els.combo.classList.remove('in');
      void els.combo.offsetWidth;
      els.combo.classList.add('in');
      clearTimeout(comboTimer);
      comboTimer = setTimeout(() => { els.combo.hidden = true; }, 1400);
    },

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

    showGameOver({ type, score, best, isNew, ballsRun, daily = false }) {
      els.goTitle.textContent = DEATH_COPY[type] || 'OUCH';
      els.goScore.textContent = String(score);
      els.goBest.textContent = (daily ? 'DAILY BEST ' : 'BEST ') + best;
      els.goNew.hidden = !isNew;
      els.goBalls.hidden = !ballsRun;
      els.goBalls.innerHTML = `<span class="ball-icon small"></span> +${ballsRun} ${ballsRun === 1 ? 'ball' : 'balls'}`;
      els.gameover.hidden = false;
    },
    hideGameOver() { els.gameover.hidden = true; },
  };
  return api;
}
