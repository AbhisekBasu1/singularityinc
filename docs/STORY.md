# SINGULARITY, INC. — the story it tells

What the run is about, act by act, and what the mechanics are arguing for. Every
number here is read out of `src/data/` and `src/systems/progression.js` rather
than remembered; if you change a gate, change it here too.

## The premise

One founder, one laptop, and an unlimited supply of machines that will do
anything you can describe. You never hire people — you instantiate them. The
whole run is about what happens when the only scarce input left is your own
judgement.

## The five acts

### Act I — The Garage · *Zero to One*

You and ARIA, your first agent. Direct action is genuinely the fastest way to
get anything done: writing it yourself beats explaining it, and the game says so
out loud. Nothing compounds yet.

**Gate:** ship 8 features, then reach $7K MRR with 2,200 users — or 12,000 users
on their own. Median exit ≈ day 110.

### Act II — The Machine · *Product–Market Fit*

The act where doing it yourself stops working. Agents get lanes, autonomy and
morale. Tech debt starts charging real interest. Price becomes an interior
decision — above fair value you buy churn, below it you buy reach — and there is
no setting that avoids the trade.

**Gate:** $120M ARR and a $1.6B valuation. Median exit ≈ day 400.

### Act III — The Empire · *Escape Velocity*

Scale turns the environment from weather into politics. Regions, regulatory
heat, public approval. A named rival develops an actual grudge and starts making
moves against you rather than merely existing.

**Gate:** train a frontier-class model, reach a $180B valuation and 2,600 PF of
compute. Median exit ≈ day 870.

### Act IV — The Singularity · *Recursive Ascent*

Capability compounds, and the AGI race becomes the spine of the run. Capability
is a *ceiling* rather than progress itself: Frontier Commitment converts it at a
speed set by your standing order, your agents on Research, your own study hours,
your frontier megaprojects, and how little you are slowing down for alignment.

**Gate:** recursive self-improvement, a $12T valuation, 4.5% of global GDP, and
85% on the frontier benchmark.

### Act V — Ascension · *What Comes After*

The commitments open and the run gets its ending. Median ≈ day 1200; a full run
lands between 1000 and 1700 in-game days.

## The endings

Two arrive on their own:

| Ending | Tone | How it happens |
|---|---|---|
| **Out Of Runway** | bad | You ran out of money. The only automatic bad end. |
| **The Responsible Outcome** | neutral | You were acquired. A real outcome, not a failure. |

Six are built — and the first commitment **locks the path** (`S.narrative.pathLocked`),
so every one of them is individually reachable and no run gets more than one:

| Ending | Tone | What it asks |
|---|---|---|
| **The Steward** | good | Publish the alignment work, accept real oversight, give most of it away before anyone makes you. Alignment ≥ 0.75, approval ≥ 65%. |
| **The Sovereign** | dark | Stop pretending it is a company. Absorb the last independents. ≥ 20% of global GDP. |
| **Substrate** | strange | Copy yourself into the machine. Find out whether the copy is you. |
| **The Question** | strange | Ask ARIA what she wants and accept the answer — but only if you spent years actually answering when *she* asked. It needs a relationship, not a research node. |
| **Outward** | good | Point everything at the sky. Send a seed that does not need instructions. |
| **The Refusal** | good | Freeze the weights, publish everything, stop on purpose at the top. Costs 85% of your research rate for the rest of the run. |

The three tier-8 research nodes that unlock endings cost 3.5M / 5.7M / 8.1M
points with prerequisites. The research budget is tuned so you can afford
roughly **one**.

## The race is losable

Measured over 14 runs the player wins 10 and loses 4, and **every** race is
decided by under 25 points — wins by a median of 11, losses by 0–3. The harness
bot commits at ≈0.58 and builds no megaprojects, so a player who actually points
the company at the frontier wins more often than that; one who never does loses.
You can win the company and lose the century.

## The cast

Twelve people, and the game is careful that a card from a person and a card from
a system are not the same object.

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
**six good endings exist and you get one.** *Outward*, *The Refusal* and
*The Steward* are all good, and they are mutually exclusive. The thesis is that
at that scale there is no correct answer — only the one you committed to early
enough to afford.
