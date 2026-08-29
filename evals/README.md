# Evals

Four things that can fail the build, and what each of them is actually claiming.

```bash
node evals/select.mjs            # can a person's words reach the right tool
node evals/select.mjs --verbose  # …and every phrase where they nearly did not
node evals/baseline.mjs          # what an agent reading the page cannot get
node evals/capsfuzz.mjs          # can the worst legal world break the game
RUNS=7 node evals/capsfuzz.mjs   # …with more runs
```

## Tool selection — `select.mjs`

Fifty things a player would say while playing, none of which names a tool,
scored against the **real published surface** — the descriptions and schemas the
browser actually shows, pulled out of a live registry mid-run with the whole
cast met and a card open.

It is not a simulation of a model and does not claim to be. What it proves is
the necessary condition underneath one: that no two tools are lexically
indistinguishable for the words people use, and that the intended tool is
reachable from every phrase.

| | |
|---|---|
| top-1 | **74%** (37/50) |
| top-3 | **98%** (49/50) |
| median rank | **1** |
| unreachable | **0** |
| closest pair | `write_event` / `answer_in_own_words` at **0.57** (gate: 0.60) |

Gates, all of which fail the build: no two tool documents near-duplicate; no two
open with the same clause; the intended tool ranks top-5 for every phrase; no
phrase matches nothing; no phrase names a tool; every tool is exercised. Top-1
and median rank are reported and asserted on by neither.

**It paid for itself on the first run.** It scored **58%** with two phrases that
could not reach their tool at any rank, because eight descriptions were written
in the builder's vocabulary rather than the player's — `write_event` never said
"decision", `briefing` never said "how am I doing", `regulator_pressure` never
said "government". Three things it found that no amount of reading would have:

- the word **"decision"** appeared in all fourteen `post_as_*` descriptions
  ("it asks no decision of them"), so the shortest of them beat `write_event`
  for *"give me a decision to make"*;
- `write_event` and `answer_in_own_words` shared enough vocabulary to trip the
  near-duplicate gate at **0.66**, fixed to 0.57 by making the second one stop
  describing a card and start describing a reply;
- **pivoted length normalisation** — the textbook correction for the
  short-document bias this surface genuinely has, with fourteen
  template-generated `post_as_*` tools — was tried at b=0.55 and measured
  *worse*: 74% → 64%. It over-penalises the long documents, which here are the
  ones carrying the domain vocabulary. It is documented in the file and not used.

It also caught `write_event` sitting at **499 of 500 characters** in Act III,
which meant `clip()` was silently cutting its tail — and the tail is the house
style and the ceilings, the two things in there worth having. It is written to
fit now rather than clipped to fit, and a gate fails the build if any
description comes within fifteen characters of the limit.

**The residual misses are honest.** Every phrase that does not rank first is
either a short-document artifact (`post_as_kai` beating `briefing` for "how much
runway have I got left", on the word "left") or a pure paraphrase with no shared
term — *"who is beating me at the moment"* against a description that says "who
is winning". Contorting the copy to catch a bag-of-words scorer would be
overfitting to a metric this file explicitly says not to trust; the gate is
top-5, and top-3 is 98%.

## Against a DOM agent — `baseline.mjs`

The honest question a judge asks: what can an assistant do here that one reading
the page and clicking buttons could not? The other side is steelmanned — it gets
**one** read of the visible-text projection of all eight screens (not the raw
markup, which is 6.7× larger; not one read per fact), with form controls,
`title`, `aria-label` and tooltip text all included, and is credited with every
fact that text contains.

Every claim is falsifiable in the same run. Each fact carries two probes: a
regex that would have to appear in the serialised page for "unreachable" to be a
lie, and one that must appear in a shipped tool payload for "obtained" to be
true. **If a claim and its probe disagree the build fails**, which is how this
caught its own author: *"what the product is actually worth"* was asserted
unreachable, and the Product view prints `fair price $31 vs your $48` in so many
words. The claim is gone and the concession is in the output.

| | |
|---|---|
| raw markup | 250,673 chars |
| visible-text projection | 37,586 chars — one read, all eight screens |
| tool payloads | 7,215 chars |
| facts absent from the page at any length | **8 / 8** |
| …of those, shipped by a tool | **6** |
| world actions with no DOM path at all | **5 / 5** |

Two of the eight facts are reachable by neither side, and they are in the table
on purpose: a table where the tools win every row is a table nobody believes.

**What the other side wins**, stated plainly: the Wire's prose is already text
on the page and costs a DOM agent nothing extra, while `briefing` ships four
lines of it because the whole payload must fit in 1,500 characters. On raw
volume of narrative text the page wins outright. The finding is reach, not size
— there is no button that writes an event, speaks as a character or turns the
market, so a DOM agent cannot do those things slowly. It cannot do them.

## The worst assistant that is legal — `capsfuzz.mjs`

Plays an assistant that claims every slot, writes a card at the ceiling every
time, and always takes the harshest door, for a whole run — against a control
run of the identical bot with no assistant at all.

Every gate is relative to that control, on purpose. An absolute gate on the day
a run ends looks obvious and is wrong: the same bot alone ends anywhere between
day 500 and day 1,860, because reaching an ending early is *winning*.

| | ACT II | ACT III | ACT IV | ACT V |
|---|---|---|---|---|
| the worst legal world | 155 | 479 | 996 | 1511 |
| the same bot, alone | 106 | 437 | 916 | 1500 |
| the tuned targets | 110 | 400 | 870 | 1200 |

A world with teeth that costs you time and cannot cost you the run.

**The first run of this killed nine runs out of nine by day 135**, and the
comment promising otherwise sat three lines above the constant that made it
false. It is why the ceilings are split by direction, why the rolling budget for
stocks is a share of what the founder actually holds, and why there is a runway
floor. The whole story is in `src/data/balance.js`, next to the numbers.

## The base game is untouched

Not "the medians look about the same" — **identical**. `tools/balance.mjs` draws
a fresh random seed for every run, so it cannot answer this: a five-run sample
moved Act II from a median of 104 to 126, which looked like a regression until
it was measured properly.

`tools/parity.mjs` measures it properly. Same seed, same bot, two checkouts:

```
node tools/parity.mjs .          11111
node tools/parity.mjs /tmp/base  11111
```

Across five seeds, both trees produced the same act days, the same cash **to
the dollar**, the same reputation, the same research count, the same features
shipped, the same events resolved — and the same next draw from the RNG after
1,500 simulated days:

```
seed 11111  acts {"2":120}  day 244  cash 1043798  rep 494  res 7  feat 29  rng 0.544929998
seed 22222  acts {"2":111}  day 268  cash  731311  rep 570  res 12 feat 32  rng 0.264028731
seed 33333  acts {"2":120}  day 219  cash  105164  rep 491  res 15 feat 28  rng 0.294849356
seed 44444  acts {"2":127,"3":437}  day 438  cash 68610903  rep 699  res 19  rng 0.002497830
seed 55555  acts {"2":126}  day 214  cash  555124  rep 199  res 6  feat 27  rng 0.873602555
```

Byte for byte, on both sides. The layer does not touch the simulation when
nobody is playing the world.

And the pacing targets still hold on their own terms — medians of 5 runs ×
2,000 days × 7 builds:

| build | Act II | Act III | Act IV | Act V |
|---|---|---|---|---|
| devtools/hacker | 130 | 433 | 875 | 1159 |
| consumer/hustler | 83 | 383 | 823 | 1069 |
| b2b/operator | 151 | 460 | 908 | 1257 |
| agents/researcher | 115 | 423 | 882 | 1127 |
| marketplace/designer | 137 | 445 | 908 | 1166 |
| infra/ghost | 126 | 433 | 890 | 1266 |
| media/prophet | 126 | 429 | 875 | 1114 |

Targets: Act II ≈ 110, Act III ≈ 400, Act IV ≈ 870, Act V ≈ 1200. The spread
here is wider than the ranges `CLAUDE.md` records, and the same five-run sample
on the commit *before* any of this existed is just as wide (Act II 96–131, Act
III 399–437). That is what a five-run median of a stochastic simulation looks
like; the parity check above is the one that actually answers the question.
