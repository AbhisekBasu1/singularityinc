// ─────────────────────────────────────────────────────────────────────────────
// READOUTS — the numbers the world can see, in one list.
//
// The console's topbar strip, the workstation's menu bar and the workstation's
// Readouts widget are one instrument in three housings. They share this list,
// these ids and this paint pass, so a stat added here arrives in all three with
// the same tooltip, the same colour rule and the same flash — and the flash
// keeps its one hard-won property: it marks a jump worth noticing rather than
// strobing seven times a second on a valuation that rises every tick.
// ─────────────────────────────────────────────────────────────────────────────
import { fmt, money, moneyExact, pct, runwayText } from '../engine/format.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { burnPerDay, runwayDays } from '../systems/economy.js';
import { openThreadCount } from '../systems/feed.js';
import { esc } from './dom.js';

export const STATS = [
  { id: 'cash', label: 'Cash', get: (S) => S.company.cash, fmt: (v) => money(v),
    color: (v) => (v < 0 ? 'var(--red)' : 'var(--green)'),
    tip: (S) => S.company.cash < 0
      ? `**EMERGENCY** — day ${Math.floor(S.company.emergencyDays || 1)} in the red.\nSpend is frozen and reputation is bleeding. Agents start being spun down after a week.`
      : `Exact: **${moneyExact(S.company.cash)}**\nBurn: **${money(Math.max(0, burnPerDay(S)))}/day**\nRevenue: **${money(S.company.revenueToday || 0)}/day**` },
  { id: 'runway', label: 'Runway', small: true, get: (S) => runwayDays(S),
    fmt: (v, S) => runwayText(S.company.cash, burnPerDay(S)),
    color: (v) => (v === Infinity ? 'var(--green)' : v < 25 ? 'var(--red)' : v < 70 ? 'var(--amber)' : 'var(--ink)'),
    tip: (S) => { const r = runwayDays(S); return r === Infinity ? 'You are profitable. Cash is going **up**.' : `**${Math.floor(r)}** days at the current burn rate.`; },
    noTick: true },
  { id: 'mrr', label: 'MRR', get: (S) => totalMrr(S), fmt: (v) => money(v), color: () => 'var(--cyan)',
    tip: (S) => `Annual run-rate: **${money(totalMrr(S) * 12)}**\n30-day growth: **${((S.company.growthRate30 ?? 0) * 100).toFixed(1)}%**` },
  { id: 'users', label: 'Users', get: (S) => totalUsers(S), fmt: (v) => fmt(v), color: () => 'var(--ink)',
    tip: (S) => `Peak: **${fmt(S.stats.peakUsers)}**\nChurn: **${pct(S.products[0]?.churnMonthly ?? 0, 1)}/mo**` },
  { id: 'val', label: 'Valuation', get: (S) => S.company.valuation, fmt: (v) => money(v), color: () => 'var(--amber)',
    tip: (S) => `Your stake: **${pct(S.company.equity.founder, 1)}** = **${money(S.company.valuation * S.company.equity.founder)}**` },
  { id: 'compute', label: 'Compute', small: true, when: (S) => S.company.act >= 3,
    get: (S) => S.resources.computeCap, fmt: (v) => fmt(v) + ' PF', color: () => 'var(--violet)',
    tip: () => 'Petaflop-days of dedicated compute. Drives research rate and model capability.' },
  { id: 'gdp', label: 'World GDP', small: true, when: (S) => S.company.act >= 4,
    get: (S) => S.world.globalGdpShare, fmt: (v) => (v * 100).toFixed(2) + '%', color: () => 'var(--pink)',
    tip: () => 'Share of global economic output flowing through systems you own.' },
];

// The order stats are dropped in when the housing runs out of room. Cash and
// runway are the two that end runs; they are the last to go.
export const STAT_PRIORITY = ['gdp', 'compute', 'val', 'users', 'mrr', 'runway', 'cash'];

export function visibleStats(S) {
  return STATS.filter((st) => !st.when || st.when(S));
}

// ── The flash ───────────────────────────────────────────────────────────────
// A 0.5s animation must never be restarted while it is still running, and only
// a real move counts — valuation drifts upward on most ticks, and retriggering
// on every increase made the number strobe rather than tick.
const lastVals = {}, lastTickAt = {}, tickBase = {};
const TICK_MIN_MS = 900;
const TICK_MIN_GROWTH = 1.01;

export function resetTicks() {
  for (const bag of [lastVals, lastTickAt, tickBase]) for (const k of Object.keys(bag)) delete bag[k];
}

function shouldFlash(st, raw, now) {
  const prev = lastVals[st.id];
  return !st.noTick && prev !== undefined && raw > prev
    && now - (lastTickAt[st.id] || 0) >= TICK_MIN_MS
    && raw >= (tickBase[st.id] ?? prev) * TICK_MIN_GROWTH;
}

// The markup for one housing's strip. Ids are shared so `paintStats` below
// works for every housing without being told which one it is looking at.
export function statsHtml(S, { prefix = 'tb', only = null } = {}) {
  const keep = only ? new Set(only) : null;
  return visibleStats(S).filter((st) => !keep || keep.has(st.id)).map((st) => `
    <div class="stat" id="${prefix}-wrap-${st.id}" data-stat="${st.id}" data-tip="" data-tip-title="${esc(st.label)}">
      <div class="stat-label">${esc(st.label)}</div>
      <div class="stat-value ${st.small ? 'sm' : ''}" id="${prefix}-${st.id}">—</div>
    </div>`).join('');
}

export function statsKey(S, extra = '') {
  return visibleStats(S).map((s) => s.id).join(',') + extra;
}

// Patch every stat cell that exists in the document. Missing cells are simply
// skipped, so a housing may show a subset (the menu bar's overflow rule) with
// no bookkeeping of its own.
export function paintStats(S, { prefix = 'tb' } = {}) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  for (const st of visibleStats(S)) {
    const raw = st.get(S);
    const text = st.fmt(raw, S);
    const col = st.color(raw, S);
    const tip = st.tip(S);
    for (const p of [prefix, ...(prefix === 'tb' ? [] : ['tb'])]) {
      const el = document.getElementById(`${p}-${st.id}`);
      if (!el) continue;
      if (el.textContent !== text) {
        el.textContent = text;
        if (shouldFlash(st, raw, now)) {
          lastTickAt[st.id] = now;
          tickBase[st.id] = raw;
          el.classList.remove('tick-up');
          void el.offsetWidth;
          el.classList.add('tick-up');
        }
      }
      if (el.style.color !== col) el.style.color = col;
      const wrap = document.getElementById(`${p}-wrap-${st.id}`);
      if (wrap && wrap.dataset.tip !== tip) wrap.dataset.tip = tip;
    }
    lastVals[st.id] = raw;
  }
}

// ── The alerts ──────────────────────────────────────────────────────────────
// What is going wrong, in the order it will kill you. The console prints these
// down the middle of the status line; the workstation prints them beside the
// numbers they are about. One list, one set of thresholds.
export function alertChips(S) {
  const out = [];
  if (!S) return out;
  const rw = runwayDays(S);
  const debt = S.resources.techDebt;
  const open = openThreadCount(S);
  if (S.company.cash < 0) out.push(['crit', 'CASH NEGATIVE']);
  else if (rw < 30) out.push(['crit', `RUNWAY ${Math.floor(rw)}D`]);
  if (S.founder.burnout > 55) out.push(['warn', `BURNOUT ${Math.round(S.founder.burnout)}`]);
  if (debt > 220) out.push(['warn', `DEBT ${Math.round(debt)}`]);
  if (S.company.act >= 3 && S.resources.alignment < 0.4) out.push(['warn', `ALIGN ${S.resources.alignment.toFixed(2)}`]);
  if (open) out.push(['note', `${open} THREAD${open > 1 ? 'S' : ''} OPEN`]);
  return out;
}
