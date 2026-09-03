// ─────────────────────────────────────────────────────────────────────────────
// THE BOARD, AND THE QUARTER — §A6 and §A7.
//
// Two rhythms that share a clock and are otherwise independent.
//
// **The quarter** belongs to every run. Every `BOARD.QUARTER_DAYS` the founder
// may set up to three intentions from `src/data/quarters.js`, and ninety days
// later a review card reads them back. A founder who never opens the panel
// gets a review card that says so and costs nothing; the mechanic is opt-in
// and its reward is deliberately small.
//
// **The board** belongs only to a run that sold a priced round. It forms on
// the first Series A or later, seats itself off the cap table, and from then
// on meets quarterly with an ask chosen from the numbers it would actually be
// reading. Accepting the ask is a target and a cost; refusing it is a straight
// hit to confidence. Confidence is the only number the board has, and
// everything it can do to a founder is a threshold on it: two quarters low and
// the standing order stops being the founder's to set, three at the floor —
// and only once the founder has sold control — and the founder stops being the
// founder.
//
// Nothing here draws from the RNG on a render path. `pickAsk` is the one draw
// and it happens inside `tickBoard`, once a quarter, never in a view.
// ─────────────────────────────────────────────────────────────────────────────
import { BOARD, QUARTER } from '../data/balance.js';
import { ASKS, ASK_MAP, FUNDS } from '../data/board.js';
import { INTENTIONS, INTENTION_MAP } from '../data/quarters.js';
import { totalUsers, totalMrr } from './product.js';
import { runwayDays } from './economy.js';
import { markDirty } from './modifiers.js';
import { weightedPick } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';

// ── The quarter ─────────────────────────────────────────────────────────────

// Everything an intention is judged against, read once at the boundary. `prev`
// is the same reading from the boundary before it, so "ship what you shipped
// last quarter" is a target and not a guess.
function snapshot(S, prev = null) {
  return {
    day: Math.floor(S.time.day),
    features: S.stats?.featuresShipped || 0,
    users: Math.round(totalUsers(S)),
    mrr: Math.round(totalMrr(S)),
    debt: Math.round(S.resources?.techDebt || 0),
    rounds: S.stats?.roundsRaised || 0,
    prev: prev ? { features: prev.features, users: prev.users, mrr: prev.mrr } : null,
  };
}

export function quarterState(S) {
  const c = S.company;
  if (!c.quarter || typeof c.quarter !== 'object') {
    c.quarter = { start: Math.floor(S.time.day), n: 1, intentions: [], snap: snapshot(S), due: false };
  }
  c.quarter.intentions ??= [];
  c.quarter.snap ??= snapshot(S);
  return c.quarter;
}

export function quarterNumber(S) { return quarterState(S).n || 1; }
export function quarterDaysLeft(S) {
  const q = quarterState(S);
  return Math.max(0, Math.ceil(q.start + BOARD.QUARTER_DAYS - S.time.day));
}
export function quarterDue(S) { return !!quarterState(S).due; }

// The intentions this founder could set today, each with the number it would
// be judged against. Pure — the Desk renders it seven times a second.
export function availableIntentions(S) {
  const q = quarterState(S);
  const out = [];
  for (const it of INTENTIONS) {
    let ok = false;
    try { ok = !it.when || !!it.when(S); } catch (e) { ok = false; }
    if (!ok) continue;
    let base = null;
    try { base = it.base(S, q.snap); } catch (e) { continue; }
    if (base == null) continue;
    const chosen = q.intentions.find((x) => x.id === it.id);
    out.push({
      ...it,
      base: chosen ? chosen.base : base,
      chosen: !!chosen,
      line: safeLabel(it, chosen ? chosen.base : base, S),
    });
  }
  return out;
}

function safeLabel(it, base, S) {
  try { return String(it.label(base, S)); } catch (e) { return it.name; }
}

// The founder's own hand. Toggling off is free and toggling on is free: an
// intention costs nothing to set, because the whole point is that saying it is
// the commitment. What it cannot do is exceed three, or be set on a quarter
// whose review is already due.
export function toggleIntention(S, id) {
  const q = quarterState(S);
  if (q.due) return { ok: false, reason: 'review-due' };
  const it = INTENTION_MAP[id];
  if (!it) return { ok: false, reason: 'unknown' };
  const at = q.intentions.findIndex((x) => x.id === id);
  if (at >= 0) { q.intentions.splice(at, 1); emit('quarter:plan', { id, on: false }); return { ok: true, on: false }; }
  if (q.intentions.length >= QUARTER.MAX_INTENTIONS) return { ok: false, reason: 'full' };
  let base = null;
  try { base = it.base(S, q.snap); } catch (e) { return { ok: false, reason: 'unknown' }; }
  if (base == null) return { ok: false, reason: 'unknown' };
  q.intentions.push({ id, base });
  emit('quarter:plan', { id, on: true });
  return { ok: true, on: true };
}

// What the review card reads back. Pure, so the card body and the effect see
// the same list.
export function quarterReading(S) {
  const q = quarterState(S);
  const rows = q.intentions.map((x) => {
    const it = INTENTION_MAP[x.id];
    if (!it) return null;
    let kept = false;
    try { kept = !!it.test(S, q.snap, x.base); } catch (e) { kept = false; }
    return { id: x.id, name: it.name, icon: it.icon, colour: it.colour,
             line: safeLabel(it, x.base, S), kept };
  }).filter(Boolean);
  return { n: q.n || 1, start: q.start, rows,
           kept: rows.filter((r) => r.kept).length, total: rows.length };
}

// Applied by the review card's own effect, then the quarter rolls. `fx` is the
// deck's collector, so everything the review pays shows up in the Log like any
// other card's effects.
export function closeQuarter(S, fx) {
  const reading = quarterReading(S);
  const b = boardState(S);
  for (const r of reading.rows) {
    if (!r.kept) continue;
    // §A2. What the founder said they would do, and did. Act IV closes on one
    // of these, so it is counted for the whole run rather than for the quarter.
    S.stats.intentionsKept = (S.stats.intentionsKept || 0) + 1;
    S.stats.lastIntentionKeptDay = Math.floor(S.time.day);
    fx.rep(QUARTER.KEPT_REP);
    fx.focus(QUARTER.KEPT_FOCUS);
    fx.align(QUARTER.KEPT_ALIGN);
    if (b) b.confidence = clamp(b.confidence + QUARTER.BOARD_KEPT_CONFIDENCE, 0, 1);
  }
  if (reading.total > 0 && reading.kept === reading.total) fx.insight(QUARTER.ALL_KEPT_INSIGHT);
  rollQuarter(S);
  markDirty();
  return reading;
}

// Forward to the boundary the clock is actually past, not one quarter on: a
// long offline catch-up can cross several, and the review that comes back
// should open the quarter the founder is in.
function rollQuarter(S) {
  const q = quarterState(S);
  const prev = q.snap;
  let start = q.start;
  let n = q.n || 1;
  while (S.time.day >= start + BOARD.QUARTER_DAYS) { start += BOARD.QUARTER_DAYS; n++; }
  q.start = start;
  q.n = n;
  q.intentions = [];
  q.snap = snapshot(S, prev);
  q.due = false;
}

// ── The board ───────────────────────────────────────────────────────────────

export function hasBoard(S) { return !!S?.company?.board; }
export function boardState(S) { return S?.company?.board || null; }

// One seat per `EQUITY_PER_SEAT` of investor equity, named off the rounds that
// bought them. Pure and deterministic: the same cap table always seats the
// same room, so the board does not reshuffle between two renders.
export function seatsFor(S) {
  const inv = S.company?.equity?.investors || 0;
  const n = clamp(Math.floor(inv / BOARD.EQUITY_PER_SEAT) + 1, 1, BOARD.MAX_SEATS);
  const priced = (S.company?.rounds || []).filter((r) => BOARD.PRICED.includes(r.type));
  const crane = !!S.narrative?.flags?.crane_invested;
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = FUNDS[i % FUNDS.length];
    const r = priced[i] || priced[priced.length - 1] || null;
    out.push({
      id: `seat${i}`,
      fund: i === 0 && crane ? FUNDS[0].name : f.name,
      person: i === 0 && crane ? 'Ellis Crane' : f.person,
      char: i === 0 && crane ? 'crane' : null,
      via: r ? r.name : 'the round',
      share: Math.min(inv, BOARD.EQUITY_PER_SEAT),
    });
  }
  return out;
}

// Called from the `round:raised` bridge. The board forms on the first priced
// round and re-seats itself on every one after it.
export function noteRound(S, roundType) {
  if (!BOARD.PRICED.includes(roundType)) return null;
  const c = S.company;
  if (!c.board) {
    c.board = {
      since: Math.floor(S.time.day),
      chair: S.narrative?.flags?.crane_invested ? 'crane' : null,
      seats: [],
      asks: [],
      confidence: BOARD.START_CONFIDENCE,
      nextMeeting: Math.floor(S.time.day) + BOARD.QUARTER_DAYS,
      lowQuarters: 0, floorQuarters: 0,
      ask: null, due: false, forcedUntil: 0, warned: 0, removeRun: 0,
    };
    emit('board:formed', { since: c.board.since });
  }
  c.board.seats = seatsFor(S);
  c.board.chair = c.board.chair || (S.narrative?.flags?.crane_invested ? 'crane' : null);
  markDirty();
  return c.board;
}

export function confidence(S) {
  const b = boardState(S);
  return b ? clamp(b.confidence ?? BOARD.START_CONFIDENCE, 0, 1) : null;
}

export function confidenceWord(v) {
  if (v == null) return '';
  if (v >= 0.75) return 'behind you';
  if (v >= 0.55) return 'satisfied';
  if (v >= 0.4) return 'watchful';
  if (v >= BOARD.LOW) return 'unconvinced';
  if (v > BOARD.FLOOR) return 'hostile';
  return 'counting votes';
}

// The founder cannot outvote the room. Read by the removal path and printed on
// the Market view, because "you sold control" should be a fact a player can
// see rather than a surprise at a hearing.
export function lostControl(S) {
  return (S.company?.equity?.founder ?? 1) < BOARD.CONTROL_EQUITY;
}

// §A6's veto. A board that has lost confidence will not sit still for the two
// commitments that spend the company on something other than the company.
// `commitments.js` reads this in a `can` clause and prints `why` as the hint.
const VETOED = {
  st_oversight: 'binding external oversight',
  st_endow: 'endowing the commons',
  rf_freeze: 'a capability freeze',
  rf_publish: 'publishing the weights',
};
export function boardVeto(S, commitmentId) {
  const b = boardState(S);
  if (!b || !VETOED[commitmentId]) return null;
  if ((b.confidence ?? 1) >= BOARD.LOW) return null;
  return {
    note: 'BOARD',
    why: `The board will not approve ${VETOED[commitmentId]} at ${Math.round((b.confidence ?? 0) * 100)}% confidence. Win a quarter back first.`,
  };
}

// Is the standing order the founder's to set? Two low quarters and it is not.
export function orderLocked(S) {
  const b = boardState(S);
  if (!b || !(b.forcedUntil > S.time.day)) return null;
  return { note: 'BOARD', until: Math.ceil(b.forcedUntil - S.time.day),
           why: `The board set Harvest for the quarter. ${Math.ceil(b.forcedUntil - S.time.day)} days left of it.` };
}

// ── The quarterly meeting ───────────────────────────────────────────────────

function pickAsk(S) {
  const pool = [];
  const weights = [];
  for (const a of ASKS) {
    let ok = false;
    try { ok = !a.when || !!a.when(S); } catch (e) { ok = false; }
    if (!ok) continue;
    let base = null;
    try { base = a.base(S); } catch (e) { continue; }
    if (base == null) continue;
    let w = 1;
    try { w = Math.max(0.05, a.weight ? a.weight(S) : 1); } catch (e) { w = 1; }
    pool.push({ id: a.id, base });
    weights.push(w);
  }
  if (!pool.length) return null;
  return weightedPick(pool, weights);
}

// What the board card reads. Pure.
export function pendingAsk(S) {
  const b = boardState(S);
  if (!b || !b.due || !b.ask) return null;
  const def = ASK_MAP[b.ask.id];
  if (!def) return null;
  let line = def.name;
  try { line = String(def.label(b.ask.base, S)); } catch (e) { /* keep the name */ }
  return { ...def, base: b.ask.base, line };
}

export function boardDue(S) { return !!boardState(S)?.due; }

// The last ask, and whether it was kept — what the *next* meeting opens with.
export function lastAsk(S) {
  const b = boardState(S);
  const a = (b?.asks || [])[0];
  if (!a) return null;
  const def = ASK_MAP[a.id];
  return def ? { ...a, name: def.name, icon: def.icon } : a;
}

// Accepting. The target goes in the minutes, the cost lands today, and
// confidence moves on the day rather than at the next meeting — a board that
// got what it asked for is happier before it finds out whether you did it.
export function acceptAsk(S, fx) {
  const b = boardState(S);
  const ask = pendingAsk(S);
  if (!b || !ask) return null;
  let note = '';
  try { note = String(ask.accept(S, fx) || ''); } catch (e) { note = ''; }
  b.asks.unshift({ id: ask.id, base: ask.base, day: Math.floor(S.time.day), accepted: true, kept: null });
  if (b.asks.length > 12) b.asks.length = 12;
  b.confidence = clamp(b.confidence + BOARD.ACCEPT_GAIN, 0, 1);
  b.ask = null; b.due = false;
  markDirty();
  emit('board:ask', { id: ask.id, accepted: true });
  return note;
}

export function refuseAsk(S) {
  const b = boardState(S);
  const ask = pendingAsk(S);
  if (!b || !ask) return null;
  b.asks.unshift({ id: ask.id, base: ask.base, day: Math.floor(S.time.day), accepted: false, kept: null });
  if (b.asks.length > 12) b.asks.length = 12;
  b.confidence = clamp(b.confidence - BOARD.REFUSE_LOSS, 0, 1);
  b.ask = null; b.due = false;
  markDirty();
  emit('board:ask', { id: ask.id, accepted: false });
  return ask;
}

// The costly door out of a removal vote: buy a slice of the company back at a
// premium. It is priced off the valuation rather than the equity, because what
// is being bought is not the shares — it is the quarter.
export function buybackCost(S) {
  return Math.max(1e5, (S.company?.valuation || 0) * BOARD.BUYBACK_VAL_SHARE);
}
export function canBuyback(S) { return S.company.cash >= buybackCost(S); }
export function buyback(S, fx) {
  const b = boardState(S);
  if (!b) return null;
  const cost = buybackCost(S);
  fx.cash(-cost);
  const back = Math.min(BOARD.BUYBACK_EQUITY, S.company.equity.investors);
  S.company.equity.investors -= back;
  S.company.equity.founder = clamp(S.company.equity.founder + back, 0, 1);
  b.confidence = Math.max(b.confidence, BOARD.BUYBACK_CONFIDENCE);
  b.floorQuarters = 0;
  b.removeRun = 0;
  b.seats = seatsFor(S);
  markDirty();
  return { cost, back };
}

// ── The tick ────────────────────────────────────────────────────────────────

// The quarter's performance, in the two lines a board actually reads. Both are
// bounded swings on confidence and both are computed at the meeting, so a run
// that fixed the burn on the last day of the quarter gets the credit.
function performance(S) {
  const g = S.company.growthRate30 ?? 0;
  const growth = clamp((g - BOARD.PERF_GROWTH_TARGET) / (BOARD.PERF_GROWTH_TARGET * 2), -1, 1)
    * BOARD.PERF_GROWTH_SWING;
  let rw = 9999;
  try { const r = runwayDays(S); rw = Number.isFinite(r) ? r : 9999; } catch (e) { rw = 9999; }
  const runway = clamp((rw - BOARD.PERF_RUNWAY_DAYS) / BOARD.PERF_RUNWAY_DAYS, -1, 1)
    * BOARD.PERF_RUNWAY_SWING;
  return { growth, runway, total: growth + runway };
}

export function tickBoard(S, days) {
  const q = quarterState(S);
  // The quarter's review comes due on the boundary and the card takes it from
  // there. It is set here rather than tested in the card's `when` so that an
  // offline stretch cannot silently skip a review.
  if (!q.due && S.time.day >= q.start + BOARD.QUARTER_DAYS) { q.due = true; markDirty(); }

  const b = boardState(S);
  if (!b) return null;
  b.confidence = clamp(b.confidence ?? BOARD.START_CONFIDENCE, 0, 1);
  // A meeting waiting on a card that can never be drawn is a board that never
  // meets again. If `due` is set with nothing behind it — an ask whose
  // definition has gone, a save written mid-meeting — clear it and let the
  // next boundary put up a fresh one.
  if (b.due && !pendingAsk(S)) { b.due = false; b.ask = null; }
  // The forced order is enforced here rather than by disabling a button. The
  // Desk shows the lock and refuses, but a founder who reaches the directive
  // another way finds it back the following morning — which is what "the board
  // set the standing order" means, and it needs no guard in `main.js`.
  if (b.forcedUntil > S.time.day && S.company.directive !== 'harvest') {
    S.company.directive = 'harvest';
    S.company.directiveSince = S.time.day;
    markDirty();
  }
  if (b.due || S.time.day < (b.nextMeeting ?? 0)) return b;

  // The meeting. Everything below happens once a quarter, in `tickBoard`,
  // never in a view: `pickAsk` is the only RNG draw the board makes.
  const prev = b.asks[0];
  if (prev && prev.accepted && prev.kept == null) {
    const def = ASK_MAP[prev.id];
    let kept = false;
    try { kept = !!def?.test(S, prev.base); } catch (e) { kept = false; }
    prev.kept = kept;
    b.confidence = clamp(b.confidence + (kept ? BOARD.KEPT_GAIN : -BOARD.MISSED_LOSS), 0, 1);
  }
  b.confidence = clamp(b.confidence + performance(S).total, 0, 1);
  // With nothing else happening, a board drifts toward mild satisfaction.
  b.confidence = clamp(b.confidence + (BOARD.DRIFT_TO - b.confidence) * BOARD.DRIFT_RATE, 0, 1);

  // Two quarters under LOW and the standing order stops being yours. The
  // guard is `!S._offline` for the same reason the emergency spin-down has
  // one: coming back from a closed tab to a company running an order you did
  // not set is a punishment for closing a tab.
  if (b.confidence < BOARD.LOW) b.lowQuarters = (b.lowQuarters || 0) + 1;
  else b.lowQuarters = 0;
  if (!S._offline && b.lowQuarters >= BOARD.LOW_QUARTERS && !(b.forcedUntil > S.time.day)) {
    S.company.directive = 'harvest';
    S.company.directiveSince = S.time.day;
    b.forcedUntil = S.time.day + BOARD.HARVEST_LOCK_DAYS;
    emit('board:forced', { directive: 'harvest', days: BOARD.HARVEST_LOCK_DAYS });
  }

  // And the vote. Only a founder who has actually sold control can be removed;
  // `removeRun` is what the `removed` ending and the warning card both read.
  if (b.confidence <= BOARD.FLOOR && lostControl(S)) b.floorQuarters = (b.floorQuarters || 0) + 1;
  else b.floorQuarters = 0;
  b.removeRun = b.floorQuarters;

  b.ask = pickAsk(S);
  b.due = !!b.ask;
  b.nextMeeting = S.time.day + BOARD.QUARTER_DAYS;
  b.seats = seatsFor(S);
  markDirty();
  emit('board:meeting', { confidence: b.confidence, ask: b.ask?.id || null });
  return b;
}

// One line for the Market view's ledger column and for the Record. Pure.
export function boardReading(S) {
  const b = boardState(S);
  if (!b) return null;
  const c = clamp(b.confidence ?? 0, 0, 1);
  return {
    confidence: c,
    word: confidenceWord(c),
    seats: (b.seats || []).length || seatsFor(S).length,
    chair: b.chair,
    since: b.since,
    lowQuarters: b.lowQuarters || 0,
    floorQuarters: b.floorQuarters || 0,
    control: !lostControl(S),
    locked: orderLocked(S),
    last: lastAsk(S),
    nextIn: Math.max(0, Math.ceil((b.nextMeeting ?? S.time.day) - S.time.day)),
  };
}
