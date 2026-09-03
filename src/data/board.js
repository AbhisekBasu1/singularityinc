// ─────────────────────────────────────────────────────────────────────────────
// THE BOARD — §A6. Who sits on it, and what they ask for.
//
// A priced round buys somebody a seat. The seats are derived from the cap
// table rather than invented — one per `BOARD.EQUITY_PER_SEAT` of investor
// equity, named off the rounds that bought them, with Ellis Crane in the chair
// if he wrote a cheque — so a founder who raised twice and kept most of the
// company faces two people, and one who raised five times faces a room.
//
// An ASK is the quarterly business of that room. It is chosen from the state
// the board would actually be looking at — the growth line, the burn line, the
// roster, the price, the frontier — and it has the same shape as a quarterly
// intention, because it is one: a target set on the day of the meeting and
// judged at the next.
//
//   when(S)        may the board raise this at all
//   weight(S)      how badly it wants to, given what the numbers say
//   base(S)        the target, fixed on the day it is agreed
//   label(base, S) the ask, with its number in it
//   test(S, base)  kept, or not
//   accept(S, fx)  what saying yes costs today; may install a standing order
//
// The prose the chair speaks is on the cards in `events_board.js`. This file is
// the mechanism and the one line each ask is described by.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { runwayDays, burnPerDay, marketingMax } from '../systems/economy.js';
import { maxAgents } from '../systems/agents.js';

const N = (n) => Math.round(n).toLocaleString();
const M = (n) => {
  const v = Math.abs(n);
  if (v >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString();
};
const runway = (S) => { try { const r = runwayDays(S); return Number.isFinite(r) ? r : 9999; } catch { return 9999; } };
const bestProduct = (S) => (S.products || []).filter((p) => p.launched)
  .sort((a, b) => (b.mrr || 0) - (a.mrr || 0))[0] || null;

// The funds, in the order they arrive. Deterministic by round index, so the
// board never reshuffles itself between two renders of the same save.
export const FUNDS = [
  { name: 'Halberd Capital', person: 'Ellis Crane' },
  { name: 'Northgate Partners', person: 'Ana Reyes-Bell' },
  { name: 'Verity Growth', person: 'Tomás Idris' },
  { name: 'Coriander Fund III', person: 'Winnie Adeoye' },
  { name: 'Sable Sovereign', person: 'the delegation' },
];

export const ASKS = [
  { id: 'ba_growth', kind: 'growth', icon: '↗', colour: '#f5a623',
    name: 'Growth against the plan',
    desc: 'A user number, agreed in the room, reported at the next meeting.',
    when: (S) => totalUsers(S) >= 500,
    weight: (S) => (S.company.growthRate30 ?? 0) < 0.05 ? 3.2 : 1,
    base: (S) => Math.max(1000, Math.round(totalUsers(S) * 1.4)),
    label: (base) => `${N(base)} users by the next meeting`,
    test: (S, base) => totalUsers(S) >= base,
    // Saying yes is spending on it. The board does not accept a target with no
    // budget behind it, and the budget is the cost of the ask.
    accept: (S, fx) => {
      // Capped by the same ceiling the Product view's slider uses, so an ask
      // can never write a budget the founder could not have set by hand.
      const spend = Math.round(Math.min(marketingMax(S), Math.max(400, totalMrr(S) / 30 * 0.22)));
      S.company.marketingBudget = Math.max(S.company.marketingBudget || 0, spend);
      fx.focus(-8);
      return `The number goes in the minutes and the marketing line goes to ${M(spend)} a day to pay for it.`;
    } },

  { id: 'ba_burn', kind: 'burn', icon: '⌗', colour: '#ff4d5e',
    name: 'The burn',
    desc: 'Runway, in days, above a floor the board can live with.',
    when: (S) => burnPerDay(S) > 0 && runway(S) < 900,
    weight: (S) => runway(S) < 300 ? 3.6 : 0.8,
    base: (S) => Math.round(Math.max(220, Math.min(400, runway(S) * 1.25))),
    label: (base) => `${base} days of runway by the next meeting`,
    test: (S, base) => runway(S) >= base,
    accept: (S, fx) => {
      const cut = (S.company.marketingBudget || 0) + (S.company.infraSpend || 0);
      S.company.marketingBudget = 0; S.company.infraSpend = 0;
      fx.rep(-12);
      return cut > 0
        ? `Marketing and infrastructure spend stop that afternoon — ${M(cut)} a day, gone by Friday.`
        : 'There is nothing discretionary left to stop, which is itself the finding, and it goes in the minutes.';
    } },

  { id: 'ba_hire', kind: 'hire', icon: '◈', colour: '#4dd0e1',
    name: 'Headcount',
    desc: 'One more system on the roster, and the retainer to find it.',
    when: (S) => S.company.act >= 2 && S.agents.length < maxAgents(S),
    weight: (S) => S.agents.length < 3 ? 2.4 : 1.1,
    base: (S) => S.agents.length + 1,
    label: (base) => `${base} systems on the roster`,
    test: (S, base) => S.agents.length >= base,
    accept: (S, fx) => {
      const fee = Math.max(2000, Math.min(S.company.cash * 0.03, 250000));
      fx.cash(-fee);
      return `A search retainer of ${M(fee)} and a name on a slide by the end of the month.`;
    } },

  { id: 'ba_pivot', kind: 'pivot', icon: '⌘', colour: '#8b5cf6',
    name: 'One thing, properly',
    desc: 'Point the company at whatever is already paying, and leave the rest alone.',
    when: (S) => (S.products || []).filter((p) => p.launched).length >= 2,
    weight: () => 1.4,
    base: (S) => bestProduct(S)?.id || null,
    label: (base, S) => `${(S.products || []).find((p) => p.id === base)?.name || 'the earner'} is the company`,
    test: (S, base) => S.activeProductId === base,
    accept: (S, fx) => {
      const p = bestProduct(S);
      if (p) S.activeProductId = p.id;
      for (const q of S.products || []) if (q.launched && q.id !== p?.id) q.sentiment = Math.max(0, q.sentiment - 0.05);
      fx.focus(-6);
      return p ? `Everything points at ${p.name} from Monday. The other users notice inside a week.`
               : 'The minute says the company has one product. It has for a while.';
    } },

  { id: 'ba_price', kind: 'price', icon: '⛁', colour: '#34d399',
    name: 'Price',
    desc: 'Charge more. Find out what it was actually worth.',
    when: (S) => !!bestProduct(S) && totalMrr(S) > 3000,
    weight: (S) => (S.company.growthRate30 ?? 0) > 0.08 ? 1.8 : 0.9,
    base: (S) => Math.round((bestProduct(S)?.price || 10) * 1.2 * 100) / 100,
    label: (base) => `list price at $${base.toFixed(2)}`,
    test: (S, base) => (bestProduct(S)?.price || 0) >= base,
    accept: (S, fx) => {
      const p = bestProduct(S);
      if (p) { p.price = Math.round(p.price * 1.2 * 100) / 100; p.sentiment = Math.max(0, p.sentiment - 0.04); }
      fx.rep(-8);
      return p ? `The new price is live on Tuesday. Nine people cancel loudly and the rest do not write in.`
               : 'Agreed in principle, for a product that does not exist yet.';
    } },

  { id: 'ba_frontier', kind: 'frontier', icon: '✦', colour: '#ffffff',
    name: 'The frontier',
    desc: 'Everything into capability, for a quarter, on the record.',
    when: (S) => S.company.act >= 3,
    weight: (S) => (S.world?.race?.you || 0) > 0 && (S.resources.alignment ?? 0.5) > 0.4 ? 1.6 : 0.7,
    base: () => 'ascend',
    label: () => 'Ascend, held to the next meeting',
    test: (S) => S.company.directive === 'ascend',
    accept: (S, fx) => {
      S.company.directive = 'ascend';
      S.company.directiveSince = S.time.day;
      fx.align(-0.02);
      return 'The standing order changes in the room. Two of them want it minuted that the alignment line was raised and not answered.';
    } },

  { id: 'ba_safety', kind: 'safety', icon: '⛨', colour: '#60a5fa',
    name: 'The alignment line',
    desc: 'Slow down, publicly, before somebody makes you.',
    when: (S) => S.company.act >= 3
      && ((S.resources.alignment ?? 0.5) < 0.45 || (S.world?.regulatoryHeat || 0) > 45),
    weight: (S) => (S.world?.regulatoryHeat || 0) > 60 ? 3.0 : 1.5,
    base: (S) => Math.min(0.9, Math.round(((S.resources.alignment ?? 0.5) + 0.06) * 100) / 100),
    label: (base) => `alignment at ${base.toFixed(2)} by the next meeting`,
    test: (S, base) => (S.resources.alignment ?? 0) >= base,
    accept: (S, fx) => {
      const cost = Math.max(5000, S.company.cash * 0.02);
      fx.cash(-cost);
      fx.align(0.02);
      return `${M(cost)} of evaluation work that produces nothing anybody outside the building will ever see.`;
    } },
];

export const ASK_MAP = Object.fromEntries(ASKS.map((a) => [a.id, a]));
