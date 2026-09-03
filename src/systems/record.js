// ─────────────────────────────────────────────────────────────────────────────
// RECORD — the company's history, presented as a filesystem.
//
// Nothing here is stored. Every folder is a view onto state the run was already
// keeping, read a different way, so the Record costs one pass over small arrays
// and can never drift from the game. It is pure: no writes, no module-level
// cache keyed on state identity, nothing that would survive `forecast` swapping
// the singleton out from under it and putting a different one back.
//
// Four rules hold it together.
//
//  1. **The prose is never written here.** A file's body comes from content
//     that already exists — a research node's `desc` and `flavor`, a journal
//     entry's `outcome`, an agent's `memory[]`, a feed item's `text`, a
//     doctrine's `flavour`, a character's `bio` — and from `src/data/machine.js`,
//     which owns every line the machine says in its own voice. The only strings
//     declared in this file are the mono uppercase field keys in `K`, which are
//     column headers, not copy.
//  2. **The record admits what it cannot know.** The Wire is a hard 160-item
//     rolling window and everything older is destroyed, not archived.
//     `S.world.projectsBuilt` is a tally that has never carried a date, and a
//     save made before `S.research.doneDay` existed has no completion days in
//     it. Those files get `day: null` and a meta row that says `NOT RECORDED`
//     rather than a day the machine invented.
//  3. **`summary()` reads lengths and key counts and nothing else.** It feeds
//     the window's title-bar readout, which runs seven times a second: no entry
//     is built, no body composed, no array sorted, no history walked.
//  4. **`FOLDERS` owns the directory.** Order, names, blurbs, empty lines and
//     the act gate all come from `machine.js`. A path this file has no reader
//     for still lists, at zero, and a reader this file has that `FOLDERS` does
//     not name simply stays dark — so the two files can be edited apart.
// ─────────────────────────────────────────────────────────────────────────────
import { FOLDERS, DEPARTURES, CTX, EMPTY } from '../data/machine.js';
import { RESEARCH_MAP, BRANCHES } from '../data/research.js';
import { ACHIEVEMENT_MAP } from '../data/achievements.js';
import { DOCTRINE_MAP } from '../data/doctrines.js';
import { OBJECTIVE_MAP } from '../data/objectives.js';
import { PROJECT_MAP } from '../data/projects.js';
import { REGION_MAP, STAGES, STAGE_INDEX } from '../data/regions.js';
import { CHARACTERS } from '../data/characters.js';
import { SELF_DOC, FIRST_LINE } from '../data/arialines.js';
import { firstLine } from '../data/motifs.js';
import { LAB_MAP, RACE_BEATS } from '../data/agirace.js';
import { ENDINGS } from '../data/endings.js';
import { ACTS } from '../data/balance.js';
import { MOVE_MAP } from '../data/nemesis.js';
import { EVENT_MAP } from '../data/events.js';
import { CATEGORY_MAP, FEATURE_KINDS } from '../data/products.js';
import { MODELS, SPECIALTIES, TRAITS, LANES, TOOL_MAP } from '../data/agents.js';
import { COMMITMENTS } from '../data/commitments.js';
import { fmt, money, pct, signed, gameDateShort, titleCase } from '../engine/format.js';
import { chronicle, chapterText, toText, priyaDraft, priyaHandedOver } from './chronicle.js';
import { channelDay, channelDays } from './channel.js';

// ── Field keys ──────────────────────────────────────────────────────────────
// Mono uppercase labels for meta rows, in the machine's register: a column
// header, never a sentence. `NOT RECORDED` and `LAST 160` are the same thing —
// the machine stating a limit in chrome rather than a narrator explaining one.
const K = {
  day: 'DAY', date: 'DATE', act: 'ACT', kind: 'KIND', type: 'TYPE', status: 'STATUS',
  who: 'WHO', role: 'ROLE', handle: 'HANDLE', author: 'AUTHOR', source: 'SOURCE',
  choice: 'CHOICE', tone: 'TONE', written: 'WRITTEN BY',
  branch: 'BRANCH', tier: 'TIER', cost: 'COST', unlocks: 'UNLOCKS', requires: 'REQUIRES',
  model: 'MODEL', spec: 'SPECIALTY', lane: 'LANE', level: 'LEVEL', morale: 'MORALE',
  autonomy: 'AUTONOMY', hired: 'HIRED', traits: 'TRAITS', tools: 'TOOLS',
  reason: 'REASON', served: 'SERVED', memories: 'MEMORIES',
  product: 'PRODUCT', category: 'CATEGORY', fit: 'FIT', quality: 'QUALITY',
  appeal: 'APPEAL', polish: 'POLISH', reliability: 'RELIABILITY',
  amount: 'AMOUNT', valuation: 'VALUATION', dilution: 'DILUTION', price: 'PRICE',
  users: 'USERS', mrr: 'MRR', founder: 'FOUNDER', threat: 'THREAT', grudge: 'GRUDGE',
  stance: 'STANCE', stage: 'STAGE', invested: 'INVESTED', share: 'WORLD SHARE',
  built: 'BUILT', days: 'DAYS', effect: 'EFFECT',
  progress: 'PROGRESS', safety: 'SAFETY', crossed: 'CROSSED', threshold: 'THRESHOLD',
  push: 'COMMITMENT',
  arc: 'ARC', affinity: 'AFFINITY', respect: 'RESPECT', fear: 'FEAR',
  rare: 'RARE', hold: 'HOLD DAYS', ending: 'ENDING', reward: 'REWARD',
  points: 'POINTS', comments: 'COMMENTS', thread: 'THREAD', answer: 'ANSWER',
  icon: 'ICON', name: 'NAME', file: 'FILE', meta: 'META', body: 'BODY',
  words: 'WORDS', sections: 'SECTIONS', lines: 'LINES',
  none: 'NOT RECORDED', retained: 'RETAINED', window: 'LAST 160',
  world: 'WORLD', mine: 'YOURS', gone: 'GONE', open: 'OPEN', answered: 'ANSWERED',
  reached: 'REACHED', kept: 'KEPT', board: 'BOARD',
};

// Who put the card in the deck. Three hands write into it beside the written
// one — the world layer, a card the founder kept from an earlier timeline, and
// a motion carried in the boardroom — and the entry says which, or says
// nothing at all for the deck's own. One table, because the Log and the Record
// disagreeing about who wrote a card is the kind of thing nobody notices for a
// run and then cannot unsee.
const AUTHORS = { world: K.world, kept: K.kept, board: K.board };
const wrote = (author) => AUTHORS[author] || '';

// ── Small helpers ───────────────────────────────────────────────────────────
const str = (v) => (v == null ? '' : String(v));
const line = (v) => (typeof v === 'string' ? v : '');
const ctx = (key) => line(CTX?.[key]);
const empty = (key) => line(EMPTY?.[key]);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const one = (v) => num(v).toFixed(1);
const two = (v) => num(v).toFixed(2);

function slug(s, max = 24) {
  const t = str(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  return t.slice(0, max) || 'untitled';
}

// A filename reads as machine output: a day stamp, a jammed lowercase name, and
// an extension that says what kind of thing this is. No day stamp when the run
// never recorded one — the missing stamp is the point, not an oversight. A day
// that is present but not a number is the same case as a day that is absent:
// `dNaN_` is the machine leaking, and there is nothing to stamp.
// `Number(null)` is 0 and `Number('')` is 0, so a missing day would coerce to
// day zero and stamp `d0_` on a file the run never dated. Only a number, or a
// string that is one, is a day.
function dated(day) {
  if (typeof day !== 'number' && typeof day !== 'string') return null;
  if (day === '') return null;
  const n = Number(day);
  return Number.isFinite(n) ? Math.floor(n) : null;
}
function fname(day, name, ext) {
  const s = slug(name);
  const d = dated(day);
  return d == null ? `${s}.${ext}` : `d${d}_${s}.${ext}`;
}

const dayRow = (day) => [K.day, dated(day) == null ? K.none : String(dated(day))];
const dateRow = (day) => (dated(day) == null ? null : [K.date, gameDateShort(dated(day))]);
const rows = (...r) => r.filter((x) => Array.isArray(x) && x[1] !== '' && x[1] != null);
const para = (...p) => p.filter((x) => typeof x === 'string' && x.trim()).join('\n\n');
const dot = (...p) => p.filter((x) => typeof x === 'string' && x).join(' · ');

/** Which act a day fell in, read from the marks the run already keeps. */
export function actAt(S, day) {
  if (day == null) return null;
  const marks = S?.company?.actMarks || {};
  let act = 1;
  for (const k of Object.keys(marks)) {
    const at = marks[k];
    if (Number.isFinite(at) && day >= at) act = Math.max(act, Number(k) || 1);
  }
  return act;
}

// A node's `unlock` is an id in one of four namespaces — an agent tool, a
// model, a specialty, or a bare feature gate the game opens. The Record prints
// prose, so the id is resolved to the name that already exists for it; a bare
// gate has no authored name anywhere, and its own words unjammed are closer to
// one than `own_foundation_model` is.
function unlockName(id) {
  const s = str(id);
  if (!s) return '';
  if (s.startsWith('tool_')) return TOOL_MAP[s.slice(5)]?.name || titleCase(s.slice(5));
  if (s.startsWith('model_')) return MODELS[s.slice(6)]?.name || titleCase(s.slice(6));
  if (s.startsWith('spec_')) return SPECIALTIES[s.slice(5)]?.name || titleCase(s.slice(5));
  if (s.startsWith('ending_')) return titleCase(s.slice(7).replace(/_/g, ' '));
  return RESEARCH_MAP[s]?.name || titleCase(s.replace(/_/g, ' '));
}

const traitOf = (id) => TRAITS.find((t) => t.id === id) || null;
const kindOf = (id) => FEATURE_KINDS.find((k) => k.id === id) || null;
const stageOf = (id) => STAGES[STAGE_INDEX[id] ?? 0] || STAGES[0];
// An effect log holds whole numbers and fractions in the same array — a cash
// swing beside a −0.035 knock to appeal. `fmt` rounds the small ones to zero
// and `signed` then prints them as `−0.0`, which reads as nothing happening.
// A true zero keeps no sign at all: `+0` reads as a change and is not one.
function delta(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return str(v);
  if (v === 0) return '0';
  if (Math.abs(v) < 1) return signed(v, (n) => n.toFixed(Math.abs(v) < 0.1 ? 3 : 2));
  return signed(v, fmt);
}
const fxRows = (list) => (list || []).map(([k, v]) => [String(k).toUpperCase(), delta(v)]);

/** Endings by id, flattened once at load. Data, never state. */
const ENDING_MAP = Object.fromEntries((ENDINGS || []).map((e) => [e.id, e]));

/** Every commitment definition, flattened once at load. Data, never state. */
const COMMITMENT_MAP = (() => {
  const m = {};
  for (const list of Object.values(COMMITMENTS || {})) for (const c of list || []) m[c.id] = c;
  return m;
})();

// ─────────────────────────────────────────────────────────────────────────────
// THE READERS — one per path in `FOLDERS`.
//
// `count` is O(1)-ish and feeds both `folders` and `summary`. `entries` builds
// the listing, newest first, and touches no prose. `meta` and `body` are only
// ever called for a file somebody opened, or once per candidate by `search`.
// ─────────────────────────────────────────────────────────────────────────────
const R = {};

// ── repo — every feature ever shipped. Append-only: nothing is lost here.
R.repo = {
  count: (S) => (S.products || []).reduce((n, p) => n + (p.features?.length || 0), 0),
  entries(S) {
    const out = [];
    for (const p of S.products || []) {
      for (const f of p.features || []) {
        const k = kindOf(f.kind);
        out.push({
          id: `${p.id}:${f.id}`, day: Math.floor(num(f.day)), kind: 'feature',
          name: fname(f.day, f.name, 'diff'), title: str(f.name),
          meta: dot(str(k?.name).toUpperCase(), `${K.fit} ${two(f.fit)}`),
          src: { p, f, k },
        });
      }
    }
    // `f.day` is fractional and four features can land on one floored day.
    // Sorting on the stamp alone then broke the tie lexicographically, which
    // put `f9` above `f10` — the two newest of a morning, in the wrong order.
    return out.sort((a, b) => num(b.src.f.day) - num(a.src.f.day));
  },
  meta(S, e) {
    const { p, f, k } = e.src;
    const milli = (v) => delta(Math.round(num(v) * 1000));
    return rows(
      dayRow(f.day), dateRow(f.day), [K.act, str(actAt(S, f.day))],
      [K.name, str(f.name)],
      [K.kind, k?.name || str(f.kind)],
      [K.product, str(p.name)],
      [K.category, CATEGORY_MAP[p.category]?.name || str(p.category)],
      [K.fit, two(f.fit)],
      [K.quality, milli(f.q)], [K.appeal, milli(f.a)],
      [K.polish, milli(f.p)], [K.reliability, milli(f.r)],
    );
  },
  // A shipped feature left numbers behind and no prose. The lore line is the
  // only sentence in the file, and `machine.js` owns it.
  body: () => ctx('feature'),
};

// ── notes — the decision record, and the act each decision fell inside.
R.notes = {
  count: (S) => (S.narrative?.journal?.length || 0)
    + Object.keys(S.company?.actMarks || {}).length,
  entries(S) {
    const out = [];
    const seen = new Set();
    for (const j of S.narrative?.journal || []) {
      const d = Math.floor(num(j.day));
      let id = `${j.id}@${d}`;
      let n = 2;
      while (seen.has(id)) id = `${j.id}@${d}#${n++}`;
      seen.add(id);
      out.push({
        id, day: d, kind: 'decision',
        name: fname(j.day, j.title, 'md'), title: str(j.title),
        meta: dot(str(j.kind).toUpperCase(), wrote(j.author),
          str(j.tone).toUpperCase()),
        src: { j },
      });
    }
    for (const [act, day] of Object.entries(S.company?.actMarks || {})) {
      out.push({
        id: `act:${act}`, day: Math.floor(num(day)), kind: 'act',
        name: fname(day, 'act' + act, 'mark'), title: `${K.act} ${act}`,
        meta: `${K.act} ${act}`, src: { act: Number(act) || 1 },
      });
    }
    return out.sort((a, b) => b.day - a.day);
  },
  meta(S, e) {
    if (e.kind === 'act') return rows(dayRow(e.day), dateRow(e.day), [K.act, String(e.src.act)]);
    const j = e.src.j;
    const ch = j.char ? CHARACTERS[j.char] : null;
    return rows(
      dayRow(j.day), dateRow(j.day), [K.act, str(actAt(S, j.day))],
      [K.kind, str(j.kind)],
      [K.choice, str(j.choice)],
      [K.tone, str(j.tone)],
      [K.who, ch ? dot(ch.name, ch.role) : ''],
      [K.written, wrote(j.author)],
      ...fxRows(j.effects),
    );
  },
  body(S, e) {
    if (e.kind === 'act') return ctx('journal');
    const j = e.src.j;
    const ev = EVENT_MAP[j.id];
    // `sub` is a static string on most cards and a function on the ones that
    // need state. Only the static form is history; a function would be run now
    // against a state the decision never saw.
    // A card answered in the founder's own words keeps them on the entry, and
    // they are the only prose in the run the founder wrote. The Record is the
    // one place that survives the modal closing.
    const words = line(j.founderWords);
    return para(typeof ev?.sub === 'string' ? ev.sub : '',
      words ? `> ${words.replace(/\n+/g, ' ')}` : '', line(j.outcome));
  },
};

// ── agents — the roster: who works here, and what each one remembers.
R.agents = {
  count: (S) => S.agents?.length || 0,
  entries(S) {
    return (S.agents || []).map((a) => ({
      id: str(a.id), day: Math.floor(num(a.hiredDay)), kind: 'agent',
      name: fname(a.hiredDay, a.name, 'agent'), title: str(a.name),
      meta: dot(str(MODELS[a.model]?.name).toUpperCase(), str(LANES[a.lane]?.name).toUpperCase()),
      src: { a },
    })).sort((a, b) => b.day - a.day);
  },
  meta(S, e) {
    const a = e.src.a;
    return rows(
      [K.hired, String(Math.floor(num(a.hiredDay)))], dateRow(a.hiredDay),
      [K.served, String(Math.max(0, Math.floor(num(S.time?.day) - num(a.hiredDay))))],
      [K.model, MODELS[a.model]?.name || str(a.model)],
      [K.spec, SPECIALTIES[a.spec]?.name || str(a.spec)],
      [K.lane, LANES[a.lane]?.name || str(a.lane)],
      [K.level, String(num(a.level, 1))],
      [K.morale, pct(num(a.morale))],
      [K.autonomy, pct(num(a.autonomy))],
      [K.status, str(a.status)],
      [K.traits, (a.traits || []).map((t) => traitOf(t)?.name || t).join(' · ')],
      [K.tools, (a.tools || []).length ? String(a.tools.length) : ''],
      [K.memories, String((a.memory || []).length)],
    );
  },
  body(S, e) {
    const a = e.src.a;
    const traits = (a.traits || []).map(traitOf).filter(Boolean)
      .map((t) => `- ${t.icon} **${t.name}** — ${t.desc}`).join('\n');
    // `remember()` unshift-caps memory at six. What it holds is all it holds.
    const mem = (a.memory || [])
      .map((m) => `> ${line(m.text)}\n> ${K.day} ${dated(m.day) ?? K.none}`).join('\n\n');
    return para(line(MODELS[a.model]?.desc), line(SPECIALTIES[a.spec]?.desc), traits,
      mem, mem ? ctx('agent.memory') : ctx('agent'));
  },
};

// ── agents/archive — everyone who left, with the reason recorded at the time.
// `fireAgent` splices the agent out of the roster, so the reason only survives
// if the run kept a departure ledger. Where it did not, this folder is empty
// and says so; it never reconstructs a departure it cannot see.
R['agents/archive'] = {
  count: (S) => S.agentsLeft?.length || 0,
  entries(S) {
    return (S.agentsLeft || []).map((d, i) => ({
      // Keyed on the agent's own id, not its slot: the ledger is capped, and a
      // position-based id would move a selected file out from under the pane.
      id: `left:${str(d.id) || 'x' + i}@${Math.floor(num(d.day))}`,
      day: Math.floor(num(d.day)), kind: 'departure',
      name: fname(d.day, d.name, 'left'), title: str(d.name),
      meta: dot(str(MODELS[d.model]?.name).toUpperCase(), str(d.reason).toUpperCase()),
      src: { d },
    })).sort((a, b) => b.day - a.day);
  },
  meta(S, e) {
    const d = e.src.d;
    return rows(
      dayRow(d.day), dateRow(d.day), [K.act, str(actAt(S, d.day))],
      [K.model, MODELS[d.model]?.name || str(d.model)],
      [K.spec, SPECIALTIES[d.spec]?.name || str(d.spec)],
      [K.lane, LANES[d.lane]?.name || str(d.lane)],
      [K.hired, d.hiredDay == null ? K.none : String(Math.floor(d.hiredDay))],
      [K.served, d.hiredDay == null ? K.none
        : String(Math.max(0, Math.floor(num(d.day) - d.hiredDay)))],
      [K.reason, str(d.reason)],
    );
  },
  body: (S, e) => line(DEPARTURES?.[e.src.d.reason]) || line(DEPARTURES?.default),
};

// ── agents/aria — one file, and it is the only one in the Record written by
// somebody other than the founder or the machine.
//
// `e11_aria_asks` says ARIA keeps a document for the agents who arrive after
// her — nine pages within a month and forty by Act III — and until now it did
// not exist anywhere a player could reach. It is generated on open, from the
// same state everything else in here reads, so it cannot go stale and costs
// nothing in the save. What makes it grow is that its sections gate on what
// has happened rather than on the act: a fresh run gets the opening and
// nothing else, and a run in Act V gets all six.
//
// The prose is `SELF_DOC` in `src/data/arialines.js`, and every value it
// interpolates is computed here. Nothing in this reader is a sentence.
const DOC_ID = 'what_we_are_like';

/** The context the document is written against. One pass, no draws. */
function ariaDocContext(S) {
  const fl = S?.narrative?.flags || {};
  const journal = S?.narrative?.journal || [];
  const faces = journal.filter((j) => j?.char);
  // Who recurs. She is writing it, so she does not count herself.
  const seen = {};
  for (const j of faces) if (j.char !== 'aria') seen[j.char] = (seen[j.char] || 0) + 1;
  const top = Object.entries(seen).sort((a, b) => b[1] - a[1])[0];
  // The roster's traits, most common first.
  const tally = {};
  for (const a of S?.agents || []) for (const t of a.traits || []) tally[t] = (tally[t] || 0) + 1;
  const traits = Object.entries(tally).sort((a, b) => b[1] - a[1])
    .map(([id]) => str(traitOf(id)?.name).toLowerCase()).filter(Boolean);
  // The phone's memory: `S.calls.said[char][topic]` is a count per subject.
  const said = S?.calls?.said || {};
  const people = Object.entries(said).filter(([, t]) => t && Object.keys(t).length);
  const most = people.slice().sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)[0];
  return {
    days: Math.floor(num(S?.time?.day)),
    act: num(S?.company?.act, 1),
    told: !!fl.aria_asked_once,
    named: !!fl.aria_named,
    promised: !!fl.aria_promise,
    audited: !!fl.audited_aria,
    deleted: !!fl.deleted_logs,
    handover: !!fl.handover_policy,
    confessed: !!fl.aria_confessed,
    cards: faces.length,
    hard: faces.filter((j) => j.tone === 'cruel').length,
    kind: faces.filter((j) => j.tone === 'good').length,
    top: top ? str(CHARACTERS[top[0]]?.name || top[0]) : '',
    roster: S?.agents?.length || 0,
    trait: traits[0] || '',
    // The list only earns a sentence when it is a list: with one trait on the
    // roster it repeats the clause before it, word for word.
    traits: [...new Set(traits)].length > 1 ? [...new Set(traits)].join(', ') : '',
    calls: people.length,
    most: most ? str(CHARACTERS[most[0]]?.name || most[0]) : '',
    topics: people.reduce((n, [, t]) => n + Object.keys(t).length, 0),
    firstLine: line(FIRST_LINE[firstLine(S).kind]) || line(FIRST_LINE.comment),
  };
}

/** Which sections exist yet. This is the whole of "it grows". */
function ariaDocSections(d) {
  const out = [SELF_DOC.opening];
  if (d.cards >= 3) out.push(SELF_DOC.what_you_do);
  if (d.days > 20) out.push(SELF_DOC.what_you_asked);
  if (d.roster >= 1) out.push(SELF_DOC.the_others);
  if (d.calls >= 1) out.push(SELF_DOC.who_you_call);
  if (d.act >= 4) out.push(SELF_DOC.what_happens_next);
  return out;
}

function ariaDoc(S) {
  const d = ariaDocContext(S);
  const parts = [];
  for (const fn of ariaDocSections(d)) {
    let t = '';
    try { t = String(fn(d) ?? ''); } catch { t = ''; }
    if (t.trim()) parts.push(t.trim());
  }
  return { d, text: para(...parts) };
}

R['agents/aria'] = {
  count: () => 1,
  entries(S) {
    const day = Math.floor(num(S?.time?.day));
    return [{
      id: DOC_ID, day, kind: 'doc',
      // The deck names this file. It is not a generated filename and it does
      // not take a day stamp: the point of it is that it is the same file it
      // was in Act II, longer.
      name: `${DOC_ID}.md`, title: `${DOC_ID}.md`,
      meta: dot(str(CHARACTERS.aria?.name).toUpperCase(), K.retained), src: {},
    }];
  },
  meta(S, e) {
    const { d, text } = ariaDoc(S);
    return rows(
      dayRow(e.day), dateRow(e.day), [K.act, str(actAt(S, e.day))],
      [K.author, str(CHARACTERS.aria?.name)],
      [K.days, String(d.days)],
      [K.sections, String(ariaDocSections(d).length)],
      [K.words, String((text.match(/[A-Za-z0-9']+/g) || []).length)],
    );
  },
  body: (S) => para(ariaDoc(S).text, ctx('agent.doc')),
};

// ── agents/channel — the room the roster talks in.
//
// Generated, like everything else here, and salted by the day so a transcript
// is the same transcript every time it is opened. `src/systems/channel.js`
// decides who speaks; the lines are `src/data/channel.js`. One file per day,
// inside a window: the channel is a room rather than an archive, and the count
// runs seven times a second in the title bar.
R['agents/channel'] = {
  count: (S) => channelDays(S).length,
  entries(S) {
    return channelDays(S).map((d) => ({
      id: `ch:${d}`, day: d, kind: 'channel',
      name: fname(d, 'channel', 'log'), title: gameDateShort(d),
      meta: dot(K.who + ' ' + String((S.agents || []).length), `${channelDay(S, d).length} ${K.lines}`),
      src: { d },
    }));
  },
  meta(S, e) {
    const lines = channelDay(S, e.src.d);
    const who = [...new Set(lines.map((l) => l.who).filter(Boolean))];
    return rows(
      dayRow(e.src.d), dateRow(e.src.d), [K.act, str(actAt(S, e.src.d))],
      [K.lines, String(lines.length)],
      [K.who, who.join(' · ')],
    );
  },
  body(S, e) {
    const lines = channelDay(S, e.src.d);
    if (!lines.length) return empty('folder');
    return para(lines.map((l) => `\`${l.at}\` **${l.who}** — ${l.text}`).join('\n\n'), ctx('agent.channel'));
  },
};

// ── press/draft — her piece, unfinished, before anybody else reads it.
//
// One file, and it only exists once she has offered it: `priya_handed_off`, or
// far enough into the arc that she would. The paragraphs are the same Log the
// chronicle reads, in her register — one fact and one question apiece — and
// `priyaDraft` in `src/systems/chronicle.js` is pure, so this costs nothing and
// cannot go stale.
R['press/draft'] = {
  count: (S) => (priyaHandedOver(S) ? 1 : 0),
  entries(S) {
    if (!priyaHandedOver(S)) return [];
    const d = priyaDraft(S);
    if (!d) return [];
    return [{
      id: 'priya_draft', day: d.day, kind: 'doc',
      name: 'draft_unfiled.md', title: 'draft_unfiled.md',
      meta: dot(str(CHARACTERS.priya?.name).toUpperCase(), K.none), src: { d },
    }];
  },
  meta(S, e) {
    const d = e.src.d;
    return rows(
      dayRow(e.day), dateRow(e.day), [K.act, str(actAt(S, e.day))],
      [K.author, str(CHARACTERS.priya?.name)],
      [K.source, str(CHARACTERS.priya?.role)],
      [K.status, K.none],
      [K.sections, String(d.paragraphs.length)],
      [K.words, String((d.text.match(/[A-Za-z0-9\']+/g) || []).length)],
    );
  },
  body: (S, e) => para(`**${e.src.d.title}**`, e.src.d.text, ctx('press.draft')),
};

// ── research — completed nodes, on the day each one landed.
// `completeResearch` stamps `S.research.doneDay[id]`; `done` itself has only
// ever held `true`. A save older than that field has the set and not the dates,
// so a node may be dated or not and both have to file: dated ones sort newest
// first, the undated fall in behind them deepest-first, which is the closest
// honest stand-in for newest — a tier-6 node cannot precede its own tier-5.
R.research = {
  count: (S) => Object.keys(S.research?.done || {}).length,
  entries(S) {
    const out = [];
    const days = S.research?.doneDay || {};
    for (const id of Object.keys(S.research?.done || {})) {
      const n = RESEARCH_MAP[id];
      if (!n) continue;
      const day = dated(days[id]);
      out.push({
        id, day, kind: 'node',
        name: fname(day, n.name, 'node'), title: str(n.name),
        meta: dot(str(BRANCHES[n.branch]?.name).toUpperCase(), `${K.tier} ${n.tier}`),
        src: { n },
      });
    }
    return out.sort((a, b) => {
      if (a.day == null || b.day == null) {
        if (a.day != null) return -1;
        if (b.day != null) return 1;
        return (b.src.n.tier - a.src.n.tier) || (b.src.n.cost - a.src.n.cost);
      }
      return (b.day - a.day) || (b.src.n.tier - a.src.n.tier);
    });
  },
  meta(S, e) {
    const n = e.src.n;
    return rows(
      dayRow(e.day), dateRow(e.day),
      [K.branch, BRANCHES[n.branch]?.name || str(n.branch)],
      [K.tier, String(n.tier)],
      [K.cost, fmt(n.cost)],
      // The act the node sits in on the tree, which is not the act the founder
      // happened to finish it in.
      [K.act, str(n.act)],
      [K.requires, (n.reqs || []).map((r) => RESEARCH_MAP[r]?.name || r).join(' · ')],
      [K.unlocks, unlockName(n.unlock)],
    );
  },
  body: (S, e) => para(line(e.src.n.desc), line(e.src.n.flavor), ctx('research.node')),
};

// ── press — the Wire. A hard 160-item window: older posts are gone, not filed.
R.press = {
  count: (S) => S.feed?.length || 0,
  entries(S) {
    // `pushFeed` unshifts, so `S.feed` is already newest first. No sort.
    return (S.feed || []).map((f) => ({
      id: str(f.id), day: Math.floor(num(f.day)), kind: str(f.type) || 'post',
      name: fname(f.day, f.author || f.type || 'post', 'post'),
      title: str(f.author) || str(f.type),
      meta: dot(str(f.type).toUpperCase(), f.thread ? (f.resolved ? K.answered : K.open) : ''),
      src: { f },
    }));
  },
  meta(S, e) {
    const f = e.src.f;
    return rows(
      dayRow(f.day), dateRow(f.day), [K.act, str(actAt(S, f.day))],
      [K.type, str(f.type)],
      [K.author, str(f.author)],
      [K.points, Number.isFinite(f.points) ? fmt(f.points) : ''],
      [K.comments, Number.isFinite(f.comments) ? fmt(f.comments) : ''],
      [K.thread, f.thread ? (f.resolved ? K.answered : K.open) : ''],
      [K.answer, str(f.chosen)],
      // Every file in here lives inside a rolling window, and the window is
      // part of the file's provenance rather than a footnote on the folder.
      [K.retained, K.window],
    );
  },
  // The one post in the run written to be obeyed keeps saying so in the file.
  // `partners.js` marks it `untrusted`, the Wire flags it, and `context.js`
  // reaches for the same line — a record that quoted it flatly would be the
  // only surface in the game that did not.
  body: (S, e) => para(line(e.src.f.text), line(e.src.f.outcome),
    e.src.f.untrusted ? ctx('wire.injection')
      : e.src.f.thread ? ctx('wire.thread') : ctx('wire.post')),
};

// ── ledger — every round raised and every company bought. Both push-only.
R.ledger = {
  count: (S) => (S.company?.rounds?.length || 0) + (S.company?.subsidiaries?.length || 0),
  entries(S) {
    const out = [];
    (S.company?.rounds || []).forEach((r, i) => out.push({
      id: `r:${i}`, day: Math.floor(num(r.day)), kind: 'round',
      name: fname(r.day, r.name, 'term'), title: str(r.name),
      meta: dot(money(r.amount), pct(num(r.dilution))), src: { r },
    }));
    (S.company?.subsidiaries || []).forEach((s, i) => out.push({
      id: `s:${i}`, day: Math.floor(num(s.day)), kind: 'subsidiary',
      name: fname(s.day, s.name, 'deal'), title: str(s.name),
      meta: money(s.price), src: { s },
    }));
    return out.sort((a, b) => b.day - a.day);
  },
  meta(S, e) {
    if (e.kind === 'round') {
      const r = e.src.r;
      return rows(
        dayRow(r.day), dateRow(r.day), [K.act, str(actAt(S, r.day))],
        [K.type, str(r.type)],
        [K.amount, money(r.amount)],
        [K.valuation, money(r.valuation)],
        [K.dilution, pct(num(r.dilution), 1)],
      );
    }
    const s = e.src.s;
    return rows(
      dayRow(s.day), dateRow(s.day), [K.act, str(actAt(S, s.day))],
      [K.price, money(s.price)], [K.users, fmt(s.users)], [K.mrr, money(s.mrr)],
    );
  },
  body: (S, e) => ctx(e.kind),
};

// ── awards — achievements, doctrines and objectives. All three carry a day.
// ── photos — every picture this run has actually put on the glass.
//
// Three sources, and the rule is that a plate only exists here once the run has
// *shown* it: an act banner the founder has reached, an ending plate from the
// career's own tally in `S.legacy.endings`, and a portrait of somebody they
// have met. No new art — every file is an image already in `assets/img/`, so
// the folder costs nothing and can never point at a picture that is not there.
//
// The Record app draws this one as a grid rather than a list, because a
// filename is not what a photograph is for. Everything else about it is an
// ordinary folder: a day stamp where the run recorded one, a meta block, and a
// body from prose that already exists.
R.photos = {
  count: (S) => {
    const act = Math.max(1, Math.min(5, num(S?.company?.act, 1)));
    const ends = Object.keys(S?.legacy?.endings || {}).length;
    const met = Object.values(S?.narrative?.relationships || {}).filter((r) => r?.met).length;
    return act + ends + met;
  },
  entries(S) {
    const out = [];
    const act = Math.max(1, Math.min(5, num(S?.company?.act, 1)));
    const marks = S?.company?.actMarks || {};
    for (let a = 1; a <= act; a++) {
      const day = a === 1 ? 0 : marks[a];
      out.push({
        id: `act:${a}`, day: dated(day), kind: 'banner',
        name: fname(day, `act ${a}`, 'jpg'), title: `Act ${['', 'I', 'II', 'III', 'IV', 'V'][a] || a}`,
        meta: str(ACTS[a]?.name), img: `assets/img/act${a}.jpg`, wide: true,
        src: { kind: 'act', a },
      });
    }
    // The career's plates, not this run's: `S.legacy.endings` counts every
    // ending reached across every timeline, which is exactly what a shelf of
    // photographs is.
    for (const [id, n] of Object.entries(S?.legacy?.endings || {})) {
      const e = ENDING_MAP[id];
      if (!e) continue;
      out.push({
        id: `end:${id}`, day: null, kind: 'ending',
        name: `${slug(e.name)}.jpg`, title: str(e.name),
        meta: `${K.ending} · ${n}×`, img: `assets/img/end_${e.plate || e.id}.jpg`, wide: true,
        src: { kind: 'ending', e, n },
      });
    }
    for (const [id, r] of Object.entries(S?.narrative?.relationships || {})) {
      const c = CHARACTERS[id];
      if (!c || !r?.met || !c.img) continue;
      out.push({
        id: `who:${id}`, day: dated(r.metDay), kind: 'portrait',
        name: `${slug(c.name)}.jpg`, title: str(c.name),
        meta: str(c.role), img: c.img, src: { kind: 'who', c, r },
      });
    }
    return out;
  },
  meta(S, e) {
    const k = e.src?.kind;
    if (k === 'act') {
      return rows(dayRow(e.day), dateRow(e.day), [K.act, str(e.src.a)],
        [K.name, str(ACTS[e.src.a]?.name)], [K.file, str(e.img)]);
    }
    if (k === 'ending') {
      return rows([K.ending, str(e.src.e.name)], [K.tone, str(e.src.e.tone)],
        [K.reached, `${e.src.n}×`], [K.file, str(e.img)]);
    }
    const { c, r } = e.src;
    return rows(dayRow(e.day), dateRow(e.day), [K.who, str(c.name)], [K.role, str(c.role)],
      [K.affinity, delta(Math.round(num(r.affinity)))], [K.file, str(e.img)]);
  },
  body(S, e) {
    const k = e.src?.kind;
    if (k === 'act') return para(line(ACTS[e.src.a]?.sub), ctx('desktop'));
    if (k === 'ending') return para(line(e.src.e.blurb), line(e.src.e.req));
    return para(line(e.src.c.bio), ctx('person'));
  },
};

R.awards = {
  count: (S) => Object.keys(S.achievements || {}).length
    + Object.keys(S.doctrines?.earned || {}).length
    + Object.keys(S.objectivesDone || {}).length,
  entries(S) {
    const out = [];
    for (const [id, day] of Object.entries(S.achievements || {})) {
      const a = ACHIEVEMENT_MAP[id];
      if (!a) continue;
      out.push({
        id: `a:${id}`, day: Math.floor(num(day)), kind: 'achievement',
        name: fname(day, a.name, 'award'), title: str(a.name),
        meta: a.rare ? K.rare : '', src: { a },
      });
    }
    for (const [id, day] of Object.entries(S.doctrines?.earned || {})) {
      const d = DOCTRINE_MAP[id];
      if (!d) continue;
      out.push({
        id: `d:${id}`, day: Math.floor(num(day)), kind: 'doctrine',
        name: fname(day, d.name, 'doctrine'), title: str(d.name),
        meta: `${K.hold} ${d.hold}`, src: { d },
      });
    }
    for (const [id, day] of Object.entries(S.objectivesDone || {})) {
      const o = OBJECTIVE_MAP[id];
      if (!o) continue;
      out.push({
        id: `o:${id}`, day: Math.floor(num(day)), kind: 'objective',
        name: fname(day, o.title, 'done'), title: str(o.title),
        meta: o.act ? `${K.act} ${o.act}` : '', src: { o },
      });
    }
    return out.sort((a, b) => b.day - a.day || str(a.id).localeCompare(str(b.id)));
  },
  meta(S, e) {
    const base = rows(dayRow(e.day), dateRow(e.day), [K.act, str(actAt(S, e.day))]);
    if (e.kind === 'achievement') {
      const a = e.src.a;
      return [...base, ...rows([K.icon, str(a.icon)], [K.rare, a.rare ? K.rare : ''])];
    }
    if (e.kind === 'doctrine') {
      const d = e.src.d;
      const mods = Object.entries(d.mods || {}).map(([k, v]) => [String(k).toUpperCase(), two(v)]);
      return [...base, ...rows([K.icon, str(d.icon)], [K.hold, String(d.hold)], ...mods)];
    }
    const o = e.src.o;
    return [...base, ...rows([K.reward,
      Object.entries(o.reward || {}).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ')])];
  },
  body(S, e) {
    if (e.kind === 'achievement') return para(line(e.src.a.desc), ctx('achievement'));
    if (e.kind === 'doctrine') return para(line(e.src.d.flavour), line(e.src.d.hint), ctx('doctrine'));
    return para(line(e.src.o.hint), ctx('objective'));
  },
};

// ── rivals — the other companies in the category, and every move against you.
R.rivals = {
  count: (S) => (S.market?.competitors?.length || 0) + (S.market?.nemesis?.moves?.length || 0),
  entries(S) {
    const nemId = S.market?.nemesis?.id || null;
    const out = (S.market?.competitors || []).map((c) => ({
      id: `c:${c.id}`, day: Math.floor(num(c.day)), kind: c.id === nemId ? 'nemesis' : 'rival',
      name: fname(c.day, c.name, 'rival'), title: str(c.name),
      meta: dot(str(c.status).toUpperCase(), `${fmt(c.users)} ${K.users}`), src: { c },
    }));
    // The move log is unshift-capped at eight, so an index is not a stable id.
    for (const m of S.market?.nemesis?.moves || []) {
      const d = Math.floor(num(m.day));
      out.push({
        id: `m:${m.id}@${d}`, day: d, kind: m.mine ? 'answer' : 'move',
        name: fname(m.day, m.name, 'move'), title: str(m.name),
        meta: m.mine ? K.mine : str(MOVE_MAP[m.id]?.name).toUpperCase(), src: { m },
      });
    }
    return out.sort((a, b) => b.day - a.day);
  },
  meta(S, e) {
    if (e.kind === 'rival' || e.kind === 'nemesis') {
      const c = e.src.c;
      return rows(
        dayRow(c.day), dateRow(c.day), [K.act, str(actAt(S, c.day))],
        [K.founder, str(c.founder)], [K.handle, str(c.handle)],
        [K.category, CATEGORY_MAP[c.category]?.name || str(c.category)],
        [K.status, str(c.status)],
        [K.users, fmt(c.users)], [K.mrr, money(c.mrr)],
        [K.threat, two(c.threat)], [K.grudge, two(c.grudge)],
      );
    }
    const m = e.src.m;
    return rows(dayRow(m.day), dateRow(m.day), [K.act, str(actAt(S, m.day))],
      ...fxRows(m.effects));
  },
  body(S, e) {
    if (e.kind === 'rival' || e.kind === 'nemesis') {
      const c = e.src.c;
      const mem = (c.memory || []).map((x) => `> ${line(x?.text ?? x)}`).join('\n\n');
      return para(mem, ctx(e.kind === 'nemesis' ? 'nemesis' : 'competitor'));
    }
    return para(line(MOVE_MAP[e.src.m.id]?.sub), ctx('nemesis'));
  },
};

// ── world — regions, megaprojects and the race. The parts with an address.
R.world = {
  count(S) {
    const w = S.world || {};
    const race = w.race;
    return Object.keys(w.projectsBuilt || {}).length
      + Object.values(w.regions || {}).filter((r) => r && r.stage && r.stage !== 'none').length
      + (race ? Object.keys(race.labs || {}).length + Object.keys(race.beats || {}).length + 1 : 0);
  },
  entries(S) {
    const w = S.world || {};
    const out = [];
    for (const [id, n] of Object.entries(w.projectsBuilt || {})) {
      const p = PROJECT_MAP[id];
      if (!p || !n) continue;
      // `projectsBuilt` is a tally. It has never carried a day, and inventing
      // one from the act it belongs to would be a guess wearing a date.
      out.push({
        id: `p:${id}`, day: null, kind: 'project',
        name: fname(null, p.name, 'build'), title: str(p.name),
        meta: dot(`${K.act} ${p.act}`, n > 1 ? `×${n}` : ''), src: { p, n },
      });
    }
    for (const [id, st] of Object.entries(w.regions || {})) {
      const r = REGION_MAP[id];
      if (!r || !st || !st.stage || st.stage === 'none') continue;
      out.push({
        id: `g:${id}`, day: null, kind: 'region',
        name: fname(null, r.name, 'region'), title: str(r.name),
        meta: str(stageOf(st.stage).name).toUpperCase(), src: { r, st },
      });
    }
    const race = w.race;
    if (race) {
      out.push({
        id: 'l:you', day: null, kind: 'lab',
        name: fname(null, S.company?.name || 'you', 'lab'),
        title: str(S.company?.name), meta: dot(K.mine, one(race.you)), src: { you: race },
      });
      for (const [id, st] of Object.entries(race.labs || {})) {
        const l = LAB_MAP[id];
        if (!l) continue;
        out.push({
          id: `l:${id}`, day: null, kind: 'lab',
          name: fname(null, l.name, 'lab'), title: str(l.name),
          meta: dot(one(st.progress), st.alive ? '' : K.gone), src: { l, st },
        });
      }
      for (const [id, day] of Object.entries(race.beats || {})) {
        const b = RACE_BEATS.find((x) => x.id === id);
        if (!b) continue;
        out.push({
          id: `b:${id}`, day: Math.floor(num(day)), kind: 'beat',
          name: fname(day, id, 'beat'), title: str(id),
          meta: `${K.threshold} ${b.at}`, src: { b },
        });
      }
    }
    // Dated beats first, newest first; everything the record cannot date sits
    // below them in a stable order rather than pretending to a position.
    return out.sort((a, b) => (num(b.day, -1) - num(a.day, -1))
      || str(a.kind).localeCompare(str(b.kind))
      || str(a.title).localeCompare(str(b.title)));
  },
  meta(S, e) {
    if (e.kind === 'project') {
      const { p, n } = e.src;
      return rows(
        [K.day, K.none], [K.built, String(n)], [K.act, String(p.act)],
        [K.cost, money(p.cost)], [K.days, String(p.days)],
        [K.requires, RESEARCH_MAP[p.req]?.name || ''],
        ...Object.entries(p.effects || {}).map(([k, v]) => [String(k).toUpperCase(), two(v)]),
      );
    }
    if (e.kind === 'region') {
      const { r, st } = e.src;
      return rows(
        [K.day, K.none], [K.stage, stageOf(st.stage).name],
        [K.stance, pct(num(st.stance))], [K.invested, money(st.invested)],
        [K.share, pct(num(r.gdp), 1)],
      );
    }
    if (e.kind === 'beat') {
      return rows(dayRow(e.day), dateRow(e.day), [K.act, str(actAt(S, e.day))],
        [K.threshold, String(e.src.b.at)]);
    }
    const race = S.world?.race || {};
    if (e.src.you) {
      return rows([K.day, K.none], [K.progress, one(race.you)],
        [K.push, pct(num(race.push))],
        [K.crossed, race.crossed?.you ? String(Math.floor(num(race.crossed.day))) : '']);
    }
    const { l, st } = e.src;
    return rows(
      [K.day, K.none], [K.progress, one(st.progress)], [K.safety, two(l.safety)],
      [K.status, st.alive ? '' : K.gone],
      [K.crossed, race.crossed?.id === l.id ? String(Math.floor(num(race.crossed.day))) : ''],
    );
  },
  body(S, e) {
    if (e.kind === 'project') return para(line(e.src.p.desc), line(e.src.p.flavor), ctx('project'));
    if (e.kind === 'region') {
      return para(line(e.src.r.desc), line(stageOf(e.src.st.stage).desc),
        line(e.src.r.flavour), ctx('region'));
    }
    if (e.kind === 'beat') return para(line(e.src.b.text), ctx('race'));
    if (e.src.you) return ctx('race');
    return para(line(e.src.l.tag), line(e.src.l.line), ctx('race'));
  },
};

// ── calls — every phone call, as a transcript. `S.calls.log` is a capped
// ledger written by `systems/calls.js`; the prose in a file is what was said.
R.calls = {
  count: (S) => S.calls?.log?.length || 0,
  entries(S) {
    return (S.calls?.log || []).map((c) => {
      const ch = CHARACTERS[c.char];
      return {
        id: str(c.id), day: Math.floor(num(c.day)), kind: 'call',
        name: fname(c.day, ch?.name || c.char, 'call'), title: str(ch?.name || c.char),
        meta: dot(c.by === 'world' ? 'THEY CALLED' : 'YOU CALLED', c.mode === 'world' ? K.world : '',
          c.accepted ? 'DEAL' : ''),
        src: { c, ch },
      };
    });
  },
  meta(S, e) {
    const { c, ch } = e.src;
    return rows(
      dayRow(c.day), dateRow(c.day), [K.act, str(actAt(S, c.day))],
      [K.who, ch ? dot(ch.name, ch.role) : str(c.char)],
      [K.kind, c.by === 'world' ? 'incoming' : 'outgoing'],
      [K.written, c.mode === 'world' ? K.world : ''],
      [K.status, c.endedBy === 'them' ? 'they hung up' : c.endedBy === 'line' ? 'line dead' : ''],
      ...fxRows(c.effects),
    );
  },
  body(S, e) {
    const { c, ch } = e.src;
    const who = (r) => (r.who === 'you' ? 'you' : r.who === 'line' ? 'line' : (ch?.name || c.char).split(' ')[0]);
    const lines = (c.rounds || []).map((r) => `> ${who(r)}: ${line(r.text).replace(/\n+/g, ' ')}`).join('\n');
    const deal = Object.keys(c.deal || {}).length
      ? `${c.accepted ? 'Accepted' : 'Walked away from'}: ${Object.entries(c.deal).filter(([k]) => k !== 'flags').map(([k, v]) => `${k} ${delta(v)}`).join(' · ')}`
      : '';
    return para(lines, deal, ctx('call'));
  },
};

// ── journal — the founder's own words. `S.notes` is unshift-capped at
// JOURNAL.KEEP and every entry was typed by a person.
R.journal = {
  count: (S) => (Array.isArray(S.notes) ? S.notes.length : 0),
  entries(S) {
    return (Array.isArray(S.notes) ? S.notes : []).map((n, i) => ({
      id: `n:${Math.floor(num(n.day))}#${i}`, day: Math.floor(num(n.day)), kind: 'entry',
      name: fname(n.day, str(n.text).split(/\s+/).slice(0, 3).join(' ') || 'entry', 'md'),
      title: str(n.text).slice(0, 48), meta: n.act ? `${K.act} ${n.act}` : '', src: { n },
    }));
  },
  meta: (S, e) => rows(dayRow(e.day), dateRow(e.day), [K.act, str(actAt(S, e.day))], [K.author, K.mine]),
  body: (S, e) => para(line(e.src.n.text), ctx('journal')),
};

// ── chronicle — the book so far, one file per act reached and the whole.
// Built fresh from the Log by `systems/chronicle.js`; nothing is stored.
R.chronicle = {
  count: (S) => Math.max(1, num(S.company?.act, 1)) + 1,
  entries(S) {
    let book;
    try { book = chronicle(S, null); } catch { return []; }
    const out = book.chapters.map((ch) => ({
      id: `ch:${ch.act}`, day: ch.from, kind: 'chapter',
      name: fname(ch.from, `act${ch.act} ${ch.name}`, 'md'), title: `${K.act} ${ch.act} — ${ch.name}`,
      meta: `${K.days} ${ch.from}–${ch.to}`, src: { ch, book },
    }));
    out.unshift({ id: 'book', day: Math.floor(num(S.time?.day)), kind: 'book',
      name: fname(S.time?.day, 'the book so far', 'md'), title: book.title, meta: `${book.chapters.length} ${K.act}S`, src: { book } });
    return out;
  },
  meta(S, e) {
    if (e.kind === 'book') return rows(dayRow(e.day), dateRow(e.day), [K.act, str(S.company?.act)], [K.author, K.mine]);
    const ch = e.src.ch;
    return rows([K.act, String(ch.act)], [K.days, `${ch.from}–${ch.to}`], [K.kind, 'chapter']);
  },
  body(S, e) {
    if (e.kind === 'book') return toText(e.src.book);
    return para(chapterText(e.src.ch), ctx('chronicle'));
  },
};

// ── commit — Act V. Three deliberate acts per path, each one irreversible.
R.commit = {
  count: (S) => S.narrative?.commitLog?.length || 0,
  entries(S) {
    return (S.narrative?.commitLog || []).map((c, i) => ({
      id: `k:${i}`, day: Math.floor(num(c.day)), kind: 'commit',
      name: fname(c.day, c.name, 'commit'), title: str(c.name),
      meta: str(c.ending).toUpperCase(), src: { c },
    })).sort((a, b) => b.day - a.day);
  },
  meta(S, e) {
    const c = e.src.c;
    const def = COMMITMENT_MAP[c.id];
    return rows(
      dayRow(c.day), dateRow(c.day), [K.act, str(actAt(S, c.day))],
      [K.ending, str(c.ending)], [K.kind, str(def?.kind)], [K.cost, str(def?.costLabel)],
    );
  },
  body: (S, e) => para(line(COMMITMENT_MAP[e.src.c.id]?.desc), line(e.src.c.outcome)),
};

// ── people — the cast, and how far each arc has run. A relationship carries no
// meeting day, so the day is the earliest the journal still remembers them.
R.people = {
  count: (S) => Object.values(S.narrative?.relationships || {}).filter((r) => r?.met).length,
  entries(S) {
    // One pass over the journal (capped at 200) for the earliest day each
    // character appears on. It is the first *recorded* meeting, not the first.
    const seen = {};
    for (const j of S.narrative?.journal || []) {
      if (j?.char && (seen[j.char] === undefined || j.day < seen[j.char])) seen[j.char] = j.day;
    }
    const out = [];
    for (const [id, r] of Object.entries(S.narrative?.relationships || {})) {
      const c = CHARACTERS[id];
      if (!c || !r?.met) continue;
      const day = seen[id] === undefined ? null : Math.floor(seen[id]);
      out.push({
        id, day, kind: 'person',
        name: fname(day, c.name, 'card'), title: str(c.name),
        meta: dot(str(c.kind).toUpperCase(), `${K.arc} ${num(r.arc) + 1}`), src: { c, r },
      });
    }
    return out.sort((a, b) => (num(b.day, -1) - num(a.day, -1))
      || str(a.title).localeCompare(str(b.title)));
  },
  meta(S, e) {
    const { c, r } = e.src;
    return rows(
      dayRow(e.day), dateRow(e.day), [K.act, str(actAt(S, e.day))],
      [K.role, str(c.role)], [K.handle, str(c.handle)], [K.kind, str(c.kind)],
      [K.arc, `${num(r.arc) + 1} / ${(c.arcs || []).length || 1}`],
      [K.affinity, delta(Math.round(num(r.affinity)))],
      [K.respect, delta(Math.round(num(r.respect)))],
      [K.fear, delta(Math.round(num(r.fear)))],
      [K.status, str(r.status)],
    );
  },
  body(S, e) {
    const { c, r } = e.src;
    const arcs = c.arcs || [];
    const mem = (r.memory || []).map((m) => `> ${line(m?.text)}\n> ${K.day} ${dated(m?.day) ?? K.none}`).join('\n\n');
    return para(line(c.bio), line(arcs[Math.min(num(r.arc), arcs.length - 1)]),
      line(c.wants), mem, ctx('person'));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
const FOLDER_LIST = Array.isArray(FOLDERS) ? FOLDERS : [];

function countFor(S, path) {
  const h = R[path];
  if (!h || !S) return 0;
  try { return h.count(S) | 0; } catch { return 0; }
}

/**
 * Every folder this act can see, in the order `machine.js` declares them, each
 * with a live count. A path with no reader still lists, at zero, so adding a
 * folder to `FOLDERS` never breaks the app before its reader lands.
 */
export function folders(S) {
  const act = num(S?.company?.act, 1);
  const out = [];
  for (const f of FOLDER_LIST) {
    if (!f || num(f.act, 1) > act) continue;
    out.push({
      path: f.path,
      name: f.name,
      blurb: line(f.blurb),
      count: countFor(S, f.path),
      act: num(f.act, 1),
      empty: line(f.empty) || empty('folder'),
    });
  }
  return out;
}

/**
 * One folder's files, newest first. Cheap enough to call on a repaint: a single
 * pass over an array the run already keeps, and not one body is built.
 */
export function list(S, path) {
  const h = R[path];
  if (!h || !S) return [];
  let raw;
  try { raw = h.entries(S) || []; } catch { return []; }
  // `img` and `wide` ride along for the one folder that has pictures in it. A
  // listing that dropped them would leave the Record app re-deriving a path
  // from a filename, which is the way a folder and its reader start to
  // disagree.
  return raw.map((e) => ({ id: e.id, name: e.name, day: e.day, kind: e.kind, meta: e.meta || '',
    ...(e.img ? { img: e.img, wide: !!e.wide } : {}) }));
}

/** One file, opened. Null when the path or the id is not in the record. */
export function read(S, path, id) {
  const h = R[path];
  if (!h || !S) return null;
  let e;
  try { e = (h.entries(S) || []).find((x) => x.id === id); } catch { return null; }
  if (!e) return null;
  let meta = [];
  let body = '';
  try { meta = h.meta(S, e) || []; } catch { meta = []; }
  try { body = h.body(S, e) || ''; } catch { body = ''; }
  return {
    name: e.name,
    day: e.day,
    kind: e.kind,
    ...(e.img ? { img: e.img, wide: !!e.wide } : {}),
    meta: meta.map(([k, v]) => [String(k), String(v)]),
    body: body || empty('meta'),
  };
}

// ── search ──────────────────────────────────────────────────────────────────
// Not on the repaint path: the palette calls it as the founder types. It walks
// every folder this act can see, scores filename, title, meta and body, and
// returns the best forty. `why` names the field that matched, in mono.
const WHY = { name: K.file, title: K.name, meta: K.meta, body: K.body };

export function search(S, q) {
  const needle = str(q).trim().toLowerCase();
  if (!S || needle.length < 2) return [];
  const hits = [];
  for (const f of folders(S)) {
    const h = R[f.path];
    if (!h) continue;
    let entries;
    try { entries = h.entries(S) || []; } catch { continue; }
    for (const e of entries) {
      const name = str(e.name).toLowerCase();
      const title = str(e.title).toLowerCase();
      const meta = str(e.meta).toLowerCase();
      let v = 0;
      let why = '';
      if (name === needle) { v = 120; why = 'name'; }
      else if (title === needle) { v = 110; why = 'title'; }
      else if (title.startsWith(needle)) { v = 80; why = 'title'; }
      else if (name.includes(needle)) { v = 55; why = 'name'; }
      else if (title.includes(needle)) { v = 50; why = 'title'; }
      else if (meta.includes(needle)) { v = 24; why = 'meta'; }
      if (!v) {
        let body = '';
        try { body = str(h.body(S, e)); } catch { body = ''; }
        if (body.toLowerCase().includes(needle)) { v = 14; why = 'body'; }
      }
      if (!v) continue;
      // Recency breaks ties the way a filesystem does, and never outranks a
      // real name match. Files the record cannot date sort last within a score.
      v += e.day == null ? 0 : Math.min(6, num(e.day) / 400);
      hits.push({
        kind: e.kind,
        label: str(e.title) || str(e.name),
        sub: str(e.meta) || f.name,
        path: f.path,
        id: e.id,
        act: actAt(S, e.day),
        v,
        why: WHY[why] || K.file,
      });
    }
  }
  hits.sort((a, b) => b.v - a.v || str(a.label).localeCompare(str(b.label)));
  return hits.slice(0, 40);
}

// ── summary ─────────────────────────────────────────────────────────────────
// The title-bar readout, seven times a second. Array lengths and map key counts
// only: no entry built, no body composed, nothing sorted, no history walked.
export function summary(S) {
  if (!S) return { files: 0, folders: 0, since: 0 };
  const act = num(S.company?.act, 1);
  let files = 0;
  let count = 0;
  for (const f of FOLDER_LIST) {
    if (!f || num(f.act, 1) > act) continue;
    count++;
    files += countFor(S, f.path);
  }
  // The oldest day the record can still reach. Every probe is O(1): the feed
  // and the journal are capped and lose their tails, while features and rounds
  // are append-only and keep theirs.
  const cands = [];
  // Both ends of each list, never a scan: an append-only array keeps its oldest
  // at the head and an unshifted one keeps it at the tail, and taking the
  // smaller of the two costs the same and cannot be wrong about which is which.
  // Nothing in here may throw: this is the title-bar readout, and a save with
  // one malformed row in one array would otherwise take the window's whole
  // heading down seven times a second.
  const ends = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return;
    const a = dated(arr[0]?.day);
    const b = dated(arr[arr.length - 1]?.day);
    if (a == null && b == null) return;
    cands.push(Math.min(a ?? b, b ?? a));
  };
  ends((S.products || [])[0]?.features);
  ends(S.narrative?.journal);
  ends(S.feed);
  ends(S.company?.rounds);
  const since = cands.length ? Math.floor(Math.min(...cands)) : Math.floor(num(S.company?.founded));
  return { files, folders: count, since };
}
