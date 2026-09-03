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
- **A satisfied step holds; it never advances itself.** Meeting a step's condition marks
  it done for the run: the wait line becomes a tick, Next lights, and the card stays. It
  used to advance on the frame the condition went true — on the hours step that was
  mid-drag, the pointer still down on Rest and the spotlight already on another panel —
  and Back was broken by the same thing: a satisfied step re-satisfied itself on the next
  frame and bounced forward, once per press. `done` in `src/ui/tutorial.js` is the
  record and `start()` clears it. `tools/oslive.mjs` reads the card to decide what to
  press: `.tut-wait` means do the thing, `.tut-done` means press Next — keep both class
  names. Two more rules from the same pass: a step may name `also` selectors and the
  cutout is the union (the ship step lights the hands above the Build panel, because on a
  phone there is no W key, only the tile, and a pane over it was a step with nothing to
  press); and between steps the cutout *closes* rather than holding the previous step's
  rectangle, which lit whatever had scrolled under it while the new anchor was on its way.
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
  all 957 authored choices once per act each can appear in, five times each from
  a seeded stream (8,340 executions, `REPS` to change it) and
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
  383 to 497 — it is 957 today — and pulled the p80 of what it *takes* down
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
  mocked. `read_the_rival` and `ask_the_rival` are stable wrappers published in
  the initial batch; if the other origin is not answering, they refuse cleanly
  without changing the page's registration snapshot.
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
- **A cut read is a page, not a lie.** `activity_log` used to hand back the
  fourteen entries that happened to fit and a run with three hundred decisions
  in it could not be read at all. `read_journal(page, filter)`,
  `activity_log(since_day, page)` and `inspect_module(story, page)` page
  instead, every page result carrying `page`, `pages`, `of` and a `next` that
  says how to turn it — and `pack()`'s `_trimmed` is a *list* of what it cut
  (`recent: 36 of 48`) rather than a bare `true`, because "something was
  removed" is not a fact a model can act on. Page sizes are
  `JOURNAL_PAGE` / `ACTIVITY_PAGE` / `STORY_PAGE` in `WORLD_AUTHOR`; the story
  page is smallest because it shares its payload with the whole open card, and
  the card is what the read is for. Two related traps: `pack` used to shed one
  array element per round with eight rounds available, so a forty-eight-row
  list came back over budget *and called itself trimmed* (it sheds a quarter a
  round now); and every new paged read must be measured against a 1,500-day
  journal of maximum-length entries, which is what the webmcptest section
  builds.
- **The deck writes people out, and the world has to honour it.**
  `DEPARTURES` and `departed(S, id)` in `validate.js` are the one place that
  knows: `metCharacters` drops them from the published cast, and
  `validateCard`, `validatePost`, `validateRing` and `Calls.ringable` refuse by
  name with the card that did it. Before this the world could ring the founder
  as Crane the morning after `e7_crane_seat` had him resign. Two things
  deliberately not in that table: `vance_acquired` (that card is Vance coming
  to work *for* the founder) and `kai_declined` (somebody saying no to a job is
  not leaving the story). `released_yuki` is a `back` flag — a reconciliation
  puts somebody back.
- **The world writes at run time, so `copylint` never sees it.**
  `src/world/voice.js` is that linter's rules as a pure function, run on every
  card, post and line the world writes, returned as `warnings` and never as a
  refusal. It reads *narration only* — quoted speech and blockquote lines are
  cut out first, because every contraction in the written deck is inside
  quotation marks and flagging them would be flagging the house style. Two
  rules that fought each other on the first pass: "counts as words" and "one
  concrete number in the body" — a body reading "nine days" has its number,
  so `hasNumber` accepts number *words*. The console counts the notes in its
  tally; nothing anywhere refuses over one.
- **Everything the world remembers lives inside `S.world.author`.** The mode,
  the pending slot and the waiter are module memory because they describe a
  connection; `notes` (the `remember` notebook), `queue` (post-dated cards) and
  `epilogue` describe the *story*, so they are saved — `serialisable` strips
  top-level flags only, which is exactly why they ride in there. `resetAuthor`
  clears all three, because they belong to the timeline; the notebook survives
  into the next one through `buildDossier`'s `worldNotes` instead.
- **A post-dated card is judged twice, and the second time is the one that
  counts.** `write_event(in_days)` stores through `queueCard`, which runs
  `validateCard(S, card, { deferred: true })` — shape, prose, people and
  ceilings now, timing on the day — and `tickQueue` puts it back through
  `writeCard` whole when the day comes. So the founder earning Zero Entropy,
  or spending the budget, or running out of money in between all bite. Timing
  refusals mean "wait" (up to `QUEUE_WAIT_DAYS`); anything else drops the card
  with a note. The plug empties the queue, and so does the ending.

### WebMCP gotchas that have bitten here

- **The desktop bridge permits only 10 distinct registration snapshots per
  document** (plus 100 tools and 65,536 serialised descriptor bytes). Do not
  re-register around cards, submission ids, calls, cast changes, acts or
  doctrines. `surface.js` publishes the stable superset in one batch; executors
  enforce live authority and return the current refusal.
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

## The cast, the person and the long game

Nine features from `docs/plan/newideas.md`, built on top of the world layer. Every one is
additive: with no assistant the phone plays written trees, Aperture plays a
written policy and the chair is empty. Nothing new reaches a reducer except
through the seventeen keys and `commit()`.

- **The phone is a thread that lasts more than one round.** `src/systems/calls.js`
  owns it; `src/data/calls.js` is the written dialogue, one tree per contact,
  and every reply's effects are ordinary effect keys. `canCall` is the only
  gatekeeper and it *says why* — `aria`, `unbuilt`, `stranger`, `over`,
  `offline`, `busy`, `card`, `cold`, `cooldown`, `focus` — with a mono note the
  Story view, the Contacts app and the context menu all print. A call costs
  `CALLS.FOCUS_COST`, blocks the clock through `advanceBlocked`, and ends
  through `endCall`, which returns the finished call because `activeCall(S)` is
  already null by then and the hang-up repaint needs it. When the world is on
  the line (`take_the_call`) every reply goes through `validateCallReply`:
  affinity at `AFFINITY_MULT`, everything else at `CAP_MULT` of a card's
  ceilings, and the *merged* deal of the whole call may never exceed one card.
  `ring_the_founder` is the world calling — not before `RING_MIN_DAY`, not
  twice inside `RING_WINDOW_DAYS`. Digit keys pick topics, Enter is the close
  key, and Escape never dismisses a live call. `src/data/characters.js` carries
  the dossier the plate prints and the briefing hands over: `wants`, `knows`,
  `tie`.
- **Life is a floor, not a meter.** `src/systems/life.js`: sleep drifts toward
  the hours you keep, health follows sleep, `healthMult` scales focus regen and
  burnout, and ties cool with `WARMTH_HALFLIFE` while `touch()` warms them
  whenever a contact card, a reply or a call lands. `warmthWord` answers
  `quiet` for a tie nobody has touched; it used to answer "never" beside a
  "never", which is two labels and not a sentence. The payoffs are specific —
  `gives` on a warm tie — because a chore meter is the one thing this must not be.
- **Keep, and the dossier.** `src/systems/keep.js`. "Keep this card" on a world
  card's outcome copies it into `S.legacy.kept` through `cardShape`, face and
  effects intact; `keptEvents(S)` turns them into deck entries `eligibleEvents`
  draws beside `EVENTS`, marked `author: 'kept'`, and each effect still passes
  `boundEffects` on landing. Export and import are text on the Legacy screen.
  `buildDossier` runs on prestige and rides the briefing as `pastTimelines`.
- **The director steers the draw; it never picks.** `measure(S)` in
  `src/systems/director.js` reads the last `DIRECTOR.WINDOW` journal entries —
  the crisis run, days since a milestone, faces against institutions — and
  `steer(S, e)` is a multiplier `drawEvent` applies to a weight. `beatSheet(S)`
  is the same reading in words, on the briefing as `beat` and in the context
  every world card is written against. `once` and `when` are never touched.
- **The chronicle is generated, never stored.** `src/systems/chronicle.js` is a
  pure function of `S` (and an ending, if there is one) to chapters; the
  sentences live in `src/data/chronicle.js` under `copylint`. Never quote a
  live number in an opener: the chronicle of a dead company reported that
  morning's MRR.
- **Aperture plays the same game.** `src/systems/rivalco.js` gives the rival lab
  a company — funding, roster, users, research on the real tree — that
  `tickRivalCo` plays once a `RIVALCO.WEEK` by `PLAY_WEIGHTS`. `rival_move` lets
  the world choose the play and `humanPlay` lets a person; both go through
  `play()`, which refuses what the funding does not cover. Its research raises
  the frontier through `apertureRaceMult`, bounded by `RACE_BONUS`; over seven
  bot runs the race did not move, which is the right amount. Users floor at
  `roster × USERS_PER_HEAD`, or one bad week took the company to zero and it
  never came back. `apertureState(S)` is what its own site renders, pushed when
  the frame loads, after every play, and once a day.
- **Two humans.** `rival/?play=1` is Vance's chair. It talks to the copy of the
  page the game has framed over a `BroadcastChannel` on the rival's origin; that
  copy relays to the game with `postMessage`, and `handleRivalMessage` in
  `src/webmcp/partners.js` accepts only the rival's origin and only the frame it
  mounted. A play goes through `humanPlay`; a line goes through the same
  `looksLikeInjection` scan a press release gets and lands in the Wire marked as
  a person's. `boot()` mounts the frame even at tier `none`, because the press
  office is the channel whether or not anything can call a tool. A
  BroadcastChannel is one browser profile, so this is two windows on one
  machine; two machines need a relay, and that is deliberately not built.
- **The long game is a pace, not a mode.** `settings.pace` is `sitting` or
  `long`, chosen in the opening and in Settings. After `LONG.LIVE_DAYS_PER_DAY`
  live days in a real day `longHeld()` blocks the clock and the machine says so
  once per date (`long:held`), with a way to keep going tonight. Offline
  catch-up in the long game is linear at `DAYS_PER_REAL_DAY`, capped at
  `MAX_OFFLINE_DAYS`, and delivers the mail that arrived meanwhile.
- **The machine's own apps.** Contacts, Mail (`src/data/mail.js`, delivered by
  `tickMail` one a day as feed type `mail`, read state in `S.mail`), Browser
  (the rival's origin, for real), Journal (`S.notes`), Calendar
  (`src/systems/calendar.js`) and Terminal (`src/data/terminal.js`). Each is an
  entry in `apps.js` with a READOUT and a MENU, a paint branch in `os/shell.js`
  that keeps its input — the journal's draft, the terminal's line and scroll —
  across the seven-a-second repaint, a builder in `src/data/context.js`, and
  its copy in `machine.js`. The Record reads calls, the journal and the
  chronicle as folders, so each needed a reader.
- **A render path must never draw from the RNG** still applies to all of it:
  the Terminal answers from state without a draw, and the line for one of
  Aperture's plays is picked inside `tickRivalCo`, never when its site renders.

### The phone remembers, and it rings

The first version of the phone was three exchanges and a hang-up from a menu
that never changed, and after two calls a player had seen all of it. What
fixed that is in `src/data/calls2.js` and `src/data/signals.js`, merged into
the trees at the bottom of `calls.js`.

- **`signals.js` is the one place content reads the run.** `incidentRecently`,
  `raisedRecently`, `lostRecently`, `playedRecently`, `recentTone`, `sleep`,
  `runway`, `behindInRace` and the rest are pure functions of `S` that
  tolerate a save without the field. The phone and the mail ask the same
  questions the same way; anything written later should import from here
  rather than reading `S.stats` by hand. The stamps they lean on —
  `lastIncidentDay`, `lastIncident`, `lastRaiseDay` — are written in
  `incidents.js` and `economy.js`, beside the counters that already existed.
- **A topic with a `when` is about something that just happened, and it goes
  first.** `options()` sorts never-said before said, timely before standing,
  then slices `TOPIC_KEEP`. Without that sort the reactive topics sat behind
  the four evergreen openers and were never offered; the phone test that
  asserts "a year in, the anniversary is offered" is what found it.
- **Memory is `S.calls.said[char][topic]`, counted across every call.** A
  `once` topic is never offered again; `label`, `reply` and `when` receive `n`
  (times said) as their third argument so a repeat can be written as a
  repeat; the plate marks a repeated topic `again`. Every topic carries an
  `about` noun and every tree a `recall(S, r, m)`, so the pickup can say
  "Last time it was the truce" — `memoryOf` names the *first* topic of the
  last call, and a follow-up inherits its parent's `about` in the merge.
  `RECALL_DAYS` stops a call from a year ago being brought up.
- **`fx` may be a function of `(S, r)`.** Crane's bridge is sized to the burn.
  `lint.mjs` evaluates a function `fx` against a probe state and checks the
  keys like any other.
- **The written world rings.** A tree's `rings[]` are what that person calls
  *you* about: `when(S, r)`, an `opening`, and their own `topics`, which come
  first because a call that started about the outage still ends up about
  everything else. `tickRings` runs in the day hook, never offline, never
  while an assistant is present (`ring_the_founder` is the world's own way),
  at `RING_CHANCE` a day, one ring per `RING_WINDOW_DAYS`, each once a run
  (`S.calls.rang`). `startCall(by: 'them')` is the same path `ring_the_founder`
  takes with `by: 'world'`; `main.js` opens the plate for any `by` that is
  not the founder.
- **A ring holds the clock, so every bot has to pick up.** `simulate()` stops
  at `advanceBlocked()`, and a written ring on day fourteen used to freeze
  every harness run there. `tools/bot.mjs` says one thing and hangs up;
  `tools/shot.mjs` hangs up a call the fast-forward left open, the way it
  answers a card. The dev harness (`?dev=1&days=N`) runs the day hooks live,
  so a call plate can already be up when a page loads — that is the game
  working, not a bug.

### What a scripted first half hour found

`tools`-free, but worth recording: a Playwright script that plays the opening
and the first twenty days the way a new person would, photographing every beat
in both housings, found three things no suite could.

- **A prompt takes focus when it comes forward.** The Terminal opened without
  the cursor in it, so the first thing typed — `help` — went to the game's
  hotkeys: `e` talked to users and spent focus. `focusPrompt` in `os/shell.js`
  runs at the end of `setView` and `toggleFromDock` for the terminal.
- **The same sentence from two handles in one week reads as a script.**
  `generateFeed` drew from short pools with `pick()`, and the rail showed
  "@vibesbased" and "@uptime_enjoyer" saying the identical line a day apart.
  `fresh()` in `feed.js` re-draws while the line is still among the last
  twenty-five items, and gives up after six tries rather than loop.
- **Whoever is due, not whoever is first.** `tickRings` took `due[0]`, and
  `pendingRings` walks the cast in declaration order, so Sam's outage call —
  incidents come early — opened every run's phone. It picks among the rings
  that are due now, one RNG draw, and only when there is more than one.

### Where repetition hides

Two pools were one or two lines deep and the run drew from them for a
thousand days. Aperture's plays in `src/data/rivalco.js` had one sentence
for a price cut and one for a raise, so its site read the same every quarter;
each play has five or six now, and `play()` re-draws while the line is among
the last six it printed. The chronicle in `src/data/chronicle.js` had one
template per kind of entry, so every chapter was "Day N: title. You chose to
X. Outcome." — there are three per kind now, three closers per temperament
and three openers per act, and `systems/chronicle.js` rotates them with the
entry's day as the salt, because the chronicle is a pure function and may
not draw from the RNG. When a pool is under three deep, the game will show
you the seam within an act.

### The post answers the run

`src/data/mail2.js` is the letters that only arrive because of something
that happened — the week of an outage, a round closing, a departure, a
rival's move, a week without sleep — merged into `LETTERS` at the bottom of
`mail.js`. Most are `urgent`, and `tickMail` delivers an urgent letter ahead
of anything else waiting, because a letter about this week's outage that
arrives after the conference invitation has missed its moment. One a day
still holds. Their `when` gates include the recency, so an urgent letter that
was never delivered stops being due rather than landing a month late.

### The walkthrough teaches the new surfaces

Three chapters and two steps in `src/data/tutorial.js`: **The People** (the
phone, the rings, Life, the pace), **The Other Company** (Aperture's panel,
who chooses the play, the site), two steps on **What Carries** (keep, the
shelf), and **The Machine**, which is `osOnly`. A chapter marked `osOnly`
has nothing to point at in the console: `chapterStatus` reports it
unavailable there with `why: 'workstation only'`, which the Manual and the
menu bar print instead of "not yet", and `maybeAutoStart` and `start` refuse
it. Its steps name windows (`view: 'mail'`) rather than modules;
`tutorialtest` accepts app ids from `apps.js` for an `osOnly` chapter and for
any step's `os` override, reads `src/ui/os/*.js` as anchor sources, and
counts `styles/os.css` as styling. The rival chapter is gated on
`apertureState(S)` rather than the act, because the panel it spotlights
exists only once the company does. Walkthrough prose is under `copylint`
now, `os` titles included.

### Two humans, two machines

`tools/relay.js` is a room per run in the dev server: server-sent events out,
an 8 KB JSON POST in, eight message types, no storage, mounted on both
origins by `serve.js`. The chair and the framed press office meet there when
the URL carries `room=`; `roomCode(S)` in `src/webmcp/origin.js` derives six
characters from the save, `partners.js` puts it on the frame URL, and
`inviteLink(S)` is the line under Aperture's week on the Market view, in the
Terminal (`invite`), and on the clipboard from **Copy**. Without a room, or
when the relay is not there, the rival page falls back to the
BroadcastChannel and its status line says so in mono.

Three things bit while building it. **A throw inside an `http` event
callback takes the process down, and the process serves both origins**: the
first `hello` reply wrote a body and then a 204 header, and the dev server
died with `ERR_HTTP_HEADERS_SENT` in the middle of a browser run. Every
relay callback is wrapped now and answers exactly once. **Playwright's
`networkidle` never arrives once a page holds an open event stream**, so
every harness waits for `load` instead, and `liveworld` gives the app a
beat after each navigation because `load` fires before it has booted.
**Two browser contexts are two profiles**, so a BroadcastChannel does not
cross them — which is exactly what makes a two-context Playwright run a
proof that the relay carried the play. `resolveOrigin` treats a bare IP as
the dev server (the rival is the next port up), and `location.hostname` is
undefined headless, so it returns `null` there rather than throwing inside
a view render — `uitest` caught that one. And **a state with no company in
it is not a message**: before Vance appears `apertureState(S)` is null, the
framed copy used to relay it anyway, and the relay's 400 showed up as three
console errors in every harness run. The relay logs what it refuses now.

### Four seats, and what each one may reach

The room grew three more occupants and the rule for all of them is the same
one: **the relay is a pipe and the game re-checks everything**.

- **The chair** plays Aperture's week, through `humanPlay`. Unchanged.
- **The rival's own agent** (§H14) is Vance's hand as tools, registered on the
  rival's origin with *no* `exposedTo` — visible to a thread whose browser is on
  that page and to nobody, the game included. `aperture_play` posts on the same
  bus a button press does and waits a beat for the answer, so a refusal comes
  back in the game's own words. The tools live in `rival/rival.js`; the press
  office's prose and its generation live in `rival/press.js`, which is pure and
  imports nothing, so `tools/rivalorigintest.mjs` can drive the whole origin
  headlessly — two copies of the page in one process, keyed by
  `rival.js?copy=chair` and `?copy=frame`, with `location.search` swapped
  between the imports because the page reads it once at evaluation.
- **The board seat** (§H15, `?board=1`) holds three powers and no keyboard.
  Each moves one field — `boardRefusedUntil`, the board's `forcedUntil`, the
  standing order — and then lands as a card through `writeCard` with
  `author: 'board'`, bounded by `validateCard` exactly like a card the world
  wrote. Two consequences worth knowing: a board card's numbers must fit the
  *tightest* act it can land in, and a motion whose card is refused still
  *applies* — the decision is a fact about the board and the card is the founder
  hearing about it, so `boardMotion` answers `{ ok: true, card: false }` and
  says why.
- **The spectator** (§H16, `?watch=1`) posts nothing: the relay refuses every
  type but `hello` from a client that said hello as a watcher. While one is
  present the game publishes `commentary`, which prints a caster's line and
  moves nothing. It is the only conditional name on the surface and it
  **latches** — once seen, published for the session — because a registration
  snapshot is one of ten for the life of the document and a room somebody joins
  and leaves four times would spend the budget by itself. `execute` re-checks
  whether anybody is still watching, which is the same stable-registration,
  live-authority rule everything else here follows.

`src/systems/chair.js` holds the roster (session memory, like the chair's rate
buckets — it describes a connection, not a run) and both mechanisms.
`founder_public` is the one tool minted *outside* `desiredTools`: it is
published to the rival's origin with `exposedTo` and must not appear in the
founder's own hand, so `surface.js` keeps a small `external` set and
`reconcile` does not treat it as a stray to revoke. `muteAll` still takes it,
because the plug means every origin.

## The landing (`/`)

The title beat at `/` is a landing page: one scroll inside the existing
`.stage`, six movements, film above the fold and machine below it.
`src/ui/landing.js` renders the sections and drives the hero's canvas;
`src/data/landing.js` holds the five act sentences and the plates' copy and
is under `copylint`. Rules that hold it together:

- **The hero is still `showTitle`.** Every `data-act` the old title had is
  still there, `tools/titleshot.mjs` still finds `.title-kicker`,
  `.title-webmcp`, `.wm-*`, `.assistant-pick` and `.start-pick`, and the DOM
  order is load-bearing: kicker, wordmark, tagline, actions, readout strip,
  WebMCP panel — so on a short screen the strip and the panel drop below the
  fold and **Begin never does** (the 392px case used to fail on this). The
  world-layer plates below use `.ld-tool` for their chips, deliberately not
  `.wm-tool`, which `titleshot` counts document-wide.
- **The workstation's login is untouched.** The housing test is whether a
  `decorFn` is installed, not whether it returned tiles — a first-ever visitor
  to `/computer/` has three empty slots and `loginTilesHtml` returns nothing.
- **The cold open moved out of the title.** It plays as a `cold` beat before
  `who` on a first-ever visit, skippable, auto-advancing; `beats()` filters it
  in only when owed and `chrome()` counts questions, so the founder sees
  "1 / 3". The landing shows the same five lines typed in a terminal plate
  instead of gating the page on them.
- **The rain.** A 2D canvas: low-alpha fill for trails, one glyph per column
  head, two layers for parallax, the game's own alphabet, word drops from
  `openingHand()`, `FEATURE_KINDS` and `EVENTS` titles (never more than two on
  screen), `fillText`/`fillRect` only, DPR capped at 2, its own LCG and never
  `engine/rng.js`, paused when the tab is hidden or the hero has scrolled out,
  one still frame under `prefers-reduced-motion`. Measured with a GPU: median
  72 fps running and the same with the hero scrolled out.
- **Every number on the page is derived at render** — the readout strip and
  the numbers rack read the data modules; `src/data/landing.js` states no
  quantity at all. A screenshot of either housing lives in `assets/readme/`
  as WebP and is captured with Playwright, never drawn.

## Before committing

`npm test` is the whole of the list below down to `choreo`, in that order. Run it
before every commit; the three evals and the balance run are separate because
one of them is slow and two of them are gates on tuning rather than on code.

```bash
node tools/lint.mjs          # content integrity
node tools/copylint.mjs      # the voice, across every content module, including machine.js
node tools/uitest.mjs        # every view renders, every choice executes, no undefined/NaN leaks
node tools/ostest.mjs        # the workstation's readouts, menus and widgets, headlessly
node tools/puretest.mjs      # no view draws from the seeded stream — the `askAria` rule, enforced
node tools/tutorialtest.mjs  # every walkthrough step still anchors to something that renders
node tools/transporttest.mjs # the pause bit belongs to the founder, and the opt-in is the founder
node tools/fmttest.mjs       # the string a player reads means the number the sim holds
node tools/savetest.mjs      # round trip, migration, offline catch-up
node tools/lifetest.mjs      # sleep, health and ties — the floor stays a floor
node tools/phonetest.mjs     # every tree and letter reads; memory, once, sized effects, the written rings, urgent post
node tools/keeptest.mjs      # a kept card is dealt, bounded, exported and imported
node tools/chronicletest.mjs # the chronicle is pure, and a lost run gets one
node tools/rivaltest.mjs     # Aperture's week, every play, the chair, the board seat and the room
node tools/rivalorigintest.mjs # the rival's own agent: its private tools, through the founder's gates
node tools/longtest.mjs      # the long game holds the clock and catches up
node tools/prestigetest.mjs  # a timeline ends, pays and opens the next one
node tools/endingtest.mjs    # every ending is individually reachable, and not all of them at once
node tools/worldtest.mjs     # every rule the world plays under, one refusal at a time
node tools/webmcptest.mjs    # the registry, the surface, every tool, against real reducers
node tools/residenttest.mjs  # the local model plays the same loop through the same bounds
node tools/choreo.mjs        # the filmed sequence, beat by beat
node evals/select.mjs        # can a player's words reach the right tool
node evals/baseline.mjs      # what an agent reading the page cannot get
node evals/capsfuzz.mjs      # can the worst legal world break the game
RUNS=3 DAYS=2000 node tools/balance.mjs
```

**Two of those three evals are byte-identical run to run, and it took a seed on
the bot to make them so.** `makeBot(root, { seed })` gives the loop its own LCG;
without a seed it is `Math.random` and every other harness plays exactly as it
did. `baseline.mjs` had a seed on the *game* and a seed on its own card answers
and was still a different run every time, because the phone branch in
`bot.step` rolled `Math.random` — and a call blocks the clock, so whether the
bot spoke or hung up decided whether that step advanced a day. 320 steps from
one fixed seed landed anywhere between day 325 and day 355, the briefing came
out 1,302–1,444 characters against a 1,500 cap, and about one run in eight shed
`youMay.cast` and failed the `cast_list` claim's own probe. The bot's stream is
deliberately *not* `src/engine/rng.js`: drawing the bot's dice from the game's
would move every event draw after it, which is the thing `parity.mjs` compares.
`select.mjs` needed a game seed as well — it never had one at all.

`tools/simtest.mjs` is deliberately not in that list. It asserts nothing and
exits zero: it plays one seeded run and prints the whole of it — the ledger line
by line, the gate marks against the days the gates were *met*, the doctrines
held, the deeds and when each one landed. It is the instrument you read when a
number looks wrong and you do not yet know which number.

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
days. **Measured after §A6 on 210 runs: 133 / 370 / 728 / 1135, ending at a
median 1409 with 179 of 199 inside the band.** The two acts that arrive early of
their target are the two whose floors came down — Act III by fifty days at §A6
and Act IV by a hundred and forty at §A5 — and both are now paced by their gates
rather than by a number in this file. Do not move a target to meet a
measurement or a floor to meet a target: the band at the bottom of that
paragraph is the thing that has to hold, and it does.

**Measured on the current build at §A5, 7 builds × 15 seeded runs = 105, with
the same harness run against the previous floor for the comparison.** Five runs
is the sample the balance table takes and it has lied to this file twice; a
hundred and five does not, and the before column below is the *same* harness on
the *same* day with one constant changed, which is the only kind of before this
document should print.

| | before (`ACT4_MIN_DAYS` 420) | after (150) |
|---|---|---|
| Act II reached | 134 | 136 |
| Act III reached | 423 | 413 |
| Act IV reached | 849 | **697** |
| Act V reached | 1172 | 1174 |
| Act II length | 250 | 250 |
| Act III length | **420** (p25 = p50 = p75) | **286** |
| Act IV length | 319 | 432 |
| run end | 1415 (90/100 in band) | 1456 (86/99 in band) |
| gate-open I / II / III / IV | 0% / 11% / **37%** / 0% | 0% / 15% / **0%** / 0% |
| bankruptcies | 2/105 | 0/105 |

**§A5 took the last timer out of Act III.** The deed there has three doors and
the gate opens on the earliest, which lands in the first third; `ACT4_MIN_DAYS`
then held the act for another four months, so a founder who had survived the
hearing was told the world needed a hundred and thirty more days. The floor is
150 now, chosen off the distribution of the day the Act IV gate is first fully
met (`gateMetDay[4] − actMarks[3]`: min 59, p5 96, median 279) and floored at
the shortest Act III that still holds a megaproject rather than at the p5 —
`src/data/balance.js` carries the whole reading. Per build the Act III open
share went 10/58/16/73/50/31/45% to **0/0/0/11/0/0/0%**, and Act III's length
stopped being the floor to the digit and became the gate.

**Where the time went is the thing to know before touching this again.** It did
not come out of the run: Act V still arrives at 1174 against 1172 and the run
still ends at a median of 1,456 days inside the 1000–1700 band. It moved into
Act IV, whose median length went 319 → 432 — and that is the game asking for
work rather than a timer, because Act IV's own gate-open share is 0% in every
build at both floors. Act IV is bound by its numbers ($12T, 4.5% of world GDP,
recursive self-improvement, 85% on the frontier) and by nothing else. Two things
to watch there: `ACT5_STALL_DAYS` (620) is exceeded by 1% of runs now against
2.2% before, because Act IV's *maximum* length fell (962 → 739) even as its
median rose; and **Act II was then the act with a binding floor** — its length
was exactly `ACT3_MIN_DAYS` in five of seven builds and its open share was 15%
(mean 20%). That was the next one, and §A6 below is it.

**§A6 took the last one out of Act II, with the same instrument.** The reading
is `gateMetDay[3] − actMarks[2]` over 210 runs (7 builds × 30) — min 86, p5 129,
p10 141, p25 171, median 223, p75 301, max 1797 — against a floor of 250 that
therefore bound in 60% of them. `ACT3_MIN_DAYS` is **120**: a little under the
p5, and floored at the shortest Act II that can hold its own deed from a cold
start, because the door that carries the act is ninety consecutive profitable
days and a founder who enters with a broken streak needs all ninety. Measured
at 210 runs a side, one constant changed:

| | before (`ACT3_MIN_DAYS` 250) | after (120) |
|---|---|---|
| Act II reached | 137 | 133 |
| Act III reached | 420 | **370** |
| Act IV reached | 717 | 728 |
| Act V reached | 1147 | 1135 |
| Act II length | **250** (min = p10 = p25 = p50) | **209** (p10 142) |
| Act III length | 268 | 301 |
| Act IV length | 428 | 436 |
| run end | 1372 (176/201 in band) | 1409 (179/199 in band) |
| run end p10 / p90 | 1174 / 1652 | 1151 / 1649 |
| gate-open I / II / III / IV | 0% / **12%** / 0% / 0% | 0% / **0%** / 0% / 0% |
| bankruptcies | 2/210 | 0/210 |

The mean open share of Act II went 19% → 0%, and per build it went
0/10/17/0/11/40/26% to 0% in all seven. The floor now binds in 2.9% of runs.
**Where the time went, again:** Act III arrives fifty days earlier and Act IV
does not — 717 against 728 — because the fifty days are spent inside Act III,
whose median length went 268 → 301. Act V lands at 1135 against 1147 and the run
ends at 1409 against 1372. Nothing was compressed; a founder who was waiting is
now playing, one act further in. That is the same handover §A5 saw into Act IV,
and for the same reason: what is left is the gate, and the gate is work.
Act I's `ACT2_MIN_DAYS` (45) binds in **0.0%** of 210 runs and its open share is
0% median and 0% mean; it has never bound and it is left alone.

The race is unmoved. Eight 14-run race tables a side — the harness is not
reproducible, so one pair proves nothing — give a mean of 9.00 wins before and
7.75 after, 72/112 against 62/112. That is 1.25 of a win inside a ±2 band and
1.4σ on the pooled sample; the per-table spread is 7–11 before and 6–10 after.
`RUNS=7 evals/capsfuzz.mjs` still reports "the band holds against the worst
legal world".

**A floor is not local, and two things downstream of this one had to move with
it.** Anything that reads an *act day* as a measure of skill is really reading
the floors underneath it, so cutting one silently makes it easier. `speedrun`
("Act III inside 420 days") and `fast_third` went from 47% and 25% of harness
runs to 70% and 57% — a rare achievement earned by more than half of them — so
both are re-cut to the shares they had (370 and 320) with the measurement
written beside them, and both comments that claimed the floors set "the
earliest Act III there is" are gone: they had been false since §A2 and the
gates set it now. And `runLengthDays()` in `src/ui/intro.js`, which answers the
first question a new person asks, was *derived* from the four floors plus the
Act V window — honest while the floors were the acts, and after §A6 it would
have told them a full timeline is 650–790 days, "about an hour", for a game
whose median run is 1,409 days and three and a half. It reads
`ACT_GATES.RUN_DAYS_LOW/HIGH` now, which is the measured band. **When you move
a floor, grep for what reads an act day.**

One warning that cost an hour: the *first* read of this at 7 builds × 15 said
the run-end p10 fell 1190 → 1079 and the in-band count fell 91/102 → 81/98,
which reads as a run compressing under the floor change. At 210 a side both
reversed. A hundred and five runs is enough for a median and not enough for a
tail — take the tails at 210. And do not read even the 210 to the day: a third
sample on the finished tree gives Act II 227 rather than 209 and the run end
1,366 rather than 1,409, with the gate-open share still 0% and 0%. The shares
are what this pass moved; the medians carry about ±20 days of sample either way.

**Which act gate binds is deliberate — and since §A2 an act also closes on a
deed.** The economic curves are near vertical by Act III — raising the Act III
bar from $75M ARR to $280M moved the transition by 36 days — so a threshold
cannot pace anything; it can only wall off a player having a bad run while a
good one sails past. `minDays` therefore still sets the pace and the `test` is
still the competence check. Do not "fix" a floor without re-measuring the goal
it sits next to.

What changed is that the floor used to be the *whole* of the pace. Measured on
21 seeded runs: the median Act II lasted 310 days against a floor of 310, Act
III 470 against 470 and Act IV 270 against 270 — the floor *was* the act — and
the median act spent **36% (II), 50% (III) and 10% (IV)** of its length with the
next gate already open. The last third of an act was the founder waiting for a
calendar.

`ACT_DEEDS` in `systems/progression.js` is the answer: one authored act per
transition, ANDed into that act's `test`, and the floors cut to meet it
(310→250→**120**, 470→**150**, 270→215; Act I's 60→45 has never bound). §A2 cut
the first pair, §A5 finished Act III's and §A6 Act II's: the floors are
**45 / 120 / 150 / 215** today, no act's median length is its floor any more,
and the open share on 210 runs a side is **0% / 0% / 0% / 0%**. There is no
timer left in the table — an act ends when its numbers and its deed are done —
so the next time one of these looks wrong, the thing to change is the gate.

Four rules hold the table together:

- **Every deed has more than one door.** Act II is a Series A *or* a profitable
  quarter, because a bootstrapper must be able to leave it — measured at §A6 on
  210 runs, the harness raises a Series A in 10 of them and holds a profitable
  quarter in 210 of 210 (median day 149, min day 80, so usually before Act II
  even opens), which is why `ACT3_MIN_DAYS` is floored on the quarter's ninety
  days and not on the round. The second door is the one that carries the act,
  and a floor under ninety would be a floor a bootstrapper could not clear from
  a cold streak. Act III is a
  hearing sat through *or* a region at government partnership *or* the
  frontier-class training run, which widens what used to be a single research
  node into three ways a company stops being only a market participant.
- **A deed is a competence check, not a delay.** Measured, every door lands
  before its act's numbers do, so the deeds move no median on their own; what
  moved the medians is the floors coming down behind them.
- **§A5. Every door says how far along it is.** A deed named three chases in
  one sentence of prose and then never mentioned them again, so a founder two
  stages off a treaty had no way to know it. Each door carries a `note` — a
  pure function of `S`, no draw from the stream, called from `render(S)` seven
  times a second — and `deedDoors(S, act)` is the one list the Desk's objective
  row, its Field Note (`act_deed`) and the workstation's NOW widget all draw:
  "a hearing survived · not yet", "a region at government partnership · 2 of 3
  stages in South Asia", "the frontier training run · 61%". `objDetail` in
  `ui/dom.js` draws it and the checklist *replaces* the objective's hint rather
  than sitting under it, because the hint on a deed is those doors written out
  as one sentence — printing both is the same list twice with only one of them
  saying where you stand. The reading goes on its own line under its door: an
  objective card is 210px by `minmax` and beside the name it squeezed "a region
  at government partnership" into three wrapped words. The deed's own
  `test` is *derived* from its doors (`anyOpen`) rather than typed beside them,
  so the checklist a founder reads and the gate that actually opens cannot
  disagree. A door opening writes one line to the Wire, once per door per run,
  from `DOOR_OPENED` in `data/events_acts.js`; `S.company.doorsOpen` is the
  record and it is seeded *silently* the first time it is missing, because a
  save from before this existed is mid-run with doors already open and three
  lines about last spring is not a beat.
- **Act IV's deed is scoped to Act IV.** "Keep a quarterly intention, or close
  a season of the feud in your favour" counts only from `actStartedDay`, or a
  promise kept in the garage would close the last act before it. The Act V
  gate's `ACT5_STALL_DAYS` valve covers the deed as well as the benchmark, so
  a founder who never plans and never fights is slowed rather than locked out.

The deed is also that act's last objective (`data/objectives.js` reads the same
table rather than restating it) and the act-transition card in
`data/events_acts.js` names the door the founder actually walked through.
`tools/balance.mjs` prints the open share per act from `S.company.gateMetDay`,
which `checkActProgression` stamps the first day a test passes; that column is
the instrument this pass is judged on and it should not be removed.

**§A4. The roster is bounded by attention, not by cash.** Every active agent
draws `FOUNDER.REVIEW_FOCUS_PER_AGENT` of the founder's day, and the day's focus
*regeneration* pays that line before the work of the day touches it — so a
founder who never rests can cover nobody, however full the bar is. Three reliefs
buy it back and each is a decision with its own bill: a higher model tier needs
less reading, a longer leash needs less asking (and writes more debt and goes
rogue more often), and the Weaver halves the whole line, which is what a chief of
staff is for. Whoever the day could not reach runs **unreviewed** —
`AGENTS.UNREVIEWED_DEBT` on its debt per work unit and `UNREVIEWED_MORALE` off
its morale target — and says so, in mono, on its own card. `reviewLoad` in
`systems/agents.js` is pure and is called from `founderOutput`, which the Desk
renders seven times a second; `tickFounder` caches it on `S._review`, `save.js`
strips it beside `_specFx`, and `reviewState` recomputes it when it is not
there. `_review.ids` is an array and not the Set `reviewLoad` works in, because
`forecast` and `preview` deep-copy the state and a JSON copy turns a Set into an
empty object with no `has` on it.

All three bots share the hiring rule — `canReview(S, cand)` beside the runway
check — for the reason `docs/plan/whatitneeds.md` gives: when attention becomes scarce, a
harness that hires on cash alone measures its own ignorance. Measured across 35
runs the end-of-run roster went 10 → 8 and Act V's went 10 → 8, with act medians
moving by under 3%: the cap is `MAX_ROSTER_BASE` plus research as before, but
the *reachable* roster is now the one the founder can read.

**§A12. Research is a build.** Three things, and the first is the one with
teeth. `excludes` is a door a finished node closes, checked in `isAvailable` so
the queue, a self-directing researcher and the world layer all obey it without
knowing it exists, and printed on the node *before* it is walked through
(`closes …` in amber, `closed by …` in red). Three pairs, all leaf against leaf:
Unified Monorepo against Swarm Orchestration, Custom Silicon against Substrate
Independence, Constitutional Alignment against Total Attention Capture.
`tools/lint.mjs` enforces the rule that keeps them honest — **an exclusion may
never sit on the required chain of a node an act gate or an ending names** —
which is why the pairs are not the obvious ones: Regulatory Capture *requires*
Standards Capture, and Consent of the Governed is what The Question is built on.
Anything that counted the finished tree counts `treeComplete` now, or the
achievement becomes unearnable the moment a door shuts.

`scaleWith` is time-to-value: Network Effects is worth what the network was on
the day it landed, Platform & API what there was to build on, Distillation what
the roster was. The strength is fixed once in `completeResearch`, stored on
`S.research.scale`, and `computeMods` interpolates that node's own effects
between nothing and the card — bounded at `SCALE_MIN`/`SCALE_MAX` (0.6–1.5),
because the point is to make the *order* a decision and not to make a mistimed
node worthless.

`MAX_RATE` came down from 22,000 to 12,000. Measured, it binds only in the last
two or three hundred days of a run — the rate is under 1,000/day at day 1,000
and slams into the ceiling after `recursive_self_improvement` compounds — so it
is a pure endgame knob and moves no act median. A run finishes 79–81 of the 86
nodes now against 83–85, and 5–11 are left unfinished against 1–2. Note that
"60% of the tree" is not reachable at any value: the cost curve is brutally
exponential (the 80 cheapest nodes are 10% of the tree's cost, the three tier-8
nodes are 65%), and a run that reaches an Act V ending has bought about 68 of
them by necessity. Node *count* is the wrong instrument here; what is left
unfinished is the right one.

And `stellar_engineering` cost 3,456,000 for a reason nobody had measured: its
chain is a whole branch (Dyson Swarm and Molecular Manufacturing are act-5
nodes in front of it), so the three ending paths cost 3.5M, 5.4M and **8.1M**
points and no run — before this pass or after it — ever reached the third. It
is 1,400,000 now, which puts the Expansion path at about 4.3M, and all three
are individually reached by an aimed harness run while no played run reaches
more than two.

The AGI race **is losable**, and since §A3 it is losable *to something*. Capability
(nodes, compute, data, frontier agents) is a ceiling rather than progress itself:
`RACE.CONVERT_PER_DAY` converts it at a speed set by Frontier Commitment
(`pushTarget`), which reads the Ascend standing order, agents on Research, the
founder's study hours, the compute they pointed at the frontier
(`frontierComputeMult`), what they built (`frontierProjectBonus`, the only term
that reaches past `INTENTIONAL_PUSH_CAP`), and how little they are slowing down
for alignment.

**The other side of it is no longer a rubber band.** `sprint` scaled with the
*player's* own progress (×4.4 at 100) and `behind` added catch-up on top, so a
rival's speed was a function of the founder's: measured, every race was decided
by 0–24 points whatever the build did, and a leading founder watched four labs
accelerate for no reason anybody in the fiction could name. Both are gone. A
lab's rate is `labDrive(labCapabilityOf(...))` — its roster, the frontier nodes
it has finished off the real tree, and the money standing in for the compute it
can buy, on the same 0..100 scale the founder is measured on. `systems/labs.js`
plays a week for the Consortium, Obsidian and the Commons the way `rivalco.js`
has always played one for Aperture; Aperture's own company feeds the same curve
1:1 through `apertureCapability`, so `apertureRaceMult` is now the number the
race applies rather than a decorative 22% ceiling. Two terms carry the variance
a race needs: `RIVAL_LABS.EDGE_*` is how good each lab's programme turns out to
be, drawn once per timeline, and `RACE.DIFFUSION_MAX` is the one rubber band
left — bounded at 42%, one-directional, and printed on the race panel in the
words that make it true ("published work spreads").

Measured, 28 seeded runs per column, harness bot with directives and regions:

|                       | wins | margins        | best lab at the finish |
|-----------------------|------|----------------|------------------------|
| before (sprint+catch-up) | 22/28 | 1–36, median 18 | 64–99 |
| after, harness bot    | 21/28 | 2–44, median 18 | 47–100 |
| after, committed (push ≈0.70) | 26/28 | 2–54, median 35 | 46–100 |
| after, uncommitted (push ≈0.07) | 9/28 | 0–40, median 8 | 53–100 |

Roughly 10 of 14 for the harness bot, as before — but the *shape* changed:
a committed founder now wins 26 of 28 and an uncommitted one loses 19 of 28,
where before the spread between them was a handful of points. `c_race_lost`,
`ep_race_lost` and the `race_lost` achievement all still fire — verified end to
end against a real lab crossing, not just reachable on paper.

**Difficulty changes the opposition's shape, not its rate** (§A21). `rivalRace`
is a scalar on the whole field and it is a sharp knob now that the labs are
strong in their own right: at 1.15 a *fully* committed player lost 12 of 14 on
Ruthless, which is the original defect mirrored. Ruthless carries no `rivalRace`
at all any more. What it carries is `rivalFunding: 2.5` and `rivalPlays: 2` —
Aperture opens with a war chest and takes two decisions a week, so it hires
while it researches and the board fills up while you are still choosing a bloc.
Measured on Ruthless: committed 9/14, the harness bot 1/14, uncommitted 0/14 —
which is the band this file has always asked for. One Take keeps `rivalRace:
1.05` on top of five times the funding; the harness bot dies there around day 11
(10 of 14 runs never reach a race outcome), so that difficulty is still reasoned
by proportion from Ruthless rather than measured.

## The opposition, on every board

Five pieces that share one idea: the world should be doing something whether or
not the founder is looking at it.

- **The region board has another side** (§A10). `S.world.regionRivals` is one
  holder per bloc — Aperture through its `expand` play, the three labs through
  theirs, and in East Asia a domestic champion that was in the flavour text and
  nowhere else. Below `REGION_BOARD.EXCLUSIVE_FROM` their presence is a
  competing offer and costs you standing; from partnership up a bloc runs on one
  supplier, so `canEngage` answers `rival` and the only door is `displaceRival`
  — cash, standing, and heat, because leaning on a government is noticed. Every
  bloc's own `dislikes` scale with the share of world output you mediate, and
  each keeps a little sovereignty back in proportion to `regBase`. Measured on
  the harness bot: 5.1 blocs sovereign per run before, 3.5 after, with the
  founder still reaching all eight at market or infrastructure.
- **The nemesis has an objective** (§A14). `S.market.nemesis.season` is a goal
  from `GOALS` in `data/nemesis.js`, chosen every `NEMESIS.SEASON_DAYS`,
  telegraphed in the Wire in their founder's voice, weighted into the move draw
  at `GOAL_WEIGHT` (a weight and nothing else — every legal move stays legal),
  and closed with a written verdict either way. Intelligence agents on
  Operations reveal it outright; without them the founder has the telegraph and
  the pattern. And **the feud no longer ends because you got large**: `threat`
  is a ratio against your own scale, so `DROP_THREAT` used to retire the one
  antagonist with a face in the act he mattered most. It is silence that ends a
  rivalry now — `DROP_PATIENCE` days without a single move — and a scripted
  rival never fades while it is alive.
- **Act V has a clock** (§F2). `tickWorld` tracks an EMA of the four numbers a
  gate can drift on (`WORLD.DRIFT_EMA`) and `gateClock(S, id)` turns that into
  "closes in ~N days" on the Ascension panel — alignment falls while the company
  is pointed at the frontier and approval falls as GDP share rises, and both of
  those were always true and were never once shown next to the gate they close.
  Past `ENDINGS_FORCED.ACT5_WINDOW` days *inside* the act, shortened by the doom
  clock, one of three cards in `data/events_race.js` draws and closes a gate for
  good through `sealEnding`. Which gate is the founder's answer, so the card is
  a decision about what to lose. `sealEnding` resets the window, so a very long
  Act V loses a second door eventually and never all of them at once, and
  `triggerEnding` refuses a sealed ending rather than trusting a disabled button.
- **The world remembers, when asked** (§F8). `settings.ngWorld` and nothing
  else: `lastWorld(S)` in `keep.js` answers null without it, so every consumer
  is one `if`. The lab that crossed last timeline opens ahead (`RACE.MEMORY_*`),
  Aperture opens at the size of the company you learned to run
  (`RIVALCO.MEMORY_ROSTER_*`), and Dorne opens as cold as last run's closing
  heat (`NGPLUS.MEMORY_DORNE_*`). Three cards in `events_race.js` are the
  loved half of the cards the deck only had the betrayed versions of.
- **Speed does not thin the deck** (§A22). `EVENTS.MIN_REAL_SECONDS` is divided
  by the speed multiplier with `MIN_REAL_SECONDS_FLOOR` underneath, so the
  density per *game day* is the same at 1× and 5× — at a flat 26 seconds a
  player at 5× met about 40% of the deck a player at 1× met, and the pacing pass
  was measured headless where that gate does not run at all. The other half is
  `Transport.throttle`/`release`: a card, a ring or a thread that opens at 3× or
  5× drops the clock to 1× and hands the speed back when it is answered. Six
  one-liners in `main.js` on `event:present`, `event:dismissed`, `call:start`,
  `call:end`, `feed` and `thread:resolved`; `settings.autoThrottle` is the
  switch and every transport control clears the hold, so a speed set *during* a
  card is the speed that stays.

## The surfaces that arrived last

Everything below shipped in one pass and each one is documented in its own file
header. These are the paragraphs that only make sense from outside a single
file: what bit, or the rule that holds it in place.

- **The scarcity line is one function, and it is `expenseBreakdown`** (§A1,
  §A11, §A17). Serving cost per category, upkeep on megaprojects and regions,
  wages scaled by model tier and level, a research spend line, marketing and
  infrastructure. `marketingBudget` and `infraSpend` had been in the ledger with
  no writer for months and are dials now. Two of those lines are the whole
  reason anything is scarce after Act II, so anything new that costs money goes
  in that one function — a cost added anywhere else is invisible to the Today
  ledger, to the "why" panel and to `balance.mjs`'s ledger row at once.
- **The compute split is three shares of one number.** Research, serving and the
  frontier. The frontier share reaches the race through `frontierComputeMult`
  and is one of the terms in Frontier Commitment; the serving share is a floor
  under reliability. Anything written straight onto `computeCap` is still erased
  on the next tick — that rule did not move, the split sits on top of it.
- **The board is a body, not a modifier** (§A6, §A7). `systems/board.js` sets
  flags in the day hook and `data/events_board.js` gates five cards on those
  flags rather than on a date, so a long offline stretch cannot skip a vote. A
  motion from the board seat lands as a card with `author: 'board'`, bounded by
  `validateCard` like anything the world writes — and a motion whose card is
  refused still *applies*, because the decision is a fact about the board and
  the card is only the founder hearing about it. Four of the five cards need a
  priced round; the quarterly review belongs to every run, including a
  bootstrapped one, which is why the quarter is the door out of Act II that a
  founder who never raises uses.
- **The quarter is nine intentions and a reading-back.** `data/quarters.js` holds
  them; `S.stats.lastIntentionKeptDay` is what Act IV's deed counts, and it is
  counted from `actStartedDay`, so a promise kept in the garage cannot close the
  last act.
- **Four labs, one curve** (§A3). `systems/labs.js` plays a week for the
  Consortium, Obsidian and the Commons the way `rivalco.js` has always played
  one for Aperture, and Aperture feeds the same curve 1:1 through
  `apertureCapability`. A lab's rate is `labDrive(labCapabilityOf(...))` and
  nothing in it reads the founder's progress. If you ever find yourself wanting
  a catch-up term, that is the bug being reintroduced: the one legitimate
  coupling is `RACE.DIFFUSION_MAX`, bounded and one-directional, and it is
  printed on the panel in the words that make it true.
- **The region board has an occupant** (§A10). `S.world.regionRivals`, one
  holder per bloc. Past `REGION_BOARD.EXCLUSIVE_FROM` a bloc runs on one
  supplier and `canEngage` answers `rival`, so the only door is `displaceRival`.
  Measured on the harness bot: 5.1 blocs sovereign per run before, 3.5 after.
- **The nemesis has a season** (§A14). One goal from `data/nemesis.js`, chosen
  every `NEMESIS.SEASON_DAYS`, telegraphed in the founder's own voice, weighted
  into the move draw at `GOAL_WEIGHT` — a weight and nothing else, so every
  legal move stays legal — and closed with a written verdict either way.
- **Research closes doors** (§A12). `excludes` is checked in `isAvailable`, so
  the queue, a self-directing researcher and the world layer all obey it without
  knowing it exists. `lint.mjs` enforces the rule that keeps the pairs honest:
  an exclusion may never sit on the required chain of a node an act gate or an
  ending names.
- **Attention is the roster's real cap** (§A4). `reviewLoad` is pure, called
  from `founderOutput`, cached on `S._review` by `tickFounder` and stripped by
  `save.js` beside `_specFx`. `_review.ids` is an array and not a Set because
  `forecast` and `preview` deep-copy through JSON and a Set comes back as an
  empty object with no `has` on it. All three bots hire on `canReview` beside
  the runway check — a harness that hires on cash alone measures its own
  ignorance the moment attention becomes the scarce thing.
- **The post is a correspondence** (§G16, §G17, §G20). `repeat` on a letter
  makes a correspondent who writes for the rest of the run; `replyTo: { id,
  days }` on a chosen answer queues the reply that answer promised, through
  `queueLetter`, so a thread continues rather than ending at the button. `quiet`
  marks the post that is only post — receipts, spam, a renewal notice — and
  `tickMail` prefers an urgent letter, then a promised one, then anything not
  marked quiet. One a day still holds, in all four cases.
- **The Wire has regulars, and the founder is in it** (§G7, §G31, §G33).
  `data/handles.js` is six handles whose lines belong to *them* rather than to a
  shared pool, each appearing at most twice a fortnight. `data/nullptr.js` is
  the other half of a joke the deck had told five times and never shown: the
  founder's own `R` post now lands in the feed under their own name, and nullptr
  answers it ninety seconds later. Before this, a founder could press R four
  hundred times and never see the thing their bio claims.
- **The roster talks where you can read it** (§G24). `systems/channel.js` is a
  pure function of `S` salted by the day, read as a Record folder and as
  `tail channel` in the Terminal, built from the `S.agentsLog` ring buffer.
  Both of its readers are render paths, so it may not draw from the RNG — the
  same rule `askAria` broke. `data/activity.js` is the sibling of that on the
  roster itself: one line per lane per shift, picked from the day and the
  agent's id, because the rack repaints seven times a second.
- **The Terminal reads the Record** (§G34, §G35). `ls`, `cat` and `tail` walk
  the same generated filesystem `systems/record.js` renders, so a folder with no
  reader is dead in two surfaces rather than one — the Record's rule that every
  path needs a reader now costs double. On a second timeline `ls` finds
  `../timeline-1/` and it is readable.
- **A card may carry `chars[]`** (§E15). `char` is still who the card is *from*
  and decides the plate; `chars` renders up to three small faces beside it, and
  renders nothing at all when it is absent, which is every card written before
  `events15.js`. That file exists because measured across three seeded runs no
  two cast members were ever in the same scene — twelve people and twelve dyads
  with the founder in the middle, which is a switchboard and not a cast.
- **Jo has no phone key, on purpose** (§E28). `noPhone` is one more refusal in
  `canCall` — `nophone`, `NOT A PHONE THING` — so Jo is *in* Contacts with the
  key greyed and the reason in mono, which is the rule every blocked verb in
  this game follows. You do not ring the person you live with; you come home or
  you do not. Jo is the thirteenth face and the only one with the flag, and a
  second one would need to be a person the founder sees rather than calls, or
  the flag becomes a way of writing somebody out.
- **The last act is about the path you took** (§F1). `data/events_paths.js` is
  gated on `narrative.pathLocked` and spaced off `pathLockedDay`, so the three
  cards per path arrive as a sequence. Before it, grepping the deck for
  `pathLocked` returned nothing: the morning after the biggest decision in the
  game, the deck had not noticed.
- **Losing has a second half** (§A24). `data/events_second.js` is Act V when
  somebody else crossed — the road the `counterweight` flag opens — because
  "race anyway" and "build the counterweight" were both six hundred more days in
  a game that had stopped being about anything.
- **The opening choice reaches the deck** (§E22, and `events16.js`). Three cards
  per category, Acts I–III, gated on `catIs(S, …)` and nothing else. The first
  screen offers eight answers with different economics and the deck used to deal
  all eight the same run.
- **The campaign is a brief, not a script** (§H21). `data/campaign.js` is four
  beats an assistant is *asked* to write, handed over on the briefing beside the
  beat sheet — both answer "what does the run want next" and the payload has
  1,500 characters for everything, so they share one block. Each carries a
  `fallback` card and a deadline: miss it and the written deck plays the same
  moment its own way, which is why a campaign an assistant ignores costs
  nothing.
- **Three chrome systems that must not write to the DOM.** `ui/alarm.js` (§I12)
  lights the panel that owns a problem, `ui/actchrome.js` (§I5) puts one class
  and one token on `#app` when the act turns, and `ui/os/saver.js` (§I7) draws
  the run after `OS.SCREENSAVER_S` idle. All three are read *in the render*:
  `render()` patches and `syncAttrs` removes attributes the new HTML does not
  mention, so a class added by hand to a rendered node is gone on the next
  repaint. The screensaver is a child of `#desktop` and never `position: fixed`,
  for the reason everything else in this file is not fixed either.
- **Two ledgers, and neither is the save.** `systems/ledger.js` (§B4) keeps two
  snapshots on `S.company.today` and reads its causes from the same pure
  functions the views print; `systems/todo.js` (§I4) generates the founder's
  list every morning out of things that already exist and throws it away at
  midnight. Neither invents a number, which is the only way either of them can
  fail to disagree with the simulation.
- **`ui/why.js` is one panel, two hosts and five blocks** (§B1). Valuation and
  what it is applied to on the Market view; alignment, its drift, regulatory
  heat and public approval on the World view. `S.ui.whyShut` remembers which the
  founder folded away, keyed by the panel id (`valuation`, `standing`). A new
  explanation builds `whyBlock` rows for `whyPanel` rather than writing its own
  table, or the game grows two vocabularies for the same sentence.
- **Three slots, one player.** `SLOTS` is `[1, 2, 3]` in `save.js` and slot 1 is
  the original key, so an existing save is slot 1 and nothing migrates.
  Switching writes the run on screen first and then reloads: the page is the
  whole of the game's state and half a reload is a corrupt slot.
- **A deck travels as `#deck=`.** `Keep.encodeDeck` / `decodeDeck` in
  `systems/keep.js`, read before the game boots, and every card in an imported
  deck is dealt under `boundEffects` exactly like one the world wrote. It is the
  same JSON the Legacy screen exports, so there is one format and not two.

## Pacing, measured

The deck is 327 cards and the only way to know what a *run* feels like is to
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
