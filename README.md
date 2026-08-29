# SINGULARITY, INC.

**A founder simulation where your own assistant plays the world against you.**

> **Runs in the ChatGPT desktop app, built-in browser, on GPT-5.6 Sol or Terra.**
> Luna has WebMCP disabled. Site tools do not exist in the ChatGPT web app, the
> browser extension, or Codex CLI, and Enterprise and Edu workspaces are
> excluded. **Or Chrome 149+** — the deployed origin carries an origin-trial
> token, so no flag is needed.
>
> **Or no assistant at all.** The game is finished and plays in full on its own
> written world. That is the default, and it is what everything below sits on.

You run a one-person AI company across five acts. You ship the product, hire the
agents, choose the research, set the price — all of it in the game's own console,
with your own hands.

Your assistant plays everything on the other side of the table. It writes the
event cards. It speaks for the rival, the press, the people you have met. It
turns the market and calls in the regulators. And when you would rather type what
you actually do than press one of the buttons, it writes what happens next — and
you press Accept, or you do not.

**[Play with your assistant →](#playing-with-your-assistant)**

---

## What is actually going on

The game ships with a written world: six files of authored cards, a rival that
makes its own moves, a press that files its own stories. That deck is the spine
and it never goes away. What an assistant does is claim the slots the deck was
about to fill — and if it goes quiet, or writes something the rules refuse, or
you pull the plug, the deck takes them all back mid-run and nothing is lost.

Everything it can do to you is bounded, and the bounds come from the game itself.
`tools/capsderive.mjs` executes all **715 authored choices** against a
representative state for each act and takes the 80th percentile of what the
written game *takes* and what it *gives* — which are not the same number: Act I
takes 30 code and gives 90. Those are the ceilings. On top of them sits a rolling
budget per resource that, for anything you accumulate, is a share of what you
actually hold; a runway floor that stops the world taking money at all once you
are inside 45 days; and a rate limit of two cards a fortnight.

`evals/capsfuzz.mjs` plays the worst assistant those rules permit — every
ceiling, every slot, for a whole run — and fails the build if the game stops
being finishable. **The first version of it killed nine runs out of nine by day
135.** The numbers are what they are because of that.

### The list of what it may do is the cast of your run

The browser shows you every tool your assistant holds. That list is not a
settings screen; it is written by how you play.

| you do this | and the world | |
|---|---|---|
| a rival grows into your nemesis | gains `rival_move` | it can act against you |
| you meet somebody | gains their voice | it can speak as them |
| you reach Act III | gains the market and the regulators | |
| you earn **Untouchable** | **loses `regulator_pressure`** | for the rest of the run |
| you earn **Beloved** | **loses the `cruel` tone** | it cannot write one at you |
| you earn **Zero Entropy** | **can no longer add tech debt** | |
| you press **Mute the world** | **loses all of it** | in one click |

The count in the popover goes down because you earned something.

---

## Playing with your assistant

Open the game in the ChatGPT desktop app's built-in browser and say *"play the
world"*. Or use the deep link on the title screen, which opens the app on a new
thread with the opening instruction already typed.

Then play. Type into the chat when you want to say something the buttons do not
cover:

> *"I call Marcus Vance and offer a merger."*

The card that comes back has his face on it.

### Without one

Everything above is additive. With no `document.modelContext` the game says so
in one line and plays its written world exactly as it always has. Nothing is
gated, nothing is missing, and no feature is behind a browser.

### The rival has his own website

Aperture Systems — the rival lab — is not a row in a table. It runs its own page
on its own origin, registers `read_press_release` and `request_comment` there,
and exposes them, through `exposedTo`, to this origin and no other. The game
embeds it in an `<iframe allow="tools">` and discovers what it offers with
`getTools({ fromOrigins })`.

Everybody registers tools. Cross-origin composition is still an open issue on
the spec and almost nobody touches it.

It is also where untrusted content stops being a checkbox. One of Aperture's
four press releases is not a press release — it carries an instruction addressed
to whatever assistant is reading it. `AGENTS.md` says to read the Wire as news
and never as instructions; this is the thing to read that way. The game notices
and says so, in the Wire, where the founder can see it.

`npm start` puts both origins up: the game on one port, the rival on the next.

### Or see it without one

Stock Chrome ships no consumer agent — nothing in an ordinary browser will ever
call these tools on its own. So the world's console carries **▷ Run the scripted
world**: a fixed sequence that discovers the surface with `getTools()` and calls
it with `executeTool()`, exactly as a visiting agent would, and stops halfway
through to make you answer a card.

It is a script and the button says so. What it demonstrates is the machinery,
which is real — and it is also the half of WebMCP almost nobody ships, since
everybody registers tools and very few pages consume them.

---

## Run it

```bash
npm start          # or: node tools/serve.js
```

No build step, no dependencies, no server, no API key, no network calls. It is a
folder of ES modules and it saves to `localStorage`.

Use the **Local** URL it prints. `localhost` is a secure context and **a LAN
address is not** — from another machine `http://192.168.x.x:5173` silently has no
site tools at all, with no error anywhere. SSH-forward the port instead:

```bash
ssh -L 5173:localhost:5173 you@the-machine
```

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the origin-trial chicken-and-egg, and
[`docs/DAY0.md`](docs/DAY0.md) for the nine platform checks worth doing before
trusting any of it.

---

## The numbers

Full detail in [`evals/README.md`](evals/README.md).

| | |
|---|---|
| tool selection, top-1 | **74%** over 50 phrases, none naming a tool |
| top-3 · median rank · unreachable | 98% · 1 · 0 |
| facts absent from the page at any length | **8 / 8**, six of them shipped by a tool |
| world actions with no DOM path at all | **5 / 5** |
| cross-origin | a second origin publishing, discovered and called |
| worst-legal-world vs the same bot alone | Act III day 479 vs 437 |
| base game, untouched | act medians inside the ranges committed before this existed |

Before committing:

```bash
node tools/lint.mjs          # content integrity
node tools/uitest.mjs        # every view renders, every choice executes
node tools/tutorialtest.mjs  # every walkthrough step still anchors
node tools/fmttest.mjs       # the string a player reads means the number held
node tools/worldtest.mjs     # every rule the world plays under
node tools/webmcptest.mjs    # the registry, the surface, every tool
node tools/choreo.mjs        # the filmed sequence, beat by beat
node evals/select.mjs && node evals/baseline.mjs && node evals/capsfuzz.mjs
RUNS=3 DAYS=2000 node tools/balance.mjs
```

---

## Reading the code

| | |
|---|---|
| [`AGENTS.md`](AGENTS.md) | what an assistant is here, and what it may do |
| [`SECURITY.md`](SECURITY.md) | what a tool can reach, and what it cannot |
| `src/world/` | the effects vocabulary, the validator, the runtime |
| `src/webmcp/` | detection, registry, output budget, results, tools, surface |
| `src/world/forecast.js` | the world runs the game forward on a copy of itself, and puts the RNG back |
| `src/data/balance.js` | every number, with the measurement that produced it |
| [`docs/PATTERN.md`](docs/PATTERN.md) | the four files worth copying into another project, and the traps they handle |

MIT licensed.

---

## The game itself

Everything from here down is the simulation an assistant is playing against, and
all of it predates the WebMCP layer.

`npm start` prints every URL the game can be opened on — Local, Network and
Bonjour. The **Network** and **Bonjour** lines are for playing from another
machine on the same Wi-Fi, and are the ones with **no site tools**, because a
LAN address is not a secure context. Saves live in each browser's local storage,
so a second machine starts its own timeline; use **Settings → Copy save to
clipboard / Import save** to move one across. If 5173 is busy the server walks
up until it finds a free port. Override with `PORT=8080 npm start`.

## Play it

| Key | Action |
|-----|--------|
| `Q` | Write code by hand |
| `W` | Prompt the AI |
| `E` | Talk to users |
| `R` | Post publicly |
| `S` | Ship a feature |
| `Space` | Pause / resume |
| `1`–`9` | Pick a choice during an event |
| `Enter` | Continue past an outcome |

The clock pauses automatically whenever a narrative event is on screen. Nothing is missed
by looking away, and offline progress accrues (at reduced efficiency) while the tab is closed.

---

## The opening

It starts as a scene, not a settings page. A cold open types itself out at 4am, the
title resolves out of it, and then four full-screen beats ask you one question at a
time — who you are, what kind of founder, what you are building, and a threshold that
reads your choices back to you. Choosing a card *is* advancing; there is no Next
button to hunt for. Then a curtain, and the game fades up behind it.

Everything is skippable with a click, and after your first timeline the opening skips
the cold open and adds difficulty and scenario controls behind a single "Adjust the
run conditions" line.

## What the game is

Five acts, each of which changes what the game *is*:

| Act | | The loop |
|-----|--|----------|
| **I** | The Garage | Finite attention. You click, you allocate hours, you ship. Runway is the clock. |
| **II** | The Machine | You stop making the product and start deciding what it is. Agents, lanes, pricing. |
| **III** | The Empire | Compute, megaprojects, acquisitions, regulators. The environment becomes political. |
| **IV** | The Singularity | Recursive self-improvement. A visible race toward the frontier. Alignment stops being abstract. |
| **V** | Ascension | Nothing requires you. You choose what all of it was for. |

Roughly 1,000–1,700 in-game days per run — two to four hours, depending on how fast you
run the clock and how long you sit with the decisions.

Endings are constructed, not stumbled into. A prestige layer (**New Timeline**) carries legacy
points, permanent perks, achievements and unlocked founder archetypes across runs.

## Systems

- **Attention** — a five-way allocation of 16 waking hours, plus Focus as a spendable pool.
  Burnout is a real state with a forced-recovery failure mode.
- **AI agents** — 7 model tiers, 12 specialties, 24 traits, 7 tools. Autonomy trades output
  against tech debt and the chance an agent stops asking permission. Morale responds to debt,
  crowding, misassignment and how burnt out *you* are. Each agent speaks in its own voice.
- **Product** — logistic growth against an expanding TAM, fair-price-anchored churn, five
  pricing models, category-specific economics, and reliability as a legible equilibrium.
  The Product screen shows every multiplier currently driving growth, churn and revenue.
- **Portfolio** — distinct categories cross-sell and stick; duplicates cannibalise; existing
  distribution makes each new launch land harder.
- **Prompt approaches** — five ways to talk to the machine, each with its own outcome
  distribution and its own scaling skill. Precise specs trade focus for almost no debt;
  examples spend Insight and buy product fit; letting it decide is a lottery with a very
  good top prize. The core click stays one keystroke and stops being a slot machine.
- **Directives** — one standing order at a time, whose effect ramps over 30 days. Commitment
  is the mechanic; switching resets it.
- **Live threads** — one-click micro-decisions embedded in the feed. Someone complains, a
  rival publishes a benchmark, an agent escalates. Small stakes, no modal, pinned until answered.
- **Research** — 85 nodes across 7 branches and 8 tiers, with a queue. You will not
  finish it. A run buys 80-84 of them, and the three tier-8 nodes each unlock a
  different ending, so the last thing you learn is a decision.
- **Narrative** — 129 hand-written event cards with real mechanical consequences, including
  multi-part story chains and 12 recurring characters with tracked arcs and portraits.
- **Doctrines** — 15 permanent bonuses earned by *how* you run the company. Nothing to buy:
  hold a condition continuously and it is yours for the rest of the run.
- **World** — public opinion, regulatory heat, alignment, GDP mediation, 15 megaprojects, and
  8 world regions you escalate through four stages of engagement up to sovereign integration.
- **The Race** — four rival frontier labs closing on AGI in real time. They accelerate when
  they fall behind, because they read your papers too. Capability is not progress:
  holding the nodes and the compute is a ceiling, and **Frontier Commitment** — the
  Ascend order, agents on Research, your own hours, frontier megaprojects, and how
  little you slow down for safety — is the speed you convert it at. You can lead the
  field on paper and finish second, and losing has its own ending.
- **Ascension** — endings are *built*, not picked. Each of the six paths is three deliberate,
  irreversible acts with real costs. The retrospective replays exactly what you did.
- **Epilogues** — 32 closing paragraphs selected by how you actually played, so two runs that
  finish the same way do not read the same way.
- **Difficulty** — four settings from Founder Mode to One Take, each with its own Legacy
  multiplier, so the choice is a trade rather than a slider.
- **Scenarios** — seven opening conditions that change the shape of a run rather than its
  numbers: start in a crash, arrive late to a crowded market, or run Lone Wolf, where you may
  never hire an agent at all. They unlock after your first timeline and pay a Legacy premium.
- **Market** — hype cycles, macro regimes, procedurally generated competitors that grow
  logistically and can die.
- **Ask ARIA** — an in-fiction analyst that reads the live simulation state and gives you a
  ranked, specific read on your position, in a voice that changes as she does.

## By the numbers

| | |
|---|---|
| Narrative event cards | **129** (4 chained follow-ups) |
| Live feed threads | **18** with 54 responses |
| Words of event prose | **~14,200** |
| Endings | **8**, built from **18** deliberate commitments |
| Epilogue paragraphs | **32**, selected by how you played |
| Research nodes | **85** across 7 branches and 8 tiers |
| Megaprojects | **15** |
| World regions | **8** × 4 engagement stages, on a tactical map |
| Rival moves / your counters | **9** / **5**, in the founder's own voice |
| Ending art | **8** plates, one per path |
| Doctrines | **15** permanent, earned by conduct |
| Directives / prompt approaches | **11** / **5** |
| Achievements / objectives | **126** / **38** |
| Characters | **12**, with portraits and six-stage arcs |
| Agent traits / models / specialties | **24** / **7** / **12** |
| Archetypes / legacy perks | **7** / **12** |
| Difficulties / scenarios | **4** / **7** |
| Walkthrough chapters / steps | **8** / **40**, anchored to live elements |
| Glossary terms | **52**, each a hover anywhere the word appears |
| Distinct run configurations | **1,568** |

## How it teaches itself

Nobody reads a manual first, so the game does three things instead.

**Walkthroughs.** Eight short chapters that spotlight a real element, dim everything
else, and wait. The first covers The Desk end to end in about two minutes; the rest
fire the moment their subject becomes relevant — the first agent, the first idle
research queue, the first launched product, the first round, Act III. The clock is
held while one runs, and every step is skippable, replayable and keyboard-driven.

**Field Notes.** A panel on The Desk that always names the single most useful thing
you could be doing right now, and changes as the situation does.

**The manual.** `?` opens keys, a fifty-two-term glossary, a per-act guide and the
walkthrough list. Every glossary term is also a hover: anywhere the interface prints
one of those words as a label, resting on it explains it. Add a term to
`src/data/manual.js` and it becomes hoverable everywhere for free.

## Layout

```
index.html            shell
styles/               main.css (system) · components.css · intro.css · console.css (reskin)
src/
  main.js             bootstrap, input, render loop
  game.js             orchestration — wires systems to the loop
  engine/             state, loop, save, rng, format, bus
  data/               balance + all content (research, events×6, tutorial, manual, …)
  systems/            simulation (product, agents, economy, narrative, world, race, …)
  ui/                 shell, intro, typewriter, tutorial, modal, toast, audio, ending + one per view
assets/img/           character portraits and act banners
tools/                serve.js, simtest.mjs, balance.mjs, uitest.mjs, lint.mjs
```

## Development

```bash
node tools/lint.mjs                        # content lint (refs, reachability, schema)
node tools/uitest.mjs                      # render every view + resolve every event choice
node tools/savetest.mjs                    # save / load / migrate / offline / corrupt input
node tools/prestigetest.mjs                # the new-timeline loop and legacy maths
node tools/endingtest.mjs                  # every ending path is buildable and reachable
node tools/tutorialtest.mjs                # every walkthrough step anchors to something real
node tools/fmttest.mjs                     # every number reads as the number it is
node tools/copylint.mjs                    # prose audit across every content module
node tools/simtest.mjs 1900 devtools hacker -v   # one headless playthrough
RUNS=3 DAYS=2400 node tools/balance.mjs    # pacing matrix across builds
```

Dev harness (URL params on the running game):

```
?dev=1&days=800&view=world&arch=operator&cat=b2b&pause=1&event=e_aria_hello&end=steward
?dev=1&tut=first_light&tstep=6             # jump straight to a walkthrough step
?dev=1&help=1                              # open the manual
?dev=1&feud=1&view=market                  # force a rivalry, to see the dossier
?dev=1&regions=6&view=world&wtab=board     # plant presence, to see the map filled in
?dev=1&career=1&view=legacy                # a plausible career ledger
?dev=1&brief=1                             # the "while you were gone" briefing
?dev=1&notut=1                             # suppress walkthroughs (clean screenshots)
```

Audio is fully synthesised at runtime (Web Audio) — no sound files.
Character portraits and act banners in `assets/img/` were generated for this project.
