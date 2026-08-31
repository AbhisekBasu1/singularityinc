// ─────────────────────────────────────────────────────────────────────────────
// DOM helpers — string rendering with a dirty guard + delegated interaction.
// ─────────────────────────────────────────────────────────────────────────────
import { GLOSSARY } from '../data/manual.js';

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

export function render(el, html) {
  if (!el) return false;
  if (el.__html === html) return false;
  el.__html = html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  // Headless (tools/uitest.mjs) stubs createElement, so there is no real
  // fragment to diff against; a plain assignment is all those checks need.
  if (tpl.content && tpl.content.childNodes) { patch(el, tpl.content); return true; }
  // Only the wholesale path loses the scroll position, so only it restores one.
  // Writing scrollTop on every repaint fought the user's own scrolling: the view
  // repaints ~7×/second, and each write snapped the container back to where it
  // was when the frame started, which is why scrolling the Desk stalled midway.
  const scroll = el.scrollTop;
  el.innerHTML = html;
  if (scroll && el.scrollHeight > el.clientHeight) el.scrollTop = scroll;
  return true;
}

// Patch `dom` to look like `next`, keeping every node that is already right.
//
// This used to be `el.innerHTML = html`. Views print live numbers, so the Desk's
// string changes every tick and the whole subtree was torn down and rebuilt
// about seven times a second. Anything the pointer was over went with it: the
// hovered action button lost `:hover` and restarted its 0.14s transition on
// every repaint, which reads as a blink. Keeping the node means the browser
// keeps the hover, the transition and the focus ring.
function patch(dom, next) {
  const olds = Array.from(dom.childNodes);
  const news = Array.from(next.childNodes);
  for (let i = 0; i < news.length; i++) {
    const o = olds[i], n = news[i];
    if (!o) { dom.appendChild(n); continue; }
    if (o.nodeType !== n.nodeType || (o.nodeType === 1 && o.tagName !== n.tagName)) {
      dom.replaceChild(n, o);
      continue;
    }
    if (o.nodeType !== 1) {
      if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
      continue;
    }
    syncAttrs(o, n);
    patch(o, n);
  }
  for (let i = olds.length - 1; i >= news.length; i--) dom.removeChild(olds[i]);
}

function syncAttrs(o, n) {
  for (const a of n.attributes) {
    if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
  }
  for (const a of Array.from(o.attributes)) {
    if (n.hasAttribute(a.name)) continue;
    // `style` is also written imperatively — cursor-follow gradients, the
    // topbar's per-stat colour. A view that does not mention it is not asking
    // for it to be cleared.
    if (a.name === 'style') continue;
    o.removeAttribute(a.name);
  }
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Minimal markdown → HTML for event bodies and feed text.
export function md(s) { return mdInline(esc(s)); }

// The markdown transforms alone, for text that is already escaped or is already
// trusted markup. Tooltips take the second path: every call site escapes its own
// interpolations and then authors real markup on purpose — `<br>`, `<b>`,
// `&middot;` — and `.tip b {}` exists in the stylesheet to style it. Escaping
// the whole string a second time printed those tags at the player.
export function mdInline(t) {
  t = t.replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`);
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/^&gt; ?(.*)$/gm, '<span class="quote">$1</span>');
  return t;
}

// ── Sparkline ──────────────────────────────────────────────────────────────
export function sparkline(data, { w = 240, h = 42, color = '#00e5a0', fill = true, log = false } = {}) {
  if (!data || data.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}"></svg>`;
  const vals = data.slice(-90).map((v) => (log ? Math.log10(Math.max(1, v)) : v));
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max === min) { max = min + 1; }
  const pad = 3;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  // Derived from the colour, never random: a fresh id every call made every
  // frame's string differ, which defeated the `el.__html === html` short-circuit
  // in `render()` for any view with a sparkline in it — the Desk, every tick.
  // Two sparklines of one colour share one gradient, which is the same gradient.
  const id = 'sg' + String(color).replace(/[^a-z0-9]/gi, '');
  const area = fill ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <path d="${d} L${w - pad},${h} L${pad},${h} Z" fill="url(#${id})" stroke="none"/>` : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${area}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}" r="2.2" fill="${color}"/>
  </svg>`;
}

// ── Bar helper ─────────────────────────────────────────────────────────────
export function bar(pct, color = 'var(--green)', opts = {}) {
  const p = Math.max(0, Math.min(1, pct || 0)) * 100;
  const cls = ['bar', opts.tall ? 'tall' : '', opts.thin ? 'thin' : ''].filter(Boolean).join(' ');
  const fillCls = ['bar-fill', opts.shimmer ? 'shimmer' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}"><div class="${fillCls}" style="width:${p.toFixed(1)}%;background:${color}"></div></div>`;
}

export function meter(label, valueText, pct, color, opts = {}) {
  return `<div class="meter">
    <div class="meter-head"><span class="meter-label">${label}</span>
      <span class="meter-value" style="color:${opts.valueColor || 'inherit'}">${valueText}</span></div>
    ${bar(pct, color, opts)}
  </div>`;
}

// ── Slider (custom, pointer-driven) ────────────────────────────────────────
export function slider(key, value, color = 'var(--green)', extra = '') {
  const v = Math.max(0, Math.min(1, value || 0));
  const p = v * 100;
  // Focusable, with the ARIA slider role and a value assistive tech can read.
  // The arrow keys drive it (below); without that the allocation panel — the
  // biggest lever in the game — needed a mouse.
  const [kind, id] = String(key).split(':');
  const label = /aria-label/.test(extra) ? '' : `aria-label="${esc(id ? `${id} ${kind}` : kind)}"`;
  return `<div class="slider" data-slider="${key}" data-value="${v.toFixed(3)}" role="slider" tabindex="0"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}" ${label} ${extra}>
    <div class="slider-track"></div>
    <div class="slider-fill" style="width:${p.toFixed(1)}%;background:${color}"></div>
    <div class="slider-knob" style="left:${p.toFixed(1)}%"></div>
  </div>`;
}

let sliderHandler = null;
export function onSlider(fn) { sliderHandler = fn; }

function sliderValueFromEvent(el, e) {
  const r = el.getBoundingClientRect();
  const x = (e.clientX ?? (e.touches?.[0]?.clientX)) - r.left;
  return Math.max(0, Math.min(1, x / r.width));
}

// One place writes what a slider shows and says: the value it holds for the
// keyboard, the ARIA value, the fill and the knob. Pointer and keys both go
// through it, so a drag never leaves the arrow keys starting from a stale
// number, and a screen reader hears the value that is on the screen.
function syncSlider(el, v) {
  el.dataset.value = v.toFixed(3);
  el.setAttribute('aria-valuenow', String(Math.round(v * 100)));
  const fill = el.querySelector('.slider-fill'), knob = el.querySelector('.slider-knob');
  if (fill) fill.style.width = (v * 100).toFixed(1) + '%';
  if (knob) knob.style.left = (v * 100).toFixed(1) + '%';
}

let dragging = null;
document.addEventListener('pointerdown', (e) => {
  // Left button only. Without this a right-click on an allocation slider set
  // the lane to wherever the cursor happened to be — a committed change the
  // founder never asked for, and one they would not connect to the menu that
  // opened over it a moment later.
  if (e.button !== undefined && e.button !== 0) return;
  const el = e.target.closest?.('.slider');
  if (!el) return;
  dragging = el;
  el.setPointerCapture?.(e.pointerId);
  const v = sliderValueFromEvent(el, e);
  syncSlider(el, v);
  sliderHandler?.(el.dataset.slider, v, el);
  e.preventDefault();                          // which also skips the focus a press would give
  try { el.focus({ preventScroll: true }); } catch {}
});
document.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const v = sliderValueFromEvent(dragging, e);
  syncSlider(dragging, v);
  sliderHandler?.(dragging.dataset.slider, v, dragging);
});
document.addEventListener('pointerup', () => { dragging = null; });
document.addEventListener('pointercancel', () => { dragging = null; });
export function isDragging() { return !!dragging; }

// Keyboard: the same handler the pointer feeds, in steps. Registered before the
// shortcut dispatcher below so an arrow on a slider never reaches it.
document.addEventListener('keydown', (e) => {
  const el = e.target?.closest?.('.slider[role="slider"]');
  if (!el) return;
  const step = e.shiftKey ? 0.10 : 0.05;
  const cur = Number(el.dataset.value) || 0;
  let v = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = cur + step;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = cur - step;
  else if (e.key === 'PageUp') v = cur + 0.2;
  else if (e.key === 'PageDown') v = cur - 0.2;
  else if (e.key === 'Home') v = 0;
  else if (e.key === 'End') v = 1;
  if (v === null) return;
  v = Math.max(0, Math.min(1, v));
  e.preventDefault();
  e.stopImmediatePropagation();
  syncSlider(el, v);
  sliderHandler?.(el.dataset.slider, v, el);
});

// ── Click delegation ───────────────────────────────────────────────────────
const actions = new Map();
export function onAction(name, fn) { actions.set(name, fn); }

// Perform an action by name, without a click. A keyboard shortcut that calls
// its handler directly binds itself to whichever module wrote that line; going
// through the registry means the housing that registered last answers it — so
// `?` opens the console's manual dialog and the workstation's Manual window,
// and neither of them needs to know the other exists.
export function runAction(name, data = {}) {
  const fn = actions.get(name);
  if (!fn) return false;
  fn({ ...data }, null, null);
  return true;
}
document.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-act]');
  if (!el) return;
  const fn = actions.get(el.dataset.act);
  if (fn) { fn(el.dataset, el, e); }
});

// ── Tooltips ───────────────────────────────────────────────────────────────
// Two sources. An explicit data-tip always wins. Failing that, any label the
// interface prints that the manual defines becomes hoverable on its own — so
// a term only has to be written down once, in src/data/manual.js, and it
// explains itself everywhere it appears.
const TERMS = new Map();
for (const g of GLOSSARY) for (const [name, def] of g.items) TERMS.set(name.toLowerCase(), { name, def });

// Only labels — never prose, never values.
const TERM_SELECTOR = '.meter-label, .stat-label, .alloc-name, .man-term-name';

function termFor(el) {
  const raw = (el.textContent || '').replace(/[^\p{L}\p{N}\s&-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return TERMS.get(raw.toLowerCase()) || null;
}

let tipEl = null;
let glossed = null;
let tipAnchor = null;
let tipSource = 'pointer';   // 'pointer' | 'focus'

// Resolve what an element would explain, from either source.
function tipFor(target) {
  const el = target?.closest?.('[data-tip]');
  if (el) return el.dataset.tip ? { el, text: el.dataset.tip, title: el.dataset.tipTitle } : null;
  const lab = target?.closest?.(TERM_SELECTOR);
  if (!lab) return null;
  const t = termFor(lab);
  return t ? { el: lab, text: t.def, title: t.name, gloss: true } : null;
}

function openTip(hit, source = 'pointer') {
  if (!hit) return;
  // Close the old one *before* recording the new anchor. `showTip` used to do
  // this after `openTip` had already set it, which cleared the anchor (and
  // the gloss) on every open — so focusout never matched, and a tooltip
  // opened from the keyboard stayed until something else hid it.
  hideTip();
  if (hit.gloss) { glossed = hit.el; hit.el.classList.add('glossed'); }
  tipAnchor = hit.el;
  tipSource = source;
  showTip(hit.text, hit.title, hit.el);
}

// `pointerover` and `pointerout` bubble, so they fire again for every
// descendant the pointer crosses inside the *same* tipped element — and a
// tipped element is usually a button with an icon, a label and a number in it.
// Taking each of those as a fresh arrival and departure is what made a tooltip
// blink three or four times on the way in, with the hand still moving toward
// it. Both handlers ask the same question instead: has the *tipped ancestor*
// changed? Crossing between two children of one anchor is not an arrival, and
// leaving one for another child of the same anchor is not a departure.
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;      // touch is handled below
  const hit = tipFor(e.target);
  if (hit && hit.el === tipAnchor) return;    // already open, for this very thing
  openTip(hit);
});
document.addEventListener('pointerout', (e) => {
  if (e.pointerType === 'touch') return;
  if (!tipAnchor) return;
  // `relatedTarget` is where the pointer is going — null when it leaves the
  // window entirely, which is a departure like any other.
  const to = e.relatedTarget;
  if (to && tipAnchor.contains?.(to)) return;
  if (tipFor(e.target)) hideTip();
});

// Touch has no hover, so a fifty-term glossary would be invisible on a tablet.
// First tap on something explainable shows the note instead of activating it;
// a second tap goes through. Anything not explainable behaves normally.
let touchArmed = null;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') { hideTip(); return; }
  const hit = tipFor(e.target);
  if (!hit) { hideTip(); touchArmed = null; return; }
  if (touchArmed === hit.el) { hideTip(); touchArmed = null; return; }   // second tap: let it through
  hideTip();
  openTip(hit);
  touchArmed = hit.el;
  // Only swallow the click if the note is on something that would otherwise act.
  if (hit.el.closest('[data-act], button, a, [role="button"]')) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);

// A tap anywhere else dismisses.
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  if (tipAnchor && !e.target.closest?.('.tip') && !tipFor(e.target)) { hideTip(); touchArmed = null; }
});
window.addEventListener('blur', () => hideTip());
window.addEventListener('resize', () => hideTip());
// `.tip` is position: fixed. Scrolling the view under it left it hanging in
// the air where its anchor used to be.
document.addEventListener('scroll', () => hideTip(), true);

// Focus is the hover the keyboard has. `:focus-visible` keeps a mouse click —
// which focuses the button too — from opening a note that would then sit
// there, and hold the Desk repaint, until the pointer left.
document.addEventListener('focusin', (e) => {
  let visible = false;
  try { visible = !!e.target?.matches?.(':focus-visible'); } catch {}
  if (!visible) return;
  openTip(tipFor(e.target), 'focus');
});
document.addEventListener('focusout', (e) => {
  if (tipAnchor && tipFor(e.target)?.el === tipAnchor) hideTip();
});

function showTip(text, title, anchor) {
  if (tipEl) { tipEl.remove(); tipEl = null; }   // the element only; the anchor was just set
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  // `.tip` does not set white-space, so newline-style tips need real breaks.
  tipEl.innerHTML = (title ? `<div class="tip-title">${esc(title)}</div>` : '')
    + mdInline(text).replace(/\n/g, '<br>');
  document.body.appendChild(tipEl);
  const r = anchor.getBoundingClientRect();
  const tr = tipEl.getBoundingClientRect();
  let left = r.left + r.width / 2 - tr.width / 2;
  let top = r.top - tr.height - 9;
  if (top < 8) top = r.bottom + 9;
  left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, left));
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}
function hideTip() {
  if (tipEl) { tipEl.remove(); tipEl = null; }
  if (glossed) { glossed.classList.remove('glossed'); glossed = null; }
  tipAnchor = null;
}
export { hideTip };
// Only a pointer tip asks the Desk to hold its repaint: the pointer will move
// and end it. A focus tip stays until focus moves, which can be all afternoon,
// and its anchor survives a repaint anyway because `render()` patches.
export function tipOpen() { return !!tipEl && tipSource !== 'focus'; }

// ── Keyboard ───────────────────────────────────────────────────────────────
document.addEventListener('keyup', (e) => {
  if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target?.closest?.('button, a[href], input, textarea, select, summary, [contenteditable]')) return;
  const b = e.target?.closest?.('[role="button"][data-act]');
  if (b) { e.preventDefault(); b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
});
const keyHandlers = new Map();
export function onKey(key, fn) {
  if (!keyHandlers.has(key)) keyHandlers.set(key, new Set());
  keyHandlers.get(key).add(fn);
}
document.addEventListener('keydown', (e) => {
  if (e.target.matches?.('input, textarea, select')) return;
  // The shortcuts are bare keys. Cmd+S is the browser's save and Cmd+R its
  // reload; with no guard here each one also shipped a feature or spent focus
  // on a post before the browser got to it.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // A div acting as a button — a bloc on the map, a research node — has to
  // answer Enter and Space like the real thing, or focusing it is a lie.
  if (e.key === 'Enter' || e.key === ' ') {
    // A native control answers these itself. The game's own Space — pause —
    // must not fire on top of it, or a focused button pauses instead of clicking.
    if (e.target?.closest?.('button, a[href], input, textarea, select, summary, [contenteditable]')) return;
    const b = e.target?.closest?.('[role="button"][data-act]');
    if (b) {
      e.preventDefault();
      // A real, bubbling click, because `click()` is not a method every SVG
      // element has, and the map's blocs are SVG. Enter fires on keydown and
      // Space on keyup, which is what a native button does.
      if (e.key === 'Enter' && !e.repeat) b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return;
    }
  }
  const k = e.key.toLowerCase();
  const set = keyHandlers.get(k);
  if (set) { for (const fn of set) fn(e); }
});
