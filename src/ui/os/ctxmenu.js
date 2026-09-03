// ─────────────────────────────────────────────────────────────────────────────
// THE CONTEXT MENU — the second half of the menu bar.
//
// The bar says what the *app* can do. This says what the thing under the
// pointer can do, and it is the same instrument: the same plate, the same
// item renderer, the same 120ms in and 90ms out. `menubar.js` exports
// `itemHtml` so there is exactly one place in the workstation that knows what
// a menu item looks like.
//
// It is a menu, not a modal. It never traps focus, never puts up a scrim, and
// never eats a right-click over something it has nothing to say about — over
// bare prose, over a text field, over the browser's own chrome, the browser's
// own menu is the correct menu and it goes through untouched.
//
// The layer is `position: fixed` and lives outside the desktop, so it is one
// of the few things here `tools/shot.mjs` would call pinned. That is why the
// bottom clamp reads `--keepout-bottom`: a menu opened low on a 760px pane
// flips up rather than landing under ChatGPT's floating chat box.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { esc, hideTip } from '../dom.js';
import { OS } from './config.js';
import { itemHtml, closeMenu as closeBarMenu } from './menubar.js';

let hostEl = null;          // the container mount() was handed
let layerEl = null;         // our own fixed layer inside it
let menuEl = null;          // the open .ctx-menu, or null
let scrollEl = null;        // the scroller inside it — see place()
let opened = false;
let clearTimer = null;
let provider = null;        // fn(S, ctx) -> items[]
let prevFocus = null;

const PAD = 8;              // the closest a menu is allowed to come to an edge

// ── Mount ───────────────────────────────────────────────────────────────────

export function mount(node) {
  hostEl = node || null;
  layerEl = null; menuEl = null; scrollEl = null;
  opened = false;
  clearTimeout(clearTimer);
  ensureLayer();
}

// The layer carries its own `position: fixed; inset: 0`, so it works whichever
// container it is mounted into — and it is rebuilt if it ever goes missing.
// `menubar.js` clears its own container with `innerHTML`, and a layer parked in
// there would be swept away by the next drop of the Window menu with nothing
// saying so.
function ensureLayer() {
  const attached = (n) => (n && document.contains ? document.contains(n) : !!n);
  if (!hostEl) return null;
  if (layerEl && attached(layerEl)) return layerEl;
  // A host that has been rewritten out from under us is a menu nobody can see.
  // The body is a worse home than `#ctx` and a much better one than a detached
  // div, and `.ctx-layer` carries its own fixed geometry either way.
  const host = attached(hostEl) ? hostEl : (document.body || hostEl);
  layerEl = document.createElement('div');
  layerEl.className = 'ctx-layer';
  host.appendChild(layerEl);
  return layerEl;
}

export function registerMenus(fn) { provider = typeof fn === 'function' ? fn : null; }

// ── Open ────────────────────────────────────────────────────────────────────

export function openAt(items, x, y, label) {
  if (!ensureLayer() || !items || !items.length) return false;
  close(true);
  try { closeBarMenu(); } catch {}
  // A note left hanging over the very thing the menu is about to cover is the
  // one collision the tooltip layer cannot see coming.
  try { hideTip(); } catch {}
  prevFocus = document.activeElement || null;

  // The label rides above the scroller so a long menu cannot scroll away what
  // it is a menu *for*. Both it and the rule under it are `itemHtml`'s own
  // shapes — there is no second renderer here, on purpose.
  const head = label ? itemHtml({ head: label }, -1) + itemHtml({ sep: true }, -2) : '';
  layerEl.innerHTML = `<div class="menu ctx-menu" role="menu" aria-label="${esc(label || 'Actions')}">
      ${head}<div class="ctx-scroll" role="none">${items.map(itemHtml).join('')}</div>
    </div>`;
  menuEl = layerEl.firstElementChild || null;
  scrollEl = menuEl?.querySelector?.('.ctx-scroll') || null;
  opened = true;
  place(x, y);
  requestAnimationFrame(() => { if (opened) menuEl?.classList?.add('in'); });
  return true;
}

// Where the pointer was, unless that is off the glass. Down and to the right
// first, because that is where a menu goes; flipped when there is no room, and
// scrolled when there is no room in either direction.
function place(x, y) {
  const el = menuEl;
  if (!el || typeof el.offsetWidth !== 'number') return;
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const floor = Math.max(PAD + 80, vh - PAD - keepOut());

  if (scrollEl?.style) scrollEl.style.maxHeight = '';
  el.style.left = '0px'; el.style.top = '0px';

  const w = el.offsetWidth || 232;
  let h = el.offsetHeight || 120;
  // The pointer itself can be inside the keep-out band — the desktop runs to
  // the bottom of the pane at 760px and the chat box floats over the last
  // 132px of it. Measure the room from where the menu is *allowed* to start,
  // not from where the hand was: flipping up from a y under the floor anchors
  // the bottom edge under the chat box, which is the one thing the floor
  // exists to prevent.
  const anchor = Math.max(PAD, Math.min(y, floor));
  const down = floor - anchor;
  const up = anchor - PAD;
  const flip = h > down && up > down;
  const room = Math.max(96, flip ? up : down);
  if (h > room && scrollEl) {
    // The chrome is whatever is not the list — the label, the rule, the plate's
    // own padding. Measured rather than assumed, because a menu with no label
    // has a different amount of it.
    const chrome = h - (scrollEl.offsetHeight || 0);
    scrollEl.style.maxHeight = `${Math.max(72, Math.round(room - chrome))}px`;
    h = el.offsetHeight || h;
  }

  let top = flip ? anchor - h : anchor;
  top = Math.max(PAD, Math.min(top, Math.max(PAD, floor - h)));

  let left = x;
  if (left + w > vw - PAD) left = (x - w >= PAD) ? x - w : Math.max(PAD, vw - PAD - w);
  left = Math.max(PAD, left);

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.classList?.toggle?.('up', flip);
}

// ChatGPT's chat input floats over the bottom of its own browser and
// `applyMode` writes the height of that band onto `#app`. Reading it here is
// what keeps a low right-click from opening a menu nobody can click.
function keepOut() {
  try {
    const app = document.getElementById('app');
    const n = parseFloat(getComputedStyle(app).getPropertyValue('--keepout-bottom'));
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

// ── Close ───────────────────────────────────────────────────────────────────

export function close(now = false) {
  if (!opened) return false;
  opened = false;
  const el = menuEl;
  menuEl = null; scrollEl = null;
  if (el) {
    el.classList?.remove?.('in');
    clearTimeout(clearTimer);
    const sweep = () => { if (!opened && layerEl) layerEl.innerHTML = ''; };
    if (now) sweep(); else clearTimer = setTimeout(sweep, OS.T_MENU_OUT);
  }
  // Focus goes back where it came from, but only if we are the ones holding it.
  // A menu opened with the mouse never took it in the first place, and putting
  // it somewhere would be the menu deciding where the founder is looking.
  const active = document.activeElement;
  if (prevFocus && active && el?.contains?.(active)) {
    try { prevFocus.focus({ preventScroll: true }); } catch {}
  }
  prevFocus = null;
  return true;
}

export function isOpen() { return opened; }

// ── The right-click ─────────────────────────────────────────────────────────

function itemsFor(kind, el, data) {
  if (!provider) return [];
  try { return provider(S, { kind, el, data }) || []; }
  catch (err) { console.warn('[ctxmenu]', err); return []; }
}

// Whatever the element carried, minus the keys that are the menu's own wiring.
// Every item that acts gets the rest stamped onto it, so the handler reads
// `d.id` and `d.path` the way it reads `d.v` — the item never has to smuggle
// an identity through `v`. See stamp().
// `tip` / `tipTitle` would hang the source element's tooltip off every item in
// the menu, and `dom.js` opens one on focus — so arrowing down a menu would
// print a note about the thing the menu is for, over the menu. `tut` is a
// walkthrough anchor and a spotlight that lands on a menu item is a spotlight
// on nothing a step later. `slider` / `value` make an item a control.
const RESERVED = new Set([
  'ctx', 'ctxLabel', 'act', 'v', 'mi',
  'tip', 'tipTitle', 'tut', 'slider', 'value',
]);

// What the pointer is over, in the menu's terms: the nearest `data-ctx`, or
// the bare desktop, or nothing. Shared by the right-click and the long press.
function targetOf(node) {
  if (node?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return null;
  const host = node?.closest?.('[data-ctx]') || null;
  let kind = host?.dataset?.ctx || null;
  // Bare desktop — the wallpaper, the widgets, the gap between windows. Inside
  // a window with nothing to say, the browser's menu is still the honest one:
  // `.desktop` is an ancestor of every window as well.
  if (!kind && node?.closest?.('.desktop') && !node?.closest?.('.win')) kind = 'desktop';
  return kind ? { kind, host, data: host ? { ...host.dataset } : {} } : null;
}

document.addEventListener('contextmenu', (e) => {
  if (!hostEl) return;
  // A finger that held long enough already has its menu (below); the browser's
  // own contextmenu arrives a moment later and must not reopen it over itself.
  if (performance.now() - pressOpenedAt < 900) { e.preventDefault(); return; }
  // Text you can select, edit or spellcheck keeps the browser's menu. The Find
  // palette has a field in it and copy has to work there.
  const t = targetOf(e.target);
  if (!t) { if (!e.target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) close(); return; }

  const items = itemsFor(t.kind, t.host, t.data);
  if (!items.length) { close(); return; }

  // Only now. A menu that is not going to appear must never swallow the one
  // that would have.
  e.preventDefault();
  const label = t.host?.dataset?.ctxLabel || t.kind;
  if (openAt(items, e.clientX, e.clientY, label)) stamp(t.data);
}, true);

// ── The long press ──────────────────────────────────────────────────────────
// A finger has no right button. Held still on something for half a second, it
// opens the same menu the right-click would, from the same provider; moving
// or lifting first is a scroll or a tap and opens nothing. The tap that the
// hold releases is swallowed once, or it would land on the thing under the
// finger — a dock tile, an action — and close the menu it just opened.
const PRESS_MS = 500;
const PRESS_SLOP = 8;
let press = null;
let pressOpenedAt = -1e9;
let swallowTap = false;

function endPress() { if (press) { clearTimeout(press.t); press = null; } }

document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !hostEl) return;
  swallowTap = false;
  endPress();
  if (e.target?.closest?.('.ctx-menu')) return;
  const t = targetOf(e.target);
  if (!t) return;
  const x = e.clientX, y = e.clientY;
  press = { x, y, t: setTimeout(() => {
    press = null;
    const items = itemsFor(t.kind, t.host, t.data);
    if (!items.length) return;
    if (openAt(items, x, y, t.host?.dataset?.ctxLabel || t.kind)) {
      stamp(t.data);
      pressOpenedAt = performance.now();
      swallowTap = true;
    }
  }, PRESS_MS) };
}, true);
document.addEventListener('pointermove', (e) => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > PRESS_SLOP) endPress();
}, true);
document.addEventListener('pointerup', endPress, true);
document.addEventListener('pointercancel', endPress, true);
document.addEventListener('click', (e) => {
  if (!swallowTap) return;
  swallowTap = false;
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);

function stamp(data) {
  if (!menuEl || !data) return;
  const btns = menuEl.querySelectorAll?.('.menu-item[data-act]') || [];
  for (const b of btns) {
    for (const k in data) {
      if (RESERVED.has(k) || k in b.dataset) continue;
      b.dataset[k] = data[k];
    }
  }
}

// ── What closes it ──────────────────────────────────────────────────────────
// Everything, basically. A context menu is the shallowest thing on the glass
// and the founder should never have to aim at it to be rid of it.

// A press anywhere else. Capture, so it lands before the window manager starts
// a drag with a menu still hanging over the title bar.
document.addEventListener('pointerdown', (e) => {
  if (!opened) return;
  if (e.target?.closest?.('.ctx-menu')) return;
  close();
}, true);

// An item that acts. `dom.js` registered its delegated `[data-act]` handler at
// module load, which is before this one, so the action has already run by the
// time we get here — the menu closes behind it rather than under it. A
// *disabled* item carries no action and does not close: the note saying why it
// is blocked is the whole reason that item is in the menu.
document.addEventListener('click', (e) => {
  if (!opened) return;
  if (e.target?.closest?.('[data-act]')) close();
});

// Anything that moves the world out from under it.
document.addEventListener('scroll', (e) => {
  if (!opened) return;
  if (e.target?.closest?.('.ctx-menu')) return;   // its own scroller does not count
  close(true);
}, true);
window.addEventListener('resize', () => close(true));
window.addEventListener('blur', () => close(true));

// ── Keys ────────────────────────────────────────────────────────────────────
// Arrows move, Enter activates, Escape closes — and every other key is the
// founder getting on with the game, so the menu steps out of the way and the
// key goes through untouched.
document.addEventListener('keydown', (e) => {
  if (!opened) return;
  const k = e.key;
  const eat = () => { e.preventDefault(); e.stopImmediatePropagation(); };

  if (k === 'Escape') { eat(); close(); return; }
  if (k === 'ArrowDown' || k === 'ArrowUp') { eat(); move(k === 'ArrowDown' ? 1 : -1); return; }
  if (k === 'Home' || k === 'End') { eat(); moveTo(k === 'Home' ? 0 : -1); return; }
  if (k === 'Enter') { if (activate()) eat(); else close(); return; }
  // A focused item answers Space itself, the way any button does. With focus
  // outside the menu it is still the pause key.
  if (k === ' ') { if (menuEl?.contains?.(document.activeElement)) return; close(); return; }
  if (k === 'Tab') { close(); return; }
  if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta' || k === 'ArrowLeft' || k === 'ArrowRight') return;
  close();
}, true);

function enabledItems() {
  return Array.from(menuEl?.querySelectorAll?.('.menu-item:not(.disabled)') || []);
}

function select(node) {
  for (const n of enabledItems()) n.classList?.remove?.('sel');
  if (!node) return false;
  node.classList?.add?.('sel');
  try { node.focus({ preventScroll: true }); } catch {}
  keepInView(node);
  return true;
}

function move(dir) {
  const list = enabledItems();
  if (!list.length) return false;
  const cur = list.findIndex((n) => n.classList?.contains?.('sel'));
  const next = cur < 0 ? (dir > 0 ? 0 : list.length - 1) : (cur + dir + list.length) % list.length;
  return select(list[next]);
}

function moveTo(i) {
  const list = enabledItems();
  if (!list.length) return false;
  return select(i < 0 ? list[list.length - 1] : list[i]);
}

// `scrollIntoView` would scroll the ancestors too, and one of those ancestors
// is the desktop. This moves the scroller and nothing else.
function keepInView(node) {
  const sc = scrollEl;
  if (!sc || typeof sc.scrollTop !== 'number' || typeof node.offsetTop !== 'number') return;
  const top = node.offsetTop;
  const bottom = top + (node.offsetHeight || 0);
  if (top < sc.scrollTop) sc.scrollTop = top;
  else if (bottom > sc.scrollTop + (sc.clientHeight || 0)) sc.scrollTop = bottom - (sc.clientHeight || 0);
}

// The click closes it on the way past — `dom.js` runs the action first and this
// module's own click handler closes behind it. An enabled item with no action
// never reaches that handler, so close here too rather than leave a menu that
// answers Enter with nothing, for ever.
function activate() {
  const sel = menuEl?.querySelector?.('.menu-item.sel:not(.disabled)');
  if (!sel) return false;
  sel.click();
  close();
  return true;
}
