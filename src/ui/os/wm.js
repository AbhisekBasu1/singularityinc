// ─────────────────────────────────────────────────────────────────────────────
// THE WINDOW MANAGER
//
// Windows are created once and never destroyed. Closing one hides it; its
// geometry, its scroll position and its DOM all survive, so reopening is
// instant and the view inside it is never torn down — which matters more here
// than anywhere else in the game, because `render()` patches and a rebuilt
// subtree would throw away the pointer, the hover and the focus ring seven
// times a second.
//
// Geometry is kept as fractions of the desktop rather than pixels. A layout
// saved on a 1440px screen opens sensibly on a 1280px one, a browser resize
// keeps the shape the founder arranged, and the stacked mode at 760px needs no
// arithmetic of its own.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { esc } from '../dom.js';
import { APP_MAP, isLocked, readoutFor } from './apps.js';
import { OS } from './config.js';
import { layoutFor } from './model.js';

let deskEl = null;
let mode = 'desktop';
let zorder = [];                 // app ids, front last
let ghost = null;
let showingDesktop = false;
let onFocusChange = null;
let onGeometryChange = null;
const paintedAt = {};            // id → performance.now() of its last paint

const reduced = () => {
  try {
    return document.documentElement?.classList?.contains('reduced-motion')
      || !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch { return true; }
};

// ── State ───────────────────────────────────────────────────────────────────

export function store() {
  if (!S) return { windows: {}, focused: null, lastModule: 'desk' };
  S.ui ??= {};
  const os = (S.ui.os ??= { windows: {}, focused: null, lastModule: 'desk', layoutVersion: 1 });
  os.windows ??= {};
  os.lastModule ??= 'desk';
  return os;
}

function win(id) {
  const os = store();
  return (os.windows[id] ??= { open: false, min: false, zoomed: false, fx: null, fy: null, fw: null, fh: null });
}

export function isOpen(id) { return !!store().windows[id]?.open; }
export function isVisible(id) { const w = store().windows[id]; return !!(w?.open && !w.min); }
export function focused() { return store().focused; }
export function lastModule() { return store().lastModule || 'desk'; }
export function currentMode() { return mode; }

// ── The Wire, docked ────────────────────────────────────────────────────────
// At desktop width the Wire is not a window. It is a rail down the right edge,
// the way it has always been in the console — because it is not a view you go
// and look at, it is the thing that tells you a decision is waiting, and a
// panel that can end up behind four other panels cannot do that job. As a
// window it was buried within a minute of play and the founder's only way back
// was a menu-bar chip that *closed* it on the first click.
//
// The rail is not laid over the desktop, it is taken out of it: `deskSize()`
// is the one function every other piece of geometry asks — drag clamps, the
// snap boxes, the zoom box, the first layout, the saved fractions — so
// shrinking the answer here is enough to make every window in the machine stop
// at the rail instead of sliding under it.
// The founder's choice lives in `S.ui.os` beside the window geometry, so it is
// saved and the machine reopens the way it was left. Default is docked.
export function wireDocked() {
  return store().wireDock !== false && mode === 'desktop' && railRoom();
}
export function setWireDocked(on) {
  store().wireDock = !!on;
  applyAll();
  return wireDocked();
}

function rawDesk() {
  if (!deskEl) return { w: 1200, h: 700 };
  const r = deskEl.getBoundingClientRect?.();
  return {
    w: Math.max(320, Math.round(r?.width || deskEl.clientWidth || 1200)),
    h: Math.max(240, Math.round(r?.height || deskEl.clientHeight || 700)),
  };
}

// A rail that leaves too little for a window is worse than no rail.
function railRoom() { return rawDesk().w - OS.WIRE_W >= OS.WIRE_MIN_FIELD; }

export function railWidth() { return wireDocked() ? OS.WIRE_W : 0; }

// ── The desktop's usable box ────────────────────────────────────────────────

export function deskSize() {
  const d = rawDesk();
  return { w: Math.max(320, d.w - railWidth()), h: d.h };
}

function toPx(w, id) {
  const { w: DW, h: DH } = deskSize();
  const app = APP_MAP[id];
  const minW = Math.min(app?.min?.[0] ?? 360, DW - OS.INSET * 2);
  const minH = Math.min(app?.min?.[1] ?? 280, DH - OS.INSET * 2);
  let width = Math.round((w.fw ?? 0.6) * DW);
  let height = Math.round((w.fh ?? 0.8) * DH);
  width = Math.max(minW, Math.min(DW, width));
  height = Math.max(minH, Math.min(DH, height));
  let x = Math.round((w.fx ?? 0.05) * DW);
  let y = Math.round((w.fy ?? 0.05) * DH);
  x = Math.max(-(width - OS.DRAG_KEEP), Math.min(DW - OS.DRAG_KEEP, x));
  y = Math.max(0, Math.min(Math.max(0, DH - OS.TITLE_H), y));
  return { x, y, w: width, h: height };
}

function commit(id, px) {
  const { w: DW, h: DH } = deskSize();
  const w = win(id);
  w.fx = px.x / DW; w.fy = px.y / DH;
  w.fw = px.w / DW; w.fh = px.h / DH;
  onGeometryChange?.();
}

export function rectOf(id) {
  const el = elOf(id);
  if (!el || el.classList?.contains('hidden')) return null;
  return el.getBoundingClientRect?.() || null;
}

// ── The elements ────────────────────────────────────────────────────────────

const els = new Map();
export function elOf(id) { return els.get(id) || null; }
export function bodyOf(id) { return els.get(id)?.querySelector?.('.win-body') || null; }

export function mount(desktop) {
  deskEl = desktop;
  els.clear();
  zorder = [];
  showingDesktop = false;
}

export function setCallbacks({ onFocus, onGeometry } = {}) {
  onFocusChange = onFocus || null;
  onGeometryChange = onGeometry || null;
}

// The Wire keeps the console's own ids so `paintFeed`, the walkthrough and
// `tools/shot.mjs` all keep working without knowing there is a desktop.
function bodyMarkup(id) {
  if (id === 'wire') {
    return `<section class="world-console" id="world-console" data-tut="author"></section>
      <div class="feed-head">
        <span class="live-dot"></span>
        <span class="feed-title">Wire</span>
        <span class="grow"></span>
        <span class="tiny dimmer mono" id="feed-count"></span>
      </div>
      <div class="feed-list" id="feed-list"></div>`;
  }
  if (id === 'uplink') return `<div class="world-console in-dialog" id="uplink-body"></div>`;
  return '';
}

export function ensure(id) {
  if (els.has(id)) return els.get(id);
  const app = APP_MAP[id];
  if (!app || !deskEl) return null;
  const el = document.createElement('div');
  el.className = 'win hidden' + (id === 'wire' ? ' win-wire' : '');
  el.dataset.app = id;
  el.style.setProperty('--accent', app.accent);
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', app.fullTitle || app.title);
  // The Wire keeps the id the whole codebase already reaches for.
  if (id === 'wire') el.id = 'feed-rail';
  el.innerHTML = `
    <div class="win-shadow" aria-hidden="true"></div>
    <div class="win-plate" data-ctx="window" data-win="${id}">
      <div class="win-title" data-wintitle data-ctx="window" data-win="${id}">
        <span class="win-keys">
          <button class="wk wk-close" data-winkey="close" aria-label="Close ${esc(app.title)}"><i>✕</i></button>
          <button class="wk wk-min" data-winkey="min" aria-label="Minimize ${esc(app.title)}"><i>–</i></button>
          <button class="wk wk-zoom" data-winkey="zoom" aria-label="Zoom ${esc(app.title)}"><i>⤢</i></button>
        </span>
        <span class="win-name">${app.index ? `<span class="win-idx">${String(app.index).padStart(2, '0')}</span>` : ''}${
          app.glyph ? `<span class="win-glyph" aria-hidden="true">${app.glyph}</span>` : ''}${esc(app.title)}</span>
        <span class="win-readout" data-readout></span>
      </div>
      <div class="win-body" tabindex="-1"${id === 'wire' ? '' : ''}>${bodyMarkup(id)}</div>
      <span class="win-grip" data-winresize="se" aria-hidden="true"></span>
      <span class="win-edge e-n" data-winresize="n"></span>
      <span class="win-edge e-s" data-winresize="s"></span>
      <span class="win-edge e-e" data-winresize="e"></span>
      <span class="win-edge e-w" data-winresize="w"></span>
      <span class="win-edge e-ne" data-winresize="ne"></span>
      <span class="win-edge e-nw" data-winresize="nw"></span>
      <span class="win-edge e-sw" data-winresize="sw"></span>
    </div>`;
  deskEl.appendChild(el);
  els.set(id, el);
  return el;
}

// ── Opening and closing ─────────────────────────────────────────────────────

export function open(id, { focus: doFocus = true, silent = false } = {}) {
  const app = APP_MAP[id];
  if (!app) return false;
  if (app.module && isLocked(S, app)) return false;
  const w = win(id);
  const fresh = !w.open;
  if (w.fw == null) placeFresh(id);
  w.open = true;
  w.min = false;
  const el = ensure(id);
  if (el) {
    el.classList.remove('hidden');
    apply(id);
    if (fresh && !reduced() && !silent) {
      el.classList.remove('win-in'); void el.offsetWidth; el.classList.add('win-in');
      setFlightVars(el, id);
      // Take the class off when the flight lands. `winIn` has no fill-mode, so
      // a stale one is invisible — until something restarts animations on the
      // element, and then a settled window replays its open, scaled and
      // blurred, for a quarter of a second. `win-out` has always cleaned up
      // after itself; this is the same courtesy.
      const land = () => { el.classList.remove('win-in'); clearTimeout(t); };
      const t = setTimeout(land, OS.T_WIN + 120);
      el.addEventListener('animationend', land, { once: true });
    }
  }
  if (showingDesktop) showDesktop(false);
  if (doFocus) focus(id);
  else raise(id, false);
  return fresh;
}

// A window opened for the first time cascades from the corner rather than
// landing on top of whatever is already there.
// Where a window goes the first time it is ever opened. After that its own
// geometry is kept, so this only ever decides the shape of a machine nobody has
// arranged yet — and that shape is most of the first impression.
//
// A module is a working surface, the same one the console gives a whole screen
// to, so it takes the field: edge to edge, with the Wire rail beside it. Eight
// near-identical 62%-wide rectangles offset by fifteen pixels each is not a
// desktop, it is a pile of paper, and it was what opening four views looked
// like. Two side by side is one snap away and the arrangement is remembered.
//
// The machine's own four — ARIA, the Manual, Settings, the Uplink — are not
// working surfaces. They float, smaller, over whatever you were doing, and
// cascade among themselves so a second one does not land on the first.
function placeFresh(id) {
  const app = APP_MAP[id];
  const w = win(id);
  const { w: DW, h: DH } = deskSize();
  if (app.module) {
    w.fx = OS.INSET / DW; w.fy = OS.INSET / DH;
    w.fw = 1 - (OS.INSET * 2) / DW; w.fh = 1 - (OS.INSET * 2) / DH;
    return;
  }
  const [fx, fy, fw, fh] = app.def;
  const floats = zorder.filter((x) => isVisible(x) && x !== 'wire' && !APP_MAP[x]?.module).length;
  const off = Math.min(4, floats) * OS.CASCADE;
  w.fw = fw; w.fh = fh;
  w.fx = Math.min(fx + off / DW, Math.max(0, 1 - fw - 0.01));
  w.fy = Math.min(fy + off / DH, Math.max(0, 1 - fh - 0.01));
}

export function close(id, { silent = false } = {}) {
  const w = store().windows[id];
  if (!w?.open) return false;
  w.open = false; w.min = false;
  const el = elOf(id);
  if (el) {
    if (reduced() || silent) el.classList.add('hidden');
    else flyToDock(id, () => el.classList.add('hidden'));
  }
  zorder = zorder.filter((x) => x !== id);
  if (store().focused === id) focusTop();
  onGeometryChange?.();
  onFocusChange?.();
  return true;
}

export function minimize(id) {
  // A rail has one gesture — shut it — and its keys say so. This is the guard
  // for every other path that could reach it: a digit key, the Window menu,
  // `toggle`. A minimised rail is a strip of desktop no window is allowed to
  // use with nothing in it.
  if (id === 'wire' && wireDocked()) return false;
  const w = store().windows[id];
  if (!w?.open || w.min) return false;
  w.min = true;
  const el = elOf(id);
  if (el) {
    if (reduced()) el.classList.add('hidden');
    else flyToDock(id, () => el.classList.add('hidden'));
  }
  if (store().focused === id) focusTop();
  onGeometryChange?.();
  onFocusChange?.();
  return true;
}

// The flight path between a window and its tile in the dock. Both directions
// use the same two custom properties, so the animation is one keyframe.
function setFlightVars(el, id) {
  const tile = document.querySelector(`.dock-tile[data-v="${id}"]`);
  const r = el.getBoundingClientRect?.();
  const t = tile?.getBoundingClientRect?.();
  if (!r || !t || !r.width || !t.width) return;
  el.style.setProperty('--fly-x', `${Math.round(t.left + t.width / 2 - (r.left + r.width / 2))}px`);
  el.style.setProperty('--fly-y', `${Math.round(t.top + t.height / 2 - (r.top + r.height / 2))}px`);
}

function flyToDock(id, done) {
  const el = elOf(id);
  if (!el) { done?.(); return; }
  setFlightVars(el, id);
  el.classList.remove('win-in');
  el.classList.add('win-out');
  setTimeout(() => { el.classList.remove('win-out'); done?.(); }, OS.T_WIN);
}

export function toggle(id) {
  if (isVisible(id) && store().focused === id && mode === 'desktop') return minimize(id);
  if (isVisible(id)) return focus(id);
  return open(id);
}

// ── Focus and stacking ──────────────────────────────────────────────────────

export function focus(id) {
  if (!isVisible(id)) return false;
  raise(id, true);
  const os = store();
  const changed = os.focused !== id;
  os.focused = id;
  if (APP_MAP[id]?.module) os.lastModule = id;
  paintFocusClasses();
  if (changed) {
    const body = bodyOf(id);
    try { if (body && !body.contains(document.activeElement)) body.focus({ preventScroll: true }); } catch {}
  }
  onFocusChange?.();
  return changed;
}

function raise(id, toTop) {
  zorder = zorder.filter((x) => x !== id);
  if (toTop) zorder.push(id); else zorder.unshift(id);
  applyZ();
}

function applyZ() {
  zorder.forEach((id, i) => {
    const el = elOf(id);
    if (el) el.style.zIndex = String(Math.min(OS.Z_TOP, OS.Z_BASE + i));
  });
}

function focusTop() {
  const os = store();
  for (let i = zorder.length - 1; i >= 0; i--) {
    if (isVisible(zorder[i])) { os.focused = zorder[i]; if (APP_MAP[zorder[i]]?.module) os.lastModule = zorder[i]; paintFocusClasses(); return; }
  }
  os.focused = null;
  paintFocusClasses();
}

function paintFocusClasses() {
  const f = store().focused;
  for (const [id, el] of els) el.classList.toggle('on', id === f);
}

export function visibleWindows() { return zorder.filter(isVisible); }

// ── Geometry ────────────────────────────────────────────────────────────────

export function apply(id) {
  const el = elOf(id);
  if (!el) return;
  const w = win(id);
  // Below 1120px the Wire stops being a window and becomes the drawer it has
  // always been at that width. Its geometry is the stylesheet's, so the inline
  // left/top a previous desktop layout wrote has to go — an inline `left`
  // beats a rule, and the drawer would slide in somewhere in the middle of the
  // screen instead of against the right edge.
  // The Wire's geometry is the stylesheet's in both of its non-window shapes —
  // the drawer below 1120px and the docked rail above it. An inline `left` from
  // some earlier layout beats a rule, so it has to be cleared, or the rail
  // opens somewhere in the middle of the screen.
  if (id === 'wire' && (mode !== 'desktop' || wireDocked())) {
    el.style.left = ''; el.style.top = ''; el.style.width = ''; el.style.height = '';
    return;
  }
  if (mode === 'stacked') {
    el.style.left = '0px'; el.style.top = '0px';
    el.style.width = '100%'; el.style.height = '100%';
    return;
  }
  const px = w.zoomed ? zoomBox() : toPx(w, id);
  el.style.left = px.x + 'px';
  el.style.top = px.y + 'px';
  el.style.width = px.w + 'px';
  el.style.height = px.h + 'px';
}

// Is this window already exactly the box zoom would give it?
function fillsField(w, id) {
  const box = zoomBox();
  const px = toPx(w, id);
  return Math.abs(px.w - box.w) <= 4 && Math.abs(px.h - box.h) <= 4
    && Math.abs(px.x - box.x) <= 4 && Math.abs(px.y - box.y) <= 4;
}

function zoomBox() {
  const { w, h } = deskSize();
  const pad = mode === 'compact' ? OS.INSET : OS.INSET;
  return { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
}

export function applyAll() { for (const id of els.keys()) if (isVisible(id)) apply(id); }

export function toggleZoom(id) {
  const w = win(id);
  if (mode === 'stacked') return false;
  // Same reason as `minimize`: a rail cannot be zoomed. Its own zoom key is
  // hidden, but a hidden button still answers a programmatic click and the
  // Window menu can reach it — and the `zoomed` flag it left behind is saved,
  // so it would come back on a founder who later undocks the rail.
  if (id === 'wire' && wireDocked()) return false;
  if (w.zoomed) {
    w.zoomed = false;
    // Compact mode's first layout opens the Desk already `zoomed` and with
    // nothing stored to go back to, so this branch used to restore the box it
    // was already in. Same answer as below: the app's own floating size.
    if (w.pre) { Object.assign(w, w.pre); w.pre = null; }
    else { const [fx, fy, fw, fh] = APP_MAP[id]?.def || [0.12, 0.08, 0.74, 0.84];
      w.fx = fx; w.fy = fy; w.fw = fw; w.fh = fh; }
  } else if (fillsField(w, id)) {
    // A module opens filling the field, so on a machine nobody has arranged the
    // green key had nowhere bigger to go and did nothing at all — which this
    // codebase's own rule calls worse than a key that is not there. It goes the
    // other way instead: back to the size the app was drawn to float at, which
    // is what `def` in `apps.js` has always been for. Pressing it again fills.
    const app = APP_MAP[id];
    const [fx, fy, fw, fh] = app?.def || [0.12, 0.08, 0.74, 0.84];
    w.pre = null;
    w.fx = fx; w.fy = fy; w.fw = fw; w.fh = fh;
  } else {
    w.pre = { fx: w.fx, fy: w.fy, fw: w.fw, fh: w.fh };
    w.zoomed = true;
  }
  const el = elOf(id);
  el?.classList.toggle('zoomed', !!w.zoomed);
  apply(id);
  onGeometryChange?.();
  return true;
}

// ── Modes ───────────────────────────────────────────────────────────────────

export function setMode(next) {
  if (mode === next) { applyAll(); return false; }
  mode = next;
  deskEl?.classList?.toggle('stacked', mode === 'stacked');
  if (mode === 'stacked') {
    // One window at a time. Everything stays open in state so returning to a
    // wide screen finds the desktop as it was left. The Wire is a drawer here
    // and keeps whatever the door last said.
    const drawerOpen = document.getElementById('app')?.classList?.contains('wire-open');
    const f = store().focused && isVisible(store().focused) && store().focused !== 'wire'
      ? store().focused : lastModule();
    for (const id of els.keys()) {
      const el = elOf(id);
      if (!el) continue;
      const vis = id === 'wire' ? (drawerOpen && isOpen('wire')) : (id === f && isVisible(id));
      el.classList.toggle('hidden', !vis);
    }
    if (isVisible(f)) { store().focused = f; paintFocusClasses(); }
  } else {
    for (const id of els.keys()) elOf(id)?.classList?.toggle('hidden', !isVisible(id));
  }
  applyAll();
  onFocusChange?.();
  return true;
}

// In stacked mode only the front window is on screen; switching apps swaps it.
// The Wire is the exception: it is a drawer over the front window there, not
// one of the things being switched between, so an open drawer stays open.
export function stackedShow(id) {
  if (mode !== 'stacked') return;
  const drawerOpen = document.getElementById('app')?.classList?.contains('wire-open');
  for (const other of els.keys()) {
    if (other === 'wire' && drawerOpen) continue;
    elOf(other)?.classList?.add('hidden');
  }
  const el = ensure(id);
  el?.classList?.remove('hidden');
  apply(id);
}

// ── Show desktop ────────────────────────────────────────────────────────────

export function showDesktop(next) {
  const want = next === undefined ? !showingDesktop : !!next;
  if (want === showingDesktop) return showingDesktop;
  showingDesktop = want;
  deskEl?.classList?.toggle('peek', showingDesktop);
  return showingDesktop;
}
export function isShowingDesktop() { return showingDesktop; }

// ── Restore and reset ───────────────────────────────────────────────────────

export function restore({ first = false } = {}) {
  const os = store();
  const saved = Object.entries(os.windows).filter(([, w]) => w.open);
  if (first || !saved.length) {
    const lay = layoutFor(mode, deskSize());
    os.windows = {};
    zorder = [];
    for (const [id, w] of Object.entries(lay)) {
      const rec = win(id);
      const { w: DW, h: DH } = deskSize();
      rec.open = true; rec.min = false; rec.zoomed = !!w.zoomed;
      rec.fx = w.x / DW; rec.fy = w.y / DH; rec.fw = w.w / DW; rec.fh = w.h / DH;
      ensure(id);
      zorder.push(id);
    }
    os.focused = 'desk'; os.lastModule = 'desk';
  } else {
    zorder = saved
      .sort((a, b) => (a[1].z || 0) - (b[1].z || 0))
      .map(([id]) => id)
      .filter((id) => APP_MAP[id]);
    for (const id of zorder) ensure(id);
    if (!os.focused || !isVisible(os.focused)) os.focused = zorder[zorder.length - 1] || null;
  }
  for (const id of zorder) {
    const el = elOf(id);
    if (!el) continue;
    el.classList.toggle('hidden', !isVisible(id));
    el.classList.toggle('zoomed', !!win(id).zoomed);
  }
  if (mode === 'stacked' && os.focused) stackedShow(os.focused);
  applyZ();
  applyAll();
  paintFocusClasses();
}

export function persist() {
  const os = store();
  zorder.forEach((id, i) => { if (os.windows[id]) os.windows[id].z = i; });
}

export function resetLayout() {
  for (const id of Object.keys(store().windows)) {
    const w = store().windows[id];
    w.open = false; w.min = false; w.zoomed = false;
    elOf(id)?.classList?.add('hidden');
  }
  zorder = [];
  restore({ first: true });
}

// ── Shutdown ────────────────────────────────────────────────────────────────

export function closeAllForShutdown() {
  const order = visibleWindows().slice().reverse();
  if (reduced()) {
    for (const id of order) elOf(id)?.classList?.add('hidden');
    return Promise.resolve();
  }
  return new Promise((done) => {
    order.forEach((id, i) => setTimeout(() => flyToDock(id, () => elOf(id)?.classList?.add('hidden')), i * OS.T_SHUTDOWN_STEP));
    setTimeout(done, order.length * OS.T_SHUTDOWN_STEP + OS.T_WIN);
  });
}

// ── Paint scheduling ────────────────────────────────────────────────────────
// The focused window paints on every `paintMain`; the rest take turns, one per
// call, no faster than `PAINT_OTHER_MS`. An idle window costs one string build,
// because `render()` short-circuits on an identical string.

export function paintTargets(now) {
  const f = store().focused;
  const out = [];
  if (f && isVisible(f)) { out.push(f); paintedAt[f] = now; }
  let oldest = null, oldestAt = Infinity;
  for (const id of visibleWindows()) {
    if (id === f) continue;
    const at = paintedAt[id] ?? 0;
    if (now - at < OS.PAINT_OTHER_MS) continue;
    if (at < oldestAt) { oldest = id; oldestAt = at; }
  }
  if (oldest) { out.push(oldest); paintedAt[oldest] = now; }
  return out;
}

export function markPainted(id, now) { paintedAt[id] = now; }
export function invalidate(id) { delete paintedAt[id]; }

// ── Title bars ──────────────────────────────────────────────────────────────

export function paintChrome() {
  if (!S) return;
  for (const [id, el] of els) {
    if (!isVisible(id)) continue;
    const out = el.querySelector('[data-readout]');
    if (!out) continue;
    const text = readoutFor(S, id);
    if (out.textContent !== text) out.textContent = text;
  }
}

// ── Pointer ─────────────────────────────────────────────────────────────────

let drag = null;

function armGhost() {
  if (ghost || !deskEl) return;
  ghost = document.createElement('div');
  ghost.className = 'win-ghost';
  deskEl.appendChild(ghost);
}
function showGhost(box) {
  armGhost();
  if (!ghost) return;
  ghost.style.left = box.x + 'px'; ghost.style.top = box.y + 'px';
  ghost.style.width = box.w + 'px'; ghost.style.height = box.h + 'px';
  ghost.classList.add('on');
}
function hideGhost() { ghost?.classList?.remove('on'); }

function snapBox(kind) {
  const { w, h } = deskSize();
  const pad = OS.INSET;
  if (kind === 'max') return { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
  if (kind === 'left') return { x: pad, y: pad, w: Math.round((w - pad * 3) / 2), h: h - pad * 2 };
  if (kind === 'right') { const half = Math.round((w - pad * 3) / 2); return { x: w - half - pad, y: pad, w: half, h: h - pad * 2 }; }
  return null;
}

export function bindPointer(root) {
  root.addEventListener('pointerdown', (e) => {
    // Left button only, or a right-press on a title bar arms a drag that the
    // context menu then opens on top of.
    if (e.button !== undefined && e.button !== 0) return;
    const el = e.target.closest?.('.win');
    if (!el) return;
    const id = el.dataset.app;
    // Any press inside a window brings it forward. Do not preventDefault: the
    // controls inside must still receive the click that follows.
    if (store().focused !== id) focus(id);

    // The three keys are real buttons and act on `click`, not here — otherwise
    // they answer a mouse and nothing else, and Enter on a focused key would do
    // nothing at all. All this does is keep the press from starting a drag.
    if (e.target.closest?.('[data-winkey]')) { e.preventDefault(); return; }

    if (mode === 'stacked') return;

    const grip = e.target.closest?.('[data-winresize]');
    if (grip) { startResize(e, id, grip.dataset.winresize); return; }

    const title = e.target.closest?.('[data-wintitle]');
    if (title) startDrag(e, id);
  });

  root.addEventListener('click', (e) => {
    const key = e.target.closest?.('[data-winkey]');
    if (!key) return;
    const el = key.closest('.win');
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const id = el.dataset.app;
    const what = key.dataset.winkey;
    if (what === 'close') closeFromKey(id);
    else if (what === 'min') minimize(id);
    else if (what === 'zoom') toggleZoom(id);
  });

  root.addEventListener('dblclick', (e) => {
    if (mode === 'stacked') return;
    const title = e.target.closest?.('[data-wintitle]');
    if (!title) return;
    const el = e.target.closest?.('.win');
    if (el) toggleZoom(el.dataset.app);
  });
}

// Closing the front window in stacked mode has nowhere to go, so it falls back
// to whatever was in front before it.
function closeFromKey(id) {
  close(id);
  if (mode === 'stacked') {
    const next = visibleWindows().pop() || null;
    if (next) { store().focused = next; stackedShow(next); paintFocusClasses(); onFocusChange?.(); }
  }
}

function startDrag(e, id) {
  const el = elOf(id);
  if (!el) return;
  const w = win(id);
  if (w.zoomed) {
    // Dragging a zoomed window unzooms it under the pointer, the way a real one
    // does: the restored window keeps the cursor at the same relative spot.
    const box = zoomBox();
    const rel = (e.clientX - box.x) / box.w;
    w.zoomed = false; el.classList.remove('zoomed');
    if (w.pre) { Object.assign(w, w.pre); w.pre = null; }
    const px = toPx(w, id);
    const { w: DW, h: DH } = deskSize();
    const deskRect = deskEl.getBoundingClientRect();
    commit(id, { x: Math.round(e.clientX - deskRect.left - rel * px.w), y: Math.round(e.clientY - deskRect.top - OS.TITLE_H / 2), w: px.w, h: px.h });
    apply(id);
  }
  const r = el.getBoundingClientRect();
  const dr = deskEl.getBoundingClientRect();
  drag = {
    kind: 'move', id, el,
    sx: e.clientX, sy: e.clientY,
    ox: r.left - dr.left, oy: r.top - dr.top, ow: r.width, oh: r.height,
    snap: null,
  };
  el.classList.add('dragging');
  try { el.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}

function startResize(e, id, dir) {
  const el = elOf(id);
  if (!el) return;
  const w = win(id);
  if (w.zoomed) { w.zoomed = false; el.classList.remove('zoomed'); }
  const r = el.getBoundingClientRect();
  const dr = deskEl.getBoundingClientRect();
  drag = {
    kind: 'size', id, el, dir,
    sx: e.clientX, sy: e.clientY,
    ox: r.left - dr.left, oy: r.top - dr.top, ow: r.width, oh: r.height,
  };
  el.classList.add('resizing');
  try { el.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}

function onMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  const { w: DW, h: DH } = deskSize();
  if (drag.kind === 'move') {
    let x = drag.ox + dx, y = drag.oy + dy;
    x = Math.max(-(drag.ow - OS.DRAG_KEEP), Math.min(DW - OS.DRAG_KEEP, x));
    y = Math.max(0, Math.min(DH - OS.TITLE_H, y));
    drag.el.style.transform = `translate(${Math.round(x - drag.ox)}px, ${Math.round(y - drag.oy)}px)`;
    drag.last = { x, y };
    // Snap zones, previewed rather than applied.
    const dr = deskEl.getBoundingClientRect();
    const px = e.clientX - dr.left, py = e.clientY - dr.top;
    let snap = null;
    if (py <= OS.SNAP_EDGE) snap = 'max';
    else if (px <= OS.SNAP_EDGE) snap = 'left';
    else if (px >= DW - OS.SNAP_EDGE) snap = 'right';
    if (snap !== drag.snap) {
      drag.snap = snap;
      if (snap) showGhost(snapBox(snap)); else hideGhost();
    }
    return;
  }
  const app = APP_MAP[drag.id];
  const minW = app?.min?.[0] ?? 360, minH = app?.min?.[1] ?? 280;
  let { ox: x, oy: y, ow: w, oh: h } = drag;
  if (drag.dir.includes('e')) w = Math.max(minW, Math.min(DW - x, drag.ow + dx));
  if (drag.dir.includes('s')) h = Math.max(minH, Math.min(DH - y, drag.oh + dy));
  if (drag.dir.includes('w')) { const nw = Math.max(minW, drag.ow - dx); x = drag.ox + (drag.ow - nw); w = nw; }
  if (drag.dir.includes('n')) { const nh = Math.max(minH, drag.oh - dy); y = Math.max(0, drag.oy + (drag.oh - nh)); h = nh; }
  drag.el.style.left = Math.round(x) + 'px';
  drag.el.style.top = Math.round(y) + 'px';
  drag.el.style.width = Math.round(w) + 'px';
  drag.el.style.height = Math.round(h) + 'px';
  drag.last = { x, y, w, h };
}

function endDrag(cancel) {
  if (!drag) return;
  const { id, el, kind } = drag;
  el.classList.remove('dragging', 'resizing');
  el.style.transform = '';
  hideGhost();
  if (!cancel && drag.last) {
    if (kind === 'move' && drag.snap) {
      const box = snapBox(drag.snap);
      const w = win(id);
      if (drag.snap === 'max') { w.pre = { fx: w.fx, fy: w.fy, fw: w.fw, fh: w.fh }; w.zoomed = true; el.classList.add('zoomed'); }
      else commit(id, box);
    } else if (kind === 'move') {
      commit(id, { x: drag.last.x, y: drag.last.y, w: drag.ow, h: drag.oh });
    } else {
      commit(id, drag.last);
    }
  }
  drag = null;
  apply(id);
  onGeometryChange?.();
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', () => endDrag(false));
  document.addEventListener('pointercancel', () => endDrag(true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) endDrag(true); }, true);
}

export function isDragging() { return !!drag; }
