// ─────────────────────────────────────────────────────────────────────────────
// MODALS — narrative event cards, act transitions, dialogs.
// ─────────────────────────────────────────────────────────────────────────────
import { md, esc } from './dom.js';
import { stagger, typeInto } from './typewriter.js';
import { CHARACTERS } from '../data/characters.js';
import { ACTS } from '../data/balance.js';
import { TONE_LEGEND } from '../data/manual.js';
import { fmt, money } from '../engine/format.js';

const root = () => document.getElementById('modal-root');

const KIND_COLOR = {
  story: 'var(--violet)', crisis: 'var(--red)', opportunity: 'var(--green)',
  character: 'var(--cyan)', milestone: 'var(--amber)',
};
const KIND_ICON = {
  story: '◈', crisis: '⚠', opportunity: '↗', character: '☎', milestone: '✦',
};

// A choice's tone was colour alone — a lit edge — which is nothing to a
// colour-blind player and little to anyone at 2am. Each tone has a mark now,
// from the same table the manual prints as its legend.
const TONES = Object.fromEntries(TONE_LEGEND.map(([glyph, tone, desc]) => [tone, { glyph, desc }]));
function toneGlyph(tone) {
  const t = TONES[tone] || TONES.neutral;
  const name = TONES[tone] ? tone : 'neutral';
  // The class as well as the glyph: the mark is the channel that survives a
  // colour-blind eye, and the colour is what makes it agree with the manual's
  // legend, which prints the same table with the same classes.
  return `<span class="choice-tone ${name}" data-tip="<b>${esc(name)}</b> — ${esc(t.desc)}" aria-label="${esc(name)}">${t.glyph}</span>`;
}

let onChoose = null;
let onDismiss = null;
let onKeep = null;

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

// §B6. The opt-in choice preview. A provider rather than an import, for the
// reason `setFreeTextProvider` is one: this module holds no game state. It is
// asked once, when the plate opens — never on a repaint, because a dry run is
// a deep copy of the world per choice.
let previewFn = () => null;
export function setPreviewProvider(fn) { previewFn = fn || (() => null); }
function previewFor(ev) {
  try { const r = previewFn(ev); return Array.isArray(r) ? r : null; } catch { return null; }
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

export function setEventHandlers({ choose, dismiss, keep }) { onChoose = choose; onDismiss = dismiss; onKeep = keep || null; }

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

// A scene with more than one of the cast in it. `char` is still the card's
// primary and still the portrait plate behind the title; this is the rest of
// the room, at most three, as square chips with the person's own accent on all
// four sides. A face with no portrait (Jo) gets its glyph, the way Contacts
// already does it, so a character without an image is furniture rather than a
// hole. Renders nothing at all when a card has no `chars`, which is every card
// but eight.
function castStrip(ev) {
  const ids = Array.isArray(ev.chars) ? ev.chars.filter((id) => CHARACTERS[id]).slice(0, 3) : [];
  if (!ids.length) return '';
  return `<div class="event-cast">${ids.map((id) => {
    const c = CHARACTERS[id];
    return `<span class="ec-face${c.img ? '' : ' ec-glyph'}" style="--cc:${c.color}${c.img ? `;background-image:url('${c.img}')` : ''}"
      title="${esc(c.name)} — ${esc(c.role)}">${c.img ? '' : esc(c.icon || '☎')}</span>`;
  }).join('')}<span class="ec-n">${ids.length} in the room</span></div>`;
}

export function showEvent(ev) {
  const ownWords = freeText();
  const preview = previewFor(ev);
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
              ${castStrip(ev)}
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
                  ${previewHtml(preview?.[i])}
                </div>
                ${toneGlyph(c.tone)}
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

// One effect, as a chip. The outcome strip and §B6's preview print the same
// vocabulary from the same table, so a chip a founder learns to read under a
// choice means the same thing after it.
function effectChip(k, v, { cls = 'eff', delay = 0 } = {}) {
  const style = delay ? ` style="animation-delay:${delay}ms"` : '';
  if (k.startsWith('rel:')) {
    // A bare "+" told the player nothing. Name the direction and the size.
    const c = CHARACTERS[k.slice(4)];
    const label = c ? c.name : k.slice(4);
    const mag = Math.abs(v);
    const word = v > 0 ? (mag >= 12 ? 'much warmer' : mag >= 5 ? 'warmer' : 'a little warmer')
                       : (mag >= 12 ? 'much colder' : mag >= 5 ? 'colder' : 'a little colder');
    return `<span class="${cls} ${v > 0 ? 'pos' : 'neg'}"${style}>♥ ${esc(label)} ${word}</span>`;
  }
  if (k.startsWith('skill:')) {
    const name = k.slice(6);
    return `<span class="${cls} pos"${style}>✦ ${esc(name.charAt(0).toUpperCase() + name.slice(1))} +${v}</span>`;
  }
  const meta = EFFECT_META[k.split(':')[0]];
  if (!meta) return '';
  const pos = meta.invert ? v < 0 : v > 0;
  return `<span class="${cls} ${pos ? 'pos' : 'neg'}"${style}>${meta.icon} ${esc(meta.label)} ${(v > 0 ? '+' : '') + meta.fmt(v)}</span>`;
}

// §B6. What the dry run found, under the choice it was taken on. `~` means the
// effect rolled: the preview saw one branch and the stream was put back, so the
// real resolution may land somewhere else.
function previewHtml(entry) {
  if (!entry) return '';
  const chips = entry.effects.slice(0, 5)
    .map(([k, v]) => effectChip(k, v, { cls: 'eff eff-pre' })).filter(Boolean).join('');
  // A choice whose whole effect is a flag moves no number, and saying so is
  // better than a gap: it tells the founder the difference is somewhere else.
  if (!chips) return `<div class="choice-preview"><span class="eff eff-pre eff-none"
    data-tip="Nothing this run measures. What it changes is what happens later — who remembers it, and which cards the deck can deal."
    data-tip-title="No numbers">· nothing measurable</span></div>`;
  return `<div class="choice-preview${entry.approx ? ' approx' : ''}"${entry.approx
    ? ' data-tip="This one rolls. The preview took one of its branches and put the dice back where they were, so what actually happens may differ." data-tip-title="Not settled"'
    : ''}>${entry.approx ? '<span class="eff-approx" aria-label="approximate">~</span>' : ''}${chips}</div>`;
}

export function showOutcome(ev, outcome, effects) {
  const box = document.getElementById('event-choices');
  if (!box) return;
  setKicker('what happened');
  const effHtml = (effects || []).filter(([k, v]) => v !== 0 && Math.abs(v) > 0.001)
    .map(([k, v], i) => effectChip(k, v, { delay: i * 45 })).join('');

  // Any card whose outcome is on the glass can be kept. A world card is kept
  // whole; a written one is kept as a *memory* — what you did, and the road you
  // did not take — so the founder with no assistant has a deck too. The key
  // sits beside Continue, never in its way.
  const world = !!(ev?.author === 'world' && ev?.runtime);
  const keepable = !!(onKeep && ev && ev.outcome && (world || ev.chosen));
  box.innerHTML = `<div class="outcome">
      <div class="outcome-text">${md(outcome || '')}</div>
      ${effHtml ? `<div class="outcome-effects">${effHtml}</div>` : ''}
    </div>
    ${keepable ? `<button class="btn btn-ghost btn-block keep-key" id="event-keep" data-tip="${world
        ? `The world wrote this one. Keep it, and the written deck deals it in every timeline after this — once, in this act, to a founder who has met ${esc(ev.char ? (CHARACTERS[ev.char]?.name || 'them') : 'nobody in particular')}.`
        : `Keep the memory of it. A later timeline is dealt this moment back, with what you did on one door and the road you did not take on the other.`}" data-tip-title="${world ? 'Keep this card' : 'Keep this memory'}">
      <span class="keep-glyph">⊕</span> ${world ? 'Keep this card' : 'Keep this memory'}</button>` : ''}
    <button class="btn btn-primary btn-block btn-lg" id="event-continue">Continue <span class="dim mono tiny" style="opacity:.6">⏎</span></button>`;
  document.getElementById('event-continue')?.addEventListener('click', () => onDismiss?.());
  document.getElementById('event-keep')?.addEventListener('click', (e) => {
    const r = onKeep?.(ev);
    const b = e.currentTarget;
    if (b) { b.disabled = true; b.innerHTML = r?.ok ? '<span class="keep-glyph">✓</span> Kept — it is in the deck now' : `<span class="keep-glyph">·</span> ${esc(r?.reason || 'Not kept')}`; }
  });
  setTimeout(() => document.getElementById('event-continue')?.focus(), 60);
}

// ── A phone call ────────────────────────────────────────────────────────────
// The same plate a card from a person gets — the portrait across the header,
// the decision down the right — because a call *is* a card from a person, one
// that answers back. The transcript takes the choices' column; what you can
// say next takes their place at the foot of it. In the written world that is
// three things you might say; with somebody playing the line it is a field.
//
// `view` is computed by whoever owns the phone — options, status, the deal on
// the table, the person's dossier — so this module stays free of game state.
let onCallSay = null, onCallTopic = null, onCallHangUp = null;
export function setCallHandlers({ say, topic, hangUp } = {}) {
  onCallSay = say || null; onCallTopic = topic || null; onCallHangUp = hangUp || null;
}

const CALL_STATE_LINE = {
  connected: 'connected', writing: 'the line is open', queued: 'holding the line',
  them: 'they hung up', line: 'the line went dead', founder: 'call ended', quiet: 'nobody on the line',
};

export function showCall(view) {
  if (!view?.call) return false;
  const { call, person, options = [], status = 'connected', deal = '', dossier = {}, live = false, max = 6, said = 0 } = view;
  const color = person?.color || 'var(--cyan)';
  const html = `
  <div class="modal-backdrop" id="call-modal">
    <div class="modal modal-split ${person?.img ? 'has-portrait' : ''} call-modal ${call.done ? 'ended' : ''}" role="dialog" aria-modal="true" aria-labelledby="call-title" tabindex="-1"
         style="--kind-color:${color};--char-color:${color}">
      <div class="modal-cols">
        <div class="modal-read">
          <div class="modal-top">
            ${person?.img
              ? `<div class="event-plate" style="background-image:url('${person.img}');background-color:${color}18"></div>`
              : `<div class="event-avatar" style="color:${color};border-color:var(--line-2)">${person?.icon || '☎'}</div>`}
            <div style="flex:1;min-width:0">
              <div class="event-kind kind-character call-kind"><span class="call-dot ${call.done ? 'off' : ''}"></span>${esc(CALL_STATE_LINE[status] || status)}</div>
              <div class="event-title" id="call-title">${esc(person?.name || 'A call')}</div>
              <div class="event-char">${esc(person?.role || '')}${person?.handle ? ` · ${esc(person.handle)}` : ''}</div>
            </div>
          </div>
          <div class="modal-body">
            ${dossier.bio ? `<div class="call-bio">${md(dossier.bio)}</div>` : ''}
            <div class="call-dossier">
              ${dossier.wants ? `<div class="call-k">wants</div><div class="call-v">${esc(dossier.wants)}</div>` : ''}
              ${dossier.knows ? `<div class="call-k">knows</div><div class="call-v">${esc(dossier.knows)}</div>` : ''}
              ${dossier.standing ? `<div class="call-k">standing</div><div class="call-v">${esc(dossier.standing)}</div>` : ''}
              ${dossier.since ? `<div class="call-k">last spoke</div><div class="call-v">${esc(dossier.since)}</div>` : ''}
              ${dossier.remembers?.length ? `<div class="call-k">remembers</div><div class="call-v call-mem">${dossier.remembers.map((m) => `<span class="quote">${esc(m)}</span>`).join('<br>')}</div>` : ''}
              ${live ? `<div class="call-k">played by</div><div class="call-v">your assistant, live</div>` : ''}
            </div>
          </div>
        </div>
        <div class="modal-act">
          <div class="act-head">
            <span class="act-k" id="call-kicker">the call</span>
            <span class="act-n">${said} of ${max}</span>
          </div>
          <div class="modal-choices call-choices" id="call-choices">
            <div class="call-transcript" id="call-transcript">
              ${call.rounds.map((r, i) => callLineHtml(r, person, i === call.rounds.length - 1)).join('')}
            </div>
            ${deal ? `<div class="call-deal" id="call-deal"><span class="call-deal-k">on the table</span><span class="mono">${esc(deal)}</span></div>` : ''}
            <div class="call-controls" id="call-controls">${callControlsHtml(view)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  captureFocus();
  root().innerHTML = html;
  wireCall(view);
  focusInto(root().querySelector(call.done ? '#call-close' : (live ? '#call-say' : '.call-topic')) || root().querySelector('.modal'));
  const tr = document.getElementById('call-transcript');
  if (tr) tr.scrollTop = tr.scrollHeight;
  return true;
}

function callLineHtml(r, person, last) {
  // First names on the rail: a label column has room for one word, and a call
  // is on first-name terms by definition.
  const who = r.who === 'you' ? 'you' : r.who === 'line' ? 'line' : String(person?.name || 'them').split(' ')[0];
  return `<div class="call-line ${r.who}${r.bye ? ' bye' : ''}${last ? ' last' : ''}">
    <span class="call-who">${esc(who)}</span>
    <span class="call-text">${md(r.text)}</span>
  </div>`;
}

function callControlsHtml({ call, options = [], live = false, status = 'connected', deal = '', pending = null, said = 0, max = 6 }) {
  if (call.done) {
    return `<button class="btn btn-primary btn-block btn-lg" id="call-close">Put the phone down <span class="dim mono tiny" style="opacity:.6">⏎</span></button>`;
  }
  const hang = deal
    ? `<div class="call-hang row g8">
         <button class="btn btn-primary grow" data-call-hang="accept">Accept the terms and hang up</button>
         <button class="btn btn-ghost" data-call-hang="decline">Walk away</button>
       </div>`
    : `<div class="call-hang"><button class="btn btn-ghost btn-block" data-call-hang="decline">Hang up</button></div>`;
  if (!live) {
    return `${options.map((o, i) => `
      <button class="choice call-topic neutral" data-call-topic="${esc(o.id)}">
        <span class="choice-sheen" aria-hidden="true"></span>
        <div class="choice-num">${i + 1}</div>
        <div style="flex:1"><div class="choice-label">${esc(o.label)}${o.again ? ' <span class="call-again">again</span>' : ''}</div></div>
      </button>`).join('')}
      ${!options.length && said < max ? `<div class="tiny dim call-note">There is nothing else to say. Not today.</div>` : ''}
      ${hang}`;
  }
  const waiting = pending && !pending.answered;
  const spent = said >= max;
  const line = waiting
    ? (pending.delivered ? 'They heard you. The world is writing what they say back.' : 'Holding the line until the world checks in.')
    : status === 'quiet' ? 'Nobody is on the line. Hang up and try again later.'
    : spent ? 'That is enough for one call.'
    : 'Say what you actually say. Your assistant answers as them.';
  return `<form class="choice choice-free call-form ${waiting ? 'waiting' : ''}" novalidate>
      <div class="choice-num" aria-hidden="true">✎</div>
      <div class="own-words-main">
        <label class="choice-label" for="call-say">${waiting ? 'You said' : 'You say'}</label>
        ${waiting ? `<div class="own-words-quote">${esc(pending.text)}</div>`
          : `<textarea id="call-say" class="own-words-textarea" rows="2" maxlength="400" ${spent || status === 'quiet' ? 'disabled' : ''}
              placeholder="What do you say to them?"></textarea>`}
        <div class="own-words-footer">
          <span class="own-words-status ${waiting && pending.delivered ? 'live' : waiting ? 'queued' : 'live'}" role="status"><i></i>${esc(line)}</span>
          ${waiting || spent ? '' : `<button type="submit" class="btn btn-violet btn-sm" id="call-send" disabled>Say it</button>`}
        </div>
      </div>
    </form>
    ${hang}`;
}

function wireCall(view) {
  const box = root();
  box.querySelectorAll('[data-call-topic]').forEach((b) => b.addEventListener('click', () => onCallTopic?.(b.dataset.callTopic)));
  box.querySelectorAll('[data-call-hang]').forEach((b) => b.addEventListener('click', () => onCallHangUp?.(b.dataset.callHang === 'accept')));
  box.querySelector('#call-close')?.addEventListener('click', () => { closeModal(); });
  const form = box.querySelector('.call-form');
  if (form) {
    const input = form.querySelector('#call-say');
    const send = form.querySelector('#call-send');
    const sync = () => { if (send) send.disabled = !String(input?.value || '').trim(); };
    input?.addEventListener('input', sync);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit?.(); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = String(input?.value || '').trim();
      if (!text || !onCallSay) return;
      if (send) { send.disabled = true; send.textContent = 'Saying…'; }
      let r;
      try { r = await onCallSay(text); } catch (err) { r = { ok: false, reason: err?.message }; }
      if (!r?.ok) {
        if (send) { send.textContent = 'Say it'; sync(); }
        const st = form.querySelector('.own-words-status');
        if (st) st.innerHTML = `<i></i>${esc(r?.reason || 'That did not go through')}`;
        input?.focus();
      }
    });
    sync();
  }
  // The newest line from them types itself out, once: the reply arrives the
  // way a person's does, not the way a page does. `typeInto` writes plain
  // text, so the marked-up version goes back in when it lands.
  const lastThem = box.querySelector('.call-line.them.last .call-text');
  if (lastThem && view.typeLast) {
    const html = lastThem.innerHTML;
    typeInto(lastThem, view.typeLast, { cps: 46 }).then(() => { lastThem.innerHTML = html; });
  }
}

export function isCallOpen() { return !!root()?.querySelector?.('#call-modal'); }

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
