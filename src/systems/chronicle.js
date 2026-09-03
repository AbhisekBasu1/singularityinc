// ─────────────────────────────────────────────────────────────────────────────
// THE CHRONICLE — the company's history as long-form prose.
//
// Pure functions from `S` to a book: one chapter per act reached, built from
// the Log in order, the rounds, the doctrines, the calls, the founder's own
// journal, and the cast; a page on the race; the numbers; the epilogues. It
// costs nothing in the save — the Record reads it fresh — and `prestige()`
// keeps the finished text on the Legacy shelf so a timeline can be read after
// it is over, including one that was lost.
//
// Every sentence that is not the game's own comes from `src/data/chronicle.js`.
// This file decides which entries make the cut and in what order; it never
// writes prose of its own.
// ─────────────────────────────────────────────────────────────────────────────
import { OPENERS, CLOSERS, ENTRY, CONNECT, PEOPLE, RACE, HEADS, LOSS, PRIYA } from '../data/chronicle.js';
import { CHARACTERS, arcLabel } from '../data/characters.js';
import { DOCTRINE_MAP } from '../data/doctrines.js';
import { ACTS } from '../data/balance.js';
import { selectEpilogues } from '../data/epilogues.js';
import { ARCHETYPE_MAP } from '../data/legacy.js';
import { totalUsers, totalMrr } from './product.js';
import { raceStandings } from './agirace.js';
import { fmt, money, gameDate, duration } from '../engine/format.js';

const pick = (list, salt) => list[salt % list.length];
const fill = (t, tok) => String(t).replace(/\{([a-z]+)\}/g, (_, k) => (tok[k] ?? ''));
const first = (s) => { const t = String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); const i = t.search(/[.!?](\s|$)/); return i < 0 ? t : t.slice(0, i + 1); };
const lower1 = (s) => { const t = String(s || '').trim(); return t ? t[0].toLowerCase() + t.slice(1).replace(/[.]$/, '') : ''; };
const PER_ACT = 7;

function actSpan(S, act) {
  const marks = S.company?.actMarks || {};
  const from = act === 1 ? 0 : Math.floor(marks[act] ?? -1);
  const nextMark = marks[act + 1];
  const to = nextMark != null ? Math.floor(nextMark) - 1 : Math.floor(S.time.day);
  return { from, to };
}

function actOfDay(S, day) {
  const marks = S.company?.actMarks || {};
  let act = 1;
  for (let a = 2; a <= 5; a++) if (marks[a] != null && day >= marks[a]) act = a;
  return act;
}

// The entries that make a chapter: milestones and faces first, then the world's
// cards, then whatever is left, kept in the order they happened.
function chapterEntries(S, act) {
  const all = (S.narrative?.journal || []).filter((e) => e && actOfDay(S, e.day) === act).slice().reverse();
  const score = (e) => (e.kind === 'milestone' ? 4 : e.char ? 3 : e.author === 'world' ? 2 : e.kind === 'call' ? 2 : 1);
  const chosen = all.map((e, i) => ({ e, i, s: score(e) })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, PER_ACT)
    .sort((a, b) => a.i - b.i).map((x) => x.e);
  return { chosen, total: all.length };
}

function entrySentence(e) {
  const c = e.char ? CHARACTERS[e.char] : null;
  const self = c && String(e.title || '').trim().toLowerCase() === c.name.toLowerCase();
  const kind = e.kind === 'call' ? 'call' : e.author === 'world' ? 'world' : self ? 'characterSelf' : (ENTRY[e.kind] ? e.kind : 'story');
  const t = pick(ENTRY[kind], Math.floor(e.day || 0));
  return fill(t.text, {
    day: String(Math.floor(e.day || 0)), title: String(e.title || '').replace(/\.$/, ''),
    choice: lower1(e.choice) || 'say nothing', outcome: first(e.outcome), who: c ? c.name : 'somebody',
  }).replace(/\s+/g, ' ').trim();
}

export function chronicle(S, ending = S.ending || null) {
  const arch = ARCHETYPE_MAP[S.founder?.archetype];
  const day = Math.floor(S.time?.day || 0);
  const tok = (act, span) => ({
    company: S.company?.name || 'the company', founder: S.founder?.name || 'the founder',
    product: S.products?.[0]?.name || S.company?.name || 'the product',
    days: String(Math.max(1, span.to - span.from + 1)), act: String(act),
    users: fmt(totalUsers(S)), mrr: money(totalMrr(S)),
  });
  const chapters = [];
  for (let act = 1; act <= Math.max(1, S.company?.act || 1); act++) {
    const span = actSpan(S, act);
    if (span.from < 0) continue;
    const paragraphs = [];
    paragraphs.push(fill(pick(OPENERS[act] || OPENERS[1], span.from).text, tok(act, span)));
    const { chosen, total } = chapterEntries(S, act);
    for (const e of chosen) paragraphs.push(entrySentence(e));
    for (const r of (S.company?.rounds || []).filter((x) => actOfDay(S, x.day) === act)) {
      paragraphs.push(fill(pick(CONNECT.round, Math.floor(r.day || 0)).text, { name: r.name, day: String(Math.floor(r.day)), amount: money(r.amount), valuation: money(r.valuation) }));
    }
    for (const [id, d] of Object.entries(S.doctrines?.earned || {})) {
      if (actOfDay(S, d) !== act) continue;
      paragraphs.push(fill(pick(CONNECT.doctrine, Math.floor(d || 0)).text, { name: DOCTRINE_MAP[id]?.name || id, day: String(Math.floor(d)) }));
    }
    const notes = (S.notes || []).filter((n) => actOfDay(S, n.day) === act).slice(0, 2);
    for (const n of notes) paragraphs.push({ quote: true, lead: fill(pick(CONNECT.note, Math.floor(n.day || 0)).text, { day: String(n.day) }), text: n.text });
    if (total === 0) paragraphs.push(pick(CONNECT.quiet, act).text);
    // The act's verdict, from how the founder decided in it.
    const tones = { good: 0, risky: 0, cruel: 0, costly: 0, neutral: 0 };
    for (const e of (S.narrative?.journal || [])) if (actOfDay(S, e.day) === act) tones[e.tone || 'neutral'] = (tones[e.tone || 'neutral'] || 0) + 1;
    const top = Object.entries(tones).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) paragraphs.push(pick(CLOSERS[top[0]], act + top[1]).text);
    chapters.push({ act, name: ACTS[act]?.name || `Act ${act}`, from: span.from, to: span.to, paragraphs });
  }

  const people = Object.entries(S.narrative?.relationships || {})
    .filter(([id, r]) => r?.met && CHARACTERS[id])
    .map(([id, r], i) => {
      const c = CHARACTERS[id];
      const kind = (r.affinity || 0) >= 8 ? 'warm' : (r.affinity || 0) <= -8 ? 'cold' : 'even';
      return { id, name: c.name, affinity: Math.round(r.affinity || 0), line: fill(pick(PEOPLE[kind], i).text, { name: c.name, arc: arcLabel(id, r.arc || 0) }) };
    }).sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity));

  let race = null;
  if (S.world?.race) {
    const c = S.world.race.crossed;
    if (c?.you) race = fill(RACE.won[0].text, { margin: String(c.margin ?? '—'), day: String(c.day) });
    else if (c) race = fill(RACE.lost[0].text, { name: c.name, day: String(c.day) });
    else if ((S.company?.act || 1) >= 4) race = RACE.none[0].text;
  }

  const numbers = [
    ['Days', fmt(day)], ['Final valuation', money(S.company?.valuation || 0)],
    ['Peak users', fmt(S.stats?.peakUsers || 0)], ['Peak MRR', money(S.stats?.peakMrr || 0)],
    ['Features shipped', fmt(S.stats?.featuresShipped || 0)], ['Research', `${S.stats?.researchDone || 0}/85`],
    ['Decisions', fmt(S.stats?.eventsResolved || 0)], ['Calls', fmt(S.stats?.callsMade || 0)],
    ['Time played', duration(S.meta?.playSeconds || 0)],
  ];

  const lost = ending && (ending.id === 'bankrupt' || ending.id === 'race_lost');
  const closing = ending
    ? [ending.name, first(typeof ending.text === 'function' ? ending.text(S) : ending.text || '')].filter(Boolean)
    : [];
  return {
    title: fill(HEADS.book, { company: S.company?.name || 'the company' }),
    subtitle: `${S.founder?.name || 'The founder'}${arch ? `, ${arch.name.toLowerCase()}` : ''} · ${gameDate(0)} — ${gameDate(day)}`,
    chapters, people, race, numbers,
    // The written epilogues, and then the world's own, last — it was written
    // after the ending was on the screen and it answers all of them. It is the
    // only thing an assistant writes that outlives the timeline.
    coda: [...selectEpilogues(S).map((e) => e.text),
           ...(S.world?.author?.epilogue?.text ? [S.world.author.epilogue.text] : [])],
    worldEpilogue: S.world?.author?.epilogue?.text || '',
    closing,
    lost: !!lost,
    lossLine: lost ? fill(pick(LOSS, day).text, { day: String(day) }) : '',
  };
}

// One chapter, as the Record files it: its paragraphs, joined for `para()`.
export function chapterText(ch) {
  return ch.paragraphs.map((p) => (typeof p === 'string' ? p : `${p.lead}\n\n> ${String(p.text).replace(/\n+/g, ' ')}`)).join('\n\n');
}

// Plain text, for the clipboard and the shelf.
export function toText(book) {
  const out = [book.title.toUpperCase(), book.subtitle, ''];
  for (const ch of book.chapters) {
    out.push(`ACT ${['', 'I', 'II', 'III', 'IV', 'V'][ch.act] || ch.act} — ${ch.name.toUpperCase()} (days ${ch.from}–${ch.to})`, '');
    for (const p of ch.paragraphs) out.push(typeof p === 'string' ? p : `${p.lead}\n> ${String(p.text).replace(/\n+/g, ' ')}`, '');
  }
  if (book.people.length) { out.push(HEADS.people.toUpperCase(), ''); for (const p of book.people) out.push(p.line); out.push(''); }
  if (book.race) out.push(HEADS.race.toUpperCase(), '', book.race, '');
  out.push(HEADS.numbers.toUpperCase(), '');
  for (const [k, v] of book.numbers) out.push(`${k.padEnd(18)} ${v}`);
  out.push('');
  if (book.closing.length) { out.push(HEADS.end.toUpperCase(), '', ...book.closing, ''); }
  if (book.lossLine) out.push(book.lossLine, '');
  if (book.coda.length) { out.push(HEADS.coda.toUpperCase(), ''); for (const c of book.coda) out.push(String(c).replace(/\*/g, ''), ''); }
  return out.join('\n').trim() + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// THE JOURNALIST'S DRAFT
//
// The same Log, read by somebody who does not work here. Three paragraphs, one
// fact and one question apiece, in Priya's register — `PRIYA` in
// `src/data/chronicle.js`, where the rule is that a line needing an adjective
// is the wrong line.
//
// Pure, like everything else in this file: rotated by the entry's own day
// rather than drawn, because `press/draft` in the Record is opened from a
// render path and a draw there would move every event roll after it.
//
// `handedOver` is the gate the Record and the post both read. She shows you a
// draft once she has handed the beat over (`priya_handed_off`) or once the
// relationship is far enough along that she would — arc 3 is the piece where
// she stops asking for comment and starts asking you to check her.
// ─────────────────────────────────────────────────────────────────────────────

export function priyaHandedOver(S) {
  if (S?.narrative?.flags?.priya_handed_off) return true;
  return (S?.narrative?.relationships?.priya?.arc || 0) >= 3;
}

/** The three entries she is working from: the most recent things with weight. */
function draftEntries(S) {
  const all = (S?.narrative?.journal || []).filter(Boolean);
  const score = (e) => (e.kind === 'milestone' ? 4 : e.char ? 3 : e.kind === 'crisis' ? 3 : 1);
  return all.map((e, i) => ({ e, i, s: score(e) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, 3)
    .sort((a, b) => (a.e.day || 0) - (b.e.day || 0))
    .map((x) => x.e);
}

export function priyaDraft(S) {
  if (!S) return null;
  const day = Math.floor(S.time?.day || 0);
  const entries = draftEntries(S);
  const base = {
    company: S.company?.name || 'the company', founder: S.founder?.name || 'the founder',
    product: S.products?.[0]?.name || S.company?.name || 'the product',
    users: fmt(totalUsers(S)), mrr: money(totalMrr(S)),
    days: String(Math.max(1, day)), n: String((S.narrative?.journal || []).length),
  };
  const paragraphs = [fill(pick(PRIYA.lead, day).text, base)];
  for (const e of entries) {
    const c = e.char ? CHARACTERS[e.char] : null;
    const kind = PRIYA.fact[e.kind] ? e.kind : (e.char ? 'character' : 'story');
    const salt = Math.floor(e.day || 0);
    const tok = {
      ...base, day: String(salt), title: String(e.title || '').replace(/\.$/, ''),
      choice: lower1(e.choice) || 'say nothing', outcome: first(e.outcome),
      who: c ? c.name : 'somebody',
    };
    // One fact. One question. Never the other way round, and never both from
    // the same rung of the pool — the salt is offset so a paragraph does not
    // ask the question its own fact just answered.
    const factLine = fill(pick(PRIYA.fact[kind], salt).text, tok);
    const askLine = fill(pick(PRIYA.question[kind], salt + 1).text, tok);
    paragraphs.push(`${factLine} ${askLine}`.replace(/\s+/g, ' ').trim());
  }
  paragraphs.push(fill(pick(PRIYA.close, day).text, base));
  return {
    title: fill(PRIYA.head, base),
    byline: CHARACTERS.priya?.name || 'The Ledger',
    day,
    entries: entries.length,
    paragraphs,
    text: paragraphs.join('\n\n'),
  };
}
