# Kiro Prompt Log - Crossy Road Browser Game

## Session Overview
Built a browser-based Crossy Road clone from scratch in approximately 30 minutes, with an additional 10 minutes for visual enhancements and refinements.

---

## Prompt 1: Initial Request
**User:** "help me write a spec for a game I want to build. I want to build a version of crossy road the game that plays in a web browser and can be hosted on github pages so no building npm just plain web pages. for this first version I want to see how far I can get in 30 minutes as a hard time constraint, so build a spec you think we can do in 30 minutes"

**Kiro Response:**
- Invoked the fast-task-workflow subagent to run the clarify phase
- Gathered clarification on:
  - World scrolling approach (camera follows player)
  - Controls (Arrow keys + WASD)
  - Movement style (grid-based, one tile per keypress)
- Generated complete spec with three documents:
  - **requirements.md**: 10 requirements covering movement, camera, world generation, vehicles, collision, scoring, and game over screen
  - **design.md**: Flat architecture with single HTML file, one state object, ~8 functions, no classes/frameworks. Included 12 correctness properties
  - **tasks.md**: 7 tasks sequenced so the game is playable by task 4, with vehicles and collision added in tasks 5-6

---

## Prompt 2: Execute Implementation
**User:** "Ok this look good, there is 17 minutes left so go ahead and build away on autopilot"

**Kiro Response:**
- Delegated to spec-task-execution subagent
- Executed all required tasks (skipped optional property tests for speed):
  1. Scaffolded HTML file with canvas, constants, and state
  2. Implemented world generation with procedural rows and vehicle placement
  3. Built input handling, player movement, rendering, and game loop
  4. Added vehicle movement with delta-time physics
  5. Implemented collision detection
  6. Created game over overlay with restart functionality
- Delivered a fully playable single-file game (`index.html`)

---

## Prompt 3: Graphics Enhancement Request
**User:** "ok it looks decent, but very low tech compared to the real game. what can you do in 10 minutes to make improvements? the graphics in the real game are shown in the screenshot"

**Kiro Response:**
- Analyzed the screenshot showing isometric 3D voxel style
- Enhanced graphics with:
  - **Isometric/pseudo-3D rendering**: Drew rectangles with vertical offset and side faces for depth
  - **Detailed vehicles**: Added multi-colored cars with windows, wheels, and body segments (6 color variants)
  - **Voxel-style player**: Yellow chicken with separate head/body blocks, eyes, and orange beak
  - **Enhanced environments**: 
    - Grass texture detail spots
    - Road rows with animated dashed center lines
    - Drop shadows under all objects
  - **Better colors**: Sky gradient background, vibrant vehicle colors, lighting/shading
  - **Improved UI**: Larger styled score display with drop shadow

---

## Prompt 4: Isometric Transformation
**User:** "great improvement! we still have 10 minutes left, make the board larger and try to make it 2.5 dimension like the real game"

**Kiro Response:**
- Implemented true isometric 2.5D projection:
  - **Isometric coordinate transformation**: `isoX()` and `isoY()` functions converting grid to diagonal screen coordinates
  - **Larger board**: Increased to 15 columns and 900x700 canvas
  - **3D cube rendering**: All objects drawn as isometric cubes with three visible faces (top, left, right)
  - **Depth sorting system**: All objects sorted back-to-front before drawing for proper overlap
  - **Smooth camera**: Added easing to camera movement in both X and Y
  - **Enhanced visuals**: Grass tiles forming continuous isometric ground plane, diagonal road markings, three-tone shading on each face

---

## Prompt 5: Fix Starting Position
**User:** "the duck is starting in the top right I want him to start in the bottom left like the real game"

**Kiro Response:**
- Fixed isometric projection orientation:
  - **Swapped isometric formulas**: Changed from `(col - row)` to `(col + row)` for X, and `(col + row)` to `(col - row)` for Y
  - **Adjusted camera positioning**: Moved to 75% down screen so player starts at bottom
  - **Fixed depth sorting**: Used negative row values in sort keys so lower rows (closer) are drawn last
- Result: Player now starts bottom-left and moves toward top-right when pressing "up"

---

## Prompt 6: Difficulty and Centering Adjustments
**User:** "it is still off center, also there are too many cars it is impossible make it slower and easier"

**Kiro Response:**
- **Centering improvements**:
  - Added `cameraX` state variable for horizontal centering
  - Camera now tracks player position in both X and Y axes
- **Difficulty reductions**:
  - **Slower vehicles**: Speed reduced from [2-8] to [1-3] tiles/second
  - **Fewer traffic rows**: Reduced from 70% to 50% probability
  - **More spacing**: Increased gap between vehicles from 2.5 to 4 grid units
  - **Smaller vehicles**: Reduced size variation
  - **Forgiving hitbox**: Reduced collision threshold from 0.7 to 0.6

---

## Prompt 7: Final Centering and Rendering Fix
**User:** "it is still off center and the car pixels are covered up weirdly"

**Kiro Response:**
- **Fixed centering completely**:
  - Rewrote camera calculation to use center column as reference point
  - Properly centers player both horizontally and vertically on screen
- **Fixed depth sorting clipping issue**:
  - Changed sort key from `-r * 100` to `c + r` for proper isometric ordering
  - Now draws individual tiles separately instead of whole rows at once
  - Vehicles and player sort by `col + row + 0.5` ensuring correct overlap
  - Objects further back (lower col+row sum) draw first, closer objects draw on top
- Result: Chicken centered on screen, vehicles no longer clipped by grass tiles

---

## Final Deliverable
- Single `index.html` file (no dependencies, no build tools)
- Fully playable Crossy Road clone with:
  - True isometric 2.5D graphics
  - Grid-based movement (Arrow keys + WASD)
  - Procedural infinite world generation
  - Multi-colored 3D vehicles with proper depth sorting
  - Voxel-style player character
  - Collision detection and game over screen
  - Balanced difficulty (slower cars, better spacing)
  - Proper centering and camera follow
- Ready to host on GitHub Pages
- Total development time: ~30 minutes implementation + ~10 minutes polish

---

## Technical Highlights
1. **Isometric projection system** with proper depth sorting
2. **Delta-time physics** for smooth vehicle movement
3. **Procedural generation** with traffic density constraints
4. **3D cube rendering** using canvas 2D context
5. **Smooth camera interpolation** for polish
6. **Single-file architecture** for zero-config deployment

---
---

# ═══════════ END OF THE 30 MINUTES ═══════════

Everything above was the in-class session with Kiro. The development log marks it "V5 and end of 30 Minutes — End of Kiro → Switching to Claude Code." Everything below was done at home with **Claude Code** (Claude Opus 5 for research, plan and spec; Claude Fable 5.1 for the build, run unattended via `/goal`). The prompts are verbatim. A cleaner, complete copy of both sessions is in `prompt_log.md`.

---

# Session 2 — Claude Code (at home)

## Prompt 8: Review v1, research the real game, plan only
**User:** "review the existing code in this directory of my first attempt to build crossy road the game in 30 minutes. take what is helpful, but now I want to spend the next four hours building the best version of this game possible. take a look at the original crossy road game mechanics, reviews, screenshots some available here https://crossyroadgame.io/ and develop a building plan to make a perfect replica of this game that will run on github pages. for now develop the plan, don't build"

## Prompt 9: Charlie, tennis balls, high score, and the goal workflow
**User:** "ok the plan sounds good, a couple changes. I added images in the reference folder to my dog charlie. I would like him to be the main character of the game. I would like to have a bouncing tennis ball be the thing he collects instead of coins, and he should do an animated spin or jump of excitement when he collects a tennis ball. finally, there should be a saved high score in the browser somewhere so that when people come back to play their high score is saved. revise the plan and let me know your thoughts before starting. the way I will develop this is that I want a complete spec and I will use the goal feature of claude code to have you work continuosly until you hit the goal"

## Prompt 10: Repo, accessories, and the goal prompt
**User:** "the chrome extensions is connected. before we run I want you to create a repository for this and commit the plan and everything we have so far to main. I resized the images to be smaller. I loev the idea of accessories for charlie, the bandana, sunglasses. I added pictures of charlie with sunglasses, bandana, a sweater, etc. after you have committed everythign to github give me the "goal" prompt I should use to get a complete build for me to test"

## Prompt 11: Cocker spaniel, attitude, reference folder
**User:** "charlie is an american cocker spaniel, not an english springer. describe him as a fun loving dog with attitude that lives for chasing tennis balls wherever that may take him. then we will start the goal. include the reference folder in the git repository . once you complete that let me know and I'll start the goal"

## Prompt 12: Pages vs. local server, new branch
**User:** "this needs to run on github pages, I'm looking at the spec and it talks about running python server is this a requirement?  before we start the goal create a new branch"

## Prompt 13
**User:** "ok the chrome extension should be connected now, check again"

## Prompt 14
**User:** "give me the full goal prompt with lines added"

## Prompt 15: The goal (`/goal`, model switched to Claude Fable 5.1)
The build ran unattended from this prompt to a finished, verified game.

**User:**
```
— you are done when all of these hold:
  1. Every task checkbox in SPEC.md §11 is ticked (8 blocks, 55 tasks).
  2. Every acceptance criterion in SPEC.md §10 is verified (A1–A24).
  3. `node tests/run.js` exits 0 with zero failures.
  4. A 90-second play session: zero uncaught exceptions, zero console
     errors, >=50 fps on desktop.
  5. Deploy-ready for GitHub Pages: .nojekyll present, every path
     relative, no build step, runs correctly served over plain HTTP.
  6. All work committed and pushed to origin/rebuild.

HOW TO WORK:
- Work on the `rebuild` branch. Do not touch or merge to `main` — that
  holds the plan and the v1 prototype, and merging is my review step.
- Work through the §11 blocks in order. Commit at the end of each block.
  Never leave the tree broken across a block boundary.
- Build the ?debug=1 harness in Block 0 (SPEC §9a). Everything later
  depends on it.
- Verify every time-dependent criterion by stepping the simulation via
  __game.steps() and asserting on __game.state — never from screenshots.
  A backgrounded tab has visibilityState "hidden", Chrome stops firing
  requestAnimationFrame, and screenshots of a frozen world look exactly
  like a running one. Screenshots are for appearance only.
- Block 0 is a hard gate: do not proceed until the camera matches
  reference/cr_s031.png. If lanes tilt the wrong way, flip YAW's sign.
- Block 2 is the safety checkpoint. The game must be playable end to end
  there before you touch rivers.
- Charlie must read as an American cocker spaniel, not a springer —
  domed skull, short muzzle, long low-set ears, big round eyes. C
  against reference/charlie/IMG_0467.jpeg before Block 2. His attitude is
  a design requirement, not flavour text: see SPEC §1.
- Use the Chrome extension to run the game and screenshot each milestone.
  Save them to screenshots/ for the dev log. Serve locally with
  `python3 -m http.server 8000`.
- Keep the README accurate: hosting on Pages requires no server a
  build step. The local static server is for preview only.
- Do not stop to ask me questions. Where the spec is ambiguous, m
  call a careful engineer would make, and record it in DECISIONS.md with
  one line of reasoning.
- If a block overruns badly, apply the scope tiers in PLAN.md §5 rather
  than half-finishing everything. Say clearly what you cut.

DO NOT:
- Merge to main, make the repo public, or enable GitHub Pages. My call.
- Add any dependency, CDN reference, or build step.
- Let src/rules/ import three.js or touch the DOM.
- Make the ball-collection celebration block, delay, or redirect
- Claim a criterion is verified when you only looked at a screenshot.
```

## Prompt 16: Ship it
**User:** "ok merge pr to main on github so I can play"

(To Claude Code's question about publishing, I chose "Yes, go public + Pages (Recommended)".)

## Prompt 17: Round two — bark, visible bandana, unlock animations, controls, ten suggestions
**User:** "this actually looks really good, especially the animation and sound effects I love. some small improvements I want. it is really hard to see his bandana. is there a way to improve the visibility? or at least maybe make the sunglasses the first thing you earn so its clearer? also once you earn the item there should be a celebration animation and have the item fly in and spin and then when you start the next game there should be an animation of charlie putting on the item and being very excited. another feature that would be nice is a bark feature. when the user hits the B button on the keyboard or shakes their phone Charlie can bark and cars either stop if that's easier or explode. have a cool down timer on the bark so you can't bark every time. before building, suggest 10 more features for the game that you think would make it more fun. also one more thing on the phone it's not clear how to control charlie, so give instructions on the phone and the browser that either say swipe to move him or which keys can move him, arrows or ASDW, also give the clue about how to bark. the fps is running 60 just fine"

## Prompt 18: Feature picks and the caterpillar
**User:** "I like 1, 2, 3, 4, and 9 please. one more feature addition, Charlie has a toy caterpillar that he loves. I put an image in IMG_2328.jpeg for reference, it is a very bright color. I would love for the caterpillar to come across the screen sometimes like a snake or something and then get a 5 ball bonus or something for catching the caterpillar. when he catches it charlie should do a cute spin animation and play with it for a moment. it would be great if it make a squeeky sound like the real caterpillar does. This caterpillar should be like over the top happy like a big smile and joyful vibe. do 5 as well as 6 both look fun as well."

## Prompt 19: Replace the eagle (sent mid-build)
**User:** "also change the eagle to be something more fun and cute. i don't love my dog being taken by an eagle. make it something playful that comes to get charlie instead. do something creative with it"

## Prompt 20: All-outfits debug flag (sent mid-build)
**User:** "one more small feature to add, I want to be able to see all of the outfits and things you can win etc. without having to play the game forever, make a feature in debug that says something like ?enable_all_outfits=yes that will turn them all on so I can test it"

## Prompt 21
**User:** "how long did all of this take in terms of build time for both parts"

## Prompt 22: README for the assignment
**User:** "update the readme file with the following

README.md: in this folder (not just at your repo root). Include:
What the game is and how it differs from stock Crossy Road (1–2 sentences).
How to play: the controls, and how scoring/losing works.
Which AI model(s) and tool(s) you used, and a sentence on your overall strategy.
Anything known to be broken or unfinished."

## Prompt 23: This log
**User:** "add all of the prompts I gave you here in this session to the prompts in kiro_promt_log.md and creat the file below

prompt_log.md (or prompt_log.txt), in the same folder as your README, following the same convention as later assignments in this course. It must name the AI model(s)/tool(s) you used and include your important, non-trivial prompts verbatim, not AI-written summaries of them. Include your in-class prompts as well as the ones from finishing at home; it's useful to be able to see the difference.

make it clear where the 30 minutes ended"
