// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION — acts, unlocks, achievements, endings. The shape of the run.
// ─────────────────────────────────────────────────────────────────────────────
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../data/achievements.js';
import { ACTS, ACT_GATES as GATES, WORLD, ENDINGS_FORCED as EF, BOARD } from '../data/balance.js';
import { ENDINGS } from '../data/endings.js';
import { totalUsers, totalMrr } from './product.js';
import { computeMods, markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { clamp } from '../engine/format.js';
import { endingReady, endingProgress } from '../data/commitments.js';
import { playerProgress, repriceForSecond } from './agirace.js';
import { specFx } from './agents.js';
import { STAGE_INDEX, REGION_MAP } from '../data/regions.js';
import { RESEARCH_MAP } from '../data/research.js';
import { researchCost } from './research.js';
import { pushFeed } from './feed.js';
import { DOOR_OPENED, DOOR_META } from '../data/events_acts.js';

// Each act needs both a numeric threshold and time on the clock: the world
// does not reorganise itself in a fortnight, however good your quarter was.
//
// Which of the two binds is deliberate. Measured, the economic curves are very
// nearly vertical by Act III — raising the Act III bar from $75M ARR to $280M
// moved the transition by 36 days — so a threshold cannot pace anything. It
// would only wall off a player having a bad run while a good one sails past.
// So minDays sets the pace and the threshold is the competence check: the floor
// says how long an act's content takes to play, the goal says you actually got
// there. The floors below are what produce the documented act medians, and the
// megaprojects an act contains (90-260 days each) are why they are as long as
// they are — at the old floors you could not finish two of them in Act III.
//
// ── §A2 And what closes an act ───────────────────────────────────────────────
// Measured on five seeded runs of every build, before this: Acts II, III and IV
// each lasted almost exactly their floor, and the median act spent 29% (II),
// 58% (III) and 22% (IV) of its length with the next gate *already open* — Act
// III as much as 80%. That is not a competence check pacing anything; that is a
// timer with a tick box beside it, and the last third of an act is the founder
// waiting for a calendar.
//
// So each act now closes on a deed as well as a number, and the floors come
// down to meet it. A deed is something you can decide to go and do — raise the
// round, hold a profitable quarter, survive the hearing, sign the treaty, train
// the model, keep what you said you would keep, beat the season — and every one
// of them has at least two doors, because an act that can only be closed one
// way is a wall for whoever is not built that way. The bootstrapper never
// raising a Series A must still be able to leave Act II.
//
// Each deed also rides on the Log as that act's last objective (`data/
// objectives.js` reads this table) and on the act card that names it.
const anyRegionAt = (S, stage) => Object.values(S.world?.regions || {})
  .some((r) => (STAGE_INDEX[r.stage] || 0) >= STAGE_INDEX[stage]);

// The three ways `e15_first_hearing` can end. Any of them is a hearing you sat
// through; none of them is a hearing you dodged.
const HEARING_FLAGS = ['answered_dorne', 'played_the_room', 'said_i_dont_know'];

// ── §A5 The doors, and where the founder is in each ─────────────────────────
// A deed has more than one door on purpose, and the interface said so once, in
// one line of prose, and then never mentioned it again: "a hearing sat through,
// a region at government partnership, or a frontier-class training run" is
// three separate chases printed as a single sentence, with nothing anywhere
// that says which of them you are nearest. So each door carries a `note` — how
// far along that one door is, right now.
//
// Two rules hold this together. The deed's `test` is *derived* from its doors
// rather than typed beside them, so the checklist a founder reads and the gate
// that actually opens can never disagree; and every `note` is a pure function
// of `S` that draws nothing from the stream, because both housings call this
// from `render(S)` about seven times a second.
const door = (id, name, test, note) => ({ id, name, test, note });
const anyOpen = (doors) => (S) => doors.some((d) => { try { return !!d.test(S); } catch (e) { return false; } });

// The furthest a bloc has been taken, and what it is called. Used by the treaty
// door so the note names the region the founder is actually closest in rather
// than the first one in the table.
function furthestRegion(S) {
  let best = null;
  for (const [id, r] of Object.entries(S.world?.regions || {})) {
    const idx = STAGE_INDEX[r?.stage] || 0;
    if (!best || idx > best.idx) best = { id, idx, name: REGION_MAP[id]?.name || id };
  }
  return best && best.idx > 0 ? best : null;
}

// What is left to pay for a node, counting every prerequisite it still needs.
// Bounded by `seen` because the tree is a graph and a shared prerequisite would
// otherwise be billed twice.
function chainCost(S, id, seen) {
  if (!id || seen.has(id) || S.research?.done?.[id]) return 0;
  seen.add(id);
  const node = RESEARCH_MAP[id];
  if (!node) return 0;
  let sum = researchCost(S, node);
  for (const r of node.reqs || []) sum += chainCost(S, r, seen);
  return sum;
}

// Either node is a frontier-class run. The nearer one sets the number, and it
// is the share of that node's remaining bill — the node plus everything it
// still waits on — that the founder has banked. It rises as prerequisites land
// as well as as points accrue, which is what makes it read as progress.
const FRONTIER_NODES = ['model_frontier', 'own_foundation_model'];
function frontierShare(S) {
  let best = 0;
  for (const id of FRONTIER_NODES) {
    if (S.research?.done?.[id]) return 1;
    const need = chainCost(S, id, new Set());
    if (!(need > 0)) continue;
    best = Math.max(best, clamp((S.resources?.research || 0) / need, 0, 0.99));
  }
  return best;
}

// The two doors out of Act II: somebody funded it, or it funded itself.
const DOORS_STAND_UP = [
  door('series_a', 'a Series A', (S) => (S.company.rounds || []).some((r) => r.type === 'a'),
    (S, done) => {
      const rounds = S.company.rounds || [];
      if (done) return `closed on day ${Math.floor(rounds.find((r) => r.type === 'a')?.day ?? 0)}`;
      return rounds.length ? `${rounds.length} round${rounds.length === 1 ? '' : 's'} in, no A yet` : 'nothing raised';
    }),
  door('profit_quarter', 'a profitable quarter',
    (S) => (S.company.profitStreak || 0) >= GATES.PROFIT_QUARTER_DAYS,
    (S, done) => (done ? 'the quarter held'
      : `day ${Math.floor(S.company.profitStreak || 0)} of ${GATES.PROFIT_QUARTER_DAYS}`)),
];

// The three doors out of Act III. This is the deed the §A5 pass was written
// for: the gate opened on the earliest of the three and then the floor held the
// act for another four months, so a founder who had survived the hearing was
// told the world needed a hundred and thirty more days.
const DOORS_ARRIVE = [
  door('hearing', 'a hearing survived', (S) => HEARING_FLAGS.some((f) => !!S.narrative?.flags?.[f]),
    (S, done) => (done ? 'you sat through it' : 'not yet')),
  door('treaty', 'a region at government partnership', (S) => anyRegionAt(S, 'partner'),
    (S, done) => {
      const best = furthestRegion(S);
      if (done) return `${best?.name || 'a bloc'} signed`;
      if (!best) return 'no bloc entered';
      return `${best.idx} of ${STAGE_INDEX.partner} stages in ${best.name}`;
    }),
  door('frontier', 'the frontier training run',
    (S) => !!(S.research?.done?.own_foundation_model || S.research?.done?.model_frontier),
    (S, done) => (done ? 'trained' : `${Math.round(frontierShare(S) * 100)}%`)),
];

// The two doors out of Act IV, both counted inside the act.
const DOORS_INTENT = [
  door('kept', 'a quarter you set yourself, kept',
    (S) => (S.stats.lastIntentionKeptDay ?? -99) >= (S.company.actStartedDay || 0),
    (S, done) => {
      if (done) return 'kept, in this act';
      // Read rather than opened: `quarterState` would create the quarter, and
      // this is called from a render path seven times a second.
      const q = S.company?.quarter;
      if (!q) return 'no quarter open yet';
      const left = Math.max(0, Math.ceil((q.start || 0) + BOARD.QUARTER_DAYS - S.time.day));
      const set = q.intentions?.length || 0;
      return set ? `${set} set, ${left} days to keep ${set === 1 ? 'it' : 'them'}`
        : `the quarter ends in ${left} days`;
    }),
  door('season', 'a season off the rival',
    (S) => (S.market?.nemesis?.seasons || [])
      .some((x) => x && x.won === false && (x.day ?? -1) >= (S.company.actStartedDay || 0)),
    (S, done) => {
      if (done) return 'you took the season';
      const n = S.market?.nemesis;
      if (!n || !n.grudge) return 'nobody has come for you';
      return n.season ? 'their season is running' : 'no season open';
    }),
];

export const ACT_DEEDS = {
  // Act I closes on the thing Act I is for. The numbers were already there;
  // this says out loud that a company nobody can use is not one.
  2: { id: 'deed_launch', name: 'Put it in front of strangers',
       hint: 'Launch the product. Until then it is a folder.',
       test: (S) => (S.stats.productsLaunched || 0) >= 1 },
  // Act II is the act where a company either finds somebody to fund it or
  // finds out it does not need to be funded. Either door leaves.
  3: { id: 'deed_stand_up', name: 'Raise a Series A — or hold a profitable quarter',
       hint: 'A Series A, or ninety straight days where the day paid for itself.',
       doors: DOORS_STAND_UP, test: anyOpen(DOORS_STAND_UP) },
  // Act III is the act the company stops being only a market participant.
  // Three doors: the state noticed you and you sat through it, a bloc signed,
  // or you trained the thing yourself.
  4: { id: 'deed_arrive', name: 'Survive a hearing, sign a treaty, or train the model',
       hint: 'A hearing sat through, a region at government partnership, or a frontier-class training run.',
       doors: DOORS_ARRIVE, test: anyOpen(DOORS_ARRIVE) },
  // Act IV is the long one, and the thing it is missing is evidence that the
  // founder is running the place on purpose. Keep something you said you would
  // keep, or take a season off the rival who came for you — and both are
  // counted *inside this act*, because a promise kept in the garage is not
  // evidence about the company that exists now. The Act V gate keeps its
  // stall clause over this, so a run that never plans and never fights is
  // slowed rather than locked out.
  5: { id: 'deed_intent', name: 'Keep a quarter, or take a season off the rival',
       hint: 'Keep a quarterly intention, or close a season of the feud in your favour — in this act.',
       doors: DOORS_INTENT, test: anyOpen(DOORS_INTENT) },
};

export function actDeed(act) { return ACT_DEEDS[act] || null; }

// §A5. The doors of one act's deed, each with whether it is open and where the
// founder stands in it. Pure, and the only way the interface is allowed to ask:
// the Desk's objective row, the Field Note and the workstation's NOW widget all
// render this one list, so the three of them cannot drift apart the way three
// hand-written copies would.
export function deedDoors(S, act) {
  const d = ACT_DEEDS[act];
  if (!d?.doors) return [];
  return d.doors.map((x) => {
    let done = false, note = '';
    try { done = !!x.test(S); } catch (e) { done = false; }
    try { note = String(x.note(S, done) ?? ''); } catch (e) { note = ''; }
    return { id: x.id, name: x.name, done, note };
  });
}

// The one counter a deed needs that nothing else keeps: consecutive days where
// what the company earned covered what it spent. Reset by one day out of the
// band, like the two run-ups in `tickWorld`, because a company that was
// profitable in March and in July has not had a profitable quarter.
export function tickDeeds(S) {
  const profitable = (S.company.revenueToday || 0) > (S.company.expensesToday || 0);
  S.company.profitStreak = profitable ? (S.company.profitStreak || 0) + 1 : 0;
  noteDoors(S);
}

// §A5. A door opening is a beat, and it used to pass in silence: the founder
// sat through the hearing and the only thing that changed anywhere was a tick
// box on a panel they may not have had open. One line in the Wire, once per
// door per run, written in `data/events_acts.js` beside the act card that reads
// the same deed back.
//
// `S.company.doorsOpen` is the record, and it is seeded silently the first time
// it is missing — a save from before this existed is mid-run with doors already
// open, and three lines about things that happened last spring is not a beat.
function noteDoors(S) {
  const first = S.company.doorsOpen == null;
  const seen = (S.company.doorsOpen ??= {});
  const d = ACT_DEEDS[S.company.act + 1];
  if (!d?.doors) return;
  for (const x of d.doors) {
    if (seen[x.id] != null) continue;
    let open = false;
    try { open = !!x.test(S); } catch (e) { open = false; }
    if (!open) continue;
    seen[x.id] = Math.floor(S.time.day);
    const text = DOOR_OPENED[x.id];
    if (text && !first) pushFeed(S, { type: 'news', author: '', tone: 'good', text, meta: DOOR_META });
  }
}

export const ACT_GATES = [
  null,
  null, // act 1 is the start
  { act: 2, name: 'Product–Market Fit', minDays: GATES.ACT2_MIN_DAYS,
    test: (S) => ((totalMrr(S) >= GATES.ACT2_MRR && totalUsers(S) >= GATES.ACT2_USERS_WITH_MRR)
      || totalUsers(S) >= GATES.ACT2_USERS_ALONE) && S.stats.featuresShipped >= GATES.ACT2_FEATURES
      && ACT_DEEDS[2].test(S),
    hint: (S) => `Launch it, ship 8 features, then reach $7K MRR with 2,200 users — or 12,000 users` },
  { act: 3, name: 'Escape Velocity', minDays: GATES.ACT3_MIN_DAYS,
    test: (S) => totalMrr(S) * 12 >= GATES.ACT3_ARR && S.company.valuation >= GATES.ACT3_VALUATION
      && ACT_DEEDS[3].test(S),
    hint: () => `Reach $120M ARR and a $1.6B valuation, and either raise a Series A or hold a profitable quarter` },
  // §A2. The frontier-class training run used to be the only door out of Act
  // III, which said that the one way a company stops being a market
  // participant is by training a model. It is one of three now: the state
  // noticed you and you sat through it, a bloc signed, or you built the thing.
  { act: 4, name: 'Recursive Ascent', minDays: GATES.ACT4_MIN_DAYS,
    test: (S) => ACT_DEEDS[4].test(S)
      && S.company.valuation >= GATES.ACT4_VALUATION && S.resources.computeCap >= GATES.ACT4_COMPUTE,
    hint: () => `Reach a $180B valuation and 2,600 PF of compute — and train a frontier-class model, survive a hearing, or take a region to government partnership` },
  { act: 5, name: 'What Comes After', minDays: GATES.ACT5_MIN_DAYS,
    // Ascension is not a valuation. It begins when you are demonstrably at the
    // frontier — or when somebody else got there and the question is settled
    // without you. Without this term the act was a pure timer: measured, the
    // old goal was met around day 890 and the player then stood at the gate for
    // 265-294 days waiting out minDays. The day floor at the end is a safety
    // valve, not a path: it is twice the intended length of the act, and exists
    // so a run that somehow stalls below the benchmark cannot be locked out of
    // its own ending.
    test: (S) => S.research.done.recursive_self_improvement && S.company.valuation >= GATES.ACT5_VALUATION
      && S.world.globalGdpShare >= GATES.ACT5_GDP_SHARE
      // The stall clause covers the deed as well as the benchmark: it is the
      // one safety valve in the gates and it exists so that a run which is
      // otherwise finished cannot be locked out of its own ending.
      && (S.time.day - (S.company.actStartedDay || 0) >= GATES.ACT5_STALL_DAYS
          || (ACT_DEEDS[5].test(S)
              && (playerProgress(S) >= GATES.ACT5_FRONTIER || !!S.world.race?.crossed))),
    hint: () => `Achieve recursive self-improvement, a $12T valuation, 4.5% of global GDP `
      + `and 85% on the frontier benchmark — and keep a quarter you set yourself, or take a season off the rival` },
];

export function nextActHint(S) {
  const g = ACT_GATES[S.company.act + 1];
  if (!g) return null;
  const wait = actTimeRemaining(S);
  return { name: g.name, hint: g.hint(S), act: g.act, wait,
           ready: g.test(S), waitText: wait > 0 ? `${Math.ceil(wait)} more days in this act` : null };
}

export function actTimeRemaining(S) {
  const next = ACT_GATES[S.company.act + 1];
  if (!next?.minDays) return 0;
  const since = S.time.day - (S.company.actStartedDay || 0);
  return Math.max(0, next.minDays - since);
}

export function checkActProgression(S) {
  // Once a day, and this is the only place the day hook calls into this file,
  // so the one counter a deed needs is kept here rather than in a hook of its
  // own. It must run before the test below reads it.
  tickDeeds(S);
  const next = ACT_GATES[S.company.act + 1];
  if (!next) return false;
  if (!next.test(S)) return false;
  // §A2. The day this act's goal was *first* met, whether or not the floor had
  // run out. The gap between this and the day the act actually turns is how
  // much of an act is played with the next gate already open — which is the
  // number `tools/balance.mjs` prints and the number this pass exists to bring
  // down. Recorded here rather than in a tick of its own because this is the
  // only place the test is evaluated once a day.
  const met = (S.company.gateMetDay ??= {});
  if (met[next.act] == null) met[next.act] = Math.floor(S.time.day);
  if (actTimeRemaining(S) > 0) return false;
  S.company.actStartedDay = S.time.day;
  S.company.act = next.act;
  S.company.actMarks = S.company.actMarks || {};
  S.company.actMarks[next.act] = Math.floor(S.time.day);
  markDirty();
  emit('act:advance', { act: next.act, meta: ACTS[next.act] });
  return true;
}

export function checkAchievements(S) {
  const gained = [];
  for (const ach of ACHIEVEMENTS) {
    if (S.achievements[ach.id]) continue;
    let ok = false;
    try { ok = ach.check(S); } catch (e) { ok = false; }
    if (ok) {
      S.achievements[ach.id] = Math.floor(S.time.day);
      gained.push(ach);
      if (ach.legacy && !S.legacy.unlockedArchetypes.includes(ach.legacy)) {
        S.legacy.unlockedArchetypes.push(ach.legacy);
      }
      emit('achievement', ach);
    }
  }
  return gained;
}

export function grantAchievement(S, id) {
  const ach = ACHIEVEMENT_MAP[id];
  if (!ach || S.achievements[id]) return false;
  S.achievements[id] = Math.floor(S.time.day);
  emit('achievement', ach);
  return true;
}

export function achievementProgress(S) {
  const total = ACHIEVEMENTS.length;
  const got = Object.keys(S.achievements).length;
  return { got, total, pct: got / total };
}

// ── §B1 Why heat and approval are what they are ────────────────────────────
// Both numbers are the same shape: a target or an accrual built from three or
// four terms, and a convergence rate. `tickWorld` runs these; the World view
// prints them. Pure — `specFx` is the last tick's cache, never a fresh roll.

export function heatDrivers(S, m = computeMods(S)) {
  const W = S.world;
  const arr = totalMrr(S) * 12;
  const scale = Math.log10(1 + arr / WORLD.HEAT_ARR_SCALE) * WORLD.HEAT_SCALE_RATE;
  const lowAlign = S.resources.alignment < WORLD.HEAT_LOW_ALIGN ? WORLD.HEAT_LOW_ALIGN_ADD : 0;
  const gdp = W.globalGdpShare * WORLD.HEAT_GDP_RATE;
  const accrual = scale + lowAlign + gdp;
  const legal = specFx(S).heatDecay;
  const decay = m['+heatDecay'] + WORLD.HEAT_BASE_DECAY + legal;
  return { arr, scale, lowAlign, gdp, accrual, decay, legal,
           lobbying: m['+heatDecay'], base: WORLD.HEAT_BASE_DECAY,
           rate: m.heatRate, cap: Math.min(100, m.heatCap),
           net: (accrual * m.heatRate - decay) * WORLD.HEAT_ADJUST_RATE };
}

export function opinionTarget(S, m = computeMods(S)) {
  const d = opinionDrivers(S, m);
  return clamp(WORLD.OPINION_BASE + d.sentiment + d.reputation - d.gdpDrag + d.alignment + d.mods, 0, 1);
}

export function opinionDrivers(S, m = computeMods(S)) {
  const W = S.world;
  const p = S.products.find((x) => x.launched);
  return {
    base: WORLD.OPINION_BASE,
    sentiment: p ? (p.sentiment - WORLD.OPINION_BASE) * WORLD.OPINION_SENTIMENT_RATE : 0,
    reputation: S.resources.reputation > 0 ? Math.min(WORLD.OPINION_REP_CAP,
      Math.log10(1 + S.resources.reputation) * WORLD.OPINION_REP_RATE) : 0,
    gdpDrag: W.globalGdpShare * WORLD.OPINION_GDP_DRAG,
    alignment: (S.resources.alignment - WORLD.OPINION_BASE) * WORLD.OPINION_ALIGN_RATE,
    mods: m['+opinion'] || 0,
    product: p || null,
  };
}

// The two row blocks the World view prints, in `explainProduct`'s shape.
export function explainWorld(S, m = computeMods(S)) {
  const W = S.world;
  const h = heatDrivers(S, m);
  const o = opinionDrivers(S, m);
  const target = opinionTarget(S, m);
  const heatRows = [
    ['Scale', h.scale, `${money0(h.arr)} of annual run-rate. Attention is logarithmic in size: the first billion draws far more of it than the tenth.`, 'rate'],
    ['Alignment', h.lowAlign, h.lowAlign
      ? `Below ${WORLD.HEAT_LOW_ALIGN.toFixed(2)} alignment, regulators stop asking and start filing.`
      : `Alignment is above ${WORLD.HEAT_LOW_ALIGN.toFixed(2)}, so this term is off.`, 'rate'],
    ['Share of world output', h.gdp, `${(W.globalGdpShare * 100).toFixed(2)}% of world GDP flows through you. At this size you are infrastructure, and infrastructure is regulated.`, 'rate'],
    ...(h.rate !== 1 ? [['Scrutiny modifier', h.rate, 'What this run draws for the same company — a doctrine, a perk, or the Ghost.']] : []),
    ['Cooling', -h.decay, `Baseline ${WORLD.HEAT_BASE_DECAY}/day${h.legal ? `, plus ${h.legal.toFixed(2)} from Legal agents on Operations` : ', with nobody on Legal'}${h.lobbying ? `, plus ${h.lobbying.toFixed(2)} bought` : ''}.`, 'rate'],
    ['Net', h.net, h.net > 0 ? 'Heat is rising. It is a bill: Compliance on the ledger, and a discount on every round.' : 'Heat is falling.', 'rate'],
  ];
  const approvalRows = [
    ['Baseline', o.base, 'What the public thinks of a company it has no opinion about.', 'frac0'],
    ['Product sentiment', o.sentiment, o.product
      ? `Users are at ${(o.product.sentiment * 100).toFixed(0)}%. What your own customers say is the largest single term.`
      : 'Nothing launched, so nobody has an opinion of the product.', 'rate'],
    ['Reputation', o.reputation, `${Math.round(S.resources.reputation)} points, logarithmically, capped at ${WORLD.OPINION_REP_CAP}.`, 'rate'],
    ['Share of world output', -o.gdpDrag, `${(W.globalGdpShare * 100).toFixed(2)}% of world output. Being enormous is itself unpopular.`, 'rate'],
    ['Alignment', o.alignment, `Alignment ${S.resources.alignment.toFixed(2)}. People can tell whether the thing does what it was asked.`, 'rate'],
    ...(o.mods ? [['Standing orders & research', o.mods, 'Everything in this run that buys goodwill outright.', 'rate']] : []),
    ['Target', target, `Approval converges on this at ${(WORLD.OPINION_CONVERGENCE * 100).toFixed(1)}% of the gap a day. It is ${(W.publicOpinion * 100).toFixed(0)}% now.`, 'frac0'],
  ];
  return {
    heat: { total: W.regulatoryHeat, perDay: h.net, rows: heatRows },
    approval: { total: W.publicOpinion, target, rows: approvalRows },
  };
}
function money0(n) { return '$' + Math.round(n).toLocaleString(); }

// ── World simulation (acts 3+) ─────────────────────────────────────────────
export function tickWorld(S, days, m = computeMods(S)) {
  const W = S.world;
  // ── The two run-ups the world can force an ending out of ─────────────────
  // Counted first, off the values the day *opened* on, because everything
  // below this line rebuilds heat and the GDP share from the model and a
  // streak measured after the rebuild is a streak measured against a number
  // that has already moved. Both are runs of *consecutive* days, reset by one
  // day out of the band: a company that cools off for a week is not a week
  // closer to a hearing. The warning cards read the same counters a third and
  // half of the way in, which is why neither ending can be a surprise.
  W.natRun = (W.regulatoryHeat >= EF.NAT_HEAT && W.globalGdpShare > EF.NAT_GDP
    && S.company.act >= EF.NAT_ACT) ? (W.natRun || 0) + days : 0;
  W.unsupRun = (S.resources.alignment <= EF.UNSUP_ALIGN && S.company.act >= EF.UNSUP_ACT)
    ? (W.unsupRun || 0) + days : 0;

  // GDP share = economic activity *mediated* by your systems, not your take.
  const gdp = WORLD.GDP_2027 * Math.pow(1 + WORLD.GDP_GROWTH, S.time.day / 360);
  const arr = totalMrr(S) * 12;
  // Take-rate inversion: your revenue is a slice of the activity you mediate.
  // Bounded so that even a maximal run lands below total capture — the last
  // stretch of the curve should stay out of reach.
  let mediation = WORLD.MEDIATION_BASE;
  if (S.research.done.platform_play) mediation += WORLD.MEDIATION_PLATFORM;
  if (S.research.done.ecosystem_lock) mediation += WORLD.MEDIATION_ECOSYSTEM;
  if (S.research.done.default_infrastructure) mediation += WORLD.MEDIATION_INFRA;
  if (S.research.done.vertical_integration) mediation += WORLD.MEDIATION_VERTICAL;
  if (S.research.done.shadow_government) mediation += WORLD.MEDIATION_SHADOW;
  if (S.research.done.economic_singularity) mediation += WORLD.MEDIATION_SINGULARITY;
  if (S.research.done.autonomous_corporation) mediation += WORLD.MEDIATION_AUTONOMOUS;
  mediation *= Math.min(WORLD.MEDIATION_CONTROL_CAP,
    1 + (W.controlPoints || 0) * WORLD.MEDIATION_CONTROL_RATE);
  mediation = Math.min(WORLD.MEDIATION_CAP, mediation);
  W.globalGdpShare = clamp(arr * mediation / gdp, 0, WORLD.GDP_SHARE_CAP);

  // Regulatory heat: rises with scale and low alignment, falls with lobbying.
  // The drivers live in `heatDrivers` so the World view's "why" panel reads the
  // same arithmetic rather than a second copy of it.
  const h = heatDrivers(S, m);
  // `heatRate` scales what accrues, not what decays: the Ghost draws less
  // scrutiny for the same company, and still cools at the ordinary rate.
  W.regulatoryHeat = clamp(W.regulatoryHeat + (h.accrual * m.heatRate - h.decay) * days
    * WORLD.HEAT_ADJUST_RATE, 0, Math.min(100, m.heatCap));

  // Public opinion drifts
  const target = opinionTarget(S, m);
  W.publicOpinion += ((target - W.publicOpinion) * WORLD.OPINION_CONVERGENCE
    + (m['+opinionDrift'] || 0) * clamp(1 - W.publicOpinion, 0, 1)
      * WORLD.OPINION_DRIFT_GAIN) * days;
  W.publicOpinion = clamp(Math.max(W.publicOpinion, m.opinionFloor), 0, 1);

  // §A24. A rival crossed the line and the founder did not fold. One call,
  // after both numbers are built, because a world with somebody else's AGI in
  // it prices a second-best company differently. It is the identity when
  // nobody has crossed.
  repriceForSecond(S);

  // AI safety concern rises with capability
  W.aiSafetyConcern = clamp(WORLD.SAFETY_BASE
    + Object.keys(S.research.done).length * WORLD.SAFETY_PER_RESEARCH
    + (1 - S.resources.alignment) * WORLD.SAFETY_MISALIGN_RATE
    + (S.company.act >= 4 ? WORLD.SAFETY_LATE_ACT_ADD : 0), 0, 1);

  // Doom clock — narrative tension for Act IV/V
  W.doomClock = clamp((1 - S.resources.alignment) * WORLD.DOOM_MISALIGN_RATE
    + (S.company.act >= 4 ? WORLD.DOOM_LATE_ACT_ADD : 0)
    + W.regulatoryHeat * WORLD.DOOM_HEAT_RATE
    - S.world.publicOpinion * WORLD.DOOM_OPINION_RELIEF, 0, 100);

  // ── §F2 The Act V clock ───────────────────────────────────────────────────
  // Act V had no clock at all, so a run that lingered held every gate open for
  // as long as it liked and "choose the ending you want" meant "choose all of
  // them, eventually". Two things fix that, and neither is a timer on the
  // player. The first is drift, which was always there and was never shown:
  // alignment falls while the company is pointed at the frontier and approval
  // falls as the share of world output rises, so Steward and the Refusal close
  // themselves and the Ascension panel now says roughly when. The second is
  // the world getting there first — a rival crossing, a hearing, a
  // breakthrough — which after `ACT5_WINDOW` days seals one gate for good.
  // The doom clock is what shortens that window: the more dangerous the world
  // has become, the less time it will wait.
  trackDrift(W, S, days);
  if (S.company.act >= 5) {
    W.act5Days = (W.act5Days || 0) + days;
    const shorten = 1 - clamp(W.doomClock / 100, 0, 1) * EF.ACT5_DOOM_SHORTEN;
    W.act5Window = Math.max(EF.ACT5_WINDOW_MIN, EF.ACT5_WINDOW * shorten);
    W.act5Due = W.act5Days >= W.act5Window;
  }
}

// The rates behind "closes in ~N days". An exponential moving average of the
// daily change in each of the four numbers a gate can drift on, kept on the
// world so it survives a save and costs one subtraction a tick. It is a
// measurement rather than a model: whatever is actually moving alignment or
// approval today is what the readout reports.
function trackDrift(W, S, days) {
  if (!(days > 0)) return;
  const d = (W.drift ??= {});
  const gain = Math.min(1, WORLD.DRIFT_EMA * days);
  const upd = (k, v) => {
    const prev = d[k];
    if (!prev || !Number.isFinite(prev.v)) { d[k] = { v, rate: 0 }; return; }
    const per = (v - prev.v) / days;
    d[k] = { v, rate: prev.rate + (per - prev.rate) * gain };
  };
  upd('align', S.resources.alignment);
  upd('opinion', W.publicOpinion);
  upd('gdp', W.globalGdpShare);
  upd('race', playerProgress(S));
}

// ── §F2 What each gate is doing, in days ────────────────────────────────────
// A pure read of the drift above against the threshold each ending's `when`
// tests. `dir` is what is happening; `days` is roughly how long until it
// happens. Answers `null` for a gate that turns on a flag rather than a
// number, because "closes in ~N days" would be a lie about those.
const GATE_TESTS = {
  steward: [['align', 0.75, 'above', 'Alignment'], ['opinion', 0.65, 'above', 'Approval']],
  refusal: [['align', 0.70, 'above', 'Alignment']],
  sovereign: [['gdp', 0.20, 'above', 'GDP share']],
};

export function gateClock(S, id) {
  const sealed = S.world?.sealed?.[id];
  if (sealed) return { dir: 'sealed', days: 0, what: '', day: sealed };
  const tests = GATE_TESTS[id];
  const d = S.world?.drift;
  if (!tests || !d) return null;
  let worst = null;
  for (const [key, threshold, side, label] of tests) {
    const cur = d[key];
    if (!cur || !Number.isFinite(cur.v)) continue;
    const met = side === 'above' ? cur.v >= threshold : cur.v <= threshold;
    const gap = side === 'above' ? cur.v - threshold : threshold - cur.v;
    const rate = side === 'above' ? cur.rate : -cur.rate;
    // Closing when it is met and falling; opening when it is not met and rising.
    if (Math.abs(rate) < WORLD.DRIFT_FLAT) continue;
    const days = Math.abs(gap / rate);
    if (!Number.isFinite(days) || days > WORLD.DRIFT_HORIZON) continue;
    const dir = met ? (rate < 0 ? 'closing' : null) : (rate > 0 ? 'opening' : 'closing');
    if (!dir) continue;
    if (!worst || days < worst.days) worst = { dir, days: Math.round(days), what: label };
  }
  return worst;
}

// Which gates the world has closed for good, and on which day.
export function sealedEndings(S) { return S.world?.sealed || {}; }

// One gate, closed. Called from the §F2 cards in `events_race.js` through
// `fx.flags`, and by the world card that reads `act5Due`.
export function sealEnding(S, id, why) {
  if (!id || S.world?.sealed?.[id]) return false;
  (S.world.sealed ??= {})[id] = Math.floor(S.time.day);
  S.world.act5Days = 0;
  S.world.act5Due = false;
  markDirty();
  emit('ending:sealed', { id, why: why || '' });
  return true;
}

// ── Endings ────────────────────────────────────────────────────────────────
export { ENDINGS };

// Only `auto` endings fire on their own. Everything else is a choice the
// player makes from the Ascension panel once Act V is reached.
export function checkEnding(S) {
  if (S.ending) return null;
  for (const e of ENDINGS) {
    if (!e.auto) continue;
    try { if (e.when(S)) return e; } catch (err) { /* skip */ }
  }
  return null;
}

export function availableEndings(S) {
  const sealed = sealedEndings(S);
  return ENDINGS.filter((e) => !e.auto && !e.viaEvent).map((e) => {
    let ok = false;
    try { ok = e.when(S); } catch (err) { ok = false; }
    const prog = endingProgress(S, e.id);
    // Doing the three things IS the qualification. The narrative gate only
    // governs whether you may begin building this path at all. §F2 adds the
    // one thing that is not up to the founder: a gate the world has closed.
    return { ...e, gateMet: ok && !sealed[e.id], progress: prog, sealed: sealed[e.id] || null,
             clock: gateClock(S, e.id),
             available: endingReady(S, e.id) && !sealed[e.id] };
  });
}

// The Lifestyle Business: the one ending you take by *not* going on. Offered
// on the Legacy view while the company is small, good and paid for — Acts II
// and III, Frugal Empire earned, which means four months profitable without
// ever having raised. It is the only exit in the game that is not a climax.
export function lifestyleExit(S) {
  const act = S?.company?.act || 1;
  if (S?.ending) return { open: false, why: 'the run is over' };
  if (!EF.LIFESTYLE_ACTS.includes(act)) {
    return { open: false, why: act < EF.LIFESTYLE_ACTS[0] ? 'not yet — Act II' : 'too late — the company outgrew it' };
  }
  if (!(S?.doctrines?.earned || {}).frugal_empire) {
    return { open: false, why: 'needs Frugal Empire' };
  }
  return { open: true, why: '' };
}

export function triggerEnding(S, id, value) {
  const e = ENDINGS.find((x) => x.id === id);
  if (!e) return null;
  // §F2. A gate the world closed is closed. The button is disabled, but the
  // refusal belongs here rather than in one housing's click handler.
  if (S.world?.sealed?.[id] && !e.auto) return null;
  S.ending = { id: e.id, name: e.name, tone: e.tone, day: Math.floor(S.time.day), value: value ?? S.company.valuation };
  S.legacy.endings[e.id] = (S.legacy.endings[e.id] || 0) + 1;
  emit('ending', { ending: e, state: S });
  return e;
}
