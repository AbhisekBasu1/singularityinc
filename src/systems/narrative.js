// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE — draws cards from the deck, applies consequences, tracks arcs.
// ─────────────────────────────────────────────────────────────────────────────
import { EVENTS, EVENT_MAP } from '../data/events.js';
import { EVENTS as EB } from '../data/balance.js';
import { CHARACTERS } from '../data/characters.js';
import { computeMods, markDirty } from './modifiers.js';
import { rel, setFlag } from '../engine/state.js';
import { rand, chance, weightedPick, pick } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { fireAgent } from './agents.js';
import { totalUsers } from './product.js';

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

export function makeFx(S) {
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
    control: (n) => { S.world.controlPoints = (S.world.controlPoints || 0) + n; fx._log.push(['control', n]); },
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
    relate: (id, delta) => {
      const r = rel(id, S);
      if (delta.met !== undefined) r.met = delta.met;
      if (delta.affinity) r.affinity += delta.affinity;
      if (delta.respect) r.respect += delta.respect;
      if (delta.fear) r.fear += delta.fear;
      if (delta.arc !== undefined) r.arc = Math.max(r.arc, delta.arc);
      r.met = true;
      fx._log.push(['rel:' + id, delta.affinity || 0]);
    },
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

export function eligibleEvents(S) {
  const out = [];
  for (const e of EVENTS) {
    if (e.chained) continue;          // only reachable via fx.chain()
    if (e.once && S.narrative.seen[e.id]) continue;
    if (e.act && !e.act.includes(S.company.act)) continue;
    const cd = S.narrative.cooldowns[e.id];
    if (cd && S.time.day < cd) continue;
    try { if (e.when && !e.when(S)) continue; } catch (err) { continue; }
    out.push(e);
  }
  return out;
}

export function drawEvent(S, force) {
  const pool = eligibleEvents(S);
  if (!pool.length) return null;
  // Priority events fire immediately regardless of weight
  const prio = pool.filter((e) => (e.priority || 0) > 0).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  if (prio.length) return prio[0];
  if (force) return pick(pool);
  const m = computeMods(S);
  const weights = pool.map((e) => {
    let w = e.weight || 1;
    if (m.luck && (e.kind === 'opportunity' || e.kind === 'milestone')) w *= 1 + m.luck;
    if (m.luck && e.kind === 'crisis') w *= Math.max(0.3, 1 - m.luck * 0.5);
    return w;
  });
  return weightedPick(pool, weights);
}

export function presentEvent(S, e) {
  if (!e) return null;
  S.narrative.lastEventReal = Date.now();
  S.narrative.activeEvent = {
    id: e.id,
    title: e.title,
    kind: e.kind,
    char: e.char,
    body: safeCall(e.body, S, ''),
    choices: (e.choices || []).filter((c) => !c.req || safeCall(c.req, S, false)).map((c, i) => ({
      i, label: safeCall(c.label, S, ''), sub: safeCall(c.sub, S, ''), tone: c.tone || 'neutral',
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
  const legal = (e.choices || []).filter((c) => !c.req || safeCall(c.req, S, false));
  const choice = legal[index];
  if (!choice) return null;

  const fx = makeFx(S);
  let outcome = '';
  try { outcome = choice.effect ? (choice.effect(S, fx) || '') : ''; }
  catch (err) { console.error('[event effect]', e.id, err); }

  const written = !!active.runtime;
  if (!written) {
    S.narrative.seen[e.id] = true;
    S.narrative.cooldowns[e.id] = S.time.day + (e.cooldown || EB.BASE_INTERVAL_DAYS * 6);
  }
  S.narrative.choicesMade++;
  S.stats.eventsResolved++;
  S.narrative.journal.unshift({
    day: Math.floor(S.time.day), id: e.id, title: e.title,
    choice: typeof choice.label === 'function' ? choice.label(S) : choice.label,
    outcome, char: e.char, kind: e.kind, tone: choice.tone || 'neutral',
    effects: fx._log.slice(), ...(written ? { author: 'world' } : {}),
  });
  if (S.narrative.journal.length > 200) S.narrative.journal.pop();

  active.outcome = outcome;
  active.effects = fx._log.slice();
  active.chosen = choice.label;
  markDirty();
  emit('event:resolved', { event: active, choice, outcome, effects: fx._log });
  return { outcome, effects: fx._log };
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

function realGateOk(S, priority) {
  if (!S.meta?.realtime) return true;   // headless simulation / offline catch-up
  if (S._agentDriven) return true;      // days the assistant is running, not the clock
  const now = Date.now();
  const last = S.narrative.lastEventReal || 0;
  const floor = (priority ? EB.MIN_REAL_SECONDS_PRIORITY : EB.MIN_REAL_SECONDS) * 1000;
  return now - last >= floor;
}

export function tickNarrative(S) {
  if (S.narrative.activeEvent) return;
  // Scheduled follow-ups always take precedence — arcs must resolve.
  const q = S.narrative.queue;
  if (q?.length && q[0].at <= S.time.day && realGateOk(S, true)) {
    const next = q.shift();
    const ev = EVENT_MAP[next.id];
    if (ev) { presentEvent(S, ev); return; }
  }
  // Priority cards can jump the queue
  const pool = eligibleEvents(S);
  const prio = pool.filter((e) => (e.priority || 0) > 0);
  if (prio.length && realGateOk(S, true)) {
    prio.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    presentEvent(S, prio[0]);
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

function safeCall(fn, S, fallback) {
  if (typeof fn !== 'function') return fn ?? fallback;
  try { return fn(S); } catch (e) { return fallback; }
}

export function relationshipSummary(S) {
  return Object.entries(S.narrative.relationships)
    .filter(([id, r]) => r.met && CHARACTERS[id])
    .map(([id, r]) => ({ ...CHARACTERS[id], ...r, id }));
}
