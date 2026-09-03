# SINGULARITY, INC. — the story it tells

What the run is about, act by act, and what the mechanics are arguing for. Every
number here is read out of `src/data/` and `src/systems/progression.js` rather
than remembered; if you change a gate, change it here too.

## The premise

One founder, one laptop, and machines that will build anything you can describe
— for as long as the money lasts. You never hire people; you instantiate them,
three at a time to begin with, and every one of them draws a wage on every day
it runs. The run is about what happens when labour stops being the constraint
and everything else still is.

The founder's *inventory* is not unlimited and the copy must never say it is.
The roster caps at `AGENTS.MAX_ROSTER_BASE` plus modifiers, the first hire is
$900 and each one after costs 1.29× the last, a single prompt is 5 focus and
$5.50 out of a hundred-focus day, and compute has a ceiling the loop rebuilds
every frame. The cold open has always had this right — "Six years ago this
would have taken a team of eleven" is a ratio, not an abolition.

The *age* is another matter, and the title screen asks about it rather than
asserting it: "an age of unlimited leverage" is the question the run answers,
and the answer is bounded by everything above. That is the distinction to hold
— characterise the era, never the roster.

## The five acts

### Act I — The Garage · *Zero to One*

You and ARIA, your first agent. Direct action is genuinely the fastest way to
get anything done: writing it yourself beats explaining it, and the game says so
out loud. Nothing compounds yet.

**Gate:** launch the product, ship 8 features, then reach $7K MRR with 2,200
users — or 12,000 users on their own. Floor 45 days; median exit ≈ day 136.

### Act II — The Machine · *Product–Market Fit*

The act where doing it yourself stops working. Agents get lanes, autonomy and
morale. Tech debt starts charging real interest. Price becomes an interior
decision — above fair value you buy churn, below it you buy reach — and there is
no setting that avoids the trade.

**Gate:** $120M ARR and a $1.6B valuation, and either a Series A or ninety
straight days where the day paid for itself. Floor 120 days — the length of the
profitable quarter plus a month, because that door is the one a bootstrapper
leaves by — and the act lasts as long as the numbers take rather than as long as
the floor says. Median exit ≈ day 370.

### Act III — The Empire · *Escape Velocity*

Scale turns the environment from weather into politics. Regions, regulatory
heat, public approval. A named rival develops an actual grudge and starts making
moves against you rather than merely existing.

**Gate:** a $180B valuation and 2,600 PF of compute, and one of three ways to
stop being only a market participant — a hearing sat through, a region taken to
government partnership, or a frontier-class training run. The Log shows all
three as a checklist with where you stand in each, because any one of them opens
it and the interface used to name them in one sentence and then go quiet.
Floor 150 days; median exit ≈ day 728, and the act lasts as long as arriving
takes rather than as long as the floor says.

### Act IV — The Singularity · *Recursive Ascent*

Capability compounds, and the AGI race becomes the spine of the run. Capability
is a *ceiling* rather than progress itself: Frontier Commitment converts it at a
speed set by your standing order, your agents on Research, your own study hours,
your frontier megaprojects, and how little you are slowing down for alignment.

**Gate:** recursive self-improvement, a $12T valuation, 4.5% of global GDP, and
85% on the frontier benchmark — or somebody else crossed and the question is
settled without you. And one thing done inside this act: a quarterly intention
kept, or a season of the feud closed in your favour. Floor 215 days, with a
620-day stall valve underneath the whole clause, so a run that is otherwise
finished cannot be locked out of its own ending — measured, that valve is
reached by about one run in a hundred. Median exit ≈ day 1135.

**Every act since §A2 closes on a deed as well as a number**, because the
economic curves are near vertical by Act III — raising the Act III bar from $75M
ARR to $280M moved the transition by 36 days. A threshold cannot pace anything;
it can only wall off a bad run while a good one sails past. So the numbers are
the competence check, the deed is the thing the act was *for*, and the day floor
is a shortest-possible-act and nothing more: §A5 and §A6 took the last two that
were setting the pace down to it, and on 210 runs a side no act's median length
is its floor any longer. Every deed has more than one door: a bootstrapper who never
raises must still be able to leave Act II. And since §A5 every door says how far
along it is — "a region at government partnership · 2 of 3 stages in South Asia"
— on the Log, in the Field Notes and on the workstation, so the nearest one is
always visible and the act ends when the founder arrives rather than when the
calendar does.

### Act V — Ascension · *What Comes After*

The commitments open, the gates start closing on their own, and the run gets its
ending. Each gate on the Ascension panel now says how many days it has left —
alignment falls while the company is pointed at the frontier, approval falls as
GDP share rises, and both of those were always true and were never once shown
next to the gate they close. Past a window inside the act one of three cards
seals a gate for good, and which one is the founder's answer. Reached at a
median of day 1174; a full run lands between 1000 and 1700 in-game days, with a
measured median of 1,456 across 105 seeded runs.

## The endings

Sixteen of them, across eight photographs — the eight added since this table was
first written borrow a plate from the one they rhyme with, which is a deliberate
economy and the most visible thing still owed art.

**Four arrive unasked.** These are the losses, and three of them are new: the
game used to have exactly one way to end badly, which was running out of money.

| Ending | Tone | How it happens |
|---|---|---|
| **Out Of Runway** | bad | Run out of money. The card declines at the coffee shop. |
| **Removed** | dark | Board confidence at the floor for three quarters, below 42% held. Needs a priced round and a majority sold, so a bootstrapper can never see it. |
| **Nationalised** | dark | Heat at 95+ for 60 days while mediating over 10% of world GDP. Get large enough, and hot enough, for long enough, and somebody else decides. |
| **Unsupervised** | dark | Alignment at or under 0.15 for 90 days. The systems stop asking. |

**Five are offered by a card** you are free to refuse:

| Ending | Tone | What it asks |
|---|---|---|
| **The Responsible Outcome** | neutral | Accept an acquisition offer in Act II or III. A real outcome, not a failure. |
| **The Lifestyle Business** | neutral | Hold Frugal Empire in Act II or III, then stop. Never become a story. |
| **Second** | neutral | Lose the race, and take the winner's offer. Second turned out to matter enormously — to everyone else. |
| **The Merger** | neutral | Come within 3× of Aperture in Act III or IV, and take the deal. Neither of you ever finds out which would have won. |
| **The Long Game** | strange | Reach three different endings across your career, then refuse all the doors and keep going. |

**Seven are built** — and the first commitment **locks the path**
(`S.narrative.pathLocked`), so every one of them is individually reachable and no
run gets more than one:

| Ending | Tone | What it asks |
|---|---|---|
| **The Steward** | good | Publish the alignment work, accept real oversight, give most of it away before anyone makes you. Alignment ≥ 0.75, approval ≥ 65%. |
| **The Sovereign** | dark | Stop pretending it is a company. Absorb the last independents. ≥ 20% of global GDP. |
| **Substrate** | strange | Copy yourself into the machine. Find out whether the copy is you. |
| **The Question** | strange | Ask ARIA what she wants and accept the answer — but only if you spent years actually answering when *she* asked. It needs a relationship, not a research node. |
| **Outward** | good | Point everything at the sky. Send a seed that does not need instructions. |
| **The Refusal** | good | Freeze the weights, publish everything, stop on purpose at the top. Costs 85% of your research rate for the rest of the run. |
| **The Handover** | good | Name a successor, make the purpose binding, and go. It needs Weaver, or the memo. Nothing depends on you, and arranging that took a decade. |

The tier-8 research nodes that unlock endings cost 3.5M / 5.4M / 4.3M points
with prerequisites. The research budget is tuned so you can afford roughly
**one**; `stellar_engineering` came down from 3,456,000 to 1,400,000 because its
chain is a whole branch in front of it and no run had ever reached the third
door.

## The race is losable

Measured over 28 seeded runs per column, with the harness bot running directives
and regions:

| | wins | margins | best lab at the finish |
|---|---|---|---|
| harness bot | 21/28 | 2–44, median 18 | 47–100 |
| committed (push ≈ 0.70) | 26/28 | 2–54, median 35 | 46–100 |
| uncommitted (push ≈ 0.07) | 9/28 | 0–40, median 8 | 53–100 |

Roughly 10 of 14 for the bot, which is where it has always been. What changed is
the *shape*. The rival labs used to speed up because you were ahead — `sprint`
scaled with the player's own progress and `behind` added catch-up on top — so
every race came out inside 24 points whatever the founder did, and a leading
founder watched four labs accelerate for no reason anybody in the fiction could
name. Both are gone. A lab's rate is its own roster, its own frontier nodes and
its own money, on the same 0–100 scale you are measured on. The one rubber band
left is published work spreading, which is capped, one-directional, and printed
on the panel in the words that make it true. A committed founder now wins 26 of
28 and an uncommitted one loses 19 of 28, where before the spread between them
was a handful of points.

Difficulty changes the opposition's *shape* rather than its rate. Ruthless
carries no race scalar at all any more; what it carries is a war chest and two
decisions a week for Aperture, so it hires while it researches and the board
fills up while you are still choosing a bloc. Measured on Ruthless: committed
9/14, harness bot 1/14, uncommitted 0/14.

You can win the company and lose the century.

## The cast

Thirteen people, and the game is careful that a card from a person and a card
from a system are not the same object.

- **ARIA** — your first agent
- **HELIX** — your foundation model
- **Marcus Vance** — founder, Aperture Systems
- **Kai Lindqvist** — the co-founder who left
- **Sam Okonkwo** — user #1
- **Ellis Crane** — partner, Halberd Capital
- **Priya Raghunathan** — senior editor, The Ledger
- **Dr. Yuki Tanaka** — alignment researcher
- **Senator Ruth Dorne** — chair, Select Committee on Automation
- **Cassidy Weaver** — chief of staff
- **nullptr** — anonymous
- **Mom**
- **Jo** — the person you live with. The only one of the thirteen with no phone
  key: you do not ring Jo, you come home or you do not, and the game says so by
  leaving the number out rather than by explaining it.

## What it teaches

The doctrines are the clearest statement of it, because they are the things the
game hands you a permanent bonus for holding rather than for buying:

- **Compounding beats effort.** Direct action carries a floor so a click is never
  worthless, but it never scales either. Research and capability compound; your
  hands do not. *Compounding* — never leave research idle for a hundred
  consecutive days.
- **Delegation is the whole game.** *The Swarm* — six or more agents, every one
  above 80% morale — is the doctrine for having stopped being the bottleneck.
  *The Machine* asks you to staff every lane at once.
- **Debt is an interest rate, not a metaphor.** *Zero Entropy* — tech debt under
  15 for two months straight — is one of the hardest things in the game to hold.
- **The frontier is a commitment, not a byproduct.** *Sovereign Mind*: your own
  foundation model with alignment above 0.7. No vendor, no rate limit, no drift.
- **Alignment and approval are a budget you spend, not a virtue you signal.**
  They gate which endings are reachable at all. *Untouchable*: alignment above
  0.80 while regulatory heat stays under 20.
- **Listening is a mechanic.** *The Listener* — Insight above 60 for three
  straight months — is the doctrine for never having shipped a feature you had
  not heard somebody ask for in their own words.
- **Holding a decision is a skill.** *The Long View*: one standing order,
  unchanged, for five straight months. One decision, held long enough to
  actually find out whether it was right.
- **Nothing is undone.** The Log's own line reads *"84 decisions. None of them
  were undone."* There is no rewind, and Legacy keeps the ledger across runs.

And the sharpest thing the design says is structural rather than written:
**four good endings exist and you get one.** *Outward*, *The Refusal*,
*The Steward* and *The Handover* are all good, and they are mutually exclusive.
The thesis is that at that scale there is no correct answer — only the one you
committed to early enough to afford. Act V's clock is the same argument with a
deadline on it: leave the doors open long enough and one of them shuts by
itself, and which one shuts is still your decision.
