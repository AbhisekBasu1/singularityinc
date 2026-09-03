// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS — everyone the founder has a number for.
//
// Two panes: a rail of people and one person's dossier, with the phone at the
// foot of it. Selection lives at `S.ui.os.contact`, which is saved, so the
// machine reopens on the person you were reading. `render(S)` is a pure string
// function; every line of prose in it comes from `characters.js`, from the
// call log, or from `src/data/machine.js`.
//
// A greyed Call key says what it needs — BACK IN 3 DAYS, FOCUS 2 OF 4, NOT
// PICKING UP — in the same mono the context menus use, because a phone that
// simply refuses is a phone nobody understands.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from '../dom.js';
import { contacts, canCall, busyLine, callLog, lastCallWith } from '../../systems/calls.js';
import { arcLabel } from '../../data/characters.js';
import { EMPTY, CTX } from '../../data/machine.js';
import { describeEffects } from '../../world/effects.js';
import { CALLS } from '../../data/balance.js';
import { ties, warmthWord } from '../../systems/life.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

function selected(S) { return S?.ui?.os?.contact || null; }

function pips(a) {
  const mag = Math.min(1, Math.log10(1 + Math.abs(a || 0)) / Math.log10(41));
  const lit = Math.round(mag * 7);
  const col = (a || 0) >= 0 ? 'var(--green)' : 'var(--red)';
  return `<span class="ct-pips">${Array.from({ length: 7 }, (_, i) =>
    `<i style="${i < lit ? `background:${col}` : ''}"></i>`).join('')}</span>`;
}

function sinceText(c) {
  if (c.since == null) return 'never called';
  if (c.since === 0) return 'called today';
  return `called ${c.since} day${c.since === 1 ? '' : 's'} ago`;
}

export function render(S) {
  const people = safe(() => contacts(S), []) || [];
  const sel = selected(S);
  const chosen = people.find((p) => p.id === sel) || null;
  const pane = chosen ? 'read' : 'list';
  if (!people.length) {
    return `<div class="ct ct-solo" data-pane="list" data-ctx="contacts">
      <div class="ct-list">${head('Contacts', '')}${emptyPane(line('contacts'), 'NOBODY YET')}</div>
    </div>`;
  }
  return `<div class="ct" data-pane="${pane}" data-ctx="contacts">
    <div class="ct-list">
      ${head('Contacts', `${people.length}`)}
      <div class="ct-rows">
        ${people.map((p) => rowHtml(S, p, chosen)).join('')}
      </div>
      ${recentHtml(S)}
    </div>
    ${chosen ? dossierHtml(S, chosen) : `<div class="ct-read">${head('Dossier', '')}${emptyPane(line('select_contact'), 'NOBODY OPEN')}</div>`}
  </div>`;
}

function head(k, n) {
  return `<div class="ct-head"><span class="ct-k">${esc(k)}</span>${n ? `<span class="ct-count">${esc(n)}</span>` : ''}</div>
    <div class="ct-rule"></div>`;
}

function rowHtml(S, p, chosen) {
  const on = chosen && chosen.id === p.id;
  const aff = Math.round(p.rel.affinity || 0);
  return `<button class="ct-row${on ? ' on' : ''}" type="button" data-act="contact-select" data-v="${esc(p.id)}"
      data-ctx="contact" data-id="${esc(p.id)}" data-name="${esc(p.name)}" aria-current="${on ? 'true' : 'false'}"
      style="--cc:${p.color}">
    ${p.img ? `<span class="ct-face" style="background-image:url('${p.img}')"></span>` : `<span class="ct-face ct-glyph">${p.icon || '☎'}</span>`}
    <span class="ct-who">
      <span class="ct-name">${esc(p.name)}${p.live ? '<span class="ct-live" title="played live">●</span>' : ''}</span>
      <span class="ct-role">${esc(p.role)}</span>
    </span>
    <span class="ct-side">
      ${pips(aff)}
      <span class="ct-since">${esc(p.can.ok ? sinceText(p).toUpperCase() : p.can.note)}</span>
      ${warmTag(S, p.id)}
    </span>
  </button>`;
}

// How recently they heard from you, as the Life panel counts it.
function warmTag(S, id) {
  const t = safe(() => ties(S).find((x) => x.id === id), null);
  if (!t) return '';
  return `<span class="ct-warm ${t.warm ? 'warm' : t.cold ? 'cold' : ''}">${esc(warmthWord(t).toUpperCase())}</span>`;
}

function recentHtml(S) {
  const log = safe(() => callLog(S), []).slice(0, 6);
  if (!log.length) return '';
  return `<div class="ct-recent">
    <div class="ct-k ct-recent-k">Recent</div>
    ${log.map((c) => {
      const p = contacts(S).find((x) => x.id === c.char);
      const last = [...c.rounds].reverse().find((r) => r.who === 'them');
      return `<button class="ct-rec" type="button" data-act="contact-select" data-v="${esc(c.char)}">
        <span class="ct-rec-d">D${String(c.day).padStart(3, '0')}</span>
        <span class="ct-rec-n">${esc(p?.name || c.char)}${c.by === 'world' ? ' called you' : ''}</span>
        <span class="ct-rec-t">${esc(String(last?.text || '').slice(0, 60))}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function dossierHtml(S, p) {
  const r = p.rel;
  const can = p.can;
  const aff = Math.round(r.affinity || 0);
  const last = lastCallWith(S, p.id);
  const busy = !can.ok && (can.reason === 'cooldown' || can.reason === 'cold') ? busyLine(S, p.id) : '';
  return `<div class="ct-read" data-ctx="contact" data-id="${esc(p.id)}" data-name="${esc(p.name)}">
    <div class="ct-head">
      <button class="ct-back" data-act="contact-back" type="button" aria-label="Back to the list">‹</button>
      <span class="ct-k">${esc(p.kind || 'contact')}</span>
      <span class="ct-count">${esc(p.handle || '')}</span>
    </div>
    <div class="ct-rule"></div>
    <div class="ct-doc">
      <div class="ct-plate" style="--cc:${p.color}${p.img ? `;background-image:url('${p.img}')` : ''}">
        <div class="ct-plate-veil"></div>
        <div class="ct-plate-text">
          <div class="ct-big">${esc(p.name)}</div>
          <div class="ct-sub">${esc(p.role)}</div>
          <div class="ct-arc">${esc(arcLabel(p.id, r.arc || 0))}</div>
        </div>
      </div>
      <div class="ct-meta">
        <span class="ct-mk">standing</span><span class="ct-mv">${pips(aff)} <span class="mono">${aff >= 0 ? '+' : ''}${aff}</span></span>
        <span class="ct-mk">respect</span><span class="ct-mv mono">${Math.round(r.respect || 0)}</span>
        <span class="ct-mk">fear</span><span class="ct-mv mono">${Math.round(r.fear || 0)}</span>
        <span class="ct-mk">last call</span><span class="ct-mv">${last ? `day ${last.day}${last.by === 'world' ? ' · they called' : ''}` : '—'}</span>
        ${p.live ? `<span class="ct-mk">played by</span><span class="ct-mv">your assistant, live</span>` : ''}
      </div>
      <div class="ct-prose">
        <p>${md(p.bio || '')}</p>
        ${p.wants ? `<p><span class="ct-inline-k">wants</span> ${md(p.wants)}</p>` : ''}
        ${p.knows ? `<p><span class="ct-inline-k">knows</span> ${md(p.knows)}</p>` : ''}
        ${p.tie?.line ? `<p><span class="ct-inline-k">keeps</span> ${md(p.tie.line)}</p>` : ''}
        ${(r.memory || []).length ? `<div class="ct-inline-k">remembers you saying</div>
          <blockquote class="ct-q">${r.memory.slice(0, CALLS.MEMORY_KEEP).map((m) => `<span class="quote">d${m.day} · ${esc(m.text)}</span>`).join('<br>')}</blockquote>` : ''}
        ${last ? lastCallHtml(last, p) : ''}
      </div>
      <div class="ct-call">
        <button class="btn btn-primary btn-block btn-lg" data-act="call" data-v="${esc(p.id)}" ${can.ok ? '' : 'disabled'}
          ${busy ? `data-tip="${esc(busy)}" data-tip-title="${esc(p.name)}"` : ''}>
          ${can.ok ? `Call ${esc(p.name.split(' ')[0])}` : `Call ${esc(p.name.split(' ')[0])}`}
          <span class="ct-note">${esc(can.note || '')}</span>
        </button>
        <div class="tiny dimmer mt8">${esc(lore('contact'))}</div>
      </div>
    </div>
  </div>`;
}

function lastCallHtml(c, p) {
  const deal = describeEffects(c.deal || {});
  return `<div class="ct-inline-k">the last call</div>
    <div class="ct-transcript">
      ${c.rounds.slice(-6).map((r) => `<div class="ct-line ${r.who}"><span class="ct-line-who">${esc(r.who === 'you' ? 'you' : r.who === 'line' ? 'line' : p.name.split(' ')[0])}</span><span>${md(r.text)}</span></div>`).join('')}
      ${deal ? `<div class="ct-line deal"><span class="ct-line-who">terms</span><span class="mono">${esc(deal)}${c.accepted ? ' · accepted' : ' · walked away'}</span></div>` : ''}
    </div>`;
}

function emptyPane(prose, label) {
  return `<div class="ct-empty">
    <span class="ct-empty-mark" aria-hidden="true">☎</span>
    <span class="ct-empty-k">${esc(label)}</span>
    ${prose ? `<span class="ct-empty-line">${esc(prose)}</span>` : ''}
  </div>`;
}

// ── The title bar and the menu ──────────────────────────────────────────────

export function readoutFor(S) {
  const people = safe(() => contacts(S), []) || [];
  const ready = people.filter((p) => p.can.ok).length;
  if (!people.length) return 'NO NUMBERS YET';
  return `${people.length} NUMBER${people.length === 1 ? '' : 'S'} · ${ready} WILL PICK UP`;
}

export function menuFor(S) {
  const people = safe(() => contacts(S), []) || [];
  if (!people.length) return [{ label: line('contacts'), disabled: true }];
  const out = [{ head: 'CALL' }];
  for (const p of people) {
    out.push({ label: p.name, act: 'call', v: p.id, disabled: !p.can.ok, note: p.can.ok ? undefined : p.can.note });
  }
  return out;
}
