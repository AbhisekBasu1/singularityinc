// ─────────────────────────────────────────────────────────────────────────────
// WHAT WOULD HAPPEN
//
// The world gets to run the game forward on a copy of itself, see where it
// lands, and throw the copy away. It is how an assistant finds out whether the
// thing it is about to write is survivable before it writes it — and it is
// ARIA's own line, from long before any of this existed: *"I have run this
// forward eleven thousand times."*
//
// Three things make it safe rather than clever:
//
//   the state is a deep copy      nothing it does can reach the real run
//   the bus is silenced           the reducers emit as they go, and every one
//                                 of those listeners would be firing for events
//                                 in a future that is about to be discarded
//   the RNG is put back           the reducers draw from a shared stream, so a
//                                 forecast would otherwise change what actually
//                                 happens next — and a hypothetical that moves
//                                 the future is not a hypothetical
//   it yields between chunks      so the founder's own frame is never starved,
//                                 and the stop button can actually stop it
//
// It runs on the main thread on purpose. A Worker would need the module graph
// duplicated and a build step to bundle it, and this project does not have one.
// ─────────────────────────────────────────────────────────────────────────────
import { S, setState } from '../engine/state.js';
import { silence } from '../engine/bus.js';
import { rngState, setRngState } from '../engine/rng.js';
import { simulate } from '../engine/loop.js';
import { markDirty } from '../systems/modifiers.js';
import { applyEffects } from './effects.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { runwayDays } from '../systems/economy.js';

const MAX_DAYS = 365;
const CHUNK = 5;                 // in-game days between yields

function snapshot(s) {
  return {
    day: Math.floor(s.time.day),
    cash: s.company.cash,
    users: totalUsers(s),
    mrr: totalMrr(s),
    valuation: s.company.valuation,
    reputation: s.resources.reputation,
    alignment: s.resources.alignment,
    heat: s.world.regulatoryHeat,
    approval: s.world.publicOpinion,
    act: s.company.act,
    runway: runwayDays(s),
    research: Object.keys(s.research.done).length,
    race: s.world.race?.you ?? null,
  };
}

// A deep copy of the world that the real one cannot be reached through.
// `structuredClone` where it exists, JSON where it does not; the state is a
// plain serialisable object by design, which is what makes either work.
function copy(s) {
  try { if (typeof structuredClone === 'function') return structuredClone(s); } catch {}
  return JSON.parse(JSON.stringify(s));
}

export function forecastLimits() { return { MAX_DAYS }; }

// `changes` is the same effects vocabulary a card uses — so an assistant can
// ask "what does this card do to them over the next three months" and get an
// answer before the founder ever sees it.
export async function forecast({ days = 30, changes = null } = {}, signal) {
  const real = S;
  if (!real) return { ok: false, reason: 'no run in progress' };
  const want = Math.max(1, Math.min(MAX_DAYS, Math.round(Number(days) || 30)));

  const before = snapshot(real);
  const clone = copy(real);
  clone._forecast = true;
  clone.meta.realtime = false;        // no real-time event floor in a hypothetical
  delete clone._offline;

  // The reducers draw from the shared stream as they run, so a forecast would
  // otherwise change what actually happens next. Note where it is and put it
  // back: a hypothetical that moves the future is not a hypothetical.
  const rngAt = rngState();
  const unsilence = silence();
  let advanced = 0, stopped = null;
  try {
    setState(clone);
    markDirty();
    if (changes && typeof changes === 'object') applyEffects(clone, changes, null);

    while (advanced < want) {
      if (signal?.aborted) { stopped = 'stopped'; break; }
      const step = Math.min(CHUNK, want - advanced);
      simulate(step);
      advanced += step;
      // A hypothetical must not cost the founder their frame.
      await new Promise((r) => setTimeout(r, 0));
      if (clone.ending) { stopped = 'the run ends'; break; }
      if (clone.company.cash < 0 && before.cash >= 0) { stopped = 'the money runs out'; break; }
      // A card in a forecast is nobody's decision; clear it and keep going.
      if (clone.narrative.activeEvent) clone.narrative.activeEvent = null;
    }
  } catch (e) {
    stopped = 'the simulation could not be run that far';
  } finally {
    setState(real);
    setRngState(rngAt);
    markDirty();
    unsilence();
  }

  const after = snapshot(clone);
  return { ok: true, advanced, of: want, stopped, before, after };
}

// The difference, in the words a person would use.
export function describe(before, after) {
  const d = (k) => after[k] - before[k];
  const dir = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');
  return {
    cash: dir(d('cash')), users: dir(d('users')), mrr: dir(d('mrr')),
    alignment: dir(d('alignment')), heat: dir(d('heat')), approval: dir(d('approval')),
  };
}
