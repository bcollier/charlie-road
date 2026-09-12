# Charlie Road

A *Crossy Road* replica starring **Charlie**, an American cocker spaniel: a fun-loving dog with attitude who lives for chasing tennis balls — wherever that may take him.

Which, here, is straight across eight lanes of traffic. He hops through endless roads, rivers and railways fetching bouncing tennis balls, and does a spin of delight every time he gets one. High score and balls fetched are saved in the browser; balls unlock outfits from his real wardrobe.

Static site. No build step. Hosted on GitHub Pages.

**Play it: [bcollier.github.io/charlie-road](https://bcollier.github.io/charlie-road/)**

---

## Play

| | Desktop | Mobile |
|---|---|---|
| Move | Arrow keys / WASD | Tap = forward, swipe = direction |
| Start / restart | Space or Enter, or any move | Tap |
| Bark | B, or the **🐶** button | **Shake** the phone, or the 🐶 button |
| Pause | P or Esc, or the **II** button | **II** button |
| Mute | M, or the **♪** button | **♪** button |

A bark stops every car in your row and the two ahead for a moment (6 s cooldown). Trains are unimpressed. Don't idle and don't fall behind the camera — the squirrels have a saucer, and they've had enough of being chased.

**Things to fetch:** tennis balls (chain them inside six seconds for a combo up to ×3), rare **golden balls** worth 5, **squirrels** (+3, they panic and bolt), and Charlie's **caterpillar** (+5, he'll play with it). Three hops in a second and he gets the **zoomies**. Balls unlock his outfits — shades, bandana, bow tie, sweater — which he puts on at the start of the next run. The sky turns through dusk and night as your score climbs. **DAILY CHALLENGE** on the title plays the same world for everyone that day; **CARD** on game over makes a shareable trading card of the run.

## Hosting

Nothing to set up. GitHub Pages serves these files over HTTPS from `main` and that is the entire deployment: no build step, no Actions workflow, no server process, no configuration beyond `.nojekyll`. Push to `main` and it is live a minute later.

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

- `?seed=123` — reproduce an exact world
- `?enable_all_outfits=yes` — every outfit available, for looking at the wardrobe without earning it
- `?debug=1` — fps, draw calls, row types, and a control surface on `window.__game` (`step`, `steps`, `input`, `reset`, `stats`, `errors`) that drives the simulation independently of `requestAnimationFrame`. That is how the game was verified: a backgrounded tab freezes rAF, so time-dependent behaviour is stepped and asserted on, never trusted from screenshots.

## Tests

No dependencies, nothing to install:

```bash
node tests/run.js
```

Checks the world generator's fairness invariants over 50 seeds × 2,000 rows — never an uncrossable road, never an unreachable river, never a walled-off row, never overlapping vehicles — plus the difficulty curve, the eagle timer, collision maths and RNG determinism. `package.json` exists only so plain `node` can load ES modules; it declares no dependencies.

## How it's built

- **three.js r186**, vendored into `vendor/` (module + core, both required by that build) — no CDN, no npm install, no bundler
- Orthographic camera at **57° pitch / 15° yaw**, derived by measuring lane angles in real gameplay screenshots; verified by projecting a tile and reading back 12.67° / 0.899, exactly as predicted
- Every voxel model merged per colour into shared geometries; each grass row's slab, trees and rocks are one mesh per colour; particles are one `InstancedMesh`. Typical frame: ~100–150 draw calls
- Vehicle, log and train positions are pure functions of simulated time — no drift, exact replay from a seed
- Game *rules* (world generation, difficulty, collision, the eagle) are pure functions in `src/rules/`, unit-tested under plain `node`
- Charlie is rigged: ears on damped springs that fly on the hop, a tail that never stops, a head-tilt-and-glance when kept waiting. The ball-pickup celebration is a purely visual layer that never blocks input
- All sound is synthesised in WebAudio; there are no asset files of any kind

## Documents

| File | What it is |
|---|---|
| [`SPEC.md`](SPEC.md) | The build specification — constants, mechanics, models, acceptance criteria, task list |
| [`PLAN.md`](PLAN.md) | The research and reasoning behind it |
| [`DECISIONS.md`](DECISIONS.md) | Every call made during the build where the spec was silent, ambiguous or wrong, with one line of reasoning each |
| [`BUILD_LOG.md`](BUILD_LOG.md) | Block-by-block account of the build session, for the dev log |
| [`screenshots/`](screenshots/) | Milestone screenshots from each block |
| `v1/` | The original 30-minute prototype (canvas 2D), preserved |
| `.kiro/specs/`, `kiro_prompt_log.md` | The v1 spec and prompt log |
| `reference/` | Gameplay screenshots of the original and photos of Charlie, with a README on what each was used for |

## Credits

Built for **codingWithAI 15113**. *Crossy Road* is by Hipster Whale; this is a study replica, not affiliated with them, and the screenshots in `reference/` are theirs, kept only as visual reference for the rebuild.

Charlie is a real dog. He consented to nothing.
