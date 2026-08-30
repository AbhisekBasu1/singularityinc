// ─────────────────────────────────────────────────────────────────────────────
// SHELL — topbar, nav, feed rail, view routing.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { render, esc, md, onAction, onKey } from './dom.js';
import { fmt, money, moneyExact, pct, gameDateShort, runwayText, duration } from '../engine/format.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { burnPerDay, runwayDays } from '../systems/economy.js';
import { nextActHint } from '../systems/progression.js';
import { ACTS, TIME } from '../data/balance.js';
import { activeCompetitors } from '../systems/market.js';
import { researchProgressPct } from '../systems/research.js';
import { RESEARCH_MAP } from '../data/research.js';
import { threadOptions, openThreadCount } from '../systems/feed.js';

export const VIEWS = [
  { id: 'desk', name: 'The Desk', navName: 'Desk', icon: '⌂', section: 'Operator' },
  { id: 'product', name: 'Product', icon: '◈', section: 'Operator' },
  { id: 'agents', name: 'Agents', icon: '◉', section: 'Company', showLocked: true,
    lockHint: 'Unlocks once you have written a few prompts by hand and felt the bottleneck.',
    req: (s) => s.unlocks.agents_intro || s.agents.length > 0 || s.time.day > 3 },
  { id: 'research', name: 'Research', navName: 'R&D', icon: '⌬', section: 'Company' },
  { id: 'market', name: 'Market', icon: '↗', section: 'Company' },
  { id: 'world', name: 'World', icon: '⊕', section: 'Empire', showLocked: true,
    lockHint: 'Unlocks in **Act III**, when governments start returning your calls.',
    req: (s) => s.company.act >= 3 },
  { id: 'story', name: 'Story', icon: '✎', section: 'Archive' },
  { id: 'legacy', name: 'Legacy', icon: '∞', section: 'Archive' },
];

let currentView = 'desk';
let viewModules = {};

export function setView(id) {
  endBoot();
  if (currentView === id) return;
  const v = VIEWS.find((x) => x.id === id);
  if (!v) return;                       // unknown id: stay where we are
  if (v.req && !v.req(S)) return;
  currentView = id;
  const main = document.getElementById('main');
  if (main) { main.__html = null; main.scrollTop = 0; }
  paintNav();
  paintMain();
}
export function getView() { return currentView; }
export function registerViews(mods) { viewModules = mods; }

let bootTimer = 0;
let booting = false;

// A console does not fade in; it comes up. Modules report in sequence, a scan
// sweeps the glass, and only then does the machine belong to you.
function powerOn() {
  const app = document.getElementById('app');
  if (!app) return;
  clearTimeout(bootTimer);
  app.classList.remove('booting');
  void app.offsetWidth;                 // restart the sequence on a rebuild
  app.classList.add('booting');
  booting = true;
  bootTimer = setTimeout(endBoot, 1500);
  document.addEventListener('pointerdown', endBoot, { once: true });
  document.addEventListener('keydown', endBoot, { once: true });
}

// Any deliberate input cuts the sequence short — the machine is yours already.
export function endBoot() {
  if (!booting) return;
  booting = false;
  clearTimeout(bootTimer);
  document.getElementById('app')?.classList.remove('booting');
}

export function buildShell() {
  topBuilt = false;
  document.getElementById('app')?.classList.remove('booting');
  for (const k of Object.keys(lastVals)) delete lastVals[k];
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="topbar" id="topbar"></div>
    <div class="shell">
      <nav class="nav" id="nav"></nav>
      <main class="main" id="main"></main>
      <aside class="feed-rail" id="feed-rail">
        <section class="world-console" id="world-console" data-tut="author"></section>
        <div class="feed-head">
          <span class="live-dot"></span>
          <span class="feed-title">Wire</span>
          <span class="grow"></span>
          <span class="tiny dimmer mono" id="feed-count"></span>
          <button class="feed-close" data-act="wire-toggle" aria-label="Close the Wire">\u2715</button>
        </div>
        <div class="feed-list" id="feed-list"></div>
      </aside>
    </div>
    <div class="statusline" id="statusline"></div>`;
  paintNav();
  paintTopbar();
  paintMain();
  paintFeed();
  paintStatus();
  powerOn();
}

// ── Status line ────────────────────────────────────────────────────────────
// The strip along the bottom edge: context, pressure, and what the keys do.
let lastSaveAt = 0;
export function markSaved() { lastSaveAt = Date.now(); }

const KEYHINTS = {
  desk: [['Q', 'code'], ['W', 'prompt'], ['E', 'users'], ['R', 'post'], ['S', 'ship']],
  research: [['+', 'queue']],
};
const GLOBAL_KEYS = [['SPC', 'pause'], ['?', 'help']];

// The world's console lives in the Wire rail, which is display:none below
// 1120px — and the browser this game is meant to be played in is a ~760px
// pane. So the statusline carries a chip that opens the same panel in a
// dialog. Injected, not imported: the shell stays ignorant of WebMCP.
let worldChipFn = () => '';
export function registerWorldChip(fn) { worldChipFn = fn || (() => ''); }
function worldChip() { try { return worldChipFn() || ''; } catch { return ''; } }

export function paintStatus() {
  if (!S) return;
  const el = document.getElementById('statusline');
  if (!el) return;
  const view = VIEWS.find((v) => v.id === currentView);
  const open = openThreadCount(S);
  const rw = runwayDays(S);
  const debt = S.resources.techDebt;
  const alerts = [];
  if (S.company.cash < 0) alerts.push(['crit', 'CASH NEGATIVE']);
  else if (rw < 30) alerts.push(['crit', `RUNWAY ${Math.floor(rw)}D`]);
  if (S.founder.burnout > 55) alerts.push(['warn', `BURNOUT ${Math.round(S.founder.burnout)}`]);
  if (debt > 220) alerts.push(['warn', `DEBT ${Math.round(debt)}`]);
  if (S.company.act >= 3 && S.resources.alignment < 0.4) alerts.push(['warn', `ALIGN ${S.resources.alignment.toFixed(2)}`]);
  if (open) alerts.push(['note', `${open} THREAD${open > 1 ? 'S' : ''} OPEN`]);

  const since = lastSaveAt ? Math.round((Date.now() - lastSaveAt) / 1000) : null;
  const keys = [...(KEYHINTS[currentView] || []), ...GLOBAL_KEYS];

  const html = `
    <div class="sl-left">
      <span class="sl-seg sl-view">${esc((view?.navName || view?.name || '').toUpperCase())}</span>
      <span class="sl-seg">ACT ${ROMAN[S.company.act]}</span>
      <span class="sl-seg">D${Math.floor(S.time.day)}</span>
      ${S.settings.paused ? '<span class="sl-seg sl-paused">PAUSED</span>' : ''}
    </div>
    <div class="sl-mid">
      ${alerts.length
        ? alerts.map(([k, t]) => `<span class="sl-alert ${k}">${esc(t)}</span>`).join('')
        : '<span class="sl-ok">ALL SYSTEMS NOMINAL</span>'}
    </div>
    <div class="sl-right">
      ${keys.map(([k, l]) => `<span class="sl-key"><kbd>${esc(k)}</kbd>${esc(l)}</span>`).join('')}
      <span class="sl-seg sl-save">${since === null ? '—' : since < 3 ? 'SAVED' : `SAVED ${since}s`}</span>
    </div>`;
  render(el, html);
}

// ── Topbar ─────────────────────────────────────────────────────────────────
// Built once, then patched in place, so value changes can animate.
let topBuilt = false;
const lastVals = {};
// The value-change flash is a 0.5s animation (`.tick-up`). Never restart one
// that is still running, and only mark a real move rather than steady drift.
const lastTickAt = {}, tickBase = {};
const TICK_MIN_MS = 900;
const TICK_MIN_GROWTH = 1.01;

const STATS = [
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

export function paintTopbar() {
  if (booting) return;
  if (!S) return;
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const visible = STATS.filter((st) => !st.when || st.when(S));
  const key = visible.map((s) => s.id).join(',');

  if (!topBuilt || bar.__statKey !== key) {
    bar.__statKey = key;
    topBuilt = true;
    bar.innerHTML = `
      <div class="brand">
        <div class="brand-mark" id="tb-mark"></div>
        <div class="brand-text">
          <div class="brand-name" id="tb-name"></div>
          <div class="brand-sub" id="tb-act"></div>
        </div>
        <div class="brand-day mono" id="tb-daymini"></div>
      </div>
      <div class="stat-strip">
        ${visible.map((st) => `
          <div class="stat" id="tb-wrap-${st.id}" data-tip="" data-tip-title="${esc(st.label)}">
            <div class="stat-label">${esc(st.label)}</div>
            <div class="stat-value ${st.small ? 'sm' : ''}" id="tb-${st.id}">—</div>
          </div>`).join('')}
      </div>
      <div class="time-block">
        <div class="col" style="align-items:flex-end">
          <div class="stat-value sm mono" id="tb-date"></div>
          <div class="stat-label" id="tb-day"></div>
        </div>
        <div class="speed-group" id="tb-speed"></div>
        <span id="tb-wire"></span>
        <span id="tb-world"></span>
        <button class="btn btn-icon btn-ghost" data-act="help" aria-label="Manual" data-tip="Manual · <b>?</b>">?</button>
        <button class="btn btn-icon btn-ghost" data-act="settings" aria-label="Settings" data-tip="Settings">⚙</button>
      </div>`;
  }

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const set = (id, text) => { const el = document.getElementById(id); if (el && el.textContent !== text) el.textContent = text; };
  set('tb-mark', (S.company.name || 'S')[0].toUpperCase());
  set('tb-name', S.company.name);
  set('tb-act', `Act ${ROMAN[S.company.act]} · ${ACTS[S.company.act]?.name || ''}`);
  set('tb-date', gameDateShort(S.time.day));
  set('tb-day', `Day ${Math.floor(S.time.day)}`);
  set('tb-daymini', `d${Math.floor(S.time.day)}`);

  for (const st of visible) {
    const el = document.getElementById('tb-' + st.id);
    if (!el) continue;
    const raw = st.get(S);
    const text = st.fmt(raw, S);
    if (el.textContent !== text) {
      el.textContent = text;
      // The flash marks a jump worth noticing. Retriggered on every increase it
      // never finished — valuation rises most ticks, so a 0.5s animation
      // restarted about seven times a second and the number simply strobed.
      // Require the previous flash to have finished and the value to have
      // actually moved, not merely drifted.
      const prev = lastVals[st.id];
      if (!st.noTick && prev !== undefined && raw > prev
          && now - (lastTickAt[st.id] || 0) >= TICK_MIN_MS
          && raw >= (tickBase[st.id] ?? prev) * TICK_MIN_GROWTH) {
        lastTickAt[st.id] = now;
        tickBase[st.id] = raw;
        el.classList.remove('tick-up');
        void el.offsetWidth;
        el.classList.add('tick-up');
      }
    }
    lastVals[st.id] = raw;
    const col = st.color(raw, S);
    if (el.style.color !== col) el.style.color = col;
    const wrap = document.getElementById('tb-wrap-' + st.id);
    if (wrap) { const t = st.tip(S); if (wrap.dataset.tip !== t) wrap.dataset.tip = t; }
  }

  // The world's console lives in the Wire rail, which is not on screen below
  // 1120px — and ChatGPT's chat input floats over the bottom of its browser,
  // which rules out the statusline. The topbar is the one strip that is always
  // visible and never covered.
  const wc = document.getElementById('tb-world');
  if (wc) { const h = worldChip(); if (wc.__h !== h) { wc.__h = h; wc.innerHTML = h; } }

  // The Wire goes with it. Below 1120px the rail is a drawer, and without a
  // door the whole feed — including threads that are waiting on an answer —
  // was simply not in the game at the width it is meant to be played at.
  // The count is the point: it says how many decisions are behind the button.
  const wr = document.getElementById('tb-wire');
  if (wr) {
    const open = S.feed.filter((f) => f.thread && !f.resolved).length;
    const h = `<button class="tb-wire ${open ? 'needs' : ''}" data-act="wire-toggle"
      aria-label="The Wire" data-tip="<b>The Wire</b><br>${open ? `${open} thread${open === 1 ? '' : 's'} waiting on you` : 'nothing waiting'}"
      ><span class="tbw-dot"></span><span class="tbw-n">${open || '\u2014'}</span></button>`;
    if (wr.__h !== h) { wr.__h = h; wr.innerHTML = h; }
  }

  // Speed controls
  const sp = document.getElementById('tb-speed');
  const spKey = `${S.settings.paused}|${S.settings.speed}`;
  if (sp && sp.__key !== spKey) {
    sp.__key = spKey;
    sp.innerHTML = `<button class="speed-btn pause ${S.settings.paused ? 'on' : ''}" data-act="speed" data-v="0" data-tip="Pause · <b>Space</b>">❚❚</button>`
      + TIME.SPEEDS.map((s2, i) => `<button class="speed-btn ${!S.settings.paused && S.settings.speed === i + 1 ? 'on' : ''}" data-act="speed" data-v="${i + 1}">${s2}×</button>`).join('');
  }
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];

// ── Nav ────────────────────────────────────────────────────────────────────
export function paintNav() {
  if (booting) return;
  if (!S) return;
  const sections = {};
  for (const v of VIEWS) {
    const locked = v.req && !v.req(S);
    if (locked && !v.showLocked) continue;
    (sections[v.section] ||= []).push({ ...v, locked });
  }
  const badge = (v) => {
    if (v.id === 'research' && !S.research.active) {
      return `<span class="nav-badge">!</span>`;
    }
    if (v.id === 'agents') {
      if (S.agents.length === 0) return `<span class="nav-badge">!</span>`;
    }
    if (v.id === 'legacy') {
      const n = S.legacy.points || 0;
      if (n > 0) return `<span class="nav-badge soft">${n}</span>`;
    }
    if (v.id === 'market') {
      const n = activeCompetitors(S).length;
      if (n > 0) return `<span class="nav-badge soft">${n}</span>`;
    }
    return '';
  };
  const goal = nextActHint(S);
  const active = S.research.active ? RESEARCH_MAP[S.research.active] : null;

  let idx = 0;
  const html = Object.entries(sections).map(([name, items]) => `
      <div class="nav-section">${name}</div>
      ${items.map((v) => { idx++; return `<button class="nav-item ${currentView === v.id ? 'on' : ''} ${v.locked ? 'locked' : ''}"
        style="--i:${idx}"
        ${v.locked ? `data-tip="${esc(v.lockHint || 'Unlocks later.')}"` : `data-act="view" data-v="${v.id}"`}>
        <span class="nav-idx mono">${String(idx).padStart(2, '0')}</span>
        <span class="nav-icon">${v.locked ? '⊘' : v.icon}</span><span>${esc(v.navName || v.name)}</span>${v.locked ? '' : badge(v)}
      </button>`; }).join('')}`).join('')
    + `<div class="nav-spacer"></div>`
    + (active ? `<div class="act-card" style="background:linear-gradient(135deg,rgba(77,208,225,.10),transparent)">
        <div class="act-num" style="color:var(--cyan)">RESEARCHING</div>
        <div class="act-name" style="font-size:12px">${esc(active.name)}</div>
        <div style="margin-top:7px">${(() => { const p = researchProgressPct(S) * 100; return `<div class="bar thin"><div class="bar-fill shimmer" style="width:${p.toFixed(1)}%;background:var(--cyan)"></div></div>`; })()}</div>
      </div>` : '')
    + (goal ? `<div class="act-card">
        <div class="act-num">NEXT: ACT ${ROMAN[goal.act]}</div>
        <div class="act-name">${esc(goal.name)}</div>
        <div class="act-goal">${esc(goal.hint)}</div>
        ${goal.ready && goal.waitText ? `<div class="act-goal" style="color:var(--green)">✓ Thresholds met · ${esc(goal.waitText)}</div>` : ''}
      </div>` : '');
  render(document.getElementById('nav'), html);
}

// ── Main view ──────────────────────────────────────────────────────────────
export function paintMain() {
  if (!S) return;
  const mod = viewModules[currentView];
  if (!mod) return;
  const main = document.getElementById('main');
  render(main, mod.render(S));
}

// ── Feed ───────────────────────────────────────────────────────────────────
const TYPE_LABEL = { social: 'x', hn: 'hn', news: 'press', log: 'agent', ship: 'ship',
  launch: 'launch', incident: 'alert', research: 'r&d' };

export function paintFeed() {
  if (!S) return;
  const list = document.getElementById('feed-list');
  if (!list) return;
  // Open threads pin to the top — an unanswered decision should never scroll away.
  const openItems = S.feed.filter((f) => f.thread && !f.resolved);
  const rest = S.feed.filter((f) => !(f.thread && !f.resolved)).slice(0, 55 - openItems.length);
  const items = [...openItems, ...rest];
  const html = items.map((f) => {
    const open = f.thread && !f.resolved;
    const opts = open ? threadOptions(S, f) : [];
    return `
    <div class="feed-item ${f.tone || ''} ${open ? 'actionable' : ''} ${f.thread && f.resolved ? 'answered' : ''} ${f.byWorld ? 'by-world' : ''} ${f.untrusted ? 'untrusted' : ''}">
      <div class="feed-meta">
        <span class="feed-type ${f.type}">${TYPE_LABEL[f.type] || f.type}</span>
        ${f.author ? `<span class="feed-author">${esc(f.author)}</span>` : ''}
        <span class="grow"></span>
        ${open ? '<span class="feed-live">needs you</span>' : ''}
        <span>d${f.day}</span>
      </div>
      <div class="feed-text">${md(f.text)}</div>
      ${f.meta ? `<div class="feed-sub">${md(f.meta)}</div>` : ''}
      ${f.type === 'hn' && f.points ? `<div class="feed-sub">▲ ${f.points} · ${f.comments} comments</div>` : ''}
      ${open ? `<div class="thread-opts">
        ${opts.map((o, i) => `<button class="thread-opt" data-act="thread" data-v="${f.id}" data-i="${i}">${esc(o.label)}</button>`).join('')}
      </div>` : ''}
      ${f.thread && f.resolved && f.outcome ? `<div class="thread-out">
        <span class="thread-chosen">▸ ${esc(f.chosen)}</span>${md(f.outcome)}
        ${f.effects?.length ? `<span class="row wrap g4 mt6">${f.effects.map(([k, v]) =>
          `<span class="tl-eff ${v > 0 ? 'pos' : 'neg'}">${esc(k)} ${v > 0 ? '+' : ''}${typeof v === 'number' && Math.abs(v) < 1 ? v.toFixed(3) : Math.round(v)}</span>`).join('')}</span>` : ''}
      </div>` : ''}
      ${f.thread && f.expired ? `<div class="thread-out dimmer">You did not answer. It resolved itself.</div>` : ''}
    </div>`;
  }).join('') || `<div class="empty">Nothing yet.<br/>The world has not noticed you.</div>`;
  render(list, html);
  const c = document.getElementById('feed-count');
  const open = openThreadCount(S);
  // A bare number here reads as an error code. Say what it counts.
  if (c) { c.textContent = open ? `${open} open` : (S.feed.length ? `${fmt(S.feed.length)} entries` : '');
           c.className = open ? 'tiny mono c-amber' : 'tiny dimmer mono'; }
}
