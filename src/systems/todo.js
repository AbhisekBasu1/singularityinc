// ─────────────────────────────────────────────────────────────────────────────
// TODAY — the founder's own list, generated every morning and thrown away
// every night.
//
// Everything on it already exists somewhere in the game: an objective, ARIA's
// note, a thread waiting on an answer, an empty research bench, somebody who
// has not heard from you in a month, the quarter's own intentions. What did not
// exist was one place that said *what to do today*, in the order it matters —
// so a founder who opened the machine after two days away had six screens to
// visit before they knew where they were.
//
// Three rules.
//
//   · **It is generated, never stored.** Like the Record and the chronicle:
//     a pure function of `S`, so it cannot go stale and costs the save nothing.
//   · **Ticking is for today only.** `S.ui.todoDone` is `{ day, ids }` and the
//     day is checked on read. A list that remembered yesterday's ticks would be
//     a chore log, which is the one thing this must not become.
//   · **It never invents a task.** Every row points at something the game
//     already wants, with the view that answers it — so a row is a door, not a
//     reminder.
// ─────────────────────────────────────────────────────────────────────────────
import { activeObjectives } from './objectives.js';
import { currentAdvice } from '../data/advice.js';
import { openThreadCount } from './feed.js';
import { unread as unreadMail } from './mail.js';
import { ties } from './life.js';
import { quarterReading } from './board.js';
import { fmt } from '../engine/format.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

/**
 * Today's ticks. Reading it prunes nothing — a render path may not write — so
 * the day is compared here and a stale set simply reads as empty.
 */
export function doneToday(S) {
  const d = Math.floor(num(S?.time?.day));
  const t = S?.ui?.todoDone;
  return t && t.day === d && t.ids ? t.ids : {};
}

/** Tick or untick a row. The only writer, and it re-keys the set on a new day. */
export function toggleTodo(S, id) {
  if (!S || !id) return false;
  const d = Math.floor(num(S.time?.day));
  S.ui ??= {};
  if (!S.ui.todoDone || S.ui.todoDone.day !== d) S.ui.todoDone = { day: d, ids: {} };
  const ids = S.ui.todoDone.ids;
  if (ids[id]) delete ids[id]; else ids[id] = 1;
  return !!ids[id];
}

// Each source contributes rows in its own voice. `view` is the module that
// answers the row; `note` is the mono uppercase chrome every blocked or
// countable thing in this game carries.
function fromObjectives(S) {
  return (safe(() => activeObjectives(S), []) || []).map((o) => ({
    id: `obj:${o.id}`, kind: 'objective', text: o.title, note: o.optional ? 'OPTIONAL' : '',
    sub: o.hint || '', view: o.view || null,
  }));
}

function fromAdvice(S) {
  const a = safe(() => currentAdvice(S), null);
  if (!a) return [];
  return [{ id: `advice:${a.id || a.title}`, kind: 'advice', text: a.title,
    note: a.tone === 'red' ? 'URGENT' : '', sub: String(a.text || '').replace(/\*\*/g, ''),
    view: a.view || null }];
}

function fromWire(S) {
  const out = [];
  const open = safe(() => openThreadCount(S), 0);
  if (open) {
    out.push({ id: 'wire:threads', kind: 'wire', text: `Answer ${open} thread${open === 1 ? '' : 's'} in the Wire`,
      note: `${open} OPEN`, sub: 'They resolve themselves if you leave them.', view: 'wire' });
  }
  const post = (safe(() => unreadMail(S), []) || []).length;
  if (post) {
    out.push({ id: 'wire:mail', kind: 'mail', text: `Read ${post} letter${post === 1 ? '' : 's'}`,
      note: `${post} UNREAD`, sub: '', view: 'mail' });
  }
  return out;
}

function fromResearch(S) {
  if (S?.research?.active) return [];
  const banked = num(S?.resources?.research);
  return [{ id: 'research:idle', kind: 'research', text: 'Put the research bench on something',
    note: 'IDLE', sub: banked > 0 ? `${fmt(banked)} points with nowhere to go.` : 'Nothing is being researched.',
    view: 'research' }];
}

function fromTies(S) {
  const rows = safe(() => ties(S), []) || [];
  // The coldest one only. A list that names six people nobody has called is a
  // chore meter, which is the thing `life.js` exists not to be.
  const cold = rows.filter((t) => t.cold || t.since == null)
    .sort((a, b) => (a.warmth ?? 0) - (b.warmth ?? 0))[0];
  if (!cold) return [];
  const since = cold.since == null ? null : cold.since;
  return [{ id: `tie:${cold.id}`, kind: 'tie', text: `Call ${cold.name}`,
    note: since == null ? 'NEVER' : `${since}D`,
    sub: cold.line || '', view: 'contacts' }];
}

// §A7's quarter, when the run has one. `quarterReading` is the same pure
// function the review card reads back, so a row here and the card ninety days
// later are the same sentence — and only the intentions not yet kept appear,
// because a plan that is already met is not a thing to do today.
function fromQuarter(S) {
  const r = safe(() => quarterReading(S), null);
  const rows = Array.isArray(r?.rows) ? r.rows : [];
  return rows.filter((x) => x && !x.kept).slice(0, 2).map((x) => ({
    id: `quarter:${x.id}`, kind: 'quarter', text: String(x.name || 'An intention for the quarter'),
    note: `Q${r.n || 1}`, sub: String(x.line || ''), view: 'desk',
  }));
}

const ORDER = ['advice', 'wire', 'quarter', 'objective', 'research', 'mail', 'tie'];

/**
 * The list. Pure, in priority order, capped so it stays a list rather than a
 * backlog — and each row carrying whether it has been ticked today.
 */
export function todo(S, { max = 7 } = {}) {
  if (!S) return [];
  const done = doneToday(S);
  const rows = [
    ...fromAdvice(S), ...fromWire(S), ...fromQuarter(S),
    ...fromObjectives(S), ...fromResearch(S), ...fromTies(S),
  ];
  rows.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ ...r, done: !!done[r.id] });
    if (out.length >= max) break;
  }
  return out;
}

/** How many of today's rows are ticked, for a readout. */
export function todoProgress(S) {
  const rows = todo(S);
  return { done: rows.filter((r) => r.done).length, total: rows.length };
}
