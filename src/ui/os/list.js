// ─────────────────────────────────────────────────────────────────────────────
// THE LIST — what the company is asking for, on this date.
//
// Three surfaces nearly share a name and none of them is the same thing. The
// Journal is what *you* wrote. The Desk's Today panel is what the last
// twenty-four hours *cost*. This is what is still being asked: the objectives,
// ARIA's note, the threads waiting on an answer, an idle bench, the person who
// has not heard from you, the quarter's intentions. All of it exists elsewhere;
// nothing in this game ever put it in one place.
//
// `render(S)` is pure — the list comes from `src/systems/todo.js`, which is a
// pure function of state — and the ticks live at `S.ui.todoDone`, keyed by the
// day, so tomorrow's list starts blank. That is deliberate: a list that
// remembered yesterday would be a chore log, and this is a morning.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from '../dom.js';
import { todo, todoProgress } from '../../systems/todo.js';
import { EMPTY, CTX } from '../../data/machine.js';
import { gameDateShort } from '../../engine/format.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

const KIND_LABEL = {
  advice: 'FIELD NOTES', wire: 'THE WIRE', mail: 'THE POST', quarter: 'THE QUARTER',
  objective: 'NEXT', research: 'R&D', tie: 'SOMEBODY',
};

export function rowsHtml(S, rows, { compact = false } = {}) {
  return rows.map((r) => `<div class="td-row ${r.done ? 'done' : ''} ${r.kind}">
    <button class="td-tick" type="button" data-act="todo-tick" data-v="${esc(r.id)}"
      role="checkbox" aria-checked="${r.done}" aria-label="${esc(r.text)}">
      <span aria-hidden="true">${r.done ? '✓' : ''}</span>
    </button>
    <span class="td-text">
      <span class="td-title">${esc(r.text)}</span>
      ${compact ? '' : `<span class="td-sub">${md(r.sub || '')}</span>`}
    </span>
    <span class="td-side">
      ${r.note ? `<span class="td-note mono">${esc(r.note)}</span>` : `<span class="td-note mono dimmer">${esc(KIND_LABEL[r.kind] || '')}</span>`}
      ${r.view ? `<button class="td-go" data-act="view" data-v="${esc(r.view)}" aria-label="Go there">→</button>` : ''}
    </span>
  </div>`).join('');
}

export function render(S) {
  const rows = safe(() => todo(S), []) || [];
  const day = Math.floor(Number(S?.time?.day) || 0);
  const p = safe(() => todoProgress(S), { done: 0, total: 0 });
  return `<div class="td" data-ctx="todo">
    <div class="td-head">
      <span class="td-k">The list</span>
      <span class="td-count mono">D${day} · ${esc(gameDateShort(day).toUpperCase())}</span>
      <span class="td-prog mono">${p.done}/${p.total}</span>
    </div>
    <div class="td-rule"></div>
    ${rows.length ? `<div class="td-rows">${rowsHtml(S, rows)}</div>` : `<div class="td-empty">
      <span class="td-empty-mark" aria-hidden="true">✓</span>
      <span class="td-empty-k">NOTHING ASKED</span>
      <span class="td-empty-line">${esc(line('todo'))}</span>
    </div>`}
    <div class="td-foot tiny dimmer">${esc(lore('todo'))}</div>
  </div>`;
}

export function readoutFor(S) {
  const p = safe(() => todoProgress(S), { done: 0, total: 0 });
  if (!p.total) return 'NOTHING ASKED';
  return `${p.done} OF ${p.total} DONE`;
}

export function menuFor(S) {
  const rows = safe(() => todo(S), []) || [];
  const left = rows.filter((r) => !r.done);
  const out = [
    { label: 'Clear today\'s ticks', act: 'todo-clear', disabled: rows.every((r) => !r.done),
      note: rows.some((r) => r.done) ? undefined : 'NOTHING TICKED' },
  ];
  if (!left.length) return out;
  out.push({ sep: true }, { head: 'STILL ASKING' });
  for (const r of left.slice(0, 6)) {
    out.push({ label: r.text, act: r.view ? 'view' : undefined, v: r.view || undefined,
      disabled: !r.view, note: r.note || undefined });
  }
  return out;
}
