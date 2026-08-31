// ─────────────────────────────────────────────────────────────────────────────
// THE CONSOLE SHELL — topbar, nav, feed rail, view routing.
//
// This is the game's original housing and the default one. `shell.js` is the
// facade in front of it; the workstation in `src/ui/os/` is the other
// implementation of the same interface. Nothing here knows about either.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { render, esc, md } from './dom.js';
import { fmt, gameDateShort } from '../engine/format.js';
import { nextActHint } from '../systems/progression.js';
import { ACTS, TIME } from '../data/balance.js';
import { activeCompetitors } from '../systems/market.js';
import { researchProgressPct } from '../systems/research.js';
import { RESEARCH_MAP } from '../data/research.js';
import { openThreadCount, threadOptions } from '../systems/feed.js';
import { VIEWS } from './shell.js';
import { statsHtml, statsKey, paintStats, resetTicks, alertChips } from './readouts.js';

export const id = 'console';

let currentView = 'desk';
let viewModules = {};

export function setView(nextId) {
  endBoot();
  if (currentView === nextId) return;
  const v = VIEWS.find((x) => x.id === nextId);
  if (!v) return;                       // unknown id: stay where we are
  if (v.req && !v.req(S)) return;
  currentView = nextId;
  const main = document.getElementById('main');
  if (main) { main.__html = null; main.scrollTop = 0; }
  paintNav();
  paintMain();
}
export function getView() { return currentView; }
export function registerViews(mods) { viewModules = mods; }

// The workstation implements these; in the console they are the no-ops that
// keep `main.js` free of shell branches.
export function escape() { return false; }
export function viewByIndex(i) {
  const item = document.querySelectorAll('.nav-item[data-act="view"]')[i];
  if (item) { item.click(); return true; }
  return false;
}
export function showing(id) { return !id || currentView === id; }
export function showWorldConsole() { return false; }
export function powerDown() { return Promise.resolve(); }
export function anchorAlias(sel) { return sel; }
export function announcesCards() { return false; }
export function extraViews() { return []; }

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
  resetTicks();
  document.getElementById('app')?.classList.remove('booting');
  const app = document.getElementById('app');
  app.className = '';
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
          <button class="feed-close" data-act="wire-toggle" aria-label="Close the Wire">✕</button>
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
export function savedAgo() { return lastSaveAt ? Math.round((Date.now() - lastSaveAt) / 1000) : null; }

export const KEYHINTS = {
  desk: [['Q', 'code'], ['W', 'prompt'], ['E', 'users'], ['R', 'post'], ['S', 'ship']],
  research: [['+', 'queue']],
};
const GLOBAL_KEYS = [['SPC', 'pause'], ['?', 'help']];

// The world's console lives in the Wire rail, which is a drawer below 1120px —
// and the browser this game is meant to be played in is a ~760px pane. So the
// topbar carries a chip that opens the same panel in a dialog. Injected, not
// imported: the shell stays ignorant of WebMCP.
let worldChipFn = () => '';
export function registerWorldChip(fn) { worldChipFn = fn || (() => ''); }
export function worldChip() { try { return worldChipFn() || ''; } catch { return ''; } }

export function paintStatus() {
  if (!S) return;
  const el = document.getElementById('statusline');
  if (!el) return;
  const view = VIEWS.find((v) => v.id === currentView);
  const alerts = alertChips(S);
  const since = savedAgo();
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

export function paintTopbar() {
  if (booting) return;
  if (!S) return;
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const key = statsKey(S);

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
      <div class="stat-strip">${statsHtml(S)}</div>
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

  const set = (elId, text) => { const el = document.getElementById(elId); if (el && el.textContent !== text) el.textContent = text; };
  set('tb-mark', (S.company.name || 'S')[0].toUpperCase());
  set('tb-name', S.company.name);
  set('tb-act', `Act ${ROMAN[S.company.act]} · ${ACTS[S.company.act]?.name || ''}`);
  set('tb-date', gameDateShort(S.time.day));
  set('tb-day', `Day ${Math.floor(S.time.day)}`);
  set('tb-daymini', `d${Math.floor(S.time.day)}`);

  paintStats(S);

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
  if (wr) { const h = wireDoorHtml(S); if (wr.__h !== h) { wr.__h = h; wr.innerHTML = h; } }

  // Speed controls
  const sp = document.getElementById('tb-speed');
  const spKey = `${S.settings.paused}|${S.settings.speed}`;
  if (sp && sp.__key !== spKey) {
    sp.__key = spKey;
    sp.innerHTML = speedGroupHtml(S);
  }
}

export function speedGroupHtml(S) {
  return `<button class="speed-btn pause ${S.settings.paused ? 'on' : ''}" data-act="speed" data-v="0" data-tip="Pause · <b>Space</b>">❚❚</button>`
    + TIME.SPEEDS.map((s2, i) => `<button class="speed-btn ${!S.settings.paused && S.settings.speed === i + 1 ? 'on' : ''}" data-act="speed" data-v="${i + 1}">${s2}×</button>`).join('');
}

export function wireDoorHtml(S) {
  const open = S.feed.filter((f) => f.thread && !f.resolved).length;
  return `<button class="tb-wire ${open ? 'needs' : ''}" data-act="wire-toggle"
    aria-label="The Wire" data-tip="<b>The Wire</b><br>${open ? `${open} thread${open === 1 ? '' : 's'} waiting on you` : 'nothing waiting'}"
    ><span class="tbw-dot"></span><span class="tbw-n">${open || '—'}</span></button>`;
}

export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];

// ── Nav ────────────────────────────────────────────────────────────────────
export function navBadge(S, v) {
  if (v.id === 'research' && !S.research.active) return `<span class="nav-badge">!</span>`;
  if (v.id === 'agents' && S.agents.length === 0) return `<span class="nav-badge">!</span>`;
  if (v.id === 'legacy') {
    const n = S.legacy.points || 0;
    if (n > 0) return `<span class="nav-badge soft">${n}</span>`;
  }
  if (v.id === 'market') {
    const n = activeCompetitors(S).length;
    if (n > 0) return `<span class="nav-badge soft">${n}</span>`;
  }
  return '';
}

export function paintNav() {
  if (booting) return;
  if (!S) return;
  const sections = {};
  for (const v of VIEWS) {
    const locked = v.req && !v.req(S);
    if (locked && !v.showLocked) continue;
    (sections[v.section] ||= []).push({ ...v, locked });
  }
  const goal = nextActHint(S);
  const active = S.research.active ? RESEARCH_MAP[S.research.active] : null;

  let idx = 0;
  const html = Object.entries(sections).map(([name, items]) => `
      <div class="nav-section">${name}</div>
      ${items.map((v) => { idx++; return `<button class="nav-item ${currentView === v.id ? 'on' : ''} ${v.locked ? 'locked' : ''}"
        style="--i:${idx}"
        ${v.locked ? `data-tip="${esc(v.lockHint || 'Unlocks later.')}"` : `data-act="view" data-v="${v.id}"`}>
        <span class="nav-idx mono">${String(idx).padStart(2, '0')}</span>
        <span class="nav-icon">${v.locked ? '⊘' : v.icon}</span><span>${esc(v.navName || v.name)}</span>${v.locked ? '' : navBadge(S, v)}
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
export function viewModule(viewId) { return viewModules[viewId]; }

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

// Shared with the workstation: the Wire is the same element in both housings.
export function feedHtml(S) {
  // Open threads pin to the top — an unanswered decision should never scroll away.
  const openItems = S.feed.filter((f) => f.thread && !f.resolved);
  const rest = S.feed.filter((f) => !(f.thread && !f.resolved)).slice(0, 55 - openItems.length);
  const items = [...openItems, ...rest];
  return items.map((f) => {
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
}

export function paintFeed() {
  if (!S) return;
  const list = document.getElementById('feed-list');
  if (!list) return;
  render(list, feedHtml(S));
  const c = document.getElementById('feed-count');
  const open = openThreadCount(S);
  // A bare number here reads as an error code. Say what it counts.
  if (c) { c.textContent = open ? `${open} open` : (S.feed.length ? `${fmt(S.feed.length)} entries` : '');
           c.className = open ? 'tiny mono c-amber' : 'tiny dimmer mono'; }
}
