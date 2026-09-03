# The Workstation — SINGULARITY, INC. as a desktop operating system

*A design and build specification. Written 2026-08-30 for the agent who builds it.*

> **Built, 2026-08-31.** It is at `/computer/` and `src/ui/os/`. Everything in
> §3's inventory is there, every item in §11's first and second tiers is done,
> and §12's four decisions are as recorded. Read this document as the design
> brief it is; `CLAUDE.md`'s **The workstation** section is the maintenance note
> for what actually shipped, including four things that bit during the build and
> are not predicted anywhere below:
>
> - `--ch` had never worked. Every chamfer in the *shipped game* was cut at 12px
>   regardless, because a custom property containing `var()` is substituted where
>   it is declared. The whole size hierarchy §2 leans on was fixed in `hud.css`
>   as part of this, which changes the console's appearance for the better.
> - `clip-path: none` deletes the stacking context that keeps a plate's
>   `z-index: -1` fill above its own bezel. So does `backdrop-filter` on that
>   fill. Both flooded a whole window with its accent colour.
> - Window controls must act on `click`, not `pointerdown`, or the keyboard
>   cannot reach them.
> - Headless Chromium without a GPU reports the workstation at half the console's
>   frame rate. It is a software-rasteriser artifact; with a GPU they are within
>   noise of each other, and CDP shows the workstation spending *less* time in
>   script, style and layout.
>
> A second pass, over the twenty screenshots `oslive` takes, found four more —
> every one of them invisible to a model test and to a geometry test, and
> visible the moment somebody looked at the picture:
>
> - **A clip-path clips its own children.** The dock tile wore the chamfer, so
>   its running tick, its badges, its focus ring and its attention flash were all
>   cut away — four affordances that rendered, measured and validated perfectly
>   and painted nothing. `oslive` sweeps for the shape now, and proves each run
>   that it can still see the bug it was written for.
> - **The snap ghost was a solid emerald slab.** A preview is the one plate whose
>   fill cannot be opaque, so the bezel flooded it. It is a genuinely hollow
>   `polygon(evenodd, …)` frame with a corner reticle now.
> - **The menu bar's shed ladder ran out of rungs** at 420px with a long app name
>   and a five-figure debt; it reaches under 300px now.
> - **The Wire drawer sat under the left rail** below ~490px, losing the first
>   24px of every line in the panel that is nothing but words.
>
> And one in the *shared* opening, which both housings had always had: the
> setup's `.stage` scrolls and never said so, so two of the eight category cards
> sat below the fold on a 900px laptop with nothing to suggest they existed.
> `stageCue()` is the answer, and it serves the console too.
>
> A third pass, after playing it: the Wire had to stop being a window. §4 made
> it one and it was behind four other panels within a minute — and the panel
> that says a decision is waiting is the one thing that cannot be lost. It is a
> docked rail at desktop width now, subtracted from the desktop by `deskSize()`
> rather than laid over it, and a module fills the field beside it instead of
> cascading fifteen pixels off the last one. The same pass found tooltips
> blinking three times on the way in (`pointerover` bubbles), toasts printing
> across the rail, and a third chained `drop-shadow` that cost forty-five frames
> a second. §4's window manager is otherwise as specified.
>
> One thing that looked like a fifth and was not: with a deep stack of windows,
> roughly one headless screenshot in three comes back washed milky white. Five
> captures of a *frozen, identical* DOM gave one washed and four clean, and
> disabling `backdrop-filter` — two elements on the whole screen — takes it from
> 6-in-8 to 0-in-8. It is Chromium sampling a backdrop root mid-paint, the same
> family as the frame-rate artifact above. Before believing a flood in a
> picture, take the picture again.

---

## 0. The brief

You are going to build a second shell for this game: a desktop operating system,
reachable at **`/computer/`**, in which the whole of SINGULARITY, INC. — every
module, every card, every dialog, the Wire, the world's console, the walkthrough,
the manual, the opening, the ending — runs as it does today, but on a desktop:
a menu bar, a dock, windows you can drag, notifications you can answer, a login
screen, a boot sequence and a shutdown. Think macOS's grammar, in this game's
material. If it is good it becomes the main interface; the classic console at
`/` stays, and the two share one save.

Three things to hold in your head the whole way through:

1. **Nothing is lost.** Section 3 is an inventory of everything the game puts on
   screen today and where each thing lives on the desktop. It is the contract.
   Before you call this done, walk that table with the game open and touch every
   row. A feature that exists in the classic console and cannot be reached in
   the workstation is a bug, whatever else is beautiful.

2. **It is the same game.** No system, reducer, data file, balance number, tool
   definition or test target changes meaning. The eight views stay pure string
   functions and render, unmodified, inside windows. The workstation is a
   *shell*: chrome, layout, lifecycle. If you find yourself editing
   `src/systems/` or `src/data/balance.js` to make the desktop work, stop and
   find the shell-side answer.

3. **Go above and beyond.** This document is a floor, not a ceiling. Section 11
   is a ranked list of flourishes; do all of the first tier and as many of the
   second as you can, and add your own where they serve the fiction. The bar is
   not "it works"; the bar is that somebody who has used a real desktop for
   twenty years sits down at this one and, for the first thirty seconds, forgets
   it is a game. Make windows feel heavy. Make the dock feel like it knows what
   is running. Make the menu bar the most legible instrument in the game. Make
   the login screen a place you want to log in to. Spend your effort on the
   hundred small things — focus rings, drag feel, the sound a window makes when
   it closes, what happens to a notification you ignore — because that is what
   an operating system is made of.

The non-negotiables in `CLAUDE.md` all still bind — no build step, no
dependencies, content is data, views are pure, interaction is delegated through
`data-act`, staged text through `typewriter.js`, the three rules of `hud.css`
(chamfer not radius; the frame is a layer; colour is structure and closes).
Read `CLAUDE.md` in full before you start, and read section 8 of this document
twice: it is the list of things that have already bitten this codebase and will
bite the desktop harder, because the desktop repaints more DOM than the console
ever did.

**What "done" means.** `/computer/` plays a full run — Day One to an ending to a
new timeline — with an assistant at the table and without one, at 1440×900, in
the ~760px ChatGPT pane, and at 420px; every check in section 9 is green; the
classic console is pixel-for-pixel what it was; and the CLAUDE.md gains a
"Workstation" section written by you, in the style of the sections around it,
recording what bit you.

---

## 1. The idea

The game already takes place on a computer. The cold open is *"On the screen:
an empty repository. A cursor. And in the second pane, an agent, idling, waiting
for an instruction."* The founder is one person at a laptop at 4am, and the whole
run is what happens when the only scarce input left is their own judgement.
The workstation makes that literal: what you are looking at is the founder's
machine. The eight modules are the apps they live in. The Wire is the feed they
cannot stop reading. A card from Marcus Vance is a call coming in. The assistant
playing the world is a process with a status light and a kill switch. The act
transitions are the machine noticing that the company has become something else.
Logging in *is* continuing the run.

This is not a reskin for its own sake. A desktop gives the game three things the
console cannot:

- **Parallel attention.** The Desk beside the Market. Agents beside the Wire.
  The Research tree open while the race panel ticks. The console shows one
  module at a time; the founder's job is to hold several in mind at once, and
  now the screen can too.
- **Interruptions with agency.** A Wire thread that needs an answer arrives as
  a notification you can answer *from* the notification. A card from a person
  arrives like a call. The world's presence is a menu-bar light you can read at
  a glance and pull in one click.
- **A lifecycle that matches the story.** Boot → login → setup assistant →
  desktop → shutdown → login. The opening beats, the curtain, the act cards and
  the ending already have exactly those shapes; the desktop gives them a body.

And the aesthetic already fits. `console.css` made the interface a machine;
`hud.css` made it an instrument — chamfered plates, bezels, corner brackets,
mono uppercase labels, emissive edges. A window in that language is a plate with
a title bar. A dock is a rack. A menu bar is the readout strip the topbar has
been trying to be. The palette even contains the traffic lights: red, amber and
green are the game's own accents.

**What it is not.** It is not a macOS clone, and it names nothing of Apple's.
No rounded corners, no bouncing dock, no translucency-for-its-own-sake, no
trademarks in copy. The *grammar* of a desktop — menu bar, dock, windows,
sheets, notifications, login — in the *material* of this game.

---

## 2. Design principles

These are the taste of the thing. When this document is silent, decide by them.

1. **Diegetic, never referential.** Everything on the desktop belongs to the
   fiction. The mark in the top-left is the company's mark (it already is, in
   the topbar). "About this machine" describes the founder's workstation. The
   version of the OS is the act. The wallpaper is the act's own banner. Nothing
   winks at the player about being a desktop; it simply is one.

2. **Hierarchy by cut count.** The desktop is uncut. A window is cut on two
   corners (top-left, bottom-right — the modal's silhouette, because a window
   has presence). A panel inside a window is cut on one (as today). Keys, chips
   and badges cut small. `hud.css` says twenty double-cut plates read as
   sawteeth; you will have at most eight windows on screen, and they are large,
   so two cuts each is right. Do not cut the dock tiles on two corners; they are
   forty pixels wide.

3. **Colour is structure, and each app owns one.** Every app has an accent from
   the palette. It lights the window's bezel and its two corner brackets when
   the window is focused, the ring of its dock tile, and the tick under the tile
   when the app is running. It never washes a title bar or a body. Unfocused
   windows drop to white-ink bezels; the accent is how you see which window has
   your hands on it.

4. **Quiet chrome, loud content.** Title bars are thirty-two pixels of mono
   type. The menu bar is thirty. The dock is one plate. The game's own panels
   are the content and they are already rich; the workstation's job is to hold
   them still and stay out of the way of a card.

5. **Film stays film.** The cold open, the setup beats, the curtain, the act
   card and the ending are not interface. They play over the desktop, or before
   it exists, with no chrome on them. `hud.css` already exempts them; the
   workstation does too.

6. **Reachable at 760.** The ChatGPT desktop app's built-in browser is a
   ~760px pane and it is the only place this game has a real assistant. The
   workstation has a stacked mode for that width that is, deliberately, the
   classic console's layout with a dock instead of a nav — so nothing that works
   there today stops working. ChatGPT's chat input floats over the bottom centre
   of that pane (~720×120); nothing pinned may sit under it. `tools/shot.mjs`
   checks this and must stay green.

7. **Motion is mechanical, short, and skippable.** 180–300ms, the
   `cubic-bezier(.16,1,.3,1)` curve the game already uses, blur-in rather than
   fade-in. Reduced motion collapses every animation to nothing. Any input ends
   the power-on. Windows do not bounce, wobble or spring.

8. **Every DOM node is patched, never rebuilt.** `render()` in `src/ui/dom.js`
   diffs. Windows are created once and their bodies are patched on the frame
   loop. Chrome is written with `textContent` when it changes. This is what
   keeps hover, focus, transitions and the pointer alive under a seven-times-a-
   second repaint, and it is the single rule most likely to be broken by
   accident in a window manager.

---

## 3. Nothing lost — the inventory

Every element the classic console puts on screen, and its home on the desktop.
"Kept" means the same DOM, same ids/classes, same handlers. Where the desktop
adds something, the classic behaviour is still present somewhere in the row.

### 3.1 Chrome

| Today (classic console) | On the workstation |
|---|---|
| **Topbar · brand** — chamfered mark with the company initial, company name, `Act N · name`, `dN` on narrow | **Menu bar, left**: the mark is the **mark menu** (§6.2); the company name and act are its label and the first line of *About this machine*. |
| **Topbar · stat strip** — Cash, Runway, MRR, Users, Valuation, Compute (Act III+), World GDP (Act IV+); each with a `data-tip`, tick-up flash on real growth, colour by state | **Menu bar, right**: the same `STATS` array rendered as menu extras, same tips, same flash, same colours; class names `.stat-strip`, `.stat`, `.stat-label`, `.stat-value` kept so the walkthrough anchor and the glossary hover keep working. Overflow rule in §6.2 when the bar is too narrow; the **Readouts** desktop widget (§6.8) shows all of them large with sparklines. |
| **Topbar · time block** — date, `Day N`, speed group (pause, 1×/2×/3×/5×) | **Menu bar clock**, class `.time-block` kept: `ACT III · D 412 · 14 MAR 2028`; click opens the **transport popover** (pause, speeds, "saved 3s ago", time played). Space still pauses. |
| **Topbar · Wire door** (`.tb-wire`, count, amber when threads wait) | **Menu bar WIRE extra**, same class, same `data-act="wire-toggle"`; toggles the Wire window / slide-over. |
| **Topbar · world chip** (`.tb-world`, DECK / tool count, state colour, `data-act="author-dialog"`) | **Menu bar UPLINK extra**, same class and action; opens the Uplink window (the world's console, §6.5). |
| **Topbar · `?` and `⚙`** | Help menu and mark menu items; also dock tiles; `?` and `/` keys unchanged. |
| **Nav** — eight modules in four sections with `01–08` indices, icons, badges (`!` when research idle / no agents; soft counts for rivals and legacy points), locked entries with tooltips, `RESEARCHING` progress card, `NEXT: ACT` goal card | **Dock** (§6.3): eight app tiles in the same order with the same indices, badges and lock tooltips; digits `1–9` still select the nth. The two cards become the **Now** desktop widget (§6.8) and live in the Desk's own `Next` panel as they already do. |
| **Main** — one view at a time, `.main` scrolls, smooth scroll | **Windows** (§6.4): every module is a window whose body renders `render(S)` unchanged. Several open at once. |
| **Feed rail** — `#feed-rail` with the world's console at its head, `.feed-head` (live dot, "Wire", count, close), `#feed-list` | **Wire window** (§6.5): the same element, same ids. The compact world console stays at its head. In compact and stacked modes it is the slide-over drawer it is today. |
| **Statusline** — view name, `ACT`, `Dn`, `PAUSED`; alerts (`CASH NEGATIVE`, `RUNWAY nD`, `BURNOUT`, `DEBT`, `ALIGN`, `n THREADS OPEN`) or `ALL SYSTEMS NOMINAL`; key hints; `SAVED ns` | Redistributed: view name → the focused window's title and the app-menu label; act/day → the clock; `PAUSED` → the clock turns amber with `❚❚`; alerts → **alert chips** beside the stats (same `.sl-alert` classes and thresholds); nominal → a small green dot in the clock; key hints → the **app menu** lists every action with its key; `SAVED` → the clock popover and a disc glyph that blinks on save. |
| `#screen-frame` corner brackets and scanlines, `#app::after` grade, `#bg-layer` particles/grid | Kept. The brackets now frame the monitor, which is what they always looked like. Wallpaper added underneath (§6.1). |
| Power-on choreography (`#app.booting`) | Kept and extended (§5.4). |
| Wire drawer below 1120px (`#app.wire-open`) | Kept as the compact/stacked behaviour; `#app.wire-open` remains the single source of truth for "the Wire is visible" in every mode (§8.7). |

### 3.2 Views (unchanged markup, now window bodies)

| View id | Window | Everything inside it |
|---|---|---|
| `desk` | DESK | Act hero, Next objectives, Direct Action (Q/W/E/R, focus bar, streak chip), approach strip, Build (ship, auto-ship, code sinks, launch), Standing order, Where the day goes (sliders), Resources, Founder skills, Field Notes + Ask ARIA, launched-product panel. |
| `product` | PRODUCT | Portfolio (select/new product), product head tiles, meters, "Why the numbers are what they are", shipped manifest, pricing (price keys, trade bar, model rows), trajectory sparklines, launch panel. |
| `agents` | AGENTS | Lane throughput, recruit, agent cards (traits, tools, morale, autonomy slider, lanes, history note, upgrade, tools dialog), empty state. |
| `research` | R&D | Status panel (active/idle, queue chips, cancel), branch tabs, legend, tier rows, nodes with `+` queue key. `S.ui.researchBranch` unchanged. |
| `market` | MARKET | Conditions, sieges, the Feud (scales, grudge, moves, counters, buy), competition rows, acquired list, ledger, fundraising rounds, cap table. |
| `world` | WORLD | Tabs (Standing, The Board, The Race, Megaprojects, Ascension), standing/scale meters, tactical map, region cards, race standings + Frontier Commitment, megaproject grid + queue, endings preview, Ascension paths and commitments. `S.ui.worldTab` unchanged. |
| `story` | STORY | Trajectory chart, timeline, how you decide, people. |
| `legacy` | LEGACY | New timeline, career, run stats, archetypes, doctrines, perks, achievements. |

### 3.3 Modals, dialogs and sheets

| Today | On the workstation |
|---|---|
| **Event card** (`#event-modal`, two-column dispatch, portrait plate, kind tag, choices with tones, own-words form, proposal Accept/Decline, outcome + effects, Continue) | Kept verbatim, centred, over the desktop with the backdrop. A card from a person additionally announces itself (§6.6). |
| **Generic dialogs** via `Modal.dialog` — Launch?, Change the standing order?, Release agent?, Acquire?, Choose ending?, New timeline?, Mute the world?, commitment outcome, "While you were gone", Play with your assistant, the world (author-dialog), the assistant handoff | Kept; rendered as **sheets** attached to the window they came from when there is one, centred alerts otherwise (§6.6). `author-dialog` opens the Uplink window instead when the shell can (§8.9). |
| **Dialogs** in `dialogs.js` — New product line, Recruiting (+reroll), agent tooling, term sheet, Ask ARIA | Sheets on Product / Agents / Agents / Market; Ask ARIA is its own window (§6.5). |
| **Settings** | The **Settings** window, same toggles and buttons, plus a Workstation section (§6.10). |
| **Manual** (Walkthroughs / Keys / Glossary / The run) | The **Manual** window with the four tabs as a sidebar. |
| **Act transition** overlay | Kept, full screen, over everything. Wallpaper crossfades to the new act after it (§6.1). |
| **Ending** overlay + share block | Kept, full screen. Preceded by the shutdown sequence (§5.5). |
| **Curtain** | Kept. |
| **Walkthrough** (`#tutor-root`, four panes, ring, card) | Kept; anchors resolved through the shell (§8.5). |
| **Toasts** (coalescing, `×n`, achievement/good/bad kinds) | **Notifications**, top-right, same coalescing (§6.7). Notification Center keeps the history. |
| **Floating numbers**, **shake**, **streak chip**, **tooltips** (`.tip`, glossary hover, touch behaviour) | Kept. |

### 3.4 The opening and the end

| Today | On the workstation |
|---|---|
| Cold open (five lines, typed, skippable) | **Boot text** on a black screen (§5.1). |
| Title: kicker, title word, sub, WebMCP panel (status, opening hand, earned-by-play, doors), Continue / New timeline, legacy line, foot | **Login screen** (§5.2): the same block, with Continue as the founder's account tile. |
| Four beats: who / founder / building / threshold (assistant pick, start pick, run conditions) | **Setup Assistant** (§5.3): the same beats inside a wizard plate. |
| Curtain lines → shell power-on | Curtain → **desktop boot** (§5.4). |
| Ending → prestige → title | Ending → **shutdown** → login (§5.5). |

### 3.5 Input

Every key in `src/data/manual.js` `KEYS` and every `onKey` in `main.js` works
unchanged: Q W E R S A Space 1–9 Enter Escape ? / ← →. The desktop adds `0`
(show desktop) and arrow/Enter/Escape inside menus. No modifier shortcuts, ever:
Cmd/Ctrl belong to the browser (`CLAUDE.md`, the shortcut dispatcher).

### 3.6 The world, played

| Today | On the workstation |
|---|---|
| World console (status, tool count, plug, scripted world, tally, call log with the 1,500-character meter, tools, FROM ANOTHER ORIGIN, ARIA's typed line), painted into `#world-console` and `.world-console.in-dialog` | Compact copy at the head of the Wire (kept, `#world-console`, `data-tut="author"`); full copy as the body of the **Uplink** window (`.world-console.in-dialog`, `panelBody({full:true})`). `paintAuthor` already paints both homes. |
| Own-words form on cards; proposals; the handoff dialog; `partner:injection` toast; `world:immunity` toast | Kept. |
| `show_module`, `spotlight_panel` tools | `show_module` opens and focuses the window; `spotlight_panel` anchors resolve through the shell (§8.5, §8.6). No tool is added, renamed or removed. |
| The rival's iframe (`.partner-frame`) | Kept. |
| Deep links (`codex://…&browserUrl=`) | Point at `/computer/` automatically (they use `location.pathname`). |

### 3.7 Dev harness and tools

`?dev=1&…` works on `/computer/` with the same parameters (`view=` opens the
window). `?shell=os` on `/` selects the workstation without the route, for the
harnesses. `tools/shot.mjs`, `liveworld.mjs`, `titleshot.mjs` and `oneside.mjs`
learn a `ROUTE` variable (§9).

---

## 4. Architecture

### 4.1 The route

```
computer/
  index.html        the workstation's document
styles/os.css       the workstation's stylesheet, loaded after hud.css
src/ui/os/          the shell
```

`computer/index.html` is `index.html` with three differences:

```html
<base href="/">
<html lang="en" data-shell="os">
<link rel="stylesheet" href="styles/os.css">   <!-- after hud.css -->
```

`<base href="/">` is load-bearing. The game refers to images by document-relative
string paths from JavaScript — `'assets/img/act1.jpg'` in `modal.js`, `char.img`
in `characters.js`, the ending plates — and from `/computer/` those would
resolve to `/computer/assets/…` and 404. With a base of `/` every relative URL
in the document resolves against the origin root, module imports are unaffected
(they resolve against the module's own URL), and `location.pathname` still says
`/computer/` for the deep link. The site deploys at the origin root, which is
the only place `<base href="/">` is correct; note that in `docs/DEPLOY.md`.

The same origin-trial `<meta>` goes in, and `_headers` gains `/computer/` and
`/computer/index.html` rows carrying the same token (one origin, one token).
`tools/serve.js` already serves `computer/` as a directory and `computer/index.html`
at either `/computer` or `/computer/`; do not touch it.

`src/main.js` decides the shell at boot from `document.documentElement.dataset.shell`
or `?shell=os`, before `enterGame` is ever called:

```js
if (isOs) Shell.use(await import('./ui/os/shell.js'));
```

### 4.2 The shell facade

Today `src/ui/shell.js` *is* the console shell. It becomes a facade:

- move its body to `src/ui/shell-console.js` unchanged;
- `shell.js` keeps `VIEWS` (shared data, and `tools/tutorialtest.mjs` parses view ids out of it with a regex — keep the `{ id: 'x', name:` shape) and re-exports every function as a delegate to the active implementation;
- `Shell.use(impl)` swaps the implementation; the default is the console.

Everything that imports `shell.js` — `main.js`, `dialogs.js`, `dev.js`, `uitest.mjs`, the tutorial through `registerShell`, `screenTools` through injection — keeps working without knowing which shell is up.

The interface, which both implementations satisfy:

| Function | Console (today) | Workstation |
|---|---|---|
| `buildShell()` | builds topbar/nav/main/feed/statusline, powers on | builds menubar/desktop/dock, opens the first-boot layout, powers on |
| `setView(id)` | switches the main view; ignores unknown ids and locked views | opens (if needed), unminimizes and focuses the window; accepts app ids beyond `VIEWS` (`wire`, `uplink`, `aria`, `manual`, `settings`); ignores locked |
| `getView()` | current view id | the most recently focused **module** window's id — so `triggerAction`, `KEYHINTS`, the tutorial's `{view}` advance and `paintStatus` keep their meaning when the Wire or Uplink is in front |
| `registerViews(mods)` | same | same |
| `endBoot()` | ends the power-on | same |
| `markSaved()` | statusline `SAVED` | clock popover + disc glyph |
| `registerWorldChip(fn)` | topbar `#tb-world` | menu bar UPLINK extra |
| `paintTopbar()` | patches stats/time/doors | patches the menu bar |
| `paintNav()` | rebuilds nav | patches the dock and the Now widget |
| `paintMain()` | renders the current view into `#main` | renders the focused window; other visible windows on their own cadence (§4.5) |
| `paintFeed()` | renders `#feed-list` | same element, same function body — share it |
| `paintStatus()` | rebuilds the statusline | patches alerts, clock, the nominal dot |
| `VIEWS` | data | shared |

Four additions, small on purpose, with a no-op default in the console:

| Function | Purpose |
|---|---|
| `escape()` → `bool` | closes the topmost open menu, popover or Notification Center; returns whether it did. `main.js`'s Escape handler calls it after the handoff check and before the Wire/modal checks. |
| `viewByIndex(i)` | the digit keys. Console: the nth `.nav-item[data-act="view"]`; workstation: the nth dock app. Replaces the `querySelectorAll('.nav-item…')` in `main.js`. |
| `showWorldConsole()` → `bool` | opens the Uplink window. `main.js`'s `author-dialog` action calls it first and falls back to the dialog it opens today. |
| `powerDown()` → `Promise` | the shutdown sequence (§5.5); console resolves immediately. `showEnding` in `main.js` awaits it. |

And one seam in `modal.js`: `Modal.setPlacement(fn)`. `dialog()` calls `fn()`
before painting; if it returns `{ x, y, w }` the backdrop gets those as CSS
custom properties and `os.css` renders the dialog as a sheet hanging from that
window's title bar. The console never sets it and nothing changes there.

`toast.js` gains `onToast(fn)` — a listener list called with the toast object
on every call — so the Notification Center can keep a history without `main.js`
routing anything twice.

`intro.js` exports its `inChatGPT()` as `hostedInChat()`; the dock reads it.
`save.js` gains `peek()` — the saved run's `{ founderName, companyName, day, act,
archetype, category }` read straight from `localStorage` without loading — for
the login tile.

That is the whole list of changes outside `src/ui/os/` and `styles/os.css`:
the facade, four facade methods, one placement hook, one toast listener, one
export, one peek, and the digit/Escape/author-dialog/showEnding lines in
`main.js` that call them. If you need more, write down why in the CLAUDE.md
section before you make it.

### 4.3 Files

```
src/ui/os/
  shell.js      the ShellApi implementation; owns the paint cadences and boot
  wm.js         the window manager: create/open/close/minimize/zoom/focus/drag/resize/snap/persist
  apps.js       the app registry: id, title, glyph, accent, defaults, lock rule, badge, readout, menu
  menubar.js    the menu bar: mark menu, app menus, Window, Help; extras; the overflow rule; popovers
  dock.js       the dock: tiles, badges, running ticks, positions, attention
  desktop.js    wallpaper, crossfade, the widgets layer, show-desktop
  notify.js     notification banners, inline thread replies, the Notification Center
  login.js      boot text, login screen, setup assistant chrome, shutdown
  sounds.js     the three new synthesised cues, on top of audio.js
  config.js     every geometry constant in one place — sizes, cadences, z-order, breakpoints
  model.js      the pure functions: dockModel(S), menuModel(S, app), readoutFor(S, app),
                widgetsHtml(S), layoutFor(mode, viewport, saved), alertChips(S)
```

`model.js` is pure by design so `tools/ostest.mjs` can run it headless. Every
string the workstation prints comes from a function in `model.js` or `apps.js`,
and every DOM lookup in the rest is optional-chained, the way `shell.js` already
does, because the headless harness's `document.querySelector` returns `null`.

Nothing about the workstation's geometry belongs in `src/data/balance.js`; that
file is game tuning. `config.js` is the workstation's.

### 4.4 State

```js
S.ui.os = {
  windows: {            // per app id
    desk: { open: true, min: false, x, y, w, h, z, zoomed: false },
    …
  },
  focused: 'desk',      // last focused app id (module or otherwise)
  lastModule: 'desk',   // what getView() answers
  ncOpen: false,        // Notification Center (transient; not restored)
  layoutVersion: 1,     // bump to force the first-boot layout on old saves
};
S.settings.os = {
  dock: 'auto',         // 'auto' | 'bottom' | 'left'
  wallpaper: 'act',     // 'act' | 'title' | 'none'
  widgets: true,
  banners: true,
  sounds: true,
};
```

`S.ui` is where the game already keeps view state (`researchBranch`,
`worldTab`, `focusRegion`) and it is saved, so window layout survives a reload
— reopening the machine finds the windows where you left them, which is what a
machine does. `S.settings.os` defaults are added in `newGame()`; `save.js`'s
`fill()` backfills both on old saves, so nothing needs a migration.

Window geometry is stored in **desktop-relative fractions** (`x/w` of the
desktop width, `y/h` of its height), not pixels, so a save made at 1440 opens
sensibly at 1280 and the same save at 760 goes to stacked mode without
arithmetic. Clamp on restore: no window may open with its title bar outside the
desktop.

### 4.5 The paint loop

`main.js`'s `on('frame')` cadence does not change: `paintTopbar` 90ms,
`paintMain` 130ms, `paintFeed` 500ms, `paintNav` 900ms, `paintStatus` 420ms.
The workstation's implementations decide what those mean:

| Call | Paints |
|---|---|
| `paintTopbar` | menu bar stats/alerts/clock/extras (patched by `textContent`, as the topbar is today) |
| `paintMain` | the **focused** window's body every call; every other **visible** window whose last paint is older than `config.PAINT_OTHER_MS` (480), at most one of them per call so the work is spread; nothing for minimized or closed windows. A window being focused or opened paints immediately. |
| `paintFeed` | `#feed-list` when the Wire is visible; otherwise only the counts (dock badge, WIRE extra) |
| `paintNav` | dock badges/locks/ticks, the Now widget |
| `paintStatus` | alert chips, the clock, the Readouts widget's sparklines (they change every other day, not every frame) |

`render()` short-circuits identical HTML, so an idle window costs one string
build. The Desk's string changes every tick (live numbers); an unfocused Desk
repaints twice a second, which is fine.

Action-triggered paints (`Shell.paintMain()` after a click in `main.js`) go
through the same rule: the focused window now, the others within half a second.
That half-second is acceptable and it keeps the rule to one sentence.

### 4.6 The DOM

```
#app.os
  .menubar                       role="menubar"
  .desktop                       the windows layer; position: relative; flex: 1
    .wallpaper                   two <img> for the crossfade
    .widgets                     .widget.now, .widget.readouts
    .win[data-app=desk]          one per app, created on first open, never destroyed
      .win-shadow                the drop-shadow layer (§7.3)
      .win-plate                 the chamfered bezel + fill
        .win-title               keys · index · title · readout
        .win-body                the view's render(S) target; scrolls; container-type: inline-size
        .win-grip                the resize handle on the cut corner
    .win#feed-rail[data-app=wire]   the Wire is a window too; keeps its id
      …  .win-body > #world-console + #feed-list
    .win[data-app=uplink] .win-body > .world-console.in-dialog
  .dock                          role="toolbar"; in flow, bottom or left
  .menus                         open dropdowns/popovers; empty when none
  .nc                            Notification Center slide-over
#modal-root, #toast-root, #fx-root, #screen-frame, #bg-layer   as today
```

The menu bar and dock are **in normal flow** (a flex column: menubar / desktop /
dock), not `position: fixed`. `tools/shot.mjs` treats anything with a fixed or
sticky ancestor as *pinned* and flags it if it sits under ChatGPT's chat box;
in-flow chrome is *flowing* and passes, which is why the classic nav passes
today. Windows are `position: absolute` inside `.desktop`, which is also
flowing by that test. Never add a full-screen fixed click-catcher for menus —
that is what the tool calls a page-eater; close menus with a document-level
`pointerdown` listener that checks `closest('.menus')`.

### 4.7 Layout modes

Chosen from viewport width, re-evaluated on resize, and hosted-in-chat overrides
the dock side.

| Mode | Width | Windows | Dock | Wire | Widgets |
|---|---|---|---|---|---|
| **Desktop** | ≥ 1120 | free; drag/resize/zoom/snap | bottom (or left by setting / when hosted) | a window; first boot docks it right | shown |
| **Compact** | 861–1119 | free; first boot is Desk alone, zoomed | bottom, or left when hosted | slide-over from the right, as today's drawer | hidden |
| **Stacked** | ≤ 860 | one window fills the desktop; the title bar stays for identity and the readout; no drag or resize; the dock switches apps | left rail, 56px, icons only — the classic narrow nav | slide-over, stopping above the keep-out band | hidden |

In stacked mode the front window's body carries `padding-bottom: var(--keepout-bottom)`
(132px when hosted in chat, 60px otherwise) so the last row of any view can be
scrolled above the chat box — the same reason `.main` has its bottom padding
today.

`--keepout-bottom` is set on `#app` by `shell.js` from `hostedInChat() || width ≤ 860`.
The Wire slide-over, the Notification Center and every popover respect it.

Switching modes never loses a window: geometry is remembered in fractions, and
a window closed in one mode is closed in the next.

---

## 5. The lifecycle

### 5.1 Boot text

`Intro.showTitle({ cold: true })` plays the five-line cold open with the
typewriter. On the workstation the same lines play over a black screen with the
`#screen-frame` brackets already lit — the monitor is on before the desktop is —
and a single mono line at the very top-left, `WORKSTATION · POST` (or
`<COMPANY> OS · POST` when `Save.peek()` says the saved run is past Act II —
§12, decision 4), that types itself at the same time and stops when the cold
open does. Nothing else. It is the machine coming up, and it is skippable with
a click as today.

### 5.2 Login screen

`Intro.showTitle` markup, restyled by `os.css` into a login screen. Nothing in
the markup changes except one new block, `login-tiles`, rendered by `login.js`
between the sub-lines and the WebMCP panel when a save exists:

```
┌──────────────────────────────────────────────────────────────┐
│                        SINGULARITY, INC.                       │
│        one person · one laptop · an unlimited supply of…       │
│                                                                │
│   ┌───────────────────┐   ┌───────────────────┐                │
│   │  ◈  ALEX RIVERA   │   │  +  NEW TIMELINE  │                │
│   │  Meridian · Act II │   │  begin again      │                │
│   │  day 214 · hacker  │   │                   │                │
│   │  [  LOG IN  ]      │   │                   │                │
│   └───────────────────┘   └───────────────────┘                │
│                                                                │
│   ◈ The first game built on WebMCP     ● site tools on · NATIVE │
│   the opening hand · briefing · wait_for_world · …             │
│   [ Play in ChatGPT ] [ Copy link ] [ How it works ]           │
│                                                                │
│   3 timelines · 212 legacy points · best $9.4B                 │
└──────────────────────────────────────────────────────────────┘
```

- The founder tile is `Save.peek()`: archetype glyph in the archetype's colour,
  founder name, `company · Act N`, `day N · archetype`, and the **LOG IN** key
  which is the existing `data-act="continue-game"`. The second tile is the
  existing `data-act="new-game"`. With no save, the single Begin door renders
  exactly as today (`beginLabel()` unchanged).
- The WebMCP panel, the legacy line and the foot are unchanged. The panel's
  status line reads like a network indicator on a login screen, which is
  exactly what it is.
- The wallpaper is `title_bg.jpg` at the opacity `intro.css` already uses.

### 5.3 Setup Assistant

The four beats are unchanged in markup and copy. `os.css` draws a plate around
`.beat` — two cuts, a 32px title bar reading `SETUP ASSISTANT · 02 / 04`,
the beat's own progress rail inside it — so the beats read as a wizard window
on the wallpaper rather than a page. The choice cards, the assistant pick, the
start pick and the run conditions are as they are. "Open the editor →" is the
last page's primary key.

### 5.4 Desktop boot

`start-game` / `continue-game` → `enterGame()` → `Shell.buildShell()`. The curtain
plays its lines as today. Behind it the workstation builds and, when the curtain
lifts, powers on in this order (reusing the existing keyframes):

1. wallpaper fades up (0–300ms);
2. the menu bar strikes on (`frameStrike`) and its extras `readoutIn` left to right, 55ms apart;
3. dock tiles `modReport` in order, 52ms apart;
4. the first-boot windows `glassUp`, 60ms apart, Wire last;
5. one `scanSweep` across the glass;
6. `#app.booting` clears at 1.5s or on any input (`endBoot`, as today).

`paintNav` and `paintTopbar` no-op while `booting`, as they do now; the same
`booting` flag gates `paintDock` and `paintMenubar`.

First-boot layout is decided by `layoutFor(mode, viewport, saved)`; when a save
carries `S.ui.os.windows` it is restored instead.

| Mode | First boot |
|---|---|
| Desktop | DESK at (12, 12), width = desktop − 356 − 24, full height; WIRE at the right, 332 wide, full height. That is the classic layout, which is what First Light expects to spotlight. |
| Compact | DESK zoomed; Wire closed (door in the menu bar). |
| Stacked | DESK front. |

### 5.5 Shutdown

When `on('ending')` fires, `main.js` awaits `Shell.powerDown()` before
`showEndingScreen`. On the workstation:

1. every open window closes toward the dock, most recently focused last, 90ms apart;
2. the dock slides off its edge; the menu bar's extras go dark right to left, then the bar itself;
3. the wallpaper dims to black over 400ms;
4. `SFX.act` (already played by `showEnding`) — do not double it.

Total under a second; reduced motion resolves at once. Then the ending overlay
rises over black as it does today, and "Begin a new timeline" returns to the
login screen (`Intro.showTitle`), which now has no founder tile.

**New timeline from the Legacy window** (`prestige`) does the same shutdown
before `Intro.showTitle`.

---

## 6. The desktop, piece by piece

### 6.1 Wallpaper and grade

Under everything: `#bg-layer` as today (gradients, grid mask, particle canvas),
plus `.wallpaper` — the current act's banner (`assets/img/act{n}.jpg`, 1920×640,
`object-fit: cover`, positioned `center 30%`) at **22% opacity**, under the
scene grade. On `act:advance`, after the act card closes, crossfade to the new
banner over 1.4s (two stacked `<img>`, opacity swap; reduced motion: cut).

`S.settings.os.wallpaper`: `act` (default), `title` (`title_bg.jpg`), `none`
(particles and grid only). The wallpaper is never brighter than 26%: the
photograph is mood, the windows are the picture.

Clicking the wallpaper does nothing. Double-clicking it does nothing. It is not
a button.

### 6.2 The menu bar

30px tall, in flow, `rgba(6,8,13,0.94)` over a hairline, mono 10px uppercase
labels letter-spaced 0.14em, `--ink-3` at rest. It is the most legible
instrument in the game; give it that care.

```
┌ ◈ MERIDIAN ▾  DESK ▾  WINDOW ▾  HELP ▾ ─────────────── CASH $1.2M  RUNWAY 24D  MRR $18K  USERS 3.1K  VAL $9.4M  ▮RUNWAY 24D▮ ▮2 THREADS OPEN▮  ⌬  ⊚ UPLINK 12  ⌁ WIRE 2  ACT II · D 214 · 09 AUG 2027 ▸  ▤ ┐
```

**Left side**

- **The mark menu.** The company mark (the chamfered `.brand-mark`, company
  initial) and the company name. Items: *About this machine…*, *Manual…* (?),
  *Settings…*, *Play with your assistant…* (the existing `assistant-link`
  dialog), *Open the classic console* (a link to `/`), *Recent notifications…*
  (stacked mode only, where the Notification Center has no extra).
  *About this machine* is a small alert: company, founder and archetype,
  the machine's name and build — `WORKSTATION · Act II build` through Act II,
  `<COMPANY> OS · Act III build` from the Empire on (§12, decision 4) — day,
  the seed (`S.meta.seed`, for parity), tools held (`MCP.status().count`), and
  "saved 3s ago".
- **The app menu.** The focused window's name in `--ink` and heavier weight,
  then its menus. Contents per app are in §6.5. Every item that is an action
  carries `data-act`/`data-v` so the existing delegation performs it, and its
  key hint on the right in a `.kbd` chip — this is where the statusline's
  `KEYHINTS` go, and it is better there: the whole vocabulary of the focused
  app in one place, discoverable, with the key beside it.
- **Window**: *Zoom*, *Minimize*, *Close*, ─, *Tile Desk and Wire* (the
  first-boot layout), *Show desktop* `0`, ─, one entry per open window with `●`
  on the focused one; selecting focuses.
- **Help**: *Manual* `?`, ─, *Walkthroughs ▸* (one item per chapter from
  `Tutorial.chapterStatus()`: name, "complete"/"available"/"not yet",
  selecting starts it), ─, *Keys*, *Glossary*, *The run* (the Manual's tabs).

**Right side, in order**

1. **The stat strip** — `STATS` from `shell-console.js`, moved to a shared
   `src/ui/readouts.js` so both shells and the Readouts widget read one list.
   Same classes (`.stat`, `.stat-label`, `.stat-value`), same tips, same
   `tick-up`, same colours, `when` gates for Compute and World GDP. Label above
   value at 8px/12.5px as the topbar renders them at narrow widths.
2. **Alert chips** — `alertChips(S)` returns the same list `paintStatus`
   builds today (`CASH NEGATIVE`, `RUNWAY 41D`, `BURNOUT 62`, `DEBT 240`,
   `ALIGN 0.31`, `2 THREADS OPEN`) with the same thresholds and `crit/warn/note`
   classes, rendered as `.sl-alert` chips. When there are none, a single 5px
   green dot sits before the clock: nominal, unlabelled, because a label that is
   always there is not read.
3. **⌬ ARIA** — opens the ARIA window. Glows violet for six seconds when
   `aria:says` fires, with a small speech popover showing the line (the line
   also lands in the Uplink, as today).
4. **UPLINK** — `registerWorldChip`'s HTML: the `.tb-world` button with the
   state colour and DECK/count (kept for `tools/liveworld.mjs`, which reads its
   class). Opens the Uplink window.
5. **WIRE** — `.tb-wire`, amber when threads wait, count. Toggles the Wire.
   Visible in every mode now (it was hidden above 1120px because the rail was
   always on screen; on a desktop the Wire can be closed, so the door stays).
6. **The clock** — `.time-block`: `ACT II · D 214 · 09 AUG 2027`. Amber with a
   leading `❚❚` when paused. Click → the **transport popover**: a large pause
   key, `1× 2× 3× 5×` keys (the same `data-act="speed"`), "saved 3s ago",
   "played 1h 12m", and the next act's name and hint (`nextActHint`). Space
   still pauses from anywhere.
7. **▤** — Notification Center (desktop and compact modes).

**The overflow rule.** At 1440 with seven stats and two alerts the bar is
over-full. `menubar.js` measures once per resize (a `ResizeObserver` on the
bar, never per frame) and hides stats from the right by this priority — Cash,
Runway, MRR, Users, Valuation, Compute, World GDP — into a `▾` overflow menu
that lists every stat with its value and tip. Alerts never overflow; the
`crit` ones are the reason the bar exists. Below 1000px the app menus collapse
into one `MENU ▾`. Below 700px the stat strip shows Cash, Runway and MRR only,
with the rest in the overflow, matching the console's `nth-child(n+4)` rule.

**Menu behaviour.** Click a title to open; while one is open, hovering another
title switches to it; Escape or a click elsewhere closes; `←/→` move between
menus, `↑/↓` between items, Enter activates, disabled items are skipped.
`role="menubar"`, `role="menu"`, `role="menuitem"`, `aria-expanded`. Menus are
disabled (dimmed, inert) while a modal is open — a card holds the clock and
should hold the chrome too. Dropdown plates: `--cut-br` at 8px, the
`--hud-plate` fill, 1px `--hud-line` bezel, items 26px tall, separators one
hairline, the key hint right-aligned. A menu opens in 120ms with a 4px drop and
blur-in; it closes in 90ms.

The glossary hover works in the menu bar for free because the labels use
`.stat-label`, which `TERM_SELECTOR` already matches.

### 6.3 The dock

One plate, in flow, at the bottom of `#app` (or a 56px rail on the left). 60px
tall at the bottom, tiles 40px, gaps 8px, the plate `--cut-tlbr` at 10px with
the fill and bezel of a panel and two corner brackets. Centred. It does not
magnify, bounce or wobble; a tile lifts 2px and its ring brightens on hover.

**Tiles, in order** (the dock model is `dockModel(S)`):

```
 01 ⌂ DESK   02 ◈ PRODUCT   03 ◉ AGENTS   04 ⌬ R&D   05 ↗ MARKET   06 ⊕ WORLD   07 ✎ STORY   08 ∞ LEGACY   │   ⌁ WIRE   ⊚ UPLINK   [portrait] ARIA   │   ? MANUAL   ⚙ SETTINGS
```

- A tile is a 40×40 `--cut-br` cell: the app glyph at 17px in the app's accent,
  the two-digit index at 7px in the top-left corner in `--ink-5`, the bezel a
  1px ring in the accent at 45% (100% when running or focused). Hover shows a
  label above the tile — the app's name and one line (`VIEWS[].name` and the
  view's `.view-sub` line, e.g. *AGENTS — You do not hire people. You
  instantiate them.*) — as a `.tip`.
- **Running tick**: a 3px × 14px bar under the tile in the accent when the app
  has a window open (minimized counts, at 40%). Focused: the tick is full
  length (24px). This replaces the macOS dot with the game's own segment idiom.
- **Badges**: the nav's `badge(v)` logic verbatim — `!` in the red `.nav-badge`
  for R&D idle and no agents; soft counts for rivals and legacy points; plus
  the Wire tile carries the open-thread count in amber and pulses (the
  `wcPulse` keyframe) while any thread waits; the Uplink tile carries the tool
  count and takes the `.tb-world` state colour.
- **Locked** (`v.req && !v.req(S)`, `showLocked`): the tile at 32% with `⊘` in
  place of the glyph and the `lockHint` as its tip, not clickable — the nav's
  rule. When an app unlocks (Agents on day 3 or the first prompt, World at Act
  III) the tile lights up with `hudBracketIn` and the running tick flashes
  once: the machine noticing.
- **Attention**: when a window that is not focused wants you — a card is not
  the case (cards are modal) — a thread in a closed Wire, a research queue
  that just emptied — the tile's ring pulses amber twice. No bouncing.
- Click: open/focus (`data-act="view" data-v="<id>"`, so the existing handler
  and the walkthrough's action watcher both see it); click on the focused app's
  tile minimizes it in desktop mode (macOS does not, but it is the one gesture
  everybody reaches for and it costs nothing); in stacked mode, click switches.
- Digits `1–9` select tiles in dock order through `viewByIndex`.
- The dock never covers a window: the desktop area excludes it.

**Left rail** (stacked mode, or `dock: 'left'`, or hosted in chat): 56px wide,
tiles 40px stacked from the top with the index hidden, section hairlines
between the module group, the world group and the system group — the classic
narrow nav, which is the point.

### 6.4 Windows

```
     ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
     ╱ ● ● ●     03 · AGENTS                       4 / 6 · $1.2K/DAY  ▐
     │──────────────────────────────────────────────────────────────────│
     │                                                                  │
     │   (the view's render(S), scrolling)                              │
     │                                                                  │
     │                                                                  │
     │                                                                ╱ │
     └────────────────────────────────────────────────────────── ╱╱╱ ┘
```

**Anatomy.** `.win` is a plain positioned box. Inside it, `.win-shadow` and
`.win-plate` both carry the same `--cut-tlbr` polygon at `--ch: 18px`. The
shadow layer is a static black shape with `filter: drop-shadow(0 26px 60px
rgba(0,0,0,.75))` — static, so the filter is rasterised once per move rather
than on every repaint of the body (§8.2). The plate is the bezel (the element)
over the fill (`::before`, inset 1px, `--cut-tlbr-in`, `--hud-plate` with the
faint scanline repeat the modal uses), exactly the modal's construction. Two
brackets on the square corners (`::after`, 26px × 2px) in the app's accent.

**Title bar** (32px, `.win-title`): the three keys at the left — 11px `--cut-br`
cells at 3px, in `--red`, `--amber`, `--green` at 78%, their glyphs (`✕ – ⤢`)
appearing when the pointer is over the key group; the index and title centred
(`03 · AGENTS`, mono 10.5px, 0.2em); the **readout** at the right
(`readoutFor(S, app)`, §6.5) in mono 10px `--ink-3`. A hairline under the bar.
Double-click the bar to zoom. The bar is the drag handle. `user-select: none`.

**Body** (`.win-body`): the old `.main` — `overflow: auto`, `overscroll-behavior:
contain`, `scroll-behavior: smooth`, padding `16px 18px 48px`, the same faint
top-light gradient, `container-type: inline-size` (§8.3). It is the `render()`
target. It keeps its scroll position across repaints because `render()` patches;
never write `scrollTop` on repaint (`CLAUDE.md`).

**The grip**: the bottom-right cut is the resize handle — three diagonal
hairlines etched into the chamfer, 16px, `cursor: nwse-resize`. Edges are also
resizable from an 8px invisible band; corners from 14px. The top-left cut is not
a grip.

**Behaviours** (all in `wm.js`, pointer events, `setPointerCapture`):

- **Focus**: pointer-down anywhere in a window brings it to the front and
  focuses it; the previous window dims (`§7.4`). Focus also moves the app menu.
  A window opened by `setView` is focused. The focused window's body gets
  `tabindex="-1"` focus on open so keyboard users land inside it.
- **Drag** by the title bar: translate on `transform` during the drag
  (`will-change: transform` only while dragging), commit to `left/top` on
  release. Clamp so at least 80px of the title bar stays inside the desktop.
  Dragging to the top edge previews zoom; to the left or right edge previews a
  half-tile — a 1px accent ghost outline appears where the window will land,
  and release commits. Escape during a drag cancels it.
- **Resize** from edges and the grip; per-app minimum sizes (§6.5); the body
  reflows through the container queries.
- **Zoom** (green key, double-click, Window ▸ Zoom): fill the desktop area with
  an 8px inset; zoom again restores the previous geometry.
- **Minimize** (amber key): the window scales to 12% toward its dock tile over
  240ms with blur, then hides; the tile's tick dims. Click the tile, or Window ▸
  the window's entry, to restore along the same path.
- **Close** (red key): hide. State remembers geometry; reopening restores it.
  The DOM stays (`display: none`); a closed window is not painted.
- **Cascade**: a window opened for the first time lands at `(40, 40)` plus 28px
  per already-open window, at its default size, clamped to the desktop.
- **Persist**: geometry and open/min state to `S.ui.os.windows` on release of a
  drag/resize and on open/close/min — not per frame.
- **Keyboard**: Escape does *not* close a window (accidents). The Window menu
  does. `0` toggles show-desktop (all windows slide 12px down and fade to 0
  with `pointer-events: none`; press again or click a tile to bring them back).
- **Stacked mode**: the front window fills the desktop; the keys still work
  (close returns to the previous app; minimize is close); no drag, no grip.

**Focus and modals.** When a modal opens, the window manager ignores pointer
events on the windows layer (the backdrop covers it anyway) and the menus dim.
When it closes, focus returns to the window it came from (`modal.js` already
restores `lastFocus`).

**A11y**: `.win` has `role="region"`, `aria-label="Agents"`, the focused one
`aria-current="true"`; the three keys are buttons with labels; `:focus-visible`
draws the game's green outline inside the plate.

### 6.5 Apps

`apps.js` is the registry. Each entry: `id`, `title`, `glyph`, `accent`, `index`,
`section`, `default` geometry (fractions of the desktop), `min` size, `lock`
(reuses `VIEWS[].req/lockHint/showLocked`), `badge(S)`, `readout(S)`, `menu(S)`,
`render(S)` (a module's `render`, or the shell's own for the non-module apps).

**Accents** (no two adjacent dock tiles share one):

| App | Glyph | Accent | Default (desktop mode) | Min | Title-bar readout |
|---|---|---|---|---|---|
| DESK | ⌂ | `--green` | first-boot left column; else 0.62 × 0.94 | 600×420 | `FOCUS 68/100 · d214` (focus and day; the streak chip appears here too) |
| PRODUCT | ◈ | `--cyan` | 0.60 × 0.84 | 560×400 | `3.1K USERS · $18K MRR · 4.2% CHURN` (or `DRAFT · 6 FEATURES`) |
| AGENTS | ◉ | `--violet` | 0.62 × 0.86 | 600×420 | `4 / 6 · $1.2K/DAY` |
| R&D | ⌬ | `--blue` | 0.64 × 0.88 | 620×440 | `RESEARCHING GRADIENT DESCENT · 61%` or `IDLE · 412 PTS` (amber) |
| MARKET | ↗ | `--amber` | 0.60 × 0.84 | 580×420 | `BOOM · HYPE 71% · 3 RIVALS` |
| WORLD | ⊕ | `--pink` | 0.66 × 0.90 | 640×460 | `HEAT 31 · APPROVAL 58% · 2ND OF 5` |
| STORY | ✎ | `--ink-2` | 0.58 × 0.88 | 560×440 | `84 DECISIONS · 7 PEOPLE` |
| LEGACY | ∞ | `--white` | 0.62 × 0.88 | 580×440 | `212 PTS · RUN 3` |
| WIRE | ⌁ | `--amber` | 332px wide × full, right | 280×320 | `2 OPEN · 148 ENTRIES` |
| UPLINK | ⊚ | `--violet` | 0.30 × 0.62 | 320×300 | `ON DUTY · 12 TOOLS` (the `.wc-label` state) |
| ARIA | her portrait (`char_aria.jpg`, chamfered) | `--violet` | 0.42 × 0.70 | 420×360 | the register (`warm`, `peer`, …) |

The module glyphs are `VIEWS[].icon` and do not change. The three system apps
take glyphs nothing else in the game uses — `⌁` for the Wire, `⊚` for the
Uplink — so a dock tile is never mistaken for a module's; ARIA's tile is her
face, because she is the one thing in the dock that is somebody.
| MANUAL | ? | `--green` | 0.52 × 0.78 | 480×400 | the open tab |
| SETTINGS | ⚙ | `--ink-2` | 0.34 × 0.76 | 420×420 | `SAVED 3S AGO` |

Readouts are pure string functions in `model.js`, patched by `textContent` on
the `paintTopbar` cadence. They are the one place a window says something about
its contents without you opening it; write them to be read across a room.

**App menus** (`menuModel(S, app)`). Items are `{ label, key, act, v, disabled,
checked }` or `{ sep: true }`; those with `act` are dispatched by synthesising a
click on the matching element inside the window when one exists (so the Desk
actions keep their floating numbers, sounds and `Tutorial.notifyAction`), else
by dispatching `data-act` through the same delegation `dom.js` runs.

| App | Menu items |
|---|---|
| DESK | Write code `Q` · Prompt the machine `W` · Talk to users `E` · Post publicly `R` · ─ · Ship feature `S` · Launch… · Auto-ship ✓ · ─ · Ask ARIA `A`. Items disable exactly when the buttons do (focus, cash, code). |
| PRODUCT | New product… (Act II+) · Launch… (draft) · ─ · Price −25% · −10% · +10% · +50% · ─ · one checked item per allowed pricing model. |
| AGENTS | Recruit… (`$cost`; disabled when full or broke) · ─ · Assign all to Build / Growth / Research / Operations (dispatches `lane` per agent — a small new convenience, cheap because it reuses the reducer). |
| R&D | one item per branch, checked for the open one (`branch`) · ─ · Cancel research · Clear queue (dispatches `unqueue` from the end). |
| MARKET | Raise ▸ one item per available round (`raise`) · ─ · Counter ▸ one per available counter (`counter`). |
| WORLD | Standing · The Board · The Race · Megaprojects · Ascension (`world-tab`, gated as the tabs are). |
| STORY | *(none beyond Window)* |
| LEGACY | Begin a new timeline… (`prestige`). |
| WIRE | *(none)* — the replies are the content. |
| UPLINK | Mute the world / Unmute the world · Run the scripted world / Stop the script · ─ · Play with your assistant…. |
| ARIA | Ask again (re-runs `askAria`). |
| MANUAL | the four tabs. |
| SETTINGS | Copy save · Import save · ─ · Abandon this run…. |

**Non-module apps**

- **WIRE.** The window *is* `#feed-rail`. Its body is `#world-console` (the
  compact console, `panelBody()`, collapsible behind a `▸ UPLINK` disclosure
  row that defaults open — it is the head of the Wire today and stays so) then
  `#feed-list`. `paintFeed` writes into it wherever it is; the `feed-close`
  button becomes the window's red key. In compact/stacked modes the same
  element is the slide-over (§4.7) and `#app.wire-open` opens it.
- **UPLINK.** Body: `.world-console.in-dialog` painted with `panelBody({ full: true })`
  — the plug at full width, the scripted world, the tally, the fourteen-row
  call log, the tool list, FROM ANOTHER ORIGIN, ARIA's line. This is the window
  that earns the terminal look: the body's ground is `rgba(0,0,0,.4)` with the
  scanline repeat, and the call log rows are the log lines they already are.
  `main.js`'s `mute-world` confirmation is a sheet on this window.
- **ARIA.** Body: the Ask ARIA report (`askAria(S)` → opener, findings with
  severity rails, closer) rendered by the shell from the same data
  `dialogs.showAria` uses; the `ask-aria` action opens/focuses this window and
  re-runs the read. The window title carries her portrait at 20px in the
  title bar in place of the index.
- **MANUAL.** The four tabs as a left sidebar (mono, `.man-*` classes kept);
  the body is `manualBody()`'s HTML; walkthrough rows start chapters. The
  `help` action and `?` open it.
- **SETTINGS.** `showSettings`'s body, with the Workstation section appended
  (§6.10). The `settings` action opens it.

### 6.6 Sheets, alerts, and calls

- **Event cards** are unchanged and always centred over the backdrop. They are
  the game's one full-attention surface and the desktop steps back for them:
  menus dim, the wallpaper darkens a further 20% behind the backdrop.
- **A card from a person** (`ev.char` with a portrait, and
  `CHARACTERS[ev.char].kind !== 'ai'`) announces itself for 700ms before the
  card opens: a notification banner at the top-right with the portrait,
  `INCOMING · MARCUS VANCE · Founder, Aperture Systems`, and the `event` sound
  — then the banner slides into the card as it opens. Cards with no face open
  directly, as now. So do cards from ARIA and HELIX: they are the machine's own
  voices, a call from inside the machine would be wrong, and instead the menu
  bar's ⌬ glows violet while their card is up. This is the one place the
  desktop touches a card, and it touches only its arrival. Implement it by
  delaying `Modal.showEvent` in the `event:present` handler by the banner's
  duration on the workstation only, and never when reduced motion is on.
- **Sheets**: `Modal.dialog` on the workstation hangs from the window the
  action came from — `setPlacement` returns the focused window's rect if the
  last pointer or key event originated inside a window within the last 400ms,
  else `null` (centred alert). A sheet is `min(720px, window − 24px)` wide,
  slides 10px down and blur-in from the title bar, keeps the dialog's chamfer
  and the two-key action row. In stacked mode every dialog is centred.
- **The assistant handoff**, "While you were gone", the act card and the
  ending are never sheets.

### 6.7 Notifications

`#toast-root` moves to the top-right, 8px under the menu bar, 332px wide,
stacking downward, newest on top. `toast()`'s coalescing, `×n`, kinds and
click-to-dismiss are unchanged; the `.toast` HUD plate is unchanged; the slide
comes from the right. Max four visible on desktop, two in stacked mode.
`body.tut-open` hides the lane during a walkthrough, as today.

**Threads you can answer from the banner.** On `feed` (the bus event `pushFeed`
emits) with `item.thread && !item.resolved` while the Wire is not visible, post
a banner: the item's text, the `NEEDS YOU` mark, and its `threadOptions` as
`.thread-opt` buttons carrying the same `data-act="thread" data-v data-i`. The
existing `thread` handler resolves it and repaints; the banner closes on
resolve. It stays up until answered or dismissed (no timeout), at most one at a
time; a second one waits in the queue. `S.settings.os.banners` turns this off.

**Notification Center** (`▤`, or Window menu in stacked mode): a slide-over
from the right, 360px, above the keep-out band, listing the last forty toasts
from `onToast` — icon, title, sub, in-game day — grouped by day, with *Clear*.
Not saved. Escape closes it (`Shell.escape`).

### 6.8 Widgets

On the wallpaper, under the windows, desktop mode only, `S.settings.os.widgets`:

- **NOW** (top-left, 300 wide): `NEXT: ACT III — The Empire` and its hint from
  `nextActHint`, `✓ thresholds met · n more days` when ready; the research in
  progress with its shimmer bar, or `NOTHING IS BEING RESEARCHED` in amber; the
  three active objectives as the Desk shows them. Clicking a row opens the
  window it names (`data-act="view"`). This is the nav's two cards, and it is
  visible while the Desk is not, which the nav's were. It duplicates the Desk's
  own `Next` panel on purpose (§12, decision 2): the panel is the one the
  walkthrough teaches and the one compact and stacked modes keep; the widget is
  the one you see across the wallpaper.
- **READOUTS** (top-right, 300 wide, under the toasts): every stat in `STATS`
  at 19px with a 90-day sparkline from `userHistory` / `revenueHistory` /
  `valuationHistory` / `cashHistory` (`sparkline()` from `dom.js`, whose
  gradient ids are derived from colour so identical frames stay identical).
- Widget plates are one-cut panels at 40% opacity that rise to 100% on hover;
  they are painted on the `paintNav`/`paintStatus` cadence.

### 6.9 Sounds

Three cues in `audio.js`'s kit, synthesised like the rest, gated by
`S.settings.os.sounds` and the master `sound` toggle:

| Cue | Use | Design |
|---|---|---|
| `window` | open, restore | `click` at 60% peak plus a 0.09s sine at `E5` 40ms later — a latch |
| `minimize` | minimize, close | the `click` noise burst alone, 30% peak, pitched with `glide: 0.6` |
| `notify` | a banner | two sines, `G5` then `D5`, 0.08s each, 45ms apart, 0.07 peak — quieter than `event` |

Menus and hovers are silent.

### 6.10 Settings

The Settings window keeps every existing toggle and button. Below them, a
`WORKSTATION` group:

- Dock: `Auto` / `Bottom` / `Left` (auto = bottom, left when hosted in chat or ≤ 860)
- Wallpaper: `Act banners` / `Title` / `None`
- Desktop widgets: on/off
- Notification banners: on/off
- Interface sounds: on/off
- `Open the classic console` — a link to `/`; the classic Settings gains its
  mirror, `Open the workstation` → `/computer/`. Both write the save first
  (`beforeunload` does).

---

## 7. Visual specification

### 7.1 Tokens

Everything inherits the existing tokens (`main.css` `:root`, `console.css`,
`hud.css`). New ones, in `os.css`:

```css
:root {
  --os-menubar-h: 30px;
  --os-dock-h: 60px;          /* bottom */
  --os-dock-w: 56px;          /* left rail */
  --os-title-h: 32px;
  --os-win-ch: 18px;          /* window chamfer */
  --os-tile: 40px;
  --os-gap: 12px;             /* desktop inset for zoom and first boot */
  --keepout-bottom: 0px;      /* set by the shell */
  --os-bezel: rgba(255,255,255,0.16);      /* unfocused window */
  --os-bezel-hot: var(--accent, #fff);     /* focused: the app's accent */
}
```

Fonts, ink, accents, `--hud-plate`, `--hud-line`, the `--cut-*` polygons and
`--ch` are reused, never redefined. Every token used must be defined in a
`:root` block (`CLAUDE.md`: an undefined custom property inherits, silently).

### 7.2 Measurements

| Element | Spec |
|---|---|
| Menu bar | 30px; padding 0 10px; items 26px tall with 8px horizontal padding; mono 10px 0.14em uppercase; hairline bottom `--edge`; background `rgba(6,8,13,.94)`; inset highlight `0 1px 0 rgba(255,255,255,.035)` |
| Menu dropdown | `--cut-br` 8px; min 220px; items 26px; label mono 11px, key hint `.kbd` 8.5px right; separator 1px `--etch` with 4px margins; opens 4px below the title |
| Dock (bottom) | 60px tall plate, 12px padding, tiles 40px, gap 8px, group separators 1px × 24px `--etch`; the plate `--cut-tlbr` 10px, panel fill/bezel, four brackets 12px |
| Dock (left) | 56px wide; tiles 40px; 8px gap; no indices; section hairlines |
| Window | `--cut-tlbr` 18px; bezel 1px (`--os-bezel` / accent); fill `--hud-plate` + scanline repeat; brackets 26px × 2px on the two square corners; drop-shadow `0 26px 60px rgba(0,0,0,.75)` on the shadow layer; focused adds `0 0 40px color-mix(accent 14%)` |
| Title bar | 32px; keys 11px cells, 6px apart, 12px from the left; title centred, mono 10.5px 0.2em; readout right, mono 10px `--ink-3`, 12px from the right; hairline `rgba(255,255,255,.055)` below |
| Body | padding 16px 18px 48px; scrollbar as `console.css` styles it |
| Grip | 16px on the bottom-right chamfer; three 1px diagonals at `--edge` |
| Notification | 332px; `.toast` as is; 8px gap; top = menubar + 8px; right 12px |
| Widget | 300px; one-cut panel; 40% → 100% opacity on hover; 12px from the edges |
| Sheet | `min(720px, win − 24px)`; top = window title bottom; centred on the window |
| Login tile | 260 × 150; `--cut-br` 12px; archetype glyph 22px; LOG IN as `.btn-primary` |

### 7.3 Layers

`console.css` records the stack that ships. The workstation slots in without
moving anything that exists:

```
   5   widgets (inside .desktop)
  10   windows layer (.win z-index 10 + focus order, ≤ 39)
  44   dock
  45   menu bar
  60   grade (#app::after), the Wire slide-over in compact/stacked
  70   screen frame
 250   floating numbers
 300   notifications
 310   Notification Center
 320   menus and popovers
 380   walkthrough
 420   event cards and dialogs (sheets included)
 500   act transition
 560   ending
 640   tooltips
 700   the curtain
```

Menus above notifications so a menu never opens under a banner; below the
walkthrough so a lesson always wins; below dialogs so a modal closes the menus.

### 7.4 States

| State | Appearance |
|---|---|
| Focused window | accent bezel and brackets; title `--ink`; readout `--ink-2`; shadow with the accent glow |
| Unfocused window | `--os-bezel`; brackets at 45%; title `--ink-3`; a `::after` overlay on the plate of `rgba(3,5,9,.22)`, `pointer-events: none` — dimming by overlay, never by `filter` on the window (§8.2) |
| Minimized | hidden; tile tick at 40% |
| Closed | hidden; no tick |
| Zoomed | green key shows `⤡`; grip hidden |
| Dragging | `will-change: transform`; shadow unchanged; snap ghost as a 1px accent outline |
| Locked app | tile 32%, `⊘`, tip |
| Attention | tile ring pulses amber twice (`wcPulse`) |
| Menu open | title cell lit (`--panel-hi`), `aria-expanded` |
| Paused | clock amber with `❚❚`; the transport's pause key `on` |
| Muted world | UPLINK extra and tile red, as `.tb-world.muted` |

### 7.5 Motion

| Event | Motion |
|---|---|
| Window open / restore | from the dock tile: scale .92 → 1, blur 6 → 0, opacity, 240ms `.16,1,.3,1` |
| Minimize / close | toward the tile: scale → .12, blur, opacity, 240ms |
| Focus change | bezel colour 140ms; overlay 140ms |
| Zoom | geometry 220ms |
| Snap ghost | 120ms in, instant out |
| Menu | 120ms open (4px drop, blur-in), 90ms close |
| Notification | 340ms slide from the right (`toastSlide`), 260ms out |
| Dock tile hover | lift 2px, ring to 100%, 140ms |
| Unlock | `hudBracketIn` on the tile + one tick flash |
| Wallpaper crossfade | 1.4s |
| Power-on / shutdown | §5.4 / §5.5 |

Under `html.reduced-motion` or `prefers-reduced-motion`, every one of these is
instant. `components.css` already forces animations to 0.001s globally; the
workstation's transitions must be written so that rule covers them (no JS
`setTimeout` choreography that waits for an animation that did not run — read
the `reduced-motion` class first and skip the waits).

---

## 8. Integration rules — the traps

Everything in `CLAUDE.md`'s "Gotchas" applies. These are the ones the desktop
makes worse, plus the new ones.

### 8.1 Patch, never rebuild
`render(el, html)` diffs. Window bodies are patched. Window chrome is written
imperatively and only when a value changes (compare before writing, as
`paintTopbar` does with `el.textContent !== text`). Never set `innerHTML` on a
window body outside `render()`; never recreate a window's DOM to change its
state. `syncAttrs` removes attributes the new HTML does not mention — do not
park window-manager state on rendered nodes as attributes; use JS properties or
the `.win` element, which is outside the render target.

### 8.2 Filters and shadows
`filter: drop-shadow()` on an element re-rasterises it every time its subtree
paints. A window body paints seven times a second. So the shadow lives on a
sibling layer that never changes (`.win-shadow`), and the unfocused dimming is
an overlay, not a `filter` on the plate. `box-shadow` is still forbidden on any
cut plate (it draws a rectangle behind the chamfer). `backdrop-filter` inside a
window blurs the window's own opaque fill and does nothing visible; it is
harmless but costs — `os.css` sets `.win .panel::before { backdrop-filter: none }`.

### 8.3 Views are sized by their window, not the viewport
`main.css`/`components.css` collapse `.split-main`, `.split-side`, `.split-left`,
`.grid-2/3/4`, `.grid-auto*`, `.tier-nodes`, `.alloc-row`, `.rival-row`, the
Feud's scales and the action grid at *viewport* breakpoints. Inside a 700px
window on a 1440px screen those rules never fire and the layouts squash.
`os.css` re-implements those breakpoints as **container queries** scoped to
`.os .win-body { container-type: inline-size }`, additively — the four existing
sheets are not edited, so the classic console cannot change. Thresholds are the
viewport thresholds minus the classic chrome the view never had (nav 202 +
feed 330 at desktop widths): a rule at `@media (max-width: 1180px)` becomes
`@container (max-width: 648px)`; check each against what the view looks like in
the console at that viewport width, because a few of the rules are about the
chrome, not the view, and must not be ported. `.grid-tiles` already uses a
container query on `.panel-body` and needs nothing.

### 8.4 Pseudo-elements are spoken for
`.panel` uses `::before` (fill) and `::after` (brackets); `.tech-node::after` is
its tick; `.thread-opt::before` is its `>`; `.btn::after` is its sweep. A window
plate owns its own pseudo-elements; never style the game's components' pseudo-
elements from `os.css`. The `oneside` tool will list any one-sided border you
add; title-bar hairlines and menu separators are structure and go in its
`EXPECTED` set (§9).

### 8.5 The walkthrough
`src/ui/tutorial.js` resolves every anchor through one function,
`resolveAnchor(sel)`, which asks the shell for an alias first
(`Shell.anchorAlias(sel)` — console: identity; workstation: `#nav → #dock`,
`.statusline → .menubar`). `spotlightAnchors()` keeps publishing the classic
selectors so the assistant's `spotlight_panel` enum is stable across shells.

Steps gain an optional `os` override in `src/data/tutorial.js`: `{ anchor,
title, body, view, place }`, merged over the step when the workstation is up.
Exactly these, and no others, need one:

| Step | Override |
|---|---|
| `first_light.welcome` | body: "…happens in the eight apps in the dock…" |
| `first_light.nav` | anchor `#dock`; title *Eight apps*; body: "Apps open as windows, and you can keep several open at once — the Market beside the Desk. Greyed tiles are not broken — they open when the company is big enough to need them. The digits **1–8** open them." |
| `first_light.statusline` | anchor `.menubar`; title *The menu bar*; body: "Every number the world can see, the clock, and the doors to the Wire and the world — always on top, never in the way. Warnings light up beside the numbers the moment they matter, and the app menu lists what the keys do." |
| `first_light.wire` | `view: 'wire'` (the anchor `#feed-rail` is kept) |
| `the_world.console` | `view: 'wire'` |
| `the_world.plug` | `view: 'wire'`; the compact console's plug is the first `[data-act="mute-world"]` in DOM order, which is why the Wire window precedes the Uplink window in the windows layer |

`ensureStepView` calls `setView(view)`, which on the workstation opens and
focuses the window — so a step's anchor is on screen before the ring is drawn.
`tools/tutorialtest.mjs` must scan `src/ui/os/` for anchors, validate every `os`
override the way it validates the step, and check that every overridden view is
an app id.

`Tutorial.spotlight()` already refuses an anchor whose box is under 2px; a
closed window's anchors are `display: none` and fail that test with "hidden,
not missing", which is the right answer — the assistant is told to `show_module`
first.

### 8.6 The tool surface does not change
`show_module`'s enum is `views(s)` — the eight module ids — and stays so.
`setView` doing more on the workstation is invisible to the tool. `spotlight_panel`'s
enum is `spotlightAnchors()`, aliased at resolve time. No tool is added for the
housing. The sixteen-slot ceiling this paragraph used to name was never the
platform's: what is enforced is **100 published tools and 65,536 serialised
descriptor bytes**, plus ten registration snapshots for the life of the
document — and it is that last one, not a slot count, that is why `surface.js`
publishes a stable superset in one batch instead of re-registering as the run
grows. The surface stands at 27 names. Every one goes through a platform safety
review, and `evals/select.mjs` scores the descriptions. A "window" vocabulary in tool
descriptions would also leak the shell into the assistant's world, which is a
founder simulation, not a desktop.

### 8.7 The Wire is one element
`#feed-rail` is the Wire in both shells, `paintFeed` writes into `#feed-list`,
and `#app.wire-open` says whether it is visible. On the workstation the window
manager reads and writes that class: the red key removes it, the WIRE extra and
tile toggle it, and in desktop mode `open ⇔ wire-open`. `tools/shot.mjs` toggles
that class to test the drawer, and the test stays valid.

### 8.8 Keep-out
Nothing pinned under ChatGPT's chat box. The dock is in flow. The Wire slide-over,
the Notification Center, menus and popovers clamp above `--keepout-bottom`.
Windows are absolute inside a flowing desktop. `shot.mjs` at 760 and 420 is the
judge.

### 8.9 `main.js` touches, exactly
- the shell selection at boot;
- `viewByIndex(i)` in the digit handler;
- `Shell.escape()` in the Escape handler, after `AssistantHandoff.isOpen()`;
- `Shell.showWorldConsole() || Modal.dialog(…)` in `author-dialog`;
- `await Shell.powerDown()` in `showEnding` and the `prestige` action;
- the workstation-only 700ms call banner in `event:present` (behind a shell flag).
Nothing else. Every other action already dispatches through `data-act` and
already calls `Shell.paintMain()`; the facade routes it.

### 8.10 Headless
`tools/uitest.mjs` stubs `document.getElementById` to return a fresh element
and `querySelector` to return `null`. The workstation's shell must load and
`buildShell()` under those stubs without throwing (guard every lookup), because
`uitest` imports `main.js` and `ostest` builds the shell. Keep the DOM-touching
code thin and the models pure.

### 8.11 Saves
`S.ui.os` is saved on purpose; `save.js`'s `TRANSIENT` list needs no addition.
A save from the classic console has no `S.ui.os` and boots the first-boot
layout. A save from the workstation opens in the classic console with `S.ui.os`
ignored. Both directions must work; `tools/savetest.mjs` round-trips a state
with `S.ui.os` populated.

### 8.12 `pagehide` and the rival frame
Unchanged and untouched. The `.partner-frame` iframe stays 1×1 and fixed; it is
not a page-eater (pointer-events none, opacity 0) and `shot.mjs` ignores it.

---

## 9. Verification

Every existing check stays green — the pre-commit list in `CLAUDE.md`,
`npm run evals`, `tools/parity.mjs` (the simulation is untouched, so parity
prints identical numbers), and the balance targets are unaffected because no
system changed. Additions:

**`tools/ostest.mjs`** (headless, `tools/headless.mjs` stubs, no browser):
- `apps.js`: every app has an id, glyph, accent, defaults inside `(0,1]`, a
  min size, and a `readout(S)` and `menu(S)` that return strings/arrays without
  throwing at the five `uitest` snapshots (fresh, I→II, III, IV, V);
- `layoutFor` at 1440×900, 1024×768, 760×1000, 420×900: mode is right, no
  window's title bar leaves the desktop, first-boot geometry matches §5.4;
- `menuModel` for each app lists every `data-act` the app's view renders (walk
  the view HTML for `data-act="…"` and assert each action the table in §6.5
  promises is present with the right key hint);
- `dockModel` order equals `VIEWS` order plus the three groups; locked apps
  match `VIEWS[].req`;
- `alertChips` equals what `paintStatus` in the console builds for the same state;
- `widgetsHtml` renders at every snapshot with no `undefined/NaN/[object Object]`
  (reuse `uitest`'s `BAD` list);
- the shell facade delegates every function and `Shell.use()` swaps cleanly;
- `Save.peek()` reads a saved run and returns null when there is none;
- with `data-shell="os"`, `main.js` loads and `buildShell()` runs under the stubs.

**`tools/uitest.mjs`**: add `shell:os` renders at every snapshot alongside
`shell:topbar/nav/feed`.

**`tools/tutorialtest.mjs`**: scan `src/ui/os/`; validate `os` overrides; the
alias table resolves every classic chrome anchor.

**`tools/shot.mjs`**, **`liveworld.mjs`**, **`titleshot.mjs`**, **`oneside.mjs`**:
a `ROUTE` env (default `/`, set `/computer/`) prefixing every `goto`. `shot.mjs`
gains workstation checks at all three widths: every dock tile on screen; the
menu bar's WIRE and UPLINK extras on screen; a window's three keys clickable;
`0` shows the desktop and restores; the Wire opens (by class) and its
`.thread-opt`s are on screen; nothing pinned under the chat box; no page-eater.
`oneside.mjs`'s `EXPECTED` adds `menubar`, `win-title`, `dock`, `nc-head`,
`widget-head`, `menu-sep`. `liveworld.mjs` on `/computer/` must pass unchanged
apart from the route, because it reads `.tb-world`, `#world-console .wc-label`,
`[data-act="mute-world"]`, `.wc-call`, `.wc-partner`, `.proposal-form`, the
own-words form — all of which the workstation keeps.

**By hand, before calling it done** — at 1440×900, in a 760×1000 window, and at
420×900; with `?dev=1&days=800&view=world` and from a real Day One:

1. Log in from the tile; the desktop boots; First Light runs end to end and
   every step's ring lands on something.
2. Open all eight apps; drag, resize, zoom, minimize, restore, close each;
   reload — they come back where they were.
3. Answer a card; answer a thread from a banner with the Wire closed; answer
   one from the Wire.
4. Recruit, fire, upgrade, tool an agent from sheets on the Agents window.
5. Raise a round from the Market menu; start research from the R&D menu;
   switch a World tab from the menu.
6. Mute the world from the Uplink window; unmute; run the scripted world and
   answer its card.
7. Reach an act transition: the card, then the wallpaper crossfade.
8. Reach an ending: the shutdown, the retrospective, "Begin a new timeline",
   the login screen with no tile.
9. Turn on reduced motion and high contrast; do 1–8 again, faster.
10. Open the same save in `/` and in `/computer/`; play in each; nothing is lost
    in either direction.

---

## 10. Order of work

Build it so that every phase leaves the game playable at `/computer/`.

1. **The seam.** Facade `shell.js`, `shell-console.js`, the four facade
   methods with console no-ops, `setPlacement`, `onToast`, `hostedInChat`,
   `peek`, the `main.js` lines. Run the whole test list. The classic console
   must be byte-for-byte the same experience — this phase changes nothing
   visible.
2. **The route and the skeleton.** `computer/index.html`, `os.css` with the
   tokens and the flex column, `shell.js` that builds menubar/desktop/dock and
   opens the Desk zoomed. Stacked mode first: it is the classic layout and it
   proves the views render in a window body. `shot.mjs` with `ROUTE`.
3. **Windows.** `wm.js` in full — focus, drag, resize, zoom, minimize, close,
   cascade, snap, persist, modes. The Wire as a window and as the slide-over.
   Container queries. The `ostest` layout checks.
4. **Chrome.** The menu bar with the overflow rule, menus, popovers, the
   transport; the dock with badges, locks, ticks, attention; alerts; the clock.
   `tutorialtest` with aliases and overrides; First Light passes on the desktop.
5. **Apps.** Uplink, ARIA, Manual, Settings as windows; sheets; the app menus;
   readouts.
6. **Lifecycle.** Boot text, login tiles, setup assistant plate, power-on,
   shutdown, wallpaper and crossfade.
7. **Notifications and widgets.** Banners, thread replies from banners,
   Notification Center, Now, Readouts, sounds.
8. **The flourishes** in §11, then the CLAUDE.md section, README's layout
   table and "Run it", `docs/DEPLOY.md`'s note on `<base>`, and `_headers`.

Commit at the end of each phase with the test list green.

---

## 11. Above and beyond

**First tier — do all of these.**

1. The call banner before a card from a person, and the ⌬ glow for ARIA's and HELIX's (§6.6).
2. Thread replies from the notification (§6.7).
3. The shutdown sequence before an ending (§5.5).
4. Wallpaper crossfade on act change (§6.1).
5. App menus listing every action with its key (§6.5) — the most useful thing
   the desktop adds for a new player.
6. Snap-to-edge with the ghost outline (§6.4).
7. Title-bar readouts (§6.5).
8. The login tile from `peek()` (§5.2).
9. Minimize toward the dock tile; restore along the same path (§6.4).
10. The unlock flash when an app becomes available (§6.3).
11. The ARIA menu-bar glow and speech popover on `aria:says` (§6.2).
12. The resize grip on the chamfer (§6.4).

**Second tier — do as many as you can.**

13. Notification Center with day grouping (§6.7).
14. The Readouts widget with sparklines (§6.8).
15. "Assign all to a lane" and "Clear queue" convenience items (§6.5).
16. `WORKSTATION · POST` typing beside the cold open, and its `<COMPANY> OS` form on a late-act save (§5.1).
17. *About this machine* with the seed, the tools held, and the name that changes at Act III (§6.2, §12).
18. The transport popover showing the next act's hint (§6.2).
19. Setup Assistant plate with its own title bar (§5.3).
20. A `Tile Desk and Wire` layout reset in the Window menu, and a second preset,
    `Ops floor` — Desk, Agents, Market and Wire in a 2×2 — for the late game.

**Yours.** Add what the fiction asks for, and write it down in CLAUDE.md. Some
places to look: what the machine does at 4am on Day One when nothing is running
yet (the desktop should feel empty in Act I and crowded by Act IV — perhaps the
Now widget is the only thing on the wallpaper on day one); what HELIX's arrival
does to the wallpaper; whether the Uplink window's log should scroll like a
terminal when the assistant is on duty; whether the ending's `Copy run summary`
belongs in the Story window's menu for a run still in progress.

**Do not.** No new WebMCP tools. No changes to `src/systems/`, `src/data/`
(except the tutorial `os` overrides, `newGame()` defaults and `manual.js`
glossary entries for new terms), or `balance.js`. No dependencies. No build. No
rounded corners; no `box-shadow` on a cut plate; no `filter` on a repainting
element. No Apple names, glyphs or sounds. No bouncing dock. No modifier
shortcuts. No second copy of the Wire. No `scrollTop` writes on repaint. No
full-screen fixed click-catcher.

---

## 12. Decisions taken here, and what is open

**Decided.**

- **The route is a folder with `<base href="/">`**, not a server rewrite:
  static hosts serve it without configuration and the dev server needs no
  change. The cost is that the site must live at an origin root, which it does.
- **The assistant's console is called UPLINK** on the desktop. The module
  `world` (⊕ WORLD, the Act III board) and "the world" (the assistant playing
  against you) share a word today and it did not matter when one was a nav entry
  and the other a panel. As two windows with two dock tiles it would. All
  in-panel copy, tool descriptions, glossary entries and the tutorial keep
  saying "the world"; only the window title and tile say UPLINK, with
  "the world's console" as its subtitle.
- **The dock goes left when hosted in chat or under 861px**, because ChatGPT's
  chat box floats exactly where a bottom dock would be.
- **Widgets are desktop-mode only** and default on; in compact and stacked
  modes the same information is in the Desk's `Next` panel and the transport
  popover, which is where the nav's cards were reachable before at those widths
  (the nav hid them under 860).
- **Windows persist geometry in the save**, as fractions.
- **No new tools**, and `show_module`'s enum stays the eight modules.
- **Cards are untouched** except for the arrival banner of a card from a person.
- **Sheets attach to the window an action came from** and are centred otherwise.
- **Stats overflow from the right by priority**; alerts never overflow.
- **The classic console stays** and gets one link to the workstation.

**Resolved since the first draft** (2026-08-30, with the owner):

1. **The workstation becomes `/` after testing; the console moves to
   `/console/`.** Decided in principle; *when* is the owner's call and is not
   part of this build. Build for it: `index.html` and `computer/index.html`
   must differ only in `data-shell`, the `<base>` tag and the `os.css` link, so
   the swap is those three lines in each file plus a `console/` folder made by
   the same recipe. Nothing else — no path, test, tool or doc — may assume which
   shell is at the root. `tools/shot.mjs` and friends take `ROUTE` for exactly
   this reason.
2. **The Now widget and the Desk's `Next` panel both stay.** They show the same
   thing on purpose. The panel is what First Light teaches and what a player
   sees in compact and stacked modes; the widget is what you see on the
   wallpaper when the Desk is not in front. Duplication is cheap here and
   removing the panel would cost a walkthrough step its anchor.
3. **The call banner is for people, not for the machine's own voices.** A card
   from a character whose `kind` in `characters.js` is `'ai'` — ARIA, HELIX —
   opens directly; instead, the menu bar's ⌬ glows for the card's duration,
   because they are already in the machine and a call from inside it would be
   wrong. Everyone else with a portrait — Vance, Priya, Crane, Yuki, Dorne,
   Sam, Kai, Mom and nullptr (`INCOMING · nullptr · Anonymous`, which is the
   joke) — arrives as a call.
4. **The machine is `WORKSTATION` through Act II and takes the company's name
   from Act III.** *About this machine* reads `WORKSTATION · Act II build`
   until the Empire, then `<COMPANY> OS · Act III build` and so on: by the time
   governments return your calls the laptop runs your own stack. The boot line
   beside the cold open follows the same rule from `Save.peek()` — `WORKSTATION
   · POST` on a fresh machine, `MERIDIAN OS · POST` when the saved run is past
   Act II. The act transition already crossfades the wallpaper; the name
   ticking over in *About* is the quiet half of the same moment, and nothing
   announces it.
