// ─────────────────────────────────────────────────────────────────────────────
// THE NEMESIS — designation, escalation, and the moves themselves.
//
// A rival becomes the nemesis when they are big enough and have lasted long
// enough to matter. They stay the nemesis through bad quarters, because a
// rivalry that reassigns itself every fortnight is not a rivalry. The grudge
// rises when you beat them and when they beat you; it is a measure of how much
// of their attention you occupy, not of who is winning.
// ─────────────────────────────────────────────────────────────────────────────

import { MOVES, MOVE_MAP, COUNTERS, COUNTER_MAP, grudgeBand } from '../data/nemesis.js';
import { RIVAL_PERSONALITIES, activeCompetitors } from './market.js';
import { totalUsers, totalMrr } from './product.js';
import { pushFeed } from './feed.js';
import { clamp } from '../engine/format.js';
import { chance, weightedPick, randRange } from '../engine/rng.js';
import { emit } from '../engine/bus.js';

const DESIGNATE_AFTER_DAYS = 45;    // they have to survive before they count
const DESIGNATE_THREAT = 1.0;
const DROP_THREAT = 0.28;           // fall this far behind for long enough and it is over
const DROP_PATIENCE = 90;

export function nemesisState(S) {
  if (!S.market.nemesis) S.market.nemesis = { id: null, grudge: 0, moves: [], since: 0, lowDays: 0 };
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

function movePool(S, c) {
  const n = nemesisState(S);
  const recent = n.moves.slice(0, 3).map((m) => m.id);
  return MOVES.filter((m) => {
    if (m.min > n.grudge) return false;
    if (m.only && !m.only.includes(c.personality)) return false;
    if (m.need && !safe(m.need, S)) return false;
    if (recent.includes(m.id)) return false;     // do not repeat themselves
    return true;
  });
}

function safe(fn, S) { try { return !!fn(S); } catch { return false; } }

function fillLine(text, S, c) {
  const p = S.products[0];
  return String(text)
    .replace(/\{you\}/g, S.company.name)
    .replace(/\{them\}/g, c.name)
    .replace(/\{founder\}/g, c.founder)
    .replace(/\{product\}/g, p?.name || S.company.name)
    .replace(/\{cat\}/g, p?.category || 'category');
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
  const move = weightedPick(pool, pool.map((m) => m.weight));
  let effects = [];
  try { effects = move.effect(S, c) || []; } catch { effects = []; }

  pushFeed(S, {
    type: 'social', tone: move.id === 'respect' ? 'good' : 'bad',
    author: c.handle || `@${c.founder.split(' ')[0].toLowerCase()}`,
    text: fillLine(lineOverride || (typeof move.line === 'function' ? move.line() : move.line), S, c),
    meta: `${c.name} · ${move.sub}`,
  });

  n.moves.unshift({ id: move.id, name: move.name, day: Math.floor(S.time.day), effects });
  if (n.moves.length > 8) n.moves.pop();
  n.grudge = clamp(n.grudge + 0.06, 0, 3.4);
  c.grudge = n.grudge;
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

  // They fade out of the story if they fall far enough behind for long enough.
  if (c.threat < DROP_THREAT) {
    n.lowDays += days;
    if (n.lowDays > DROP_PATIENCE) { undesignate(S, c, 'faded'); n.cooldown = 20; return; }
  } else n.lowDays = Math.max(0, n.lowDays - days * 0.5);

  // Escalation: the angrier they are, the more often they act.
  const perDay = (0.010 + n.grudge * 0.014) * clamp(c.threat, 0.3, 4) * 0.5;
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

export function availableCounters(S) {
  const c = nemesisOf(S);
  if (!c) return [];
  return COUNTERS.map((k) => {
    const cost = (() => { try { return k.cost(S, c) || {}; } catch { return {}; } })();
    let need = true;
    try { need = k.need ? !!k.need(S, c) : true; } catch { need = false; }
    const afford = (S.company.cash >= (cost.cash || 0))
      && ((S.resources.code || 0) >= (cost.code || 0))
      && ((S.founder.focus || 0) >= (cost.focus || 0))
      && ((S.resources.reputation || 0) >= (cost.reputation || 0));
    return { ...k, cost, need, afford, ok: need && afford };
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
