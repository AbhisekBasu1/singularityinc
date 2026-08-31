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
    The four `--cut-*` polygons are declared on `*`, and that is the only
    universal selector in these stylesheets. A custom property whose value
    contains `var()` is substituted where it is *declared*: written on `:root`
    they computed once against `:root`'s own `--ch`, every element inherited
    that one resolved string, and every plate in the game was cut at 12px no
    matter what it asked for — which is why an 11px control came out a triangle
    and why this hierarchy had never actually shipped. So set `--ch` on the same
    rule as the `clip-path`, never on an ancestor, and put a new cut shape in
    that block rather than inlining a polygon.
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
- **Nothing reaches a reducer.** Effects go through the seventeen keys in
  `src/world/effects.js`, bounded by `src/world/validate.js`. Adding a key means
  adding it there and deriving a ceiling; there is no other way in.
- **Two keys break the rolling-budget pattern, on purpose.** `race` moves the
  leading rival lab and sits on `WORLD_AUTHOR.RUN_BUDGET` — a budget for the
  whole run, charged in both directions, that `tickAuthor` must never trim out
  of `recent.taken`; a monthly allowance on it would be the world deciding the
  race. `compute` is give-only: the deck never takes it, so its TAKE ceiling is
  zero and a negative value is refused by name rather than as "not in play".
  Both are diffed around each choice in `capsderive`, not read from the fx log,
  because the deck writes them straight onto state.
- **Effects are bounded twice.** Once when written (`validateCard`,
  `validateProposal`, `validatePost`) and again at the moment they land
  (`boundEffects`, through `commit()` in `author.js`), because between the two
  the founder may earn an immunity, another card may spend the same budget, or
  the money may be gone. Every path that applies a world effect — a card's
  choice, an accepted proposal, a Wire reply — goes through `commit`; a new
  one must too, or the first thing Codex finds is a reply adding tech debt
  after Zero Entropy.
- **A post may `ask`.** Two or three one-click replies make it a Wire thread;
  the options ride on the feed item as `runtime`, the way a written card rides
  on the active event, and `feed.js` spends them through a registered resolver
  rather than importing the world. Judged by the same `effectProblems` a card's
  choice gets, at `THREAD_CAP_MULT` of the ceilings, with the same door rule.
- **Ceilings are derived, and split by direction.** `tools/capsderive.mjs` runs
  all 383 authored choices once per act each can appear in, five times each from
  a seeded stream (3,575 executions, `REPS` to change it) and
  reports what the deck takes and what it gives
  separately, because they are not the same number. Deriving a ceiling on damage
  from the size of the game's rewards was a real bug: it let the world take most
  of an Act I company's output twice a fortnight.
- **`evals/capsfuzz.mjs` is a balance gate.** It plays the worst assistant the
  rules allow against a control run with no assistant, and its gates are
  relative to that control. Re-run it after touching anything in `WORLD_AUTHOR`
  — **and after adding cards**, which is the non-obvious one. The ceilings are
  derived from the written deck's own p80, so growing the deck moves them:
  thirty-eight mostly-late character cards took the deck's authored choices from
  383 to 497 and pulled the p80 of what it *takes* in cash and focus down
  sharply, while the hand-pasted caps stayed where they were. The world was
  then allowed to be harsher than anything the game does to itself, and
  `capsfuzz` failed on "Act IV still arrives".

  The invariant to restore is one line: **the world may never take more than the
  written deck takes.** Run `node tools/capsderive.mjs`, and wherever a cap sits
  above the derived p80, bring it down to it. Where a cap sits *below* — align,
  heat and affinity in act 1 are deliberately tighter than the deck — leave it.
  Do not raise a cap to match a derivation; the derivation is a ceiling, not a
  target.

  Note also that `RUNS=3` is a nine-run sample on deterministic seeds, and a
  deck change makes every one of those runs a different run. A failure at 3 that
  passes at 7 is a sample-size artifact; a failure at both is real. Check before
  you tune.
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

## The workstation (`/computer/`)

The same game in a second housing: a desktop with a menu bar, a dock and
windows. `npm start` serves it at `/computer/`; `?shell=os` on `/` selects it
without the route, which is what the harnesses use. The classic console at `/`
is untouched and stays — the two share one save, in both directions.

- **`src/ui/shell.js` is a facade, not a shell.** The console moved to
  `shell-console.js` and the workstation is `src/ui/os/shell.js`; both implement
  the same interface and `shell.js` is a list of one-line delegates. That list
  *is* the contract — a housing that grows a method without adding it there is a
  housing the game cannot reach. `VIEWS` stays in the facade because
  `tools/tutorialtest.mjs` reads the view ids out of that file with a regex, so
  keep the `{ id: 'x', name:` shape. The import of the console is circular and
  safe: nothing touches the other module's bindings at evaluation time.
- **The views did not change.** `render(S) -> html` still, and the string lands
  in a window body instead of `#main`. Nothing in `src/systems/` or
  `src/data/balance.js` moved. Outside `src/ui/os/` and `styles/os.css` the
  whole thing is the facade, four facade methods, `Modal.setPlacement`,
  `toast.onToast`, `Save.peek`, `Intro.setTitleDecor`, the tutorial's `alias`
  and `showing` injections, and six lines in `main.js`.
- **`<base href="/">` in `computer/index.html` is load-bearing.** Asset paths are
  written in JavaScript and are document-relative — `assets/img/act3.jpg` in a
  modal, a portrait, an ending plate — and from `/computer/` every one of them
  would resolve a directory too deep and quietly 404. Module imports resolve
  against the module's own URL and are unaffected. It only works because the
  site deploys at an origin root. `_headers` needs its own `/computer/` rows:
  a trial token is per origin, but a header rule for `/` does not cover a path
  under it.
- **The Wire is furniture, not a window.** At desktop width it is a rail down
  the right edge — the shape it has always had in the console — because it is
  not a view you go and look at, it is the thing that tells you a decision is
  waiting. As a window it was behind four other windows within a minute of play,
  and the menu-bar chip *closed* it on the first press. The rail is taken out of
  the desktop rather than laid over it: `deskSize()` subtracts `OS.WIRE_W` and
  every other piece of geometry in the machine asks `deskSize()` — drag clamps,
  the snap boxes, the zoom box, the first layout, the saved fractions — so one
  subtraction is the whole mechanism and nothing needs a z-index fight. It is
  still `.win-wire` and still `#feed-rail`; `wm.js` skips its inline geometry
  (as it already did for the drawer) and `styles/os.css` pins it. `wireDock` in
  `S.ui.os` remembers whether the founder put it away, and `WIRE_MIN_FIELD`
  refuses to dock it when what is left would be too narrow to work in.
  Anything else that hangs off the right edge has to know: the toast lane and
  the banners read `--os-rail-taken`, set by `syncWireClass`, or they print
  across the threads waiting on an answer.

  **Every control that can reach it agrees it is furniture.** The menu bar's
  chip, its dock tile, its own close key and `Settings → The Wire` all do the
  one thing a rail can do — show or hide it. The chip used to *close* the Wire
  on its first press, which is the opposite of what a founder who has lost it is
  asking for; the dock tile used to *focus* a panel that is permanently in
  front, so pressing it twice left you where you started. `minimize` and
  `toggleZoom` refuse the docked rail by name, because its own min and zoom keys
  are `display: none` and a hidden button still answers a programmatic click —
  and the `zoomed` flag that left behind is saved, so it would come back on
  somebody who later undocks it.
- **A module fills the field; the machine's own apps float.** `placeFresh` only
  decides where a window goes the *first* time it is ever opened, so this is the
  shape of a machine nobody has arranged yet — and that is most of the first
  impression. Eight views whose defaults were all 62%-wide rectangles offset
  fifteen pixels from each other made a pile of paper, not a desktop. A module
  takes the field edge to edge with the Wire beside it; ARIA, the Manual,
  Settings and the Uplink float smaller over whatever you were doing and cascade
  among themselves. Two side by side is one snap away and the arrangement is
  kept.
- **One Wire, one id.** The Wire window *is* `#feed-rail`, with `#world-console`
  and `#feed-list` inside it, so `paintFeed`, `paintAuthor`, the walkthrough and
  `tools/shot.mjs` all keep working without knowing there is a desktop. It does
  not carry the `feed-rail` *class*: `console.css` and `hud.css` both style that
  class, and hud's `position: fixed` drawer rule below 1120px would fight the
  window manager and make the Wire a *pinned* element under ChatGPT's chat box.
  `#app.wire-open` remains the single flag for "the Wire is on screen" in both
  housings and at every width. The drawer is laid out against the *viewport*,
  not the desktop, so below ~490px its `92vw` reached back under the left rail —
  which sits at z-index 44 to the drawer's 38 and painted over the first 24px of
  every line in the feed. It starts at `--os-dock-w` and takes that out of its
  own width; `oslive` checks the clearance at all three widths.
- **Chrome is in normal flow.** The menu bar and the dock are flex rows in the
  column, not `position: fixed`, because `tools/shot.mjs` calls anything with a
  fixed or sticky ancestor *pinned* and flags it under the floating chat input.
  Windows are absolute inside a flowing desktop, which is also flowing by that
  test. Never add a full-screen fixed click-catcher to close a menu — that is a
  page-eater; a document `pointerdown` that checks `closest('.menus')` is the
  way.
- **Window geometry is fractions of the desktop, not pixels**, so a layout saved
  at 1440 opens sensibly at 1280 and stacked mode at 760 needs no arithmetic.
  It lives in `S.ui.os`, which is saved on purpose: reopening the machine finds
  the windows where you left them.
- **`getView()` answers `null` when no module is on screen.** `triggerAction` in
  `main.js` reads it to decide whether to switch to the Desk before pressing Q,
  and a `getView()` that named a closed window made the key shake at nothing.
  The walkthrough asks `showing(id)` instead — "is what this step teaches on the
  glass" — because the console answers by comparing the current view and the
  workstation by whether that window is open and in front.
- **A step may carry an `os` override** in `src/data/tutorial.js`: a title, a
  body, a `place`, a `view`. Six steps have one — the two that describe the nav
  and the status line, and the four that anchor inside the Wire. Everything else
  anchors inside a view and is identical in both. `Shell.anchorAlias` maps the
  authored chrome selectors (`#nav`, `.statusline`, `.time-block`) to whatever
  this housing calls them, at lookup time, so `spotlight_panel`'s enum and every
  test keep naming the console's selectors.
- **The transport lives in the bar.** Time is the most-pressed control in the
  game — the console gives it four buttons and a pause in the topbar, and a
  founder uses them constantly. On the workstation it was behind the clock's
  popover: three actions instead of one, many times a session, with no keyboard
  fallback beyond Space, because the digits are the eight modules. `mb-speed`
  is those five keys, and the clock keeps its popover for the rows the bar has
  no room for.

  Two things fell out of putting it there. A transport key clicked with the
  mouse keeps focus, and **a focused `<button>` answers Space itself** — so the
  next Space toggled pause in the key handler *and* re-activated the button, a
  pause and an unpause in one keystroke. `onAction('speed')` blurs on
  `e.detail > 0`, which is a real pointer; a click synthesised from the keyboard
  has `detail: 0` and keeps focus, which is what a keyboard user wants. The bug
  was in the console too. And the keys cost width, so the bar sheds a rung
  earlier — which pushed the **deck chip** off at a width where it is the world
  console's only door. `tools/shot.mjs` is what noticed. The speed keys shed
  *before* the chip now: they have two fallbacks and the chip has none.
- **The menu bar sheds, it does not shrink.** A squeezed flex item overflows its
  own box without changing `scrollWidth`, so a measurement never sees it and the
  alerts print straight over the numbers. Everything on the right is
  `flex: 0 0 auto` and `measure()` drops things in a fixed order until the two
  groups fit — ARIA, the company name, the numbers one at a time, the date, the
  alerts collapsing to the worst plus a count, the last number, the day. It runs
  on resize and when the set of visible stats changes (Act III brings compute,
  Act IV world GDP), never on a paint loop.

### The Record, Find and the right-click

Three surfaces that make this a desktop rather than a window manager. All three
are workstation-only; the console at `/` is untouched.

- **The Record is generated, never stored.** `src/systems/record.js` is pure
  functions from `S` to a filesystem — `folders`, `list`, `read`, `search`,
  `summary` — so the company's history costs nothing in the save and cannot go
  stale. `src/ui/os/record.js` is the app and `render(S)` is a pure string
  function; selection lives at `S.ui.os.record = { path, id }`, which is saved,
  so the machine reopens on the file you were reading. Every folder name, blurb
  and empty line is in `src/data/machine.js`, which is under `copylint`.

  **Every path needs a reader and every reader needs a path.** They are declared
  in two places — `FOLDERS` in `machine.js` and the readers in `record.js` — and
  a mismatch is silent in both directions: a folder with no reader is dead, and
  a reader with no folder is *unsearchable*, because `search()` only visits
  `folders(S)`. The whole cast was invisible that way for an afternoon.

  `summary()` feeds the window's title-bar readout, which runs seven times a
  second. It counts from lengths and map sizes and nothing else.

- **A blocked verb says what it needs.** Every disabled row in a context menu, a
  Find result or an app menu carries a `note` in mono uppercase — `ROSTER FULL`,
  `41K PTS SHORT`, `FOCUS 12 OF 30`, `ACT III`. The reason is computed where the
  row is built. This game had never once told a player why something was
  unavailable, and the three surfaces would have disagreed about it if each
  wrote its own: `apps.js` holds the notes the menu bar and the dock's
  right-click both show.

- **`data-ctx` is the right-click's whole protocol.** An element declares what
  it is (`data-ctx="agent"`), `src/ui/os/ctxmenu.js` finds the nearest one, and
  `src/data/context.js` turns it into items — the same item shape the menu bar
  uses, rendered by the same exported `itemHtml`. There is no second menu
  implementation and there must not be. Three things it has to keep doing:
  a right-click over nothing lets the browser's own menu through, a right-click
  inside a window with nothing more specific gets the window's menu (an app
  window handing you Chrome's menu reads as unfinished), and a press in a field
  keeps the browser's, because copy has to work in Find.

  **A disabled `<button>` fires no `contextmenu` at all.** The Desk's actions
  are wrapped in a `.action-slot` for exactly this: the menu that says what a
  verb needs was missing from precisely the verbs that needed it.

- **`onAction` overwrites; `onKey` accumulates.** `onAction` is a Map, so
  registering again replaces. `onKey` keeps a Set per key, and `buildShell()`
  runs again on a prestige — so a key registered above `wiredOnce` gains a
  handler every run, and by the third timeline `f` opened Find, closed it and
  opened it again in one press. Keys go below the guard.

- **The tombstone.** `fireAgent` writes to `S.agentsLeft` (capped at
  `AGENTS.ARCHIVE_KEEP`) and that is what `agents/archive` reads. It is the only
  funeral this company holds, and two of the four ways to lose an agent used to
  bypass it entirely — a bare `S.agents.pop()` in the emergency spin-down and a
  splice in an event choice — so the folder counted zero for a whole run and
  every line of `DEPARTURES` was unreachable. Anything that removes an agent
  goes through `fireAgent`, and a card does it with `fx.fire(id, reason)`.

### What bit, and will again

- **A predicate that can never be true, polled every frame, is a lock-up.**
  `tick()` in `src/ui/tutorial.js` calls `ensureStepView` on every animation
  frame — a safety net for a repaint that restored the previous module. First
  Light's step 14 teaches the Wire, and at desktop width the Wire is a *docked
  rail*: furniture, permanently in front, and deliberately never focusable
  (`minimize` and `toggleZoom` refuse it by name). `showing()` answered it with
  `isVisible && focused === id`, which is false by construction and always would
  be — so the step re-ran `setView('wire')`, a whole `WM.applyAll()` plus three
  repaints, sixty times a second. Chrome absorbed it. Firefox locked up, which
  is how it was found. Measured: 8 `setView` calls in 7 rendered frames before,
  0 after. Two fixes, and the second matters more than the first: `showing()`
  asks the right question per mode (docked → is it open; drawer → `#app.wire-open`,
  because `isVisible` is true while the plate is parked off-canvas; undocked →
  the ordinary focus test), and `ensureStepView` is throttled and gives up, so
  the next unsatisfiable view is a slow step rather than a dead browser.
  `oslive` walks First Light at **1440 as well as 760 and 1000** now — it never
  had, which is the whole reason a desktop-only bug survived — and counts
  `setView` calls per step. Every assertion in that file passed throughout: a
  ring that lands on a thrashing page still lands.
- **A render path must never draw from the shared RNG stream.** `askAria` picked
  its opener and closer with `pick()`, and the workstation repaints her window
  about seven times a second. Two costs: the sentence at the top of the window
  changed on every frame — visible, and what got it reported — and *reading*
  ARIA silently advanced the seeded stream fourteen times a second, which is
  not visible at all and desynchronises every event draw and market roll after
  it. That is what `parity.mjs` compares. They are indexed by the day now:
  stable while you read them, different tomorrow, and free. Anything called from
  `render(S)` or a repaint has to be pure in this exact sense.
- **A dock is a toggle, not a shortcut.** The tiles fired the generic
  `data-act="view"`, which only focuses — so pressing the tile of the app you
  were already looking at did nothing, and the dock's most obvious gesture was a
  dead key. It goes through `WM.toggle` now, which is the primitive that already
  had the semantics (focused → minimise, minimised → restore, closed → open).
  The docked Wire keeps its exemption for the same reason it has all the others:
  `WM.toggle` would reach `minimize`, which refuses the rail by name and would
  leave the tile dead again — the very bug being fixed — so it goes through
  `setView`, which is the one gesture a rail has. And because the game reaches
  the housing only through `src/ui/shell.js`, the facade grew `toggleFromDock`
  too; a housing method missing from that list is a method the game cannot call.

- **`clip-path: none` is not "square corners"; it deletes the stacking
  context.** Every plate in this codebase is the bezel with a `z-index: -1`
  pseudo-element for the opaque fill, and the clip-path is what keeps that fill
  above the element's own background. Take `--ch` to `0.01px` instead. Setting
  `clip-path: none` on the Wire in stacked mode dropped the fill behind the
  bezel and flooded the entire window with the accent colour.
- **A clip-path clips its own children, absolutely-positioned ones included.**
  The dock tile carried the chamfer, and the three things that live *outside* it
  — the running tick 7px below, the badge 5px over its corner, the focus ring
  around it — were cut away entirely. The attention flash went with them: it was
  a `box-shadow`, which paints outside the border box and so was clipped to
  nothing. Four affordances that rendered, measured and validated perfectly and
  painted nothing at all. The cut lives on `::after` now with `isolation:
  isolate` putting back the stacking context the clip used to provide for free.
  `tools/oslive.mjs` sweeps for this shape at every mode, and proves each run
  that it can still see the bug it was written for.
- **A translucent plate cannot use the two-shape trick.** The fill has to be
  opaque or the bezel colour floods the whole plate — which is fine for every
  plate in the game except the snap ghost, whose whole job is to be seen
  through. That one painted a solid emerald slab across half the desktop. A
  frame that is genuinely hollow is the answer: one `clip-path: polygon(evenodd,
  …)` with the chamfered outline followed by the same outline 1px in, so the
  interior winds twice and drops out.
- **The menu bar's shed ladder has to bottom out below every width this is
  played at, not at it.** It used to end at the day, which fits 420px with a
  short app name and a four-figure debt and spills with “Agents” and five
  figures — a bar that runs out of rungs prints over itself on somebody else's
  save. Two more rungs (the deck chip, then the alerts) take it under 300px.
- **The three window keys act on `click`, not `pointerdown`.** They are real
  buttons; a pointerdown handler answers a mouse and nothing else, and Enter on
  a focused key did nothing at all. The pointerdown handler only stops the press
  from starting a drag.
- **`#app.booting` animates every window with `animation-fill-mode: both`, and
  an animation outranks a transition.** Show-desktop during the power-on
  therefore changed nothing; the `0` handler ends the boot first.
- **A window's drop-shadow lives on its own static layer.** `filter` re-
  rasterises its whole subtree every time that subtree paints, and a window body
  paints seven times a second. `.win-shadow` never changes, so it costs once per
  move. Unfocused windows dim behind an overlay for the same reason — a `filter`
  on the plate would have been the same mistake.
- **The views' own breakpoints are viewport-based and had to be restated as
  container queries.** `main.css` and `components.css` collapse `.split-*`,
  `.grid-*` and `.tier-nodes` at viewport widths, which was right when one view
  filled one screen; inside a 700px window on a 1440px screen none of them fire
  and every two-column layout squashes. `styles/os.css` restates them against
  `.win-body` (`container-type: inline-size`), additively, at the viewport
  thresholds minus the chrome the view never had — the console's 202px nav and
  330px rail. The four sheets underneath are not edited, so the console cannot
  change. The Wire's body opts out (`container-type: normal`): it is narrow by
  nature and its rows must never be asked to be a grid.
- **Performance is compositing, not script.** Measured with CDP over five
  seconds of live play, the workstation spends *less* time in script, style and
  layout than the console. Headless Chromium without a GPU reports 14fps against
  the console's 31 and that number is a software-rasteriser artifact: with
  `--enable-gpu` it is ~74 against ~76. Measure with a GPU or do not measure.
- **The third chained `drop-shadow` is a cliff.** Adding a tight contact shadow
  to the focused window's `.win-shadow` — a third pass beside the drop and the
  accent bloom — took the whole machine from 74fps to 31, with *less* time in
  script, style and layout than before. Two large passes cost the same as one;
  three fall off a compositor path. It is the count, not the blur radius. The
  same is true of any filter on a layer this size, so measure before shipping
  one: `node /tmp/perf.mjs`-style CDP sampling is the only thing that sees it,
  and it looks like a bug in the GPU rather than in the stylesheet.
- **A washed-out screenshot is the screenshot, not the page.** Capture a
  workstation with a deep stack of windows and roughly one headless screenshot
  in three comes back milky white — a window's accent flooding it, the whole
  desk fogged. It is not a render state anybody can reach: five captures of a
  *frozen, identical* DOM gave one washed and four clean, and disabling
  `backdrop-filter` takes it from 6-in-8 to 0-in-8 with the readings rock steady.
  Only two elements on screen have one — the Wire's sticky head and the
  notification centre — so this is not the layout over-reaching; it is
  Chromium's screenshot path sampling a backdrop root before it has finished
  painting. Same family as the frame-rate artifact above. Before believing a
  flood, take the shot again.
- **`tools/shot.mjs` opens with `pause=1`** and answers any card that is already
  up. Without it the clock keeps running while the checks do, a story card opens
  in the middle of them, and the page-eater check flags the card's own backdrop
  — which is the game working. It cost two false failures before it went in.

### Before committing the workstation

```bash
node tools/copylint.mjs                                # the voice, including machine.js
node tools/ostest.mjs                                  # the housing, headlessly
PLAYWRIGHT=… node tools/oslive.mjs                     # a browser actually using it
PLAYWRIGHT=… ROUTE=/computer/ node tools/shot.mjs      # three widths
PLAYWRIGHT=… ROUTE=/computer/ node tools/oneside.mjs   # every accent still closes
PLAYWRIGHT=… ROUTE=/ node tools/shot.mjs               # and the console is unchanged
```

Three tools, and they see three different things.

`ostest` renders every readout, every menu and both widgets at five points in a
run and checks them for the same leaked `undefined` and `NaN` `uitest` checks a
view for. It also proves every menu item dispatches an action something actually
registers — it reads the `onAction` names straight out of `main.js` and
`src/ui/os/shell.js`, which is how three dead Settings items were caught.

`oslive` is the one that matters, and it exists because **every bug this build
actually had was invisible to the other two**: a `clip-path: none` that flooded a
window with its accent colour, a `backdrop-filter` that did the same, window
keys that answered a mouse and not a keyboard, a drawer that opened behind the
window it was meant to cover. Every one of those rendered, measured and
validated perfectly. So it drives the thing: it logs in, walks the whole of
First Light checking each ring lands on something, drags and resizes and snaps a
window, opens a sheet, answers a thread from a notification, takes a call, turns
an act, shuts the machine down, slides the drawer out at three widths and
carries one save between the two housings. A hundred assertions and twenty
screenshots. Run it with a GPU.

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

## Pacing, measured

The deck is 202 cards and the only way to know what a *run* feels like is to
play one and write down the order. `drawEvent` is weighted, most cards are
`once`, and the good ones are gated — so what a player actually meets is not
what the deck contains. Three seeded 1,800-day runs, pooled, is the instrument.

What that instrument found, and what was done about it:

- **A repeatable card's only brake was its cooldown**, which is a floor on *when*
  it may return and says nothing about how often it already has. Measured: seven
  showings of "They Disagree", seven of "A Researcher Is Available", five of "The
  Codebase Fights Back" — 49 distinct cards repeating inside one run. By the
  fourth the player has stopped reading the card and started looking for the
  button. `EVENTS.FATIGUE` (0.55) now halves a card's weight per previous firing
  and `DRAW_CAP` stops it at four. Worst repeat went 7× → 5×.
- **Fatigue is a preference, not a wall.** Act V is the shortest pool and the one
  a run reaches with the most already spent, and a hard cap there bought 45-to-72
  day silences in the act a player worked eleven hundred days to reach. So
  `eligibleEvents(S, relax)` has three levels — strict, then ignore fatigue, then
  ignore cooldown as well — and `drawEvent` walks down them. `once` and `when`
  are never lifted. Back to zero silences.
- **A repeat that remembers is not a repeat.** `times(S, id)` counts prior
  firings and it is passed as the second argument to `body`, `title`, `label` and
  `sub`, and as the third to `effect`. A card marked `esc: true` earns
  `DRAW_CAP_ESCALATING` (6) because its showings are a thread rather than a loop.
  Four cards use it: the mother's Sunday call across four years, the tech-debt
  wall (ARIA's note gets *shorter* each time), the agents' disagreement (the
  founder stops being able to follow it), and the burnout wall. **Give every
  escalating parameter a default (`(S, n = 0) =>`)** — `uitest`, `copylint` and
  `capsderive` all call `body(S)` with one argument, and without the default the
  last branch renders "you have had this conversation undefined times". That is
  precisely how `copylint` earned its keep.
- **The Log was a 200-deep ring buffer.** A 1,600-day run resolves 250–300 cards,
  so Day One, ARIA and the first dollar were silently deleted somewhere in Act
  III: the player scrolls back for the beginning of their company and finds a
  compute contract. `JOURNAL_CAP` is 320 and `trimJournal` sheds the ordinary
  before the memorable — milestones and anything with a face go last.
- **Act III had no release valve.** Pooled, it drew *three* milestones across
  three entire runs over 467 days at 43% crisis weight, against Act I's four in
  its first hundred days. Tension without release is attrition, not tension.
  `events10.js` is nine milestones for Acts III–IV whose job is to stop and show
  the founder what they made — and because a milestone in a game about scale
  lands hardest when it is *small*, most of them are one person, one room, or one
  sentence somebody said when they thought you weren't listening. Act III went
  3 → 15 milestones per three runs.
- **Act II was the desert.** The longest stretch in the game (~330 days) drew 13%
  cards-with-a-face against Act I's 30% — the founder becomes a company and, in
  the same act, stops meeting anybody. Backwards: Act II is exactly when a solo
  founder acquires other people, and the last act in which those people speak to
  them as a person rather than an institution. `events11.js` is ten character
  cards, each paying off something planted in Act I (Sam's eleven-item list, the
  dorm room, Crane's "come back when you raise your Series A"), so an Act I
  answered differently gives a different Act II. 13% → 36%.
- **Do not measure the journal by its length.** A harness that detects "a card
  resolved" with `journal.length > before` goes blind the moment the cap engages
  and silently reports exactly `JOURNAL_CAP` cards for every run. Compare
  `journal[0]` by identity. Two hours of Act V analysis were about a run that had
  in fact stopped being observed at day 900.
- **`savetest`'s offline check is a collapse test, not a monotonicity test.** A
  product parked at its effective TAM has churn and no headroom, so a 22-day
  catch-up legitimately drifts down a fraction of a percent — and which side of
  that knife-edge the fixture lands on moves with the shared RNG stream, i.e.
  with any deck change at all. It asserts `>= u0 * 0.97` for that reason.
- **Act V ran out halfway through itself.** The finale was excellent for ~225
  days — the cast returns one at a time, the milestones land, the race resolves —
  and then the same seven ambient cards cycled for the rest of it. `events12.js`
  is the long finale, gated on time *inside* the act (`S.company.actStartedDay`)
  rather than the absolute day, in two tranches at 110 and 210 days in, so it
  lands in that hollow wherever a given run reaches it. A finale's emotional job
  is different from every other act's: Acts I–IV ask *what happens next*, a
  finale asks *what was it for*, and nothing in that file is a cliffhanger.
- **`once` cards cannot hold a long act; only what repeats sets the steady
  state.** Act IV is ~550 days and read at 19% faces *while drawing 41 character
  cards*, because all of them were `once`, spent in the first third, and the
  remaining two thirds were the crisis cards coming round again. More `once`
  character cards would have moved the first hundred days and nothing after them.
  `events13.js` is four *repeatable* character cards, every one `esc: true` —
  Dorne across four meetings, the all-hands as the room stops being a room you
  know, HELIX's four requests, Priya's three pieces. That is what the escalation
  hook is actually for: a long act wants threads, not more incidents.
- **`RUNS=3` on `capsfuzz` is a nine-run deterministic sample and it lies.** These
  19 new cards failed it at `RUNS=3` (Act III 1.56× against a 1.5× limit) and
  passed at `RUNS=7` (1.11×) with no tuning in between, which is the same lesson
  the last deck expansion taught. Re-derive with `capsderive` after adding cards,
  pull any TAKE ceiling that now sits *above* the deck's own p80 down to it, and
  gate on `RUNS=7`.

## Gotchas that have bitten before

- **A number in prose should be read, not typed.** The title screen claimed "an
  unlimited supply of machines" for months while the roster capped at
  `AGENTS.MAX_ROSTER_BASE`, the first hire cost $900 and every one of them drew
  a wage daily — and `docs/STORY.md` repeated it in the paragraph that then said
  the only scarce input left is judgement. The WebMCP panel three lines below it
  has never had this problem because it prints `${hand.tools.length}` from the
  same pure function that publishes the surface. Copy that states a quantity
  either derives it or does not state it; `src/data/machine.js` lost a
  "Sixteen waking hours" the same way.
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
- The opening's `.stage` has always scrolled and never said so. Eight category
  cards do not fit a 900px laptop: two of the eight sat below the fold with
  nothing on screen to suggest they existed, which quietly narrowed a first
  run's choices from eight to six. `stageCue()` in `src/ui/intro.js` pins a veil
  and a chevron to the bottom of `#app` — *outside* the scroller, or a cue
  scrolls away exactly when it is needed — and shows it only when there is
  something below. It bobs three times and then holds still, which is the dock's
  attention rule and also the only way an automated hand can ever click it.
- **The rail is above the feed, and the feed is where the decisions are.** With
  no world layer to show, the world console's sub-line is a browser requirements
  list — five lines of what you cannot do, permanently, at the top of the most
  valuable column in the game. `panelBody({ full })` goes terse when it is not
  the full panel and the tier is `none`: the requirements move to the status
  row's tooltip and to the Uplink window, and the line that stays is the one a
  player needs, which is that they are not missing the game. Every other tier
  keeps its sub-line — those say what the world is *doing*.
- **`src/ui/author.js` must not import upward.** It is reached *from* the
  WebMCP surface, so importing anything that leads back into it closes a cycle —
  `ui/author.js → ui/intro.js → webmcp/index.js → surface.js → tools.js →
  ui/author.js` — and an ES cycle leaves a binding undefined at evaluation time.
  It does not fail where you wrote it: rendering is fine and *tool execution*
  breaks, with `Cannot read properties of null` from inside the registry. The
  Uplink's "what an assistant would hold" list is supplied through
  `registerHand()` from `main.js`, the same way the world chip and the
  saved-ago line are. Anything else this module needs from above comes the same
  way.
- **"Show me the Wire" has to mean the same thing in every mode.** Below 1120px
  the Wire is a drawer and `#app.wire-open` is its door, so `WM.open('wire')` is
  not enough — the plate stays parked off-canvas by a transform. `setView('wire')`
  opens the door too now. The walkthrough's own step for the Wire was
  spotlighting a panel nobody could see at 760px, which is the width this game
  is meant to be played at, and `oslive` only ever walked First Light at 1440.
  It walks the whole chapter at 760 and 1000 as well now, checking that each
  ring lands on something *that is on screen* rather than merely on something.
- **No key that visibly does nothing.** The rule the Wire's drawer was written
  under applies to all three window keys in all three modes, and zoom was
  failing it everywhere once modules started filling the field: in desktop and
  compact it had nowhere bigger to go, and in stacked `toggleZoom` refuses
  outright. It goes the *other* way now when a window already fills the field —
  back to the size `def` in `apps.js` draws the app to float at — and in stacked
  the key is hidden. Compact had a second version of the same bug: its first
  layout opens the Desk `zoomed` with no `pre`, so unzooming restored the box it
  was already in.
- **Five choices do not fit four columns.** The prompting strip is `auto-fit` at
  a 128px minimum, which lands on four from 570px to 670px — and the strip is
  never wider than that, so it was 4 + 1 at *every* width the game is played at,
  with three quarters of a row empty beside the last card. Three columns is
  3 + 2 and the cards are half as wide again. Same family as `.grid-tiles` and
  the four-card agent rack: when a count and a column number disagree, pick the
  shape rather than letting `auto-fit` choose.
- **A view fills its window; a document does not.** `.man-win`, `.set-win`,
  `.aria-win` and the Uplink's console cap and centre. A view is a working
  surface and deserves the whole field, but a list of walkthroughs with its
  title at one end of a fifteen-hundred-pixel row and its Start button at the
  other is a document nobody can read.
- **`pointerover` and `pointerout` bubble.** They fire again for every
  descendant the pointer crosses inside the *same* tipped element — and a tipped
  element is usually a button with an icon, a label and a number in it. Taking
  each of those for an arrival and a departure is what made every tooltip in the
  game blink three or four times on the way in, with the hand still moving.
  Both handlers in `src/ui/dom.js` ask whether the *tipped ancestor* changed:
  `pointerover` returns early when `hit.el === tipAnchor`, and `pointerout`
  returns early when `relatedTarget` is still inside it. `oslive` counts the
  opens now, so it cannot come back.
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
