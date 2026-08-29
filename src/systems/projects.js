// ─────────────────────────────────────────────────────────────────────────────
// MEGAPROJECTS — build queue, progress, and applied effects.
// ─────────────────────────────────────────────────────────────────────────────
import { PROJECTS, PROJECT_MAP } from '../data/projects.js';
import { computeMods, markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { clamp } from '../engine/format.js';

export function projectCost(S, p) {
  const built = (S.world.projectsBuilt?.[p.id] || 0);
  return p.cost * Math.pow(p.costGrowth || 1, built);
}

export function projectAvailable(S, p) {
  if (S.company.act < p.act) return false;
  if (p.req && !S.research.done[p.req]) return false;
  const built = (S.world.projectsBuilt?.[p.id] || 0);
  if (!p.repeatable && built > 0) return false;
  if (S.world.projectQueue?.some((q) => q.id === p.id)) return false;
  return true;
}

export function availableProjects(S) {
  return PROJECTS.filter((p) => S.company.act >= p.act - 1)
    .map((p) => ({ ...p, cost: projectCost(S, p), available: projectAvailable(S, p) }));
}

export function startProject(S, id) {
  const p = PROJECT_MAP[id];
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
    if (q.progress >= 1) done.push(q);
  }
  for (const q of done) {
    S.world.projectQueue.splice(S.world.projectQueue.indexOf(q), 1);
    completeProject(S, q.id);
  }
}

export function completeProject(S, id) {
  const p = PROJECT_MAP[id];
  if (!p) return;
  S.world.projectsBuilt = S.world.projectsBuilt || {};
  S.world.projectsBuilt[id] = (S.world.projectsBuilt[id] || 0) + 1;
  const e = p.effects || {};
  if (e.opinion) S.world.publicOpinion = clamp(S.world.publicOpinion + e.opinion, 0, 1);
  if (e.alignment) S.resources.alignment = clamp(S.resources.alignment + e.alignment, 0, 1);
  if (e.control) S.world.controlPoints = (S.world.controlPoints || 0) + e.control;
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
