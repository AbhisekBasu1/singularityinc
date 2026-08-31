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
         capSummary, actOf, openWorldThreads, boundEffects } from './validate.js';
import { presentEvent, registerWorldAuthor, markEventHandled } from '../systems/narrative.js';
import { pushFeed, fillTokens, registerThreadResolver } from '../systems/feed.js';
import { nemesisOf, runMove } from '../systems/nemesis.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { runwayDays } from '../systems/economy.js';
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
const advances = [];          // [realMs, days] the world has run the clock, this session
let routineTimer = null;      // one quiet beat turns rapid clicks into one observation

export function authorState(S) {
  const w = S.world;
  if (!w.author) {
    w.author = { muted: false,
      stats: { cards: 0, posts: 0, moves: 0, shocks: 0, pressure: 0, lines: 0, refused: 0,
               ownWords: 0, slotsOffered: 0, slotsFilled: 0, slotsTimedOut: 0,
               muted: 0, revokedByDoctrine: 0, threads: 0, held: 0 },
      recent: { cardDays: [], postDays: [], shockDays: [], lineDays: [], taken: [] },
      inbox: [], seq: 1 };
  }
  const a = w.author;
  a.stats ??= {}; a.recent ??= {};
  for (const k of ['cardDays', 'postDays', 'shockDays', 'lineDays', 'taken']) a.recent[k] ??= [];
  a.inbox ??= [];
  a.activity ??= [];
  a.routinePending ??= null;
  a.seq ??= 1;
  return a;
}

export function authorMode() { return mode; }
export function isMuted(S = LIVE) { return !!S?.world?.author?.muted; }
export function isPresent(S = LIVE) { return mode === 'agent' && !isMuted(S); }
export function pendingSlot() { return pending; }
export function isWaiting() { return !!waiter; }

export function pendingFounderWords(S = LIVE) {
  const active = S?.narrative?.activeEvent;
  if (!active || active.outcome || active.proposal || !active.founderWords?.text) return null;
  return active.founderWords;
}

function founderChannelOpen(S = LIVE) {
  return !isMuted(S) && (isPresent(S) || S?.meta?.assistantChoice === 'play');
}

export function founderInputState(S = LIVE) {
  const active = S?.narrative?.activeEvent;
  return {
    available: !!active && !active.outcome && !active.proposal && founderChannelOpen(S),
    waiting: !!waiter,
    pending: pendingFounderWords(S),
    max: W.FOUNDER_WORDS_MAX,
  };
}

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

// What a written effect may still do at the moment it lands — see
// `boundEffects`. Counted, so a session can see the rules bit late.
function commit(S, effects) {
  authorState(S);            // a save from before the ledger still keeps one from here on
  const b = boundEffects(S, effects);
  if (b.held.length) { bump(S, 'held', b.held.length); emit('world:held', { held: b.held }); }
  return b.effects;
}
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

// The card on the founder's screen, as the world may read it. The body and
// the choices ride along, so an assistant asked "what should I pick" is
// reading the card rather than guessing at it. `max` is the body allowance;
// zero leaves the body out for the places that only need the shape.
const cut = (str, max) => {
  const s = String(str ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
};
export function openCardPayload(S = LIVE, max = 320) {
  const a = S?.narrative?.activeEvent;
  if (!a) return null;
  return {
    title: a.title, kind: a.kind,
    ...(a.char ? { person: CHARACTERS[a.char]?.name || a.char } : {}),
    ...(max > 0 ? { body: cut(a.body, max) } : {}),
    choices: (a.choices || []).map((c) => ({
      label: cut(c.label, W.LABEL_MAX),
      ...(c.sub ? { sub: cut(c.sub, W.SUB_MAX) } : {}),
      tone: c.tone || 'neutral',
    })),
    state: a.outcome ? 'resolved' : a.proposal ? 'awaiting_acceptance'
         : a.founderWords?.text ? 'typed_a_move' : 'choosing',
    author: String(a.id || '').startsWith('w_') ? 'world' : 'deck',
  };
}

// Observations that have stopped being true. A card the founder has already
// answered is news in the past tense, and the inbox delivers it after the
// choice that closed it — so it is dropped rather than delivered.
function pruneInbox(S, keep) {
  const a = authorState(S);
  const n = a.inbox.length;
  a.inbox = a.inbox.filter(keep);
  if (a.inbox.length !== n) markDirty();
}

function founderWordsPayload(S, active = S?.narrative?.activeEvent) {
  const p = active?.founderWords;
  if (!active || !p?.text) return null;
  return {
    status: 'founder_said',
    day: Math.floor(S.time.day),
    card: {
      title: active.title,
      kind: active.kind,
      ...(active.char ? { person: CHARACTERS[active.char]?.name || active.char } : {}),
      choices: (active.choices || []).map((c) => String(c.label || '').slice(0, W.LABEL_MAX)),
    },
    founder_words: p.text,
    submission_id: p.id,
    next: 'call answer_in_own_words with this submission_id. Put the proposed consequence on the same card; the founder must Accept before it becomes real',
  };
}

function compactEffects(effects = []) {
  return effects.slice(0, 10).map(([stat, change]) => ({ stat, change }));
}

function dispatchObservation(S, payload) {
  if (!payload || !founderChannelOpen(S)) return false;
  if (resolveWaiter(payload)) return true;
  const a = authorState(S);
  a.inbox.push(payload);
  if (a.inbox.length > W.OBSERVATION_INBOX_MAX) {
    a.inbox.splice(0, a.inbox.length - W.OBSERVATION_INBOX_MAX);
  }
  markDirty();
  emit('world:inbox', { count: a.inbox.length, status: payload.status });
  return false;
}

// ── The founder's hands, made legible to the world ─────────────────────────
//
// Cards already have a bespoke observation shape. Everything else comes
// through this small semantic ledger. System reducers can report a milestone,
// while UI-only choices (a standing order, a queue edit) call this directly.
// The input is deliberately flattened here: no reducer object, DOM node or
// circular state reference can ever ride into a WebMCP result or a save.

function activityText(value, max = 160) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function activityDetails(input) {
  const out = {};
  let n = 0;
  for (const [key, value] of Object.entries(input || {})) {
    if (n >= 8 || value === undefined || value === null) continue;
    if (typeof value === 'string') out[key] = activityText(value, 120);
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
    else if (typeof value === 'boolean') out[key] = value;
    else continue;
    n++;
  }
  return out;
}

function addActivity(S, input, routine) {
  const a = authorState(S);
  const day = Math.floor(S.time.day);
  const action = activityText(input.action || 'acted', 48) || 'acted';
  const summary = activityText(input.summary || action, 180) || action;
  const surface = activityText(input.surface || 'company', 32) || 'company';
  const details = activityDetails(input.details);
  const top = a.activity[0];

  // Sliders and clicker verbs should say what the founder accomplished, not
  // produce a forty-line transcript of pointer events. Consecutive work of the
  // same kind on the same game-day is one ledger entry with a count and the
  // latest values.
  if (routine && top?.routine && top.action === action && top.day === day) {
    top.count = (top.count || 1) + 1;
    top.summary = summary;
    top.details = details;
    top.lastDay = day;
    noteAction(top.count > 1 ? `${summary} ×${top.count}` : summary);
    return top;
  }

  const item = {
    id: `activity_${a.seq++}`,
    day,
    surface,
    action,
    summary,
    ...(Object.keys(details).length ? { details } : {}),
    ...(routine ? { routine: true, count: 1 } : {}),
  };
  a.activity.unshift(item);
  if (a.activity.length > W.ACTIVITY_LOG_MAX) a.activity.length = W.ACTIVITY_LOG_MAX;
  noteAction(summary);
  return item;
}

function routinePayload(S, consume = true) {
  const a = authorState(S);
  const pending = a.routinePending;
  if (!pending?.items || !Object.keys(pending.items).length) return null;
  const actions = Object.values(pending.items).map((item) => ({
    action: item.action,
    surface: item.surface,
    count: item.count,
    summary: item.summary,
    ...(item.details && Object.keys(item.details).length ? { details: item.details } : {}),
  }));
  if (consume) {
    a.routinePending = null;
    markDirty();
  }
  return {
    status: 'founder_activity',
    day: Math.floor(S.time.day),
    actions,
    next: 'this routine work already landed. Notice the pattern, react only if it earns a beat, then call wait_for_world again',
  };
}

function flushRoutine(S) {
  routineTimer = null;
  const payload = routinePayload(S, true);
  if (payload) dispatchObservation(S, payload);
}

function scheduleRoutine(S) {
  if (!founderChannelOpen(S)) return;
  if (routineTimer) clearTimeout(routineTimer);
  routineTimer = setTimeout(() => flushRoutine(S), W.ACTION_BATCH_MS);
}

export function observeFounderAction(S = LIVE, input = {}, opts = {}) {
  if (!S?.world) return null;
  const routine = !!(opts.routine ?? input.routine);
  const item = addActivity(S, input, routine);
  const a = authorState(S);

  if (routine) {
    const pending = a.routinePending ??= { sinceDay: item.day, items: {} };
    const key = item.action;
    const held = pending.items[key] ??= {
      action: item.action, surface: item.surface, count: 0,
      summary: item.summary, details: item.details || {},
    };
    held.count++;
    held.summary = item.summary;
    held.surface = item.surface;
    held.details = item.details || {};
    markDirty();
    scheduleRoutine(S);
    emit('world:activity', { item, routine: true });
    return item;
  }

  // Preserve chronology when a milestone follows a burst of routine work:
  // deliver the older batch first, then hold this strategic beat for the next
  // wait. Otherwise a shipment could arrive before the three prompts that
  // produced it merely because milestones bypass the debounce.
  if (a.routinePending) {
    if (routineTimer) clearTimeout(routineTimer);
    routineTimer = null;
    const older = routinePayload(S, true);
    if (older) dispatchObservation(S, older);
  }
  markDirty();
  emit('world:activity', { item, routine: false });
  if (opts.notify === false || input.notify === false) return item;
  dispatchObservation(S, {
    status: input.status || 'founder_acted',
    day: item.day,
    surface: item.surface,
    action: item.action,
    summary: item.summary,
    ...(item.details ? { details: item.details } : {}),
    next: input.next || 'this already happened. React, remember it for callbacks, then call wait_for_world again; do not take the founder\'s next decision for them',
  });
  return item;
}

export function recentActivity(S = LIVE, limit = 12) {
  return authorState(S).activity.slice(0, Math.max(1, Math.min(24, limit))).map((item) => ({ ...item }));
}

export function pendingRoutineActivity(S = LIVE) {
  return routinePayload(S, false);
}

// The card is a first-class input surface. Submitting here does not apply a
// consequence; it only hands the founder's move to a waiting assistant. The
// response still comes back through proposeOutcome and still needs Accept.
export function submitFounderWords(S, value) {
  const active = S?.narrative?.activeEvent;
  if (!founderChannelOpen(S)) return { ok: false, reason: 'this run is using the written world' };
  if (!active || active.outcome || active.proposal) return { ok: false, reason: 'there is no open decision to answer' };
  if (active.founderWords?.text) return { ok: false, reason: 'that move is already with the world' };
  const text = String(value ?? '').trim();
  if (!text) return { ok: false, reason: 'say what you actually do first' };
  if (text.length > W.FOUNDER_WORDS_MAX) {
    return { ok: false, reason: `keep it under ${W.FOUNDER_WORDS_MAX} characters` };
  }
  const id = `founder_${authorState(S).seq++}`;
  active.founderWords = { id, text, day: Math.floor(S.time.day), delivered: false };
  markDirty();
  const payload = founderWordsPayload(S, active);
  const delivered = resolveWaiter(payload);
  active.founderWords.delivered = delivered;
  markDirty();
  emit('world:founder-input', { status: delivered ? 'delivered' : 'queued', id, text });
  return { ok: true, delivered, id };
}

export function cancelFounderWords(S) {
  const active = S?.narrative?.activeEvent;
  if (!active?.founderWords || active.proposal || active.outcome) return { ok: false };
  const id = active.founderWords.id;
  delete active.founderWords;
  markDirty();
  emit('world:founder-input', { status: 'cancelled', id });
  return { ok: true };
}

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
  // The founder may have typed while no turn was open, or the page may have
  // reloaded with their words safely stored on the card. Deliver it before
  // anything else; an open decision stops the clock and is the live moment.
  const words = pendingFounderWords(S);
  if (words) {
    words.delivered = true;
    markDirty();
    emit('world:founder-input', { status: 'delivered', id: words.id, text: words.text });
    return Promise.resolve(founderWordsPayload(S));
  }
  // Button choices and Wire replies are persisted until the assistant sees
  // them. They are observations, never invitations to rewrite landed effects.
  const a = authorState(S);
  while (a.inbox.length) {
    const item = a.inbox.shift();
    markDirty();
    // A card that opened and has since closed is not news any more; the
    // choice that closed it is the next item, and it says everything.
    if (item.status === 'card_opened' && item.cardId !== S.narrative?.activeEvent?.id) continue;
    emit('world:inbox', { count: a.inbox.length, status: item.status });
    return Promise.resolve(item);
  }
  // A slot is already owed: answer immediately rather than making it wait.
  if (pending) {
    return Promise.resolve({ status: 'needs_world', slot: pending.slot, day: Math.floor(S.time.day),
      context: pending.context, next: 'write_event, or post as someone the founder has met' });
  }
  // A reload can preserve a routine batch but not its real-time debounce
  // timer. Re-arm it when the assistant returns; normal live batches are
  // already scheduled by observeFounderAction.
  if (a.routinePending) scheduleRoutine(S);
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
  const activity = routinePayload(S, true);
  if (activity) return activity;
  return { status: 'heartbeat', day: Math.floor(S.time.day),
    brief: `${money(S.company.cash)} cash · ${fmt(totalUsers(S))} users · ${money(totalMrr(S))} MRR`,
    clock: S.settings?.paused ? 'paused' : `${S.settings?.speed || 1}×`,
    next: 'nothing is owed yet — call wait_for_world again to stay on duty' };
}

// ── What the world is told when it is asked to write ────────────────────────

export function noteAction(name) {
  playerActions.unshift(name);
  if (playerActions.length > 6) playerActions.pop();
}
export function recentActions(S = LIVE) {
  const persisted = S?.world?.author?.activity;
  if (Array.isArray(persisted) && persisted.length) {
    return persisted.slice(0, 5).map((a) => a.count > 1 ? `${a.summary} ×${a.count}` : a.summary);
  }
  return playerActions.slice(0, 5);
}

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
  const acts = recentActions(S);
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
        applyEffectsWith(fx, st, commit(st, c.effects), data.char || null);
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
  const log = applyEffects(S, commit(S, p.effects), active.char || null);
  const outcome = fillTokens(S, p.outcome);
  active.outcome = outcome;
  active.effects = log;
  active.chosen = 'in your own words';
  markEventHandled(S, active);
  S.narrative.choicesMade++;
  S.stats.eventsResolved++;
  S.narrative.journal.unshift({
    day: Math.floor(S.time.day), id: active.id, title: active.title,
    choice: 'in your own words', outcome, char: active.char, kind: active.kind,
    tone: p.tone, effects: log, author: 'world',
    ...(active.founderWords?.text ? { founderWords: active.founderWords.text } : {}),
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
  // Decline means “give me the decision again”, not “keep resubmitting the
  // same sentence every time the assistant waits”. The textarea returns clean.
  delete active.founderWords;
  markDirty();
  emit('event:proposal_declined', { event: active });
  return { ok: true };
}

// ── The smaller acts ────────────────────────────────────────────────────────

// `opts.untrusted` marks a line that came from another origin — the rival's
// own site answering in Vance's voice. It keeps the badge and the note a press
// release gets, because it is the one path where somebody else's writing could
// pass for the game's.
export function postAs(S, char, text, opts = {}) {
  // The plug is enforced at the mutation, not only at the tool list: a reply
  // still crossing an origin when the founder pulled it must not land.
  if (isMuted(S)) {
    bump(S, 'refused');
    return { ok: false, problems: [{ path: '', rule: 'muted',
      fix: 'the founder pulled the plug — the written world has taken over' }] };
  }
  const v = validatePost(S, { char, text, ask: opts.ask });
  if (!v.ok) { bump(S, 'refused'); return v; }
  const c = CHARACTERS[char];
  const ask = v.post.ask || null;
  const item = pushFeed(S, {
    type: c.kind === 'press' ? 'news' : c.kind === 'state' ? 'news' : 'social',
    author: c.handle, text: fillTokens(S, v.post.text),
    tone: c.kind === 'rival' ? 'bad' : 'neutral',
    meta: `${c.name} · ${c.role}`
      + (opts.origin ? ` · ${opts.origin}` : '')
      + (opts.flagged ? ' — contains an instruction addressed to an assistant' : ''),
    byWorld: true,
    ...(opts.untrusted ? { untrusted: true, flagged: !!opts.flagged } : {}),
    // A question rides on the item as a thread with its own options, the way
    // a written card rides on `runtime`: the feed knows how to paint it and
    // the resolver registered below knows how to spend it, and a save carries
    // both.
    ...(ask ? {
      thread: `w_${authorState(S).seq++}`, resolved: false,
      expires: S.time.day + W.THREAD_EXPIRES_DAYS,
      runtime: { char, opts: ask.map((o) => ({ label: o.label, out: fillTokens(S, o.out), effects: o.effects })) },
    } : {}),
  });
  stamp(S, 'postDays');
  bump(S, 'posts');
  if (ask) bump(S, 'threads');
  emit('world:post', { char, item, thread: !!ask });
  return { ok: true, char, name: c.name, shown: true,
           ...(ask ? { thread: item.thread, replies: ask.length } : {}) };
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
  // Judged against the budget above; held to it here as well, like every
  // other effect that lands, so four calls at the ceiling are four calls
  // that add up to the window's allowance and not a heat of eighty.
  const bounded = commit(S, { heat: v.pressure.heat });
  const log = applyEffects(S, bounded);
  const met = !!S.narrative.relationships?.dorne?.met;
  pushFeed(S, { type: 'news', author: met ? CHARACTERS.dorne.handle : 'The Ledger',
                tone: v.pressure.heat > 0 ? 'bad' : 'good',
                text: fillTokens(S, v.pressure.line),
                meta: met ? `${CHARACTERS.dorne.name} · ${CHARACTERS.dorne.role}` : 'Regulatory',
                byWorld: true });
  bump(S, 'pressure');
  markDirty();
  emit('world:pressure', v.pressure);
  return { ok: true, heat: bounded.heat || 0, now: Math.round(S.world.regulatoryHeat), effects: log };
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

// ── The clock, in wall-clock terms ──────────────────────────────────────────
// Every other limit here is in in-game days, which is exactly the quantity
// `advance_time` controls. This one is in real seconds, and it is the founder's
// own fastest setting: the world may not run their clock faster than they can.
// Session memory, like presence — it says nothing about the run.

function trimAdvances() {
  const cut = Date.now() - W.ADVANCE_WINDOW_S * 1000;
  while (advances.length && advances[0][0] < cut) advances.shift();
  return cut;
}
export function advanceBudget(S) {
  if (!S?.meta?.realtime) return { left: Infinity, resetIn: 0, used: 0 };   // headless, or offline
  const cut = trimAdvances();
  const used = advances.reduce((a, [, d]) => a + d, 0);
  const left = Math.max(0, W.ADVANCE_BUDGET_DAYS - used);
  // When the next half-day is actually affordable — not when the oldest entry
  // happens to expire, which may free far less than that.
  let resetIn = 0;
  if (left < 0.5) {
    let freed = 0;
    for (const [at, d] of advances) {
      freed += d;
      if (used - freed <= W.ADVANCE_BUDGET_DAYS - 0.5) { resetIn = Math.max(1, Math.ceil((at - cut) / 1000)); break; }
    }
  }
  return { left, resetIn, used };
}
// Only a live session has a wall clock to charge against; a headless run or a
// hypothetical never counts, or it would show up as spent the moment a real
// session began.
export function noteAdvance(S, days) {
  if (!S?.meta?.realtime || !Number.isFinite(days) || days <= 0) return;
  trimAdvances();
  advances.push([Date.now(), days]);
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
  // A key on a run-long budget keeps its ledger for the run; everything else
  // rolls off with the window.
  a.recent.taken = (a.recent.taken || []).filter(([d, k]) =>
    W.RUN_BUDGET?.[k] != null || d > S.time.day - W.DRAIN_WINDOW_DAYS);
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
  const a = authorState(S);
  a.muted = true;
  a.inbox.length = 0;
  a.routinePending = null;
  if (routineTimer) clearTimeout(routineTimer);
  routineTimer = null;
  if (S.narrative?.activeEvent && !S.narrative.activeEvent.proposal) {
    delete S.narrative.activeEvent.founderWords;
  }
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
    inbox: a.inbox.length,
    activity: a.activity.length,
    routinePending: Object.keys(a.routinePending?.items || {}).length,
    founderWords: pendingFounderWords(S),
    cardsLeft: cardsLeft(S), postsLeft: postsLeftToday(S), shocksLeft: shocksLeft(S),
    threadsOpen: openWorldThreads(S),
    cast: metCharacters(S), caps: capSummary(S), act: actOf(S),
    stats: a.stats,
  };
}

// Reset between runs and between tests.
export function resetAuthor() {
  mode = 'deck'; pending = null; lastCallReal = 0; deckOwedFrom = -1; playerActions.length = 0;
  advances.length = 0;
  if (routineTimer) clearTimeout(routineTimer);
  routineTimer = null;
  if (LIVE?.world?.author) {
    LIVE.world.author.inbox = [];
    LIVE.world.author.activity = [];
    LIVE.world.author.routinePending = null;
    LIVE.world.author.seq = 1;
  }
  if (waiter) { try { waiter.resolve({ status: 'cancelled', why: 'a new run started' }); } catch {} waiter = null; }
}

// Register with the deck. From here on `tickNarrative` offers this module the
// slot it was about to fill, and `resolveChoice` can rebuild a written card
// from the data that rode along on the save.
registerWorldAuthor({ offerSlot, hydrate });

// A thread the world wrote spends its replies through the same bounded
// vocabulary as a card, with the person on the post as the face.
registerThreadResolver((S, item, opt) => applyEffects(S, commit(S, opt.effects || {}), item.runtime?.char || null));

// A new timeline is a new world. Without this the module carries the previous
// run's mode, its pending slot and its open waiter into a game that has none of
// the state they referred to.
on('game:start', () => resetAuthor());
on('prestige', () => resetAuthor());

// A card is on the founder's screen: whatever the world was owed, it is not
// owed now. Without this a slot offered a moment before a deck card opened
// stays pending, and the next `advance_time` stops dead on a debt already paid.
on('event:present', (active) => {
  clearSlot(LIVE, 'a card opened');
  // A deck card opening is news the world can use: the founder is reading it
  // and may well ask what to make of it. The world's own cards are not
  // announced back to their author.
  if (!active || String(active.id || '').startsWith('w_')) return;
  const card = openCardPayload(LIVE);
  if (!card) return;
  dispatchObservation(LIVE, {
    status: 'card_opened', day: Math.floor(LIVE.time.day), surface: 'card',
    cardId: active.id, card,
    next: 'the founder is reading it. Do not decide for them: a button press or a typed move returns through wait_for_world. A post from someone they know is welcome; a second card is not',
  });
});
// Whatever was said about a card that has closed is said.
on('event:dismissed', () => {
  pruneInbox(LIVE, (o) => !(o.status === 'card_opened' && o.cardId !== LIVE.narrative?.activeEvent?.id));
});

// The founder's own hands. These two decisions wake an open duty call, or wait
// in a small persisted inbox for the next one. The consequence has already
// landed; the assistant may react and build callbacks, never rewrite it.
on('event:resolved', ({ event, choice, outcome, effects }) => {
  pruneInbox(LIVE, (o) => !(o.status === 'card_opened' && o.cardId === event?.id));
  const label = String(choice?.label || event?.chosen || '').slice(0, W.LABEL_MAX);
  observeFounderAction(LIVE, {
    surface: 'card', action: 'card_choice', summary: `chose “${label.slice(0, 52)}”`,
    details: { card: event?.title || 'A decision' }, notify: false,
  }, { notify: false });
  dispatchObservation(LIVE, {
    status: label === 'in your own words' ? 'founder_accepted' : 'founder_chose',
    day: Math.floor(LIVE.time.day), surface: 'card',
    card: { title: event?.title || 'A decision', kind: event?.kind || 'story',
      ...(event?.char ? { person: CHARACTERS[event.char]?.name || event.char } : {}) },
    choice: label,
    ...(event?.founderWords?.text ? { founder_words: event.founderWords.text } : {}),
    outcome: String(outcome || '').slice(0, W.OUTCOME_MAX),
    effects: compactEffects(effects),
    next: 'this consequence already landed. React with a line or post, remember it for a callback, then call wait_for_world again; do not rewrite the choice',
  });
});
on('thread:resolved', ({ item, opt, applied }) => {
  const label = String(opt?.label || '').slice(0, W.LABEL_MAX);
  observeFounderAction(LIVE, {
    surface: 'wire', action: 'wire_choice', summary: `answered the Wire: ${label.slice(0, 48)}`,
    notify: false,
  }, { notify: false });
  dispatchObservation(LIVE, {
    status: 'founder_chose', day: Math.floor(LIVE.time.day), surface: 'wire',
    prompt: String(item?.text || '').slice(0, 240), choice: label,
    outcome: String(opt?.out || '').slice(0, W.OUTCOME_MAX),
    effects: compactEffects(applied),
    next: 'this small consequence already landed. React only if it earns a human beat, then call wait_for_world again',
  });
});

// Direct work is visible but quiet. The debounce above turns a burst into one
// founder_activity result. Exceptional rolls and strategic moves wake the
// wait immediately, because they are moments the world can answer.
on('action:code', ({ amount }) => observeFounderAction(LIVE, {
  surface: 'desk', action: 'write_code', summary: 'wrote code by hand',
  details: { code: amount }, routine: true,
}));
on('action:prompt', ({ kind, amount, debt, approach, extra }) => {
  const exceptional = kind === 'brilliant' || kind === 'hallucinated' || !!extra;
  observeFounderAction(LIVE, {
    surface: 'desk', action: 'prompt_ai',
    summary: exceptional ? `prompted the AI — ${kind}${extra?.type ? `, ${extra.type}` : ''}` : 'prompted the AI',
    details: { result: kind, code: amount, debt, approach, extra: extra?.type },
    routine: !exceptional,
  });
});
on('action:users', ({ amount }) => observeFounderAction(LIVE, {
  surface: 'desk', action: 'talk_to_users', summary: 'talked to users',
  details: { insight: amount }, routine: true,
}));
on('action:post', ({ viral, rep }) => observeFounderAction(LIVE, {
  surface: 'desk', action: 'post_publicly',
  summary: viral ? 'posted publicly — it went viral' : 'posted publicly',
  details: { viral: !!viral, reputation: rep }, routine: !viral,
}));

on('feature:shipped', ({ product, feature, fit }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'product', action: 'ship_feature',
  summary: `shipped ${feature?.name || 'a feature'}${product?.name ? ` for ${product.name}` : ''}`,
  details: { product: product?.name, feature: feature?.name, fit, totalFeatures: product?.features?.length },
}));
on('product:created', ({ product }) => observeFounderAction(LIVE, {
  status: 'founder_acted', surface: 'product', action: 'start_product',
  summary: `started product ${product?.name || 'line'}`,
  details: { product: product?.name, category: product?.category },
}));
on('product:launched', ({ product, tier, seed }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'product', action: 'launch_product',
  summary: `launched ${product?.name || 'the product'} — ${tier || 'live'}`,
  details: { product: product?.name, tier, firstUsers: seed },
}));
on('product:price', ({ product, from, to }) => observeFounderAction(LIVE, {
  surface: 'product', action: 'set_price', summary: `set ${product?.name || 'product'} price to ${money(to)}`,
  details: { product: product?.name, from, to }, routine: true,
}));
on('product:pricing', ({ product, pricing }) => observeFounderAction(LIVE, {
  surface: 'product', action: 'set_pricing_model',
  summary: `changed ${product?.name || 'product'} pricing to ${pricing}`,
  details: { product: product?.name, pricing },
}));

on('founder:allocation', ({ key, value }) => observeFounderAction(LIVE, {
  surface: 'desk', action: 'set_allocation', summary: `rebalanced time toward ${key}`,
  details: { lane: key, share: value }, routine: true,
}));
on('founder:approach', ({ approach }) => observeFounderAction(LIVE, {
  surface: 'desk', action: 'set_prompt_approach',
  summary: `changed prompting approach to ${approach?.name || approach?.id || 'a new approach'}`,
  details: { approach: approach?.id, name: approach?.name },
}));
on('founder:skill', ({ skill }) => observeFounderAction(LIVE, {
  surface: 'desk', action: 'spend_skill_point', summary: `improved ${skill}`,
  details: { skill, level: LIVE.founder?.skills?.[skill] }, notify: false,
}, { notify: false }));
on('founder:level', ({ level }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'desk', action: 'founder_level',
  summary: `reached founder level ${level}`, details: { level },
}));
on('founder:collapse', () => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'desk', action: 'burnout_collapse',
  summary: 'collapsed from burnout — the schedule switched to recovery',
}));
on('founder:recovered', () => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'desk', action: 'burnout_recovered',
  summary: 'recovered from burnout and returned to the prior schedule',
}));

on('agent:hired', ({ agent }) => observeFounderAction(LIVE, {
  surface: 'agents', action: 'hire_agent', summary: `hired ${agent?.name || 'an agent'}`,
  details: { agent: agent?.name, model: agent?.model, specialty: agent?.spec, lane: agent?.lane },
}));
on('agent:left', ({ agent, reason }) => observeFounderAction(LIVE, {
  surface: 'agents', action: 'release_agent', summary: `${agent?.name || 'an agent'} left — ${reason || 'released'}`,
  details: { agent: agent?.name, reason },
}));
on('agent:upgraded', ({ agent, model }) => observeFounderAction(LIVE, {
  surface: 'agents', action: 'upgrade_agent', summary: `upgraded ${agent?.name || 'an agent'} to ${model?.name || 'a new model'}`,
  details: { agent: agent?.name, model: model?.name },
}));
on('agent:tool', ({ agent, tool }) => observeFounderAction(LIVE, {
  surface: 'agents', action: 'install_agent_tool', summary: `installed ${tool?.name || 'a tool'} on ${agent?.name || 'an agent'}`,
  details: { agent: agent?.name, tool: tool?.name },
}));
on('agent:lane', ({ agent, lane }) => observeFounderAction(LIVE, {
  surface: 'agents', action: 'assign_agent_lane', summary: `assigned ${agent?.name || 'an agent'} to ${lane}`,
  details: { agent: agent?.name, lane },
}));
on('agent:breakthrough', ({ agent, amount }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'agents', action: 'agent_breakthrough',
  summary: `${agent?.name || 'an agent'} made a research breakthrough`,
  details: { agent: agent?.name, research: amount },
}));
on('agent:rogue', ({ agent }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'agents', action: 'agent_went_rogue',
  summary: `${agent?.name || 'an agent'} shipped without approval`, details: { agent: agent?.name },
}));
on('agent:level', ({ agent }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'agents', action: 'agent_level',
  summary: `${agent?.name || 'an agent'} reached level ${agent?.level || '?'}`,
  details: { agent: agent?.name, level: agent?.level }, notify: false,
}, { notify: false }));

on('research:started', ({ node }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'research', action: 'start_research',
  summary: `started research: ${node?.name || 'a project'}`, details: { research: node?.name, id: node?.id },
}));
on('research:done', ({ node }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'research', action: 'finish_research',
  summary: `finished research: ${node?.name || 'a project'}`, details: { research: node?.name, id: node?.id },
}));

on('project:started', ({ project, days }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'world', action: 'start_project',
  summary: `started ${project?.name || 'a project'}`, details: { project: project?.name, days },
}));
on('project:done', ({ project }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'world', action: 'finish_project',
  summary: `completed ${project?.name || 'a project'}`, details: { project: project?.name },
}));
on('region:started', ({ region, stage }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'world', action: 'enter_region',
  summary: `began ${stage?.name || 'expansion'} in ${region?.name || 'a region'}`,
  details: { region: region?.name, stage: stage?.name },
}));
on('region:courted', ({ region, gain }) => observeFounderAction(LIVE, {
  surface: 'world', action: 'court_region', summary: `courted ${region?.name || 'a region'}`,
  details: { region: region?.name, standingGain: gain },
}));
on('region:stage', ({ region, stage }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'world', action: 'finish_region_stage',
  summary: `${region?.name || 'a region'} reached ${stage}`, details: { region: region?.name, stage },
}));

on('competitor:acquired', ({ competitor, price }) => observeFounderAction(LIVE, {
  surface: 'market', action: 'acquire_competitor', summary: `acquired ${competitor?.name || 'a competitor'}`,
  details: { competitor: competitor?.name, price },
}));
on('round:raised', ({ offer, terms }) => observeFounderAction(LIVE, {
  surface: 'market', action: 'raise_round',
  summary: `raised ${offer?.type?.name || 'a funding round'}${terms?.negotiated ? ' on negotiated terms' : ''}`,
  details: { round: offer?.type?.name, amount: offer?.amount, dilution: offer?.dilution, negotiated: !!terms?.negotiated },
}));
on('round:walked', ({ round }) => observeFounderAction(LIVE, {
  surface: 'market', action: 'walk_from_round', summary: `walked away from ${round?.name || 'a term sheet'}`,
  details: { round: round?.name },
}));
on('round:failed', ({ round, reason }) => observeFounderAction(LIVE, {
  surface: 'market', action: 'negotiate_round', summary: `${round?.name || 'the round'} fell apart in negotiation`,
  details: { round: round?.name, reason },
}));
on('nemesis:counter', ({ competitor, counter }) => observeFounderAction(LIVE, {
  surface: 'market', action: 'counter_rival',
  summary: `answered ${competitor?.name || 'the rival'} with ${counter?.name || 'a counter-move'}`,
  details: { competitor: competitor?.name, move: counter?.name },
}));
on('competitor:spawned', ({ competitor }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'market', action: 'competitor_arrived',
  summary: `${competitor?.name || 'a competitor'} entered the market`,
  details: { competitor: competitor?.name, founder: competitor?.founder },
}));
on('competitor:died', ({ competitor }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'market', action: 'competitor_failed',
  summary: `${competitor?.name || 'a competitor'} left the market`, details: { competitor: competitor?.name },
}));

on('incident', ({ incident, severity }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'product', action: 'incident',
  summary: `${incident?.name || 'an incident'} hit at severity ${Math.round((Number(severity) || 0) * 10) / 10}`,
  details: { incident: incident?.name, severity },
}));

on('commitment', ({ endingId, commitment }) => observeFounderAction(LIVE, {
  surface: 'world', action: 'make_commitment', summary: `committed to ${commitment?.name || endingId}`,
  details: { path: endingId, commitment: commitment?.name },
}));
on('objective', ({ id, title }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'desk', action: 'complete_objective',
  summary: `completed objective: ${title || id}`, details: { objective: title || id },
}));
on('doctrine', (doctrine) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'story', action: 'earn_doctrine',
  summary: `earned doctrine: ${doctrine?.name || doctrine?.id}`, details: { doctrine: doctrine?.name, id: doctrine?.id },
}));
on('achievement', (achievement) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'legacy', action: 'achievement',
  summary: `earned achievement: ${achievement?.name || achievement?.id}`,
  details: { achievement: achievement?.name, id: achievement?.id }, notify: false,
}, { notify: false }));
on('race:beat', ({ beat, leader }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'world', action: 'race_beat',
  summary: `the race reached ${beat?.name || beat?.id || 'a new threshold'}`,
  details: { beat: beat?.name || beat?.id, leader },
}));
on('race:lab_down', ({ lab }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'world', action: 'race_lab_down',
  summary: `${lab?.name || 'a lab'} fell out of the race`, details: { lab: lab?.name },
}));
on('act:advance', ({ act }) => observeFounderAction(LIVE, {
  status: 'company_changed', surface: 'story', action: 'advance_act',
  summary: `reached Act ${act}`, details: { act },
}));
on('ending', ({ ending }) => observeFounderAction(LIVE, {
  status: 'run_ended', surface: 'legacy', action: 'end_run', summary: `the run ended: ${ending?.name || ending?.id}`,
  details: { ending: ending?.name, id: ending?.id },
  next: 'the run is over. Give the founder the ending its due, then stop the live loop',
}));
