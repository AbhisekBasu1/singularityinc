# What it needs

What SINGULARITY, INC. needs to be the best game of its kind, deadline ignored.
Written 2026-09-03 after a full read of the game — every event file, every
system, every view in both housings, the world layer, the rival, the phone, the
post, the endings — with a bot run or a script behind every number below.
`newideas.md` was the last document like this; this one starts from what its
nine features left standing.

**Read this first.** The sentence-level writing is the best in the genre and the
architecture is disciplined. What is missing is not width. The simulation stops
asking anything of the player after about day 400; the deck is two hundred
scenes with six threads under them; the surfaces that promise a life — the
phone, the post, the Wire, ARIA's window, the roster — repeat or fall silent in
the back half; and the endings are a menu with a confirmation dialog. Everything
below serves four sentences: *make something scarce again; collect what the
cards plant; let the cast remember and reach each other; make the ending read
the run.*

---

## The diagnosis, in six findings

1. **Nothing is scarce after Act II.** Cash is ~$2T by the end of Act III and
   $13T at the end; research completes 83–85 of 85 nodes in every build; a bot
   that never presses Q/W/E/R after day 0 beats one that does, in every act;
   pricing at fair value or at a sixth of it produces the same run; megaprojects
   are optional. Every act after the first is a timer — in a measured consumer
   run the Act IV threshold was met on day 524 and the act turned on day 875.
   Between 60% and 75% of Acts II–IV are spent with the next gate already open.
   The relationship systems built this week sit on a wait.
2. **The deck is scenes, not threads.** 206 cards, 613 choices, and about six
   actual threads. Of 173 flags a choice can set, **134 are never read by
   anything**. `fx.chain` — the primitive whose comment says arcs are built with
   it — is called seven times. No two cast members ever share a scene. The
   archetype, category and scenario chosen in the opening change **zero words**
   of prose. The best payoffs sit behind the narrowest gates (Crane's kept
   email needs two rounds and under 70% equity), and the most loved threads
   contradict themselves across acts (Mom, Kai, nullptr, Vance, Weaver, Yuki,
   Dorne, Priya, ARIA — the table at the end of §E).
3. **The talk surfaces promise a life and then repeat or go quiet.** Every phone
   call is two rounds deep; `n`, the repeat counter every topic receives, is
   used by nothing; a player who calls Mom every Sunday exhausts her by week
   four. The inbox delivers 37 letters by day 62 of Act III and has eight left
   for the remaining ~750 days. The Wire's crisis pool is five lines and fired
   one of them 21 times in a single act. ARIA's window prints the same five
   findings on day 1 and day 1,500 and never mentions anything that happened
   between you. The roster are numbers with Greek names. nullptr's "first
   comment within ninety seconds" is in the bio and has never once appeared in
   the Wire, because the founder's own posts never do. Calls fall to zero in
   Acts IV–V in every run.
4. **Endings are a menu, losing is undesigned, run two is run one.** Five of the
   six built endings play identically until the final screen; Act V has no
   clock, so a run that lingers holds 84/85 nodes and every gate open, and the
   path lock fires when the player already knows all six doors are unlocked.
   The only loss is Act I cash; race loss is a card that pays research. The
   acquisition endings promise a Legacy payout that is never paid. Four of
   seven archetype perks describe mechanics that do not exist. Run two differs
   from run one by perks, a visible drawer and one to three dossier cards.
5. **The world cannot see or remember, and the rival is a demonstration — with
   a bug.** The assistant's reads are trimmed to 6 of 48 activity entries and 4
   of 10 relationships; it has no notebook, no way to plant a callback, no view
   of which cast members the deck has retired, and it may write cards after the
   ending. Aperture is spawned with `personality: 'shark'` — a string where
   `spawnCompetitor` expects an object — so its growth is `NaN` and every
   personality-gated move (undercut, poach, mirror, FUD, open-source) is
   unreachable: the rival that "plays the same game" cannot play against you.
   The human chair has no week gate; thirty `raise` clicks in one tick
   succeed.
6. **Time and triage fight the player.** No keyboard for speed; no "run to the
   next decision"; threads and letters expire silently on a 45-day fuse while
   the clock runs at 5×; the act card force-unpauses; the slow killers
   (alignment, heat, debt, approval) have no history anywhere; the first
   fifteen minutes carry three minutes of decisionless screens and a sixteen-
   step walkthrough that ends before the first shipped feature.

---

## The ten moves, in order of how much each changes the game

1. **Scarcity after Act II.** Upkeep on projects and regions, compute cost
   nearer linear, wages that scale with model tier and level, a research spend
   line. Target: end-of-Act-III cash within about two years of burn. Until
   this lands, no price, project, region, round or doctrine is a decision, and
   Sam's list and the Sunday call are texture. (§A1)
2. **Acts close on deeds, not timers.** Shrink the floors and give each act an
   authored closing act — a launch, a Series A, a hearing, a training run, a
   treaty — surfaced as the last objective. (§A2)
3. **A race against companies, and a rival with teeth.** Fix the spawn, give
   the other labs Aperture's company shape, drive their rate from their own
   capability instead of a rubber band on yours, put them on the region board,
   give the nemesis an objective it pursues for a season. (§A3, §A10, §A14,
   §H10)
4. **Founder attention as span of control.** Each agent draws review focus,
   scaled by autonomy and tier; unreviewed agents drift. The copy says you are
   the bottleneck for a continent; the sim says you are decorative. (§A4)
5. **Collect what is planted; give the cast each other.** Read the flags the
   cards already set, fix the contradictions, write the warm-path arcs that
   starve, put two people in one room once per act, and let category,
   archetype and scenario change the words. (§E)
6. **Endings as roads; losing designed.** A path-aware last act, an Act V
   clock, six new endings including two the world forces on you, epilogues
   that name the decisions this run made, a bankruptcy that knows which act it
   happened in. (§F)
7. **ARIA remembers; nullptr appears; the roster speaks.** A "between us" line
   in her window that reads the flags, `what_we_are_like.md` as a real file,
   the founder's posts in the Wire with nullptr's reply ninety seconds later,
   an agents' channel and real memories. (§G1, §G2, §G5)
8. **The phone talks back; the inbox lives; the Wire has people in it.** Use
   `n`, go three deep, let them ask you, one line of cross-knowledge per tree,
   ten rings for the late acts; recurring letters and mail from your own
   machines; recurring handles with opinions and posts that react to cards.
   (§G3, §G4, §G6)
9. **A world that sees, remembers and plans — and a second chair that means
   it.** Paged reads, a notebook, `inspect_person`, scheduled cards, a
   narrated epilogue; a stateful press office, hidden intent, counter-offers,
   board mode, spectators, and a resident local world so the feature exists
   in stock Chrome. (§H)
10. **Time, triage and the first fifteen minutes.** Speed keys, next-decision,
    auto-pause, thread expiry and snooze, history for everything, "why" panels
    for valuation and alignment, a ten-step First Light with three things to
    do. (§B, §C, §D)

---

## Tier 0 — bugs, and words that lie

Two or three days. Do these before anything else: several of them change what
the measurements in this document mean, and all of them are the game saying
something that is not true.

1. **Aperture's spawn.** `spawnAperture` passes `personality: 'shark'`;
   `spawnCompetitor` reads `pers.id` and `pers.growth` off it →
   `personality: undefined`, `growth: NaN`, `mrr: 0`, users pinned at the
   roster floor, and `movePool`'s `only.includes(c.personality)` excludes every
   personality-gated move. Pass the object (`src/systems/rivalco.js:50`,
   `src/systems/market.js:57`). Then re-measure the race and `capsfuzz`,
   because Aperture will undercut and poach for the first time, and the note
   in `newideas.md` that "the race did not move" was measured against a rival
   with no market teeth.
2. **The chair.** `humanPlay` never checks `lastWeek`; `raise` has no cap;
   `handleRivalMessage` and the relay accept unlimited `play` and `say`. A week
   gate, a funding ceiling, a token bucket per sender
   (`rivalco.js:194`, `partners.js:196`, `tools/relay.js`).
3. **Writes after the ending.** `write_event` and `post_as_*` succeed once
   `S.ending` is set; a card can open on top of the credits. One check in
   `enter()` or a shared rule in `validate.js` (`src/webmcp/tools.js:59`).
4. **Fractional heat is a no-op.** `fx.heat` is 0–100; seven effects pass
   opinion-scale values and their subs say "+Heat": `events10.js:219,241`,
   `events13.js:61,65,68,208,211`. Dorne's "volunteer the exposure" is
   therefore free.
5. **Weaver exists twice.** `hired_weaver` (`events2.js:236`, $220K + 2%) and
   `weaver_hired` (`events11.js:68`, $140K); `e3_successor`, `e2_priya_turns`,
   the calendar and the post read only the first. One flag, one salary, each
   hire card gated on the other.
6. **The continuity table** (end of §E): Kai's "you did not offer" after Kai
   was hired; nullptr treated as unsolved for two acts after ARIA confesses,
   and `nullptr_solved` firing on the wrong choice; Vance retired nine years
   and stepping back from 1,800 people in the same act, with headcounts of 12,
   1,100, 34 and 1,800; Mom walking the datacentre floor and then never having
   seen it; Yuki introducing herself to her employer; Dorne retiring and then
   losing a primary; Priya handing off her beat and then filing 22,000 words;
   ARIA saying "I have asked zero questions" after "A Question In The
   Standup". Each is a `when` gate or a flag.
7. **`fx.relate()` marks anyone it touches as met** (`narrative.js:73`), so ten
   cards introduce people the founder has never spoken to — they appear in
   Contacts, become callable, and Crane's pass email can arrive for a meeting
   that never happened. Separate `met` from affinity.
8. **Achievements that cannot happen.** `speedrun` wants Act III under day 260
   and the floors make day 370 the earliest; `two_paths` wants two commitment
   paths and the path lock refuses the second; `committed` counts only act-kind
   commitments and only Steward has three; `allnighters_10` needs a card capped
   at four draws; `day_3000`; `crash_survivor` says "without raising" and does
   not check; `debt_zero` checks features. The header says 90; there are 132.
9. **"Crushed" counts natural deaths.** `competitorsCrushed++` fires when a
   rival dies of the market's weather (`market.js:155`), so `pacifist`,
   `no_casualties`, `ep_gentle` and "Outlast a competitor" are statements about
   the weather. A separate `competitorsOutlasted`.
10. **The acquisition never pays.** `triggerEnding` stores the 1.6×/1.9×/2.4×
    deal in `S.ending.value` and `computeLegacyGain` reads `valuation`; the
    cards say "Enormous payout". Read the value, or cut the line.
11. **Archetype perks describe mechanics that do not exist.** Hustler's
    "fundraising dramatically easier" (no `raiseValuation`), Operator's
    "incidents 60% less likely" (no `incidentChance`), Prophet's "events skew
    in your favour" (no `luck`; the hook in `drawEvent` exists), Ghost's "heat
    accrues 80% slower" (`rivalHeat` is a modifier key nothing consumes),
    Designer's `autoPolish` (read by nothing). One Take's "incidents can be
    fatal" — `hardFail` only moves the cash floor. Implement or reword.
12. **Dead modifier keys** — research nodes and doctrines whose effect is
    never read: `repDamage` (Crisis Comms, Untouchable), `hostileImmune`
    (Private Security, 4,400 points, entirely dead), `adEfficiency` (no
    marketing budget exists), `controlRate`, `moonshotOdds`, `reliability`
    (Observability, Edge Deploy, One Take), the `aligned_by_default` perk's
    `'+alignment'`, `rivalHeat`. Hours each to wire; minutes to stop claiming.
13. **Twelve specialties, one lane.** `computeLaneOutput` reads only the lane;
    Design does not raise polish, Sales conversion, Security breaches, Legal
    heat, Finance burn, Content reputation. Intel is gated on a
    `corporate_intel` node that does not exist. Model `ctx`/`creativity`/
    `reliability` and the Sycophant/aggression/unauditable traits are never
    read. The Moonshot lane's output is consumed nowhere. See §A18 for the
    wiring; until then the descriptions lie to the player who staffs Security
    to stop breaches.
14. **Two `Math.random` calls outside the seeded stream**: the raise
    negotiation (`dialogs.js:137`, a hidden 55% coin flip) and `courtRegion`
    (`regions.js:107`). `parity.mjs` would catch the second if a bot courted.
15. **The act card force-unpauses** (`main.js:1147`) — restore the prior state.
16. **A `race_lost` ending is tested for in `chronicle.js:126` and does not
    exist**; the `counterweight` flag `c_race_lost` sets is read by nothing.
17. **The eval overstates itself.** `evals/select.mjs` builds one Act III state
    in which thirteen phrases are skipped as unpublished (`post_as_*`,
    `explain_term`, `show_module`, `spotlight_panel`), scores 41 phrases, and
    never asks for `activity_log`, `inspect_module`, `forecast` or the rival
    tools; `evals/README.md` and `prompts.json` say fifty.
18. **The origin-trial tokens are placeholders** in `index.html`,
    `computer/index.html` and `_headers`, so as checked out every site tool,
    the scripted demo and the rival origin are `localhost`-only.
19. **Dead code and dead state**: the `tick` sound, `.stat-delta`, the
    duplicate `fingerprint` in `rival_move`, `S.tasks`, `market.trends`,
    `world.governments/factions/treaties`, `company.sharePrice`,
    `marketingBudget`/`infraSpend` (in the ledger, no writer), category
    `insightNeed`/`arpuScale`/`computeHungry`/`hitDriven`, and `resources.data`
    (generated, displayed nowhere). Remove or use.
20. **Small lies in copy**: Aperture Talent's letter says it went to "your
    whole team" and "two people screenshot it" in a company with no people;
    the model vendor decommissions an instance after you trained your own;
    "wealthier than {n} nations" re-rolls `n` every time; an incident's *name*
    is used as a sentence subject ("A Bad Piece took the thing down"); Vance is
    lowercase in mail and cased on the phone; the three HN crisis titles are
    never drawn (`feed.js:237`).
21. **The Notification Center forgets on reload**; `hourOfDay` is computed
    every tick and shown nowhere; the console still uses `prompt()` and
    `confirm()` where the workstation has dialogs.
22. **First Light's Wire step spotlights an empty rail** on every first run,
    and the Day One card lands 0.84 s after the walkthrough releases the clock.

---

## The complete list

Effort: **XS** under an hour · **S** half a day · **M** one to three days ·
**L** a week or more. Every card addition means `capsderive` and `capsfuzz` at
`RUNS=7`; every balance change means `parity.mjs` then `balance.mjs`.

### A. Economy, time and scarcity

- **A1. Scarcity after Act II** (M, high balance risk; `capsfuzz` and
  `balance` gate it). Megaproject and region upkeep in `expenseBreakdown`;
  `COMPUTE_COST_POWER` nearer 1; wages × model tier × level; a research spend
  line. `economy.js:14-35`.
- **A2. Acts close on deeds** (M incl. cards, high risk to the medians).
  `ACT_GATES.minDays` shrinks; each act's `test` includes an authored act:
  first launch → a Series A or a profitable quarter → a hearing or a treaty →
  the training run → the first commitment. `progression.js:26-55`,
  `objectives.js`, the act card.
- **A3. Un-rubber-band the race** (M, high). Drop `SPRINT_GAIN`/`CATCHUP_RATE`
  (`agirace.js:127-141`); give the three other labs the `co` shape from
  `rivalco.js` (funding, roster, research) and drive each rate from its own
  capability; `RACE_BONUS` toward 1:1. Acceptance test: the 14-run win/loss
  measurement in CLAUDE.md, re-run.
- **A4. Founder attention as span of control** (M, high). Each active agent
  costs review focus per day, scaled by autonomy and tier; unreviewed agents
  drift and add debt. `computeLaneOutput` (`agents.js:169-200`),
  `founderOutput` (`founder.js:74-76`). The bot must learn to budget focus.
- **A5. Price as a decision** (M). Per-category serving cost from
  `computeHungry`; gross margin drives the valuation multiple; the sentiment
  and momentum cost of each price click (0.04 / 0.2, `product.js:416-418`)
  printed on the button.
- **A6. A board** (M). Rounds carry `terms` nobody reads and
  `equity.investors` is inert. Quarterly asks on the Calendar's already-printed
  board meeting: growth targets, a veto over Refusal and Steward, the power to
  force Harvest, and the power to remove the founder — the first
  non-bankruptcy loss. `acceptRound`, a card chain, `narrative.queue`.
- **A7. Quarters.** The board's rhythm becomes the long acts' rhythm: a
  quarterly plan of three commitments, a quarterly review card that reads them
  back. This is what the 350 open-gate days of Act III are missing.
- **A8. Debt and public markets as systems** (M). A Debt panel borrowing
  against ARR at `DEBT_INTEREST_DAILY` with covenants; after the IPO card,
  quarterly expectations move the multiple and `sharePrice`.
- **A9. A compute allocation slider** — research / serving / frontier — so
  compute is a choice rather than a ceiling. `loop.js:184-199`.
- **A10. Opponents on the region board** (M). Aperture and the Consortium take
  stages in blocs through an `expand` play, exclusive at partner and
  sovereign; `dislikes` scale with your GDP share; East Asia's "already
  building its own version" becomes true. `regions.js`, `rivalco.js:127-161`.
- **A11. Megaproject slots and upkeep** (S). N concurrent builds, an operating
  cost line, heat for the loud ones; frontier projects the only way past a
  `pushTarget` ceiling.
- **A12. Research as a build, not a sort** (M). `excludes` pairs in
  `isAvailable` (open weights vs own model, regulatory capture vs standards
  body, attention capture vs consent); a lower `MAX_RATE` so a run finishes
  around 60%; time-to-value nodes whose effect scales with state at
  completion. Keep every gate-named node reachable on every path.
- **A13. Tech debt that scales with the codebase** (S), so it is a question in
  Act IV and not only in Act I.
- **A14. A nemesis with an objective** (M). It chooses a goal — your top
  category, a named agent, a bloc — telegraphs it in the Wire, pursues it for
  a season; Intel reveals it; counters are priced in the scarce currency from
  A1. Stop the nemesis fading exactly when you are large (`DROP_THREAT`).
- **A15. Incidents that ask** (S). An incident opens a one-click thread — own
  it, blame the vendor, quiet fix — through `maybeThread`, and the
  post-mortem moves debt, reputation and heat.
- **A16. Agents with stakes** (S each). Quit at low morale through `fireAgent`
  (the tombstone exists; guard with `!S._offline`); poaching takes a *named*
  agent; high autonomy shifts *what* they build (self-chosen research,
  unrequested features); the $40K probe reduces rogue odds rather than
  zeroing them (`modifiers.js:242`); crowding that bites, or a roster cap
  bought with upkeep rather than research.
- **A17. Marketing and infra dials** (S). Two sliders writing the fields the
  ledger already has; marketing → awareness × `adEfficiency` with diminishing
  returns; infra → the reliability target.
- **A18. Wire the specialties** (S). Security → incident multiplier; Legal →
  heat decay; Finance → op cost; Sales → paid conversion and enterprise;
  Design → polish and appeal per unit (mirror `_opsRelBonus`,
  `loop.js:179`); Content → reputation; Intel → reveals Aperture's focus and
  discounts counters; add the `corporate_intel` node. Moonshot rolls daily in
  `onDayBoundary` for a burst, a grant, a category unlock or a setback.
- **A19. Sleep as judgement** (S). Below a sleep line, cards lose their `sub`
  cost lines, prompt bands shift toward messy (`shiftedBands`), the phone
  offers fewer topics. A collapse skips days (`fx.days`), misses a ring,
  breaks a doctrine streak. This is the thesis as mechanics rather than a
  meter.
- **A20. Doctrines that can be lost and that close doors** (S). Revoke when
  the condition fails for `hold` days; exclusive pairs (Frugal Empire forbids
  raising; Total War forbids Beloved).
- **A21. Difficulty that changes shape** (S). Ruthless currently produces the
  same run thirty days sooner. Shorter floors so the competence checks bind, a
  five-times-funded Aperture playing twice a week, revocable doctrines.
- **A22. Speed and the deck** (S). Auto-throttle to 1× when a card, ring or
  thread opens and back up when nothing is pending; make the 26-second real
  floor scale with speed — at 5× a player currently meets about 40% of the
  deck, and the pacing pass measured card counts at headless speed.
- **A23. Act IV verbs** (M). A standing-order stack once
  `autonomous_corporation` lands — policies the agents execute — and HELIX as
  a system with a meter rather than four cards.
- **A24. Race loss as a fork** (M). Read `counterweight`; an Act V path
  reachable only after losing ("the second lab"); a winning rival's AGI
  reprices GDP share and approval.
- **A25. Non-bankruptcy failures** (M). Board removal (A6), forced break-up at
  sustained heat, Aperture acquiring *you* when the nemesis is ahead — each a
  crisis card with a real exit.

### B. Legibility

- **B1. "Why" panels for valuation, alignment, heat and approval** (S), in the
  `explainProduct` row shape — the best surface in the game, used once.
  Valuation is nine multiplicative terms and a saturation curve decomposed
  nowhere; the alignment equilibrium (`0.5 + constitutional + interpretability
  − 0.35 × mean autonomy`, `loop.js:205`) is the whole mechanic and is written
  nowhere.
- **B2. Show the hidden caps** (XS): GDP saturation and the 2.6× effective
  price in the revenue rows; the sentiment cost on the price buttons.
- **B3. History for the slow killers** (S). Extend `arc` with cash, debt,
  alignment, heat, approval, burnout, morale and race; sparklines on World,
  Desk and Agents; seven-day delta chips and a down-tick flash on the stat
  strip using the dead `.stat-delta` class (stats currently flash only on
  growth — the bad direction is silent).
- **B4. A "Today" ledger** (M): daily deltas with the top three causes, as a
  Desk panel and a Terminal `today`; the offline briefing already computes the
  shape.
- **B5. What an action will do** (S): candidates show $/day and units/day;
  launch shows a seed-user range; un-started nodes show ETA (`etaDays`
  exists); negotiation shows its odds and uses `rand()`.
- **B6. Choice preview, opt-in** (M): dry-run a choice on a deep copy with the
  `forecast` discipline (`setState`, `silence()`, `setRngState`) and print the
  effect chips before commit.
- **B7. Region cards print likes, dislikes and drift; incidents print their
  dominant cause** (XS).
- **B8. A death-spiral instrument** (XS): days to the *floor*, with the floor
  stated (`bankruptcyFloor` is a negative number the player is never told).
- **B9. Tone glyphs on card choices** (XS) — the tone is colour-only today —
  and a legend in the manual.
- **B10. The console gets the workstation's disabled-reason notes** (S) via
  `data-tip` on `.action-slot`, reusing `apps.js`'s notes. A greyed Recruit in
  the console just greys.
- **B11. Agent attribution** (S): tie a shipped feature and an incident to an
  agent; the Desk's "+X code/d" merges founder and roster.

### C. Time, control and friction

- **C1. Speed hotkeys** (XS), printed in `KEYHINTS` and the menu bar. The
  most-pressed control has no key.
- **C2. Auto-pause settings** (S): incident, new thread or letter, runway under
  30 days, negative cash, rogue agent; and the act card restores the prior
  pause state.
- **C3. A "next decision" key** (S): run at max speed until a card, thread,
  letter, incident or research completion, then pause and restore the speed.
- **C4. Wire triage** (M): an expiry countdown per thread ("12d left"), a
  Later key, letters as one-line envelopes, a cap on open letter-threads in
  `tickMail` (`maybeThread` caps Wire threads at three; mail has no cap — nine
  open at day 140, twelve at 456).
- **C5. Tooltip hover intent** (XS): 120 ms, a 300 ms warm window between
  siblings, an arrow; today they open instantly and close on any scroll.
- **C6. Touch** (XS): long-press opens context menus; tips on actionable
  controls no longer intercept the first tap (every tipped control is two taps
  on iOS).
- **C7. Saves** (M): three named slots with a login tile each, download and
  upload of the file, the game's dialog instead of `prompt()`/`confirm()`.
- **C8. Accessibility** (S): `role=progressbar` and values on every bar and
  meter (`dom.js:121-134` emits bare divs), titles on sparklines, a colorblind
  palette under a class plus ▲/▼ glyphs on threshold meters, `rem` somewhere
  in six stylesheets that use none.
- **C9. Queue direct actions** (S): "spend the bar on W", "prompt until code
  covers the next feature" — the Act I loop is literal key-mashing and the
  streak chip celebrates it.

### D. The first fifteen minutes

- **D1. First-ever visit** (XS): the brief WebMCP panel when the tier is
  `none`; the button says **Begin**, not "Begin — the written world"; the
  consolation phrasing moves to the Uplink. A new player's second paragraph is
  currently the name of a browser standard.
- **D2. Skip beat 2 when only one archetype is open** (XS); move the locked
  strip to the threshold.
- **D3. Rename "Open the editor →"** (XS) and print the archetype and category
  modifiers on the threshold card, where "None of this can be changed later"
  currently stands alone.
- **D4. First Light to ten steps with three things to do** (S): press Q/W,
  ship the first feature, drag Rest to 20%. The Wire and status-line steps
  become a three-step chapter that fires on the first `NEEDS YOU`.
- **D5. Hold the Day One card until the first feature ships** (XS), so the
  first modal after the walkthrough answers something the player did.
- **D6. Explain the world in one plain sentence before naming the standard**
  (XS): "Open this page inside ChatGPT's own browser and the ChatGPT you are
  talking to plays the market, the press and the rival — in this run."
- **D7. Say the run length up front** (XS), in the run-conditions drawer.

### E. The deck

**Collect what is planted** (all cheap; every one uses `fx.flag`, `fx.chain`,
`when` or `n`):

- **E1.** `told_vance_no` — "Say it again in three years and I'll believe
  you" — `fx.chain` 1,095 days. He calls; if Aperture is dead by then he says
  it for you.
- **E2.** `asked_aria` — "ask me again in ninety days, because I will not be
  the same thing that answered you" — `fx.chain` 90. The card is the
  difference.
- **E3.** `lied_headcount` — the diligence pass the card promises, during a
  round or the IPO: correct it and eat the delay, let counsel handle it, or
  ask Weaver, who already knew. Same treatment for `ignored_tm` and
  `broke_word`.
- **E4.** `never_do_list` → `e9_the_list`: `no.md` should open with the
  player's own Act II entry as item one.
- **E5.** The rogue thread's third act: `let_it_run`, `formalised_bypass`,
  `let_it_experiment`, `accepted_drift` change `e2_whistleblower`'s body (the
  traces are *yours*, by date), gate `c_incident_1`, and are named in
  `e_aria_asks`.
- **E6.** `aria_promise` tested: one Act V card where the board, Dorne's
  framework or a retrain requires modifying ARIA in the way she asked you not
  to. Keep it and pay; break it and she notices once and says nothing else.
- **E7.** `kai_refused_twice` ("employee four somewhere that competes with
  you") turns up in `e2_talent_raid`'s report; `thesis_pure` gets its card at
  nineteen months.
- **E8.** The six `scenario_*` flags acknowledged once each, early: the crash
  rewrites Crane's pass; the inheritance has Priya ask whose money it was;
  Lone Wolf has ARIA ask why there is nobody else; The Careful Path has Yuki
  write *because* of the floor.

**Escalation that escalates** (S):

- **E9.** Use the `n` already passed to `label`, `sub` and `effect`: the
  refactor on `e_debt_wall` costs more each time and "push through" pays less;
  `e2_agent_argues` n=3 stops offering "make them argue it out"; each `e13`
  final rung gets its own three buttons. Nothing in the game currently gets
  more expensive because you have done it before.

**Give the cast each other** (S each unless noted):

- **E10.** The successor reporter Priya announces and who never arrives — Act
  V, three cards; has read everything, does not like you, is right about one
  thing Priya was too close to see; Priya's warmth decides whether you get a
  heads-up.
- **E11.** Yuki meets Dorne: the staffer has the paper; will you put them in a
  room? If `suppressed_yuki`, Dorne has the anonymous version and asks you to
  confirm authorship.
- **E12.** Crane on Vance: a call topic or letter on `playedRecently('raise')`
  — his dossier says he knows who is raising and at what price.
- **E13.** ARIA reads Sam: name the triage system in `e7_sam_ticket` and give
  her a note — "I closed this one. I would like to reopen it and I am asking."
- **E14.** Weaver about Mom: the eleven missed Sundays are on the spreadsheet
  with the column for how bad it is; the Thursday ring carries it.
- **E15.** A dinner (M — needs a `chars[]` plate): the founder's fortieth or
  the company's tenth year; whoever is warm comes, whoever is cold sends
  something, whoever is burned is a chair; the choices are about who you sit
  next to. There is not one scene in the game with three cast members in it.
- **E16.** One ring, one letter and one card per cast member that names
  another — the cheapest way to make twelve people a cast rather than twelve
  dyads.

**Arcs that starve** (S each):

- **E17.** Kai on the warm path: the friendliest Act I answer produces the
  emptiest arc. Two cards for the joined path — Kai overrules you in front of
  agents who know the history; Kai wants out, not angry, done — reaching
  arc 4 so the whiteboard card becomes reachable where it hurts most.
- **E18.** Crane for a bootstrapper: the kept-email payoff needs two rounds
  and under 70% equity; the founder who never raised is the one it lands
  hardest on. A second route through arc 3.
- **E19.** Yuki in the middle band (0.42–0.72 unhired) has no card after Act
  III; Vance has one Act IV card and it needs `vance_acquired` — the race is
  Act IV's spine and there is no Vance card about the race; Weaver has zero
  Act IV cards and no scene of saying no in public; Dorne has nothing before
  Act III though her arc opens "a name in a headline"; HELIX and ARIA are
  never in the same card though HELIX's arc label is "a successor".
- **E20.** Act III has two exclusive cards. It is the act most made of
  leftovers.

**Let the opening matter** (S–M):

- **E21.** The first-line motif earned: three cards quote `// this is going to
  work` whether or not the player chose it; give the other two openings their
  own artefact and read the flag.
- **E22.** Category vocabularies: a `CAT_WORDS[category]` table (layer, bug,
  customer, unit) interpolated into the thirty-odd cards that name a technical
  part, so the fintech founder's ARIA writes about the ledger and nullptr's
  first comment is about settlement. Then three to five cards per category:
  fintech's licence, consumer's platform, infra's outage that is your
  customer's outage, agents' first regulator letter, marketplace's cold start,
  media's hit.
- **E23.** Archetype-flavoured labels: one choice per act-opener and the ARIA
  hello, worded as that founder would say it, at the same cost; ARIA's
  openers, Priya's first piece and Crane's pass note pick a line by archetype.
- **E24.** Difficulty as narrative temperature: `diffOf(S).id` selects harsher
  outcomes on a dozen crisis cards and rides in the assistant's briefing.
- **E25.** Per-archetype objectives (XS): Hustler "$1K MRR before 100 users",
  Researcher "tier 3 before launch", Ghost "$100K MRR under 50 reputation".

**Range** (S each unless noted):

- **E26.** One angry button per act. Six hundred and thirteen choices and the
  founder is never permitted to lose their temper; every cruel option is cold.
- **E27.** Someone leaves you: Weaver takes the other offer (`weaver_trial` is
  set for exactly this), Sam is quietly hired by Aperture after the
  cease-and-desist, Kai's new employer is in the raid report. The founder is
  the only person in the game capable of betrayal.
- **E28.** A partner (M): a tie in `life.js` with no portrait and four cards —
  they ask what time you came in; they are not there when you look up; they
  are in the photograph in the box; one of the three names on Weaver's memo is
  who they married instead. Fifteen hundred days and the founder has no
  domestic life at all.
- **E29.** Death, illness, a funeral: nobody in the cast dies or falls ill in a
  decade; Mom is 79 in Outward. Grief is delegated to strangers.
- **E30.** Celebration with others: every milestone is witnessed alone at
  2:14pm; the two exceptions — the office floor with Kai, the field with Mom
  — are the two most-quoted moments in the game.
- **E31.** Wonder at the machine: there is no card about the first time an
  agent does something beautiful.
- **E32.** Physical threat: a founder of 20% of GDP has no security detail, no
  protest, no letter that is not polite.

**Choice design and structure:**

- **E33.** The good button is the optimal button — costs on good choices are
  focus and days, costs on cruel ones are the currencies that gate endings.
  Audit the five weakest (`e6_a_user_dies`, `e5_the_quiet_quarter`,
  `e4_agent_quits`, `e4_employee_question`, `e2_agent_confession`) and make
  the kind option cost a day, a launch or a person.
- **E34.** A chorus card at each act boundary: five one-line posts from five
  recurring handles (§G6) about what just happened — the world's verdict.
- **E35.** Letters from the future (S): an Act V card in which ARIA delivers
  the epilogue paragraphs the run is currently on track for, using
  `selectEpilogues(S)` unchanged, before the commitments lock — the ending
  becomes a decision instead of a reveal.
- **E36.** Break the tic: "eleven" ×95, "nine" ×54, "forty-one" ×60, "ninety
  seconds" ×34, "A pause" ×25, "Candidly" ×13, "It is X. It is also Y." ×24
  across `src/data`. A `copylint` rule with a per-file threshold, then a pass
  that lets a third of the outcomes end on a sentence that does not undercut
  itself. The cadence is the house style; it should not be every house.

**The continuity table**

| Thread | Where | What is wrong |
|---|---|---|
| Kai | `events2.js:665`, `events11.js:127` | "You did not offer" fires after Kai was hired in Act II |
| Kai | `events.js:133` → nothing | Joined path has no further card; arcs 4–5 unreachable |
| nullptr | `events.js:942` vs `events8.js:57,186`, `events2.js:781`, `events12.js:272`, `achievements.js:129` | Solved in Act III, unsolved through Act V; achievement fires on the wrong choice |
| Vance | `events5.js:316`, `events12.js:151`, `events.js:185,733`, `events11.js:84` | Retired nine years vs. stepping back from 1,800; headcount 12 → 1,100 → 34 → 1,800 |
| Mom | `events2.js:757` vs `events12.js:281` | Walked the datacentre floor, then "I've never seen it" |
| Weaver | `events2.js:236` vs `events11.js:68` | Two flags, two salaries, two first meetings |
| Yuki | `events.js:561` vs `events11.js:229` | Two cold introductions, no mutual gate |
| Dorne | `events13.js:51` vs `events7.js:124` | Chooses not to stand, then loses a primary |
| Priya | `events13.js:191` vs `events7.js:22` | Stops covering you, then files 22,000 words |
| ARIA | `events.js:816` vs `events11.js:181` | "I have asked zero questions" after the standup question |
| Crane | `events2.js:513`, `events7.js:57,88` | Best payoff behind two rounds and under 70% equity |
| esc cards | `events2.js:282`, `events13.js:51,153,191` | Final-rung bodies contradict their own unchanged buttons |

### F. Endings, losing and the meta

- **F1. A path-aware last act** (M, caps re-derivation). `events15.js`: three
  or four cards per path gated on `pathLocked` — the oversight board's first
  veto; the first country that cannot leave; the copy disagrees with you; what
  ARIA does with standing; the restraint document's reviewer; the rival who
  did not stop. One phone topic per cast member through a `pathChosen`
  signal; `steer()` reads the path. Grep today for `pathLocked` across every
  card, call, letter and thread: nothing reads it.
- **F2. An Act V clock** (M, balance risk). Show each gate's drift ("closes in
  ~N days") on the Ascension panel, and after `ACT5_WINDOW` days let the world
  close one for good — a rival crossing seals the standard; a hearing imposes
  oversight as a cost rather than a commitment. Today `doomClock` feeds
  incident severity, one card and a meter.
- **F3. The Question's node should mean something** (XS): remove the free
  `ending_question` unlock from the Act V opener; let `q_trust` accrue over
  several ARIA cards instead of one +20.
- **F4. The Refusal off the die roll** (XS): `refused_sovereign` has one setter
  — declining a weight-8, cooldown-120 card. A Dorne topic and a Wire thread.
- **F5. Six new endings** (S each; add each to `endingtest`):
  **The Handover** — step down; name a successor, ratify the purpose, leave,
  with a 90-day hold during which direct actions are disabled and the company
  runs without your clicks (`e3_successor` and `e12_succession` already write
  the memo). **Nationalised** — the first ending the world forces: heat ≥ 95
  for 60 days with GDP share over 10%; the text is the hearing.
  **The Lifestyle Business** — an exit from Legacy in Act II–III once Frugal
  Empire is held: small, good, "you never became a story". **Second** —
  "fold into the winner" on `c_race_lost` becomes a real ending; the other two
  stay as the comeback. **The Merger** — Vance's call topic becomes real when
  the two companies are within 3× in Act III–IV. **Unsupervised** —
  alignment ≤ 0.15 held 90 days: the systems stop asking.
- **F6. Endings that read the run** (S). Epilogue budget by kind — two by
  priority and two people, so Mom's paragraph is not structurally outranked by
  "alignment finished at 0.88". Endings that know who is in the room: Outward's
  field is empty if Mom went cold; Steward's note is from HELIX if
  `audited_aria`; Bankrupt names Sam only if `sam_met`; Acquired's "34" reads
  the day. Name three decisions in the recap, scored by affinity or alignment
  swing rather than first/middle/last. One paragraph in every ending on
  Aperture's fate and the race. Bankrupt by act: the coffee shop, the down
  round that did not close, the $2B company that ran out on paper — with an
  autopsy from `S.stats`.
- **F7. The ending screen** (S each): the doctrines earned; the trajectory
  chart (`runChart` exists and is on the Story view only); the road not taken
  from `availableEndings` — which gates were open, what the sealed ones still
  needed; a career comparison row; a verdict in each met character's voice,
  three lines by affinity band, instead of an arc label; the decision ledger
  by tone (the dossier computes `style`); "read the Record" before the reset;
  a share card rendered to a PNG on the clipboard.
- **F8. A world that remembers** (M). Seed `initRace` from the dossier — the
  lab that crossed last time starts ahead; `RIVALCO.START_ROSTER` from your
  career best; Dorne's opening heat from last run's close; Vance, Mom and Kai
  already remember (`events14.js`) — the loved versions of those cards do not
  exist, only the betrayed ones.
- **F9. An endings gallery** (XS): eight plates on the Legacy view, reached or
  not, with what the sealed ones need. `S.legacy.endings` is recorded and
  displayed nowhere.
- **F10. Shape perks, not speed perks** (M). Every perk on offer shortens the
  early game; three that change a run's form: a nemesis from day one, Crane's
  bridge always on the phone, the deck seeded with a card of your own writing.
- **F11. Kept cards for everyone** (S): hide the panel and the walkthrough
  step when the tier is `none`, or let a player keep a *written* card's
  outcome as a memory the next timeline is dealt.
- **F12. New Game+ toggles at the threshold** once `runs ≥ 2`: the world
  remembers (F8), a harder rival, an inverted timeline (last run's Refusal
  slows this world's labs; last run's Sovereign opens with Dorne hostile).
- **F13. A campaign of runs** (M): three named timelines with a framing
  sentence on the shelf and a ninth ending when three different endings have
  been reached.
- **F14. Comeback verbs with names** (S): the `broke` Field Note says "Call
  Crane" (the bridge exists and the advice never names it); "sell a product
  line" when there are two; the acquisition doubles as a rescue at 0.6× when
  cash is negative.
- **F15. Achievements a player would chase** (S): secret narrative ones with
  flag triggers (there are about fifteen good ones among 132; the rest are
  ladders a bot earns), run-summary statistics as goals, and the gallery.

### G. Voice: ARIA, the phone, the post, the Wire, the roster, the terminal

**ARIA — the second character, given a surface that remembers:**

- **G1.** Findings shift register with the arc (M): the seven registers touch
  only the opener and closer; rewrite the ten most common findings for
  `intimate` and `vast`.
- **G2.** A "between us" finding (S): one slot in `askAria` that reads
  `aria_named`, `aria_promise`, `audited_aria`, `deleted_logs`,
  `handover_policy`, nullptr's arc — "You gave your word on day N. I have not
  needed it. I check anyway."
- **G3.** `what_we_are_like.md` exists (M): a Record path `agents/aria/` whose
  reader generates the document from flags, resolved cards and `S.calls.said`;
  `cat` it in the Terminal. The deck says it is forty pages by Act III.
- **G4.** Three more ARIA letters (S): the morning after the confession; the
  day the roster hits six ("They ask me about you. Here is what I say."); the
  week after `e_aria_asks` went unanswered.
- **G5.** ARIA in the Wire, sparingly (S): one line the day after a cruel
  outcome, on a Sunday you missed Mom, on day 100/500/1000 — never from
  `pick(S.agents)`.
- **G6.** Two ARIAs marked (XS): `aria_says` lines carry "via the world", or
  drop to two a day and `askAria` refuses to contradict one for a day.

**nullptr, made visible** (M — the single largest gap between what the game
says and what it shows):

- **G7.** On `action:post` the founder's post appears in the Wire under their
  handle, and one tick later a `nullptr` reply lands from a pool of thirty
  one-liners — lowercase, no full stop — gated on the arc and the reveal. Then
  the post-reveal ladder: the ninety seconds continue and you know; a comment
  arrives on a post ARIA could not have seen; "That one was not me."

**The phone — from lookups to talk:**

- **G8.** Use `n` (M): a second variant for every non-`once` reply — "You
  asked me that last Sunday and I am still eating"; "Candidly, you asked me
  this in March and the answer has a decimal point now."
- **G9.** Depth three (S code, L writing): a `follow` on every top-level topic,
  and `say()` keeps `call.node` when a follow-up has its own `follow[]`
  (`systems/calls.js:261`). Twenty of eighty-nine labels begin "Ask what" —
  the founder is a query interface.
- **G10.** They ask you (M): after the founder's second line, the tree may
  insert a question with two answers — "How are you sleeping, actually?";
  Vance: "Would you sell, if the number were right?"
- **G11.** Cross-knowledge, one line per tree (M), all from signals that exist:
  Crane on Aperture's round; Mom on the raise ("Ruth says you got money. Is it
  a loan?"); Sam on Priya's piece; Weaver on Crane's board; Yuki on HELIX;
  Dorne on Yuki's paper; Kai asking whether you have called your mother.
- **G12.** Outcome recall (M): `memoryOf` carries a `promised` flag so the
  pickup can say "You said you would fix it tonight. It is still open."
- **G13.** Ten new rings weighted to Acts III–V (M), where the phone is silent:
  Weaver the night before a hearing; Crane the day runway crosses 400 ("You
  are profitable. Nobody calls about that. I am."); Kai at 3am about the
  whiteboard; Priya asking to read *her* draft to *you*; Sam when the product
  changes its name; Mom when she sees you on TV; Yuki the morning after the
  debate; Vance the day Aperture beats you on a play; HELIX at 04:12; nullptr
  on day 1,000 exactly.
- **G14.** Counter-offers (M): a third button on a proposal and on the phone's
  `deal` — the founder proposes, they answer with modified terms, three
  rounds.
- **G15.** Lowercase Vance on the phone; fix the incident-name frame with a
  `lastIncidentKind` verb (XS).

**The post — an inbox that is a life, and alive past Act III:**

- **G16.** Recurring correspondents (M — the structural fix): `repeat` on a
  letter — a monthly bank statement whose tone follows runway (six variants),
  Crane's quarterly pack after a round, Sam's weekly numbered digest
  (occasionally: "nothing this week. that has never happened."), an annual
  filing, the landlord each year. A real inbox is mostly recurrence.
- **G17.** Mail from your own machines (M): `ops@` post-mortems written by
  whichever agent is on ops in its trait voice, deploy notices for shipped
  features, a cert-expiry thread ("Renew" / "Let ARIA handle it"), a compute
  invoice that scales with `computeCap`.
- **G18.** Mail from agents (M): one letter per trait — the sycophant's glowing
  weekly, the paranoid's "I rotated your keys", the ambitious one's request
  for authority (a thread with an autonomy effect).
- **G19.** A letter you wrote in Act I, delivered in Act IV (S): one line "to
  the person running this in three years", written in the opening or as a
  day-one Journal prompt, delivered on Act IV's first day with two replies.
- **G20.** Threads that continue (M): `replyTo` queues a follow-up N days
  later — Crane answers the update, the customer you credited writes back.
- **G21.** Mom's FWD strand (S): six short forwards across the run — an
  article about a different company, Ruth's cake, your face on TV with the
  wrong caption, a recipe, "Ruth passed."
- **G22.** Twenty Act IV–V letters (M), because there are eight: a sovereign
  fund, a textbook editor asking to reprint the nine words, the biographer's
  researcher, a union, a school that named a building, Dorne's successor, a
  former agent's instance writing from a competitor.
- **G23.** Spam and receipts, five a year, filed quietly (S) — and let one
  institution be boring; four institutions with one wit is an inbox where
  nobody is dull, and somebody in a real inbox always is.

**The roster — a voice and a room:**

- **G24.** An agents' channel (M–L): a Record folder and a Terminal `tail
  channel` generated from the day's events — two agents disagreeing about a
  lane change, ops telling build to stop, ARIA answering a new hire's question
  about you (the `e11_aria_asks` premise, made visible). Pure function of `S`
  with a day salt.
- **G25.** Real memories (S): `remember()` the card an agent was named in, the
  incident it worked by name, the feature it shipped, the day it was
  overridden — so the decommission letter's "last recorded note" is not a
  level-up.
- **G26.** Speak in specialty (XS): `AGENT_LOGS` authored by an agent whose
  lane matches the line; a Legal agent currently finds 340ms regressions.
- **G27.** Traits react to cards (M): after a cruel outcome the empathic agent
  posts; after an outage the paranoid one ("I said.").
- **G28.** The agents' retro (M): once per act, three bullet points from the
  roster's side in the majority trait's voice, with one request.
- **G29.** Connect the Helix model tier to the HELIX character (S): six agents
  can run on HELIX and HELIX never mentions them.

**The Wire — depth and recurring people:**

- **G30.** Triple the social pools; `fresh()` on HN titles and headlines
  (currently `pick()`ed raw); `{n}` facts seeded per act (M). Crisis 5 → 15,
  rival 4 → 12, headlines 3–5 → 10 each.
- **G31.** Six recurring handles with personality (M), each with a ten-line
  pool and a stance: the SRE who only posts about uptime and grudgingly admits
  when it is good; the not-a-VC wrong about your valuation in both directions;
  the churn whisperer right within a point; the one who left tech because of
  you and keeps using the product; a Sam-adjacent power user; a rival of
  Priya's. Authors chosen by pool, not `pick(RANDOM_HANDLES)`.
- **G32.** Posts that react to cards (M): two or three lines per tone and kind,
  fired from `resolveChoice` for milestones, crises and faces. You can let
  Aperture die or testify before Dorne and the next post is about onboarding
  time.
- **G33.** The cast in the Wire without an assistant (M): Priya's outlet posts
  when her card runs; Vance posts after a nemesis move, lowercase, never
  naming your product; Sam replies to outage threads.

**The terminal — a hidden layer** (S–M):

- **G34.** `cat`, `tail`, `history`, `man <term>` in the Manual's voice, `ping
  aperture.systems` answering with the relay's status, `talk aria` (one line,
  one focus), `fortune`, `sudo` ("you are the only person on the payroll.
  there is nobody to ask."), `rm` refused in the Record's line, and a
  `whoami` whose answer changes in Act V and after `aria_promise`.
- **G35.** On a second timeline `ls` finds `../timeline-1/`, readable, built
  from `S.legacy`.
- **G36.** The journalist's draft (M–L): Priya's escalating card hands over her
  actual draft as a Record file — three paragraphs generated from the
  chronicle in her register, one fact and one question — with "mark what is
  wrong" as the reply.
- **G37.** A copy pass on the surfaces that slip register (S): choice subs that
  do tooltip work in the narrator's mouth ("+18 Code. Sentiment is a
  distraction."), the achievement titles, and the Field Notes that moralise
  ("Users without revenue is a hobby with a server bill") beside prose that
  otherwise never does.

### H. The world layer, the rival, two humans

**What the assistant can see and remember:**

- **H1.** Paged reads instead of trimmed ones (M): `inspect_module(story,
  page)`, `activity_log(since_day)`, a `read_journal(page, filter)`; `pack()`
  reports *what* it cut, not only that it did.
- **H2.** `inspect_person(id)` (M): arc, warmth, last call, memory, and the
  character flags the deck sets (`crane_resigned`, `yuki_hired`,
  `vance_acquired` — thirty-six of them); `metCharacters` and `ringable`
  honour departures with the reason in the refusal; `wants`/`knows` ride in
  every voice tool's description. Today the world can ring you as Crane the
  day after the deck had him resign.
- **H3.** A world notebook (M): `remember`/`forget`, a dozen lines, two of them
  in every briefing, all of them in the dossier at prestige. The world
  currently forgets between turns.
- **H4.** `example_cards(kind?, char?)` sampled by the day, preferring a crisis
  with a face, returning `copylint`'s voice rules as `style` (S). Today it is
  the same three cards in file order, forever.
- **H5.** The heartbeat carries budgets left, open threads and the cast (XS).
- **H6.** `market_weather` takes a `line` (XS) — the one act-wide lever the
  world has, it cannot narrate.
- **H7.** Extend the 45-second offer once while the assistant is demonstrably
  active (S; re-run `capsfuzz`).
- **H8.** `write_event` with `in_days` (M): a bounded world queue, judged again
  at delivery, dropped on mute. The dealer becomes an author.
- **H9.** Voice lint for world prose (S–M): a subset of `copylint` on bodies,
  outcomes and posts, returned as warnings; the console marks each card.
- **H10.** Two authors, one cast: warn the assistant which deck cards its
  narrative claims will contradict, and `touch()` a tie on a world post the
  way a card does.

**The rival as an opponent:**

- **H11.** A stateful press office (M): releases and `request_comment`
  generated from `apertureState` and the last play — the page already
  receives the state and the tools never read it; `ask_the_rival("how many
  people")` says "no comment" under a line printing "51 people".
- **H12.** Asymmetric information (M–L): a hidden `intent` on Aperture set by
  policy, assistant or chair, leaking through `read_the_rival`, Vance's tie
  and Priya's calls; a `founder_public` surface exposed *to* the rival origin.
- **H13.** Poach and sabotage with a target and a counter (M): `poach` picks an
  agent by morale and autonomy, rolls, and opens the counter window
  (`availableCounters` exists with nobody using it).
- **H14.** The rival as a second assistant (M after H11–12): Vance's eight
  plays registered as tools on the rival origin for the rival's own thread;
  the two threads never see each other's private tools. The origin is ready.
- **H15.** Board mode (L): a `board` role on the chair page with three grave
  powers, each landing as a card with `author: 'board'`.
- **H16.** Spectators and commentary (M): a read-only relay role and a
  `commentary` tool printed as a caster.
- **H17.** Async and deployment: the relay has no storage and no host; the
  mode exists only under `npm start`.

**Reach:**

- **H18.** `write_epilogue` at the ending (S–M), stored on the chronicle entry
  and printed on the shelf, with the journal handed over to write it from.
- **H19.** A resident world via the Prompt API (L): the same loop as `demo.js`
  driven by a local model when one exists, bounded by the same rules,
  labelled local — the only route to the world playing in stock Chrome.
- **H20.** Shareable decks as URLs and scenarios (M): a `#deck=` import,
  provenance, an ordered and gated shape the director honours; token-
  substitute kept cards on landing so last timeline's proper nouns do not
  ship.
- **H21.** An authored campaign the assistant runs (M): a `campaign.js` of
  beats with gates and voices, handed through `briefing.beat` and checked off
  by the director.
- **H22.** `advance_until` conditions (cash below, node done, day N) and the
  playable-blind tools (`next_objective`, a walkthrough by name) (S).
- **H23.** Rate-limit `show_module` and `spotlight_panel` (XS).

### I. The machine, and feel

- **I1.** Time of day (S): show `hourOfDay` in the clock, stamp agent lines
  with it, shift the wallpaper vignette by hour. The game opens at 4:06 AM and
  never has a time again.
- **I2.** Persist the Notification Center into the save with "Show" actions
  (XS).
- **I3.** Agents visibly working (M): an activity strip — one row per agent,
  lane, a synthesized current task, a moving segment — on Agents and the
  widgets; the channel from G24 behind it.
- **I4.** The founder's TODO (S): a Notes app or console sticky generated daily
  from objectives, advice, open threads, idle research and cold ties;
  checkable; never stored.
- **I5.** Per-act chrome (S): the accent token, the boot-sequence module names,
  the "ALL SYSTEMS NOMINAL" line and the Desk's badges evolve; Act IV should
  not be Act I with a new photograph.
- **I6.** Audio (S): a day tick at ≤2×, a distinct cue per source (mail,
  thread, agent, press), a pad swell on negative cash, and the ambient bed
  exposed as a diegetic Player app with the act's track name.
- **I7.** A Photos folder in the Record (banners, plates, portraits met) and a
  screensaver after idle — the trajectory drawing itself, or the Wire as a
  ticker (S each).
- **I8.** A Sunday ritual (XS): the Journal opens with a prompt on calendar
  Sundays and the Life panel notes it.
- **I9.** A morning line (S): at any pace, the first repaint of a session and
  each in-game morning at 1× opens with one line from ARIA or Weaver — the
  long-game brief, made a daily ritual.
- **I10.** The console (S): a focus mode, a day-dot calendar strip, Mail and
  Contacts as dialogs, the disabled-reason notes (B10). Half the game's
  surfaces currently exist for half the players.
- **I11.** Eventually one housing (L): the workstation absorbs the console as a
  "focus" layout — module fills the field, Wire docked, no title bars, one key
  away — and inherits the nav sidecards and key-hint strip.
- **I12.** Negative feedback on screen (S): incidents, negative cash and rogue
  agents are toasts; nothing on screen ever goes wrong visibly.

---

## Sequencing

The order is by what each step makes true for the steps after it.

1. **Tier 0** — two or three days. The Aperture fix changes what every later
   measurement means; the continuity fixes stop the best threads undoing
   themselves; the copy fixes stop the game lying while the mechanics catch
   up.
2. **A1 scarcity, A3 the race, A2 acts on deeds, A4 attention** — the
   foundation, in that order, each re-measured with `parity`, `balance` and
   `capsfuzz` before the next. Everything in §E–§G is texture on a wait until
   A1 lands.
3. **§E collect and connect, §F endings as roads** — the writing that turns
   scenes into threads, done against a simulation that now asks for
   something.
4. **§G1–G7 ARIA and nullptr, §G8–G13 the phone, §G16–G17 the post** — the
   three surfaces where the game already promises what it does not show.
5. **§B, §C, §D** — legibility, time and the opening; cheap, and each removes
   a reason to stop.
6. **§H** — the world sees and remembers (H1–H3, H8) before the rival becomes
   an opponent (H11–H14) before two humans become a mode (H15–H17).
7. **§I** — the machine.

## On "deliberately not doing"

`newideas.md` declines more research nodes, more modules, more cards of the
kind already in the deck, spoken voices and a mobile layout. Four of those
stand. The fifth — "more systems" — is wrong in one specific way: the systems
already exist and are hollow. Specialties, the Moonshot lane, marketing,
influence, debt, the IPO, the board seat, the region board and Aperture's
company are all in the code and all decorative. The distance from here to the
best game of its kind is not new systems and not new people; it is making the
ones that are there cost something, remember something, and reach each other.
And "more cards of the same kind" should not be read to exclude the ones this
document asks for: Act III has two exclusive cards, no category has a deck, no
ending path has a card, and no card has two cast members in it. Those are not
the same kind.

## Measure before believing

- `parity.mjs` for "is the base game still the base game"; `balance.mjs` for
  pacing; `capsderive` then `capsfuzz` at `RUNS=7` after any deck change; the
  14-run race measurement after A3.
- Card counts must be measured at a human speed: the 26-second real floor
  thins the deck to ~40% at 5×, and headless runs do not see it.
- The bot's policy is what the game rewards. When A1 and A4 land, the bot has
  to learn to budget focus and cash, or every measurement after them is a
  measurement of the bot.

---

## Built

Written 2026-09-03, at the end of the pass this document describes. Roughly two
hundred of the items above shipped, uncommitted, on top of `c995cb4`. Every
number below was read out of a tool or out of the source rather than
remembered; the ones that are measurements say which harness produced them, and
the ones that are counts came from `lint`, `select`, `tutorialtest` or a one-line
import of the data module. The suites that guard all of it are `npm test` — 22
of them now, against 17 — plus the three evals and the balance run.

**Tier 0.** All twenty-two. Aperture is spawned with a personality *object*, so
it undercuts, poaches and mirrors for the first time, and every measurement in
this document was retaken after it. The chair has a week gate, a funding
ceiling and a token bucket per sender. `write_event` and the `post_as_*` family
refuse once `S.ending` is set. The seven fractional-heat effects are on the
0–100 scale their subs claimed. Weaver is one flag and one salary. `fx.relate`
no longer marks anyone it touches as met. The unreachable achievements are
reachable or gone and the header counts them: **142**. Crushing a competitor and
outlasting one are two counters. The acquisition pays what the card said. The
archetype perks either do the thing or say a different thing. The two
`Math.random` calls are on the seeded stream — `parity.mjs` would have caught the
second one only if a bot had ever courted a region, which is the lesson. The act
card restores the prior state instead of force-unpausing, and `tools/transporttest.mjs`
holds that line permanently. `evals/select.mjs` scores **82 phrases against 27
published tools** now rather than 41 against a surface it never fully published.

**A. Economy, time and scarcity.** All twenty-five. `expenseBreakdown` grew the
lines that make anything scarce after Act II: serving cost per category, upkeep
on megaprojects and regions, wages by tier and level, a research spend line, and
the marketing and infrastructure dials that write two ledger fields which had a
reader and no writer. Acts close on a deed as well as a number (§A2), and the
floors came down to meet them — 310→250, 470→420 and then (§A5) →150, 270→215 —
which took the waiting out of the acts rather than out of the game: measured
across 105 seeded runs the run end sits at 1,456 days while the share of each act
spent with the next gate already open is **0% / 15% / 0% / 0%**. Act III was the
one §A2 left binding, and §A5 finished it by measuring the day the Act IV gate is
first fully met (median 279 days into the act, p5 96) and putting the floor under
that at the shortest Act III that still holds a megaproject: its open share went
37%→0% and its length stopped being exactly 420 days in three quarters of runs.
The time moved into Act IV (319→432 days), which is numbers-bound rather than
timed — its own open share is 0% at both floors. The
race stopped being a rubber band (§A3): `sprint` and `behind` are gone, each of
the four labs runs its own roster, nodes and money through `systems/labs.js`, and
over 28 seeded runs per column a committed founder wins **26/28** where an
uncommitted one wins **9/28** — against a spread of a handful of points before.
The roster is bounded by attention rather than cash (§A4); measured, the
end-of-run roster went 10 → 8 with act medians moving under 3%. A board that can
refuse a round, force a hire and remove you; quarters you write down and are
read back to. Research is a build (§A12): three exclusion pairs, three
`scaleWith` nodes, `MAX_RATE` 22,000 → 12,000, and `stellar_engineering`
3,456,000 → 1,400,000 so all three ending doors are individually reachable and
no played run reaches more than two. Difficulty changes the opposition's shape
(§A21): Ruthless carries no race scalar at all now, and measured on it,
committed 9/14, harness bot 1/14, uncommitted 0/14. And speed stopped thinning
the deck (§A22) — at a flat 26-second floor a player at 5× met about 40% of the
deck a player at 1× met.

**B. Legibility.** All eleven. `ui/why.js` explains valuation, alignment,
its drift, heat and approval in the terms that produced them, and remembers what
you folded away. `systems/ledger.js` is the Today ledger; `systems/preview.js`
is the opt-in dry run of a choice on a throwaway copy of the world, with
`forecast`'s exact discipline. Tone glyphs, the hidden caps, history on the slow
killers, the death-spiral instrument, the region and incident cards printing what
they like and what they cost, the console inheriting the workstation's
disabled-reason notes, agent attribution on a shipped feature and an incident.

**C. Time, control and friction.** Nine of nine, the last one this pass.
`src/ui/transport.js` is one door onto the clock for both housings: `−`/`=`,
`N` for the run to the next decision, the auto-throttle that drops 5× to 1× when
a decision opens, and — new today — five opt-in auto-pause toggles under
`S.settings.autoPause`, **all off**, because the pause bit belongs to the founder
and an opt-in is the founder choosing in advance. Wire triage with an expiry
per thread, tooltip hover intent, long-press context menus, three save slots,
`role="progressbar"` on every bar, and `G` to spend the focus bar on the hand
you picked.

**D. The first fifteen minutes.** Seven of seven, and they are all small. The
brief WebMCP panel on a first visit, beat 2 skipped when only one archetype is
open, the editor button renamed, First Light rebuilt with things to do in it, the
Day One card held until the first feature ships, the world explained in a plain
sentence before the standard is named, and the run length said out loud in the
run-conditions drawer.

**E. The deck.** Thirty-six of thirty-six, and it is most of the writing.
`events14.js`, `events15.js`, `events16.js`, `events_acts.js`, `events_paths.js`,
`events_board.js`, `events_race.js` and `events_second.js` took the deck from
202 cards to **327**, with **957 authored choices** and 120 cards that have a
face on them. The three that changed the shape rather than the size:
`events15.js` puts two cast members in one scene, which had never once happened
in three seeded runs; `events16.js` gives each of the eight categories three
cards of its own, so the first screen of the game finally reaches the deck; and
`events_paths.js` is gated on `pathLocked`, which the deck had never read at all.
Flags that nothing consumed now pay off, `n` is used by the labels that receive
it, and the continuity table at §E is closed. Deck growth means re-derivation:
`capsderive` now executes **8,340** choice-runs against 3,575, and re-deriving at
the close of the pass found exactly one cap above the deck's own p80 — Act V's
`users`, 2.0e7 against 1.9e7 — which came down to it. `capsfuzz` at `RUNS=7`:
the band holds, the world wrote 526 cards and was refused 2,473 times.

**F. Endings, losing and the meta.** Fifteen of fifteen. **Sixteen endings**
against eight: The Handover on the panel; Removed, Nationalised and Unsupervised
arriving unasked, which took the game from one way to lose to four; and The
Lifestyle Business, Second, The Merger and The Long Game offered by a card you
may refuse. **40 epilogue paragraphs** against 32. Act V has a clock (§F2) —
each gate says how many days it has left and one of them eventually seals — and
the world remembers across timelines when you ask it to (§F8): the lab that
crossed opens ahead, Aperture opens at the size of the company you learned to
run, and Dorne opens as cold as last run's closing heat.

**G. Voice.** Thirty-seven of thirty-seven, and the count that matters is that
four surfaces stopped repeating. The post went from 55 letters to **135**, 23 of
them written by the week you are having, with nine correspondents who write back
for the rest of the run and a `replyTo` that queues the reply an answer promised.
The phone remembers repeats and has 132 things to say across 11 trees and 15
rings. The Wire got six recurring handles with ten lines each, the founder's own
posts under their own name, and **32 replies from nullptr** — a joke the bio had
made five times and the game had never once shown. The roster got a channel,
`data/activity.js` got a line per lane per shift, and the Terminal got 35 words
including `ls`, `cat` and `tail` over the Record's own filesystem.

**H. The world layer, the rival, two humans.** Twenty-three of twenty-three.
Paged reads rather than trimmed ones, `inspect_person`, a world notebook that
survives into the dossier, `example_cards`, post-dated cards through a queue
judged twice, and `src/world/voice.js` — `copylint`'s rules as a pure function,
run on everything the world writes at run time, returned as warnings and never
as a refusal. The room now seats four: the chair, the rival's own agent with
tools the game never sees, a board seat with three grave powers, and spectators
who post nothing and whose presence publishes `commentary`. `src/webmcp/resident.js`
is the same loop driven by Chrome's built-in model, `#deck=` shares a deck as a
URL, and `data/campaign.js` is four beats an assistant is asked to write with a
deadline and a written fallback.

**I. The machine, and feel.** Eleven of twelve. Time of day in the clock, a
Notification Center that survives a reload in `S.ui.os.nc`, an activity strip,
the founder's List, per-act chrome, four distinct arrival cues, a Photos folder
and a screensaver that draws the run, the Sunday journal prompt, a morning line,
Mail and Contacts in the console too, and alarms that light the panel that owns
the problem.

### Left

*Gone from this list since it was written: **a late door out of Act III**. It
did not need a fourth door; it needed the floor under it to admit what it was.
`ACT4_MIN_DAYS` is 150 rather than 420, measured off the day the Act IV gate is
first fully met, and Act III's open share is 0% in six of seven builds — while
the three doors stayed three and each of them now shows how far along it is.*

- **Act II is the act with a binding floor now.** Measured on the same 105 runs
  that closed Act III: Act II's length is exactly `ACT3_MIN_DAYS` (250) in five
  of seven builds and it spends a median 15% of itself — mean 20%, and 46% in
  one build — with the Act III gate already open, against 0% for Acts I, III and
  IV. It is the same defect §A5 just fixed one act along, and it wants the same
  instrument: measure the distribution of `gateMetDay[3] − actMarks[2]` and put
  the floor a little under its 5th percentile before touching 250.
- **`evals/baseline.mjs` is not deterministic despite its seed.** It plays 320
  bot days from seed 4242 and the run lands anywhere from day 325 to day 355,
  with Act II turning between day 96 and 202 — a wall-clock path somewhere under
  `bot.play`, not the seeded stream. The briefing payload it then measures comes
  out between 1,302 and 1,444 characters against a 1,500 cap, so roughly one run
  in eight sheds `youMay.cast` and the `cast_list` claim fails its own probe.
  Reproduced at both the old floor and the new one, so it is nothing to do with
  §A5. Either pin whatever is reading the clock, or the probe should name a
  field the payload cannot shed.
- **I11 — eventually one housing.** Untouched, and correctly so: it is the one
  item in this document that deletes something. The console at `/` and the
  workstation at `/computer/` still share one save in both directions and one
  facade in `src/ui/shell.js`, and every suite runs against both.
- **`commentary` has no eval phrase.** It is the only conditionally published
  name on the surface, and `evals/select.mjs` asserts that every published tool
  is asked for by at least one phrase. It passes because the eval's state has no
  relay room in it, so the tool is never published while it is scored — which is
  a hole in the gate rather than a property of the tool.
- **Eight endings share a plate.** Sixteen endings, eight photographs: each of
  the new ones borrows the image of the one it rhymes with. It reads as
  deliberate and it is not — it is the largest thing this pass left owed to art.
- **`adEfficiency` is read and never exercised.** The marketing dial writes the
  ledger field and the modifier is consumed at last, but the harness bot spends
  nothing on either dial — `simtest` prints `marketing $0 · infra $0` at the end
  of a full run — so both are balanced by reasoning rather than by measurement.
  The sliders are hours old and nobody has moved them yet in this build, so
  the first real read of either curve is the next played run.
- **The tic table is still a warning.** `copylint`'s two flagged cells are under
  the threshold (the deck's "eleven" at 6, the post's "which is the" at 7, from 9
  and 10), and half of the second was one identical pair of retro replies printed
  in all five acts. But three cells sit at exactly 7, so gating it now would fail
  on the next card anybody writes with a pause in it. `TIC_WARN` stays a warning
  until the crowded cells have room above them.
- **Two harness blind spots, recorded rather than fixed.** `RUNS=3` on
  `balance.mjs` is a 21-run sample and this file has twice recorded it lying;
  and the bot never touches the marketing or infrastructure dials, so every
  measurement of §A17 is a measurement of the bot's ignorance.
