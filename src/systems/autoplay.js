// ─────────────────────────────────────────────────────────────────────────────
// AUTOPLAY — a plain founder, played by the machine.
//
// One bot for everything in the browser that needs a run to have already
// happened: the late start at the threshold ("Quick tour — Act III") and the dev
// harness's fast-forward. `tools/bot.mjs` is its node-side twin, and the two
// should keep the same shape so a state the tests reach is a state a player
// can reach.
// ─────────────────────────────────────────────────────────────────────────────
import { activeProduct } from '../engine/state.js';
import * as Loop from '../engine/loop.js';
import { silence } from '../engine/bus.js';
import { LATE_START } from '../data/balance.js';
import { doShipFeature, doLaunch } from '../game.js';
import { actionPromptAI, actionWriteCode, actionTalkToUsers } from './founder.js';
import { startResearch, availableResearch } from './research.js';
import { rollCandidate, hireAgent, maxAgents, hireCost } from './agents.js';
import { startProject, availableProjects } from './projects.js';
import { availableRounds, raiseOffer, acceptRound } from './economy.js';
import { resolveChoice, dismissEvent } from './narrative.js';
import { markDirty } from './modifiers.js';
import { rand } from '../engine/rng.js';

// Doors that end the run — an acquisition offer taken, a promise honoured. A
// fast-forward has to land in a game, not on a title card.
const ENDERS = /Take it\. Life-changing|Take it\. This is a good outcome|Honour it\. You said a number/;

// One day of a competent, unimaginative founder.
export function step(S) {
  for (let i = 0; i < 3; i++) {
    if (S.founder.focus > 30 && S.company.cash > 200) actionPromptAI(S);
    else if (S.founder.focus > 5) actionWriteCode(S);
  }
  if (S.resources.insight < 20 && S.founder.focus > 20) actionTalkToUsers(S);
  const p = activeProduct(S);
  for (let i = 0; i < 4; i++) { const r = doShipFeature(S); if (!r.ok) break; }
  if (p && !p.launched && p.features.length >= 4) doLaunch(S);
  if (!S.research.active) {
    const av = availableResearch(S).sort((a, b) => a.cost - b.cost);
    if (av.length) startResearch(S, av[0].id);
  }
  if (S.agents.length < maxAgents(S) && S.company.cash > hireCost(S) * 3) hireAgent(S, rollCandidate(S));
  if (S.company.directive === 'none') { S.company.directive = 'ship'; S.company.directiveSince = S.time.day; markDirty(); }
  if (S.narrative.activeEvent && !S.narrative.activeEvent.outcome) {
    // Any door but the ones that end the run, at random from the seeded
    // stream — always taking the first door picked the dear one too often and
    // a run could sit in Act II for a thousand days.
    const ch = S.narrative.activeEvent.choices || [];
    const open = ch.map((c, i) => (ENDERS.test(c.label) ? -1 : i)).filter((i) => i >= 0);
    resolveChoice(S, open.length ? open[Math.floor(rand() * open.length)] : 0);
    dismissEvent(S);
  }
  const rounds = availableRounds(S);
  if (rounds.length && S.company.cash < 5e5) {
    try { const offer = raiseOffer(S, rounds[0]); if (offer) acceptRound(S, offer); } catch {}
  }
  const projs = availableProjects(S).filter((x) => x.available && S.company.cash > x.cost * 4);
  if (projs.length) startProject(S, projs[0].id);
  Loop.simulate(1);
}

// Play up to `days` days, or until `until(S)` says so. The real-time floor is
// off so the deck draws at pace, the bus is silent so nothing the machine does
// reaches a toast or an act card, and no card is left open at the end.
export function play(S, days, { until } = {}) {
  const wasRealtime = S.meta.realtime;
  S.meta.realtime = false;
  const unsilence = silence();
  let played = 0;
  try {
    for (let d = 0; d < days; d++) {
      if (S.ending || until?.(S)) break;
      step(S);
      played++;
    }
  } finally {
    unsilence();
    S.meta.realtime = wasRealtime;
  }
  if (S.narrative.activeEvent) {
    if (!S.narrative.activeEvent.outcome) resolveChoice(S, 0);
    dismissEvent(S);
  }
  markDirty();
  return played;
}

// The late start. The machine plays the garage and the machine; the founder
// walks in at Act III with the world's whole hand on the table. Legacy pays
// `LATE_START.LEGACY_MULT`, because that much of the run was not theirs, and
// the walkthroughs are off, because every chapter's subject is behind them —
// the manual can replay any of them.
export function fastForwardToAct(S, act = LATE_START.ACT) {
  const played = play(S, LATE_START.MAX_DAYS, { until: (s) => s.company.act >= act });
  S.settings.lateStart = 'act' + act;
  S.meta.tutorial.off = true;
  // The machine plays hard and hands over a founder near burnout. The founder
  // walks in rested: the year was the machine's, the exhaustion need not be.
  S.founder.focus = S.founder.focusMax;
  S.founder.burnout = Math.min(S.founder.burnout || 0, LATE_START.HANDOVER_BURNOUT);
  return { played, act: S.company.act, day: Math.floor(S.time.day) };
}

// A seed can stall — one in six sat in Act II past the cap. `makeGame` starts
// a fresh run with the founder's own choices and a new seed; the first one
// that reaches the act is the run. The last try is kept whatever it reached.
export function lateStart(makeGame, act = LATE_START.ACT) {
  let r = null;
  for (let i = 0; i < LATE_START.TRIES; i++) {
    const s = makeGame();
    r = { ...fastForwardToAct(s, act), tries: i + 1 };
    if (r.act >= act) break;
  }
  return r;
}
