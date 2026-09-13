# Charlie Road

**Play it: [bcollier.github.io/charlie-road](https://bcollier.github.io/charlie-road/)**

## What it is

A browser replica of *Crossy Road* starring **Charlie**, a real American cocker spaniel with attitude who lives for chasing tennis balls — wherever that may take him. It keeps the original's bones (voxel look, one hop per input, endless procedurally generated roads, rivers and railways, an auto-scrolling camera that punishes dawdling) and swaps the chicken and its coins for a dog and his tennis balls: a **bark** that stops traffic, a **caterpillar toy** and **squirrels** to chase, outfits from Charlie's real wardrobe as unlocks, a day/night cycle, a daily challenge, and a squirrel-piloted flying saucer where the eagle used to be.

Static site, no build step, hosted on GitHub Pages.

## How to play

| | Desktop | Mobile |
|---|---|---|
| Move one tile | Arrow keys or WASD | Tap = forward, swipe = that direction |
| Start / restart | Space or Enter, or any move | Tap |
| Bark | B, or the **🐶** button | **Shake** the phone, or the 🐶 button |
| Pause | P or Esc, or the **II** button | **II** button |
| Mute | M, or the **♪** button | **♪** button |

**Scoring.** Score is the furthest row you reach — one point per row forward, never lost by stepping back. Your best is saved in the browser and shown under the live score.

**Balls.** Tennis balls bounce on the ground; hop onto one to fetch it. They are the currency for outfits and are saved for life. Chain pickups within six seconds for a **combo** worth up to ×3. Rare **golden balls** are worth 5 and tend to sit just past a hazard. Catch a **squirrel** for +3 (it panics and bolts) or Charlie's **caterpillar** for +5 (he plays with it, then leaves it on the grass). Three hops in a second gives him the **zoomies** — double speed for two seconds.

**Losing.** Get hit by a car, bus, truck or train; land in the river off a log or lily pad; ride a log off the edge of the field; or stand still too long (or fall behind the camera) and the squirrels' saucer beams you up. A **bark** freezes every vehicle in your row and the two ahead for 1.5 s, with a 6 s cooldown — trains ignore it.

**Extras.** Balls unlock shades, a bandana, a bow tie and a sweater; a newly earned outfit drops onto Charlie at the start of your next run. **DAILY CHALLENGE** on the title screen plays the same world for everyone that day with its own best. **CARD** on game over renders a shareable trading card of the run.

## AI models, tools and strategy

- **v1** (the 30-minute prototype in `v1/`): built with **Kiro**, using its spec workflow (requirements → design → tasks); prompt log in `kiro_prompt_log.md`.
- **The rebuild and everything since**: built with **Claude Code** — **Claude Opus 5 (1M context)** for the research, plan and spec, then **Claude Fable 5.1** for the build itself, run unattended with Claude Code's **`/goal`** feature until the spec's definition of done held. Verification used the **Claude in Chrome** extension to drive the live game, a `?debug=1` harness on `window.__game` to step the simulation deterministically, a dependency-free `node` test suite, and the GitHub CLI for the repo and Pages.

**Strategy in a sentence:** measure the real game first (the camera angle was derived from lane tilts in App Store screenshots), write a complete spec with machine-checkable acceptance criteria and fairness invariants, then let an autonomous run build it block by block — verifying each block by stepping the simulation through the harness and asserting on state, never by trusting a screenshot, because a backgrounded tab freezes `requestAnimationFrame` and a frozen world looks identical to a running one. Every judgement call the run made is recorded in `DECISIONS.md`; the block-by-block account is in `BUILD_LOG.md`.

## Known broken or unfinished

- **Shake-to-bark on iPhone** needs the motion permission it asks for on your first tap; it has only been verified with synthetic events, not on a physical device. The 🐶 button always works.
- **Phone layouts** (390×844 portrait, landscape) were verified in a size-constrained container in desktop Chrome, not on real hardware. Touch input was tested with synthetic pointer events.
- **Performance on low-end phones is unmeasured.** Desktop runs at 60 fps; the frame is ~150–250 draw calls since vehicle lights got their own materials for the night glow.
- **Private-browsing storage** that throws on access is guarded with an in-memory fallback, but that path was never reproduced in a real private window.
- **Outfit thresholds changed** after the first release (shades are now first at 10, bandana 25). A save that had the bandana at 10 balls has it unequipped on load until 25.
- **SHARE on the card** appears only where the browser supports the Web Share API with files (phones, mostly); SAVE always works.
- **Not built** from the suggested features: a ghost replay of your best run, a quests board, and same-device two-player.
- The tests cover the *rules* (world generation, difficulty, collision, timers). Rendering, audio and UI are verified by hand through the harness, not by automated tests.

## Running it locally

Because the game uses ES modules, browsers block it over `file://` — double-clicking `index.html` gives a blank page. Serve it over HTTP with whatever you have:

```bash
python3 -m http.server 8000     # Python ships with macOS
# or: npx serve
# or: VS Code "Live Server"
# then open http://localhost:8000
```

This is only for previewing. GitHub Pages serves the files over HTTPS from `main` and that is the entire deployment: no build step, no Actions workflow, no configuration beyond `.nojekyll`.

Useful URL parameters:

- `?seed=123` — reproduce an exact world
- `?enable_all_outfits=yes` — every outfit available, for looking at the wardrobe without earning it
- `?debug=1` — fps, draw calls, row types, and the control surface on `window.__game` (`step`, `steps`, `input`, `reset`, `stats`, `errors`) that drives the simulation independently of `requestAnimationFrame`

## Tests

No dependencies, nothing to install:

```bash
node tests/run.js
```

Checks the world generator's fairness invariants over 50 seeds × 2,000 rows — never an uncrossable road, never an unreachable river, never a walled-off row, never overlapping vehicles — plus the difficulty curve, the idle timer, collision maths and RNG determinism. `package.json` exists only so plain `node` can load ES modules; it declares no dependencies.

## How it's built

- **three.js r186**, vendored into `vendor/` (module + core, both required by that build) — no CDN, no npm install, no bundler
- Orthographic camera at **57° pitch / 15° yaw**, derived by measuring lane angles in real gameplay screenshots; verified by projecting a tile and reading back 12.67° / 0.899, exactly as predicted
- Every voxel model merged per colour into shared geometries; each grass row's slab, trees and rocks are one mesh per colour; particles are one `InstancedMesh`
- Vehicle, log and train positions are pure functions of simulated time — no drift, exact replay from a seed; a bark pauses a lane's own clock
- Game *rules* (world generation, difficulty, collision, timers) are pure functions in `src/rules/`, unit-tested under plain `node`
- Charlie is rigged: ears on damped springs that fly on the hop, a tail that never stops, a head-tilt-and-glance when kept waiting. Celebrations are a purely visual layer that never blocks input
- All sound is synthesised in WebAudio; there are no asset files of any kind

## Documents

| File | What it is |
|---|---|
| [`SPEC.md`](SPEC.md) | The build specification — constants, mechanics, models, acceptance criteria, task list; §12 lists the round-two additions |
| [`PLAN.md`](PLAN.md) | The research and reasoning behind it |
| [`DECISIONS.md`](DECISIONS.md) | Every call made during the build where the spec was silent, ambiguous or wrong, with one line of reasoning each |
| [`BUILD_LOG.md`](BUILD_LOG.md) | Block-by-block account of the build sessions, for the dev log |
| [`screenshots/`](screenshots/) | Milestone screenshots from each block and from round two |
| `v1/` | The original 30-minute prototype (canvas 2D), preserved |
| `.kiro/specs/`, `kiro_prompt_log.md` | The v1 spec and prompt log |
| `reference/` | Gameplay screenshots of the original and photos of Charlie, with a README on what each was used for |

## Credits

Built for **codingWithAI 15113**. *Crossy Road* is by Hipster Whale; this is a study replica, not affiliated with them, and the screenshots in `reference/` are theirs, kept only as visual reference for the rebuild.

Charlie is a real dog. He consented to nothing.
