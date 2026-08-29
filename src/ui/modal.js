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

// The chat box floats over the bottom of the browser this game is played in.
// When an assistant is at the table, every card gains a line pointing at it —
// a signpost, not a control, because the control is somebody else's window.
let freeTextFn = () => false;
export function setFreeTextProvider(fn) { freeTextFn = fn || (() => false); }
function freeText() { try { return !!freeTextFn(); } catch { return false; } }

// What the world wrote in answer to what the founder typed. It is the only
// place in the game that asks for a human hand, so it gets a real form: with
// the declarative API the browser focuses the button and hands control back,
// and without it, it is still a button.
let onAccept = null, onDecline = null;
export function setProposalHandlers({ accept, decline }) { onAccept = accept; onDecline = decline; }

export function showProposal(ev, proposal) {
  const box = document.getElementById('event-choices');
  if (!box || !proposal) return false;
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

export function showEvent(ev) {
  const char = ev.char ? CHARACTERS[ev.char] : null;
  const color = KIND_COLOR[ev.kind] || 'var(--violet)';
  const icon = char?.icon || KIND_ICON[ev.kind] || '◈';
  // A card from a person and a card from a system must not be the same object.
  // When there is a portrait it becomes the card — a plate across the header,
  // not a 62px chip cropped out of a 512px image.
  const html = `
  <div class="modal-backdrop" id="event-modal">
    <div class="modal ${char?.img ? 'has-portrait' : ''}" style="--kind-color:${color};--char-color:${char?.color || color}">
      <div class="modal-top">
        ${char?.img
          ? `<div class="event-plate" style="background-image:url('${char.img}');background-color:${char.color}18"></div>`
          : `<div class="event-avatar" style="color:${color};border-color:var(--line-2)">${icon}</div>`}
        <div style="flex:1;min-width:0">
          <div class="event-kind">${esc(ev.kind || 'event')}</div>
          <div class="event-title">${esc(ev.title)}</div>
          ${char ? `<div class="event-char">${char.name.toLowerCase() === String(ev.title).toLowerCase()
            ? esc(char.role) : `${esc(char.name)} · ${esc(char.role)}`}</div>` : ''}
        </div>
      </div>
      <div class="modal-body"><div class="event-body">${md(ev.body)}</div></div>
      <div class="modal-choices" id="event-choices">
        ${freeText() ? `
        <div class="choice choice-free" aria-hidden="false">
          <div class="choice-num">\u270e</div>
          <div style="flex:1">
            <div class="choice-label">Or say it in your own words</div>
            <div class="choice-sub">Type what you do in the chat. The world will answer, on this card.</div>
          </div>
        </div>` : ''}
        ${ev.choices.map((c, i) => `
          <button class="choice reveal ${c.tone}" data-choice="${i}">
            <div class="choice-num">${i + 1}</div>
            <div style="flex:1">
              <div class="choice-label">${esc(c.label)}</div>
              ${c.sub ? `<div class="choice-sub">${esc(c.sub)}</div>` : ''}
            </div>
          </button>`).join('')}
      </div>
    </div>
  </div>`;
  root().innerHTML = html;

  root().querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!btn.classList.contains('shown')) return;   // not yet offered
      const i = Number(btn.dataset.choice);
      onChoose?.(i);
    });
  });
  // The decision arrives after the text, not with it.
  stagger(root().querySelectorAll('.choice.reveal'), { gap: 110, delay: 420 });
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
};

export function showOutcome(ev, outcome, effects) {
  const box = document.getElementById('event-choices');
  if (!box) return;
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

export function closeModal() { root().innerHTML = ''; }

// ── Act transition ─────────────────────────────────────────────────────────
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export function showActTransition(act, onDone) {
  const meta = ACTS[act] || { name: 'Unknown', sub: '' };
  const el = document.createElement('div');
  el.className = 'act-overlay';
  el.innerHTML = `
    <div class="act-plate" style="background-image:url('assets/img/act${Math.max(1, Math.min(5, act))}.jpg')"></div>
    <div class="act-veil"></div>
    <div class="act-inner">
      <div class="act-roman">${ROMAN[act] || act}</div>
      <div class="act-big">${esc(meta.name)}</div>
      <div class="act-tag">${esc(meta.sub || '')}</div>
      <button class="btn btn-ghost mt24" id="act-continue">Continue</button>
    </div>`;
  document.body.appendChild(el);
  // Stop hit-testing the moment it starts fading, or half a second of an
  // invisible sheet eats the first click on whatever is underneath.
  const close = () => {
    el.style.pointerEvents = 'none';
    el.style.opacity = '0'; el.style.transition = 'opacity .5s';
    setTimeout(() => { el.remove(); onDone?.(); }, 500);
  };
  el.querySelector('#act-continue').addEventListener('click', close);
  setTimeout(close, 6500);
}

// ── Generic dialog ─────────────────────────────────────────────────────────
export function dialog({ title, body, actions = [], wide = false, onClose }) {
  const html = `<div class="modal-backdrop" id="generic-modal">
    <div class="modal ${wide ? 'wide' : ''}">
      <div class="modal-top">
        <div style="flex:1"><div class="event-title" style="font-size:18px">${esc(title)}</div></div>
        <button class="btn btn-icon btn-ghost" data-dlg="close">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-choices" style="flex-direction:row;justify-content:flex-end">
        ${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-dlg="${i}">${esc(a.label)}</button>`).join('')}
      </div>` : ''}
    </div></div>`;
  root().innerHTML = html;
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

export function isModalOpen() { return !!root()?.firstElementChild; }
