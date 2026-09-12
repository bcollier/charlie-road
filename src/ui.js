// HUD and overlays, as DOM over the WebGL canvas. Chunky outlined numerals
// in the Crossy Road idiom. The full title / pause / game-over cards land in
// Block 6; this is the score HUD and a minimal game-over prompt.

export function createUI(root) {
  root.innerHTML = `
    <div class="hud">
      <div class="score" id="hud-score">0</div>
      <div class="best" id="hud-best">BEST 0</div>
    </div>
    <div class="hud-right">
      <div class="balls" id="hud-balls"><span class="ball-icon"></span><span id="hud-balls-n">0</span></div>
    </div>
    <div class="overlay" id="gameover" hidden>
      <div class="card">
        <div class="card-title">OUCH</div>
        <div class="card-score" id="go-score">0</div>
        <div class="card-best" id="go-best">BEST 0</div>
        <div class="card-new" id="go-new" hidden>NEW BEST!</div>
        <div class="card-hint">tap or press space to go again</div>
      </div>
    </div>
  `;
  const $ = (id) => root.querySelector('#' + id);
  const els = {
    score: $('hud-score'), best: $('hud-best'), balls: $('hud-balls-n'),
    gameover: $('gameover'), goScore: $('go-score'), goBest: $('go-best'), goNew: $('go-new'),
  };
  let lastScore = -1, lastBest = -1, lastBalls = -1;

  return {
    setScore(n) { if (n !== lastScore) { lastScore = n; els.score.textContent = String(n); } },
    setBest(n) { if (n !== lastBest) { lastBest = n; els.best.textContent = 'BEST ' + n; } },
    setBalls(n) { if (n !== lastBalls) { lastBalls = n; els.balls.textContent = String(n); } },
    showGameOver(score, best, isNew) {
      els.goScore.textContent = String(score);
      els.goBest.textContent = 'BEST ' + best;
      els.goNew.hidden = !isNew;
      els.gameover.hidden = false;
    },
    hideGameOver() { els.gameover.hidden = true; },
  };
}
