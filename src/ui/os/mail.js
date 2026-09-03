// ─────────────────────────────────────────────────────────────────────────────
// MAIL — the inbox, as a window.
//
// A list of letters and one letter open. The letters are Wire items of type
// `mail`, so this is a view of the feed rather than a second store; selection
// lives at `S.ui.os.mail`, saved with the layout. A letter that asks something
// carries the Wire's own reply buttons, dispatched through the same delegated
// `thread` action the rail uses, so answering here and answering there are one
// code path. `render(S)` is a pure string function.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from '../dom.js';
import { inbox, unread, mailState } from '../../systems/mail.js';
import { threadOptions, daysLeft } from '../../systems/feed.js';
import { CHARACTERS } from '../../data/characters.js';
import { EMPTY, CTX } from '../../data/machine.js';
import { gameDateShort } from '../../engine/format.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

function selected(S) { return S?.ui?.os?.mail ?? null; }

function faceHtml(item) {
  const c = item.mail?.char ? CHARACTERS[item.mail.char] : null;
  if (c?.img) return `<span class="ml-face" style="background-image:url('${c.img}');--cc:${c.color}"></span>`;
  const initial = String(item.mail?.from || item.author || '?').trim()[0] || '?';
  return `<span class="ml-face ml-initial">${esc(initial.toUpperCase())}</span>`;
}

export function render(S) {
  const items = safe(() => inbox(S), []) || [];
  const read = mailState(S).read;
  const sel = selected(S);
  const open = items.find((f) => f.id === sel) || null;
  const pane = open ? 'read' : 'list';
  if (!items.length) {
    return `<div class="ml ml-solo" data-pane="list" data-ctx="mail">
      <div class="ml-list">${head('Inbox', '')}${emptyPane(line('mail'), 'NOTHING IN THE POST')}</div>
    </div>`;
  }
  const n = items.filter((f) => !read[f.id]).length;
  return `<div class="ml" data-pane="${pane}" data-ctx="mail">
    <div class="ml-list">
      ${head('Inbox', n ? `${n} UNREAD` : `${items.length}`)}
      <div class="ml-rows">
        ${items.map((f) => rowHtml(S, f, open, read)).join('')}
      </div>
    </div>
    ${open ? letterHtml(S, open) : `<div class="ml-read">${head('Letter', '')}${emptyPane(line('select_mail'), 'NOTHING OPEN')}</div>`}
  </div>`;
}

function head(k, n) {
  return `<div class="ml-head"><span class="ml-k">${esc(k)}</span>${n ? `<span class="ml-count">${esc(n)}</span>` : ''}</div>
    <div class="ml-rule"></div>`;
}

function rowHtml(S, f, open, read) {
  const on = open && open.id === f.id;
  const isNew = !read[f.id];
  const asks = f.thread && !f.resolved;
  // A receipt or a renewal is filed rather than announced: dimmer in the list,
  // marked FILED where a letter that asks something says NEEDS YOU.
  const quiet = !!f.mail?.quiet;
  return `<button class="ml-row${on ? ' on' : ''}${isNew ? ' unread' : ''}${quiet ? ' quiet' : ''}" type="button" data-act="mail-open" data-v="${f.id}"
      data-ctx="feed" data-id="${f.id}" aria-current="${on ? 'true' : 'false'}">
    ${faceHtml(f)}
    <span class="ml-who">
      <span class="ml-from">${esc(f.mail?.from || f.author || '')}${f.byWorld ? '<span class="ml-world" title="written by the world">◈</span>' : ''}</span>
      <span class="ml-subject">${esc(f.mail?.subject || f.meta || '')}</span>
    </span>
    <span class="ml-side">
      <span class="ml-day">D${String(f.day).padStart(3, '0')}</span>
      ${asks ? `<span class="ml-asks">${leftLabel(S, f)}</span>` : quiet ? '<span class="ml-filed">FILED</span>' : ''}
    </span>
  </button>`;
}

function letterHtml(S, f) {
  const c = f.mail?.char ? CHARACTERS[f.mail.char] : null;
  const open = f.thread && !f.resolved;
  const opts = open ? safe(() => threadOptions(S, f), []) : [];
  return `<div class="ml-read" data-ctx="feed" data-id="${f.id}">
    <div class="ml-head">
      <button class="ml-back" data-act="mail-back" type="button" aria-label="Back to the inbox">‹</button>
      <span class="ml-k">${esc(f.mail?.from || f.author || 'letter')}</span>
      <span class="ml-count">D${f.day} · ${esc(gameDateShort(f.day).toUpperCase())}</span>
    </div>
    <div class="ml-rule"></div>
    <div class="ml-doc">
      <div class="ml-letterhead" style="--cc:${c?.color || 'var(--ink-3)'}">
        ${faceHtml(f)}
        <div class="ml-lh-text">
          <div class="ml-lh-from">${esc(f.mail?.from || f.author || '')}</div>
          <div class="ml-lh-role">${esc(f.mail?.role || '')}</div>
        </div>
      </div>
      <div class="ml-subject-big">${esc(f.mail?.subject || f.meta || '')}</div>
      <div class="ml-body">${md(f.text)}</div>
      ${open ? `<div class="ml-replies">
        <div class="ml-replies-k">reply${leftSuffix(S, f)}</div>
        ${opts.map((o, i) => `<button class="thread-opt" data-act="thread" data-v="${f.id}" data-i="${i}">${esc(o.label)}</button>`).join('')}
        ${f.snoozed
          ? `<span class="thread-later done mono">LATER · D${f.snoozed}</span>`
          : `<button class="thread-later" data-act="thread-later" data-v="${f.id}" data-tip="A week further out. Once." data-tip-title="Later">Later</button>`}
      </div>` : ''}
      ${f.thread && f.resolved && f.outcome ? `<div class="ml-answered">
        <span class="ml-replies-k">you replied</span>
        <span class="ml-chosen">▸ ${esc(f.chosen || '')}</span>
        <span class="ml-out">${md(f.outcome)}</span>
      </div>` : ''}
      ${f.thread && f.expired ? `<div class="ml-answered dimmer"><span class="ml-replies-k">unanswered</span> It resolved itself.</div>` : ''}
      <div class="tiny dimmer mt12">${esc(lore('mail'))}</div>
    </div>
  </div>`;
}

// A letter that asks something has a deadline, and until this nothing said so.
// NEEDS YOU is the state; the number beside it is the clock on that state.
function leftLabel(S, f) {
  const d = safe(() => daysLeft(S, f), null);
  return d === null ? 'NEEDS YOU' : `NEEDS YOU · ${d}D`;
}
function leftSuffix(S, f) {
  const d = safe(() => daysLeft(S, f), null);
  return d === null ? '' : ` · ${d} day${d === 1 ? '' : 's'} left`;
}

function emptyPane(prose, label) {
  return `<div class="ml-empty">
    <span class="ml-empty-mark" aria-hidden="true">✉</span>
    <span class="ml-empty-k">${esc(label)}</span>
    ${prose ? `<span class="ml-empty-line">${esc(prose)}</span>` : ''}
  </div>`;
}

export function readoutFor(S) {
  const items = safe(() => inbox(S), []) || [];
  const n = safe(() => unread(S), []).length;
  if (!items.length) return 'NOTHING IN THE POST';
  return `${n ? `${n} UNREAD · ` : ''}${items.length} LETTER${items.length === 1 ? '' : 'S'}`;
}

export function menuFor(S) {
  const n = safe(() => unread(S), []).length;
  return [
    { label: 'Mark everything read', act: 'mail-read-all', disabled: !n, note: n ? undefined : 'ALL READ' },
    { label: 'Back to the inbox', act: 'mail-back' },
  ];
}
