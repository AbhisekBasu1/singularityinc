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
import { APP_MAP, isLocked } from './apps.js';

let root = null;             // #toast-root — banners stack with the toasts
let centre = null;           // the Notification Center slide-over
let centreOpen = false;
let onCount = null;
let bannersOn = true;

// The record lives in the save, at `S.ui.os.nc`, the way the window layout
// does: a Center that emptied itself on every reload was a Center that never
// held the one thing a founder opens it for, which is what happened while they
// were away. Forty entries, newest first.
function history() {
  if (!S) return [];
  S.ui ??= {};
  S.ui.os ??= {};
  if (!Array.isArray(S.ui.os.nc)) S.ui.os.nc = [];
  return S.ui.os.nc;
}

// Which window a notification is about, when the toast did not say. The icons
// are conventional here — ⌬ is research, ◉ an agent, ✉ a letter — and a wrong
// guess only costs a Show key that opens a neighbouring app, so the table is
// short and the toasts that matter carry `show` themselves.
const SHOW_BY_ICON = {
  '⌬': 'research', '◉': 'agents', '▨': 'agents', '◈': 'product', '⚠': 'product',
  '$': 'market', '⌗': 'market', '⚔': 'market', '⇄': 'market', '☎': 'contacts',
  '✉': 'mail', '⊕': 'world', '⌁': 'wire', '∞': 'legacy', '⛨': 'legacy', '★': 'story',
};
function showFor(t) {
  const id = t.show || SHOW_BY_ICON[t.icon] || null;
  return id && APP_MAP[id] ? id : null;
}

const reduced = () => {
  try {
    return document.documentElement?.classList?.contains('reduced-motion')
      || !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch { return true; }
};

export function mount({ toasts, center, onCountChange }) {
  root = toasts; centre = center; onCount = onCountChange || null;
  centreOpen = false;
  root?.classList?.remove('nc-open');
  // The badge reflects what the save brought back, not what this session saw.
  onCount?.(history().length);
}

export function setBanners(on) { bannersOn = !!on; }

// ── The record ──────────────────────────────────────────────────────────────

export function record(t) {
  if (!S) return;
  const h = history();
  h.unshift({
    icon: t.icon || '◈', title: String(t.title || ''), sub: t.sub ? String(t.sub) : '',
    kind: t.kind || '', day: Math.floor(S.time.day), show: showFor(t),
  });
  if (h.length > OS.NC_KEEP) h.length = OS.NC_KEEP;
  onCount?.(h.length);
  if (centreOpen) paintCenter();
}

export function centerHtml() {
  const h = history();
  if (!h.length) {
    return `<div class="nc-empty">Nothing yet.<br/>The machine has not had to interrupt you.</div>`;
  }
  let lastDay = null;
  const rows = [];
  for (const n of h) {
    if (n.day !== lastDay) { lastDay = n.day; rows.push(`<div class="nc-day">DAY ${n.day}</div>`); }
    // The Show key is offered only for a window this run can open: a module
    // still locked is a door that would visibly do nothing.
    const app = n.show ? APP_MAP[n.show] : null;
    const canShow = !!app && !(app.module && isLocked(S, app));
    rows.push(`<div class="nc-item ${esc(n.kind || '')}">
      <span class="nc-icon">${esc(n.icon || '◈')}</span>
      <span class="nc-text"><span class="nc-title">${md(n.title || '')}</span>
      ${n.sub ? `<span class="nc-sub">${md(n.sub)}</span>` : ''}</span>
      ${canShow ? `<button class="nc-show" data-act="os-nc-show" data-v="${esc(n.show)}" aria-label="Show ${esc(app.title)}">SHOW</button>` : ''}
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
export function clearCenter() { history().length = 0; onCount?.(0); paintCenter(); }

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
