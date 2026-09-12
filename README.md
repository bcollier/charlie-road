# Charlie Road

A *Crossy Road* replica starring **Charlie**, an American cocker spaniel: a fun-loving dog with attitude who lives for chasing tennis balls — wherever that may take him.

Which, here, is straight across eight lanes of traffic. He hops through endless roads, rivers and railways fetching bouncing tennis balls, and does a spin of delight every time he gets one.

Static site. No build step. Hosted on GitHub Pages.

> **Status: specified, not yet built.** This repo currently holds the plan, the spec, and the original 30-minute prototype. The full build follows.

---

## Documents

| File | What it is |
|---|---|
| **[`SPEC.md`](SPEC.md)** | The authoritative build specification — constants, mechanics, models, acceptance criteria, task list |
| **[`PLAN.md`](PLAN.md)** | The research and reasoning behind it: what the original game does, what v1 got wrong, why three.js |
| `index.html` | **v1** — the original 30-minute prototype (canvas 2D). Moves to `v1/` when the rebuild starts |
| `.kiro/specs/` | The v1 spec (requirements / design / tasks) |
| `kiro_prompt_log.md` | Prompt-by-prompt log of the v1 session |

## How it's built

- **three.js r186**, vendored into `vendor/` — no CDN, no npm install, no bundler
- Orthographic camera at **57° pitch / 15° yaw**, derived by measuring lane angles in real gameplay screenshots
- All voxel models merged per-colour into shared geometries, so a screen full of cars is a handful of draw calls
- Game *rules* (world generation, difficulty, collision, the eagle) are pure functions in `src/rules/`, unit-tested under plain `node`

## Hosting

Nothing to set up. GitHub Pages serves these files over HTTPS and that is the entire deployment: no build step, no Actions workflow, no server process, no configuration beyond `.nojekyll`. Push to `main` and it is live.

## Running it locally

Because the game uses ES modules, browsers block it over `file://` — double-clicking `index.html` gives a blank page. Serve it over HTTP instead, with whatever you have:

```bash
python3 -m http.server 8000     # Python ships with macOS
# or: npx serve
# or: VS Code "Live Server"
# then open http://localhost:8000
```

This is only for previewing before you push. It is **not** a requirement for hosting.

Useful URL parameters:

- `?debug=1` — fps, draw calls, row types, hitboxes
- `?seed=123` — reproduce an exact world

## Tests

No dependencies, nothing to install:

```bash
node tests/run.js
```

These check the fairness invariants — that the generator can never produce an uncrossable road, an unreachable river, or a walled-off row.

## Deploying

Already configured for GitHub Pages from `main` at the repo root (`.nojekyll` is present, no build step). Pushing to `main` publishes.

## Controls

| | Desktop | Mobile |
|---|---|---|
| Move | Arrow keys / WASD | Tap forward, swipe to steer |
| Start / restart | Space or Enter | Tap |
| Pause | Esc or P | Pause button |
| Mute | M | Sound button |

## Credits

Built for **codingWithAI 15113**. *Crossy Road* is by Hipster Whale; this is a study replica, not affiliated with them, and the screenshots in `reference/` are theirs, kept only as visual reference for the rebuild.

Charlie is a real dog. He consented to nothing.
