// ─────────────────────────────────────────────────────────────────────────────
// FIELD NOTES — contextual coaching. Always shows the single most relevant
// lever right now. Teaches the systems without a tutorial.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { runwayDays, burnPerDay } from '../systems/economy.js';
import { activeProduct } from '../engine/state.js';
import { maxAgents } from '../systems/agents.js';
import { featureCost } from '../systems/product.js';

const N = [];
const n = (id, priority, when, title, body, opts = {}) => N.push({ id, priority, when, title, body, ...opts });

// Urgency first — these interrupt everything.
n('runway_critical', 100, (S) => runwayDays(S) < 20 && S.company.cash > 0,
  'You are about to run out of money',
  (S) => `Roughly **${Math.floor(runwayDays(S))} days** of cash left. Cut agent upkeep, turn on pricing, raise a round, or take a consulting gig. Doing nothing is also a decision.`,
  { tone: 'red' });
n('broke', 100, (S) => S.company.cash < 0,
  'Cash is negative',
  (S) => `Day ${Math.floor(S.company.emergencyDays || 1)} in the red. Marketing and infrastructure spend are frozen, reputation is bleeding, and after a week agents start being spun down automatically. Release agents yourself, cut compute, raise prices, or raise money — in that order of speed.`,
  { tone: 'red' });
n('burnout', 92, (S) => S.founder.burnout > 45,
  'You are burning out',
  (S) => `Burnout **${Math.round(S.founder.burnout)}**. Push Rest above 20% in the allocation, or the game will do it for you and take a week doing it.`,
  { tone: 'red' });
n('debt_crisis', 88, (S) => S.resources.techDebt > 220,
  'The codebase is fighting you',
  (S) => `Tech debt **${Math.round(S.resources.techDebt)}**. It slows every agent, erodes reliability and causes incidents. Put an agent on **Operations**, or research the Engineering branch.`,
  { tone: 'red' });
n('align_low', 86, (S) => S.company.act >= 3 && S.resources.alignment < 0.38,
  'Your systems are drifting',
  () => `Alignment is low. Lower agent **autonomy**, or research *Interpretability* and *Constitutional Alignment*. Below 0.3 the failure modes stop being funny.`,
  { tone: 'red' });

// Missed levers.
n('no_research', 74, (S) => !S.research.active && S.resources.research > 8,
  'Research points are idle',
  (S) => `You have **${Math.round(S.resources.research)}** unspent points. Nothing compounds harder than the tech tree. Pick a node.`,
  { tone: 'amber', view: 'research' });
n('no_agents', 72, (S) => S.agents.length === 0 && S.company.cash > 1500 && S.time.day > 8,
  'You are the bottleneck',
  () => `Every task waits on you to describe it. One persistent agent works while you sleep and never gets tired of the boring part.`,
  { tone: 'amber', view: 'agents' });
n('roster_space', 55, (S) => S.agents.length > 0 && S.agents.length < maxAgents(S) && S.company.cash > 40000,
  'You have an empty agent slot',
  (S) => `${maxAgents(S) - S.agents.length} slot(s) free and cash to fill them. Idle capacity is the most expensive thing you own.`,
  { tone: 'cyan', view: 'agents' });
n('ready_to_ship', 82, (S) => { const p = activeProduct(S); return p && S.settings.autoShip === false && S.resources.code >= featureCost(S, p); },
  'You have enough code to ship',
  () => `Hit **Ship Feature** on the Desk (or press **S**). Code sitting in the buffer does nothing for anybody.`,
  { tone: 'green' });
n('not_launched', 78, (S) => { const p = activeProduct(S); return p && !p.launched && p.features.length >= 3; },
  'It is ready enough to launch',
  () => `Three features is a product. Launch strength comes from quality, polish and reputation — and the clock is not free.`,
  { tone: 'green', view: 'product' });
n('no_pricing', 70, (S) => { const p = activeProduct(S); return p && p.launched && p.users > 250 && totalMrr(S) < 20; },
  'You are not charging anyone',
  () => `Users without revenue is a hobby with a server bill. Set a pricing model on the Product screen.`,
  { tone: 'amber', view: 'product' });
n('low_insight', 60, (S) => S.resources.insight < 8 && S.stats.featuresShipped > 3,
  'You are building blind',
  () => `Insight decides whether the next feature is the *right* feature. Talk to users, or push the Users allocation up.`,
  { tone: 'amber' });
n('model_upgrade', 58, (S) => S.agents.length >= 2 && S.agents.every((a) => a.model === 'nano') && S.research.done.model_swift,
  'Your agents are all on the cheapest model',
  () => `Model tier is the single biggest lever on output. Upgrading one agent to Swift-3 is worth more than hiring two more Nanos.`,
  { tone: 'cyan', view: 'agents' });
n('reliability', 62, (S) => { const p = activeProduct(S); return p && p.launched && p.reliability < 0.75 && p.users > 500; },
  'Reliability is costing you users',
  () => `Churn scales directly with downtime. Assign an agent to **Operations**, or research the Infrastructure branch.`,
  { tone: 'amber' });
n('portfolio', 56, (S) => S.company.act >= 3 && S.products.filter((p) => p.launched).length === 1 && S.company.cash > 8e7,
  'One product is a company. Two is a portfolio.',
  () => `A second product in a *different* category cross-sells (−8% churn), raises revenue per user, and launches harder because you already have distribution. Same category and they eat each other.`,
  { tone: 'cyan', view: 'product' });
n('cash_idle', 50, (S) => S.company.act >= 3 && S.company.cash > 5e8 && !(S.world.projectQueue || []).length,
  'Cash is sitting still',
  () => `Idle capital does nothing. Megaprojects convert the balance sheet into compute, energy and leverage.`,
  { tone: 'cyan', view: 'world' });
n('race_behind', 80, (S) => { const r = S.world.race; if (!r || r.crossed) return false;
    const best = Math.max(...Object.values(r.labs).filter((l) => l.alive).map((l) => l.progress), 0);
    return best > 30; },
  'Somebody is closing on the frontier',
  () => `Rival labs accelerate when they fall behind. The Intelligence branch and raw compute are the only two things that move your number.`,
  { tone: 'red', view: 'world' });
n('act_ready', 84, (S) => { const g = S._actHint; return g && g.ready && g.wait > 0; },
  'You have met the threshold',
  (S) => `The numbers for the next act are already there. The world just needs time to catch up — **${Math.ceil(S._actHint.wait)} days**.`,
  { tone: 'green' });
n('fundraise', 48, (S) => S.unlocks.fundraising && runwayDays(S) < 120 && S.company.rounds.length < 2,
  'You could raise on this chart',
  () => `Money buys speed. It costs a permanent share of everything after. Both of those are true at the same time.`,
  { tone: 'cyan', view: 'market' });
n('skill_points', 66, (S) => S.founder.skillPoints > 0,
  'You have unspent skill points',
  (S) => `${S.founder.skillPoints} available. Engineering multiplies code, Prompting multiplies AI output, Ops multiplies your whole roster.`,
  { tone: 'green' });

n('autoship', 64, (S) => S.settings.autoShip === false && S.stats.featuresShipped >= 6,
  'You can stop clicking Ship',
  () => `Turn **Auto** on in the Build panel and features ship the moment the code is there. You have done it by hand enough times to have earned that.`,
  { tone: 'cyan' });
n('threads_open', 68, (S) => S.feed.some((f) => f.thread && !f.resolved),
  'Someone is waiting on you',
  () => `There are open threads in the live feed. They take one click, they are cheap, and answering them is most of what reputation actually is.`,
  { tone: 'amber' });
n('approach', 54, (S) => S.founder.approach === 'describe' && S.stats.promptsWritten > 25
  && (S.research.done.prompt_library || S.research.done.rag),
  'You are still prompting the fast way',
  () => `**How you prompt** changes the whole distribution. *Precise spec* trades focus for almost no debt. *Give it examples* spends Insight and buys fit. *Let it decide* is a lottery with a very good top prize.`,
  { tone: 'cyan' });
n('speed_up', 46, (S) => S.settings.speed === 1 && S.time.day > 40,
  'You can run the clock faster',
  () => `Speed controls are in the top right. Events pause the world automatically, so nothing gets missed.`,
  { tone: 'dim' });

// Calm state — flavour + long-run guidance.
n('steady', 5, () => true, 'Steady',
  (S) => S.company.act >= 4
    ? `Nothing is on fire. That is when the compounding does its work — research, compute, and the projects nobody will notice for two years.`
    : `Nothing urgent. Ship, talk to users, and keep the debt down. Boring weeks are what good quarters are made of.`,
  { tone: 'dim' });

export const ADVICE = N;

export function currentAdvice(S) {
  let best = null;
  for (const a of N) {
    let ok = false;
    try { ok = a.when(S); } catch (e) { ok = false; }
    if (ok && (!best || a.priority > best.priority)) best = a;
  }
  if (!best) return null;
  return { ...best, text: typeof best.body === 'function' ? best.body(S) : best.body };
}
