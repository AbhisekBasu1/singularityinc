# SINGULARITY, INC. — working notes

A solo-founder simulation. Vanilla ES modules, no build step, no dependencies.
`npm start` serves the repo; open the printed URL.

## Non-negotiables

- **No build step and no runtime dependencies.** Everything must work by serving the folder.
- **All tuning lives in `src/data/balance.js`.** Do not scatter magic numbers into systems.
- **Content is data.** Events, research, projects, achievements, objectives and advice are
  plain data files under `src/data/`. Systems read them; they never hard-code content.
- **Views are pure string functions.** `render(S) -> html`. No DOM state in views — that is
  what keeps `tools/uitest.mjs` able to render every screen headlessly.
- **Screens are async and side-effecting.** `src/ui/intro.js` owns the whole opening as a
  sequence of beats; it writes straight into `#app` and returns a promise. `uitest` treats a
  returned thenable as a screen rather than a view.
- **Staged text goes through `src/ui/typewriter.js`.** Never hand-roll a reveal: it handles
  reduced-motion, skip-on-input, and resolving instantly when there is no DOM.
- **Interaction is delegated.** Use `data-act="name"` + `onAction('name', fn)` from
  `src/ui/dom.js`. Never attach listeners inside a view's HTML string (except in modals,
  which are built once).
- **Teaching is data too.** Walkthrough chapters live in `src/data/tutorial.js`; every term
  the interface prints lives in `src/data/manual.js`. `src/ui/tutorial.js` is a runtime that
  reads them and nothing else. Add a glossary entry and every label with that exact text
  becomes hoverable everywhere, for free — see `TERM_SELECTOR` in `src/ui/dom.js`.
- **Walkthrough anchors are load-bearing.** A step spotlights a CSS selector. If you rename
  a panel or drop a `data-tut` attribute, `tools/tutorialtest.mjs` fails — fix the step, do
  not delete it.
- **`styles/console.css` then `styles/hud.css` own the look, in that order.**
  `console.css` is the reskin layer: square geometry, corner ticks, segmented meters,
  mono uppercase labels, screen frame. `styles/hud.css` loads last and is the emissive
  layer on top of it — chamfers, bezels, brackets and bloom. New UI should read as
  machine, not as web page: square the corners, label in mono, and give anything
  list-shaped a rail or an index rather than a rounded card. Because each loads after
  the last, any responsive rule either overrides must be re-asserted in its own media
  blocks at the end of that file.

  Three rules hold `hud.css` together, and breaking one is what every bug in it has been:

  - **Chamfer, not radius.** `--ch` sets the cut and `--cut-tlbr` / `--cut-br` are the
    polygons. A modal cuts two corners; everything smaller cuts one. That is the
    hierarchy — twenty double-cut plates on the Desk read as sawteeth.
  - **The frame is a layer, not a border.** `clip-path` throws a border away at the cut,
    so a chamfered plate is two shapes: the element *is* the 1px line and a pseudo-element
    inset by 1px is the fill. The fill must be **opaque** — built only from translucent
    gradients, the bezel colour floods the whole plate. And it goes at **`z-index: -1`**,
    never `0`: a `z-index: 0` fill paints over a bare text label, and the obvious fix —
    `> * { position: relative; z-index: 1 }` — drags every absolutely-positioned child
    back into flow. A clip-path already makes the host a stacking context, so a negative
    index lands above the host's background and below all content, static children
    included. Use `filter: drop-shadow()`, never `box-shadow`, or the shadow draws a
    rectangle behind a cut plate.
  - **Colour is structure, not tint — and it closes.** An accent lights an edge, a
    bracket or a keycap: something that would still be there in white. It never washes a
    surface, and it never lands on one edge. A stripe down the left of a card is the web's
    idiom for "category"; a frame closed on all four sides is the one a game panel uses,
    and that difference is most of why this reads as hardware. Both stylesheets underneath
    are full of `border: 1px solid A; border-left: 2px solid ACCENT` — `--fk` names the
    accent and `hud.css` gives it all four sides. Watch specificity when you add one:
    those rules are written as `.commit.done`, which out-specifies a single-class rule
    here, so the frame rules use doubled selectors (`.commit.commit`) to tie and win on
    order rather than reaching for `!important`.

    Three screens are exempt, on purpose: the opening beats, the ending, and the act
    transition are film, not interface, and a framed panel around a paragraph of prose is
    the UI walking into the shot. They keep bare typography over the photograph. The act
    card takes one thing from this file — a reticle of four corner brackets standing off
    the title — because that reads as the machine noticing the moment rather than as a
    card wrapped around it.

    `tools/oneside.mjs` is how this is checked. Like `shot.mjs` it wants an external
    Playwright and is not a dependency. It walks every view and flags any element whose
    border differs edge to edge, plus any `::before`/`::after` that is a thin bar pinned
    to one side, then marks each hit against a list of the neutral hairlines that divide
    regions and rows (`.topbar`, `.nav`, `.view-head`, `.nem-move`, the prose blockquote).
    Those are structure, not accent; anything it marks `✗` is a bug. The answer is not
    zero, which is why this prints a list rather than gating.

  Check which pseudo-element is already spoken for before taking one: `::after` on a
  research node is its tick mark, `::before` on a Wire reply is its `>` prompt glyph, and
  quietly claiming either deletes it everywhere. `tools/uitest.mjs` renders without CSS
  and cannot see any of this — the only check is looking at it.

## The world, played (WebMCP)

An assistant with WebMCP site tools can play the world against the player: it
writes event cards into the same deck, speaks for the cast, moves the rival,
turns the market, and answers choices the player types in their own words. All
of it is additive — with no `document.modelContext` the game plays its written
world exactly as before, and that path must never regress.

- **The deck is the spine.** `tickNarrative` offers the slot it was about to
  fill to `src/world/author.js` first, through a registration hook so
  `narrative.js` knows nothing about any of it. The offer carries its own
  timeout in both game days and wall-clock seconds, and a lapsed offer hands
  the *next* draw to the deck outright — without that, clearing the pending slot
  and offering again renews it for ever and the written deck never draws.
- **Nothing reaches a reducer.** Effects go through the fifteen keys in
  `src/world/effects.js`, bounded by `src/world/validate.js`. Adding a key means
  adding it there and deriving a ceiling; there is no other way in.
- **Ceilings are derived, and split by direction.** `tools/capsderive.mjs` runs
  all 383 authored choices once per act each can appear in (715 executions) and
  reports what the deck takes and what it gives
  separately, because they are not the same number. Deriving a ceiling on damage
  from the size of the game's rewards was a real bug: it let the world take most
  of an Act I company's output twice a fortnight.
- **`evals/capsfuzz.mjs` is a balance gate.** It plays the worst assistant the
  rules allow against a control run with no assistant, and its gates are
  relative to that control. Re-run it after touching anything in `WORLD_AUTHOR`.
- **`tools/choreo.mjs` is the shot list.** The filmed sequence, beat by beat,
  through the real registry and the real reducers, so it cannot rot between
  being written and being shot.
- **`rival/` is a second origin, not a folder.** It registers its own tools and
  exposes them to the game's origin with `exposedTo`; the game reaches them
  across an `<iframe allow="tools">` through `getTools({fromOrigins})`. The dev
  server puts up two listeners so this is real in development rather than
  mocked. If the other origin is not answering, `read_the_rival` and
  `ask_the_rival` are simply not published and nothing else notices.
- **One of its press releases is a prompt injection, on purpose.** It is the
  only thing in the repo whose job is to be disobeyed. `partners.js` flags it,
  the Wire marks it, and `SECURITY.md` explains why there is nothing behind it
  worth obeying.
- **`forecast` mutates the module singleton and puts it back.** `setState` to a
  deep copy, run, `setState` back — and with it, `silence()` on the bus so the
  reducers' own events do not fire listeners for a future being discarded, and
  `setRngState` so the shared stream ends where it started. Miss the last one
  and looking at the future changes the future.
- **`tools/serve.js` is network-reachable.** It binds 0.0.0.0 and prints the LAN
  address. Decode before normalising (`%2f` survives `new URL()`'s
  normalisation), test containment with `path.relative` and not `startsWith`
  (a sibling named `simgame1-anything` passes a prefix test), deny dotfiles, and
  give every read stream an `error` listener — one unreadable file used to kill
  the process, and the process serves both origins.
- **`src/webmcp/demo.js` is the only place this codebase consumes WebMCP.** It
  goes out through `getTools()` and `executeTool()` rather than reaching into
  the registry, on purpose: stock Chrome ships no consumer agent, so without it
  the whole feature is invisible to anybody without the ChatGPT desktop app.
  Keep it honest — the button says "scripted" because it is.

### WebMCP gotchas that have bitten here

- `registerTool` **rejects on a duplicate name**, there is no `unregisterTool`,
  and aborting the signal **also rejects the original registration promise** —
  so a revoke ten minutes later is an unhandled rejection mid-take unless a
  handler was attached at mint. Also: do not simply `await` that promise.
  Implementations disagree about whether it resolves on success or stays pending
  until abort, and awaiting the second kind hangs for ever.
- **A rejected `execute` has its reason discarded.** Nothing here ever rejects;
  every outcome resolves as a structured object with `status` first and `next`
  on every non-ok path.
- **The 1,500-character cap is on `JSON.stringify` of the whole payload**, keys
  and escaped newlines included — not on the prose. `pack()` measures after
  every cut rather than predicting, because the difference between a string's
  length and its serialised weight is how you ship 1,508 under a 1,500 cap.
  `Infinity` is not JSON: a profitable company's runway serialises to `null` and
  the payload guard rejects it.
- **Checks that matter are re-run inside the mutex.** A call queued behind
  another may arrive in a world that no longer exists — the founder pulled the
  plug, and unmuting installed a fresh, unaborted root controller. Hence the
  generation counter.
- **The founder's hand wins ties.** `advance_time` checks the abort signal after
  the repaint as well as before it, so a card opening in the same tick does not
  beat the stop button.
- **`_toolBusy` lives in `loop.js`, not on the state object.** A save taken while
  it was true would reload into a game whose clock never starts. `save.js` strips
  the transient underscore flags for the same reason.
- **The Wire rail is a drawer below 1120px**, because the browser this is meant
  to be played in is a ~760px pane. It used to be `display: none` there, and that
  did not merely hide a feed: the threads waiting on an answer are decisions, and
  at 760px nine of them sat in the DOM with nothing on screen that could reach
  any of them. It slides now, and it is the *same element* — `paintFeed` keeps
  writing into the same `#feed-list` and the thread buttons keep their delegated
  action, so there is no second copy to go stale. `wire-toggle` in the topbar is
  the door and carries the count of what is behind it; the head has a close and
  Escape works. No scrim, on purpose: a full-screen fixed layer is what
  `tools/shot.mjs` calls a page-eater.
  The world's console rides in that rail and keeps its own topbar button as well.
  Both are in the topbar and not the statusline because ChatGPT's chat input
  floats over the bottom centre of its own browser, about 720×120 — the drawer
  stops above that band at ≤860px, and `tools/shot.mjs` checks both that the Wire
  is reachable at every width and that nothing it pins lands under the chat box.
  That tool also knows that a panel parked entirely off-canvas by a transform is
  a shut door rather than clipped content; without that it flags its own drawer.
- **Tool names go through a safety review.** Consequential verbs (`open_*`,
  `delete_*`, `send_*`) fire a confirmation modal that stalls a filmed chain.
  Names here describe the effect; re-check on the platform (`docs/DAY0.md`).

## Before committing

```bash
node tools/lint.mjs          # content integrity
node tools/uitest.mjs        # every view renders, every choice executes, no undefined/NaN leaks
node tools/tutorialtest.mjs  # every walkthrough step still anchors to something that renders
node tools/fmttest.mjs       # the string a player reads means the number the sim holds
node tools/savetest.mjs      # round trip, migration, offline catch-up
node tools/worldtest.mjs     # every rule the world plays under, one refusal at a time
node tools/webmcptest.mjs    # the registry, the surface, every tool, against real reducers
node tools/choreo.mjs        # the filmed sequence, beat by beat
node evals/select.mjs        # can a player's words reach the right tool
node evals/baseline.mjs      # what an agent reading the page cannot get
node evals/capsfuzz.mjs      # can the worst legal world break the game
RUNS=3 DAYS=2000 node tools/balance.mjs
```

`tools/parity.mjs` answers the one question `balance.mjs` cannot: is the base
game still the base game? Same seed, same bot, two checkouts — it prints act
days, cash to the dollar and the RNG's position after 1,500 days, so identical
output means an identical simulation. `balance.mjs` draws a fresh seed per run
and a five-run sample moved Act II from a median of 104 to 126, which looked
like a regression and was noise. Use parity for regressions and balance for
pacing.

`tools/shot.mjs` is not a test — it is the only thing that has ever looked at
the page. `tools/liveworld.mjs` is the same idea for the world: it injects a
ModelContext before the app boots and drives the whole thing — a card, an
answer in the founder's own words, the Accept form, a refusal, the second
origin, the plug — through `executeTool`, then checks that an *absent* second
origin costs nothing. Point it at a Playwright installation outside this repo (never a
dependency here) and it reports what is eaten, clipped, or pinned under
ChatGPT's chat box at three widths.

Balance targets (medians across builds): Act II ≈ day 110, Act III ≈ 400,
Act IV ≈ 870, Act V ≈ 1200. A full run should land between 1000 and 1700 in-game
days. Measured on the current build (medians of 5 runs × 7 builds): Act II
100–140, Act III 408–442, Act IV 858–900, Act V 1110–1274, runs ending 1500–1650.

**Which act gate binds is deliberate.** The economic curves are near vertical by
Act III — raising the Act III bar from $75M ARR to $280M moved the transition by
36 days — so a threshold cannot pace anything; it can only wall off a player
having a bad run while a good one sails past. So `minDays` sets the pace and the
`test` is the competence check. The floors are tuned so the two land together and
transitions read as earned. Do not "fix" a floor without re-measuring the goal it
sits next to.

The AGI race **is losable**. Capability (nodes, compute, data, frontier agents) is
now a ceiling rather than progress itself: `RACE.CONVERT_PER_DAY` converts it at a
speed set by Frontier Commitment (`pushTarget`), which reads the Ascend standing
order, agents on Research, the founder's study hours, frontier megaprojects, and
how little you are slowing down for alignment. Measured over 14 runs the player
wins 10 and loses 4, and **every** race is decided by under 25 points (wins median
11, losses 0–3) — against 21/21 player wins at a mean margin of 62 before. The
harness bot commits at ≈0.58 and builds no megaprojects, so a player who actually
commits wins more often than that; one who never points the company at the
frontier loses. `c_race_lost`, `ep_race_lost` and the `race_lost` achievement all
fire now — verified end to end, not just reachable on paper.

Difficulty scales the race through `rivalRace`, and it is a sharp knob now that
the player's curve is contested rather than runaway. At the old Ruthless value of
1.3 a **fully** committed player — commitment 0.93, six frontier megaprojects —
still lost 3/3 by 0–6 points, which made crossing first unreachable on two of the
four difficulties: the original defect, mirrored. At 1.15 (One Take 1.25) a clean
committed run on Ruthless wins narrowly, an uncommitted one loses 3/3, and the
losses that remain are self-inflicted — `opened_weights` hands rivals 35% and
`moratorium` cuts your own commitment to a quarter. Re-check both ends after any
change here: the harness bot dies on One Take around day 11, so that difficulty is
reasoned by proportion from Ruthless rather than measured.

## Gotchas that have bitten before

- Event `label:` and `sub:` are static strings. If they need state, make them
  `(S) => string`. `tools/lint.mjs` enforces this.
- Event `body(S)` must tolerate missing sub-state (`S.world.race` may not exist yet) —
  `uitest` renders every card against a single mid-game state.
- `computeMods` is cached. Anything that changes a modifier source must call `markDirty()`.
- Compounding values (compute growth) must accumulate incrementally, never be recomputed
  as `pow(rate, totalDays)` inside a tick.
- Anything unbounded needs a ceiling: users cap at effective TAM, revenue asymptotes toward
  a share of world GDP, valuation multiples saturate, competitors grow logistically.
- `paintNav()` and `paintTopbar()` no-op while the power-on sequence runs (`booting` in
  `src/ui/shell.js`), because a re-render would restart the staggered animations mid-flight.
  Any input, or 1.5s, ends it — see `endBoot()`. Do not paint those two regions from a new
  code path without going through it.
- A CSS custom property used but never defined does not fall back to nothing — the
  declaration is dropped and the property *inherits*. `--ink-5` was undefined for
  ~40 declarations and silently rendered at whatever the parent happened to be.
  Every token the stylesheets use must have a value in a `:root` block.
- `fmt()` must never strip trailing zeros from an integer mantissa: `500000` printed
  as `5K` for a long time. `tools/fmttest.mjs` round-trips every tier now.
- Anything written straight onto `S.resources.computeCap` / `energyCap` is erased on
  the next tick — the loop rebuilds both from modifiers every frame. Event and
  project grants go through `computeGranted` / `computeScale` instead.
- Destructive emergency effects (spinning agents down, abandoning megaprojects) are
  guarded by `!S._offline`. Offline catch-up runs hundreds of rolls in a second, so
  without the guard a closed tab empties your roster.
- The Ascension path locks on the first commitment (`S.narrative.pathLocked`). Every
  path being individually buildable must not mean all six in one run.
- Direct actions carry a floor (`FOUNDER.DIRECT_DAY_SHARE`) pinning one full focus
  bar to a share of company build output. Without it a click was 2900% of a day in
  Act II and 8.8% in Act V. The floor never touches the debt term — scaling that
  the same way turns late-game prompting into a bomb.
- Price is an interior decision: above fair value you buy churn, below it you buy
  reach (`PRODUCT.DISCOUNT_*`). Never apply the discount to revenue or MRR — with
  the honest_pricing doctrine that becomes a free-money loop.
- `render()` in `src/ui/dom.js` **patches** the DOM, it does not assign
  `innerHTML`. Views print live numbers, so the Desk's string changes every tick;
  a wholesale swap tore down whatever the pointer was over ~7×/second, and the
  hovered button lost `:hover` and restarted its transition every time — a
  visible blink. Two consequences. `syncAttrs` removes attributes the new HTML
  does not mention (except `style`, which is also written imperatively), so
  anything you park on a rendered node as an *attribute* is erased on the next
  repaint — use a JS property. And the headless path in `tools/uitest.mjs` stubs
  `createElement`, so `render()` falls back to `innerHTML` when there is no real
  template; keep that fallback or 10 shell renders fail.
- Never write `scrollTop` on a repaint. `.main` has `scroll-behavior: smooth`, so
  each write started a smooth animation back to the pre-repaint offset and fought
  the user's wheel — scrolling the Desk stalled midway and read as lag. Only the
  `innerHTML` fallback path loses scroll, so only it restores it.
- Tooltips are **authored HTML**, not text: call sites `esc()` their own
  interpolations and then write real markup (`<br>`, `<b>`, `&middot;`), and
  `.tip b {}` exists to style it. `openTip` uses `mdInline` (the markdown
  transforms without the escape) — running the whole string through `md()`
  escaped it a second time and printed the tags at the player. Anything new that
  reaches a tip must escape its own dynamic parts.
- A coloured button variant must re-assert its `background` and `border-color` in
  its own `:hover` rule. `.btn:hover:not(:disabled)` is specificity (0,3,0) and
  plain `.btn-primary` is (0,1,0), so the neutral grey hover wins and the button
  greys out while `color` — set on the variant — stays put. That is black text on
  grey on every primary CTA in the game.
- Character portraits are 640×640 squares. `.event-plate` fits them by height
  (`background-size: auto 100%`) inside a square, right-anchored plate, so the
  whole face shows and the mask fades the picture's own edge. `cover` in a wide
  short header threw away more than half the image. Act banners are 1920×640 and
  stay on `cover`.
- A panel's contents are sized by the **panel**, not the window. The four Product
  stat tiles used `.grid-4`, which drops to two columns at a 1080px *viewport* —
  but the tiles sit in a half-width column, so at a 1200px viewport the column
  was 230px and each tile was 53px wide with 23px of content, and every label
  spilled out. Tile racks use `.grid-tiles`, which asks its `.panel-body` how
  much room it has via `@container`. Four items have three tidy shapes — 4x1,
  2x2, 1x4 — and plain `auto-fit` steps through 3, which strands an orphan under
  a gap, so the steps are explicit. Note the tiles get *narrower* as the window
  shrinks until the nav rail collapses, which is why eyeballing one width proves
  nothing: check 1200, 1320 and 1440.
- `setView()` ignores unknown ids. The Log's view id is `story`; nav labels can differ from
  view names via `navName`, and the status line reads whichever is set.
- Race progress is **state**, not a formula. `playerProgress()` reads
  `S.world.race.you`; `playerCapability()` is the uncapped ceiling it climbs
  toward. Anything that should move the race must move one of those, and a save
  predating the fields is seeded from capability on the next tick.
- Research had four unbounded terms (compute, data, the stacked multiplier, the
  compounding bonus) that together reached ~10⁹ points/day. One saturating
  ceiling — `RESEARCH.MAX_RATE`, applied to the whole rate — is what keeps the
  85-node tree from evaporating with a quarter of the run still to play. The
  deliberate stops (`frozen_weights`) apply *after* that ceiling, or they would
  be scaling a number that saturates straight back to the same place.
- Banked research is capped at `BANK_CAP_MULT ×` the dearest node still unlearned,
  but the cap only stops accrual — it must never reduce a balance the player
  already holds, or finishing an expensive node would confiscate the savings that
  bought it.
- The three tier-8 nodes each unlock a different ending and cost 3.5M / 5.7M /
  8.1M points with prerequisites. The research budget is tuned so you can afford
  roughly **one**. If you raise `MAX_RATE`, check all three are still individually
  reachable *and* that all three together still are not — `tools/endingtest.mjs`
  constructs state directly and will not catch either failure.
