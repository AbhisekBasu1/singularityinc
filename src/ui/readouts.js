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
import { burnPerDay, runwayDays, bankruptcyFloor } from '../systems/economy.js';
import { openThreadCount } from '../systems/feed.js';
import { weekDelta } from '../systems/ledger.js';
import { esc, sparkline } from './dom.js';
import { alarmClass } from './alarm.js';

export const STATS = [
  { id: 'cash', label: 'Cash', get: (S) => S.company.cash, fmt: (v) => money(v),
    color: (v) => (v < 0 ? 'var(--red)' : 'var(--green)'),
    week: 'cash', spark: ['cashHistory', 'var(--green)'],
    tip: (S) => S.company.cash < 0
      ? `**EMERGENCY** — day ${Math.floor(S.company.emergencyDays || 1)} in the red.\nSpend is frozen and reputation is bleeding. Agents start being spun down after a week.\n${floorLine(S)}`
      : `Exact: **${moneyExact(S.company.cash)}**\nBurn: **${money(Math.max(0, burnPerDay(S)))}/day**\nRevenue: **${money(S.company.revenueToday || 0)}/day**` },
  // §B8. The runway everyone quotes is days to zero, and zero is not where the
  // run ends: the company keeps trading below it and dies at `bankruptcyFloor`,
  // a negative number a player was never told. Both are here now, in the one
  // readout both housings share — the console's topbar, the menu bar's chip and
  // the workstation's Readouts widget all print this tip.
  { id: 'runway', label: 'Runway', small: true, get: (S) => runwayDays(S),
    fmt: (v, S) => runwayText(S.company.cash, burnPerDay(S)),
    color: (v) => (v === Infinity ? 'var(--green)' : v < 25 ? 'var(--red)' : v < 70 ? 'var(--amber)' : 'var(--ink)'),
    tip: (S) => { const r = runwayDays(S);
      return (r === Infinity ? 'You are profitable. Cash is going **up**.'
        : `**${Math.floor(r)}** days at the current burn rate.`) + '\n' + floorLine(S); },
    noTick: true },
  { id: 'mrr', label: 'MRR', get: (S) => totalMrr(S), fmt: (v) => money(v), color: () => 'var(--cyan)',
    week: 'mrr', spark: ['revenueHistory', 'var(--cyan)'],
    tip: (S) => `Annual run-rate: **${money(totalMrr(S) * 12)}**\n30-day growth: **${((S.company.growthRate30 ?? 0) * 100).toFixed(1)}%**` },
  { id: 'users', label: 'Users', get: (S) => totalUsers(S), fmt: (v) => fmt(v), color: () => 'var(--ink)',
    week: 'users', spark: ['userHistory', 'var(--green)'],
    tip: (S) => `Peak: **${fmt(S.stats.peakUsers)}**\nChurn: **${pct(S.products[0]?.churnMonthly ?? 0, 1)}/mo**` },
  { id: 'val', label: 'Valuation', get: (S) => S.company.valuation, fmt: (v) => money(v), color: () => 'var(--amber)',
    week: 'val', spark: ['valuationHistory', 'var(--amber)', true],
    tip: (S) => `Your stake: **${pct(S.company.equity.founder, 1)}** = **${money(S.company.valuation * S.company.equity.founder)}**` },
  { id: 'compute', label: 'Compute', small: true, when: (S) => S.company.act >= 3,
    get: (S) => S.resources.computeCap, fmt: (v) => fmt(v) + ' PF', color: () => 'var(--violet)',
    week: 'compute',
    tip: () => 'Petaflop-days of dedicated compute. Drives research rate and model capability.' },
  { id: 'gdp', label: 'World GDP', small: true, when: (S) => S.company.act >= 4,
    get: (S) => S.world.globalGdpShare, fmt: (v) => (v * 100).toFixed(2) + '%', color: () => 'var(--pink)',
    week: 'gdp',
    tip: () => 'Share of global economic output flowing through systems you own.' },
];

// §B8. Where the spiral actually ends. `bankruptcyFloor` is negative and scales
// with the valuation, so a big company has further to fall — and going under
// zero is a window you can climb out of rather than a cliff. The number and the
// days to it, in the two readouts that end runs.
function floorLine(S) {
  const floor = bankruptcyFloor(S);
  const burn = burnPerDay(S);
  const room = S.company.cash - floor;
  if (burn <= 0) return `The floor is **${money(floor)}**. You are not falling toward it.`;
  const days = room / burn;
  if (days <= 0) return `You are **below the floor** at ${money(floor)}. This is the last day.`;
  return `Insolvency is at **${money(floor)}**, not at zero — **${Math.floor(days)}** days away at this burn.`;
}

// §B3. The trend that fits in a tooltip. The workstation's Readouts widget has
// had one beside every number since it shipped; the console's strip has room
// for a line of digits and nothing else, so the shape goes in the note.
// Memoised on the series itself: `paintStats` runs about eleven times a second
// and these arrays are written once every two game days, so without this the
// topbar builds four two-kilobyte SVGs per paint for a picture that changed
// none of those times.
const sparkMemo = {};
function sparkTip(S, st) {
  if (!st.spark) return '';
  const series = S.company[st.spark[0]] || [];
  if (series.length < 3) return '';
  const key = `${series.length}:${series[series.length - 1]}`;
  const memo = sparkMemo[st.id];
  if (memo && memo.key === key) return memo.html;
  // Newlines become `<br>` on the way into the tip, and a `<br>` inside an
  // `<svg>` is not a line break, it is a stray element. Flatten it first.
  const html = '\n' + sparkline(series, { color: st.spark[1], log: !!st.spark[2], h: 20, w: 200,
    label: st.label + ' trend' }).replace(/\s*\n\s*/g, ' ');
  sparkMemo[st.id] = { key, html };
  return html;
}

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
  for (const bag of [lastVals, lastTickAt, tickBase, sparkMemo]) for (const k of Object.keys(bag)) delete bag[k];
}

// Which way it jumped, or nothing. The flash used to fire on growth alone,
// which meant the bad direction — the one that ends runs — was the silent one:
// cash falling off a cliff and users walking out looked exactly like a quiet
// afternoon. Same guards in both directions, because the rule that earned its
// keep is that a 0.5s animation must never restart while it is still running
// and that a drift is not a jump.
function flashClass(st, raw, now) {
  const prev = lastVals[st.id];
  if (st.noTick || prev === undefined || raw === prev) return '';
  if (now - (lastTickAt[st.id] || 0) < TICK_MIN_MS) return '';
  const base = Math.abs(tickBase[st.id] ?? prev);
  if (raw > prev) return Math.abs(raw) >= base * TICK_MIN_GROWTH ? 'tick-up' : '';
  return Math.abs(raw) <= base / TICK_MIN_GROWTH ? 'tick-down' : '';
}

// The markup for one housing's strip. Ids are shared so `paintStats` below
// works for every housing without being told which one it is looking at.
export function statsHtml(S, { prefix = 'tb', only = null, deltas = false } = {}) {
  const keep = only ? new Set(only) : null;
  return visibleStats(S).filter((st) => !keep || keep.has(st.id)).map((st) => `
    <div class="stat${alarmClass(`stat:${st.id}`)}" id="${prefix}-wrap-${st.id}" data-stat="${st.id}" data-tip="" data-tip-title="${esc(st.label)}">
      <div class="stat-label">${esc(st.label)}</div>
      <div class="stat-value ${st.small ? 'sm' : ''}" id="${prefix}-${st.id}">—</div>
      ${deltas && st.week ? `<div class="stat-delta flat" id="${prefix}-d-${st.id}"></div>` : ''}
    </div>`).join('');
}

// §B3. Seven days, as a chip under the number. `.stat-delta` and its three
// colour classes have been in `main.css` since the beginning and nothing has
// ever written into them — which is most of why the slow killers were
// invisible. Null until there is a week of history: "+0%" on day two is a lie
// about a company two days old.
export function deltaText(S, st) {
  if (!st.week) return null;
  const d = weekDelta(S, st.week);
  // A chip that says "0 PF 7d" beside a compute readout of zero is noise
  // wearing an instrument's clothes. Nothing moved, so nothing is printed.
  if (!d || d.delta === 0) return null;
  const dir = d.delta > 0 ? 'up' : d.delta < 0 ? 'down' : 'flat';
  const sign = d.delta > 0 ? '+' : d.delta < 0 ? '−' : '';
  const mag = d.pct != null && Math.abs(d.pct) < 100
    ? sign + (Math.abs(d.pct) * 100).toFixed(Math.abs(d.pct) < 0.1 ? 1 : 0) + '%'
    : sign + st.fmt(Math.abs(d.delta), S);
  return { text: `${mag} 7d`, dir,
           note: `Seven days ago: **${st.fmt(d.from, S)}**. Now: **${st.fmt(d.to, S)}**.` };
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
    const d = deltaText(S, st);
    const tip = st.tip(S) + (d ? '\n' + d.note : '') + sparkTip(S, st);
    for (const p of [prefix, ...(prefix === 'tb' ? [] : ['tb'])]) {
      const el = document.getElementById(`${p}-${st.id}`);
      if (!el) continue;
      if (el.textContent !== text) {
        el.textContent = text;
        const cls = flashClass(st, raw, now);
        if (cls) {
          lastTickAt[st.id] = now;
          tickBase[st.id] = raw;
          el.classList.remove('tick-up', 'tick-down');
          void el.offsetWidth;
          el.classList.add(cls);
        }
      }
      if (el.style.color !== col) el.style.color = col;
      const chip = document.getElementById(`${p}-d-${st.id}`);
      if (chip) {
        const txt = d ? d.text : '';
        if (chip.textContent !== txt) chip.textContent = txt;
        const cls = 'stat-delta ' + (d ? d.dir : 'flat');
        if (chip.className !== cls) chip.className = cls;
      }
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
