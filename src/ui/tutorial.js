// ─────────────────────────────────────────────────────────────────────────────
// THE TUTORIAL RUNTIME — spotlight, callout, and the conditions that advance.
//
// It never draws inside a view. It puts four dimming panes around a live
// element so the element itself stays lit and clickable, brackets it, and
// parks a card beside it. Views stay pure string functions and know nothing
// about any of this.
//
// The anchor is re-measured every frame, so a view repaint, a scroll or a
// resize cannot leave the spotlight pointing at nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { md, esc } from './dom.js';
import { S } from '../engine/state.js';
import { CHAPTERS, CHAPTER_MAP } from '../data/tutorial.js';
import { play as sfx } from './audio.js';

let chapter = null;         // the running chapter
let index = 0;              // step within it
let raf = null;
let root = null;
let lastAnchorMiss = 0;
let setViewFn = null;       // injected to avoid a cycle with shell.js
let getViewFn = null;
let onEndFn = null;
let escHandler = null;
let aliasFn = null;         // the housing's name for a chrome anchor
let osMode = false;         // the workstation is up: steps may override themselves

export function registerShell({ setView, getView, onEnd, alias, os, showing }) {
  setViewFn = setView; getViewFn = getView; onEndFn = onEnd;
  aliasFn = alias || null;
  osMode = !!os;
  showingFn = showing || null;
}
let showingFn = null;

// "Is what this step teaches on the glass?" The console answers by comparing
// the current view; the workstation by whether that window is open and in
// front. Asking the housing rather than assuming one is what lets a step point
// at the Wire, which is a rail in one and a window in the other.
function onGlass(id) {
  if (!id) return true;
  if (showingFn) { try { return !!showingFn(id); } catch { return false; } }
  return getViewFn?.() === id;
}

// A step spotlights a CSS selector, and two housings put the same thing in two
// places — the console's `#nav` is the workstation's `#dock`. The authored
// selector stays the one thing every tool and test knows; the housing is asked
// what it calls it, at the moment it is looked up.
export function anchorSel(a) {
  if (!a) return a;
  try { return (aliasFn ? aliasFn(a) : a) || a; } catch { return a; }
}

export function isActive() { return !!chapter; }
export function activeChapter() { return chapter?.id || null; }

// ── State ──────────────────────────────────────────────────────────────────
function store() {
  if (!S.meta.tutorial) S.meta.tutorial = { done: {}, seen: {}, off: false };
  if (!S.meta.tutorial.done) S.meta.tutorial.done = {};
  if (!S.meta.tutorial.seen) S.meta.tutorial.seen = {};
  return S.meta.tutorial;
}
export function isDone(id) { return !!store().done[id]; }
export function isDisabled() { return !!store().off; }
export function setDisabled(v) { store().off = !!v; }

export function chapterStatus() {
  return CHAPTERS.map((c) => ({
    id: c.id, name: c.name, sub: c.sub, steps: c.steps.length,
    done: isDone(c.id),
    available: safe(c.when, true),
  }));
}

function safe(fn, dflt = false) { if (!fn) return dflt; try { return !!fn(S); } catch { return dflt; } }

// ── Entry points ───────────────────────────────────────────────────────────
// Called once per day: fires the first chapter whose moment has arrived.
// Four chapters can qualify inside the first few minutes of real time, and each
// one dims the screen, holds the clock and moves the view. Spacing them by a
// meaningful stretch of the run is the difference between a guide and a nag.
const AUTO_GAP_DAYS = 60;

export function maybeAutoStart() {
  if (chapter || !S || isDisabled()) return false;
  const st = store();
  if (st.lastAuto != null && S.time.day - st.lastAuto < AUTO_GAP_DAYS) return false;
  for (const c of CHAPTERS) {
    if (isDone(c.id)) continue;
    if (!safe(c.when)) continue;
    if (!safe(c.auto)) continue;
    st.lastAuto = S.time.day;
    start(c.id);
    return true;
  }
  return false;
}

// `id` is a chapter id, or a whole chapter object for a one-off — which is how
// an assistant points at a panel without any of it being hard-coded.
export function start(id, { from = 0 } = {}) {
  const c = typeof id === 'object' && id ? id : CHAPTER_MAP[id];
  if (!c?.steps?.length || chapter) return false;
  chapter = c;
  index = Math.max(0, Math.min(from, c.steps.length - 1));
  if (c.hold) S.tutorialHold = true;
  mount();
  showStep();
  return true;
}

export function end({ complete = true } = {}) {
  if (!chapter) return;
  // A one-off spotlight is not a chapter the player has finished; recording it
  // would suppress a real walkthrough later.
  if (chapter.id !== '_spotlight') {
    if (complete) store().done[chapter.id] = true;
    store().seen[chapter.id] = true;
  }
  chapter = null;
  S.tutorialHold = false;
  document.body.classList.remove('tut-open');
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  if (root) { root.classList.add('out'); const r = root; root = null; setTimeout(() => r.remove(), 260); }
  onEndFn?.();
}

// The manual's master switch: stop offering walkthroughs at all.
export function skipAll() {
  setDisabled(true);
  if (chapter) end({ complete: true });
}

// ── Ad-hoc spotlight ───────────────────────────────────────────────────────
// One step, built at call time, run through the same machinery the authored
// walkthroughs use — so it dims the console, rings the panel, scrolls it into
// view, and closes on Enter or Escape like everything else. The assistant gets
// to teach with the game's own hand rather than a bespoke overlay.

// Every selector an authored step already spotlights is a selector
// `tools/tutorialtest.mjs` proves renders. That list is the enum.
export function spotlightAnchors() {
  const out = new Set(['[data-tut="author"]']);
  for (const c of CHAPTERS) for (const st of c.steps) if (st.anchor) out.add(st.anchor);
  return [...out];
}

export function spotlightAnchorHelp() {
  const seen = new Map();
  for (const c of CHAPTERS) {
    for (const st of c.steps) {
      if (st.anchor && !seen.has(st.anchor)) seen.set(st.anchor, st.title);
    }
  }
  seen.set('[data-tut="author"]', 'The world\u2019s own console');
  return [...seen].slice(0, 14).map(([sel, t]) => `${sel} — ${t}`).join('; ');
}

export function spotlight({ anchor, title, body, place = 'bottom', view }) {
  if (chapter) return { ok: false, reason: 'a walkthrough is already open' };
  const target = anchor && document.querySelector(anchorSel(anchor));
  if (!target) {
    return { ok: false, reason: 'that panel is not on the founder\u2019s screen — show_module first' };
  }
  // Being in the DOM is not being on screen. The Wire rail is display:none
  // below 1120px and everything in it is still queryable, so a spotlight there
  // would report success and then draw a ring around nothing.
  const box = target.getBoundingClientRect?.();
  if (box && (box.width < 2 || box.height < 2)) {
    return { ok: false, reason: 'that panel is not visible at this window size — it is hidden, not missing' };
  }
  const started = start({
    id: '_spotlight', name: 'ARIA', sub: '', hold: false,
    steps: [{ id: 'one', anchor, place, view, title: String(title || '').slice(0, 48),
              body: String(body || '').slice(0, 260), cta: 'Got it' }],
  });
  return started ? { ok: true } : { ok: false, reason: 'the console is busy' };
}

// ── Mount ──────────────────────────────────────────────────────────────────
function mount() {
  root = document.createElement('div');
  root.id = 'tutor-root';
  root.className = 'tutor';
  root.innerHTML = `
    <div class="tut-pane" data-p="t"></div>
    <div class="tut-pane" data-p="b"></div>
    <div class="tut-pane" data-p="l"></div>
    <div class="tut-pane" data-p="r"></div>
    <div class="tut-ring" hidden></div>
    <div class="tut-card" role="dialog" aria-live="polite"></div>`;
  document.body.appendChild(root);
  document.body.classList.add('tut-open');    // the toast lane stands down
  requestAnimationFrame(() => root?.classList.add('in'));

  root.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-tutact]');
    if (!b) return;
    e.stopPropagation();
    const a = b.dataset.tutact;
    if (a === 'next') advance();
    else if (a === 'back') back();
    else if (a === 'skip') { sfx('click'); end({ complete: true }); }
  });

  // Esc leaves, like everywhere else in the game.
  escHandler = (e) => {
    if (!chapter) return;
    if (e.key === 'Escape') { e.preventDefault(); sfx('click'); end({ complete: true }); return; }
    // Enter advances, so the whole walkthrough is playable from the keyboard.
    if (e.key === 'Enter') { e.preventDefault(); advance(); }
  };
  document.addEventListener('keydown', escHandler);

  raf = requestAnimationFrame(tick);
}

// ── Steps ──────────────────────────────────────────────────────────────────
// A step, with the workstation's overrides folded in when it is the housing.
// `os` on a step is the only place the authored walkthrough knows two shells
// exist, and it carries nothing but words and a selector.
function step() {
  const st = chapter?.steps[index];
  if (!st) return st;
  return osMode && st.os ? { ...st, ...st.os } : st;
}

function showStep() {
  const st = step();
  if (!st) return end();
  ensureStepView(st, true);
  paintCard();
  lastAnchorMiss = 0;
  place();
  scrollAnchorIntoView(st);
  sfx('click');
}

// A walkthrough can survive a hot reload, a delayed modal close, or another
// repaint that restores the previous module. Do not leave a centred, fully
// blocking card whose live target is on a different tab: restore the tab the
// current step teaches, then let the normal anchor retry find its target.
//
// `tick()` calls this on every animation frame, which makes it a loaded gun: a
// step whose view never satisfies `onGlass` re-runs a whole housing switch at
// 60Hz. That is not hypothetical — the docked Wire could not satisfy it, and
// step 14 of First Light ran `setView('wire')` (a full `applyAll` plus three
// repaints) every frame until Firefox gave up. The predicate is fixed, but the
// throttle is what stops the next one being a lock-up instead of a slow step:
// a safety net does not need to run at frame rate, and one that cannot succeed
// must stop trying rather than spin.
const ENSURE_THROTTLE = 400;   // ms between unforced re-attempts
const ENSURE_GIVE_UP = 6;      // attempts before this step stops asking
let ensureKey = '';
let ensureAt = 0;
let ensureTries = 0;

function ensureStepView(st, force = false) {
  if (!st?.view || onGlass(st.view)) return true;
  const key = `${index}:${st.view}`;
  const now = performance.now();
  if (key !== ensureKey) { ensureKey = key; ensureAt = 0; ensureTries = 0; }
  if (force) { ensureTries = 0; }
  else {
    if (ensureTries >= ENSURE_GIVE_UP) return false;
    if (now - ensureAt < ENSURE_THROTTLE) return false;
  }
  ensureAt = now;
  ensureTries++;
  setViewFn?.(st.view);
  return onGlass(st.view);
}

// A lesson below the fold is no lesson. Give the view a moment to repaint
// after a module switch, then bring the target onto the glass.
function scrollAnchorIntoView(st, tries = 0) {
  if (!st?.anchor) return;
  const el = document.querySelector(anchorSel(st.anchor));
  if (!el) { if (tries < 8) setTimeout(() => scrollAnchorIntoView(st, tries + 1), 90); return; }
  if (isFullyVisible(el)) return;
  // A partly clipped target only needs a small nudge; a target that is wholly
  // off-screen is easier to understand when it lands in the middle.
  if (isVisible(el) && nudgeFullyIntoView(el)) return;
  try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch { el.scrollIntoView(); }
}

function advance() {
  if (!chapter) return;
  sfx('choose');
  if (index >= chapter.steps.length - 1) return end();
  index++;
  showStep();
}

function back() {
  if (!chapter || index === 0) return;
  sfx('click');
  index--;
  showStep();
}

// The advance condition. `next` steps wait for the button; everything else is
// satisfied by the player doing the thing, and the button becomes a way out.
function satisfied(st, ev) {
  const a = st.advance;
  if (!a) return false;
  if (a.act) return ev?.type === 'act' && ev.act === a.act && (!a.v || ev.v === a.v);
  if (a.view) return onGlass(a.view);
  if (a.pred) { try { return !!a.pred(S); } catch { return false; } }
  return false;
}

// Delegated actions are global, so watch them here rather than threading a
// callback through every handler in main.js.
document.addEventListener('click', (e) => {
  if (!chapter) return;
  const el = e.target.closest?.('[data-act]');
  if (!el) return;
  const st = step();
  if (st && satisfied(st, { type: 'act', act: el.dataset.act, v: el.dataset.v })) {
    setTimeout(advance, 380);       // let the action's own feedback land first
  }
}, true);

// Keyboard shortcuts perform the same actions; accept them too.
export function notifyAction(act, v) {
  if (!chapter) return;
  const st = step();
  if (st && satisfied(st, { type: 'act', act, v })) setTimeout(advance, 380);
}

// ── Frame ──────────────────────────────────────────────────────────────────
// Measuring and placing is separate from the frame loop so a new step lands
// in the right place on the same tick it is shown, not one frame later.
const ANCHOR_GRACE = 900;   // long enough for a smooth scroll to land

function place() {
  if (!chapter || !root) return;
  const st = step();
  if (!st?.anchor) { lastAnchorMiss = 0; layout(null); return; }

  const el = document.querySelector(anchorSel(st.anchor));
  if (el && isVisible(el)) { lastAnchorMiss = 0; layout(el.getBoundingClientRect()); return; }

  // Not ready. It is probably mid-scroll or mid-repaint, so hold the last
  // frame rather than blinking to a centred card and back. Only a genuinely
  // absent anchor — a panel this state does not render — falls through.
  if (!lastAnchorMiss) lastAnchorMiss = performance.now();
  if (performance.now() - lastAnchorMiss < ANCHOR_GRACE) return;
  layout(null);
}

function tick() {
  if (!chapter || !root) return;
  const st = step();
  ensureStepView(st);
  place();
  // Non-click advance conditions are polled.
  if (st?.advance && !st.advance.act && satisfied(st)) { advance(); }
  raf = requestAnimationFrame(tick);
}

function isVisible(el) {
  const r = el.getBoundingClientRect();
  return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight;
}

// The console scrolls a module inside `.main`; the workstation scrolls that
// same module inside its window body. Both are the operative viewport for a
// tutorial target. Falling back to the page is only correct for chrome such as
// the menu bar and dock, which have no scrolling ancestor of their own.
function scrollHost(el) {
  return el.closest?.('.main, .win-body') || null;
}

// Intersecting the viewport is enough to draw the spotlight, but not enough to
// teach from: the whole anchor needs to clear both the window and the scrolling
// game surface. This catches panels whose last rows sit below `.main` or a
// workstation window.
function isFullyVisible(el, inset = 12) {
  const r = el.getBoundingClientRect();
  const scroller = scrollHost(el);
  const clip = scroller?.getBoundingClientRect?.();
  const top = Math.max(0, clip?.top ?? 0) + inset;
  const bottom = Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight) - inset;
  return r.width > 4 && r.height > 4 && r.top >= top && r.bottom <= bottom;
}

function nudgeFullyIntoView(el, inset = 12) {
  const r = el.getBoundingClientRect();
  const scroller = scrollHost(el);
  const clip = scroller?.getBoundingClientRect?.();
  const top = Math.max(0, clip?.top ?? 0) + inset;
  const bottom = Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight) - inset;
  if (r.height > bottom - top) return false;
  const delta = r.top < top ? r.top - top : r.bottom > bottom ? r.bottom - bottom : 0;
  if (!delta) return false;
  try {
    if (scroller) scroller.scrollBy({ top: delta, behavior: 'smooth' });
    else window.scrollBy({ top: delta, behavior: 'smooth' });
    return true;
  } catch { return false; }
}

// ── Layout ─────────────────────────────────────────────────────────────────
const PAD = 7;

function layout(rect) {
  if (!root) return;
  const panes = { t: root.querySelector('[data-p="t"]'), b: root.querySelector('[data-p="b"]'),
                  l: root.querySelector('[data-p="l"]'), r: root.querySelector('[data-p="r"]') };
  const ring = root.querySelector('.tut-ring');
  const card = root.querySelector('.tut-card');
  const W = window.innerWidth, H = window.innerHeight;

  if (!rect) {
    // Whole screen dim, card centred.
    css(panes.t, { top: 0, left: 0, width: W + 'px', height: H + 'px' });
    css(panes.b, { height: '0px', width: '0px' });
    css(panes.l, { height: '0px', width: '0px' });
    css(panes.r, { height: '0px', width: '0px' });
    ring.hidden = true;
    card.classList.add('centred');
    card.style.left = ''; card.style.top = '';
    return;
  }

  card.classList.remove('centred');
  const x = Math.max(0, rect.left - PAD), y = Math.max(0, rect.top - PAD);
  const w = Math.min(W - x, rect.width + PAD * 2), h = Math.min(H - y, rect.height + PAD * 2);

  css(panes.t, { top: '0px', left: '0px', width: W + 'px', height: y + 'px' });
  css(panes.b, { top: (y + h) + 'px', left: '0px', width: W + 'px', height: Math.max(0, H - y - h) + 'px' });
  css(panes.l, { top: y + 'px', left: '0px', width: x + 'px', height: h + 'px' });
  css(panes.r, { top: y + 'px', left: (x + w) + 'px', width: Math.max(0, W - x - w) + 'px', height: h + 'px' });

  ring.hidden = false;
  css(ring, { top: y + 'px', left: x + 'px', width: w + 'px', height: h + 'px' });

  placeCard(card, { x, y, w, h }, step()?.place);
}

function css(el, o) { if (el) for (const k in o) el.style[k] = o[k]; }

function placeCard(card, box, prefer = 'bottom') {
  const W = window.innerWidth, H = window.innerHeight;
  const cw = card.offsetWidth || 340, ch = card.offsetHeight || 200;
  const GAP = 14;

  // Narrow screens: dock to whichever half the anchor is not in.
  if (W < 760) {
    card.style.left = Math.max(10, (W - cw) / 2) + 'px';
    card.style.top = (box.y + box.h / 2 > H / 2 ? 12 : Math.min(H - ch - 12, box.y + box.h + GAP)) + 'px';
    return;
  }

  const fits = {
    bottom: H - (box.y + box.h) - GAP >= ch,
    top: box.y - GAP >= ch,
    right: W - (box.x + box.w) - GAP >= cw,
    left: box.x - GAP >= cw,
  };
  const order = [prefer, 'bottom', 'right', 'left', 'top'].filter((v, i, a) => a.indexOf(v) === i);
  const side = order.find((s) => fits[s]) || 'bottom';

  let left, top;
  if (side === 'bottom') { left = box.x + box.w / 2 - cw / 2; top = box.y + box.h + GAP; }
  else if (side === 'top') { left = box.x + box.w / 2 - cw / 2; top = box.y - ch - GAP; }
  else if (side === 'right') { left = box.x + box.w + GAP; top = box.y + box.h / 2 - ch / 2; }
  else { left = box.x - cw - GAP; top = box.y + box.h / 2 - ch / 2; }

  card.style.left = Math.max(10, Math.min(W - cw - 10, left)) + 'px';
  card.style.top = Math.max(10, Math.min(H - ch - 10, top)) + 'px';
  card.dataset.side = side;
}

// ── Card ───────────────────────────────────────────────────────────────────
function paintCard() {
  const card = root?.querySelector('.tut-card');
  const st = step();
  if (!card || !st) return;
  const n = chapter.steps.length;
  const waits = !!st.advance;      // any condition means the card is waiting on the player
  const label = st.cta || (waits ? 'Skip step' : index === n - 1 ? 'Done' : 'Next');

  card.innerHTML = `
    <div class="tut-head">
      <span class="tut-chapter">${esc(chapter.name)}</span>
      <span class="tut-count">${String(index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</span>
    </div>
    <div class="tut-title">${esc(st.title)}</div>
    <div class="tut-body">${md(st.body)}</div>
    ${waits ? `<div class="tut-wait"><span class="tut-pulse"></span>waiting for you</div>` : ''}
    <div class="tut-rail">${Array.from({ length: n },
      (_, i) => `<i class="tut-tick${i < index ? ' done' : i === index ? ' on' : ''}"></i>`).join('')}</div>
    <div class="tut-foot">
      <button class="tut-ghost" data-tutact="skip" title="Close this walkthrough — replay it any time from ? → Walkthroughs">Close</button>
      <span class="grow"></span>
      ${index > 0 ? `<button class="tut-ghost" data-tutact="back">←</button>` : ''}
      <button class="tut-go ${waits ? 'ghosted' : ''}" data-tutact="next">${esc(label)}</button>
    </div>`;
  card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
}
