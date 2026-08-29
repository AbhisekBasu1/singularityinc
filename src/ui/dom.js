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
  const id = 'sg' + Math.random().toString(36).slice(2, 8);
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
  const p = Math.max(0, Math.min(1, value)) * 100;
  return `<div class="slider" data-slider="${key}" ${extra}>
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

let dragging = null;
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest?.('.slider');
  if (!el) return;
  dragging = el;
  el.setPointerCapture?.(e.pointerId);
  const v = sliderValueFromEvent(el, e);
  sliderHandler?.(el.dataset.slider, v, el);
  e.preventDefault();
});
document.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const v = sliderValueFromEvent(dragging, e);
  sliderHandler?.(dragging.dataset.slider, v, dragging);
});
document.addEventListener('pointerup', () => { dragging = null; });
document.addEventListener('pointercancel', () => { dragging = null; });
export function isDragging() { return !!dragging; }

// ── Click delegation ───────────────────────────────────────────────────────
const actions = new Map();
export function onAction(name, fn) { actions.set(name, fn); }
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

// Resolve what an element would explain, from either source.
function tipFor(target) {
  const el = target?.closest?.('[data-tip]');
  if (el) return el.dataset.tip ? { el, text: el.dataset.tip, title: el.dataset.tipTitle } : null;
  const lab = target?.closest?.(TERM_SELECTOR);
  if (!lab) return null;
  const t = termFor(lab);
  return t ? { el: lab, text: t.def, title: t.name, gloss: true } : null;
}

function openTip(hit) {
  if (!hit) return;
  if (hit.gloss) { glossed = hit.el; hit.el.classList.add('glossed'); }
  tipAnchor = hit.el;
  showTip(hit.text, hit.title, hit.el);
}

document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;      // touch is handled below
  openTip(tipFor(e.target));
});
document.addEventListener('pointerout', (e) => {
  if (e.pointerType === 'touch') return;
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

function showTip(text, title, anchor) {
  hideTip();
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
export function tipOpen() { return !!tipEl; }

// ── Keyboard ───────────────────────────────────────────────────────────────
const keyHandlers = new Map();
export function onKey(key, fn) {
  if (!keyHandlers.has(key)) keyHandlers.set(key, new Set());
  keyHandlers.get(key).add(fn);
}
document.addEventListener('keydown', (e) => {
  if (e.target.matches?.('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  const set = keyHandlers.get(k);
  if (set) { for (const fn of set) fn(e); }
});
