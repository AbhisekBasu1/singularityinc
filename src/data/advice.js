// ─────────────────────────────────────────────────────────────────────────────
// FIELD NOTES — contextual coaching. Always shows the single most relevant
// lever right now. Teaches the systems without a tutorial.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { money } from '../engine/format.js';
import { runwayDays, burnPerDay, bankruptcyFloor } from '../systems/economy.js';
import { activeProduct } from '../engine/state.js';
import { maxAgents } from '../systems/agents.js';
import { featureCost } from '../systems/product.js';

const N = [];
const n = (id, priority, when, title, body, opts = {}) => N.push({ id, priority, when, title, body, ...opts });

// Urgency first — these interrupt everything.
// The comeback verbs have names. Crane's bridge is a phone topic in calls2.js,
// gated the same way it is gated there; the acquisition card is the deck's
// own rescue, and it is only worth naming while it can still be drawn.
const craneBridge = (S) => (S.narrative.relationships?.crane?.arc || 0) >= 1 && !S.narrative.flags?.crane_bridge
  && runwayDays(S) < 60;
const bridgeSpent = (S) => !!S.narrative.flags?.crane_bridge;
const acquirerOut = (S) => !S.narrative.seen?.e_acquisition_offer && S.company.act >= 2 && S.company.act <= 3
  && S.company.valuation > 8e6;
const craneLine = (S) => craneBridge(S) ? ' **Call Crane** — he has bridged founders before, and he picks up when the runway is short.'
  : bridgeSpent(S) ? ' Crane\'s bridge is spent; he will not wire twice.' : '';
const acquirerLine = (S) => acquirerOut(S) ? ' An acquirer would still take this company: if the offer comes, it is a way out, not a defeat.' : '';
// §B8. The floor, in a sentence. It is a negative number that scales with the
// valuation, and the run ends when cash goes under it — not at zero, which is
// where every readout in the game stops counting.
const floorNote = (S) => {
  const floor = bankruptcyFloor(S);
  const burn = burnPerDay(S);
  const room = S.company.cash - floor;
  if (burn <= 0) return `Insolvency is at **${money(floor)}**, and you are not falling toward it.`;
  return `Insolvency is at **${money(floor)}**, not at zero — about **${Math.max(0, Math.floor(room / burn))} days** from here at this burn.`;
};

n('runway_critical', 100, (S) => runwayDays(S) < 20 && S.company.cash > 0,
  'You are about to run out of money',
  (S) => `Roughly **${Math.floor(runwayDays(S))} days** of cash left, and then a further stretch below zero before it is over — ${floorNote(S).toLowerCase()} Cut agent upkeep, turn on pricing, raise a round, or take a consulting gig.${craneLine(S)} Doing nothing is also a decision.`,
  { tone: 'red' });
// §B8. Going negative is a window, not a cliff — and the window has a number on
// it that the game has never once shown anybody. `bankruptcyFloor` scales with
// the valuation, so a big company has further to fall and a small one has days
// rather than months. Both, in the note that fires the moment cash turns.
n('broke', 100, (S) => S.company.cash < 0,
  'Cash is negative',
  (S) => `Day ${Math.floor(S.company.emergencyDays || 1)} in the red. Marketing and infrastructure spend are frozen, reputation is bleeding, and after a week agents start being spun down automatically. ${floorNote(S)} Release agents yourself, cut compute, raise prices, or raise money — in that order of speed.${craneLine(S)}${acquirerLine(S)}`,
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
  (S) => `You have **${Math.round(S.resources.research)}** unspent points. A finished node never expires and never has to be maintained. Pick one.`,
  { tone: 'amber', view: 'research' });
n('no_agents', 72, (S) => S.agents.length === 0 && S.company.cash > 1500 && S.time.day > 8,
  'You are the bottleneck',
  () => `Every task waits on you to describe it. One persistent agent works while you sleep and never gets tired of the boring part.`,
  { tone: 'amber', view: 'agents' });
n('roster_space', 55, (S) => S.agents.length > 0 && S.agents.length < maxAgents(S) && S.company.cash > 40000,
  'You have an empty agent slot',
  (S) => `${maxAgents(S) - S.agents.length} slot(s) free and the cash to fill them. An empty slot draws no wage and does no work; the wage is the cheaper half.`,
  { tone: 'cyan', view: 'agents' });
n('ready_to_ship', 82, (S) => { const p = activeProduct(S); return p && S.settings.autoShip === false && S.resources.code >= featureCost(S, p); },
  'You have enough code to ship',
  () => `Hit **Ship Feature** on the Desk (or press **S**). Code in the buffer is not in front of anybody until you do.`,
  { tone: 'green' });
n('not_launched', 78, (S) => { const p = activeProduct(S); return p && !p.launched && p.features.length >= 3; },
  'It is ready enough to launch',
  () => `Three features is a product. Launch strength comes from quality, polish and reputation — and the clock is not free.`,
  { tone: 'green', view: 'product' });
n('no_pricing', 70, (S) => { const p = activeProduct(S); return p && p.launched && p.users > 250 && totalMrr(S) < 20; },
  'You are not charging anyone',
  () => `Every one of them costs you something to serve and none of them pays for it. Set a pricing model on the Product screen.`,
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
  () => `The balance is larger than anything queued against it. Megaprojects turn it into compute, energy and leverage, which the balance sheet does not do on its own.`,
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
  () => `Speed controls are in the top right. Event cards suspend time while they are open and release it when you close them, so nothing gets missed.`,
  { tone: 'dim' });

// Calm state — flavour + long-run guidance.
n('steady', 5, () => true, 'Steady',
  (S) => S.company.act >= 4
    ? `Nothing is on fire. This is the week research, compute and the projects nobody will notice for two years actually move.`
    : `Nothing urgent. Ship, talk to users, and keep the debt down. Most of a good quarter is made of weeks that look like this one.`,
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
