// ─────────────────────────────────────────────────────────────────────────────
// DIRECTIVES — one standing order at a time. The bonus ramps the longer you
// hold it, so commitment is rewarded and thrashing is not.
// ─────────────────────────────────────────────────────────────────────────────
import { ORDERS } from './balance.js';

export const RAMP_DAYS = 30;      // days to reach full effect
export const MIN_EFFECT = 0.35;   // fraction of the bonus you get on day one

export const DIRECTIVES = [
  { id: 'none', name: 'No standing order', icon: '○', color: 'var(--ink-3)',
    desc: 'Everyone uses their judgement. Nothing is amplified and nothing is starved.',
    flavour: 'A perfectly respectable way to run a company, and a slightly slower one.',
    mods: {} },

  { id: 'ship', name: 'Ship It', icon: '⌘', color: '#4dd0e1', act: 1,
    desc: '+45% code output. +30% tech debt.',
    flavour: '"We will fix it in the version that exists." — every founder who was right, once',
    mods: { codeRate: 1.45, debtRate: 1.30 } },

  { id: 'listen', name: 'Talk To Everyone', icon: '☎', color: '#00e5a0', act: 1,
    desc: '+75% Insight. −20% code output.',
    flavour: 'The fastest way to stop building the wrong thing is to stop building for a week.',
    mods: { insightRate: 1.75, codeRate: 0.80 } },

  { id: 'landgrab', name: 'Land Grab', icon: '↗', color: '#f5a623', act: 2,
    desc: '+45% user growth, −25% churn. −30% revenue.',
    flavour: 'Take the market now. Monetise it when nobody else can reach it.',
    mods: { userMult: 1.45, churn: 0.75, mrrMult: 0.70 } },

  { id: 'harvest', name: 'Harvest', icon: '⌗', color: '#34d399', act: 2,
    desc: '+45% revenue. −30% user growth.',
    flavour: 'Stop buying growth. Find out what the thing is actually worth.',
    mods: { mrrMult: 1.45, arpu: 1.15, userMult: 0.70 } },

  { id: 'paydown', name: 'Pay It Down', icon: '⚙', color: '#7c8a99', act: 1,
    desc: '+110% Operations output, +debt decay, −45% incidents. −30% build.',
    flavour: 'A whole quarter where nothing visible happens and everything gets better.',
    mods: { opsLaneOutput: 2.10, '+debtDecay': 4, incidentChance: 0.55, buildLaneOutput: 0.70 } },

  { id: 'deep', name: 'Go Deep', icon: '⌬', color: '#8b5cf6', act: 2,
    desc: '+55% research rate. −25% growth lane.',
    flavour: 'Disappear for six weeks. Come back two years ahead.',
    mods: { researchRate: 1.55, growthLaneOutput: 0.75 } },

  { id: 'fortify', name: 'Fortify', icon: '⛨', color: '#60a5fa', act: 3,
    desc: '−60% incidents, reliability floor 0.90, −35% regulatory heat growth. −20% everything else.',
    flavour: 'Nothing breaks. Nothing moves quickly either. That is the trade.',
    mods: { incidentChance: 0.40, reliabilityFloor: 0.90, '+heatDecay': 2.5, allLanes: 0.80 } },

  { id: 'war', name: 'Total War', icon: '⚔', color: '#ff4d5e', act: 3,
    desc: 'Rivals grow 55% slower. +25% growth. −40% reputation gain, +regulatory heat.',
    flavour: 'You have decided that this market has room for exactly one company.',
    mods: { competitorGrowth: 0.45, userMult: 1.25, repRate: 0.60, '+heatDecay': -1.5 } },

  { id: 'legitimacy', name: 'Earn It', icon: '♡', color: '#f472b6', act: 4,
    desc: '+public approval drift, +alignment, +50% reputation. −25% code and revenue.',
    flavour: 'Spend a year being the company you keep telling people you are.',
    mods: { '+opinionDrift': 0.008, repRate: 1.50, codeRate: 0.75, mrrMult: 0.75, alignBoost: 1 } },

  { id: 'ascend', name: 'Ascend', icon: '✦', color: '#ffffff', act: 4,
    desc: '+80% research, +30% agent output. −45% revenue, −alignment.',
    flavour: 'Everything into the frontier. Everything.',
    mods: { researchRate: 1.80, agentOutput: 1.30, mrrMult: 0.55, alignDrain: 1 } },
];

export const DIRECTIVE_MAP = Object.fromEntries(DIRECTIVES.map((d) => [d.id, d]));

// ── §A23a. The stack ────────────────────────────────────────────────────────
// `autonomous_corporation` is the company running itself, and the verb it buys
// is more than one policy at a time. Three rules hold it together:
//
//   **Slot zero is still `S.company.directive`.** Everything written against a
//   single standing order — The Long View, the race's Ascend push, the card
//   that asks why you have held one thing for a hundred and twenty days, the
//   context menu — keeps working untouched, and The Long View counts the first
//   slot because the first slot is the one the founder has always had.
//
//   **Each slot ramps on its own `since`.** Adding a third order does not
//   reset the first; commitment is still the mechanic.
//
//   **The slots share a budget.** Three orders are three weaker orders, never
//   three full ones. Below `ORDERS.BUDGET` nothing is scaled at all, which is
//   why a single order behaves exactly as it did before this existed.
//
// All pure. `systems/modifiers.js` reads `orderStrengths`; nothing here writes.

export function maxOrders(S) {
  return S?.research?.done?.[ORDERS.REQ] ? ORDERS.MAX_SLOTS : 1;
}

// Every slot the founder is actually running, slot zero first. A slot holding
// `none`, an unknown id, or a duplicate of an earlier slot is not an order.
export function activeOrders(S) {
  const out = [];
  const seen = new Set();
  const push = (id, since, slot) => {
    if (!id || id === 'none' || !DIRECTIVE_MAP[id] || seen.has(id)) return;
    seen.add(id);
    out.push({ slot, id, since: since || 0, dir: DIRECTIVE_MAP[id] });
  };
  push(S?.company?.directive, S?.company?.directiveSince, 0);
  const extra = S?.company?.orders;
  if (Array.isArray(extra)) {
    const cap = maxOrders(S);
    for (let i = 0; i < extra.length && i + 1 < cap; i++) push(extra[i]?.id, extra[i]?.since, i + 1);
  }
  return out;
}

function rampOf(S, since) {
  const held = Math.max(0, (S?.time?.day || 0) - (since || 0));
  return MIN_EFFECT + (1 - MIN_EFFECT) * Math.min(1, held / RAMP_DAYS);
}

// The strength each active order is actually applied at, after the shared
// budget. Read by `computeMods` and printed by the Desk, so both agree.
export function orderStrengths(S) {
  const rows = activeOrders(S).map((o) => ({ ...o, raw: rampOf(S, o.since) }));
  const total = rows.reduce((a, r) => a + r.raw, 0);
  const scale = total > ORDERS.BUDGET ? ORDERS.BUDGET / total : 1;
  for (const r of rows) r.k = r.raw * scale;
  return rows;
}

// Slot zero's strength, budget included. The signature and the meaning are
// unchanged for every caller that predates the stack.
export function directiveStrength(S) {
  const first = orderStrengths(S).find((r) => r.slot === 0);
  return first ? first.k : 0;
}

// The founder's hand. Slot zero is written by `main.js` the way it always was;
// this is for the slots the research node opened. Pure of side effects beyond
// the write — the caller marks the modifier cache dirty.
export function setOrder(S, slot, id) {
  const n = Math.floor(slot);
  if (!(n >= 1) || n >= maxOrders(S)) return { ok: false, reason: 'no-slot' };
  const d = DIRECTIVE_MAP[id];
  if (id !== 'none' && (!d || (d.act && S.company.act < d.act))) return { ok: false, reason: 'locked' };
  S.company.orders ??= [];
  while (S.company.orders.length < n) S.company.orders.push(null);
  const at = n - 1;
  if (id === 'none') { S.company.orders[at] = null; return { ok: true, id: 'none' }; }
  // The same order twice is one order with a wasted slot; refuse it rather
  // than silently dropping it in `activeOrders` and leaving a lit button.
  if (S.company.directive === id) return { ok: false, reason: 'duplicate' };
  if (S.company.orders.some((o, i) => i !== at && o?.id === id)) return { ok: false, reason: 'duplicate' };
  S.company.orders[at] = { id, since: S.time.day };
  return { ok: true, id };
}
