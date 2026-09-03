// ─────────────────────────────────────────────────────────────────────────────
// MAIL — the inbox, delivered through the Wire.
//
// A letter is a Wire item of type `mail`. That is the whole trick: the console
// shows it in the rail, the workstation reads it in the Mail app, the Record
// files it under press, Find finds it, and a letter that asks something is a
// thread the existing machinery already knows how to answer. Nothing here is a
// second feed. `S.mail` remembers what has been delivered and what has been
// opened; the letters themselves live in `src/data/mail.js`, and the world may
// write one too — `postAs` with `channel: 'mail'`.
// ─────────────────────────────────────────────────────────────────────────────
import { LETTERS, LETTER_MAP } from '../data/mail.js';
import { CHARACTERS } from '../data/characters.js';
import { MAIL } from '../data/balance.js';
import { pushFeed, registerThreadSource, openMailCount } from './feed.js';
import { markDirty } from './modifiers.js';
import { emit, on } from '../engine/bus.js';

export function mailState(S) {
  if (!S.mail) S.mail = { delivered: {}, read: {}, count: {}, queued: [] };
  S.mail.delivered ??= {}; S.mail.read ??= {};
  // A recurring correspondent needs a count, and a promised reply needs a date.
  S.mail.count ??= {}; S.mail.queued ??= [];
  return S.mail;
}

const dayOf = (S) => Math.floor(S.time.day);
function safeWhen(l, S) { try { return !!l.when(S); } catch { return false; } }
function safeBody(l, S, n = 0) { try { return String(l.body(S, n) ?? ''); } catch { return ''; } }
function subjectOf(l, S, n = 0) {
  if (typeof l.subject !== 'function') return l.subject;
  try { return String(l.subject(S, n) ?? ''); } catch { return ''; }
}
// A sender the run names rather than the author: the agent currently on ops,
// an address at your own domain. `from.name` and `from.role` may be functions
// of S for exactly that, and for nothing else — a person keeps their name.
function fieldOf(v, S, dflt = '') {
  if (typeof v !== 'function') return v ?? dflt;
  try { return String(v(S) ?? dflt); } catch { return dflt; }
}

// ── Recurrence ──────────────────────────────────────────────────────────────
// `repeat: { every, max, jitter }` is the bank each month, Sam each week, the
// registry each year. A real inbox is mostly recurrence, and the version of
// this game without it had a correspondent write to you exactly once in eleven
// hundred days. The count is what `body(S, n)` receives, so the fourth letter
// can be written as the fourth rather than as the first said again.
//
// The wobble is derived from the id and the count, never drawn: `tickMail`
// runs inside the day hook, and one draw here moves every event and market
// roll after it for the rest of the run.
function wobble(id, n, span) {
  if (!span) return 0;
  const s = `${id}#${n}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % (span * 2 + 1)) - span;
}

export function timesDelivered(S, id) { return mailState(S).count[id] || 0; }

function repeatDue(S, l, m) {
  const r = l.repeat;
  const n = m.count[l.id] || 0;
  if (n >= (r.max ?? 12)) return false;
  const last = m.delivered[l.id];
  if (last == null) return true;
  return dayOf(S) - last >= (r.every || 30) + wobble(l.id, n, r.jitter || 0);
}

// Away, a recurring letter lands once for the whole absence. A month away in
// the long game is thirty ticks of the day hook, and a bank statement per tick
// is thirty statements waiting on one morning.
function spentWhileAway(S, l) { return !!(S._offline && S._mailAway?.[l.id]); }

function eligible(S, l, m) {
  if (l.repeat) return !spentWhileAway(S, l) && safeWhen(l, S) && repeatDue(S, l, m);
  return m.delivered[l.id] == null && safeWhen(l, S);
}

// A reply that was promised. `replyTo` on a chosen answer puts a letter on the
// queue with the day it is owed; it arrives through the ordinary path, whether
// or not its own `when` would ever have held — which is why a follow-up is
// written with `when: () => false` and reaches the inbox no other way.
function dueQueued(S, m) {
  const d = dayOf(S);
  // Prune first: an id from an older build, and a letter that arrived some
  // other way, would sit on the queue for the rest of the run otherwise.
  m.queued = m.queued.filter((q) => {
    const l = q && LETTER_MAP[q.id];
    return !!l && (l.repeat || m.delivered[l.id] == null);
  });
  const q = m.queued.find((x) => x.day <= d);
  return q ? LETTER_MAP[q.id] : null;
}

export function queueLetter(S, id, days = 3) {
  const m = mailState(S);
  if (!LETTER_MAP[id] || m.queued.some((q) => q.id === id)) return false;
  m.queued.push({ id, day: dayOf(S) + Math.max(1, Math.round(days)) });
  return true;
}

// Quiet post gets a gap. Once the recurring correspondents exist there is
// almost always a receipt or a statement due, and without this the founder
// receives something every single morning for a thousand days — which is not
// an inbox, it is a drip. A statement that misses today arrives tomorrow; its
// own schedule runs from the day it lands, so nothing drifts.
const QUIET_GAP = 3;
function quietRecently(S, m) {
  let last = -99;
  for (const [id, d] of Object.entries(m.delivered)) {
    if (LETTER_MAP[id]?.quiet && d > last) last = d;
  }
  return dayOf(S) - last < QUIET_GAP;
}

// How many letters are still asking something. `maybeThread` has always capped
// open Wire threads at three and mail had no cap at all — nine open at day 140,
// twelve at 456 — so a letter that asks waits for a slot the way a thread does.
// A letter that asks nothing is never held: reading is not a decision.
export function inboxFull(S) { return openMailCount(S) >= MAIL.OPEN_CAP; }

// One letter a day at most: an inbox that fills three deep on a single morning
// reads as spam, and every one of these was written to be read.
export function tickMail(S) {
  const m = mailState(S);
  if (!S._offline && S._mailAway) delete S._mailAway;
  const full = inboxFull(S);
  const due = LETTERS.filter((l) => eligible(S, l, m) && !(full && l.ask?.length));
  // A letter about this week's outage goes ahead of one about the conference:
  // `urgent` marks the ones whose moment passes. Then what somebody was
  // promised, then what somebody wrote. A receipt goes behind all of it:
  // `quiet` marks the post that is only post.
  const promised0 = dueQueued(S, m);
  const promised = promised0 && !(full && promised0.ask?.length) ? promised0 : null;
  const pick = due.find((l) => l.urgent) || promised || due.find((l) => !l.quiet)
    || (quietRecently(S, m) ? null : due[0]);
  if (!pick) return null;
  if (pick === promised) m.queued = m.queued.filter((q) => q.id !== pick.id);
  return deliver(S, pick);
}

export function deliver(S, l, { byWorld = false } = {}) {
  const m = mailState(S);
  const n = m.count[l.id] || 0;
  const body = safeBody(l, S, n);
  if (!body) return null;
  const subject = subjectOf(l, S, n);
  const c = l.from?.char ? CHARACTERS[l.from.char] : null;
  const name = fieldOf(l.from?.name, S) || c?.name || 'Unknown sender';
  const role = fieldOf(l.from?.role, S) || c?.role || '';
  const item = pushFeed(S, {
    type: 'mail',
    author: name,
    text: body,
    tone: 'neutral',
    meta: subject,
    mail: { id: l.id, subject, from: name, role,
            char: l.from?.char || null, ...(l.quiet ? { quiet: true } : {}) },
    ...(byWorld ? { byWorld: true } : {}),
    ...(l.ask?.length ? { thread: l.id, resolved: false, expires: S.time.day + MAIL.LIFE_DAYS } : {}),
  });
  m.delivered[l.id] = dayOf(S);
  m.count[l.id] = n + 1;
  if (S._offline && l.repeat) (S._mailAway ??= {})[l.id] = true;
  // News a card may need to know arrived. The letter is where the founder
  // learns it, so the letter is what records it.
  if (l.flag && S.narrative?.flags) S.narrative.flags[l.flag] = true;
  // Filed, not announced: a quiet letter arrives already read, so it neither
  // badges the dock nor chimes. It is still in the inbox, and the Record.
  if (l.quiet) m.read[item.id] = true;
  markDirty();
  emit('mail', item);
  return item;
}

// Every letter in the feed, newest first. The Mail app is a view of this.
export function inbox(S) {
  return (S.feed || []).filter((f) => f.type === 'mail');
}

export function unread(S) {
  const m = mailState(S);
  return inbox(S).filter((f) => !m.read[f.id]);
}

export function markRead(S, feedId) {
  const m = mailState(S);
  if (m.read[feedId]) return false;
  m.read[feedId] = true;
  markDirty();
  return true;
}

export function markAllRead(S) {
  const m = mailState(S);
  let n = 0;
  for (const f of inbox(S)) if (!m.read[f.id]) { m.read[f.id] = true; n++; }
  if (n) markDirty();
  return n;
}

// A letter that asks answers through the Wire's own thread machinery, with
// the authored effects the way `threads.js` carries them.
registerThreadSource((id) => {
  const l = LETTER_MAP[id];
  return l?.ask?.length ? { opts: l.ask } : null;
});

// A correspondence, rather than a letter. `replyTo: { id, days }` on an answer
// puts the other person's reply on the queue: Crane answers the update you
// actually sent, the customer you credited writes back, the bank replies to a
// reply. It hangs off `thread:resolved` because that is the one event every
// housing's reply button goes through — the rail, the Mail app and the Record
// all dispatch the same delegated action.
on('thread:resolved', ({ S, item, opt }) => {
  if (!S || item?.type !== 'mail' || !opt?.replyTo) return;
  queueLetter(S, opt.replyTo.id, opt.replyTo.days ?? 3);
});
