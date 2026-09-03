// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL — the founder's own words, on the days they wrote any.
//
// The Log is what the game wrote down. This is what you did. One field for
// today, and everything before it newest first, dated in the game's calendar.
// Entries are `S.notes`, saved, and the Record files them under `journal` so
// Find can find a sentence you wrote in Act I when you need it in Act IV. The
// world may read them too — `inspect_module(story)` carries the last two —
// which is exactly as private as a founder's journal ever is.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from '../dom.js';
import { EMPTY, CTX, SUNDAY } from '../../data/machine.js';
import { isSunday } from '../../systems/calendar.js';
import { gameDateShort } from '../../engine/format.js';
import { JOURNAL } from '../../data/balance.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

export function notes(S) { return Array.isArray(S?.notes) ? S.notes : []; }

export function addNote(S, text) {
  const t = String(text ?? '').trim();
  if (!t) return { ok: false, reason: 'empty' };
  if (!Array.isArray(S.notes)) S.notes = [];
  const day = Math.floor(S.time.day);
  S.notes.unshift({ day, text: t.slice(0, JOURNAL.NOTE_MAX), act: S.company.act });
  if (S.notes.length > JOURNAL.KEEP) S.notes.length = JOURNAL.KEEP;
  return { ok: true };
}

export function removeNote(S, index) {
  if (!Array.isArray(S.notes)) return false;
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= S.notes.length) return false;
  S.notes.splice(i, 1);
  return true;
}

// §I8. The one day the week gives back. On a Sunday the field asks a question
// instead of holding a placeholder — picked by the day rather than drawn,
// because this window repaints seven times a second and a `pick()` here would
// change the question mid-sentence *and* advance the shared RNG stream.
export function sundayPrompt(day) {
  const list = Array.isArray(SUNDAY?.prompts) ? SUNDAY.prompts : [];
  if (!list.length) return '';
  const d = Math.max(0, Math.floor(Number(day) || 0));
  return list[Math.floor(d / 7) % list.length];
}

export function render(S) {
  const list = notes(S);
  const today = Math.floor(S.time.day);
  const sunday = isSunday(today);
  const ask = sunday ? sundayPrompt(today) : '';
  return `<div class="jn ${sunday ? 'sunday' : ''}" data-ctx="journal">
    <form class="jn-today" data-jn-form novalidate>
      <div class="jn-head">
        <span class="jn-k">Today</span>
        ${sunday ? `<span class="jn-sun mono">${esc(SUNDAY.note)}</span>` : ''}
        <span class="jn-count">D${today} · ${esc(gameDateShort(today).toUpperCase())}</span>
      </div>
      ${sunday && ask ? `<div class="jn-ask">${esc(ask)}</div>` : ''}
      <textarea class="jn-field" name="note" rows="3" maxlength="${JOURNAL.NOTE_MAX}" placeholder="${esc(ask || line('journal_prompt'))}"></textarea>
      <div class="jn-foot">
        <span class="tiny dimmer">${esc(lore('journal'))}</span>
        <button type="submit" class="btn btn-primary btn-sm">Write it down</button>
      </div>
    </form>
    <div class="jn-rule"></div>
    ${list.length ? `<div class="jn-entries">
      ${list.map((n, i) => `<div class="jn-entry" data-ctx="journal-note" data-i="${i}">
        <div class="jn-stamp"><span class="jn-day">D${String(n.day).padStart(3, '0')}</span><span class="jn-date">${esc(gameDateShort(n.day).toUpperCase())}${n.act ? ` · ACT ${['', 'I', 'II', 'III', 'IV', 'V'][n.act] || n.act}` : ''}</span></div>
        <div class="jn-text">${md(n.text)}</div>
        <button class="jn-x" type="button" data-act="journal-remove" data-v="${i}" aria-label="Tear this page out" data-tip="Tear it out. There is no undo.">✕</button>
      </div>`).join('')}
    </div>` : `<div class="jn-empty">
      <span class="jn-empty-mark" aria-hidden="true">✎</span>
      <span class="jn-empty-k">NOTHING WRITTEN</span>
      <span class="jn-empty-line">${esc(line('journal'))}</span>
    </div>`}
  </div>`;
}

export function readoutFor(S) {
  const n = notes(S).length;
  if (isSunday(Math.floor(S?.time?.day || 0))) return `${SUNDAY.note} · ${n} ENTR${n === 1 ? 'Y' : 'IES'}`;
  if (!n) return 'NOTHING WRITTEN';
  const last = notes(S)[0];
  return `${n} ENTR${n === 1 ? 'Y' : 'IES'} · LAST D${last.day}`;
}

export function menuFor(S) {
  const n = notes(S).length;
  return [
    { label: 'Write something', act: 'journal-focus' },
    { label: 'Tear out the last page', act: 'journal-remove', v: '0', disabled: !n, danger: true, note: n ? undefined : 'NOTHING WRITTEN' },
  ];
}
