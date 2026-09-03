// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR — the run, on a month grid.
//
// Pure functions from `S` to a list of dated things: what happened on a day,
// and what is due. Nothing is stored. The game's year is twelve months of
// thirty days from `gameDate` in `engine/format.js`, and the week is seven
// days with day zero a Monday, so Sundays fall where a founder's mother
// expects them to. What is "due" is derived the way ARIA derives it — the
// research bench at its current rate, runway at the current burn, the macro
// regime's own countdown — and it says so: every future entry is an estimate.
// ─────────────────────────────────────────────────────────────────────────────
import { CHARACTERS } from '../data/characters.js';
import { RESEARCH_MAP } from '../data/research.js';
import { DOCTRINE_MAP } from '../data/doctrines.js';
import { ACHIEVEMENT_MAP } from '../data/achievements.js';
import { MACRO } from './market.js';
import { runwayDays } from './economy.js';
import { researchRatePerDay } from './research.js';
import { computeMods } from './modifiers.js';
import { RAMP_DAYS } from '../data/directives.js';
import { ACTS } from '../data/balance.js';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const START_YEAR = 2027;

export const monthOf = (day) => Math.floor(Math.max(0, day) / 30);
export const monthStart = (m) => m * 30;
export const weekday = (day) => ((Math.floor(day) % 7) + 7) % 7;      // 0 = Monday
export const isSunday = (day) => weekday(day) === 6;
export function monthName(m) { return `${MONTHS[((m % 12) + 12) % 12]} ${START_YEAR + Math.floor(m / 12)}`; }

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

// Everything with a date on it, past and due, between two days inclusive.
export function calendarEvents(S, from, to) {
  const out = [];
  const push = (day, kind, title, extra = {}) => {
    const d = Math.floor(num(day, -1));
    if (d < from || d > to) return;
    out.push({ day: d, kind, title: String(title), ...extra });
  };
  const today = Math.floor(S.time.day);

  push(0, 'company', 'Founded', { sub: S.company.name, color: 'var(--green)' });
  for (const [act, day] of Object.entries(S.company?.actMarks || {})) {
    push(day, 'act', `Act ${['', 'I', 'II', 'III', 'IV', 'V'][Number(act)] || act} — ${ACTS[Number(act)]?.name || ''}`, { color: 'var(--amber)' });
  }
  for (const p of S.products || []) {
    if (p.launchDay != null) push(p.launchDay, 'launch', `${p.name} launched`, { color: 'var(--cyan)' });
    // Ships, one entry per day rather than one per feature.
    const byDay = {};
    for (const f of p.features || []) { const d = Math.floor(num(f.day, -1)); if (d >= 0) byDay[d] = (byDay[d] || 0) + 1; }
    for (const [d, n] of Object.entries(byDay)) push(Number(d), 'ship', n === 1 ? 'Shipped a feature' : `Shipped ${n} features`, { color: 'var(--cyan)', quiet: true });
  }
  for (const r of S.company?.rounds || []) push(r.day, 'round', `${r.name} closed`, { color: 'var(--amber)' });
  for (const [id, d] of Object.entries(S.research?.doneDay || {})) push(d, 'research', `${RESEARCH_MAP[id]?.name || id} learned`, { color: 'var(--violet)' });
  for (const [id, d] of Object.entries(S.doctrines?.earned || {})) push(d, 'doctrine', `${DOCTRINE_MAP[id]?.name || id} earned`, { color: 'var(--green)' });
  for (const [id, d] of Object.entries(S.achievements || {})) push(d, 'award', ACHIEVEMENT_MAP[id]?.name || id, { color: 'var(--amber)', quiet: true });
  for (const j of S.narrative?.journal || []) {
    const c = j.char ? CHARACTERS[j.char] : null;
    push(j.day, j.kind === 'call' ? 'call' : 'decision', j.title, { sub: c ? c.name : j.choice, color: c?.color || 'var(--ink-3)', quiet: j.kind !== 'milestone' && !c });
  }
  for (const n of S.notes || []) push(n.day, 'note', 'You wrote something', { sub: String(n.text).slice(0, 60), color: 'var(--ink-2)', quiet: true });

  // What is due. Estimates, and labelled as such.
  if (S.research?.active) {
    const node = RESEARCH_MAP[S.research.active];
    const rate = researchRatePerDay(S, 0, computeMods(S));
    if (node && rate > 0) {
      const need = Math.max(0, node.cost * 1.75 - (S.resources.research || 0));
      push(today + Math.ceil(need / rate), 'due', `${node.name} finishes`, { sub: 'at the current rate', color: 'var(--violet)', future: true });
    }
  }
  const rw = runwayDays(S);
  if (Number.isFinite(rw) && rw < 400) push(today + Math.floor(rw), 'due', 'Runway ends', { sub: 'at the current burn', color: 'var(--red)', future: true });
  if (S.market?.macroDaysLeft > 0) push(today + Math.ceil(S.market.macroDaysLeft), 'due', `${MACRO[S.market.macro]?.name || 'The market'} regime ends`, { sub: 'the weather turns', color: 'var(--amber)', future: true });
  if (S.company?.directive && S.company.directive !== 'none') {
    const full = (S.company.directiveSince || 0) + RAMP_DAYS;
    if (full > today) push(full, 'due', 'Standing order at full strength', { color: 'var(--green)', future: true });
  }
  if (S.market?.priceSiege > 0) push(today + Math.ceil(S.market.priceSiege), 'due', 'Price war ends', { color: 'var(--red)', future: true });
  if (S.market?.channelLock > 0) push(today + Math.ceil(S.market.channelLock), 'due', 'Channel lock lifts', { color: 'var(--red)', future: true });
  // §A6. The board meeting stopped being a printed guess and became the date
  // `systems/board.js` will actually put an ask on the table. A run with a
  // board reads `nextMeeting`; a run that only ever raised a seed keeps the
  // old estimate off the last round, because a seed does buy a board observer
  // and a recurring invitation even when it does not buy a vote.
  const b = S.company?.board;
  if (b) {
    push(Math.ceil(b.nextMeeting ?? today), 'due', 'Board meeting',
      { sub: `${(b.seats || []).length || 1} seats · confidence ${Math.round((b.confidence ?? 0) * 100)}%`,
        color: 'var(--amber)', future: true });
    if (b.forcedUntil > today) {
      push(Math.ceil(b.forcedUntil), 'due', 'The board\'s standing order lifts',
        { sub: 'Harvest, until then', color: 'var(--red)', future: true });
    }
  } else {
    const lastRound = (S.company?.rounds || []).slice(-1)[0];
    if (lastRound) {
      const next = Math.floor(lastRound.day) + 90 * (Math.floor((today - lastRound.day) / 90) + 1);
      push(next, 'due', 'Board meeting', { sub: 'quarterly, since the round', color: 'var(--amber)', future: true });
    }
  }
  // §A7. The quarter, which every run has. The review is a card, and the card
  // is what the founder meets — but the date belongs on the calendar beside
  // everything else that is coming.
  const q = S.company?.quarter;
  if (q && Number.isFinite(q.start)) {
    const n = (q.intentions || []).length;
    push(Math.floor(q.start) + 90, 'due', `Quarter ${q.n || 1} closes`,
      { sub: n ? `${n} intention${n === 1 ? '' : 's'} to read back` : 'nothing written down',
        color: 'var(--cyan)', future: true });
  }
  if (S.narrative?.queue?.length) for (const q of S.narrative.queue) push(q.at, 'due', 'Something follows on', { sub: 'a thread the story owes you', color: 'var(--violet)', future: true });
  // Sundays, once there is somebody who calls on them.
  if (S.narrative?.relationships?.mom?.met) {
    for (let d = Math.max(from, 0); d <= to; d++) if (isSunday(d)) push(d, 'sunday', 'Sunday', { sub: 'She calls on a Sunday.', color: CHARACTERS.mom.color, quiet: true });
  }
  return out.sort((a, b) => a.day - b.day);
}

// The thirty cells of one month, each with what happened on it.
export function monthGrid(S, m) {
  const start = monthStart(m);
  const today = Math.floor(S.time.day);
  const events = calendarEvents(S, start, start + 29);
  const cells = [];
  for (let i = 0; i < 30; i++) {
    const day = start + i;
    cells.push({ day, dom: i + 1, weekday: weekday(day), today: day === today, future: day > today,
                 sunday: isSunday(day), events: events.filter((e) => e.day === day) });
  }
  return { m, name: monthName(m), lead: weekday(start), cells };
}

// The next thirty days, for the agenda column and the title bar.
export function upcoming(S, days = 30) {
  const today = Math.floor(S.time.day);
  return calendarEvents(S, today, today + days).filter((e) => e.future || e.day >= today).filter((e) => e.kind !== 'sunday');
}
