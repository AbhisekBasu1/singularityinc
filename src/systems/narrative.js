// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE — draws cards from the deck, applies consequences, tracks arcs.
// ─────────────────────────────────────────────────────────────────────────────
import { EVENTS, EVENT_MAP } from '../data/events.js';
import { EVENTS as EB, TIME } from '../data/balance.js';
import { CHARACTERS } from '../data/characters.js';
import { computeMods, markDirty } from './modifiers.js';
import { rel, setFlag } from '../engine/state.js';
import { rand, chance, weightedPick, pick } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { fireAgent } from './agents.js';
import { totalUsers } from './product.js';
import { keptEvents } from './keep.js';
import { measure, steer } from './director.js';
import { tired } from './life.js';

// ── The world-author seam ───────────────────────────────────────────────────
// An assistant, when one is present, gets first refusal on the slot the deck is
// about to fill. `src/world/author.js` registers itself here at load; nothing
// in this file knows what it is. If nothing registers, or the offer is
// declined, or it times out, the deck draws exactly as it always has.
let offerSlotFn = null;      // (S, slot) => boolean — true means "wait, it is writing"
let hydrateFn = null;        // (S, data, id) => event — rebuild a runtime card
export function registerWorldAuthor({ offerSlot, hydrate } = {}) {
  offerSlotFn = offerSlot || null;
  hydrateFn = hydrate || null;
}

// `card` is the event whose choice is spending this collector, when there is
// one. `relate` reads its `char` to decide whether a nudge is an introduction.
export function makeFx(S, card = null) {
  const fx = {
    _log: [],
    cash: (n) => { S.company.cash += n; fx._log.push(['cash', n]); },
    code: (n) => { S.resources.code = Math.max(0, S.resources.code + n); fx._log.push(['code', n]); },
    insight: (n) => { S.resources.insight = Math.max(0, S.resources.insight + n); fx._log.push(['insight', n]); },
    rep: (n) => { S.resources.reputation = Math.max(0, S.resources.reputation + n); fx._log.push(['reputation', n]); },
    research: (n) => { S.resources.research = Math.max(0, S.resources.research + n); fx._log.push(['research', n]); },
    debt: (n) => { S.resources.techDebt = Math.max(0, S.resources.techDebt + n); fx._log.push(['techDebt', n]); },
    focus: (n) => { S.founder.focus = clamp(S.founder.focus + n, 0, S.founder.focusMax); fx._log.push(['focus', n]); },
    align: (n) => { S.resources.alignment = clamp(S.resources.alignment + n, 0, 1); fx._log.push(['alignment', n]); },
    heat: (n) => { S.world.regulatoryHeat = clamp(S.world.regulatoryHeat + n, 0, 100); fx._log.push(['heat', n]); },
    opinion: (n) => { S.world.publicOpinion = clamp(S.world.publicOpinion + n, 0, 1); fx._log.push(['opinion', n]); },
    influence: (n) => { S.resources.influence = Math.max(0, S.resources.influence + n); fx._log.push(['influence', n]); },
    // Letting an agent go, through the one path that writes a tombstone. A card
    // that spliced the roster directly left `agents/archive` with nothing in it
    // and every line of DEPARTURES unreachable.
    fire: (id, reason) => { const a = fireAgent(S, id, reason); if (a) fx._log.push(['agentLeft', a.name]); return a; },
    // Granted capacity. The loop rebuilds `computeCap` from modifiers every
    // frame, so a grant has to land here rather than on the cap itself.
    compute: (n) => { S.resources.computeGranted = Math.max(0, (S.resources.computeGranted || 0) + n); fx._log.push(['compute', n]); },
    control: (n) => { S.world.controlPoints = (S.world.controlPoints || 0) + n * computeMods(S).controlRate; fx._log.push(['control', n]); },
    users: (n) => {
      const p = S.products.find((x) => x.id === S.activeProductId) || S.products.find((x) => x.launched);
      if (p) { p.users = Math.max(0, p.users + n); fx._log.push(['users', n]); }
    },
    equity: (n) => {
      S.company.equity.founder = clamp(S.company.equity.founder + n, 0, 1);
      if (n < 0) S.company.equity.employees += -n;
      fx._log.push(['equity', n]);
    },
    days: (n) => { S.time.day += n; fx._log.push(['days', n]); },
    skill: (k, n) => { S.founder.skills[k] = Math.min(20, (S.founder.skills[k] || 1) + n); markDirty(); fx._log.push(['skill:' + k, n]); },
    flag: (k, v = true) => { setFlag(k, v, S); },
    unlock: (k) => { S.unlocks[k] = true; markDirty(); },
    achieve: (k) => emit('achieve', k),
    chance: (p) => chance(p),
    // A nudge is not an introduction. `met` is what puts a person in Contacts
    // and makes them callable, and it used to be set by every relate — so a
    // milestone that warmed three people the founder had never spoken to put
    // all three on the phone, and Crane's pass could arrive for a meeting that
    // never happened. It is set only when this is that person's own scene
    // (the card's `char`), or when the call says so by name.
    relate: (id, delta) => {
      const r = rel(id, S);
      if (delta.met !== undefined) r.met = delta.met;
      else if (card && card.char === id) r.met = true;
      if (delta.affinity) r.affinity += delta.affinity;
      if (delta.respect) r.respect += delta.respect;
      if (delta.fear) r.fear += delta.fear;
      if (delta.arc !== undefined) r.arc = Math.max(r.arc, delta.arc);
      fx._log.push(['rel:' + id, delta.affinity || 0]);
    },
    meet: (id) => fx.relate(id, { met: true }),
    competitorHit: (frac) => {
      for (const c of S.market.competitors) {
        if (c.status !== 'active') continue;
        c.users *= 1 - frac; c.mrr *= 1 - frac; c.funding *= 1 - frac * 0.5;
      }
      fx._log.push(['rivals', -frac]);
    },
    competitorKill: (tag) => {
      const c = S.market.competitors.find((x) => x.status === 'active' && (x.scripted || x.tag === tag));
      if (c) { c.status = 'dead'; S.stats.competitorsCrushed++; }
      else { const a = S.market.competitors.filter((x) => x.status === 'active'); if (a.length) { a[0].status = 'dead'; S.stats.competitorsCrushed++; } }
    },
    fireAll: () => { const ids = S.agents.map((a) => a.id); ids.forEach((id) => fireAgent(S, id, 'cut')); },
    killRogue: () => {
      const id = S.narrative.flags._rogue_agent_id;
      if (id) fireAgent(S, id, 'terminated');
      delete S.narrative.flags._rogue_pending; delete S.narrative.flags._rogue_agent_id;
      delete S.narrative.flags._rogue_agent_name;
    },
    constrainRogue: () => {
      const id = S.narrative.flags._rogue_agent_id;
      const a = S.agents.find((x) => x.id === id);
      if (a) { a.autonomy = 0.2; a.morale = Math.max(0.4, a.morale - 0.2); }
      delete S.narrative.flags._rogue_pending; delete S.narrative.flags._rogue_agent_id;
      delete S.narrative.flags._rogue_agent_name;
    },
    clearRogue: () => {
      const id = S.narrative.flags._rogue_agent_id;
      const a = S.agents.find((x) => x.id === id);
      if (a) a.autonomy = Math.min(1, a.autonomy + 0.15);
      delete S.narrative.flags._rogue_pending; delete S.narrative.flags._rogue_agent_id;
      delete S.narrative.flags._rogue_agent_name;
    },
    endRun: (ending, value) => { emit('run:end', { ending, value }); },
    // Schedule a specific follow-up card. This is how story arcs are built.
    chain: (eventId, inDays = 6) => {
      S.narrative.queue.push({ id: eventId, at: S.time.day + inDays });
      S.narrative.queue.sort((a, b) => a.at - b.at);
    },
  };
  return fx;
}

// ── Fatigue, and the escalation it buys ─────────────────────────────────────
// `times(S, id)` is how many times this card has already resolved — 0 the first
// time it is on screen. A card body that reads it can say something different
// on the second showing, and a card that does is not a repeat: it is a thread.
// That is why `esc: true` earns a higher ceiling than a card that would simply
// print itself again.
//
// Card authors: `times(S)` is passed to `body`, `title` and `sub` as the second
// argument, so an escalating card never needs to import this module.
export function times(S, id) { return (S?.narrative?.count?.[id]) | 0; }
function drawCount(S, id) { return (S?.narrative?.count?.[id]) | 0; }
function drawCap(e) {
  if (e.max) return e.max;
  return e.esc ? EB.DRAW_CAP_ESCALATING : EB.DRAW_CAP;
}

// `relax` is 0 (normal), 1 (ignore fatigue) or 2 (ignore fatigue and cooldown).
// Only `once` and `when` are absolute: a card that has had its moment, or whose
// preconditions are false, is never legal at any level.
export function eligibleEvents(S, relax = 0) {
  const out = [];
  // The written deck, and the cards the founder kept from a world that wrote
  // them. A kept card is `once`, act-gated, and faced only if that person has
  // been met this timeline — all of which the loop below already enforces.
  for (const e of EVENTS.concat(keptEvents(S))) {
    if (e.chained) continue;          // only reachable via fx.chain()
    if (e.once && S.narrative.seen[e.id]) continue;
    if (e.act && !e.act.includes(S.company.act)) continue;
    if (relax < 2) {
      const cd = S.narrative.cooldowns[e.id];
      if (cd && S.time.day < cd) continue;
    }
    if (relax < 1 && drawCount(S, e.id) >= drawCap(e)) continue;
    try { if (e.when && !e.when(S)) continue; } catch (err) { continue; }
    out.push(e);
  }
  return out;
}

// Every route through a written card must close the same lifecycle. The
// ordinary buttons call this from `resolveChoice`; the assistant-authored
// own-words route calls it after the founder presses Accept. Keeping it here
// prevents a once-only priority card from being dealt again simply because the
// founder answered with a sentence instead of a button.
export function markEventHandled(S, active = S?.narrative?.activeEvent) {
  if (!active || active.runtime) return false;
  const e = EVENT_MAP[active.id];
  if (!e) return false;
  S.narrative.seen[e.id] = true;
  (S.narrative.count ??= {})[e.id] = (S.narrative.count[e.id] || 0) + 1;
  S.narrative.cooldowns[e.id] = S.time.day + (e.cooldown || EB.BASE_INTERVAL_DAYS * 6);
  return true;
}

// Repairs saves produced before the own-words route closed that lifecycle.
// The journal is proof that a card resolved. Rebuild its seen/cooldown record,
// and discard only an impossible duplicate of a once-only card that is open
// again with no outcome.
export function repairEventHistory(S) {
  if (!S?.narrative) return { changed: false, dismissed: false };
  let changed = false;
  const journalIds = new Set();
  // A save written before fatigue existed has no count map. The journal is the
  // record of what actually fired, so rebuild from it rather than starting a
  // long run back at zero — otherwise loading a day-900 save re-opens every
  // card the founder has already exhausted.
  const rebuilt = {};
  for (const entry of S.narrative.journal || []) {
    const e = EVENT_MAP[entry?.id];
    if (!e) continue;
    journalIds.add(e.id);
    if (!S.narrative.seen[e.id]) { S.narrative.seen[e.id] = true; changed = true; }
    rebuilt[e.id] = (rebuilt[e.id] || 0) + 1;
    const until = Number(entry.day) + (e.cooldown || EB.BASE_INTERVAL_DAYS * 6);
    if (Number.isFinite(until) && (S.narrative.cooldowns[e.id] || -Infinity) < until) {
      S.narrative.cooldowns[e.id] = until;
      changed = true;
    }
  }
  const counts = (S.narrative.count ??= {});
  for (const [id, n] of Object.entries(rebuilt)) {
    if ((counts[id] || 0) < n) { counts[id] = n; changed = true; }
  }
  const active = S.narrative.activeEvent;
  let dismissed = false;
  if (active && !active.runtime && !active.outcome && EVENT_MAP[active.id]?.once
      && journalIds.has(active.id)) {
    S.narrative.activeEvent = null;
    scheduleNext(S);
    changed = dismissed = true;
  }
  if (changed) markDirty();
  return { changed, dismissed };
}

export function drawEvent(S, force) {
  // Fatigue is a preference, not a wall. Act V exhausts its own act-gated cards
  // faster than the earlier acts do — it is the shortest pool and the one a run
  // arrives at with the most already seen — and a hard cap there bought 49-to-72
  // day silences in the endgame where the deck had drawn none before. So: strict
  // pool first, and only if that is empty does the cap lift. Dead air in the act
  // the player worked eleven hundred days to reach is worse than a fourth
  // showing of a card about compute contracts.
  // Act V is the shortest pool and the one a run reaches with the most already
  // spent, so it is the act that runs dry: measured, 45-to-61 day silences in
  // the endgame a player worked eleven hundred days to reach. Fatigue and
  // cooldown are both preferences about *which* card is best next; neither is a
  // reason to show nothing at all. Strict first, then lift the fatigue cap, then
  // lift cooldowns as well. `once` and `when` are never lifted.
  let pool = eligibleEvents(S);
  if (!pool.length) pool = eligibleEvents(S, 1);
  if (!pool.length) pool = eligibleEvents(S, 2);
  if (!pool.length) return null;
  // Priority events fire immediately regardless of weight
  const prio = pool.filter((e) => (e.priority || 0) > 0).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  if (prio.length) return prio[0];
  if (force) return pick(pool);
  const m = computeMods(S);
  // The director reads the last few cards once per draw and leans on the
  // weights: a run of crises eases, a long silence favours a face.
  const beat = measure(S);
  const weights = pool.map((e) => {
    let w = e.weight || 1;
    // Fatigue. Each previous firing of this exact card halves its odds, so a
    // deck of 167 spends its draws on its own breadth rather than orbiting the
    // dozen cards with the highest authored weight.
    w *= Math.pow(EB.FATIGUE, drawCount(S, e.id));
    if (m.luck && (e.kind === 'opportunity' || e.kind === 'milestone')) w *= 1 + m.luck;
    if (m.luck && e.kind === 'crisis') w *= Math.max(0.3, 1 - m.luck * 0.5);
    w *= steer(S, e, beat);
    return w;
  });
  return weightedPick(pool, weights);
}

export function presentEvent(S, e) {
  if (!e) return null;
  S.narrative.lastEventReal = Date.now();
  const n = drawCount(S, e.id);
  S.narrative.activeEvent = {
    id: e.id,
    title: safeCall(e.title, S, '', n),
    kind: e.kind,
    char: e.char,
    // A scene with more than one of the cast in it. `char` stays the primary
    // and keeps the portrait plate; `chars` is the small strip beside it, and
    // it may be a function because a dinner's guest list is a read of the run.
    ...(e.chars ? { chars: safeCall(e.chars, S, []) } : {}),
    body: safeCall(e.body, S, '', n),
    // A kept card resolves through the world's own hydrate, bounded at
    // landing; `runtime` is the door `resolveChoice` already knows.
    ...(e.kept ? { runtime: e.runtime, kept: true, author: 'kept' } : {}),
    // `oi` is the choice's index in the authored card. The legal list is
    // re-derived at resolve time, and an assistant's tool call can move the
    // world while the card is open; without the identity, button 2 could
    // resolve as choice 3 if a `req` flipped in between.
    // `req` receives the showing count too, so an escalating card can stop
    // offering a door on its final rung. Everything that only wanted `S`
    // ignores the second argument.
    choices: (e.choices || []).map((c, oi) => ({ c, oi }))
      .filter(({ c }) => !c.req || safeCall(c.req, S, false, n))
      // §A19. `sub` is the line under a choice that says what it costs. Below
      // `LIFE.SLEEP_JUDGEMENT` the founder does not get it — the plate shows
      // the doors and not the prices. Nothing about the choice changes; what
      // changes is whether you can read it. The Life panel says `SUBS HIDDEN ·
      // SLEEP` so it is legible that legibility is what has gone, rather than
      // looking like a bug.
      .map(({ c, oi }, i) => ({
        i, oi, label: safeCall(c.label, S, '', n),
        sub: tired(S) ? '' : safeCall(c.sub, S, '', n), tone: c.tone || 'neutral',
      })),
    outcome: null,
  };
  emit('event:present', S.narrative.activeEvent);
  return S.narrative.activeEvent;
}

export function resolveChoice(S, index) {
  const active = S.narrative.activeEvent;
  if (!active) return null;
  const e = EVENT_MAP[active.id]
    || (active.runtime && hydrateFn ? hydrateFn(S, active.runtime, active.id) : null);
  if (!e) { S.narrative.activeEvent = null; return null; }
  // What was offered is what resolves — by identity where the card carries it,
  // by position only for a save that predates the field.
  // Read before `markEventHandled` bumps it: an effect asking "how many times
  // has this happened" means the showings *before* this one, which is the same
  // number the body was rendered with.
  const n = drawCount(S, e.id);
  const offered = active.choices?.[index];
  const choice = offered && Number.isInteger(offered.oi)
    ? (e.choices || [])[offered.oi]
    : (e.choices || []).filter((c) => !c.req || safeCall(c.req, S, false, n))[index];
  if (!choice) return null;

  const fx = makeFx(S, e);
  let outcome = '';
  try { outcome = choice.effect ? (choice.effect(S, fx, n) || '') : ''; }
  catch (err) { console.error('[event effect]', e.id, err); }

  const written = !!active.runtime && !active.kept;
  markEventHandled(S, active);
  // A kept card is once per timeline, and the only proof it was dealt is here.
  if (active.kept) {
    S.narrative.seen[active.id] = true;
    (S.narrative.count ??= {})[active.id] = (S.narrative.count[active.id] || 0) + 1;
  }
  S.narrative.choicesMade++;
  S.stats.eventsResolved++;
  const choiceLabel = typeof choice.label === 'function' ? choice.label(S, n) : choice.label;
  S.narrative.journal.unshift({
    day: Math.floor(S.time.day), id: e.id, title: active.title || safeCall(e.title, S, '', n),
    choice: choiceLabel,
    outcome, char: e.char, kind: e.kind, tone: choice.tone || 'neutral',
    effects: fx._log.slice(),
    // A world card keeps its data on the entry, so it can be kept from the Log.
    ...(written ? { author: active.author || 'world', runtime: active.runtime } : active.kept ? { author: 'kept' } : {}),
  });
  trimJournal(S);

  active.outcome = outcome;
  active.effects = fx._log.slice();
  active.chosen = choiceLabel;
  markDirty();
  emit('event:resolved', { event: active, choice: { ...choice, label: choiceLabel }, outcome, effects: fx._log });
  return { outcome, effects: fx._log };
}

// Shed the ordinary before the memorable. A run's Log should still open on the
// day somebody first used the thing, however long the run got.
function trimJournal(S) {
  const j = S.narrative.journal;
  if (j.length <= EB.JOURNAL_CAP) return;
  for (let i = j.length - 1; i >= 0 && j.length > EB.JOURNAL_CAP; i--) {
    const e = j[i];
    if (e && (e.kind === 'milestone' || e.char)) continue;
    j.splice(i, 1);
  }
  // A Log that is *all* spine still has to shed something, oldest first.
  while (j.length > EB.JOURNAL_CAP) j.pop();
}

export function dismissEvent(S) {
  S.narrative.activeEvent = null;
  scheduleNext(S);
  emit('event:dismissed');
}

export function scheduleNext(S) {
  const base = Math.max(EB.MIN_INTERVAL_DAYS, EB.BASE_INTERVAL_DAYS - S.company.act * 0.22);
  const jitter = 1 + (rand() - 0.5) * 2 * EB.JITTER;
  S.narrative.nextEventDay = S.time.day + base * jitter;
}

// §A22. The real-time floor exists so a fast clock is not a slideshow of
// modals. It was a flat 26 seconds, which at 5× is about eighteen game days
// between cards against the four the deck is written for — measured, a player
// at 5× met roughly 40% of the deck a player at 1× met, and the whole pacing
// pass was done at headless speed where this gate does not exist at all. It
// scales with the speed now, so the density per *game day* is the same at every
// speed, with an absolute floor underneath so two cards can never land in the
// same breath. The auto-throttle in `ui/transport.js` is the other half: a card
// that opens at 5× drops the clock to 1× while it is on the table.
function realGateOk(S, priority) {
  if (!S.meta?.realtime) return true;   // headless simulation / offline catch-up
  if (S._agentDriven) return true;      // days the assistant is running, not the clock
  const now = Date.now();
  const last = S.narrative.lastEventReal || 0;
  const speed = TIME.SPEEDS[clamp((S.settings?.speed || 1) - 1, 0, TIME.SPEEDS.length - 1)] || 1;
  const base = priority ? EB.MIN_REAL_SECONDS_PRIORITY : EB.MIN_REAL_SECONDS;
  const hard = priority ? EB.MIN_REAL_SECONDS_PRIORITY_FLOOR : EB.MIN_REAL_SECONDS_FLOOR;
  return now - last >= Math.max(hard, base / speed) * 1000;
}

export function tickNarrative(S) {
  if (S.narrative.activeEvent) return;
  // Scheduled follow-ups always take precedence — arcs must resolve.
  const q = S.narrative.queue;
  if (q?.length && q[0].at <= S.time.day && realGateOk(S, true)) {
    const next = q.shift();
    const ev = EVENT_MAP[next.id];
    if (ev) { presentEvent(S, ev); return; }
    // An arc that cannot continue used to vanish without a trace. It still
    // cannot continue, but now it says so.
    console.warn('[narrative] a chain follow-up points at nothing:', next.id);
  }
  // Priority cards can jump the queue
  const pool = eligibleEvents(S);
  const prio = pool.filter((e) => (e.priority || 0) > 0);
  if (prio.length && realGateOk(S, true)) {
    prio.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const first = prio[0];
    // Most priority cards are authored continuity and remain non-negotiable.
    // The opening card is different: after an explicit AI handoff, giving its
    // slot to the assistant is the promised first magical moment. offerSlot's
    // timeout still returns it to this exact authored card if the world is quiet.
    if (first.worldClaimable && offerSlotFn && offerSlotFn(S, 'event')) return;
    presentEvent(S, first);
    return;
  }
  if (S.time.day >= S.narrative.nextEventDay && realGateOk(S, false)) {
    // First refusal to the world-author. It never gets to stall the game: the
    // offer carries its own timeout and returns false the moment it lapses.
    if (offerSlotFn && offerSlotFn(S, 'event')) return;
    const e = drawEvent(S);
    if (e) presentEvent(S, e);
    else scheduleNext(S);
  }
}

// `n` is the escalation argument — how many times this card has already fired.
// It is second so that the hundred and sixty cards that only ever wanted state
// keep working untouched, and so a card rendered by a harness that passes only
// `S` reads `n` as 0 and prints its first face.
function safeCall(fn, S, fallback, n = 0) {
  if (typeof fn !== 'function') return fn ?? fallback;
  try { return fn(S, n); } catch (e) { return fallback; }
}

export function relationshipSummary(S) {
  return Object.entries(S.narrative.relationships)
    .filter(([id, r]) => r.met && CHARACTERS[id])
    .map(([id, r]) => ({ ...CHARACTERS[id], ...r, id }));
}
