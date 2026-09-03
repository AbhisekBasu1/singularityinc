// ─────────────────────────────────────────────────────────────────────────────
// MEGAPROJECTS — build queue, progress, and applied effects.
// ─────────────────────────────────────────────────────────────────────────────
import { PROJECTS, PROJECT_MAP } from '../data/projects.js';
import { PROJECTS as PB, ECON, RACE } from '../data/balance.js';
import { computeMods, markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { clamp } from '../engine/format.js';

export function projectCost(S, p) {
  const built = (S.world.projectsBuilt?.[p.id] || 0);
  return p.cost * Math.pow(p.costGrowth || 1, built);
}

// ── §A11 Slots, upkeep, and what a frontier build is worth ──────────────────

// How many builds may be in flight at once. A megaproject is 45 to 500 days of
// somebody's attention, and the roster is what a build actually needs.
export function maxProjectSlots(S) {
  return Math.min(PB.SLOTS_MAX,
    PB.SLOTS_BASE + Math.floor((S.agents?.length || 0) / PB.SLOTS_PER_AGENTS));
}
export function projectSlotsUsed(S) { return S.world.projectQueue?.length || 0; }

// The capital a repeatable project has consumed across every build of it: the
// first at list price, each one after at `costGrowth` of the last. That total
// is what the upkeep line is a share of.
function capitalIn(p, n) {
  if (!n) return 0;
  const g = p.costGrowth || 1;
  return g === 1 ? p.cost * n : p.cost * (Math.pow(g, n) - 1) / (g - 1);
}

// What everything you have built costs to keep standing, per day. A megaproject
// was a one-off payment and then a permanent free bonus; it is staffed, powered,
// cooled and defended now — `ECON.PROJECT_UPKEEP_DAILY` is 16%/year of the
// capital deployed, which is roughly what a datacentre costs to run.
export function projectUpkeep(S) {
  const built = S.world?.projectsBuilt || {};
  let total = 0;
  for (const [id, n] of Object.entries(built)) {
    const p = PROJECT_MAP[id];
    if (p && n) total += capitalIn(p, n) * ECON.PROJECT_UPKEEP_DAILY;
  }
  return total;
}

// The ledger's own breakdown, for the tooltip on the Upkeep row.
export function projectUpkeepRows(S) {
  const built = S.world?.projectsBuilt || {};
  return Object.entries(built).map(([id, n]) => {
    const p = PROJECT_MAP[id];
    if (!p || !n) return null;
    return { id, name: p.name, n, daily: capitalIn(p, n) * ECON.PROJECT_UPKEEP_DAILY };
  }).filter(Boolean).sort((a, b) => b.daily - a.daily);
}

// §A11's last clause: frontier projects are the only way past the ceiling the
// race puts on Frontier Commitment. Read by `src/systems/agirace.js`, which is
// not edited from here — a project's `frontier` field is its contribution and
// the sum is bounded by `RACE.PROJECT_PUSH_CAP` so no number of orbital rings
// can decide the race on its own.
export function frontierProjectBonus(S) {
  const built = S.world?.projectsBuilt || {};
  let sum = 0;
  for (const [id, n] of Object.entries(built)) {
    const p = PROJECT_MAP[id];
    if (p?.frontier && n) sum += p.frontier * n;
  }
  const cap = RACE?.PROJECT_PUSH_CAP ?? 0.25;
  return Math.min(cap, sum);
}

export function projectAvailable(S, p) {
  if (S.company.act < p.act) return false;
  if (p.req && !S.research.done[p.req]) return false;
  const built = (S.world.projectsBuilt?.[p.id] || 0);
  if (!p.repeatable && built > 0) return false;
  if (S.world.projectQueue?.some((q) => q.id === p.id)) return false;
  if (projectSlotsUsed(S) >= maxProjectSlots(S)) return false;
  return true;
}

// Why a build is not available, in the words the blocked-verb rows want.
export function projectBlockedNote(S, p) {
  if (S.company.act < p.act) return 'ACT ' + ['', 'I', 'II', 'III', 'IV', 'V'][p.act];
  if (p.req && !S.research.done[p.req]) return 'RESEARCH FIRST';
  const built = (S.world.projectsBuilt?.[p.id] || 0);
  if (!p.repeatable && built > 0) return 'BUILT';
  if (S.world.projectQueue?.some((q) => q.id === p.id)) return 'IN FLIGHT';
  if (projectSlotsUsed(S) >= maxProjectSlots(S)) {
    return `${projectSlotsUsed(S)} OF ${maxProjectSlots(S)} SLOTS`;
  }
  return null;
}

export function availableProjects(S) {
  return PROJECTS.filter((p) => S.company.act >= p.act - 1)
    .map((p) => ({ ...p, cost: projectCost(S, p), available: projectAvailable(S, p) }));
}

export function startProject(S, id) {
  const p = PROJECT_MAP[id];
  if (p && projectSlotsUsed(S) >= maxProjectSlots(S)) {
    return { ok: false, reason: 'slots', slots: maxProjectSlots(S) };
  }
  if (!p || !projectAvailable(S, p)) return { ok: false };
  const cost = projectCost(S, p);
  if (S.company.cash < cost) return { ok: false, reason: 'cash', cost };
  S.company.cash -= cost;
  S.world.projectQueue = S.world.projectQueue || [];
  const m = computeMods(S);
  const days = Math.max(10, p.days / (m.infraSpeed || 1));
  S.world.projectQueue.push({ id, startDay: S.time.day, days, progress: 0 });
  emit('project:started', { project: p, days });
  return { ok: true, days };
}

export function tickProjects(S, days) {
  if (!S.world.projectQueue?.length) return;
  const done = [];
  for (const q of S.world.projectQueue) {
    q.progress += days / q.days;
    // The loud ones draw attention while they are being built, not in one lump
    // when they finish: nineteen rocket launches and forty-one jurisdictions
    // are noticed at the time, and that is the window in which they can be
    // answered. `loud` is declared on the project in src/data/projects.js.
    const p = PROJECT_MAP[q.id];
    if (p?.loud) {
      S.world.regulatoryHeat = clamp(
        (S.world.regulatoryHeat || 0) + p.loud * PB.LOUD_HEAT_PER_DAY * days, 0, 100);
    }
    if (q.progress >= 1) done.push(q);
  }
  for (const q of done) {
    S.world.projectQueue.splice(S.world.projectQueue.indexOf(q), 1);
    completeProject(S, q.id);
  }
}

// The emergency's last resort — see `tickEmergency`. Puts down the dearest
// thing the company owns: its upkeep stops and so does everything it gave.
// Only ever called inside a `!S._offline` guard, for the reason the agent
// spin-down is: coming back to a shut-down datacentre you had no chance to
// prevent is a punishment for closing a tab.
export function mothballProject(S) {
  const rows = projectUpkeepRows(S);
  if (!rows.length) return null;
  const top = rows[0];
  S.world.projectsBuilt[top.id] = Math.max(0, (S.world.projectsBuilt[top.id] || 0) - 1);
  if (!S.world.projectsBuilt[top.id]) delete S.world.projectsBuilt[top.id];
  S.world.projectsMothballed = (S.world.projectsMothballed || 0) + 1;
  markDirty();
  emit('project:mothballed', { project: PROJECT_MAP[top.id] });
  return PROJECT_MAP[top.id];
}

export function completeProject(S, id) {
  const p = PROJECT_MAP[id];
  if (!p) return;
  S.world.projectsBuilt = S.world.projectsBuilt || {};
  S.world.projectsBuilt[id] = (S.world.projectsBuilt[id] || 0) + 1;
  const e = p.effects || {};
  if (e.opinion) S.world.publicOpinion = clamp(S.world.publicOpinion + e.opinion, 0, 1);
  if (e.alignment) S.resources.alignment = clamp(S.resources.alignment + e.alignment, 0, 1);
  if (e.control) S.world.controlPoints = (S.world.controlPoints || 0) + e.control * computeMods(S).controlRate;
  markDirty();
  emit('project:done', { project: p });
}

// Aggregate persistent effects from completed projects into the modifier system.
export function projectMods(S) {
  const out = { computeCap: 0, energyCap: 0, computeCapMult: 1, energyCapMult: 1,
    churnMult: 1, userMult: 1, heatDecay: 0, opinionDrift: 0, polishPerDay: 0,
    computeCostMult: 1, reliabilityFloor: 0 };
  const built = S.world?.projectsBuilt || {};
  for (const [id, n] of Object.entries(built)) {
    const p = PROJECT_MAP[id]; if (!p || !n) continue;
    const e = p.effects || {};
    if (e.computeCap) out.computeCap += e.computeCap * n;
    if (e.energyCap) out.energyCap += e.energyCap * n;
    if (e.computeCapMult) out.computeCapMult *= Math.pow(e.computeCapMult, n);
    if (e.energyCapMult) out.energyCapMult *= Math.pow(e.energyCapMult, n);
    if (e.churnMult) out.churnMult *= Math.pow(e.churnMult, n);
    if (e.userMult) out.userMult *= Math.pow(e.userMult, n);
    if (e.heatDecay) out.heatDecay += e.heatDecay * n;
    if (e.opinionDrift) out.opinionDrift += e.opinionDrift * n;
    if (e.polishPerDay) out.polishPerDay += e.polishPerDay * n;
    if (e.computeCostMult) out.computeCostMult *= Math.pow(e.computeCostMult, n);
    if (e.reliabilityFloor) out.reliabilityFloor = Math.max(out.reliabilityFloor, e.reliabilityFloor);
  }
  return out;
}
