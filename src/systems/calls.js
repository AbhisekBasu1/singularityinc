// ─────────────────────────────────────────────────────────────────────────────
// THE PHONE — anyone the founder has met can be called.
//
// A call is a thread with rounds. In the written world the person on the line
// answers from `src/data/calls.js`: three exchanges and a hang-up, each topic
// carrying an authored effect the size of a Wire reply. With an assistant
// playing the world the same person is played live, in the founder's own
// words, and whatever is agreed on the line is a deal: it sits on the table
// until the founder hangs up, and it lands — bounded, through the world's own
// vocabulary — only if they accept it. The world can ring the founder too.
//
// Nothing here knows what an assistant is. The world layer registers three
// hands — is somebody playing this person, deliver a line to them, settle the
// deal — the way `narrative.js` takes an author and `feed.js` a resolver.
//
// State is `S.calls` and it is saved: a call open when the tab closes is still
// open when it reopens, the way a card is. A call holds the clock, the way a
// card does — `loop.js` checks it by name.
// ─────────────────────────────────────────────────────────────────────────────
import { CALLS as C, WORLD_AUTHOR as W } from '../data/balance.js';
import { CHARACTERS } from '../data/characters.js';
import { chance, pick } from '../engine/rng.js';
import { callTree } from '../data/calls.js';
import { rel, hasResearch } from '../engine/state.js';
import { departed } from '../world/validate.js';
import { makeFx } from './narrative.js';
import { THREAD_FX } from './feed.js';
import { totalUsers } from './product.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { clamp } from '../engine/format.js';
import { tired } from './life.js';

export function callsState(S) {
  if (!S.calls) S.calls = { active: null, log: [], seq: 1, lastRing: -99, said: {}, rang: {} };
  const c = S.calls;
  c.log ??= []; c.seq ??= 1; c.lastRing ??= -99;
  // `said` is what you have already said to whom, across every call — the
  // phone's memory. `rang` is which of the written world's calls have come.
  c.said ??= {}; c.rang ??= {};
  return c;
}

export function timesSaid(S, id, topicId) { return callsState(S).said[id]?.[topicId] || 0; }
function noteSaid(S, id, topicId) {
  const st = callsState(S);
  st.said[id] ??= {};
  st.said[id][topicId] = (st.said[id][topicId] || 0) + 1;
}

// ── The other end of the line ───────────────────────────────────────────────
// `present(S, id)`   somebody is playing this person live
// `deliver(S, call)` hand the founder's latest line to them; true if it landed
// `settle(S, call, effects)` land a deal, bounded; returns the effect log
let hooks = null;
export function registerCallWorld(h) { hooks = h || null; }
function playedLive(S, id) { try { return !!hooks?.present?.(S, id); } catch { return false; } }

export function activeCall(S) { return S?.calls?.active || null; }
export function callLog(S) { return callsState(S).log; }

// ── Who picks up ────────────────────────────────────────────────────────────

const day = (S) => Math.floor(S.time.day);

export function metForCalls(S, id) {
  if (!CHARACTERS[id]) return false;
  const r = S.narrative.relationships?.[id];
  if (r?.met) return true;
  return W.ALWAYS_AVAILABLE.includes(id) && totalUsers(S) > 0;
}

export function daysSinceCall(S, id) {
  const r = S.narrative.relationships?.[id];
  if (!r || r.lastCallDay == null) return null;
  return Math.max(0, day(S) - Math.floor(r.lastCallDay));
}

// Every reason a call cannot happen, with the note a greyed button prints. The
// order is the order a founder would want to hear them in.
export function canCall(S, id) {
  const c = CHARACTERS[id];
  if (!c) return { ok: false, reason: 'unknown', note: 'NO SUCH NUMBER' };
  if (id === 'aria') return { ok: false, reason: 'aria', note: 'HER OWN WINDOW' };
  // Somebody in the flat rather than on the phone. No call tree behind the
  // name, so the button says why instead of opening an empty plate.
  if (c.noPhone) return { ok: false, reason: 'nophone', note: 'NOT A PHONE THING' };
  if (id === 'helix' && !hasResearch('own_foundation_model', S)) return { ok: false, reason: 'unbuilt', note: 'NOT BUILT YET' };
  if (!metForCalls(S, id)) return { ok: false, reason: 'stranger', note: 'NOT MET' };
  if (S.ending) return { ok: false, reason: 'over', note: 'THE RUN IS OVER' };
  if (S._offline) return { ok: false, reason: 'offline', note: 'AWAY' };
  if (activeCall(S)) return { ok: false, reason: 'busy', note: 'ON A CALL' };
  const ev = S.narrative.activeEvent;
  if (ev && !ev.outcome) return { ok: false, reason: 'card', note: 'A CARD IS OPEN' };
  const r = rel(id, S);
  if ((r.affinity || 0) <= C.AFFINITY_FLOOR) return { ok: false, reason: 'cold', note: 'NOT PICKING UP' };
  const since = daysSinceCall(S, id);
  if (since != null && since < C.COOLDOWN_DAYS) {
    return { ok: false, reason: 'cooldown', note: `BACK IN ${C.COOLDOWN_DAYS - since} DAY${C.COOLDOWN_DAYS - since === 1 ? '' : 'S'}` };
  }
  if (S.founder.focus < C.FOCUS_COST) return { ok: false, reason: 'focus', note: `FOCUS ${Math.round(S.founder.focus)} OF ${C.FOCUS_COST}` };
  return { ok: true, reason: null, note: playedLive(S, id) ? 'LIVE' : `${C.FOCUS_COST} FOCUS` };
}

// What the line says when they do not pick up.
export function busyLine(S, id) {
  const t = callTree(id);
  try { return t?.busy?.(S, rel(id, S)) || 'It rings out.'; } catch { return 'It rings out.'; }
}

// Everyone with a number, for the Contacts app and the Story view.
export function contacts(S) {
  const out = [];
  for (const id of Object.keys(CHARACTERS)) {
    if (id === 'aria') continue;
    if (!metForCalls(S, id)) continue;
    const r = rel(id, S);
    out.push({ id, ...CHARACTERS[id], rel: r, can: canCall(S, id), since: daysSinceCall(S, id),
               live: playedLive(S, id), lastCall: lastCallWith(S, id) });
  }
  return out;
}

export function lastCallWith(S, id) {
  return callsState(S).log.find((c) => c.char === id) || null;
}

// ── Placing a call ──────────────────────────────────────────────────────────

function safeText(fn, S, r, fallback = '') {
  if (typeof fn !== 'function') return fn ?? fallback;
  try { return String(fn(S, r) ?? fallback); } catch { return fallback; }
}

export function startCall(S, id, { by = 'founder', opening = null } = {}) {
  const c = CHARACTERS[id];
  if (!c) return { ok: false, reason: 'unknown' };
  if (by === 'founder') {
    const can = canCall(S, id);
    if (!can.ok) return { ok: false, reason: can.reason, note: can.note };
    S.founder.focus = clamp(S.founder.focus - C.FOCUS_COST, 0, S.founder.focusMax);
  } else if (activeCall(S) || (S.narrative.activeEvent && !S.narrative.activeEvent.outcome)) {
    return { ok: false, reason: 'busy' };
  }
  const st = callsState(S);
  const r = rel(id, S);
  r.met = true;
  const mode = by === 'world' || playedLive(S, id) ? 'world' : 'written';
  const tree = callTree(id);
  let line = opening || safeText(tree?.pickup, S, r, `${c.name} picks up.`);
  // They remember the last call. When you ring somebody in the written world
  // and it has not been too long, the pickup carries what you spoke about.
  if (by === 'founder' && mode === 'written' && tree?.recall) {
    const m = memoryOf(S, id);
    if (m && m.since <= C.RECALL_DAYS) {
      const extra = safeText((S2, r2) => tree.recall(S2, r2, m), S, r, '');
      if (extra) line = `${line} ${extra}`;
    }
  }
  const call = {
    id: `call_${st.seq++}`, char: id, by, mode, day: day(S),
    rounds: [{ who: 'them', text: line, day: day(S) }],
    used: [], node: null, deal: {}, fxLog: [], pending: null,
    done: false, endedBy: null,
  };
  st.active = call;
  r.lastCallDay = S.time.day;
  if (by !== 'founder') st.lastRing = S.time.day;
  markDirty();
  emit('call:start', { call, by });
  return { ok: true, call };
}

// What the last call with somebody was about: how long ago, which topic, and
// the short noun the tree gave it (`about`), for a pickup line to lean on.
export function memoryOf(S, id) {
  const last = lastCallWith(S, id);
  if (!last) return null;
  const tree = callTree(id);
  const all = [...(tree?.topics || []), ...(tree?.rings || []).flatMap((g) => g.topics || [])];
  const flat = all.flatMap((t) => [t, ...(t.follow || [])]);
  const topic = flat.find((t) => t.id === last.topic) || null;
  return {
    since: Math.max(0, day(S) - last.day), by: last.by, topic: last.topic || null,
    about: topic?.about || null, calls: callLog(S).filter((c) => c.char === id).length,
    ring: last.ring || null,
  };
}

// The founder's own lines, so far.
export function roundsSaid(call) { return (call?.rounds || []).filter((x) => x.who === 'you').length; }

// ── The written world's side ────────────────────────────────────────────────

function whenOk(t, S, r, n = 0) { try { return !t.when || !!t.when(S, r, n); } catch { return false; } }

export function options(S) {
  const call = activeCall(S);
  if (!call || call.done || call.mode !== 'written') return [];
  const tree = callTree(call.char);
  if (!tree) return [];
  const r = rel(call.char, S);
  if (roundsSaid(call) >= C.MAX_ROUNDS) return [];
  const pool = call.node ? (call.node.items || []) : (tree.topics || []);
  const n = (t) => timesSaid(S, call.char, t.id);
  return pool
    .filter((t) => !call.used.includes(t.id) && !(t.once && n(t) > 0) && whenOk(t, S, r, n(t)))
    // Never said first; among those, what is true *today* — a topic with a
    // `when` is about something that just happened — ahead of the standing
    // conversation; then what has come up least. A phone that offers the same
    // three openers every call is a menu, not a person.
    .sort((a, b) => (n(a) - n(b)) || ((a.when ? 0 : 1) - (b.when ? 0 : 1)))
    // §A19. One topic fewer when the founder has not slept: the same person is
    // on the line and there is less of you to bring to it. The sort above has
    // already put the timely topics first, so what a tired call loses is the
    // bottom of the list rather than the thing that just happened.
    .slice(0, Math.max(2, C.TOPIC_KEEP - (tired(S) ? 1 : 0)))
    .map((t) => ({ id: t.id, label: safeText((S2, r2) => textOf(t.label, S2, r2, n(t)), S, r, t.id), again: n(t) > 0 }));
}

// Authored text may be a string or a function of (S, r, n) — `n` is how many
// times this topic has been said before, across every call with this person.
function textOf(v, S, r, n) { return typeof v === 'function' ? v(S, r, n) : v; }

function findTopic(call, id) {
  const tree = callTree(call.char);
  const pool = call.node ? (call.node.items || []) : (tree?.topics || []);
  return pool.find((t) => t.id === id) || null;
}

// A topic's effects may depend on the run — a bridge sized to the runway, a
// favour that costs what you can afford — so `fx` may be a function too.
function fxOf(t, S, r) { try { return (typeof t.fx === 'function' ? t.fx(S, r) : t.fx) || {}; } catch { return {}; } }

// Small, authored, and through the deck's own collector. `sleep` reaches the
// Life panel when there is one; a save without it simply ignores the key.
export function applyCallFx(S, id, fx = {}) {
  const f = makeFx(S);
  for (const [k, v] of Object.entries(fx)) {
    if (k === 'affinity' || k === 'respect' || k === 'fear') { f.relate(id, { [k]: v }); continue; }
    if (k === 'flags') { for (const n of v || []) f.flag(n); continue; }
    if (k === 'sleep') {
      if (S.founder.life) { S.founder.life.sleep = clamp((S.founder.life.sleep || 0) + v, 0, 1); f._log.push(['sleep', v]); }
      continue;
    }
    if (typeof f[k] === 'function') { f[k](v); continue; }
    if (THREAD_FX[k]) { THREAD_FX[k](S, v); f._log.push([k, v]); }
  }
  return f._log;
}

export function say(S, topicId) {
  const call = activeCall(S);
  if (!call || call.done) return { ok: false, reason: 'no_call' };
  if (call.mode !== 'written') return { ok: false, reason: 'live' };
  const t = findTopic(call, topicId);
  if (!t || !options(S).some((o) => o.id === topicId)) return { ok: false, reason: 'unavailable' };
  const r = rel(call.char, S);
  const n = timesSaid(S, call.char, t.id);
  const you = safeText((S2, r2) => textOf(t.label, S2, r2, n), S, r, topicId);
  call.rounds.push({ who: 'you', text: you, day: day(S) });
  const log = applyCallFx(S, call.char, fxOf(t, S, r));
  call.fxLog.push(...log);
  const reply = safeText((S2, r2) => textOf(t.reply, S2, r2, n), S, r, '…');
  call.rounds.push({ who: 'them', text: reply, day: day(S), fx: log });
  call.used.push(t.id);
  call.topic ??= t.id;          // the first thing you said is what the call was about
  call.lastTopic = t.id;
  noteSaid(S, call.char, t.id);
  call.node = t.follow?.length ? { items: t.follow } : null;
  markDirty();
  emit('call:round', { call, topic: t.id, reply });
  return { ok: true, reply, effects: log };
}

// ── The world's side ────────────────────────────────────────────────────────

export function founderSays(S, text) {
  const call = activeCall(S);
  if (!call || call.done) return { ok: false, reason: 'there is no call open' };
  if (call.mode !== 'written' && !playedLive(S, call.char)) {
    // The world went quiet mid-call. The line is still open, but nobody is on it.
    return { ok: false, reason: 'nobody is on the line — hang up, and try again later' };
  }
  if (call.mode === 'written') return { ok: false, reason: 'pick something to say' };
  if (call.pending && !call.pending.answered) return { ok: false, reason: 'they have not answered the last thing yet' };
  const t = String(text ?? '').trim();
  if (!t) return { ok: false, reason: 'say something first' };
  if (t.length > C.FOUNDER_LINE_MAX) return { ok: false, reason: `keep it under ${C.FOUNDER_LINE_MAX} characters` };
  if (roundsSaid(call) >= C.MAX_ROUNDS) return { ok: false, reason: 'that is enough for one call — hang up' };
  const st = callsState(S);
  call.rounds.push({ who: 'you', text: t, day: day(S) });
  call.pending = { id: `line_${st.seq++}`, text: t, delivered: false, answered: false };
  let delivered = false;
  try { delivered = !!hooks?.deliver?.(S, call); } catch { delivered = false; }
  call.pending.delivered = delivered;
  markDirty();
  emit('call:line', { call, delivered });
  return { ok: true, delivered, id: call.pending.id };
}

export function pendingLine(S) {
  const call = activeCall(S);
  const p = call?.pending;
  return call && p && !p.answered ? { ...p, call_id: call.id } : null;
}

// What the person on the line says back, and what it puts on the table.
export function worldReplies(S, { line, effects = {}, hangUp = false } = {}) {
  const call = activeCall(S);
  if (!call || call.done || call.mode !== 'world') return { ok: false, reason: 'no_call' };
  call.rounds.push({ who: 'them', text: String(line || '').trim(), day: day(S) });
  if (call.pending) call.pending.answered = true;
  for (const [k, v] of Object.entries(effects || {})) {
    if (k === 'flags') { call.deal.flags = [...(call.deal.flags || []), ...(v || [])]; continue; }
    if (!Number.isFinite(v) || v === 0) continue;
    call.deal[k] = Math.round(((call.deal[k] || 0) + v) * 1000) / 1000;
  }
  markDirty();
  emit('call:reply', { call, line, hangUp });
  if (hangUp) return { ok: true, ended: endCall(S, { by: 'them', accept: false }) };
  return { ok: true };
}

export function dealOnTable(S) {
  const call = activeCall(S);
  if (!call) return {};
  return Object.fromEntries(Object.entries(call.deal || {}).filter(([k, v]) => k === 'flags' ? Array.isArray(v) && v.length : Number.isFinite(v) && v !== 0));
}

// ── Hanging up ──────────────────────────────────────────────────────────────

export function hangUp(S, { accept = true } = {}) {
  const call = activeCall(S);
  if (!call || call.done) return { ok: false };
  return { ok: true, ...endCall(S, { by: 'founder', accept }) };
}

// The world went away under an open call: nobody is on the line any more.
export function lineDead(S, why = 'the line went dead') {
  const call = activeCall(S);
  if (!call || call.done || call.mode !== 'world') return false;
  call.rounds.push({ who: 'line', text: why, day: day(S) });
  endCall(S, { by: 'line', accept: false });
  return true;
}

function endCall(S, { by, accept }) {
  const call = activeCall(S);
  const st = callsState(S);
  const c = CHARACTERS[call.char];
  const r = rel(call.char, S);
  const tree = callTree(call.char);
  call.done = true;
  call.endedBy = by;
  call.pending = null;
  const deal = dealOnTable(S);
  let log = [];
  const hadDeal = Object.keys(deal).length > 0;
  if (call.mode === 'world' && hadDeal && accept && by === 'founder') {
    try { log = hooks?.settle?.(S, call, deal) || []; } catch (e) { console.error('[call] settle', e); log = []; }
    call.accepted = true;
  } else if (call.mode === 'written') {
    log = call.fxLog.slice();
  }
  if (by === 'founder' && tree?.bye) {
    const bye = safeText(tree.bye, S, r, '');
    if (bye) call.rounds.push({ who: 'them', text: bye, day: day(S), bye: true });
  }
  // What they remember you saying. Six lines, newest first, on the relationship.
  const yours = call.rounds.filter((x) => x.who === 'you');
  if (yours.length) {
    r.memory = [{ day: day(S), text: yours[yours.length - 1].text.slice(0, 160) }, ...(r.memory || [])].slice(0, C.MEMORY_KEEP);
  }
  const last = [...call.rounds].reverse().find((x) => x.who === 'them' && !x.bye);
  const entry = {
    day: day(S), id: call.id, kind: 'call', char: call.char,
    title: call.by !== 'founder' ? `${c.name} called` : `A call with ${c.name}`,
    choice: call.mode === 'world'
      ? (yours.length ? 'in your own words' : 'you listened')
      : (yours.map((x) => x.text).join(' / ') || 'you listened'),
    outcome: last?.text || '',
    tone: 'neutral', effects: log,
    ...(call.mode === 'world' ? { author: 'world' } : {}),
    ...(yours.length && call.mode === 'world' ? { founderWords: yours.map((x) => x.text).join(' / ').slice(0, 600) } : {}),
    ...(hadDeal && !call.accepted ? { declined: true } : {}),
  };
  S.narrative.journal.unshift(entry);
  S.stats.callsMade = (S.stats.callsMade || 0) + 1;
  st.log.unshift({
    id: call.id, char: call.char, day: call.day, by: call.by, mode: call.mode, endedBy: by,
    topic: call.topic || call.lastTopic || null, ring: call.ring || null,
    rounds: call.rounds.map((x) => ({ who: x.who, text: String(x.text).slice(0, 400) })),
    deal, accepted: !!call.accepted, effects: log,
  });
  if (st.log.length > C.LOG_KEEP) st.log.length = C.LOG_KEEP;
  st.active = null;
  markDirty();
  emit('call:end', { call, by, accepted: !!call.accepted, effects: log, deal });
  return { by, accepted: !!call.accepted, effects: log, deal, entry, call };
}

// ── The world rings the founder ─────────────────────────────────────────────

export function ringable(S, id) {
  if (!CHARACTERS[id] || W.NEVER_VOICED.includes(id)) return { ok: false, reason: 'not_yours' };
  if (id === 'helix' && !hasResearch('own_foundation_model', S)) return { ok: false, reason: 'unbuilt' };
  // The deck writes people out — a resignation, a retirement, an account going
  // dark. The phone honours it, and says which card did it.
  const gone = departed(S, id);
  if (gone) return { ok: false, reason: 'departed', why: gone.why };
  if (!metForCalls(S, id)) return { ok: false, reason: 'stranger' };
  if (S.ending) return { ok: false, reason: 'over' };
  if (S._offline) return { ok: false, reason: 'offline' };
  if (activeCall(S)) return { ok: false, reason: 'busy' };
  const ev = S.narrative.activeEvent;
  if (ev && !ev.outcome) return { ok: false, reason: 'card' };
  if (S.time.day < C.RING_MIN_DAY) return { ok: false, reason: 'too_early', when: `day ${C.RING_MIN_DAY}` };
  const st = callsState(S);
  const since = S.time.day - (st.lastRing ?? -99);
  if (since < C.RING_WINDOW_DAYS) return { ok: false, reason: 'rate', when: `day ${Math.ceil(st.lastRing + C.RING_WINDOW_DAYS)}` };
  return { ok: true };
}

export function ring(S, id, opening) {
  const can = ringable(S, id);
  if (!can.ok) return { ok: false, ...can };
  return startCall(S, id, { by: 'world', opening });
}

// The written world's own calls. Each tree may carry `rings`: what this person
// calls *you* about, and when. One a window, never while an assistant is
// playing the world (that is what `ring_the_founder` is for), never offline,
// and each ring once a run. The ring's own topics come first; once they are
// spent the ordinary ones follow, because a call that started about the outage
// still ends up about everything else.
export function pendingRings(S) {
  const out = [];
  for (const id of Object.keys(CHARACTERS)) {
    const tree = callTree(id);
    if (!tree?.rings?.length || !metForCalls(S, id)) continue;
    const r = rel(id, S);
    for (const g of tree.rings) {
      if (callsState(S).rang[g.id]) continue;
      if (!whenOk(g, S, r)) continue;
      out.push({ char: id, ring: g });
    }
  }
  return out;
}

export function tickRings(S, { force = false } = {}) {
  if (S._offline || playedLive(S, null)) return null;
  const due = pendingRings(S);
  if (!due.length) return null;
  // Whoever is due, not whoever is first in the cast list — or Sam's outage
  // call would open every run's phone, because incidents come early and Sam
  // comes before everyone else alphabetically.
  const { char, ring } = due.length > 1 ? pick(due) : due[0];
  if (!ringable(S, char).ok) return null;
  if (!force && !chance(C.RING_CHANCE)) return null;
  const r = rel(char, S);
  const opening = safeText(ring.opening, S, r, `${CHARACTERS[char].name} is calling.`);
  const res = startCall(S, char, { by: 'them', opening });
  if (!res.ok) return null;
  const st = callsState(S);
  st.rang[ring.id] = day(S);
  res.call.ring = ring.id;
  if (ring.topics?.length) res.call.node = { items: ring.topics };
  markDirty();
  return res.call;
}

// A compact transcript for anything that has to fit in a payload.
export function transcript(S, max = 6) {
  const call = activeCall(S);
  if (!call) return [];
  return call.rounds.slice(-max).map((x) => `${x.who === 'you' ? 'founder' : x.who === 'them' ? CHARACTERS[call.char]?.name || 'them' : 'line'}: ${String(x.text).replace(/\s+/g, ' ').slice(0, 160)}`);
}
