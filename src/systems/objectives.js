// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVES — keeps 1–3 live goals in front of the player at all times.
// ─────────────────────────────────────────────────────────────────────────────
import { OBJECTIVES, OBJECTIVE_MAP } from '../data/objectives.js';
import { gainXp } from './founder.js';
import { emit } from '../engine/bus.js';

const LIVE = 3;

// An objective may carry `arch`, and then it belongs to that founder and to no
// other. It is filtered in three places rather than one: `activeObjectives` so
// the Ghost is never shown the Hacker's goal, `checkObjectives` so the Ghost is
// never quietly *paid* for it, and `objectiveProgress` so the count at the
// bottom of the Log is out of the number this founder could ever finish.
// A missing `arch` means everybody, which is every objective written before
// this one.
const mine = (S, o) => !o.arch || o.arch === (S.founder?.archetype || 'hacker');

export function activeObjectives(S) {
  const done = S.objectivesDone || (S.objectivesDone = {});
  const pool = OBJECTIVES.filter((o) => !done[o.id] && (o.act ?? 1) <= S.company.act && mine(S, o));
  // Prioritise the current act, then earlier acts (catch-up), required before optional.
  pool.sort((a, b) => {
    const ao = a.optional ? 1 : 0, bo = b.optional ? 1 : 0;
    if (ao !== bo) return ao - bo;
    const ad = Math.abs((a.act ?? 1) - S.company.act), bd = Math.abs((b.act ?? 1) - S.company.act);
    if (ad !== bd) return ad - bd;
    return OBJECTIVES.indexOf(a) - OBJECTIVES.indexOf(b);
  });
  return pool.slice(0, LIVE);
}

export function checkObjectives(S) {
  const done = S.objectivesDone || (S.objectivesDone = {});
  const gained = [];
  for (const o of OBJECTIVES) {
    if (done[o.id]) continue;
    if ((o.act ?? 1) > S.company.act) continue;
    if (!mine(S, o)) continue;
    let ok = false;
    try { ok = o.test(S); } catch (e) { ok = false; }
    if (!ok) continue;
    done[o.id] = Math.floor(S.time.day);
    const r = o.reward || {};
    if (r.xp) gainXp(S, r.xp);
    if (r.cash) S.company.cash += r.cash;
    if (r.rep) S.resources.reputation += r.rep;
    if (r.insight) S.resources.insight += r.insight;
    if (r.research) S.resources.research += r.research;
    gained.push(o);
    emit('objective', o);
  }
  return gained;
}

export function objectiveProgress(S) {
  const done = Object.keys(S.objectivesDone || {}).length;
  return { done, total: OBJECTIVES.filter((o) => mine(S, o)).length };
}
