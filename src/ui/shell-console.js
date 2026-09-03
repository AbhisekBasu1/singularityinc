// ─────────────────────────────────────────────────────────────────────────────
// THE CONSOLE SHELL — topbar, nav, feed rail, view routing.
//
// This is the game's original housing and the default one. `shell.js` is the
// facade in front of it; the workstation in `src/ui/os/` is the other
// implementation of the same interface. Nothing here knows about either.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { render, esc, md } from './dom.js';
import { fmt, gameDateShort, clockText } from '../engine/format.js';
import * as Transport from './transport.js';
import { nextActHint } from '../systems/progression.js';
import { ACTS, TIME } from '../data/balance.js';
import { activeCompetitors } from '../systems/market.js';
import { researchProgressPct } from '../systems/research.js';
import { RESEARCH_MAP } from '../data/research.js';
import { openThreadCount, threadOptions, daysLeft, triageFeed } from '../systems/feed.js';
import { unread as unreadMail } from '../systems/mail.js';
import { monthGrid, monthOf, isSunday } from '../systems/calendar.js';
import { VIEWS } from './shell.js';
import { statsHtml, statsKey, paintStats, resetTicks, alertChips } from './readouts.js';
import { applyActChrome, nominalLine, bootRoll, resetActChrome } from './actchrome.js';

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
  // The status strip carried the boot roll; it has to be told the roll is over
  // rather than waiting for whatever repaints next.
  paintStatus();
}

export function buildShell() {
  topBuilt = false;
  resetTicks();
  resetActChrome();
  document.getElementById('app')?.classList.remove('booting');
  const app = document.getElementById('app');
  app.className = '';
  app.innerHTML = `
    <div class="topbar" id="topbar"></div>
    <div class="daystrip" id="daystrip" aria-hidden="true"></div>
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
  desk: [['Q', 'code'], ['W', 'prompt'], ['E', 'users'], ['R', 'post'], ['S', 'ship'], ['G', 'spend']],
  research: [['+', 'queue']],
};
const GLOBAL_KEYS = [['SPC', 'pause'], ['−/=', 'speed'], ['N', 'next'], ['?', 'help']];

// The world's console lives in the Wire rail, which is a drawer below 1120px —
// and the browser this game is meant to be played in is a ~760px pane. So the
// topbar carries a chip that opens the same panel in a dialog. Injected, not
// imported: the shell stays ignorant of WebMCP.
let worldChipFn = () => '';
export function registerWorldChip(fn) { worldChipFn = fn || (() => ''); }
export function worldChip() { try { return worldChipFn() || ''; } catch { return ''; } }

export function paintStatus() {
  if (!S) return;
  // §I5. One class and one token, and only when the act actually moved.
  applyActChrome(S);
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
      <span class="sl-seg sl-time">${clockText(S.time.hourOfDay, TIME.DAWN_H)}</span>
      ${S.settings.paused ? '<span class="sl-seg sl-paused">PAUSED</span>'
        : Transport.isSeeking() ? '<span class="sl-seg sl-seeking">TO NEXT</span>' : ''}
    </div>
    <div class="sl-mid">
      ${booting
        ? `<span class="sl-boot">${bootRoll(S).map((m, i) =>
            `<span class="sl-boot-m" style="--i:${i}">${esc(m)}</span>`).join('')}</span>`
        : alerts.length
        ? alerts.map(([k, t]) => `<span class="sl-alert ${k}">${esc(t)}</span>`).join('')
        : `<span class="sl-ok">${esc(nominalLine(S))}</span>`}
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
      <span id="tb-say"></span>
      <div class="stat-strip">${statsHtml(S, { deltas: true })}</div>
      <div class="time-block">
        <div class="col" style="align-items:flex-end">
          <div class="stat-value sm mono" id="tb-date"></div>
          <div class="stat-label" id="tb-day"></div>
        </div>
        <div class="speed-group" id="tb-speed"></div>
        <span id="tb-wire"></span>
        <span id="tb-world"></span>
        <span id="tb-post"></span>
        <button class="btn btn-icon btn-ghost" data-act="open-contacts" aria-label="Contacts"
          data-tip="<b>Contacts</b><br>everyone you have met, and a number for each · <b>C</b>">☎</button>
        <button class="btn btn-icon btn-ghost" data-act="focus-mode" id="tb-focus" aria-label="Focus mode"
          data-tip="<b>Focus mode</b><br>the nav to icons, the Wire away · <b>F</b>">◱</button>
        <button class="btn btn-icon btn-ghost" data-act="help" aria-label="Manual" data-tip="Manual · <b>?</b>">?</button>
        <button class="btn btn-icon btn-ghost" data-act="settings" aria-label="Settings" data-tip="Settings">⚙</button>
      </div>`;
  }

  const set = (elId, text) => { const el = document.getElementById(elId); if (el && el.textContent !== text) el.textContent = text; };
  set('tb-mark', (S.company.name || 'S')[0].toUpperCase());
  set('tb-name', S.company.name);
  set('tb-act', `Act ${ROMAN[S.company.act]} · ${ACTS[S.company.act]?.name || ''}`);
  set('tb-date', gameDateShort(S.time.day));
  // The clock, for the first time: the game opened at 4:06 AM and never had a
  // time of day again. It spins — a day is seven seconds at 1× — which is the
  // point; a readout that moves is how a machine says the clock is running.
  set('tb-day', `Day ${Math.floor(S.time.day)} · ${clockText(S.time.hourOfDay, TIME.DAWN_H)}`);
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

  // §I10. The post. The workstation has had a Mail app since the letters
  // existed and the console had the rail and nothing else — so half the game's
  // surfaces existed for half the players. This is the door, with the count of
  // what is unread on it.
  const po = document.getElementById('tb-post');
  if (po) { const h = postDoorHtml(S); if (po.__h !== h) { po.__h = h; po.innerHTML = h; } }

  const fo = document.getElementById('tb-focus');
  if (fo) fo.classList.toggle('on', !!document.getElementById('app')?.classList?.contains('focus-mode'));

  paintDayStrip();

  // Speed controls
  const sp = document.getElementById('tb-speed');
  const spKey = `${S.settings.paused}|${S.settings.speed}|${Transport.isSeeking()}`;
  if (sp && sp.__key !== spKey) {
    sp.__key = spKey;
    sp.innerHTML = speedGroupHtml(S);
  }
}

// Pause, the four speeds, and the run to the next decision. `-` and `=` walk
// the speeds from the keyboard; the tips say so, because the most-pressed
// control in the game had no key for a long time.
export function speedGroupHtml(S) {
  const seeking = Transport.isSeeking();
  return `<button class="speed-btn pause ${S.settings.paused ? 'on' : ''}" data-act="speed" data-v="0" aria-label="Pause" aria-pressed="${!!S.settings.paused}" data-tip="Pause · <b>Space</b>">❚❚</button>`
    + TIME.SPEEDS.map((s2, i) => `<button class="speed-btn ${!S.settings.paused && S.settings.speed === i + 1 ? 'on' : ''}" data-act="speed" data-v="${i + 1}" aria-pressed="${!S.settings.paused && S.settings.speed === i + 1}" data-tip="${s2}× · <b>−</b> slower, <b>=</b> faster">${s2}×</button>`).join('')
    + `<button class="speed-btn next ${seeking ? 'on' : ''}" data-act="next-decision" aria-label="Run to the next decision" aria-pressed="${seeking}" data-tip="${seeking ? 'Running to the next decision — press to stop' : 'Run to the next decision'} · <b>N</b>">▸❚</button>`;
}

export function postDoorHtml(S) {
  let n = 0;
  try { n = unreadMail(S).length; } catch { n = 0; }
  return `<button class="tb-wire tb-post ${n ? 'needs' : ''}" data-act="open-mail"
    aria-label="Mail" data-tip="<b>The post</b><br>${n ? `${n} unread` : 'nothing unread'} · <b>M</b>"
    ><span class="tbw-dot"></span><span class="tbw-n">${n || '—'}</span></button>`;
}

export function wireDoorHtml(S) {
  const open = S.feed.filter((f) => f.thread && !f.resolved).length;
  return `<button class="tb-wire ${open ? 'needs' : ''}" data-act="wire-toggle"
    aria-label="The Wire" data-tip="<b>The Wire</b><br>${open ? `${open} thread${open === 1 ? '' : 's'} waiting on you` : 'nothing waiting'}"
    ><span class="tbw-dot"></span><span class="tbw-n">${open || '—'}</span></button>`;
}

// §I9. The notice slot. One line from somebody who works here, on the first
// morning of a session and on each in-game morning slow enough to read one. It
// is written straight into its own span rather than through `paintTopbar`,
// because the topbar is patched on a key and a transient line has no key —
// and it clears itself, so nothing else has to remember it is there.
let sayTimer = 0;
export function say(who, text, ms = 11000) {
  const el = document.getElementById('tb-say');
  if (!el || !text) return false;
  clearTimeout(sayTimer);
  el.innerHTML = `<span class="tb-said">
    <span class="tb-said-who mono">${esc(who || '')}</span>
    <span class="tb-said-line">${esc(text)}</span></span>`;
  const plate = el.firstElementChild;
  requestAnimationFrame(() => plate?.classList?.add('in'));
  sayTimer = setTimeout(() => {
    plate?.classList?.remove('in');
    setTimeout(() => { if (el.firstElementChild === plate) el.innerHTML = ''; }, 320);
  }, ms);
  return true;
}

export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];

// ── §I10. The month, as dots ────────────────────────────────────────────────
// A strip of thirty under the topbar: today lit, the days that had something on
// them marked, the Sundays a shade apart, and what is due ahead of you hollow.
// The console has never had a calendar of any kind — the workstation grew a
// whole app for it — and this is the cheapest honest version: it says where in
// the month you are, which is the question the date alone cannot answer.
//
// `monthGrid` walks the journal and derives four estimates, so it is *not* free
// and it is not called on the frame loop: it is rebuilt when the floored day
// moves, which is once every seven real seconds at 1×.
let stripDay = -1;
let stripHtml = '';
function paintDayStrip() {
  const el = document.getElementById('daystrip');
  if (!el || !S) return;
  const today = Math.floor(S.time.day);
  if (today !== stripDay) {
    stripDay = today;
    let grid = null;
    try { grid = monthGrid(S, monthOf(today)); } catch { grid = null; }
    stripHtml = grid ? stripFor(grid, today) : '';
  }
  if (el.__h !== stripHtml) { el.__h = stripHtml; el.innerHTML = stripHtml; }
}

function stripFor(grid, today) {
  const cells = grid.cells.map((c) => {
    // A quiet entry is a ship or an award — real, and not what the strip is
    // for. What it marks is a day something asked you something.
    const loud = c.events.filter((e) => !e.quiet);
    const cls = [
      c.today ? 'now' : '',
      c.future ? 'ahead' : '',
      c.sunday ? 'sun' : '',
      loud.length ? 'mark' : '',
      loud.some((e) => e.future) ? 'due' : '',
    ].filter(Boolean).join(' ');
    const tip = loud.length
      ? `<b>d${c.day}</b><br>${loud.slice(0, 4).map((e) => esc(e.title)).join('<br>')}`
      : `d${c.day}`;
    return `<span class="dd ${cls}" data-tip="${tip}" data-tip-title="${esc(grid.name)}"></span>`;
  }).join('');
  return `<span class="ds-k mono">${esc(grid.name.toUpperCase())}</span>
    <span class="ds-dots">${cells}</span>
    <span class="ds-n mono">D${today}</span>`;
}

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
  launch: 'launch', incident: 'alert', research: 'r&d', mail: 'mail' };

// ── Triage ──────────────────────────────────────────────────────────────────
// What is left of a thread's life, in the mono the rest of the chrome uses. A
// thread expires — `expireThreads` resolves it unanswered once `expires` passes
// — and until this nothing on screen said so, which made the deadline something
// a founder discovered by having missed it.
function leftChip(S, f) {
  const d = daysLeft(S, f);
  if (d === null) return '';
  const cls = d <= 3 ? 'soon' : d <= 10 ? 'near' : '';
  return `<span class="feed-left mono ${cls}" data-tip="Nobody waits for ever. It resolves itself when this runs out." data-tip-title="Time to answer">${d}d left</span>`;
}

// The replies, Later beside them. Later is once per thread and it says so after
// it has been used, rather than sitting there as a key that does nothing.
function threadOptsHtml(S, f) {
  const opts = threadOptions(S, f);
  return `<div class="thread-opts">
    ${opts.map((o, i) => `<button class="thread-opt" data-act="thread" data-v="${f.id}" data-i="${i}">${esc(o.label)}</button>`).join('')}
    ${f.snoozed
      ? `<span class="thread-later done mono" data-tip="Pushed once already. There is no second Later." data-tip-title="Later">LATER · D${f.snoozed}</span>`
      : `<button class="thread-later" data-act="thread-later" data-v="${f.id}" data-tip="A week further out, and it drops below whatever is still asking. Once." data-tip-title="Later">Later</button>`}
  </div>`;
}

// A letter in the rail is an envelope: who wrote, and what about, on one line.
// A letter is long-form — the workstation gives it a whole app — and nine of
// them at full length is a rail nobody reaches the bottom of. Pressing it
// unfolds it here; on the workstation the same action opens Mail.
function envelopeHtml(S, f) {
  const open = f.thread && !f.resolved;
  const on = S?.ui?.letterOpen === f.id;
  return `<div class="feed-item envelope ${open ? 'actionable' : ''} ${f.snoozed && open ? 'later' : ''} ${on ? 'unfolded' : ''} ${f.byWorld ? 'by-world' : ''}"${open ? ' data-tut="thread"' : ''}>
    <button class="env-line" type="button" data-act="feed-letter" data-v="${f.id}" aria-expanded="${!!on}">
      <span class="env-mark" aria-hidden="true">✉</span>
      <span class="env-who">${esc(f.mail?.from || f.author || '')}</span>
      <span class="env-subject">${esc(f.mail?.subject || f.meta || '')}</span>
      ${open ? '<span class="feed-live">needs you</span>' : ''}
      ${open ? leftChip(S, f) : ''}
      <span class="env-day mono">d${f.day}</span>
    </button>
    ${on ? `<div class="env-body">${md(f.text)}</div>` : ''}
    ${on && open ? threadOptsHtml(S, f) : ''}
    ${on && f.thread && f.resolved && f.outcome ? `<div class="thread-out">
      <span class="thread-chosen">▸ ${esc(f.chosen || '')}</span>${md(f.outcome)}</div>` : ''}
    ${on && f.thread && f.expired ? '<div class="thread-out dimmer">You did not answer. It resolved itself.</div>' : ''}
  </div>`;
}

// Shared with the workstation: the Wire is the same element in both housings.
export function feedHtml(S) {
  // Needs-you first, then newest — and a thread the founder pressed Later on
  // sits below the ones still asking, which is the whole of what Later buys.
  // `triageFeed` owns that order so both housings sort one rail one way.
  const items = triageFeed(S);
  return items.map((f) => {
    const open = f.thread && !f.resolved;
    if (f.type === 'mail') return envelopeHtml(S, f);
    return `
    <div class="feed-item ${f.tone || ''} ${open ? 'actionable' : ''} ${f.snoozed && open ? 'later' : ''} ${f.thread && f.resolved ? 'answered' : ''} ${f.byWorld ? 'by-world' : ''} ${f.untrusted ? 'untrusted' : ''}"${open ? ' data-tut="thread"' : ''}>
      <div class="feed-meta">
        <span class="feed-type ${f.type}">${TYPE_LABEL[f.type] || f.type}</span>
        ${f.author ? `<span class="feed-author">${esc(f.author)}${f.via ? ` · via ${esc(f.via)}` : ''}</span>` : ''}
        <span class="grow"></span>
        ${open ? '<span class="feed-live">needs you</span>' : ''}
        ${open ? leftChip(S, f) : ''}
        <span>d${f.day}</span>
      </div>
      <div class="feed-text">${md(f.text)}</div>
      ${f.meta ? `<div class="feed-sub">${md(f.meta)}</div>` : ''}
      ${f.type === 'hn' && f.points ? `<div class="feed-sub">▲ ${f.points} · ${f.comments} comments</div>` : ''}
      ${open ? threadOptsHtml(S, f) : ''}
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
