# Prompt log — Charlie Road (hw2, Crossy Road)

Every prompt I gave, verbatim, in order. Typos and all. Short context notes in *italics* are mine and are not prompts.

## Models and tools

| Phase | Tool | Model |
|---|---|---|
| In class — the 30 minutes | **Kiro** (spec workflow: requirements → design → tasks, then autopilot execution) | Kiro's default model |
| At home — the rebuild | **Claude Code** (CLI) | **Claude Opus 5 (1M context)** for research, plan and spec; **Claude Fable 5.1** for the build, run unattended with Claude Code's `/goal` feature |
| At home — verification and publishing | **Claude in Chrome** extension (driving the live game, screenshots, JS harness), `node` for the test suite, **GitHub CLI** (`gh`) for the repo, PRs and Pages | — |

The `/goal` prompt (prompt 8 below) is the one that produced the whole first release without further input; prompts 11–14 produced the second release the same way.

---

## In class — the 30 minutes (Kiro)

*Kiro's own log of these, with its responses, is in `kiro_prompt_log.md`.*

**1.**
> help me write a spec for a game I want to build. I want to build a version of crossy road the game that plays in a web browser and can be hosted on github pages so no building npm just plain web pages. for this first version I want to see how far I can get in 30 minutes as a hard time constraint, so build a spec you think we can do in 30 minutes

**2.**
> Ok this look good, there is 17 minutes left so go ahead and build away on autopilot

**3.** *(with a screenshot of the real game attached)*
> ok it looks decent, but very low tech compared to the real game. what can you do in 10 minutes to make improvements? the graphics in the real game are shown in the screenshot

**4.**
> great improvement! we still have 10 minutes left, make the board larger and try to make it 2.5 dimension like the real game

**5.**
> the duck is starting in the top right I want him to start in the bottom left like the real game

**6.**
> it is still off center, also there are too many cars it is impossible make it slower and easier

**7.**
> it is still off center and the car pixels are covered up weirdly

---

### ═══════════ END OF THE 30 MINUTES ═══════════

*The in-class clock ran out here, at v1 (`v1/index.html`, "V5 and end of 30 Minutes" in the development log). Everything below was done at home, with Claude Code instead of Kiro.*

---

## At home — the rebuild (Claude Code)

**8.** *(Opus 5 — research and planning; no building)*
> review the existing code in this directory of my first attempt to build crossy road the game in 30 minutes. take what is helpful, but now I want to spend the next four hours building the best version of this game possible. take a look at the original crossy road game mechanics, reviews, screenshots some available here https://crossyroadgame.io/ and develop a building plan to make a perfect replica of this game that will run on github pages. for now develop the plan, don't build

**9.** *(after reading the plan; photos of Charlie added to `reference/`)*
> ok the plan sounds good, a couple changes. I added images in the reference folder to my dog charlie. I would like him to be the main character of the game. I would like to have a bouncing tennis ball be the thing he collects instead of coins, and he should do an animated spin or jump of excitement when he collects a tennis ball. finally, there should be a saved high score in the browser somewhere so that when people come back to play their high score is saved. revise the plan and let me know your thoughts before starting. the way I will develop this is that I want a complete spec and I will use the goal feature of claude code to have you work continuosly until you hit the goal

**10.**
> the chrome extensions is connected. before we run I want you to create a repository for this and commit the plan and everything we have so far to main. I resized the images to be smaller. I loev the idea of accessories for charlie, the bandana, sunglasses. I added pictures of charlie with sunglasses, bandana, a sweater, etc. after you have committed everythign to github give me the "goal" prompt I should use to get a complete build for me to test

**11.**
> charlie is an american cocker spaniel, not an english springer. describe him as a fun loving dog with attitude that lives for chasing tennis balls wherever that may take him. then we will start the goal. include the reference folder in the git repository . once you complete that let me know and I'll start the goal

**12.**
> this needs to run on github pages, I'm looking at the spec and it talks about running python server is this a requirement?  before we start the goal create a new branch

**13.**
> ok the chrome extension should be connected now, check again

**14.**
> give me the full goal prompt with lines added

**15. The goal.** *(Switched the model to Fable 5.1, then ran `/goal` with this. The build ran unattended from here to a finished, verified game — no further prompts until it reported done.)*
> — you are done when all of these hold:
>   1. Every task checkbox in SPEC.md §11 is ticked (8 blocks, 55 tasks).
>   2. Every acceptance criterion in SPEC.md §10 is verified (A1–A24).
>   3. `node tests/run.js` exits 0 with zero failures.
>   4. A 90-second play session: zero uncaught exceptions, zero console
>      errors, >=50 fps on desktop.
>   5. Deploy-ready for GitHub Pages: .nojekyll present, every path
>      relative, no build step, runs correctly served over plain HTTP.
>   6. All work committed and pushed to origin/rebuild.
>
> HOW TO WORK:
> - Work on the `rebuild` branch. Do not touch or merge to `main` — that
>   holds the plan and the v1 prototype, and merging is my review step.
> - Work through the §11 blocks in order. Commit at the end of each block.
>   Never leave the tree broken across a block boundary.
> - Build the ?debug=1 harness in Block 0 (SPEC §9a). Everything later
>   depends on it.
> - Verify every time-dependent criterion by stepping the simulation via
>   __game.steps() and asserting on __game.state — never from screenshots.
>   A backgrounded tab has visibilityState "hidden", Chrome stops firing
>   requestAnimationFrame, and screenshots of a frozen world look exactly
>   like a running one. Screenshots are for appearance only.
> - Block 0 is a hard gate: do not proceed until the camera matches
>   reference/cr_s031.png. If lanes tilt the wrong way, flip YAW's sign.
> - Block 2 is the safety checkpoint. The game must be playable end to end
>   there before you touch rivers.
> - Charlie must read as an American cocker spaniel, not a springer —
>   domed skull, short muzzle, long low-set ears, big round eyes. C
>   against reference/charlie/IMG_0467.jpeg before Block 2. His attitude is
>   a design requirement, not flavour text: see SPEC §1.
> - Use the Chrome extension to run the game and screenshot each milestone.
>   Save them to screenshots/ for the dev log. Serve locally with
>   `python3 -m http.server 8000`.
> - Keep the README accurate: hosting on Pages requires no server a
>   build step. The local static server is for preview only.
> - Do not stop to ask me questions. Where the spec is ambiguous, m
>   call a careful engineer would make, and record it in DECISIONS.md with
>   one line of reasoning.
> - If a block overruns badly, apply the scope tiers in PLAN.md §5 rather
>   than half-finishing everything. Say clearly what you cut.
>
> DO NOT:
> - Merge to main, make the repo public, or enable GitHub Pages. My call.
> - Add any dependency, CDN reference, or build step.
> - Let src/rules/ import three.js or touch the DOM.
> - Make the ball-collection celebration block, delay, or redirect
> - Claim a criterion is verified when you only looked at a screenshot.

*(A few lines lost characters when pasted — "C against", "no server a build step", "m call", "redirect" — and the run understood them anyway.)*

**16.** *(after the build reported done)*
> ok merge pr to main on github so I can play

*Then, to Claude Code's question about publishing, I chose: "Yes, go public + Pages (Recommended)".*

## At home — round two, after playing the live game

**17.**
> this actually looks really good, especially the animation and sound effects I love. some small improvements I want. it is really hard to see his bandana. is there a way to improve the visibility? or at least maybe make the sunglasses the first thing you earn so its clearer? also once you earn the item there should be a celebration animation and have the item fly in and spin and then when you start the next game there should be an animation of charlie putting on the item and being very excited. another feature that would be nice is a bark feature. when the user hits the B button on the keyboard or shakes their phone Charlie can bark and cars either stop if that's easier or explode. have a cool down timer on the bark so you can't bark every time. before building, suggest 10 more features for the game that you think would make it more fun. also one more thing on the phone it's not clear how to control charlie, so give instructions on the phone and the browser that either say swipe to move him or which keys can move him, arrows or ASDW, also give the clue about how to bark. the fps is running 60 just fine

**18.** *(choosing from the ten suggestions; caterpillar photo added to `reference/charlie/`)*
> I like 1, 2, 3, 4, and 9 please. one more feature addition, Charlie has a toy caterpillar that he loves. I put an image in IMG_2328.jpeg for reference, it is a very bright color. I would love for the caterpillar to come across the screen sometimes like a snake or something and then get a 5 ball bonus or something for catching the caterpillar. when he catches it charlie should do a cute spin animation and play with it for a moment. it would be great if it make a squeeky sound like the real caterpillar does. This caterpillar should be like over the top happy like a big smile and joyful vibe. do 5 as well as 6 both look fun as well.

**19.** *(sent while the build was running)*
> also change the eagle to be something more fun and cute. i don't love my dog being taken by an eagle. make it something playful that comes to get charlie instead. do something creative with it

**20.** *(sent while the build was running)*
> one more small feature to add, I want to be able to see all of the outfits and things you can win etc. without having to play the game forever, make a feature in debug that says something like ?enable_all_outfits=yes that will turn them all on so I can test it

## At home — wrap-up

**21.**
> how long did all of this take in terms of build time for both parts

**22.**
> update the readme file with the following
>
> README.md: in this folder (not just at your repo root). Include:
> What the game is and how it differs from stock Crossy Road (1–2 sentences).
> How to play: the controls, and how scoring/losing works.
> Which AI model(s) and tool(s) you used, and a sentence on your overall strategy.
> Anything known to be broken or unfinished.

**23.**
> add all of the prompts I gave you here in this session to the prompts in kiro_promt_log.md and creat the file below
>
> prompt_log.md (or prompt_log.txt), in the same folder as your README, following the same convention as later assignments in this course. It must name the AI model(s)/tool(s) you used and include your important, non-trivial prompts verbatim, not AI-written summaries of them. Include your in-class prompts as well as the ones from finishing at home; it's useful to be able to see the difference.
>
> make it clear where the 30 minutes ended
