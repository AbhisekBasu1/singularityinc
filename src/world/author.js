// ─────────────────────────────────────────────────────────────────────────────
// THE WORLD-AUTHOR RUNTIME
//
// The deck is the spine. This module is what lets an assistant claim a slot the
// deck would otherwise have filled — and nothing more. Three invariants hold
// everywhere below:
//
//   1. The game never waits on the assistant. A slot is offered; if nothing
//      arrives before the timeout, `drawEvent` runs exactly as it always has.
//   2. Nothing here touches a reducer. Every consequence goes through
//      `applyEffects`, bounded by `validate.js`, bounded by `WORLD_AUTHOR`.
//   3. The founder can end it in one click, and the written world carries on.
//
// Mode, the pending slot and the open waiter are module memory rather than save
// state on purpose: a save always reopens on the authored deck, and the world
// wakes up again the first time a tool is called.
// ─────────────────────────────────────────────────────────────────────────────
import { WORLD_AUTHOR as W } from '../data/balance.js';
import { CHARACTERS } from '../data/characters.js';
import { applyEffects, applyEffectsWith, describeEffects } from './effects.js';
import { validateCard, validatePost, validateShock, validatePressure, validateLine,
         validateProposal, metCharacters, cardsLeft, postsLeftToday, shocksLeft,
         capSummary, actOf } from './validate.js';
import { presentEvent, registerWorldAuthor } from '../systems/narrative.js';
import { pushFeed, fillTokens } from '../systems/feed.js';
import { nemesisOf, runMove } from '../systems/nemesis.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { runwayDays } from '../systems/economy.js';
import { nextActHint } from '../systems/progression.js';
import { activeObjectives } from '../systems/objectives.js';
import { playerRank } from '../systems/agirace.js';
import { markDirty } from '../systems/modifiers.js';
import { emit, on } from '../engine/bus.js';
import { money, fmt } from '../engine/format.js';
import { S as LIVE } from '../engine/state.js';

// ── Module memory ───────────────────────────────────────────────────────────
let mode = 'deck';            // 'deck' | 'agent'
let pending = null;           // { slot, day, real, context }
let waiter = null;            // { resolve, timer, at }
let lastCallReal = 0;
// After an offer lapses, the deck is owed the next draw outright. Without this
// the lifecycle has a hole: clear the pending slot, and the very next call to
// `offerSlot` sees nothing pending, opens a fresh offer, and returns true again
// — so every expiry renews the offer and the written deck never draws at all.
let deckOwedFrom = -1;
const playerActions = [];     // the last few things the founder actually did

export function authorState(S) {
  const w = S.world;
  if (!w.author) {
    w.author = { muted: false,
      stats: { cards: 0, posts: 0, moves: 0, shocks: 0, pressure: 0, lines: 0, refused: 0,
               ownWords: 0, slotsOffered: 0, slotsFilled: 0, slotsTimedOut: 0,
               muted: 0, revokedByDoctrine: 0 },
      recent: { cardDays: [], postDays: [], shockDays: [], lineDays: [], taken: [] }, seq: 1 };
  }
  const a = w.author;
  a.stats ??= {}; a.recent ??= {};
  for (const k of ['cardDays', 'postDays', 'shockDays', 'lineDays', 'taken']) a.recent[k] ??= [];
  a.seq ??= 1;
  return a;
}

export function authorMode() { return mode; }
export function isMuted(S = LIVE) { return !!S?.world?.author?.muted; }
export function isPresent(S = LIVE) { return mode === 'agent' && !isMuted(S); }
export function pendingSlot() { return pending; }
export function isWaiting() { return !!waiter; }

// Any tool call is presence. The world wakes on the first one.
export function noteCall() {
  lastCallReal = Date.now();
  if (mode !== 'agent') { mode = 'agent'; emit('world:mode', { mode }); }
}
export function goQuiet(why = 'silence') {
  if (mode === 'deck') return;
  mode = 'deck';
  clearSlot(LIVE, 'quiet');
  emit('world:mode', { mode, why });
}

function bump(S, key, n = 1) { const a = authorState(S); a.stats[key] = (a.stats[key] || 0) + n; }
function stamp(S, bucket) { authorState(S).recent[bucket].push(S.time.day); }

// ── Presence, slots, and the promise that the deck always wins ──────────────

export function offerSlot(S, slot = 'event') {
  if (!isPresent(S) || S._offline) return false;
  const a = authorState(S);
  // An offer lapsed and has not been repaid: this draw is the deck's.
  if (deckOwedFrom >= 0) { deckOwedFrom = -1; return false; }
  if (pending) {
    const oldByDay = S.time.day - pending.day >= W.SLOT_TIMEOUT_DAYS;
    const oldByReal = S.meta?.realtime && (Date.now() - pending.real) >= W.SLOT_TIMEOUT_REAL_S * 1000;
    if (oldByDay || oldByReal) {
      pending = null;
      deckOwedFrom = S.time.day;
      a.stats.slotsTimedOut = (a.stats.slotsTimedOut || 0) + 1;
      emit('world:slot', { status: 'timed_out', slot });
      return false;                       // the deck draws, exactly as it always did
    }
    return true;                          // still offered
  }
  pending = { slot, day: S.time.day, real: Date.now(), context: buildContext(S) };
  a.stats.slotsOffered = (a.stats.slotsOffered || 0) + 1;
  emit('world:slot', { status: 'offered', slot, day: S.time.day });
  resolveWaiter({ status: 'needs_world', slot, day: Math.floor(S.time.day),
                  context: pending.context,
                  next: `write_event now, or post as someone — if nothing arrives within ${W.SLOT_TIMEOUT_DAYS} days the written deck fills it` });
  return true;
}

function clearSlot(S, why) {
  if (!pending) return;
  pending = null;
  emit('world:slot', { status: why });
}

// Nothing is owed any more: the founder answered a card themselves, muted the
// world, or started a new run. Also what a test calls to own the clock.
export function clearPending(why = 'cleared') { clearSlot(LIVE, why); }

// ── The waiter: the page cannot start a turn, but it can hold one open ──────

export function openWait(S, signal) {
  noteCall();
  // The founder's hand comes first: a stop already pressed is honoured even
  // when the world is owed a card.
  if (signal?.aborted) {
    return Promise.resolve({ status: 'cancelled', why: 'the founder pressed stop',
                             next: 'call wait_for_world again when they want you back' });
  }
  if (waiter) resolveWaiter({ status: 'superseded', next: 'only one wait can be open — this one was replaced' });
  // A slot is already owed: answer immediately rather than making it wait.
  if (pending) {
    return Promise.resolve({ status: 'needs_world', slot: pending.slot, day: Math.floor(S.time.day),
      context: pending.context, next: 'write_event, or post as someone the founder has met' });
  }
  return new Promise((resolve) => {
    const finish = (payload) => { cleanup(); resolve(payload); };
    const cleanup = () => {
      if (waiter?.timer) clearTimeout(waiter.timer);
      if (waiter?.onAbort && signal) signal.removeEventListener('abort', waiter.onAbort);
      waiter = null;
      emit('world:wait', { open: false });
    };
    const onAbort = () => finish({ status: 'cancelled', why: 'the founder pressed stop',
                                   next: 'call wait_for_world again when they want you back' });
    const timer = setTimeout(() => finish(heartbeat(S)), W.WAIT_HEARTBEAT_S * 1000);
    waiter = { resolve: finish, timer, at: Date.now(), onAbort };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
    emit('world:wait', { open: true });
  });
}

export function resolveWaiter(payload) {
  if (!waiter) return false;
  waiter.resolve(payload);
  return true;
}

function heartbeat(S) {
  return { status: 'heartbeat', day: Math.floor(S.time.day),
    brief: `${money(S.company.cash)} cash · ${fmt(totalUsers(S))} users · ${money(totalMrr(S))} MRR`,
    next: 'nothing is owed yet — call wait_for_world again to stay on duty' };
}

// ── What the world is told when it is asked to write ────────────────────────

export function noteAction(name) {
  playerActions.unshift(name);
  if (playerActions.length > 6) playerActions.pop();
}
export function recentActions() { return playerActions.slice(0, 5); }

export function buildContext(S) {
  const j = S.narrative.journal.slice(0, 2).map((e) => e.title);
  const rival = nemesisOf(S);
  const objs = activeObjectives(S).slice(0, 2).map((o) => o.title);
  const ctx = {
    day: Math.floor(S.time.day), act: S.company.act,
    cash: money(S.company.cash), runway: Math.round(runwayDays(S)) + 'd',
    users: fmt(totalUsers(S)), mrr: money(totalMrr(S)),
  };
  if (rival) ctx.rival = rival.name;
  if (j.length) ctx.lately = j.join(' / ');
  if (objs.length) ctx.wants = objs.join(' / ');
  const acts = recentActions();
  if (acts.length) ctx.founderJustDid = acts.join(', ');
  if (S.world.race?.you != null) ctx.race = `${Math.round(S.world.race.you)}/100, rank ${playerRank(S)}`;
  return ctx;
}

// ── Writing a card ──────────────────────────────────────────────────────────

// A validated data card becomes an event object the existing pipeline accepts.
// `runtime` rides along on the active event so a card that is open when the
// game is saved still resolves after a reload.
export function hydrate(S, data, id) {
  return {
    id: id || `w_${authorState(S).seq++}`,
    kind: data.kind, char: data.char || null,
    title: data.title,
    body: data.body,
    author: 'world',
    // Carried on the rebuilt event as well as on the active one, so a card that
    // survived one reload survives the next.
    runtime: data,
    choices: data.choices.map((c) => ({
      label: c.label, sub: c.sub, tone: c.tone,
      // `fx` is narrative's own collector and its log is what the journal and
      // the outcome strip render. Spend that one, not a private one.
      effect: (st, fx) => {
        applyEffectsWith(fx, st, c.effects, data.char || null);
        return fillTokens(st, c.outcome);
      },
    })),
  };
}

export function writeCard(S, data) {
  const v = validateCard(S, data);
  if (!v.ok) { bump(S, 'refused'); return v; }
  const ev = hydrate(S, v.card);
  presentEvent(S, ev);
  const active = S.narrative.activeEvent;
  if (active) { active.runtime = v.card; active.author = 'world'; }
  stamp(S, 'cardDays');
  bump(S, 'cards');
  if (pending) { bump(S, 'slotsFilled'); clearSlot(S, 'filled'); }
  markDirty();
  emit('world:card', { card: v.card });
  return { ok: true, card: v.card, warnings: v.warnings, id: ev.id };
}

// ── Answering what the founder typed ────────────────────────────────────────

export function proposeOutcome(S, input) {
  const v = validateProposal(S, input);
  if (!v.ok) { bump(S, 'refused'); return v; }
  const active = S.narrative.activeEvent;
  active.proposal = { ...v.proposal, describe: describeEffects(v.proposal.effects) };
  emit('event:proposal', { proposal: active.proposal, event: active });
  return { ok: true, proposal: active.proposal };
}

export function acceptProposal(S) {
  const active = S.narrative.activeEvent;
  const p = active?.proposal;
  if (!p) return { ok: false, reason: 'nothing to accept' };
  const log = applyEffects(S, p.effects, active.char || null);
  const outcome = fillTokens(S, p.outcome);
  active.outcome = outcome;
  active.effects = log;
  active.chosen = 'in your own words';
  S.narrative.choicesMade++;
  S.stats.eventsResolved++;
  S.narrative.journal.unshift({
    day: Math.floor(S.time.day), id: active.id, title: active.title,
    choice: 'in your own words', outcome, char: active.char, kind: active.kind,
    tone: p.tone, effects: log, author: 'world',
  });
  if (S.narrative.journal.length > 200) S.narrative.journal.pop();
  delete active.proposal;
  bump(S, 'ownWords');
  markDirty();
  emit('event:resolved', { event: active, choice: { label: 'in your own words', tone: p.tone },
                           outcome, effects: log });
  return { ok: true, outcome, effects: log };
}

export function declineProposal(S) {
  const active = S.narrative.activeEvent;
  if (!active?.proposal) return { ok: false };
  delete active.proposal;
  emit('event:proposal_declined', { event: active });
  return { ok: true };
}

// ── The smaller acts ────────────────────────────────────────────────────────

export function postAs(S, char, text) {
  const v = validatePost(S, { char, text });
  if (!v.ok) { bump(S, 'refused'); return v; }
  const c = CHARACTERS[char];
  const item = pushFeed(S, {
    type: c.kind === 'press' ? 'news' : c.kind === 'state' ? 'news' : 'social',
    author: c.handle, text: fillTokens(S, v.post.text),
    tone: c.kind === 'rival' ? 'bad' : 'neutral',
    meta: `${c.name} · ${c.role}`, byWorld: true,
  });
  stamp(S, 'postDays');
  bump(S, 'posts');
  emit('world:post', { char, item });
  return { ok: true, char, name: c.name, shown: true };
}

export function rivalMove(S, moveId, line) {
  const c = nemesisOf(S);
  if (!c) {
    bump(S, 'refused');
    return { ok: false, problems: [{ path: '', rule: 'no_rival',
      fix: 'no company has become the rival yet — post as someone, or write a card' }] };
  }
  if (S._offline) {
    bump(S, 'refused');
    return { ok: false, problems: [{ path: '', rule: 'offline', fix: 'the founder is away — wait for catch-up' }] };
  }
  if (line) {
    const lv = validateLine(S, line, W.POST_MAX);
    if (!lv.ok) { bump(S, 'refused'); return lv; }
    line = lv.text;
  }
  const move = runMove(S, c, moveId, line);
  if (!move) {
    bump(S, 'refused');
    return { ok: false, problems: [{ path: 'move', rule: 'unavailable',
      fix: `${c.name} cannot do that right now — call briefing to see what they can`, got: moveId }] };
  }
  bump(S, 'moves');
  return { ok: true, move: move.id, name: move.name, sub: move.sub, rival: c.name };
}

export function marketShock(S, kind, days) {
  const v = validateShock(S, { kind, days });
  if (!v.ok) { bump(S, 'refused'); return v; }
  S.market.macro = v.shock.kind;
  S.market.macroDaysLeft = v.shock.days;
  stamp(S, 'shockDays');
  bump(S, 'shocks');
  markDirty();
  const LINE = {
    boom: 'Capital is cheap and everybody suddenly has a thesis.',
    tightening: 'The money got careful. Every round takes a month longer than it used to.',
    crash: 'The window shut. Nobody is announcing anything this quarter.',
  };
  pushFeed(S, { type: 'news', author: 'The Ledger', tone: kind === 'boom' ? 'good' : 'bad',
                text: LINE[v.shock.kind], meta: `Macro · ${v.shock.days} days`, byWorld: true });
  emit('world:shock', v.shock);
  return { ok: true, ...v.shock };
}

export function regulatorPressure(S, heat, line) {
  const v = validatePressure(S, { heat, line });
  if (!v.ok) { bump(S, 'refused'); return v; }
  const log = applyEffects(S, { heat: v.pressure.heat });
  const met = !!S.narrative.relationships?.dorne?.met;
  pushFeed(S, { type: 'news', author: met ? CHARACTERS.dorne.handle : 'The Ledger',
                tone: v.pressure.heat > 0 ? 'bad' : 'good',
                text: fillTokens(S, v.pressure.line),
                meta: met ? `${CHARACTERS.dorne.name} · ${CHARACTERS.dorne.role}` : 'Regulatory',
                byWorld: true });
  bump(S, 'pressure');
  markDirty();
  emit('world:pressure', v.pressure);
  return { ok: true, heat: v.pressure.heat, now: Math.round(S.world.regulatoryHeat), effects: log };
}

export function ariaSays(S, text) {
  const v = validateLine(S, text, W.LINE_MAX);
  if (!v.ok) { bump(S, 'refused'); return v; }
  const a = authorState(S);
  const used = a.recent.lineDays.filter((d) => d > S.time.day - 1).length;
  if (used >= W.MAX_ARIA_LINES_PER_DAY) {
    bump(S, 'refused');
    return { ok: false, problems: [{ path: '', rule: 'rate',
      fix: 'let a day pass with advance_time',
      limit: `${W.MAX_ARIA_LINES_PER_DAY} a day`, when: `day ${Math.ceil(S.time.day + 1)}` }] };
  }
  const line = fillTokens(S, v.text);
  pushFeed(S, { type: 'log', author: 'ARIA', text: line, tone: 'neutral', byWorld: true });
  stamp(S, 'lineDays');
  bump(S, 'lines');
  emit('aria:says', line);
  return { ok: true, said: true };
}

// ── Daily upkeep ────────────────────────────────────────────────────────────

export function tickAuthor(S, days = 1) {
  const a = authorState(S);
  const trim = (bucket, window) => {
    const cut = S.time.day - window;
    a.recent[bucket] = a.recent[bucket].filter((d) => d > cut);
  };
  trim('cardDays', W.CARD_WINDOW_DAYS);
  trim('postDays', 2);
  trim('shockDays', W.SHOCK_WINDOW_DAYS);
  trim('lineDays', 2);
  a.recent.taken = (a.recent.taken || []).filter(([d]) => d > S.time.day - W.DRAIN_WINDOW_DAYS);
  if (pending && S.time.day - pending.day >= W.SLOT_TIMEOUT_DAYS) {
    pending = null;
    deckOwedFrom = S.time.day;      // and the next draw is the deck's
    a.stats.slotsTimedOut = (a.stats.slotsTimedOut || 0) + 1;
    emit('world:slot', { status: 'timed_out' });
  }
  if (mode === 'agent' && !waiter && lastCallReal &&
      Date.now() - lastCallReal > W.PRESENCE_TIMEOUT_S * 1000) {
    goQuiet('the assistant went quiet');
  }
  // The surface reconciles on the events that actually change it; this is the
  // safety net that catches anything those miss — a character met inside a
  // project outcome, say — at a cost of one comparison a day.
  emit('world:day', { day: Math.floor(S.time.day) });
}

// ── Mute ────────────────────────────────────────────────────────────────────

export function mute(S) {
  authorState(S).muted = true;
  bump(S, 'muted');
  clearSlot(S, 'muted');
  resolveWaiter({ status: 'muted', why: 'the founder pulled the plug',
                  next: 'the written world has taken over; nothing further will be asked of you' });
  mode = 'deck';
  emit('world:mute', {});
  return { ok: true };
}
export function unmute(S) {
  authorState(S).muted = false;
  emit('world:unmute', {});
  return { ok: true };
}

// The panel and the tools both want this; one shape, one place.
export function worldStatus(S) {
  const a = authorState(S);
  return {
    mode, muted: !!a.muted, waiting: !!waiter,
    pending: pending ? { slot: pending.slot, day: Math.floor(pending.day) } : null,
    cardsLeft: cardsLeft(S), postsLeft: postsLeftToday(S), shocksLeft: shocksLeft(S),
    cast: metCharacters(S), caps: capSummary(S), act: actOf(S),
    stats: a.stats,
  };
}

// Reset between runs and between tests.
export function resetAuthor() {
  mode = 'deck'; pending = null; lastCallReal = 0; deckOwedFrom = -1; playerActions.length = 0;
  if (waiter) { try { waiter.resolve({ status: 'cancelled', why: 'a new run started' }); } catch {} waiter = null; }
}

// Register with the deck. From here on `tickNarrative` offers this module the
// slot it was about to fill, and `resolveChoice` can rebuild a written card
// from the data that rode along on the save.
registerWorldAuthor({ offerSlot, hydrate });

// A new timeline is a new world. Without this the module carries the previous
// run's mode, its pending slot and its open waiter into a game that has none of
// the state they referred to.
on('game:start', () => resetAuthor());
on('prestige', () => resetAuthor());

// A card is on the founder's screen: whatever the world was owed, it is not
// owed now. Without this a slot offered a moment before a deck card opened
// stays pending, and the next `advance_time` stops dead on a debt already paid.
on('event:present', () => clearSlot(LIVE, 'a card opened'));

// The founder's own hands, watched cheaply so the world knows what they just did.
on('event:resolved', ({ choice }) => noteAction(`chose "${String(choice?.label || '').slice(0, 28)}"`));
on('thread:resolved', ({ opt }) => noteAction(`answered a thread: ${String(opt?.label || '').slice(0, 20)}`));
on('agent:hired', () => noteAction('hired an agent'));
on('project:started', ({ project }) => noteAction(`started ${project?.name || 'a project'}`));
on('research:done', ({ node }) => noteAction(`finished ${node?.name || 'research'}`));
on('act:advance', ({ act }) => noteAction(`reached Act ${act}`));
