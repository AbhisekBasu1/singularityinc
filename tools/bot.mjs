// ─────────────────────────────────────────────────────────────────────────────
// THE BOT — one autoplay loop, shared by every harness that needs a game to
// have actually happened. Extracted so the WebMCP tests reach Act III against
// the same play `simtest` measures balance against, rather than a second
// approximation of it that drifts.
// ─────────────────────────────────────────────────────────────────────────────

export async function makeBot(root = '../src/') {
  const Game = await import(root + 'game.js');
  const Loop = await import(root + 'engine/loop.js');
  const { resolveChoice, dismissEvent } = await import(root + 'systems/narrative.js');
  const { startResearch, availableResearch } = await import(root + 'systems/research.js');
  const { rollCandidate, hireAgent, maxAgents, hireCost } = await import(root + 'systems/agents.js');
  const { actionPromptAI, actionWriteCode, actionTalkToUsers } = await import(root + 'systems/founder.js');
  const { startProject, availableProjects } = await import(root + 'systems/projects.js');
  const { availableRounds, raiseOffer, acceptRound } = await import(root + 'systems/economy.js');

  // `choose(n)` picks the deck card's button; without one the bot rolls its
  // own dice, which is fine for a sample and useless for a pair.
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
    if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3) hireAgent(s, rollCandidate(s));
    if (answerCards && s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
      const n = s.narrative.activeEvent.choices.length;
      if (n) resolveChoice(s, choose ? choose(n) : Math.floor(Math.random() * n));
      dismissEvent(s);
    }
    const rounds = availableRounds(s);
    if (rounds.length && s.company.cash < 5e5) {
      try { const offer = raiseOffer(s, rounds[0]); if (offer) acceptRound(s, offer); } catch {}
    }
    const projs = availableProjects(s).filter((x) => x.available && s.company.cash > x.cost * 4);
    if (projs.length) startProject(s, projs[0].id);
    Loop.simulate(1);
  }

  function play(s, days, opts) { for (let d = 0; d < days; d++) step(s, opts); }

  return { step, play, Game, Loop };
}
