// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH — the tech tree engine.
// ─────────────────────────────────────────────────────────────────────────────
import { RESEARCH, RESEARCH_MAP } from '../data/research.js';
import { RESEARCH as RB } from '../data/balance.js';
import { computeSplitFx } from './compute.js';
import { computeMods, markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { clamp } from '../engine/format.js';

// §A12a. A door that a finished node closes. `excludes` is symmetric by
// convention — both halves of a pair name the other — and it is checked here
// rather than in the view, so a queued node, a self-directing researcher and
// the world layer all obey it without knowing it exists.
//
// The rule that keeps it honest: an exclusion may never sit on the required
// chain of a node a gate names or an ending needs. `tools/lint.mjs` walks it.
export function excludedBy(S, node) {
  for (const x of node.excludes || []) if (S.research.done[x]) return x;
  return null;
}

// Every node either finished or closed by a door this run walked through. This
// is what "the whole tree" means once there are doors in it: `researchDone >=
// 85` was a count of a tree nobody can finish any more, and an achievement that
// cannot be earned is worse than one that is hard.
export function treeComplete(S) {
  return RESEARCH.every((n) => S.research.done[n.id] || excludedBy(S, n));
}

export function isAvailable(S, node) {
  if (S.research.done[node.id]) return false;
  if (node.act && S.company.act < node.act) return false;
  if (excludedBy(S, node)) return false;
  for (const r of node.reqs) if (!S.research.done[r]) return false;
  if (node.gate?.compute && S.resources.computeCap < node.gate.compute) return false;
  return true;
}

export function isVisible(S, node) {
  if (S.research.done[node.id]) return true;
  // visible if all reqs done, or one req away
  let missing = 0;
  for (const r of node.reqs) if (!S.research.done[r]) missing++;
  return missing <= 1 && S.company.act >= (node.act || 1) - 1;
}

export function availableResearch(S) {
  return RESEARCH.filter((n) => isAvailable(S, n));
}

export function startResearch(S, id) {
  const node = RESEARCH_MAP[id];
  if (!node || !isAvailable(S, node)) return { ok: false };
  S.research.active = id;
  S.research.progress = 0;
  emit('research:started', { node });
  return { ok: true };
}

export function researchRatePerDay(S, laneOutput = 0, m = computeMods(S)) {
  let base = RB.BASE_RATE;
  base += (S.founder.allocation.learn || 0) * (1.4 + S.founder.skills.vision * 0.28);
  base += laneOutput * 0.85;
  // §A9: the research share of the compute split. At the default share this
  // multiplier is exactly 1, which is why a save with no split — and every
  // build before there was one — computes the identical number.
  base += Math.pow(S.resources.compute || 0, 0.82) * 0.030 * computeSplitFx(S).research;
  base += Math.pow(S.resources.data || 0, 0.7) * 0.004;
  base *= m.researchRate;
  if (m.researchCompound) base *= 1 + Math.log10(1 + Object.keys(S.research.done).length) * 0.6;
  // Saturating: unchanged while the terms are small, asymptotic to MAX_RATE
  // once they are not. The deliberate stops apply after the ceiling, or they
  // would be multiplying a number that saturates back to the same place.
  let rate = RB.MAX_RATE * (1 - Math.exp(-base / RB.MAX_RATE));
  if (S.narrative.flags.frozen_weights) rate *= 0.15;   // you stopped, on purpose
  return rate;
}

// The dearest thing still worth learning — the bank has no reason to exceed it.
// Returns 0 once there is nothing left, which freezes the balance rather than
// zeroing it: see tickResearch.
function bankCeiling(S, m) {
  let dearest = 0;
  for (const n of RESEARCH) {
    if (S.research.done[n.id]) continue;
    if (n.cost > dearest) dearest = n.cost;
  }
  return dearest * RB.COST_SCALE * (m.researchCostMult || 1) * RB.BANK_CAP_MULT;
}

export function tickResearch(S, days, laneOutput, m = computeMods(S)) {
  const rate = researchRatePerDay(S, laneOutput, m);
  // The ceiling stops accrual; it never confiscates. Finishing an expensive
  // node lowers the dearest thing left, and a player who had banked for it must
  // not watch the balance fall as their reward for spending it.
  const ceil = bankCeiling(S, m);
  if (S.resources.research < ceil) {
    S.resources.research = Math.min(S.resources.research + rate * days, ceil);
  }
  if (!S.research.active) {
    // auto-pull from queue
    while (S.research.queue.length) {
      const next = S.research.queue.shift();
      const node = RESEARCH_MAP[next];          // a renamed node in an old save is skipped, not a crash
      if (node && isAvailable(S, node)) { startResearch(S, next); break; }
    }
  }
  if (!S.research.active) return null;
  const node = RESEARCH_MAP[S.research.active];
  if (!node) { S.research.active = null; return null; }
  const cost = node.cost * RB.COST_SCALE * (m.researchCostMult || 1);
  if (S.resources.research >= cost) {
    S.resources.research -= cost;
    completeResearch(S, node);
    return node;
  }
  S.research.progress = S.resources.research / cost;
  return null;
}

// ── §A12c What a node was worth on the day it landed ────────────────────────
// The three readers a `scaleWith` may name. Deliberately read inline rather
// than through `systems/product.js`: this module is imported by `agents.js`,
// which product.js's own chain reaches, and a cycle here leaves a binding
// undefined at evaluation time in exactly the way `ui/author.js` documents.
const SCALE_READ = {
  users: (S) => S.products.reduce((a, p) => a + (p.launched ? p.users : 0), 0),
  features: (S) => S.stats?.featuresShipped || 0,
  roster: (S) => (S.agents || []).filter((a) => a.status === 'active').length,
};

// Par is what the card is written for. Below it the node still does what it
// says, quieter; above it, more. Bounded both ways — a mistimed node is a worse
// buy, never a wasted one.
export function scaleStrength(S, node) {
  const r = node?.scaleWith;
  if (!r || !SCALE_READ[r.read]) return 1;
  const v = Math.max(0, SCALE_READ[r.read](S));
  const k = 1 + Math.log10(Math.max(1, v) / Math.max(1, r.at)) * RB.SCALE_RATE;
  return clamp(k, RB.SCALE_MIN, RB.SCALE_MAX);
}

export function completeResearch(S, node) {
  S.research.done[node.id] = true;
  // §A12c. Fixed here, once, and never recomputed: `computeMods` reads it.
  if (node.scaleWith) (S.research.scale ??= {})[node.id] = scaleStrength(S, node);
  // The day it landed, so the record can be a dated one. `done` has only ever
  // held `true`, which makes a finished tree a set with no history in it — and
  // a save made before this simply has no days, which every reader must
  // tolerate rather than invent.
  (S.research.doneDay ??= {})[node.id] = Math.floor(S.time.day);
  S.research.active = null;
  S.research.progress = 0;
  S.stats.researchDone++;
  if (node.unlock) S.unlocks[node.unlock] = true;
  if (node.once) {
    if (node.once.skill) {
      const [k, v] = node.once.skill;
      S.founder.skills[k] = Math.min(20, S.founder.skills[k] + v);
    }
    if (node.once.allSkills) {
      for (const k of Object.keys(S.founder.skills)) {
        S.founder.skills[k] = Math.min(20, S.founder.skills[k] + node.once.allSkills);
      }
    }
    if (node.once.cash) S.company.cash += node.once.cash;
  }
  markDirty();
  emit('research:done', { node });
  return node;
}

export function researchCost(S, node, m = computeMods(S)) {
  return node.cost * RB.COST_SCALE * (m.researchCostMult || 1);
}

export function researchProgressPct(S) {
  if (!S.research.active) return 0;
  const node = RESEARCH_MAP[S.research.active];
  if (!node) return 0;
  return clamp(S.resources.research / researchCost(S, node), 0, 1);
}

export function etaDays(S, node, laneOutput = 0) {
  const rate = researchRatePerDay(S, laneOutput);
  if (rate <= 0) return Infinity;
  const need = researchCost(S, node) - (S.research.active === node.id ? S.resources.research : 0);
  return Math.max(0, need) / rate;
}
