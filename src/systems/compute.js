// ─────────────────────────────────────────────────────────────────────────────
// THE COMPUTE ALLOCATION — §A9.
//
// Compute used to be a ceiling: every provisioned unit fed research and the
// frontier at once, cost the same either way, and served users for free. Three
// lanes want it and they want it at the same time, so it is a split now:
//
//   research  → the compute term in `researchRatePerDay`
//   serving   → the per-user cost floor, and reliability under load
//   frontier  → the compute term the race reads through `frontierComputeMult`
//
// The whole file is pure, and every effect is `share / default`, so the
// defaults reproduce exactly what the game did before this existed — a save
// with no split plays identically, and so does one written by a build that
// never had one. That is the property `tools/parity.mjs` is checking for.
//
// The race lives in `src/systems/agirace.js` and is not edited from here: it
// calls `frontierComputeMult(S)` and `frontierProjectBonus(S)` (the latter from
// systems/projects.js) and nothing in this module reaches into it.
// ─────────────────────────────────────────────────────────────────────────────
import { COMPUTE_SPLIT as CS } from '../data/balance.js';
import { clamp } from '../engine/format.js';

export const SPLIT_LANES = ['research', 'serving', 'frontier'];

// The stored split, normalised, with every lane above the floor. A save from
// before this existed has no `computeSplit` and gets the defaults.
export function computeSplit(S) {
  const raw = S?.company?.computeSplit;
  if (!raw) return { ...CS.DEFAULT };
  const out = {};
  let total = 0;
  for (const k of SPLIT_LANES) {
    const v = Number(raw[k]);
    out[k] = Number.isFinite(v) && v > 0 ? Math.max(CS.MIN_SHARE, v) : CS.MIN_SHARE;
    total += out[k];
  }
  if (!(total > 0)) return { ...CS.DEFAULT };
  for (const k of SPLIT_LANES) out[k] /= total;
  return out;
}

// Move one lane and let the other two absorb it in proportion, so the three
// always sum to one and the founder is never asked to do the arithmetic.
export function setComputeShare(S, lane, value) {
  if (!SPLIT_LANES.includes(lane)) return computeSplit(S);
  const cur = computeSplit(S);
  const want = clamp(Number(value) || 0, CS.MIN_SHARE, 1 - CS.MIN_SHARE * 2);
  const others = SPLIT_LANES.filter((k) => k !== lane);
  const rest = others.reduce((a, k) => a + cur[k], 0);
  const room = 1 - want;
  const next = { [lane]: want };
  for (const k of others) {
    next[k] = rest > 0 ? Math.max(CS.MIN_SHARE, (cur[k] / rest) * room) : room / others.length;
  }
  // Re-normalise: the per-lane floor above can push the sum over one.
  const total = SPLIT_LANES.reduce((a, k) => a + next[k], 0);
  for (const k of SPLIT_LANES) next[k] /= total;
  S.company.computeSplit = next;
  return next;
}

// What the split is worth, as multipliers on the three things it feeds.
// Every one of these is 1.0 (or 0) at the defaults.
export function computeSplitFx(S) {
  const s = computeSplit(S);
  const D = CS.DEFAULT;
  return {
    share: s,
    research: clamp(s.research / D.research, CS.RESEARCH_MIN, CS.RESEARCH_MAX),
    frontier: clamp(s.frontier / D.frontier, CS.FRONTIER_MIN, CS.FRONTIER_MAX),
    // Below its default share, serving is borrowed capacity bought at the
    // moment the traffic arrives; above it, capacity you already own.
    serveCost: clamp(D.serving / s.serving, 1 / 1e9, 1e9),
    reliability: clamp((s.serving - D.serving) * CS.RELIABILITY_RATE,
      -CS.RELIABILITY_CAP, CS.RELIABILITY_CAP),
  };
}

// The two the race reads. Kept here rather than in agirace.js so the race can
// be rewritten without this moving, and so this module never imports it.
export function frontierComputeMult(S) { return computeSplitFx(S).frontier; }
