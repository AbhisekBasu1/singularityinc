// ─────────────────────────────────────────────────────────────────────────────
// THE CHANNEL — the room the roster talks in, generated and never stored.
//
// Same rule as the Record it is read through: a pure function of `S`, salted by
// the day, so a day's transcript is byte-identical every time it is asked for
// and costs nothing in the save. Nothing here draws from the shared RNG —
// `agents/channel` is opened from a render path and `tail channel` from a
// prompt, and a draw in either would move every event roll after it.
//
// What a day contains comes from `S.agentsLog`, the small ring buffer
// `src/systems/agents.js` writes when a lane changes, an autonomy dial moves,
// somebody is hired, or the roster works an incident. A day with nothing in the
// buffer is most days, and those get ambient lines in the speakers' own trait
// registers — a channel that only speaks on incident days is a pager.
//
// Every sentence is in `src/data/channel.js`. This file decides who is in the
// room and what order they speak in, and writes no prose of its own.
// ─────────────────────────────────────────────────────────────────────────────
import { REGISTERS, LANE, INCIDENT, ONBOARD, AUTONOMY, AMBIENT } from '../data/channel.js';
import { LANES, VOICE } from '../data/agents.js';
import { CHARACTERS } from '../data/characters.js';
import { CHANNEL } from '../data/balance.js';
import { hash01 } from '../engine/rng.js';

const str = (v) => (v == null ? '' : String(v));
const laneName = (id) => LANES[id]?.name || str(id);

/** A stable 0..1 for this company, this day and this question. Never a draw. */
function h01(S, day, key) {
  return hash01(`${str(S?.company?.name)}:${Math.floor(day)}:${key}`);
}
/** One element of a list, chosen by the same stable hash. */
function at(list, r) {
  if (!list || !list.length) return '';
  return list[Math.floor(r * list.length) % list.length];
}

function fill(text, tok) {
  return str(text).replace(/\{(\w+)\}/g, (m, k) => (tok[k] == null ? m : String(tok[k])));
}

/** The lines an agent could say when nothing in particular happened. */
function registerFor(a, r) {
  const pools = [];
  for (const t of a?.traits || []) if (REGISTERS[t]) pools.push(REGISTERS[t]);
  // No trait with a register: the specialty is the register, and those lines
  // already exist. They are addressed to the founder, which is what an agent
  // with nothing else to say sounds like in a room.
  if (!pools.length && VOICE[a?.spec]) pools.push(VOICE[a.spec]);
  if (!pools.length) return '';
  return at(at(pools, r), (r * 7.13) % 1);
}

/** Whoever is not `a`, chosen stably. Null on a roster of one. */
function other(roster, a, r) {
  const rest = roster.filter((x) => x !== a);
  return rest.length ? at(rest, r) : null;
}

const inLane = (roster, lane) => roster.filter((a) => a.lane === lane);
const hasTrait = (a, t) => (a?.traits || []).includes(t);

// The day's log entries, oldest first. `agentsLog` is unshifted, so this
// reverses; the buffer is capped at a few dozen and this is one pass over it.
function logFor(S, day) {
  const d = Math.floor(day);
  return (S?.agentsLog || []).filter((e) => e && Math.floor(e.day) === d).slice().reverse();
}

/**
 * One day in the channel: `[{ at, who, text }]`, in the order it was said.
 * Empty when there is nobody to talk to — a channel needs two.
 */
export function channelDay(S, day) {
  const d = Math.floor(day);
  const roster = (S?.agents || []).filter((a) => a && a.status !== 'archived');
  if (roster.length < CHANNEL.MIN_ROSTER) return [];
  const out = [];
  const say = (who, text) => { const t = str(text).trim(); if (t) out.push({ who: str(who), text: t }); };
  const tok = {
    founder: str(S?.founder?.name), company: str(S?.company?.name),
    product: str(S?.products?.[0]?.name || S?.company?.name),
    k: String(2 + Math.floor(h01(S, d, 'k') * 40)),
  };

  const entries = logFor(S, d).slice(0, CHANNEL.EVENTS_PER_DAY);
  for (const [i, e] of entries.entries()) {
    const key = `${e.kind}${i}`;
    const who = roster.find((a) => a.id === e.id) || null;
    const speaker = who || at(roster, h01(S, d, key + 'w'));
    if (e.kind === 'lane') {
      const t = { ...tok, a: str(e.name || speaker?.name), from: laneName(e.from), to: laneName(e.to),
        k: String(Math.max(1, Math.round(e.days || 0))) };
      say(e.name || speaker?.name, fill(at(LANE.moved, h01(S, d, key + '1')), t));
      const b = other(roster, who, h01(S, d, key + '2'));
      if (b) {
        const agrees = h01(S, d, key + '3') < CHANNEL.AGREE_CHANCE;
        say(b.name, fill(at(agrees ? LANE.support : LANE.objection, h01(S, d, key + '4')), { ...t, b: str(b.name) }));
      }
    } else if (e.kind === 'incident') {
      const t = { ...tok, inc: str(e.name) || str(e.what) };
      const ops = inLane(roster, 'ops');
      const build = inLane(roster, 'build');
      const opsWho = ops.length ? at(ops, h01(S, d, key + '1')) : at(roster, h01(S, d, key + '1'));
      const buildWho = build.length ? at(build, h01(S, d, key + '2')) : other(roster, opsWho, h01(S, d, key + '2'));
      say(opsWho?.name, fill(at(INCIDENT.ops, h01(S, d, key + '3')), t));
      if (buildWho) say(buildWho.name, fill(at(INCIDENT.build, h01(S, d, key + '4')), { ...t, k: tok.k }));
      if (h01(S, d, key + '5') < CHANNEL.CLEARED_CHANCE) say(opsWho?.name, fill(at(INCIDENT.after, h01(S, d, key + '6')), t));
    } else if (e.kind === 'autonomy') {
      const t = { ...tok, a: str(e.name || speaker?.name), k: String(Math.round((e.to ?? 0) * 100)) };
      const pool = (e.to ?? 0) < (e.from ?? 0) ? AUTONOMY.cut : AUTONOMY.raised;
      say(e.name || speaker?.name, fill(at(pool, h01(S, d, key + '1')), t));
    } else if (e.kind === 'hire') {
      // The `e11_aria_asks` premise, happening: a new instance arrives with her
      // context and none of her history, and asks the room about the founder.
      // Three answers, and which one she gives is the founder's own doing.
      // Before the card she has no standing to answer at all; after it she
      // keeps the document and answers from it; and a founder who audited her
      // gets an ARIA who sends the question up rather than answer for them.
      const fl = S?.narrative?.flags || {};
      const answer = fl.audited_aria ? ONBOARD.routed
        : fl.aria_asked_once ? ONBOARD.answered : ONBOARD.before;
      say(e.name || speaker?.name, fill(at(ONBOARD.asks, h01(S, d, key + '1')), tok));
      say(CHARACTERS.aria?.name, fill(at(answer, h01(S, d, key + '2')), tok));
    }
  }

  // Most days nothing was logged. Somebody still says something.
  const want = out.length ? (h01(S, d, 'extra') < CHANNEL.AMBIENT_CHANCE ? 1 : 0) : CHANNEL.AMBIENT_LINES;
  for (let i = 0; i < want; i++) {
    const a = at(roster, h01(S, d, `amb${i}`));
    const useRegister = h01(S, d, `reg${i}`) < CHANNEL.REGISTER_CHANCE;
    const b = other(roster, a, h01(S, d, `ambb${i}`));
    const text = useRegister ? registerFor(a, h01(S, d, `regl${i}`)) : at(AMBIENT, h01(S, d, `ambl${i}`));
    say(a?.name, fill(text, { ...tok, b: str(b?.name || a?.name),
      k: String(2 + Math.floor(h01(S, d, `ambk${i}`) * 40)) }));
  }

  // And the one who agrees with everybody, once, after somebody else.
  const syco = roster.find((a) => hasTrait(a, 'sycophant'));
  if (syco && out.length && out[out.length - 1].who !== syco.name
      && h01(S, d, 'syco') < CHANNEL.SYCOPHANT_CHANCE) {
    say(syco.name, fill(at(REGISTERS.sycophant, h01(S, d, 'sycol')), tok));
  }

  // Stamp the transcript. A channel prints times, and the times are the only
  // clock this game has ever shown; they climb through a working day and one
  // of them is always too late.
  const start = 7 + Math.floor(h01(S, d, 'hour') * 3);
  let mins = start * 60 + Math.floor(h01(S, d, 'min') * 50);
  return out.map((l, i) => {
    if (i) mins += 7 + Math.floor(h01(S, d, `gap${i}`) * 190);
    const m = mins % (24 * 60);
    return { at: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, ...l };
  });
}

/**
 * Which days the channel keeps, newest first. A window rather than the whole
 * run: the room is a room, not an archive, and the count is read seven times a
 * second by the Record's title bar.
 */
export function channelDays(S) {
  const today = Math.floor(S?.time?.day || 0);
  const roster = S?.agents || [];
  if (roster.length < CHANNEL.MIN_ROSTER) return [];
  // The room did not exist before there were two in it, so the window starts
  // no earlier than the day the second one arrived.
  const hired = roster.map((a) => Math.floor(a?.hiredDay ?? 0)).sort((x, y) => x - y);
  const opened = hired[CHANNEL.MIN_ROSTER - 1] ?? 1;
  const first = Math.max(1, opened, today - CHANNEL.KEEP + 1);
  const out = [];
  for (let d = today; d >= first; d--) out.push(d);
  return out;
}

/** The last `n` lines said, oldest first — what `tail channel` prints. */
export function channelTail(S, n = CHANNEL.TAIL) {
  const out = [];
  for (const d of channelDays(S)) {
    out.unshift(...channelDay(S, d).map((l) => ({ ...l, day: d })));
    if (out.length >= n) break;
  }
  return out.slice(-n);
}
