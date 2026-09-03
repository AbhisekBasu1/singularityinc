// ─────────────────────────────────────────────────────────────────────────────
// THE BOT — one autoplay loop, shared by every harness that needs a game to
// have actually happened. Extracted so the WebMCP tests reach Act III against
// the same play `simtest` measures balance against, rather than a second
// approximation of it that drifts.
// ─────────────────────────────────────────────────────────────────────────────

// §A6. `seed` gives the bot its own dice. Without one this is `Math.random`
// and every harness that calls `makeBot()` plays exactly as it did before; with
// one the whole loop is reproducible, which is what `evals/baseline.mjs` and
// `evals/select.mjs` need in order to print the same table twice.
//
// It is deliberately *not* the game's stream. Drawing from `src/engine/rng.js`
// here would move every event draw and market roll after it — the thing
// `tools/parity.mjs` exists to compare — so this is a separate LCG with a
// separate state, and the game's seed stays the game's.
export async function makeBot(root = '../src/', { seed = null } = {}) {
  // The bot's dice. `Math.random` when nothing was asked for.
  let bs = seed == null ? 0 : (seed >>> 0);
  const rand = seed == null ? Math.random
    : () => { bs = (bs * 1664525 + 1013904223) >>> 0; return bs / 4294967296; };
  const Game = await import(root + 'game.js');
  const Loop = await import(root + 'engine/loop.js');
  const { resolveChoice, dismissEvent } = await import(root + 'systems/narrative.js');
  const Calls = await import(root + 'systems/calls.js');
  const { startResearch, availableResearch } = await import(root + 'systems/research.js');
  const { rollCandidate, hireAgent, maxAgents, hireCost,
          canReview } = await import(root + 'systems/agents.js');
  const { actionPromptAI, actionWriteCode, actionTalkToUsers } = await import(root + 'systems/founder.js');
  const { startProject, availableProjects } = await import(root + 'systems/projects.js');
  const { availableRounds, raiseOffer, acceptRound, upkeepOf, canCarry,
          runwayDays, burnPerDay } = await import(root + 'systems/economy.js');
  const { availableIntentions, toggleIntention, quarterDue,
          quarterState } = await import(root + 'systems/board.js');

  // `choose(n)` picks the deck card's button; without one the bot rolls its
  // own dice — `rand` above, which is a seeded stream when the caller asked
  // for one and `Math.random` when it did not.
  function step(s, { answerCards = true, choose = null } = {}) {
    // A first run parks the clock for the walkthrough and a session releases it
    // two seconds later. There is no session here.
    if (s.tutorialHold) s.tutorialHold = false;
    for (let i = 0; i < 3; i++) {
      if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s);
      else if (s.founder.focus > 5) actionWriteCode(s);
    }
    if (s.resources.insight < 20 && s.founder.focus > 20) actionTalkToUsers(s);
    const p = s.products[0];
    for (let i = 0; i < 4; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
    if (p && !p.launched && p.features.length >= 4) Game.doLaunch(s);
    if (!s.research.active) {
      const av = availableResearch(s).sort((a, b) => a.cost - b.cost);
      if (av.length) startResearch(s, av[0].id);
    }
    // §A1 made every fixed cost permanent, so the bot has to budget like a
    // founder or every measurement after it is a measurement of the bot. An
    // agent draws a wage that now rises with its level: hire while there is
    // runway, stop while there is not.
    // §A4 added the second half: a roster is bounded by the founder's attention
    // as well as by the wage bill, so the bot hires only while it could still
    // read the new one's work.
    if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3
        && (burnPerDay(s) <= 0 || runwayDays(s) > 120)) {
      const cand = rollCandidate(s);
      if (canReview(s, cand)) hireAgent(s, cand);
    }
    // §A2. One intention a quarter, because Act IV closes on keeping one and a
    // bot that never wrote anything down could never close it.
    if (!quarterDue(s) && !quarterState(s).intentions.length) {
      const iv = availableIntentions(s).filter((x) => !x.chosen);
      if (iv.length) toggleIntention(s, iv[0].id);
    }
    // The phone. A written ring holds the clock like a card does, so a bot that
    // never picked up would stall on day fourteen of every run. It says one
    // thing, sometimes two, and puts the phone down.
    if (answerCards && Calls.activeCall(s)) {
      const o = Calls.options(s);
      // This branch was the whole of `baseline.mjs`'s drift: a call holds the
      // clock, so whether the bot says something or hangs up decides whether
      // that step advanced a day at all, and 320 steps of it landed anywhere
      // between day 325 and day 355 from one fixed seed.
      if (o.length && rand() < 0.6) Calls.say(s, o[Math.floor(rand() * o.length)].id);
      else Calls.hangUp(s);
    }
    if (answerCards && s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
      const n = s.narrative.activeEvent.choices.length;
      if (n) resolveChoice(s, choose ? choose(n) : Math.floor(rand() * n));
      dismissEvent(s);
    }
    const rounds = availableRounds(s);
    if (rounds.length && s.company.cash < 5e5) {
      try { const offer = raiseOffer(s, rounds[0]); if (offer) acceptRound(s, offer); } catch {}
    }
    // A megaproject is a permanent line in the ledger, not a purchase. Build
    // only what today's profit could carry two and a half times over — and
    // `startProject` refuses anyway once the slots are full.
    const projs = availableProjects(s).filter((x) => x.available
      && (s.world.projectsBuilt?.[x.id] || 0) < 3
      && s.company.cash > x.cost * 4 && canCarry(s, upkeepOf(x.cost)));
    if (projs.length) startProject(s, projs[0].id);
    Loop.simulate(1);
  }

  function play(s, days, opts) { for (let d = 0; d < days; d++) step(s, opts); }

  // `rand` is handed back so a harness that needs its own dice — a card answer,
  // a coin flip between two probes — draws from the same seeded stream rather
  // than opening a second one beside it.
  return { step, play, Game, Loop, rand };
}
