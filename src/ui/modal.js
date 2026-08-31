// ─────────────────────────────────────────────────────────────────────────────
// MODALS — narrative event cards, act transitions, dialogs.
// ─────────────────────────────────────────────────────────────────────────────
import { md, esc } from './dom.js';
import { stagger } from './typewriter.js';
import { CHARACTERS } from '../data/characters.js';
import { ACTS } from '../data/balance.js';
import { fmt, money } from '../engine/format.js';

const root = () => document.getElementById('modal-root');

const KIND_COLOR = {
  story: 'var(--violet)', crisis: 'var(--red)', opportunity: 'var(--green)',
  character: 'var(--cyan)', milestone: 'var(--amber)',
};
const KIND_ICON = {
  story: '◈', crisis: '⚠', opportunity: '↗', character: '☎', milestone: '✦',
};

let onChoose = null;
let onDismiss = null;

// Focus goes into a dialog when it opens and back to where it was when it
// closes; Tab cycles inside it. Without the three, a screen reader is never
// told a card opened and a keyboard walks straight out of it into the game.
let lastFocus = null;
// Called before the new markup goes in: the return target is what was focused
// before the *first* dialog opened, and one dialog replacing another (Recruit
// → Reroll, Settings → Manual) must not overwrite it with a node about to be
// removed.
function captureFocus() {
  if (!isModalOpen()) lastFocus = document.activeElement;
}
function focusInto(el) {
  if (!el) return;
  setTimeout(() => { try { el.focus({ preventScroll: true }); } catch {} }, 30);
}
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
document.addEventListener?.('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const modal = root()?.querySelector?.('.modal') || transition?.el?.querySelector?.('.act-inner');
  if (!modal) return;
  const items = Array.from(modal.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1], cur = document.activeElement;
  if (e.shiftKey && (cur === first || cur === modal)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  else if (!modal.contains(cur)) { e.preventDefault(); first.focus(); }
});

// When an assistant is at the table, the card itself is the founder's input
// surface. The provider reports whether the world is listening and whether a
// move is already in flight; the handlers keep this module free of game state.
let freeTextFn = () => false;
export function setFreeTextProvider(fn) { freeTextFn = fn || (() => false); }
function freeText() {
  try {
    const value = freeTextFn();
    if (value && typeof value === 'object') {
      return { available: !!value.available, waiting: !!value.waiting,
        pending: value.pending || null, max: Number(value.max) || 600 };
    }
    return { available: !!value, waiting: false, pending: null, max: 600 };
  } catch { return { available: false, waiting: false, pending: null, max: 600 }; }
}

let onOwnWordsSubmit = null, onOwnWordsCancel = null, onOwnWordsReconnect = null;
export function setOwnWordsHandlers({ submit, cancel, reconnect } = {}) {
  onOwnWordsSubmit = submit || null;
  onOwnWordsCancel = cancel || null;
  onOwnWordsReconnect = reconnect || null;
}

function ownWordsStatus(state) {
  if (state.pending?.delivered) return 'Move received — the world is writing what follows';
  if (state.pending) return 'Move saved — reconnect the world to deliver it';
  if (state.waiting) return 'The world is listening now';
  return 'Your move will be held safely until the world checks in';
}

function ownWordsHtml(state) {
  if (!state.available && !state.pending) return '';
  const p = state.pending;
  if (p) return `<div class="choice choice-free own-words-pending" data-own-words-mode="pending"
      data-submission-id="${esc(p.id || '')}" aria-live="polite">
    <div class="choice-num own-words-signal" aria-hidden="true">◈</div>
    <div class="own-words-main">
      <div class="choice-label">Your move is with the world</div>
      <div class="own-words-quote">${esc(p.text || '')}</div>
      <div class="own-words-footer">
        <span class="own-words-status ${p.delivered ? 'live' : 'queued'}" role="status"><i></i>${esc(ownWordsStatus(state))}</span>
        <span class="own-words-actions">
          ${!p.delivered ? '<button type="button" class="own-words-link" data-own-words-reconnect>Copy reconnect line</button>' : ''}
          <button type="button" class="own-words-link" data-own-words-cancel>Use written choices</button>
        </span>
      </div>
    </div>
  </div>`;
  return `<form class="choice choice-free own-words-form" data-own-words-mode="ready" novalidate>
    <div class="choice-num" aria-hidden="true">✎</div>
    <div class="own-words-main">
      <label class="choice-label" for="founder-own-words">Or make your own move</label>
      <textarea id="founder-own-words" class="own-words-textarea" rows="2" maxlength="${state.max}"
        placeholder="What do you actually do?" aria-describedby="own-words-status"></textarea>
      <div class="own-words-footer">
        <span class="own-words-status ${state.waiting ? 'live' : 'queued'}" id="own-words-status" role="status"><i></i>${esc(ownWordsStatus(state))}</span>
        <button type="submit" class="btn btn-violet btn-sm own-words-send" disabled>Send to world</button>
      </div>
    </div>
  </form>`;
}

function lockWrittenChoices(locked) {
  root()?.querySelectorAll?.('[data-choice]')?.forEach((button) => {
    button.disabled = !!locked;
    if (locked) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
  });
  root()?.querySelector?.('#event-choices')?.classList?.toggle('own-words-in-flight', !!locked);
}

function paintOwnWordsStatus(slot, state) {
  const status = slot?.querySelector?.('.own-words-status');
  if (!status) return;
  status.classList.toggle('live', !!(state.pending?.delivered || state.waiting));
  status.classList.toggle('queued', !(state.pending?.delivered || state.waiting));
  const dot = status.querySelector('i')?.outerHTML || '<i></i>';
  status.innerHTML = dot + esc(ownWordsStatus(state));
  if (state.pending?.delivered) slot.querySelector('[data-own-words-reconnect]')?.remove();
}

function wireOwnWords(state) {
  const slot = document.getElementById('own-words-slot');
  const form = slot?.querySelector('.own-words-form');
  if (form) {
    const input = form.querySelector('.own-words-textarea');
    const send = form.querySelector('.own-words-send');
    const sync = () => { if (send) send.disabled = !String(input?.value || '').trim(); };
    input?.addEventListener('input', sync);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit?.(); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = String(input?.value || '').trim();
      if (!text || !onOwnWordsSubmit) return;
      form.setAttribute('aria-busy', 'true');
      if (input) input.disabled = true;
      if (send) { send.disabled = true; send.textContent = 'Sending…'; }
      const status = form.querySelector('.own-words-status');
      if (status) status.innerHTML = '<i></i>Handing your move to the world';
      let result;
      try { result = await onOwnWordsSubmit(text); }
      catch (err) { result = { ok: false, reason: err?.message || 'The move could not be sent' }; }
      if (result?.ok) { refreshFreeText(); return; }
      form.removeAttribute('aria-busy');
      if (input) input.disabled = false;
      if (send) { send.textContent = 'Send to world'; sync(); }
      if (status) status.innerHTML = `<i></i>${esc(result?.reason || 'The move could not be sent')}`;
      input?.focus();
    });
    sync();
  }
  slot?.querySelector('[data-own-words-cancel]')?.addEventListener('click', async () => {
    await onOwnWordsCancel?.();
    refreshFreeText();
    setTimeout(() => document.getElementById('founder-own-words')?.focus(), 30);
  });
  slot?.querySelector('[data-own-words-reconnect]')?.addEventListener('click', () => onOwnWordsReconnect?.());
  lockWrittenChoices(!!state.pending);
}

// Wait calls open and close while somebody may already be typing. Update the
// live indicator in place when the mode is unchanged so their draft and focus
// are never thrown away by a background heartbeat.
export function refreshFreeText() {
  const slot = document.getElementById('own-words-slot');
  if (!slot) return false;
  const state = freeText();
  const mode = state.pending ? 'pending' : state.available ? 'ready' : 'off';
  const id = state.pending?.id || '';
  if (slot.dataset.mode === mode && slot.dataset.submissionId === id) {
    paintOwnWordsStatus(slot, state);
    lockWrittenChoices(!!state.pending);
    return true;
  }
  slot.dataset.mode = mode;
  slot.dataset.submissionId = id;
  slot.innerHTML = ownWordsHtml(state);
  wireOwnWords(state);
  return true;
}

// What the world wrote in answer to what the founder typed. It is the only
// place in the game that asks for a human hand, so it gets a real form: with
// the declarative API the browser focuses the button and hands control back,
// and without it, it is still a button.
let onAccept = null, onDecline = null;
export function setProposalHandlers({ accept, decline }) { onAccept = accept; onDecline = decline; }

export function showProposal(ev, proposal) {
  const box = document.getElementById('event-choices');
  if (!box || !proposal) return false;
  setKicker('the world answers');
  box.innerHTML = `
    <div class="proposal">
      <div class="proposal-kind">the world answers</div>
      <div class="proposal-body">${md(proposal.outcome)}</div>
      ${proposal.describe ? `<div class="proposal-fx mono">${esc(proposal.describe)}</div>` : ''}
      <form class="proposal-form" toolname="accept_outcome"
            tooldescription="Apply the outcome the world wrote for what the founder typed. Only the founder can press this.">
        <button type="submit" class="btn btn-primary">Accept</button>
        <button type="button" class="btn" data-proposal="decline">Decline</button>
      </form>
    </div>`;
  const form = box.querySelector('.proposal-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    // `respondWith` returns a result to the agent without navigating, when the
    // browser implements the declarative half of the spec.
    try { e.respondWith?.(Promise.resolve({ status: 'accepted' })); } catch {}
    onAccept?.();
  });
  box.querySelector('[data-proposal="decline"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    onDecline?.();
  });
  stagger(Array.from(box.querySelectorAll('.proposal-body, .proposal-fx, .proposal-form')), { gap: 90 });
  return true;
}

export function setEventHandlers({ choose, dismiss }) { onChoose = choose; onDismiss = dismiss; }

// ── Where a dialog hangs from ───────────────────────────────────────────────
// The console centres everything, because there is one screen and one view. The
// workstation hangs an ordinary dialog off the window whose action opened it —
// a sheet — and centres the rest. The shell supplies the rect; this module only
// writes it onto the backdrop and lets `styles/os.css` do the geometry, so the
// console (which never sets a provider) is untouched.
let placementFn = null;
export function setPlacement(fn) { placementFn = fn || null; }
function placementFor(opts) {
  if (!placementFn || opts.centred) return null;
  try {
    const p = placementFn(opts);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.w) ? p : null;
  } catch { return null; }
}

// The right column's heading, which outlives the choices it was written for:
// `showOutcome` and `showProposal` both replace what is under it.
function setKicker(text, note = '') {
  const k = document.getElementById('event-kicker');
  if (k) k.textContent = text;
  const n = k?.parentElement?.querySelector('.act-n');
  if (n) n.textContent = note;
}

export function showEvent(ev) {
  const ownWords = freeText();
  const char = ev.char ? CHARACTERS[ev.char] : null;
  const color = KIND_COLOR[ev.kind] || 'var(--violet)';
  const icon = char?.icon || KIND_ICON[ev.kind] || '◈';
  // A card from a person and a card from a system must not be the same object.
  // When there is a portrait it becomes the card — a plate across the header,
  // not a 62px chip cropped out of a 512px image.
  // Two columns: the scene on the left, the decision on the right. Stacked,
  // the card had to divide one column of height between prose and controls,
  // and the own-words form pushed that past breaking — the founder was reading
  // four lines of a scene through a letterbox with the rest behind a scroll.
  // Side by side, each half scrolls on its own and neither shortens the other.
  // Below 1000px there is no room for two, and `.modal-cols` stacks again.
  const html = `
  <div class="modal-backdrop" id="event-modal">
    <div class="modal modal-split ${char?.img ? 'has-portrait' : ''}" role="dialog" aria-modal="true" aria-labelledby="event-title" tabindex="-1"
         style="--kind-color:${color};--char-color:${char?.color || color}">
      <div class="modal-cols">
        <div class="modal-read">
          <div class="modal-top">
            ${char?.img
              ? `<div class="event-plate" style="background-image:url('${char.img}');background-color:${char.color}18"></div>`
              : `<div class="event-avatar" style="color:${color};border-color:var(--line-2)">${icon}</div>`}
            <div style="flex:1;min-width:0">
              <div class="event-kind kind-${esc(ev.kind || 'story')}">${esc(ev.kind || 'event')}</div>
              <div class="event-title" id="event-title">${esc(ev.title)}</div>
              ${char ? `<div class="event-char">${char.name.toLowerCase() === String(ev.title).toLowerCase()
                ? esc(char.role) : `${esc(char.name)} · ${esc(char.role)}`}</div>` : ''}
            </div>
          </div>
          <div class="modal-body"><div class="event-body">${md(ev.body)}</div></div>
        </div>
        <div class="modal-act">
          <div class="act-head">
            <span class="act-k" id="event-kicker">the decision</span>
            <span class="act-n">${ev.choices.length} written</span>
          </div>
          <div class="modal-choices" id="event-choices">
            ${ev.choices.map((c, i) => `
              <button class="choice reveal ${c.tone}" data-choice="${i}" tabindex="-1" aria-hidden="true"
                      ${ownWords.pending ? 'disabled aria-disabled="true"' : ''}>
                <span class="choice-sheen" aria-hidden="true"></span>
                <div class="choice-num">${i + 1}</div>
                <div style="flex:1">
                  <div class="choice-label">${esc(c.label)}</div>
                  ${c.sub ? `<div class="choice-sub">${esc(c.sub)}</div>` : ''}
                </div>
              </button>`).join('')}
            <div class="own-words-slot" id="own-words-slot"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  captureFocus();
  root().innerHTML = html;
  refreshFreeText();
  focusInto(root().querySelector('.modal'));

  root().querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!btn.classList.contains('shown')) return;   // not yet offered
      const i = Number(btn.dataset.choice);
      onChoose?.(i);
    });
  });
  // The decision arrives after the text, not with it — and until a choice is
  // on screen it is not in the tab order or the accessibility tree either.
  stagger(root().querySelectorAll('.choice.reveal'), { gap: 110, delay: 420,
    onShow: (n) => { n.removeAttribute('tabindex'); n.removeAttribute('aria-hidden'); } });
}

const EFFECT_META = {
  cash: { label: 'Cash', fmt: (v) => money(v), icon: '$' },
  code: { label: 'Code', fmt: (v) => fmt(v), icon: '⌘' },
  insight: { label: 'Insight', fmt: (v) => fmt(v), icon: '◈' },
  reputation: { label: 'Reputation', fmt: (v) => fmt(v), icon: '☼' },
  research: { label: 'Research', fmt: (v) => fmt(v), icon: '⌬' },
  techDebt: { label: 'Tech Debt', fmt: (v) => fmt(v), icon: '⚠', invert: true },
  focus: { label: 'Focus', fmt: (v) => fmt(v), icon: '◉' },
  alignment: { label: 'Alignment', fmt: (v) => v.toFixed(2), icon: '⛨' },
  heat: { label: 'Reg. Heat', fmt: (v) => fmt(v), icon: '§', invert: true },
  opinion: { label: 'Approval', fmt: (v) => (v * 100).toFixed(0) + 'pt', icon: '♡' },
  influence: { label: 'Influence', fmt: (v) => fmt(v), icon: '◈' },
  users: { label: 'Users', fmt: (v) => fmt(v), icon: '☼' },
  equity: { label: 'Equity', fmt: (v) => (v * 100).toFixed(1) + '%', icon: '⌗' },
  days: { label: 'Days', fmt: (v) => fmt(v) + 'd', icon: '☾', invert: true },
  control: { label: 'Control', fmt: (v) => fmt(v), icon: '⊕' },
  rivals: { label: 'Rivals', fmt: (v) => (v * 100).toFixed(0) + '%', icon: '⚔' },
  compute: { label: 'Compute', fmt: (v) => fmt(v), icon: '▦' },
  race: { label: 'Rival frontier', fmt: (v) => fmt(v) + 'pt', icon: '✦', invert: true },
};

export function showOutcome(ev, outcome, effects) {
  const box = document.getElementById('event-choices');
  if (!box) return;
  setKicker('what happened');
  const effHtml = (effects || []).filter(([k, v]) => v !== 0 && Math.abs(v) > 0.001).map(([k, v], i) => {
    const base = k.split(':')[0];
    const meta = EFFECT_META[base];
    let label, val, pos;
    if (k.startsWith('rel:')) {
      // A bare "+" told the player nothing. Name the direction and the size.
      const c = CHARACTERS[k.slice(4)];
      label = c ? c.name : k.slice(4);
      const mag = Math.abs(v);
      const word = v > 0 ? (mag >= 12 ? 'much warmer' : mag >= 5 ? 'warmer' : 'a little warmer')
                         : (mag >= 12 ? 'much colder' : mag >= 5 ? 'colder' : 'a little colder');
      return `<span class="eff ${v > 0 ? 'pos' : 'neg'}" style="animation-delay:${i * 45}ms">♥ ${esc(label)} ${word}</span>`;
    }
    if (k.startsWith('skill:')) {
      const name = k.slice(6);
      return `<span class="eff pos" style="animation-delay:${i * 45}ms">✦ ${esc(name.charAt(0).toUpperCase() + name.slice(1))} +${v}</span>`;
    }
    if (!meta) return '';
    pos = meta.invert ? v < 0 : v > 0;
    val = (v > 0 ? '+' : '') + meta.fmt(v);
    return `<span class="eff ${pos ? 'pos' : 'neg'}" style="animation-delay:${i * 45}ms">${meta.icon} ${esc(meta.label)} ${val}</span>`;
  }).join('');

  box.innerHTML = `<div class="outcome">
      <div class="outcome-text">${md(outcome || '')}</div>
      ${effHtml ? `<div class="outcome-effects">${effHtml}</div>` : ''}
    </div>
    <button class="btn btn-primary btn-block btn-lg" id="event-continue">Continue <span class="dim mono tiny" style="opacity:.6">⏎</span></button>`;
  document.getElementById('event-continue')?.addEventListener('click', () => onDismiss?.());
  setTimeout(() => document.getElementById('event-continue')?.focus(), 60);
}

export function closeModal() {
  if (transition) transition.close();
  root().innerHTML = '';
  if (lastFocus && document.contains?.(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch {} }
  lastFocus = null;
}

// ── Act transition ─────────────────────────────────────────────────────────
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
// The act card is a dialog like any other while it is up: it counts as open,
// it holds focus, and Escape or `closeModal` ends it. Left outside that, Space
// unpaused the game beneath it and Q/W/E/R kept working behind the sheet.
let transition = null;   // { el, close }
export function showActTransition(act, onDone) {
  const meta = ACTS[act] || { name: 'Unknown', sub: '' };
  captureFocus();
  const el = document.createElement('div');
  el.className = 'act-overlay';
  el.innerHTML = `
    <div class="act-plate" style="background-image:url('assets/img/act${Math.max(1, Math.min(5, act))}.jpg')"></div>
    <div class="act-veil"></div>
    <div class="act-inner" role="dialog" aria-modal="true" aria-label="Act ${ROMAN[act] || act} — ${esc(meta.name)}" tabindex="-1">
      <div class="act-roman">${ROMAN[act] || act}</div>
      <div class="act-big">${esc(meta.name)}</div>
      <div class="act-tag">${esc(meta.sub || '')}</div>
      <button class="btn btn-ghost mt24" id="act-continue">Continue</button>
    </div>`;
  document.body.appendChild(el);
  // Stop hit-testing the moment it starts fading, or half a second of an
  // invisible sheet eats the first click on whatever is underneath. Closing
  // is idempotent: Continue and the timer must not each call `onDone`.
  let closed = false, timer = null;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    if (transition?.el === el) transition = null;
    el.style.pointerEvents = 'none';
    el.style.opacity = '0'; el.style.transition = 'opacity .5s';
    setTimeout(() => {
      el.remove();
      onDone?.();
      if (!isModalOpen() && lastFocus && document.contains?.(lastFocus)) {
        try { lastFocus.focus({ preventScroll: true }); } catch {}
        lastFocus = null;
      }
    }, 500);
  };
  transition = { el, close };
  el.querySelector('#act-continue').addEventListener('click', close);
  timer = setTimeout(close, 6500);
  focusInto(el.querySelector('#act-continue'));
}

// ── Generic dialog ─────────────────────────────────────────────────────────
export function dialog({ title, body, actions = [], wide = false, onClose, centred = false, kind = '' }) {
  const p = placementFor({ wide, centred, kind });
  const attrs = p
    ? `class="modal-backdrop sheet" style="--sheet-x:${p.x}px;--sheet-y:${p.y}px;--sheet-w:${p.w}px"`
    : `class="modal-backdrop"`;
  const html = `<div ${attrs} id="generic-modal">
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">
      <div class="modal-top">
        <div style="flex:1"><div class="event-title" id="dialog-title" style="font-size:18px">${esc(title)}</div></div>
        <button class="btn btn-icon btn-ghost" data-dlg="close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-choices" style="flex-direction:row;justify-content:flex-end">
        ${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-dlg="${i}">${esc(a.label)}</button>`).join('')}
      </div>` : ''}
    </div></div>`;
  captureFocus();
  root().innerHTML = html;
  focusInto(root().querySelector('.modal'));
  root().querySelectorAll('[data-dlg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.dlg;
      if (v === 'close') { closeModal(); onClose?.(); return; }
      const a = actions[Number(v)];
      if (a?.fn) a.fn();
      if (!a?.keepOpen) closeModal();
    });
  });
  return root().querySelector('.modal');
}

export function isModalOpen() { return !!root()?.firstElementChild || !!transition; }
