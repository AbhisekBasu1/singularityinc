// ─────────────────────────────────────────────────────────────────────────────
// CHOICE PREVIEW — §B6, and off by default.
//
// A card is a decision about people, and the numbers under it are a second and
// smaller game. Some players want both. `settings.showNumbers` runs each choice
// forward on a throwaway copy of the world and prints what it did, under the
// choice, before the founder commits to anything.
//
// It is `world/forecast.js`'s discipline exactly, and for the same reasons:
//
//   the state is a deep copy   nothing the dry run does can reach the real run
//   the bus is silenced        `resolveChoice` emits, and every one of those
//                              listeners would fire for a decision nobody made
//   the RNG is put back        a choice's effect may roll, and a preview that
//                              moves the seed changes what actually happens
//
// The last one has a second consequence worth stating plainly: because the
// stream is restored, a chance-branched effect previews *one* branch and the
// real resolution may take another. That is detectable — the dry run moved the
// stream — and such a preview is marked `~`, which is the honest word for it.
//
// The numbers are read as a diff of the copy against the real world rather than
// out of the effect log, because a choice is free to write to state directly
// and the log only knows what went through `fx`.
//
// Cost: one clone per choice, once, when the plate opens. Never on a repaint.
// ─────────────────────────────────────────────────────────────────────────────
import { S as LIVE, setState } from '../engine/state.js';
import { silence } from '../engine/bus.js';
import { rngState, setRngState } from '../engine/rng.js';
import { markDirty } from './modifiers.js';
import { resolveChoice } from './narrative.js';
import { totalUsers } from './product.js';

function copy(s) {
  try { if (typeof structuredClone === 'function') return structuredClone(s); } catch {}
  return JSON.parse(JSON.stringify(s));
}

// What a chip is allowed to be about, and how small is too small to print.
// The keys and the order are `modal.js`'s `EFFECT_META`, so the preview and the
// outcome strip speak the same vocabulary.
const READS = [
  ['cash', (s) => s.company.cash, 1],
  ['users', (s) => totalUsers(s), 1],
  ['reputation', (s) => s.resources.reputation, 0.5],
  ['code', (s) => s.resources.code, 0.5],
  ['insight', (s) => s.resources.insight, 0.5],
  ['research', (s) => s.resources.research, 0.5],
  ['techDebt', (s) => s.resources.techDebt, 0.5],
  ['influence', (s) => s.resources.influence || 0, 0.5],
  ['focus', (s) => s.founder.focus, 0.5],
  ['alignment', (s) => s.resources.alignment, 0.004],
  ['heat', (s) => s.world.regulatoryHeat || 0, 0.4],
  ['opinion', (s) => s.world.publicOpinion ?? 0.5, 0.004],
  ['control', (s) => s.world.controlPoints || 0, 0.02],
  ['compute', (s) => s.resources.computeGranted || 0, 1],
  ['equity', (s) => s.company.equity.founder, 0.002],
  ['days', (s) => s.time.day, 0.5],
];

function diff(before, after) {
  const out = [];
  for (const [key, read, floor] of READS) {
    let a = 0, b = 0;
    try { a = Number(read(before)) || 0; b = Number(read(after)) || 0; } catch { continue; }
    if (Math.abs(b - a) > floor) out.push([key, b - a]);
  }
  // Affinity, which is the one thing on a card that is not a number about the
  // company. Only people the founder has actually met, so a nudge to a stranger
  // does not spoil their introduction.
  const ra = before.relationships || {}, rb = after.relationships || {};
  for (const id of Object.keys(rb)) {
    const was = ra[id]?.affinity || 0, now = rb[id]?.affinity || 0;
    if (Math.abs(now - was) >= 1 && (ra[id]?.met || rb[id]?.met)) out.push(['rel:' + id, now - was]);
  }
  return out;
}

// Is this card previewable at all? A decision that is already resolved, one the
// world has put a proposal on the table for, and one the founder has answered
// in their own words are all cards where the buttons are not what happens next.
export function previewable(S, ev) {
  if (!S?.settings?.showNumbers) return false;
  const active = S.narrative?.activeEvent;
  if (!active || active !== ev) return false;
  if (active.outcome || active.proposal || active.founderWords?.text) return false;
  return Array.isArray(ev.choices) && ev.choices.length > 0;
}

// One entry per choice: `{ effects, approx }`, or null where the dry run could
// not be taken. `approx` means the effect drew from the stream, so what is
// printed is one of the branches and not the only one.
export function previewChoices(S = LIVE, ev = S?.narrative?.activeEvent) {
  if (!previewable(S, ev)) return null;
  const real = S;
  const rngAt = rngState();
  const unsilence = silence();
  const out = [];
  try {
    for (let i = 0; i < ev.choices.length; i++) {
      const at = rngState();
      let entry = null;
      try {
        const clone = copy(real);
        clone._forecast = true;
        delete clone._offline;
        setState(clone);
        markDirty();
        const r = resolveChoice(clone, i);
        if (r) entry = { effects: diff(real, clone), approx: rngState() !== at };
      } catch { entry = null; }
      finally { setState(real); markDirty(); }
      // Put the stream back before the next choice as well as at the end: two
      // choices previewed off the same position is the whole point.
      setRngState(at);
      out.push(entry);
    }
  } finally {
    setState(real);
    setRngState(rngAt);
    markDirty();
    unsilence();
  }
  return out;
}
