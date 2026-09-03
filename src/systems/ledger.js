// ─────────────────────────────────────────────────────────────────────────────
// THE LEDGER — what moved today, and what moved it.
//
// The welcome-back briefing already had this shape: a handful of deltas and
// the headlines behind them. §B4 is the same instrument pointed at *today*,
// which is the day a founder can still do something about. Two snapshots — the
// day that opened and the day before it — kept on `S.company.today`, and the
// causes read from the same pure functions the views already print.
//
// Everything below is a pure function of `S`. `tickLedger` is the only writer
// and it runs once in the day hook.
//
// The causes are honest about what they are. Cash is exact: revenue minus each
// line of the bill, and whatever is left over is what your decisions cost or
// paid. The others name the drivers and let the residual say so.
// ─────────────────────────────────────────────────────────────────────────────
import { computeMods } from './modifiers.js';
import { totalUsers, totalMrr, explainProduct } from './product.js';
import { expenseBreakdown, dailyRevenue } from './economy.js';
import { founderOutput } from './founder.js';
import { specFx } from './agents.js';
import { explainAlignment } from './alignment.js';
import { FLOWS } from '../data/balance.js';

const WEEK = 8;   // today plus the seven behind it

// One day's reading. Everything here is a number the stat strip, the Desk or
// the Terminal already shows, so nothing is measured twice.
export function ledgerSnapshot(S) {
  let morale = 0, n = 0;
  for (const a of S.agents) if (a.status === 'active') { morale += a.morale || 0; n++; }
  return {
    d: Math.floor(S.time.day),
    cash: S.company.cash,
    users: totalUsers(S),
    mrr: totalMrr(S),
    val: S.company.valuation,
    debt: S.resources.techDebt,
    owed: S.company.debtOwed || 0,
    focus: S.founder.focus,
    align: S.resources.alignment,
    heat: S.world.regulatoryHeat || 0,
    approval: S.world.publicOpinion ?? 0.5,
    burnout: S.founder.burnout || 0,
    morale: n ? morale / n : 0,
    compute: S.resources.computeCap || 0,
    gdp: S.world.globalGdpShare || 0,
    race: S.world.race?.you ?? 0,
  };
}

// The day hook. `prev` is the reading the day opened on; `cur` is the reading
// it closed on, so the difference is exactly one day of the company.
export function tickLedger(S, day) {
  const t = (S.company.today ||= { day: 0, prev: null, cur: null, week: [] });
  const cur = ledgerSnapshot(S);
  t.prev = t.cur || cur;
  t.cur = cur;
  t.day = day;
  (t.week ||= []).push(cur);
  while (t.week.length > WEEK) t.week.shift();
  return t;
}

export function ledgerState(S) { return S?.company?.today || null; }

// ── Seven days ─────────────────────────────────────────────────────────────
// The chip beside a number on the stat strip. Null until there is a week of
// history, because "+0" on day two is a lie about a company two days old.
export function weekDelta(S, key) {
  const t = ledgerState(S);
  const w = t?.week;
  if (!w || w.length < 3) return null;
  const from = w[0], to = w[w.length - 1];
  if (!from || !to || from[key] == null || to[key] == null) return null;
  const days = Math.max(1, to.d - from.d);
  const delta = to[key] - from[key];
  return { delta, from: from[key], to: to[key], days,
           pct: from[key] !== 0 ? delta / Math.abs(from[key]) : null };
}

// ── The arc, as a series ───────────────────────────────────────────────────
// One sample every ten days for the whole run. Samples written before a key
// existed simply have no value for it, so they are dropped rather than plotted
// as a zero that never happened — a save from before §B3 draws a shorter line,
// not a false one.
export function arcSeries(S, key) {
  const arc = S?.company?.arc;
  if (!Array.isArray(arc)) return [];
  const out = [];
  for (const p of arc) { const v = p?.[key]; if (typeof v === 'number' && Number.isFinite(v)) out.push(v); }
  return out;
}

// ── Today ──────────────────────────────────────────────────────────────────
const KEYS = [
  { id: 'cash', label: 'Cash', kind: 'money' },
  { id: 'users', label: 'Users', kind: 'count' },
  { id: 'mrr', label: 'MRR', kind: 'money' },
  { id: 'debt', label: 'Tech debt', kind: 'count', invert: true },
  { id: 'focus', label: 'Focus', kind: 'count' },
  { id: 'align', label: 'Alignment', kind: 'align' },
];

export function tiny(kind) { return kind === 'align' ? 0.0005 : kind === 'money' ? 0.5 : 0.05; }

export function todayLedger(S, m = computeMods(S)) {
  const t = ledgerState(S);
  const cur = t?.cur || ledgerSnapshot(S);
  const prev = t?.prev || null;
  const causes = {
    cash: cashCauses(S, m, prev, cur),
    users: userCauses(S, m, prev, cur),
    mrr: mrrCauses(S, m, prev, cur),
    debt: debtCauses(S, m, prev, cur),
    focus: focusCauses(S, m, prev, cur),
    align: alignCauses(S, m),
  };
  // A cause below what the row itself would round to is noise, not a reason:
  // "revenue per user −$0.0" is the arithmetic showing through.
  const rows = KEYS.map((k) => ({
    ...k,
    now: cur[k.id],
    delta: prev ? cur[k.id] - prev[k.id] : null,
    causes: (causes[k.id] || []).filter((c) => c && Math.abs(c[1]) > tiny(k.kind))
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3),
  }));
  return { day: cur.d, ready: !!prev, rows, snapshot: cur, previous: prev };
}

// Exact: the bill is known to the line, so whatever the day did that the bill
// does not explain is what the founder's own decisions did.
function cashCauses(S, m, prev, cur) {
  const e = expenseBreakdown(S, m);
  const r = dailyRevenue(S, m);
  const named = [
    ['Revenue', r.revenue],
    ...(r.interest > 0.5 ? [['Interest earned', r.interest]] : []),
    ['Serving', -e.serving], ['Agents', -e.agents], ['Compute', -e.compute],
    ['Hosting', -e.hosting], ['Upkeep', -e.upkeep], ['Compliance', -e.compliance],
    ['Research', -e.research], ['Energy', -e.energy], ['Marketing', -e.marketing],
    ['Infrastructure', -e.infra], ['Debt service', -e.interest], ['Living', -e.personal],
  ];
  if (prev) {
    const modelled = r.total - e.total;
    const residual = (cur.cash - prev.cash) - modelled;
    if (Math.abs(residual) > Math.abs(modelled) * 0.02 + 1) {
      named.push([residual > 0 ? 'Money that arrived' : 'What you spent it on', residual]);
    }
  }
  return named;
}

function userCauses(S, m, prev, cur) {
  const p = S.products.find((x) => x.id === S.activeProductId) || S.products.find((x) => x.launched);
  if (!p || !p.launched) return [];
  const x = explainProduct(S, p, m);
  const gained = p.users * (x?.growth.total || 0);
  const churned = -p.users * (p.churnMonthly || 0) / 30;
  const out = [['Growth', gained], ['Churn', churned]];
  if (prev) {
    const residual = (cur.users - prev.users) - (gained + churned);
    if (Math.abs(residual) > Math.abs(gained) * 0.05 + 1) {
      out.push([residual > 0 ? 'Launches and decisions' : 'Incidents and decisions', residual]);
    }
  }
  return out;
}

function mrrCauses(S, m, prev, cur) {
  if (!prev) return [];
  const dUsers = cur.users - prev.users;
  const arpuNow = cur.users > 0 ? cur.mrr / cur.users : 0;
  const arpuWas = prev.users > 0 ? prev.mrr / prev.users : 0;
  return [
    ['More users', dUsers * arpuWas],
    ['Revenue per user', (arpuNow - arpuWas) * prev.users],
  ];
}

function debtCauses(S, m, prev, cur) {
  const fx = specFx(S);
  const ops = (S._lanes?.ops || 0) * FLOWS.OPS_DEBT_PER_WORK;
  const modelled = (fx.debt || 0) - ops - (m['+debtDecay'] || 0);
  const out = [
    ['Agents writing code', fx.debt || 0],
    ['Operations lane', -ops],
    ['Research & tooling', -(m['+debtDecay'] || 0)],
  ];
  // The daily flow does not explain a jump: incidents, a deprecated model and
  // half the deck add debt outright, and a day the number moved by twelve with
  // three-point-seven of flow behind it should say where the rest came from.
  if (prev) {
    const residual = (cur.debt - prev.debt) - modelled;
    if (Math.abs(residual) > Math.abs(modelled) * 0.1 + 0.5) {
      out.push([residual > 0 ? 'Incidents and decisions' : 'Paid down outright', residual]);
    }
  }
  return out;
}

function focusCauses(S, m, prev, cur) {
  const fo = founderOutput(S, m);
  const out = [[fo.focusDelta >= 0 ? 'Rest and recovery' : 'The hours you keep', fo.focusDelta]];
  if (prev) {
    const residual = (cur.focus - prev.focus) - fo.focusDelta;
    if (Math.abs(residual) > 0.5) out.push([residual > 0 ? 'Given back' : 'Direct actions and calls', residual]);
  }
  return out;
}

function alignCauses(S, m) {
  return explainAlignment(S, m).drift
    .filter((r) => r[3] === 'rate')
    .map((r) => [r[0], r[1]]);
}
