# Potential features

A backlog, not a plan. Written 2026-08-30 after the fix passes; each entry says
what it is, why it earns a place, what already exists to build it on, and what
is still undecided. Nothing here is started.

## Why the first two matter: how long a run is

From `src/data/balance.js`: a day is 7 real seconds at 1×, the speeds are
1×/2×/3×/5×, and a run ends between day 1,000 and 1,700 (act medians ≈ 110 /
400 / 870 / 1,200). The clock pauses on every card and a run resolves 150–190
of them.

| | clock at 1× | clock at 5× | plus cards and decisions |
|---|---|---|---|
| Act II (≈ day 110) | 13 min | 3 min | |
| Act III (≈ day 400) | 47 min | 9 min | |
| Act IV (≈ day 870) | 1 h 40 | 20 min | |
| Act V (≈ day 1,200) | 2 h 20 | 28 min | |
| a full run | 2–3.3 h | 25–40 min | + about an hour |

A first run at 1–2× is two to four hours; a returning player at 5× finishes in
about ninety minutes. An assistant playing the world makes a run longer, not
shorter. Offline catch-up saturates at 42 days per absence
(`TIME.MAX_OFFLINE_DAYS`), so closing the tab does not compress it.

The consequence for the hackathon: the half of the tool surface worth showing —
`rival_move`, `market_weather`, `regulator_pressure`, the cast's voices — is
behind Act III, which is 47 minutes of play at 1× and 9 at 5×. A judge with a
three-minute video never sees it. `tools/choreo.mjs` reaches Act III with a bot
in a second; a human cannot.

## 1. Quick tour — Act III — DONE 2026-08-30

Built as `src/systems/autoplay.js` (`fastForwardToAct`), an explained
**Quick tour — Act III** choice at the final onboarding threshold,
`LATE_START` in `balance.js` (act 3, 1,000-day cap, half legacy), and
`settings.lateStart` on the run. The duplicate title-screen shortcut was
removed: before choosing a founder and company, “Act III” is an implementation
detail rather than a useful choice. `tools/webmcptest.mjs` proves the quick tour
reaches Act III headlessly with the whole hand dealt. Items 2 and 3 landed with
it (the README's "Three minutes with a judge"; the length is on the run-length
table below rather than in the drawer — put it in the drawer if the drawer ever
opens on a first run). The notes below are kept for the record.

**What.** A late-start option at the final onboarding threshold in
`src/ui/intro.js`. The four beats run as normal; then a bot plays the first ~400
days in under a second and the run opens on a live company — a rival named, the
cast met, regulators awake — with the whole hand on the table the moment the
assistant says hello.

**Why.** The single biggest thing between this project and a judge
understanding it, and the thing needed for testing the platform (the DAY0 list
in `docs/DAY0.md`) without an hour of play first.

**Build on.** `devSimulate(days, actions)` in `src/dev.js` is a browser-side bot
that already does exactly this for `?dev=1&days=400`; it should move to something
like `src/systems/autoplay.js` so the scenario and the dev harness share one
bot (`tools/bot.mjs` is the node-side twin — see whether they can be one file).
The scenario system in `src/data/scenarios.js` (`apply(S, api)`, `legacyMult`)
is the natural home; `computeLegacyGain(S)` in `src/data/legacy.js` reads the
multiplier.

**Open.** How much legacy an assisted start earns (a fraction, or none — prestige
has to stay honest). Whether the walkthrough chapters that key on "first agent"
/ "first launch" should be marked done or allowed to fire at Act III (they
anchor to live elements, so they will fire; `Tutorial.setDisabled` is the blunt
tool). Whether the fast-forward uses the founder's chosen archetype and category
(it should — the beats still matter) and a fixed seed for the demo (probably
yes, so the filmed state is reproducible). Achievements earned during the
fast-forward: suppress the toasts, keep the state.

**Effort.** One to two hours on existing machinery.

## 2. A judge's guide

**What.** One README section: open in ChatGPT → Begin → choose Quick tour — Act
III at the threshold → say "play the world" → what to watch for in the next
three minutes: the card with a face on it, a refusal with a number in it,
Untouchable removing `regulator_pressure` from the popover, the plug.

**Build on.** `tools/choreo.mjs` is the shot list with timecodes and is already a
test; this is its prose twin. `docs/SUBMISSION.md` has the argument.

**Effort.** Thirty minutes, once #1 exists.

## 3. Say the length up front

**What.** One line in the run-conditions drawer: "a full timeline is two to four
hours; the clock runs at 1×–5×." Nobody sets that expectation today.

**Effort.** Minutes.

## 4. A share card at the ending

**What.** On the ending screen (`src/ui/ending.js`, `showEnding`), a "copy the
story of this run" button: the ending's name, the act days, the four epilogue
paragraphs that were selected (`src/data/epilogues.js` — the most quotable
thing in the game), the doctrines earned, as plain text on the clipboard.
Nothing lets a player show a run to anyone today.

**Open.** Whether it should also be a downloadable image (no — the viewer's
sandbox and the no-dependency rule both argue for text).

**Effort.** An hour.

## 5. The founder sets the world's temperature

**What.** "Play fair / play hard / be gentle" — a setting the founder chooses
that the assistant reads. Difficulty (`src/data/difficulty.js`) currently only
tunes the written world; the assistant plays at whatever temperature it likes.

**Build on.** Carry it in `briefing` and in `write_event`'s description
(`src/webmcp/tools.js`), the way the ceilings already ride in descriptions that
are re-read on every call. It is a hint, not a bound: the ceilings in
`WORLD_AUTHOR` are the bound.

**Open.** Whether this is just the existing difficulty setting surfaced to the
assistant, which would be cheaper and consistent.

**Effort.** An hour, mostly copy.

## 6. The world's hand, widened — DONE 2026-08-30

Five gaps found by asking what the world could not do that a player would ask
of it, all built the same day:

- **It can read the card.** `wait_for_world` wakes with `card_opened` when the
  written deck opens a card — body, choices, tones — and `inspect_module(story)`
  holds the whole card while it is open; `briefing` shows the buttons and
  `advance_time` returns the card it stopped for. The world's own cards are not
  announced back to their author, and an opening the founder has already
  answered is dropped from the inbox rather than delivered late.
- **A hand on the race.** The `race` key moves the leading rival lab a few
  points either way, from Act III, on `RUN_BUDGET` — ten points for the whole
  run, both directions, never over the line (`WORLD_LAB_CEILING`). Ceilings
  derived by diffing lab progress around every deck choice; `capsfuzz` spends
  it first and gates that the world does not turn the race tally.
- **`compute`.** Give-only, the way the deck grants it (`computeGranted`);
  Act V carries Act IV's grant forward.
- **A post may `ask`.** Two or three one-click replies make it a Wire thread,
  judged like a card's choices at `THREAD_CAP_MULT` of the ceilings, with the
  door rule, two open at once.
- **The reads say what could be.** `inspect_module` research lists what could
  start and its cost, agents what a hire costs, market the round on offer —
  without a draw from the RNG.

Also landed with it: an own-words answer is on the same rolling budget as a
card (it was not), every effect refusal comes from one judge, and — from the
Codex review of the change — effects are bounded again at the moment they
land (`boundEffects`), so a reply written before Zero Entropy cannot add debt
after it and two hands cannot both spend the last point of a budget;
`capsderive` is seeded and samples branching choices; a reply may not touch
compute or the race; compute has a run budget; the open card rides at the top
of `inspect_module(story)` so the packer cannot drop it.

## Not features, but before any of these

- **The ten platform checks in `docs/DAY0.md`.** Every row is blank. The
  headline feature works against a faithful fake and in Chromium with an
  injected ModelContext; whether ChatGPT throws a confirmation modal on
  `write_event`, how long its tool timeout is, and whether its built-in browser
  announces itself as `CodexBrowser` in the user agent (the title panel keys the
  "press Begin, then say play the world" variant on it) are unknown. Every
  feature added before this is added blind.
- **Seed `evals/capsfuzz.mjs`.** It gates on random seeds over nine runs and
  flickers (1.51× against a 1.50× limit once on 2026-08-29; three re-runs
  passed).

## Deliberately not doing

More systems, tools or screens. The game has 85 research nodes, 15 doctrines,
8 endings and 23 tools; the remaining risk is that the headline feature has
never run on the real platform, not that there is too little to do.
