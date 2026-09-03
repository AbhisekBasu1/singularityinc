// ─────────────────────────────────────────────────────────────────────────────
// THE NEMESIS — designation, escalation, and the moves themselves.
//
// A rival becomes the nemesis when they are big enough and have lasted long
// enough to matter. They stay the nemesis through bad quarters, because a
// rivalry that reassigns itself every fortnight is not a rivalry. The grudge
// rises when you beat them and when they beat you; it is a measure of how much
// of their attention you occupy, not of who is winning.
// ─────────────────────────────────────────────────────────────────────────────

import { MOVES, MOVE_MAP, COUNTERS, COUNTER_MAP, GOALS, GOAL_MAP, grudgeBand,
         APPROACH, APPROACH_META } from '../data/nemesis.js';
import { RIVAL_PERSONALITIES, activeCompetitors } from './market.js';
import { totalUsers, totalMrr } from './product.js';
import { pushFeed } from './feed.js';
import { computeMods, agentStats } from './modifiers.js';
import { INCIDENTS as IB } from '../data/balance.js';
import { fireAgent, intelLevel } from './agents.js';
import { AGENTS, NEMESIS as N } from '../data/balance.js';
import { REGION_MAP } from '../data/regions.js';
import { clamp } from '../engine/format.js';
import { chance, weightedPick, randRange, pick } from '../engine/rng.js';
import { emit } from '../engine/bus.js';

const DESIGNATE_AFTER_DAYS = N.DESIGNATE_AFTER_DAYS;
const DESIGNATE_THREAT = N.DESIGNATE_THREAT;

export function nemesisState(S) {
  if (!S.market.nemesis) S.market.nemesis = { id: null, grudge: 0, moves: [], since: 0, lowDays: 0 };
  // §A14. A save that predates the season grows one on the next tick.
  S.market.nemesis.season ??= null;
  S.market.nemesis.seasons ??= [];
  S.market.nemesis.quietDays ??= 0;
  // §H13. What they have started and not finished: a name they have gone
  // after, or a product they have named. A save from before this has none.
  S.market.nemesis.pending ??= null;
  return S.market.nemesis;
}

export function nemesisOf(S) {
  const n = nemesisState(S);
  if (!n.id) return null;
  return S.market.competitors.find((c) => c.id === n.id) || null;
}

// ── Designation ────────────────────────────────────────────────────────────
function designate(S) {
  const n = nemesisState(S);
  const eligible = activeCompetitors(S)
    .filter((c) => S.time.day - c.day >= DESIGNATE_AFTER_DAYS && c.threat >= DESIGNATE_THREAT)
    .sort((a, b) => b.threat - a.threat);
  const pickd = eligible[0];
  if (!pickd) return null;
  n.id = pickd.id;
  n.since = S.time.day;
  n.grudge = Math.max(n.grudge * 0.4, 0.2);   // some heat carries over from the last one
  n.moves = [];
  n.lowDays = 0;
  pickd.grudge = n.grudge;
  const pers = RIVAL_PERSONALITIES.find((p) => p.id === pickd.personality);
  pushFeed(S, {
    type: 'news', tone: 'bad', author: 'The Ledger',
    text: `**${pickd.name}** is now the company most often named in the same sentence as yours.`,
    meta: `${pers?.name || 'Rival'} · ${pickd.founder} · ${pers?.line || ''}`,
  });
  emit('nemesis:named', { competitor: pickd });
  return pickd;
}

function undesignate(S, c, why) {
  const n = nemesisState(S);
  n.id = null;
  n.lowDays = 0;
  if (why === 'dead') {
    pushFeed(S, { type: 'news', tone: 'good', author: 'The Ledger',
      text: `**${c.name}** has wound down. ${c.founder} posted a thread about it and then deleted the account.`,
      meta: 'You outlasted them. That is the whole of it.' });
  } else if (why === 'acquired') {
    pushFeed(S, { type: 'news', tone: 'good', author: 'The Ledger',
      text: `You now own **${c.name}**. ${c.founder} reports to nobody, on paper.`,
      meta: 'The rivalry is over, in the least satisfying way available.' });
  } else {
    pushFeed(S, { type: 'news', tone: 'neutral', author: 'The Ledger',
      text: `**${c.name}** has stopped being a comparison anyone makes.`,
      meta: 'They are still going. They are just not going at you.' });
  }
  emit('nemesis:ended', { competitor: c, why });
}

// ── The feud ───────────────────────────────────────────────────────────────
// Grudge tracks how much of their attention you occupy. Beating them badly
// raises it; being beaten badly raises it too.
function updateGrudge(S, c, days) {
  const n = nemesisState(S);
  const ours = Math.max(500, totalUsers(S));
  const ratio = c.users / ours;
  // Closest to parity is where a rivalry actually lives.
  const proximity = 1 - Math.min(1, Math.abs(Math.log10(clamp(ratio, 0.02, 50))) / 1.5);
  const drift = (0.004 + proximity * 0.012) * days;
  n.grudge = clamp(n.grudge + drift - 0.0015 * days, 0, 3.4);
  c.grudge = n.grudge;
}

// The moves Private Security closes: nobody gets to your people or your
// distribution once the perimeter has a doctrine. Sabotage is an incident,
// and incidents.js drops it from the pool for the same modifier.
const HOSTILE = new Set(['poach', 'channel', 'sabotage']);

// ── §A14 The season ─────────────────────────────────────────────────────────
// They choose something to be trying to do, say enough about it in the Wire
// that a founder paying attention can work it out, spend a season's moves on
// it, and at the end of it one of them was right. `S.market.nemesis.season`
// holds the whole of it, and the last few are kept so the Market view can
// print a record rather than a mood.

export function activeGoal(S) {
  const n = nemesisState(S);
  const se = n.season;
  if (!se) return null;
  const g = GOAL_MAP[se.goal];
  return g ? { ...se, def: g, name: g.name, sub: g.sub } : null;
}

// The number the goal is judged against, read on the day the season opens.
function seasonMark(S, c, goal) {
  if (goal.id === 'category') return c.users;
  if (goal.id === 'story') return S.resources.reputation || 0;
  return 0;
}

function openSeason(S, c) {
  const n = nemesisState(S);
  const usable = GOALS.map((g) => ({ g, t: safeCall(() => g.pick(S, c)) })).filter((x) => x.t);
  if (!usable.length) return null;
  const chosen = weightedPick(usable, usable.map((x) => x.g.weight ?? 1));
  const { g, t } = chosen;
  n.season = {
    goal: g.id, key: t.key, label: t.label, startedDay: Math.floor(S.time.day),
    mark: seasonMark(S, c, g), moves: 0, told: false,
    regionName: g.id === 'bloc' ? (REGION_MAP[t.key]?.name || t.label) : null,
  };
  // The telegraph. One line, in their founder's voice, that gives the season
  // away without naming it — which is what `intelReveals` is for.
  const line = safeCall(() => g.telegraph(S, c, n.season)) || '';
  if (line) {
    pushFeed(S, { type: 'social', tone: 'bad', author: c.handle || `@${c.founder.split(' ')[0].toLowerCase()}`,
      text: fillLine(line, S, c), meta: `${c.name} · ${N.TELEGRAPH_META}` });
    n.season.told = true;
  }
  emit('nemesis:season', { competitor: c, season: n.season, goal: g });
  return n.season;
}

function closeSeason(S, c) {
  const n = nemesisState(S);
  const se = n.season;
  if (!se) return;
  const g = GOAL_MAP[se.goal];
  const won = g ? !!safeCall(() => g.judge(S, c, se, se)) : false;
  const text = g ? safeCall(() => (won ? g.won : g.lost)(S, c, se, se)) : '';
  if (text) {
    pushFeed(S, { type: 'news', tone: won ? 'bad' : 'good', author: 'The Ledger',
      text: fillLine(text, S, c), meta: `${c.name} · ${won ? N.SEASON_WON : N.SEASON_LOST}` });
  }
  n.seasons.unshift({ goal: se.goal, label: se.label, day: Math.floor(S.time.day), won, moves: se.moves });
  if (n.seasons.length > N.SEASONS_KEEP) n.seasons.length = N.SEASONS_KEEP;
  // Winning a season is its own escalation; losing one costs them nothing but
  // the quarter, and a rival who has just failed is a rival with something to
  // prove.
  n.grudge = clamp(n.grudge + (won ? N.SEASON_WON_GRUDGE : N.SEASON_LOST_GRUDGE), 0, 3.4);
  c.grudge = n.grudge;
  n.season = null;
  emit('nemesis:season_end', { competitor: c, won, goal: g });
}

function safeCall(fn) { try { return fn(); } catch { return null; } }

function movePool(S, c) {
  const n = nemesisState(S);
  const mods = computeMods(S);
  const recent = n.moves.slice(0, 3).map((m) => m.id);
  return MOVES.filter((m) => {
    if (m.min > n.grudge) return false;
    if (m.only && !m.only.includes(c.personality)) return false;
    if (m.need && !safe(m.need, S)) return false;
    if (mods.hostileImmune && HOSTILE.has(m.id)) return false;
    if (recent.includes(m.id)) return false;     // do not repeat themselves
    return true;
  });
}

function safe(fn, S) { try { return !!fn(S); } catch { return false; } }

function fillLine(text, S, c, ctx = {}) {
  const p = S.products[0];
  return String(text)
    .replace(/\{you\}/g, S.company.name)
    .replace(/\{them\}/g, c.name)
    .replace(/\{founder\}/g, c.founder)
    .replace(/\{product\}/g, p?.name || S.company.name)
    .replace(/\{cat\}/g, p?.category || 'category')
    .replace(/\{lane\}/g, ctx.lane || 'the')
    .replace(/\{agent\}/g, ctx.poached || ctx.approached || 'your best engineer');
}

// ── §H13 A move with a target, and a window ─────────────────────────────────
// A poach used to be a coin flip inside one tick: the roll, the departure and
// the line all in the same frame. `availableCounters` had existed since the
// feud did with nobody able to press anything against it, because by the time
// a founder read the Wire the answer was already in the past.
//
// So the move opens an *approach*: they pick a name (or a product), the money
// is on the table for `LEAD_DAYS`, and `resolvePending` below decides it. One
// at a time — two open windows is two modal decisions about the same feud —
// and only what the founder has bought the ability to see is telegraphed.

// What the founder can see of an approach before it lands. Intelligence agents
// on Operations read it off the recruiter traffic; a Vance who takes your
// calls simply tells you, which is what a warm tie to a rival is *for*.
export function seesApproach(S) {
  if (intelReveals(S)) return 'intel';
  const w = S.founder?.life?.ties?.vance?.warmth;
  return typeof w === 'number' && w >= N.TELEGRAPH_WARMTH ? 'vance' : null;
}

// The approach on the table, if there is one and it is still answerable.
export function pendingApproach(S) {
  const p = nemesisState(S).pending;
  if (!p) return null;
  return { ...p, answerable: !p.countered && S.time.day <= p.counterUntil };
}

function telegraph(S, c, p) {
  const how = seesApproach(S);
  if (!how) return;
  const lines = APPROACH[p.kind] || [];
  if (!lines.length) return;
  pushFeed(S, {
    type: 'news', tone: 'bad', author: how === 'vance' ? (c.handle || '@mvance') : 'Operations',
    text: fillLine(pick(lines), S, c, { lane: p.lane, product: p.product }),
    meta: how === 'vance' ? `${c.founder} · told you, and did not have to` : APPROACH_META,
  });
  p.told = how;
}

// They come for whoever is least happy and most used to acting alone, and the
// roll is against that agent's morale and autonomy — so the defence is the one
// the card has always shown you. Redundant agents are never in the draw. The
// rest of the roster feels it at the approach, which is what the move's `sub`
// has always said: everyone hears the number.
function poachAgent(S, c) {
  const m = computeMods(S);
  const n = nemesisState(S);
  const pool = (S.agents || []).filter((a) => a.status === 'active' && !agentStats(a, S, m).indestructible);
  const out = { effects: [], poached: null, approached: null };
  if (!pool.length || n.pending) return out;
  const target = weightedPick(pool, pool.map((a) => 0.05 + (1 - (a.morale ?? 1)) + (a.autonomy ?? 0.5) * 0.5));
  for (const a of S.agents) if (a !== target) a.morale = clamp((a.morale ?? 1) - AGENTS.POACH_ROSTER_MORALE_HIT, 0.1, 1);
  const odds = clamp(AGENTS.POACH_BASE + (1 - (target.morale ?? 1)) * AGENTS.POACH_MORALE_RATE
    + (target.autonomy ?? 0.5) * AGENTS.POACH_AUTONOMY_RATE, 0, AGENTS.POACH_MAX);
  const day = Math.floor(S.time.day);
  // The price of keeping them is what they already draw, for a quarter. It is
  // fixed when the window opens rather than read when the button is pressed,
  // so the number in the Market view is the number that is charged.
  const keepCost = Math.max(N.COUNTER_OFFER_FLOOR,
    Math.round(agentStats(target, S, m).upkeep * N.COUNTER_OFFER_DAYS));
  n.pending = { kind: 'poach', id: target.id, name: target.name,
                lane: target.lane || target.spec || 'the team', odds, keepCost,
                opened: day, resolveOn: day + N.LEAD_DAYS,
                counterUntil: day + Math.min(N.COUNTER_WINDOW_DAYS, N.LEAD_DAYS),
                countered: false, told: null };
  telegraph(S, c, n.pending);
  out.approached = target.name;
  out.effects = [[`${target.name} approached`, -1], ['morale', -Math.round(AGENTS.POACH_ROSTER_MORALE_HIT * 100)]];
  emit('nemesis:approach', { competitor: c, pending: n.pending });
  return out;
}

// The same shape, pointed at a product rather than a person. They name it, the
// week is spent mapping it, and the founder either hardens it or does not.
function sabotageTarget(S, c) {
  const n = nemesisState(S);
  const out = { effects: [], product: null };
  const p = (S.products || []).find((x) => x.id === S.activeProductId && x.launched)
    || (S.products || []).find((x) => x.launched);
  if (!p || n.pending) return out;
  const day = Math.floor(S.time.day);
  n.pending = { kind: 'sabotage', id: p.id, name: p.name, product: p.name,
                code: N.HARDEN_CODE, focus: N.HARDEN_FOCUS,
                opened: day, resolveOn: day + N.LEAD_DAYS,
                counterUntil: day + Math.min(N.COUNTER_WINDOW_DAYS, N.LEAD_DAYS),
                countered: false, told: null };
  telegraph(S, c, n.pending);
  out.product = p.name;
  out.effects = [[`${p.name} named`, -1]];
  emit('nemesis:approach', { competitor: c, pending: n.pending });
  return out;
}

// The day it lands. A counter-offer does not make an approach go away — it
// makes it much more likely to be refused, and the money is spent either way.
function resolvePending(S, c) {
  const n = nemesisState(S);
  const p = n.pending;
  if (!p || S.time.day < p.resolveOn) return;
  n.pending = null;
  // Nobody leaves while the founder is away, for the reason the emergency
  // spin-down never fires offline.
  if (S._offline) return;
  const handle = c?.handle || '@mvance';
  if (p.kind === 'poach') {
    const target = (S.agents || []).find((a) => a.id === p.id && a.status === 'active');
    if (!target) return;
    const cooled = S.time.day - (n.lastPoachDay ?? -1e9) >= AGENTS.POACH_COOLDOWN_DAYS;
    const odds = p.odds * (p.countered ? 1 - N.COUNTER_OFFER_ODDS : 1);
    if (cooled && chance(odds)) {
      fireAgent(S, target.id, 'poached');
      n.lastPoachDay = Math.floor(S.time.day);
      pushFeed(S, { type: 'social', tone: 'bad', author: handle,
        text: `${target.name} starts with us on monday. we did not have to ask twice.`,
        meta: `${c?.name || 'They'} · The offer was taken` });
      emit('nemesis:landed', { kind: 'poach', name: target.name, countered: !!p.countered });
      return;
    }
    target.morale = clamp((target.morale ?? 1) - AGENTS.POACH_TARGET_MORALE_HIT, 0.1, 1);
    pushFeed(S, { type: 'news', tone: p.countered ? 'good' : 'neutral', author: 'Operations',
      text: p.countered
        ? `${target.name} turned it down on Thursday. The offer you matched is on the record now, and so is the fact that you matched it.`
        : `${target.name} turned it down on Thursday and did not mention it until Monday, which is the part to think about.`,
      meta: `${c?.name || 'They'} · The offer was refused` });
    emit('nemesis:landed', { kind: 'poach', name: target.name, stayed: true, countered: !!p.countered });
    return;
  }
  if (p.kind === 'sabotage') {
    const relief = p.countered ? N.HARDEN_RELIEF : 0;
    const sev = IB.SABOTAGE_SEVERITY * (1 - relief);
    S.resources.techDebt += IB.SABOTAGE_DEBT * sev;
    S.company.cash -= IB.SABOTAGE_CASH * sev;
    if ((S.agents || []).length > 1 && !p.countered) {
      const a = pick(S.agents);
      if (a) a.morale = clamp((a.morale ?? 1) * IB.SABOTAGE_MORALE_MULT, 0.1, 1);
    }
    pushFeed(S, { type: 'news', tone: p.countered ? 'neutral' : 'bad', author: 'Operations',
      text: p.countered
        ? `Somebody spent four hours inside ${p.product} on Sunday and left with the same access they arrived with. The fortnight you spent was the cheapest fortnight of the quarter.`
        : `Somebody spent four hours inside ${p.product} on Sunday. What they took is not the interesting part; what they left is a fortnight of work and a bill.`,
      meta: `${c?.name || 'They'} · ${p.countered ? 'Held' : 'It landed'}` });
    emit('nemesis:landed', { kind: 'sabotage', name: p.product, countered: !!p.countered });
  }
}

// `forced` names a specific move; `lineOverride` replaces what they post while
// leaving the move's own effects alone. That is the whole shape of the world
// layer's authority here: it chooses which of the rival's real moves happens
// and writes the sentence, and the game keeps the consequences.
export function runMove(S, c, forced, lineOverride) {
  const n = nemesisState(S);
  const pool = forced ? [MOVE_MAP[forced]].filter(Boolean) : movePool(S, c);
  if (!pool.length) return null;
  if (forced && !movePool(S, c).some((m) => m.id === forced)) return null;
  // §A14. A season pulls the draw toward the moves that serve it. It is a
  // weight and nothing else: every move that was legal is still legal, and a
  // rival with no season draws exactly as it always did.
  const favours = GOAL_MAP[n.season?.goal]?.favours || [];
  const move = weightedPick(pool,
    pool.map((m) => m.weight * (favours.includes(m.id) ? N.GOAL_WEIGHT : 1)));
  const mods = computeMods(S);
  // What a move may reach into the game with, the way a card reaches through
  // `fx`: the data never imports a system. `ctx` carries back what happened
  // so the line can name it.
  const ctx = {};
  const sys = {
    poach: (S_, c_) => { const r = poachAgent(S_, c_); Object.assign(ctx, r); return r.effects; },
    sabotage: (S_, c_) => { const r = sabotageTarget(S_, c_); Object.assign(ctx, r); return r.effects; },
  };
  let effects = [];
  try { effects = move.effect(S, c, mods, sys) || []; } catch (e) { console.error('[nemesis]', move.id, e); effects = []; }

  pushFeed(S, {
    type: 'social', tone: move.id === 'respect' ? 'good' : 'bad',
    author: c.handle || `@${c.founder.split(' ')[0].toLowerCase()}`,
    text: fillLine(lineOverride || (typeof move.line === 'function' ? move.line(S, c, ctx) : move.line), S, c, ctx),
    meta: `${c.name} · ${move.sub}`,
  });

  n.moves.unshift({ id: move.id, name: move.name, day: Math.floor(S.time.day), effects,
                    forGoal: favours.includes(move.id) ? (n.season?.goal || null) : null });
  if (n.moves.length > 8) n.moves.pop();
  n.grudge = clamp(n.grudge + 0.06, 0, 3.4);
  c.grudge = n.grudge;
  if (n.season) n.season.moves++;
  n.quietDays = 0;
  emit('nemesis:move', { competitor: c, move, effects });
  return move;
}

// ── Tick ───────────────────────────────────────────────────────────────────
export function tickNemesis(S, days) {
  if (S.company.act < 2) return;
  const n = nemesisState(S);
  let c = nemesisOf(S);

  if (c && c.status !== 'active') { undesignate(S, c, c.status === 'acquired' ? 'acquired' : 'dead'); c = null; }

  if (!c) {
    // Do not immediately crown a replacement — let the last one be over.
    n.cooldown = Math.max(0, (n.cooldown || 0) - days);
    if (n.cooldown <= 0) { c = designate(S); if (c) n.cooldown = 0; else n.cooldown = 8; }
    if (!c) return;
  }

  updateGrudge(S, c, days);

  // §H13. Whatever they started resolves on its own day, whether or not they
  // move again this week.
  resolvePending(S, c);

  // §A14. The nemesis used to fade exactly when you got large: `threat` is a
  // ratio against your own scale, so a founder mediating four per cent of world
  // output outgrew every rival on the board and the feud simply stopped — the
  // one antagonist with a face, gone in the act it mattered most. It is not a
  // ratio that ends a rivalry now, it is silence: a whole season without a
  // single move against you and they have stopped being about you. And
  // Aperture never fades while it is alive, because Vance is written into the
  // last act whether or not his company is winning.
  n.quietDays += days;
  if (!c.scripted && n.quietDays > N.DROP_PATIENCE) {
    undesignate(S, c, 'faded'); n.cooldown = N.DROP_COOLDOWN; return;
  }

  // A season at a time. It opens with a line in the Wire, it weights their
  // moves, and it closes with somebody having been right.
  if (!n.season) openSeason(S, c);
  else if (S.time.day - n.season.startedDay >= N.SEASON_DAYS) { closeSeason(S, c); openSeason(S, c); }

  // Escalation: the angrier they are, the more often they act. `rivalHeat` is
  // Regulatory Capture — the scrutiny you bought lands on them, and a rival
  // under it moves against you that many times less often.
  const perDay = (N.MOVE_BASE + n.grudge * N.MOVE_PER_GRUDGE) * clamp(c.threat, N.THREAT_MIN, N.THREAT_MAX) * 0.5
    / Math.max(1, computeMods(S).rivalHeat || 1);
  if (chance(perDay * days)) runMove(S, c);
}

// ── Counters ───────────────────────────────────────────────────────────────
// What you can do back. Every counter is affordable-or-not up front, spends
// what it says, and moves the grudge — usually the wrong way, because hitting
// back is how a rivalry escalates.
// What this rival could actually do right now — the enum behind `rival_move`.
export function availableMoves(S) {
  const c = nemesisOf(S);
  if (!c) return [];
  return movePool(S, c).map((m) => ({ id: m.id, name: m.name, sub: m.sub }));
}

// Intelligence agents on Operations. Their work discounts the cash side of a
// counter — you already know what the answer will cost before you ask — and
// past `INTEL_REVEAL` the Market view prints the moves the rival can make next.
export function intelDiscount(S) {
  return Math.min(AGENTS.SPEC.INTEL_COUNTER_CAP, intelLevel(S) * AGENTS.SPEC.INTEL_COUNTER_RATE);
}
export function intelReveals(S) { return intelLevel(S) >= AGENTS.SPEC.INTEL_REVEAL; }

export function availableCounters(S) {
  const c = nemesisOf(S);
  if (!c) return [];
  const discount = intelDiscount(S);
  // §H13. A counter that is only ever about something on the table is not on
  // the list when nothing is. A row that is permanently grey teaches the
  // founder to stop reading the column it is in.
  return COUNTERS.filter((k) => { try { return k.when ? !!k.when(S, c) : true; } catch { return false; } }).map((k) => {
    const cost = (() => { try { return k.cost(S, c) || {}; } catch { return {}; } })();
    if (cost.cash && discount) cost.cash = Math.round(cost.cash * (1 - discount));
    let need = true;
    try { need = k.need ? !!k.need(S, c) : true; } catch { need = false; }
    const afford = (S.company.cash >= (cost.cash || 0))
      && ((S.resources.code || 0) >= (cost.code || 0))
      && ((S.founder.focus || 0) >= (cost.focus || 0))
      && ((S.resources.reputation || 0) >= (cost.reputation || 0));
    return { ...k, cost, need, afford, ok: need && afford, discount: cost.cash ? discount : 0 };
  });
}

export function counter(S, id) {
  const c = nemesisOf(S);
  if (!c) return { ok: false, reason: 'no-nemesis' };
  const k = availableCounters(S).find((x) => x.id === id);
  if (!k) return { ok: false, reason: 'unknown' };
  if (!k.need) return { ok: false, reason: 'blocked' };
  if (!k.afford) return { ok: false, reason: 'cost' };

  const cost = k.cost;
  if (cost.cash) S.company.cash -= cost.cash;
  if (cost.code) S.resources.code -= cost.code;
  if (cost.focus) S.founder.focus = Math.max(0, S.founder.focus - cost.focus);
  if (cost.reputation) S.resources.reputation = Math.max(0, S.resources.reputation - cost.reputation);

  let outcome = '';
  try { outcome = COUNTER_MAP[id].do(S, c) || ''; } catch (e) { console.error('[counter]', id, e); }

  const n = nemesisState(S);
  n.grudge = clamp(n.grudge + (k.grudge ?? 0.18), 0, 3.4);
  c.grudge = n.grudge;
  n.moves.unshift({ id: 'you:' + id, name: 'You: ' + k.name, day: Math.floor(S.time.day), effects: [], mine: true });
  if (n.moves.length > 8) n.moves.pop();

  pushFeed(S, {
    type: 'news', tone: k.grudge < 0 ? 'good' : 'neutral', author: S.company.name,
    text: outcome, meta: `Against ${c.name}`,
  });
  emit('nemesis:counter', { competitor: c, counter: k, outcome });
  return { ok: true, outcome, counter: k };
}

// ── Sieges decay ───────────────────────────────────────────────────────────
// Price pressure and channel locks are temporary by design: they hurt, they
// are visible on the Market view, and they end.
export function tickSieges(S, days) {
  if (S.market.priceSiege) S.market.priceSiege = Math.max(0, S.market.priceSiege - days);
  if (S.market.channelLock) S.market.channelLock = Math.max(0, S.market.channelLock - days);
}

export function siegeMods(S) {
  return {
    churnMult: S.market.priceSiege > 0 ? 1.22 : 1,
    growthMult: S.market.channelLock > 0 ? 0.82 : 1,
  };
}

export { grudgeBand };
