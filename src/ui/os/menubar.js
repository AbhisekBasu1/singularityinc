// ─────────────────────────────────────────────────────────────────────────────
// THE MENU BAR — the most legible instrument in the game.
//
// It carries what the console's topbar and status line carried between them:
// every number the world can see, what is going wrong, the clock, the doors to
// the Wire and the world, and — this is the part the console never had — the
// whole vocabulary of the app in front of you, each item with its key beside it.
//
// It is in normal flow, not fixed. `tools/shot.mjs` treats anything with a
// fixed or sticky ancestor as pinned and flags it under ChatGPT's floating chat
// box; in-flow chrome passes, which is why the console's nav passes today.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { esc } from '../dom.js';
import { statsHtml, statsKey, paintStats, visibleStats } from '../readouts.js';
import { APP_MAP, menuFor } from './apps.js';
import { alertsHtml, clockHtml, speedHtml, powerHtml, aboutHtml, transportHtml, statsForWidth,
  dockMoreItems } from './model.js';
import { alertChips } from '../readouts.js';
import { OS, machineName } from './config.js';
import * as Tutorial from '../tutorial.js';
import * as WM from './wm.js';

let barEl = null;
let menusEl = null;
let openKind = null;
let openAnchor = null;
let statBudget = 99;
let lastKey = '';
let worldChipFn = () => '';
let dockOpts = null;
export function registerDockOpts(fn) { dockOpts = fn || null; }
let savedAgoFn = () => null;

export function registerWorldChip(fn) { worldChipFn = fn || (() => ''); }
export function registerSavedAgo(fn) { savedAgoFn = fn || (() => null); }
function worldChip() { try { return worldChipFn() || ''; } catch { return ''; } }

// ── Build ───────────────────────────────────────────────────────────────────

export function mount(bar, menus) {
  barEl = bar; menusEl = menus;
  lastKey = '';
  statBudget = 99;
  bar.innerHTML = `
    <div class="mb-left">
      <button class="mb-title mb-mark" data-act="os-menu" data-v="mark" aria-haspopup="menu" aria-expanded="false">
        <span class="mb-mark-glyph" id="mb-mark-glyph"></span><span id="mb-company"></span>
      </button>
      <button class="mb-title mb-app" data-act="os-menu" data-v="app" aria-haspopup="menu" aria-expanded="false" id="mb-app"></button>
      <button class="mb-title" data-act="os-menu" data-v="window" aria-haspopup="menu" aria-expanded="false">Window</button>
      <button class="mb-title" data-act="os-menu" data-v="help" aria-haspopup="menu" aria-expanded="false">Help</button>
    </div>
    <div class="mb-right" id="mb-right">
      <div class="stat-strip" id="mb-stats"></div>
      <button class="mb-more" data-act="os-menu" data-v="stats" aria-label="More readouts" hidden>▾</button>
      <div class="mb-alerts" id="mb-alerts"></div>
      <button class="mb-x mb-aria" data-act="ask-aria" aria-label="Ask ARIA" data-tip="<b>Ask ARIA</b><br>a full read of where you stand · <b>A</b>" id="mb-aria">⌬</button>
      <span id="mb-power"></span>
      <span id="mb-world"></span>
      <span id="mb-wire"></span>
      <span id="mb-speed"></span>
      <span id="mb-clock"></span>
      <button class="mb-x mb-nc" data-act="os-nc" aria-label="Notifications" data-tip="Notifications">▤</button>
    </div>`;
}

// ── Paint ───────────────────────────────────────────────────────────────────

let lastVisibleCount = -1;
let lastWidthKey = '';

export function paint() {
  if (!S || !barEl) return;
  // Act III brings compute, Act IV brings world GDP. A new number means the bar
  // has to be measured again — and so does a number that got *longer*. The
  // ladder used to run only on a resize and on a change in the *count* of
  // stats, so a debt figure crossing four digits, an alert arriving, or an app
  // with a longer name coming forward all widened the bar with nothing
  // measuring it again. This is the whole set of things whose width can change
  // without the viewport changing, as one cheap string.
  const vis = visibleStats(S).length;
  const wk = `${vis}|${alertChips(S).length}|${String(S.company.debt | 0).length}`
    + `|${(S.company.name || '').length}|${(APP_MAP[WM.focused()]?.title || '').length}`;
  if (vis !== lastVisibleCount || wk !== lastWidthKey) {
    lastVisibleCount = vis; lastWidthKey = wk;
    queueMicrotask(() => measure());
  }
  const key = statsKey(S, `|${statBudget}`);
  const stats = document.getElementById('mb-stats');
  if (stats && lastKey !== key) {
    lastKey = key;
    const allowed = statsForWidth(S, statBudget);
    stats.innerHTML = statsHtml(S, { only: allowed });
    const more = barEl.querySelector('.mb-more');
    if (more) more.hidden = allowed.length >= visibleStats(S).length;
  }
  paintStats(S);

  const set = (id, text) => { const el = document.getElementById(id); if (el && el.textContent !== text) el.textContent = text; };
  set('mb-mark-glyph', (S.company.name || 'S')[0].toUpperCase());
  set('mb-company', S.company.name);

  const app = APP_MAP[WM.focused()] || APP_MAP[WM.lastModule()] || APP_MAP.desk;
  const appEl = document.getElementById('mb-app');
  if (appEl && appEl.textContent !== app.title) appEl.textContent = app.title;

  const html = (id, h) => { const el = document.getElementById(id); if (el && el.__h !== h) { el.__h = h; el.innerHTML = h; } };
  const alerts = alertChips(S);
  html('mb-alerts', alertsHtml(S));
  const al = document.getElementById('mb-alerts');
  // When the bar is tight the alerts collapse to the most severe one and a
  // count. CSS cannot count, so the count rides on the container and its
  // `::after` prints it.
  if (al) {
    const more = alerts.length > 1 ? `+${alerts.length - 1}` : '';
    if (al.dataset.more !== more) { if (more) al.dataset.more = more; else delete al.dataset.more; }
  }
  html('mb-world', worldChip());
  html('mb-wire', wireDoor(S));
  html('mb-power', powerHtml(S));
  html('mb-speed', speedHtml(S));
  html('mb-clock', clockHtml(S));

  const nc = barEl.querySelector('.mb-nc');
  if (nc) nc.classList.toggle('has', !!ncCount);
}

let ncCount = 0;
export function setNotificationCount(n) {
  ncCount = n || 0;
  const nc = barEl?.querySelector?.('.mb-nc');
  if (nc) nc.classList.toggle('has', !!ncCount);
}

function wireDoor(St) {
  const open = St.feed.filter((f) => f.thread && !f.resolved).length;
  return `<button class="tb-wire ${open ? 'needs' : ''}" data-act="wire-toggle"
    aria-label="The Wire" data-tip="<b>The Wire</b><br>${open ? `${open} thread${open === 1 ? '' : 's'} waiting on you` : 'nothing waiting'}"
    ><span class="tbw-dot"></span><span class="tbw-n">${open || '—'}</span></button>`;
}

// ── What goes first ─────────────────────────────────────────────────────────
// Nothing in the bar shrinks — a squeezed flex item overflows without changing
// `scrollWidth`, so the measurement would never see it and the alerts would
// print straight over the numbers. Instead the bar sheds, in a fixed order,
// until the two groups fit. The order is what a founder can least afford to
// lose, backwards:
//
//   ARIA's glyph                    · she is a dock tile and a key as well
//   the company's name              · its mark is still there, and it is a menu
//   the numbers, one at a time      · the overflow `▾` still has every one
//   the date                        · the day and the act are the load-bearing half
//   the alerts, to the worst + “+n” · the container's own `::after` counts them
//   the last number                 · the `▾` is now the only way to the numbers
//   the day                         · leaving the act, which is the story
//   the power cell                  · the Desk prints the same number, larger
//   the speed keys                  · Space still pauses, the clock still opens
//   the deck chip                   · the world app carries its own badge
//   the alerts entirely             · the notification centre is right there
//
// The speed keys go *before* the deck chip and not after, which `tools/shot.mjs`
// is the thing that knows: the chip is the world console's only door at a width
// where the Wire is a drawer, and the transport has two fallbacks — Space, and
// the clock's own popover, which still carries the full set.
//
// The ladder has to bottom out *below* every width this is played at, not at
// it. It used to end one rung up, at the day — which fits 420px with a short
// app name and a four-figure debt, and spills with “Agents” and five figures.
// A bar that can run out of rungs is a bar that prints over itself on somebody
// else's save, so the last two rungs exist to be reached by almost nobody.
//
// Measured once per resize and once per change of which numbers exist, never on
// a paint loop: dropping a cell is a layout change and doing it every frame
// would thrash.
const CLASSES = ['sh-aria', 'sh-company', 'sh-date', 'sh-alerts', 'sh-nostats',
  'sh-day', 'sh-power', 'sh-speed', 'sh-world', 'sh-noalerts'];

function shedPlan(n) {
  return ['sh-aria', 'sh-company',
    ...Array(Math.max(0, n - 1)).fill('stat'),
    'sh-date', 'sh-alerts', 'sh-nostats', 'sh-day', 'sh-power', 'sh-speed', 'sh-world', 'sh-noalerts'];
}

function applyShed(level) {
  if (!barEl || !S) return;
  const n = visibleStats(S).length;
  const taken = shedPlan(n).slice(0, level);
  statBudget = n - taken.filter((x) => x === 'stat').length;
  const on = new Set(taken.filter((x) => x !== 'stat'));
  for (const cls of CLASSES) barEl.classList.toggle(cls, on.has(cls));
  lastKey = '';
  paint();
}

export function measure() {
  if (!barEl || !S) return;
  const right = document.getElementById('mb-right');
  const left = barEl.querySelector('.mb-left');
  if (!right || !left) return;
  const total = barEl.clientWidth || 0;
  if (!total) return;
  const max = shedPlan(visibleStats(S).length).length;
  const fits = () => (left.scrollWidth || 0) + (right.scrollWidth || 0) + 18 <= total;
  let level = 0;
  applyShed(0);
  while (!fits() && level < max) { level++; applyShed(level); }
  shedLevel = level;
}
let shedLevel = 0;
export function shed() { return shedLevel; }

// ── Menus ───────────────────────────────────────────────────────────────────

function markItems() {
  const machine = machineName(S?.company?.name, S?.company?.act || 1);
  return [
    { label: 'About this machine…', act: 'os-about' },
    { sep: true },
    { label: 'Manual…', key: '?', act: 'help' },
    { label: 'Settings…', act: 'settings' },
    { sep: true },
    { label: 'Play with your assistant…', act: 'assistant-link' },
    { label: 'Open the classic console', act: 'os-classic' },
    { sep: true },
    { label: machine, disabled: true, quiet: true },
  ];
}

function windowItems() {
  const f = WM.focused();
  const open = WM.visibleWindows();
  const items = [
    { label: 'Zoom', act: 'os-win', v: 'zoom', disabled: !f },
    { label: 'Minimize', act: 'os-win', v: 'min', disabled: !f },
    { label: 'Close', act: 'os-win', v: 'close', disabled: !f },
    { sep: true },
    { label: 'Tile the Desk and the Wire', act: 'os-layout', v: 'work' },
    { label: 'The ops floor', act: 'os-layout', v: 'ops' },
    { label: 'Show the desktop', key: '0', act: 'os-showdesk' },
  ];
  if (open.length) {
    items.push({ sep: true }, { head: 'OPEN' });
    for (const id of open.slice().reverse()) {
      items.push({ label: APP_MAP[id]?.title || id, act: 'view', v: id, checked: id === f });
    }
  }
  return items;
}

function helpItems() {
  const rows = (() => { try { return Tutorial.chapterStatus(); } catch { return []; } })();
  const items = [{ label: 'Manual…', key: '?', act: 'help' }];
  if (rows.length) {
    items.push({ sep: true }, { head: 'WALKTHROUGHS' });
    for (const c of rows) {
      items.push({
        label: c.name,
        note: c.done ? 'complete' : c.available ? 'available' : 'not yet',
        act: 'os-walk', v: c.id, disabled: !c.available,
      });
    }
  }
  items.push({ sep: true }, { label: 'Keys', act: 'os-manual-tab', v: 'keys' },
    { label: 'Glossary', act: 'os-manual-tab', v: 'terms' },
    { label: 'The run', act: 'os-manual-tab', v: 'run' });
  return items;
}

function statsItems() {
  const shown = new Set(statsForWidth(S, statBudget));
  return visibleStats(S).filter((st) => !shown.has(st.id)).map((st) => ({
    label: st.label, note: st.fmt(st.get(S), S), disabled: true, quiet: false,
  }));
}

function itemsFor(kind) {
  if (kind === 'mark') return markItems();
  if (kind === 'window') return windowItems();
  if (kind === 'help') return helpItems();
  if (kind === 'stats') return statsItems();
  if (kind === 'app') {
    const id = WM.focused() || WM.lastModule();
    return menuFor(S, id);
  }
  // The dock's overflow tile. Its anchor is a dock tile rather than a bar
  // title, and `position()` only duck-types getBoundingClientRect, so the same
  // machinery drops the menu from the rack.
  if (kind === 'dockmore') return dockMoreItems(S, dockOpts?.() || {});
  return [];
}

export function itemHtml(it, i) {
  if (it.sep) return `<div class="menu-sep" role="separator"></div>`;
  if (it.head) return `<div class="menu-head">${esc(it.head)}</div>`;
  const attrs = it.act && !it.disabled ? `data-act="${it.act}"${it.v !== undefined ? ` data-v="${esc(String(it.v))}"` : ''}` : '';
  return `<button class="menu-item ${it.disabled ? 'disabled' : ''} ${it.danger ? 'danger' : ''} ${it.quiet ? 'quiet' : ''}"
    role="menuitem" ${it.disabled ? 'aria-disabled="true"' : ''} data-mi="${i}" ${attrs}>
    <span class="mi-check" aria-hidden="true">${it.checked ? '✓' : ''}</span>
    <span class="mi-label">${esc(it.label)}</span>
    ${it.note ? `<span class="mi-note">${esc(it.note)}</span>` : ''}
    ${it.key ? `<kbd class="mi-key">${esc(it.key)}</kbd>` : ''}
  </button>`;
}

export function openMenu(kind, anchor) {
  if (!menusEl) return;
  if (openKind === kind) { closeMenu(); return; }
  closeMenu();
  openKind = kind;
  openAnchor = anchor || barEl?.querySelector(`[data-v="${kind}"]`);

  let body;
  if (kind === 'clock') body = `<div class="menu popover" role="dialog" aria-label="Time">${transportHtml(S, { savedAgo: savedAgoFn() })}</div>`;
  else {
    const items = itemsFor(kind);
    const list = items.length ? items.map(itemHtml).join('') : `<div class="menu-head">nothing here</div>`;
    body = `<div class="menu" role="menu" aria-label="${esc(kind)}">${list}</div>`;
  }
  menusEl.innerHTML = body;
  const el = menusEl.firstElementChild;
  position(el, openAnchor);
  openAnchor?.setAttribute?.('aria-expanded', 'true');
  openAnchor?.classList?.add('lit');
  requestAnimationFrame(() => el?.classList?.add('in'));
}

function position(el, anchor) {
  if (!el) return;
  const r = anchor?.getBoundingClientRect?.();
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const w = el.offsetWidth || 240;
  const h = el.offsetHeight || 160;

  // Right-hand extras drop from their right edge so a wide popover never leaves
  // the screen; the titles on the left drop from theirs.
  let left = Math.round(r?.left ?? 8);
  if (left + w > vw - 8) left = Math.max(8, Math.round((r?.right ?? vw) - w));

  // And it flips up when there is no room below. The bar's own titles always
  // have room; the dock's overflow tile does not — on a vertical rail it sits
  // at the bottom of the screen, and a menu that drops from it lands entirely
  // off the glass. A menu anchored to a rail also goes beside it, not under it.
  const rail = document.getElementById('app')?.classList?.contains?.('dock-left')
    && anchor?.classList?.contains?.('dock-tile');
  let top = Math.round((r?.bottom ?? OS.MENUBAR_H) + 4);
  if (rail) {
    left = Math.round((r?.right ?? 0) + 6);
    if (left + w > vw - 8) left = Math.max(8, Math.round((r?.left ?? vw) - w - 6));
    top = Math.round(r?.top ?? 8);
  }
  if (top + h > vh - 8) top = Math.max(OS.MENUBAR_H + 4, Math.round((r?.top ?? vh) - h - 4));
  if (top + h > vh - 8) top = Math.max(OS.MENUBAR_H + 4, vh - h - 8);

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

export function closeMenu() {
  if (!openKind) return false;
  const el = menusEl?.firstElementChild;
  openAnchor?.setAttribute?.('aria-expanded', 'false');
  openAnchor?.classList?.remove('lit');
  openKind = null; openAnchor = null;
  if (el) {
    el.classList.remove('in');
    setTimeout(() => { if (!openKind && menusEl) menusEl.innerHTML = ''; }, OS.T_MENU_OUT);
  }
  return true;
}

export function isMenuOpen() { return !!openKind; }
export function menuKind() { return openKind; }

// Hovering another title while one is open switches to it, which is the one
// gesture that makes a menu bar feel like a menu bar rather than a row of
// buttons that each happen to open something.
export function hoverSwitch(title) {
  if (!openKind || !title) return;
  const kind = title.dataset?.v;
  if (kind && kind !== openKind) openMenu(kind, title);
}

const ORDER = ['mark', 'app', 'window', 'help'];
export function stepMenu(dir) {
  if (!openKind) return false;
  const i = ORDER.indexOf(openKind);
  if (i < 0) return false;
  const next = ORDER[(i + dir + ORDER.length) % ORDER.length];
  openMenu(next, barEl?.querySelector(`[data-v="${next}"]`));
  return true;
}

export function moveSelection(dir) {
  const menu = menusEl?.querySelector('.menu');
  if (!menu) return false;
  const items = Array.from(menu.querySelectorAll('.menu-item:not(.disabled)'));
  if (!items.length) return true;
  const cur = items.findIndex((n) => n.classList.contains('sel'));
  const next = cur < 0 ? (dir > 0 ? 0 : items.length - 1) : (cur + dir + items.length) % items.length;
  items.forEach((n) => n.classList.remove('sel'));
  items[next].classList.add('sel');
  try { items[next].focus({ preventScroll: true }); } catch {}
  return true;
}

export function activateSelection() {
  const sel = menusEl?.querySelector('.menu-item.sel') || null;
  if (!sel) return false;
  sel.click();
  return true;
}

export function aboutDialogBody(tools) {
  return aboutHtml(S, { tools, savedAgo: savedAgoFn() });
}

// A line from ARIA lights her glyph and says what she said, briefly. It is the
// one thing in the bar that is a voice rather than a number.
let ariaTimer = null;
export function ariaSpoke(line) {
  const el = document.getElementById('mb-aria');
  if (!el) return;
  el.classList.add('spoke');
  clearTimeout(ariaTimer);
  ariaTimer = setTimeout(() => el.classList.remove('spoke'), 6000);
  if (!line) return;
  const pop = document.createElement('div');
  pop.className = 'aria-pop';
  pop.innerHTML = `<span class="aria-pop-who">ARIA</span><span class="aria-pop-line">${esc(line)}</span>`;
  menusEl?.appendChild(pop);
  const r = el.getBoundingClientRect?.();
  if (r) { pop.style.top = `${Math.round(r.bottom + 6)}px`; pop.style.right = '12px'; }
  requestAnimationFrame(() => pop.classList.add('in'));
  setTimeout(() => { pop.classList.remove('in'); setTimeout(() => pop.remove(), 300); }, 5200);
}
