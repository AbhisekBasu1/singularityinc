// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — what the machine says when you are looking somewhere else.
//
// Three kinds, and only the first is a toast:
//
//   · the game's own toasts, which `toast.js` still owns and draws. This module
//     only keeps a record of them for the Notification Center.
//   · a Wire thread that needs an answer while the Wire is not on screen. It
//     carries its own replies, dispatched through the same delegated action the
//     rail uses, so answering from the banner and answering from the Wire are
//     the same code path.
//   · a card from a person, announced for a moment before it opens. The founder
//     hears who is calling before they read what they want.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { esc, md, render } from '../dom.js';
import { threadOptions } from '../../systems/feed.js';
import { CHARACTERS } from '../../data/characters.js';
import { OS } from './config.js';

let root = null;             // #toast-root — banners stack with the toasts
let centre = null;           // the Notification Center slide-over
const history = [];
let centreOpen = false;
let onCount = null;
let bannersOn = true;

const reduced = () => {
  try {
    return document.documentElement?.classList?.contains('reduced-motion')
      || !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch { return true; }
};

export function mount({ toasts, center, onCountChange }) {
  root = toasts; centre = center; onCount = onCountChange || null;
  history.length = 0;
  centreOpen = false;
  root?.classList?.remove('nc-open');
}

export function setBanners(on) { bannersOn = !!on; }

// ── The record ──────────────────────────────────────────────────────────────

export function record(t) {
  history.unshift({ ...t, day: S ? Math.floor(S.time.day) : 0 });
  if (history.length > OS.NC_KEEP) history.length = OS.NC_KEEP;
  onCount?.(history.length);
  if (centreOpen) paintCenter();
}

export function centerHtml() {
  if (!history.length) {
    return `<div class="nc-empty">Nothing yet.<br/>The machine has not had to interrupt you.</div>`;
  }
  let lastDay = null;
  const rows = [];
  for (const n of history) {
    if (n.day !== lastDay) { lastDay = n.day; rows.push(`<div class="nc-day">DAY ${n.day}</div>`); }
    rows.push(`<div class="nc-item ${esc(n.kind || '')}">
      <span class="nc-icon">${esc(n.icon || '◈')}</span>
      <span class="nc-text"><span class="nc-title">${md(n.title || '')}</span>
      ${n.sub ? `<span class="nc-sub">${md(n.sub)}</span>` : ''}</span>
    </div>`);
  }
  return rows.join('');
}

export function paintCenter() {
  if (!centre) return;
  const list = centre.querySelector('.nc-list');
  if (list) render(list, centerHtml());
}

export function buildCenter() {
  if (!centre) return;
  centre.innerHTML = `
    <div class="nc-head">
      <span class="nc-k">NOTIFICATIONS</span>
      <span class="grow"></span>
      <button class="nc-clear" data-act="os-nc-clear">Clear</button>
      <button class="nc-close" data-act="os-nc" aria-label="Close notifications">✕</button>
    </div>
    <div class="nc-list"></div>`;
  paintCenter();
}

export function toggleCenter(next) {
  const want = next === undefined ? !centreOpen : !!next;
  if (want === centreOpen) return centreOpen;
  centreOpen = want;
  centre?.classList?.toggle('on', centreOpen);
  // The toast lane and the centre share the top-right corner, so an arriving
  // toast printed straight over the record of itself. The lane steps aside
  // rather than going quiet: a thread banner carries its own answers, and
  // hiding one to tidy the corner would hide a decision.
  root?.classList?.toggle('nc-open', centreOpen);
  if (centreOpen) paintCenter();
  return centreOpen;
}
export function centerIsOpen() { return centreOpen; }
export function clearCenter() { history.length = 0; onCount?.(0); paintCenter(); }

// ── Banners ─────────────────────────────────────────────────────────────────

function banner(cls, html, { sticky = false, ms = 7000 } = {}) {
  if (!root) return null;
  const el = document.createElement('div');
  el.className = `os-banner ${cls}`;
  el.innerHTML = html;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => {
    if (el.__gone) return;
    el.__gone = true;
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => el.remove(), 280);
  };
  el.__close = close;
  if (!sticky) setTimeout(close, ms);
  return el;
}

// ── A thread that needs an answer ───────────────────────────────────────────
// It is a decision, so it does not time out and it carries the answers. One at
// a time; a second waits until the first is dealt with.

let threadBanner = null;
const threadQueue = [];

export function offerThread(item) {
  if (!bannersOn || !root || !S) return;
  if (threadBanner) { if (!threadQueue.includes(item.id)) threadQueue.push(item.id); return; }
  showThread(item);
}

function showThread(item) {
  const opts = (() => { try { return threadOptions(S, item); } catch { return []; } })();
  if (!opts.length) return;
  const el = banner('thread', `
    <div class="ob-head"><span class="ob-k">THE WIRE</span>
      <span class="ob-live">NEEDS YOU</span>
      <button class="ob-x" data-act="os-banner-close" aria-label="Dismiss">✕</button></div>
    <div class="ob-body">${md(item.text)}</div>
    <div class="thread-opts">
      ${opts.map((o, i) => `<button class="thread-opt" data-act="thread" data-v="${item.id}" data-i="${i}">${esc(o.label)}</button>`).join('')}
    </div>
    <button class="ob-more" data-act="wire-toggle">Open the Wire</button>`, { sticky: true });
  if (!el) return;
  el.dataset.thread = String(item.id);
  threadBanner = el;
}

export function closeThreadBanner(id) {
  if (!threadBanner) return;
  if (id !== undefined && String(threadBanner.dataset.thread) !== String(id)) return;
  threadBanner.__close?.();
  threadBanner = null;
  const nextId = threadQueue.shift();
  if (nextId === undefined || !S) return;
  const item = S.feed.find((f) => f.id === nextId && f.thread && !f.resolved);
  if (item) setTimeout(() => showThread(item), 260);
}

export function closeAnyBanner(el) {
  const b = el?.closest?.('.os-banner');
  if (!b) return false;
  if (b === threadBanner) { closeThreadBanner(); return true; }
  b.__close?.();
  return true;
}

export function hasThreadBanner(id) {
  return !!threadBanner && (id === undefined || String(threadBanner.dataset.thread) === String(id));
}

// ── An incoming call ────────────────────────────────────────────────────────
// A card from a person announces itself before it opens; a card from a system —
// and a card from ARIA or HELIX, who are already inside the machine — does not.

export function isPerson(ev) {
  const c = ev?.char ? CHARACTERS[ev.char] : null;
  return !!(c && c.img && c.kind !== 'ai');
}

export function announce(ev) {
  if (!root || !isPerson(ev) || reduced()) return null;
  const c = CHARACTERS[ev.char];
  const el = banner('call', `
    <div class="ob-call">
      <span class="ob-face" style="background-image:url('${c.img}');--cc:${c.color}"></span>
      <span class="ob-who">
        <span class="ob-k">INCOMING</span>
        <span class="ob-name" style="color:${c.color}">${esc(c.name)}</span>
        <span class="ob-role">${esc(c.role)}</span>
      </span>
    </div>`, { ms: OS.T_CALL + 260 });
  return new Promise((done) => setTimeout(() => { el?.__close?.(); done(); }, OS.T_CALL));
}
