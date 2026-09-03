// ─────────────────────────────────────────────────────────────────────────────
// THE ACTIVITY STRIP — what the roster is doing, as a function of state.
//
// One row per agent: its lane, the sentence it would give if you asked, and how
// far through the shift it is. The roster is otherwise a rack of numbers that
// do not move, and a company of eleven machines that never visibly *do*
// anything is the central fiction of this game failing to render.
//
// Two rules, and the first is load-bearing.
//
//   · **Nothing here draws from the RNG.** The roster repaints seven times a
//     second in the workstation and once a tick in the console. A `pick()` on
//     that path would change the sentence every frame *and* silently advance
//     the shared stream, desynchronising every event draw and market roll after
//     it — the exact bug `askAria` had. The line is indexed by a hash of the
//     agent's id and the day, so it is stable while you read it and different
//     tomorrow.
//   · The latest thing the log says happened to this agent today wins. That is
//     what `S.agentsLog` is for, and a reassignment this morning is more true
//     than whatever its lane's pool would otherwise have said.
// ─────────────────────────────────────────────────────────────────────────────
import { LANE_WORK, IDLE_WORK, AFTER, PHASES } from '../data/activity.js';
import { LANES } from '../data/agents.js';

// FNV-1a, the same shape `hash01` uses, kept local so this module can be read
// without following it: a string in, an integer out, and no state anywhere.
function hash(s) {
  let h = 2166136261;
  const t = String(s);
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

/** The most recent log entry about this agent, today. Null when there is none. */
export function todayFor(S, id) {
  const day = Math.floor(num(S?.time?.day));
  const log = Array.isArray(S?.agentsLog) ? S.agentsLog : [];
  // `logAgent` unshifts, so the first match walking forward is the newest.
  for (const e of log) {
    if (!e || e.id !== id) continue;
    if (Math.floor(num(e.day, -1)) !== day) return null;   // older than today
    return e;
  }
  return null;
}

/**
 * One row per agent, in roster order. Pure, cheap, and safe on a save with no
 * `agentsLog` and no lane.
 *
 *   { id, name, lane, laneName, laneIcon, color, task, phase, phaseWord, note }
 */
export function activity(S) {
  const agents = Array.isArray(S?.agents) ? S.agents : [];
  if (!agents.length) return [];
  const day = Math.floor(num(S?.time?.day));
  // Where in the founder's day it is, 0 to 1. The clock already keeps this and
  // it is the only moving part in here.
  const frac = Math.min(0.999, Math.max(0, num(S?.time?.hourOfDay) / 24));
  return agents.map((a, i) => {
    const lane = a?.lane || 'build';
    const L = LANES[lane] || null;
    const pool = LANE_WORK[lane] || IDLE_WORK;
    // The shift turns over twice a day, so a founder watching the roster sees
    // it change without it flickering: the index moves at the half-day.
    const shift = frac < 0.5 ? 0 : 1;
    const h = hash(`${a?.id || i}:${day}:${shift}:${lane}`);
    const ev = todayFor(S, a?.id);
    const after = ev && AFTER[ev.kind] ? AFTER[ev.kind] : null;
    return {
      id: a?.id || `a${i}`,
      name: a?.name || 'agent',
      lane,
      laneName: L?.name || lane,
      laneIcon: L?.icon || '◉',
      color: LANE_COLOR[lane] || 'var(--cyan)',
      task: after || pool[h % pool.length] || IDLE_WORK[0],
      note: after ? (ev.kind || '') : '',
      // Each one is at a different point of its own shift; the offset is the
      // same hash, so the rows do not march in step.
      phase: (frac + (h % 1000) / 1000) % 1,
      phaseWord: PHASES[Math.min(PHASES.length - 1, Math.floor(frac * PHASES.length))],
    };
  });
}

export const LANE_COLOR = {
  build: 'var(--cyan)', growth: 'var(--green)', research: 'var(--violet)',
  ops: 'var(--ink-2)', moonshot: 'var(--pink)',
};

/** The one-line version, for a widget with no room for a roster. */
export function busiest(S) {
  const rows = activity(S);
  if (!rows.length) return null;
  const day = Math.floor(num(S?.time?.day));
  return rows[hash(`busy:${day}`) % rows.length];
}
