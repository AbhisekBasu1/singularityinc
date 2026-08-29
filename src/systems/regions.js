// ─────────────────────────────────────────────────────────────────────────────
// REGIONS — stance drift, engagement stages, and what they pay you.
// ─────────────────────────────────────────────────────────────────────────────
import { REGIONS, REGION_MAP, STAGES, STAGE_INDEX, stanceOf } from '../data/regions.js';
import { computeMods, markDirty } from './modifiers.js';
import { clamp, soften } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { chance, gaussian } from '../engine/rng.js';

export function initRegions(S) {
  if (S.world.regions && Object.keys(S.world.regions).length) return S.world.regions;
  S.world.regions = Object.fromEntries(REGIONS.map((r) => [r.id, {
    stance: r.baseStance, stage: 'none', building: null, progress: 0, invested: 0,
  }]));
  return S.world.regions;
}

export function regionState(S, id) { initRegions(S); return S.world.regions[id]; }

export function stanceTarget(S, r, st) {
  const W = S.world;
  let t = r.baseStance;
  if (r.likes.includes('reputation')) t += soften(S.resources.reputation, 900, 0.20);
  if (r.likes.includes('opinion')) t += (W.publicOpinion - 0.5) * 0.42;
  if (r.likes.includes('alignment')) t += (S.resources.alignment - 0.5) * 0.38;
  if (r.likes.includes('control')) t += clamp((W.controlPoints || 0) * 0.06, 0, 0.22);
  if (r.dislikes.includes('heat')) t -= (W.regulatoryHeat / 100) * 0.34 * r.regBase;
  if (r.dislikes.includes('opinion')) t -= (W.publicOpinion - 0.5) * 0.18;
  // Presence itself builds standing — you become the incumbent.
  t += STAGE_INDEX[st.stage] * 0.05;
  if (S.research.done.sovereign_deals) t += 0.06;
  if (S.research.done.regulatory_capture) t += 0.05;
  if (S.narrative.flags.wrote_framework) t += 0.08;
  if (S.narrative.flags.dividend) t += 0.06;
  if (S.narrative.flags.opened_weights) t += 0.05;
  if (S.narrative.flags.fought_regulation) t -= 0.09;
  if (S.narrative.flags.suppressed_yuki) t -= 0.05;
  return clamp(t, 0, 1);
}

export function tickRegions(S, days, m = computeMods(S)) {
  if (S.company.act < 3) return;
  initRegions(S);
  for (const r of REGIONS) {
    const st = S.world.regions[r.id];
    const target = stanceTarget(S, r, st);
    st.stance += (target - st.stance) * 0.014 * days;
    st.stance = clamp(st.stance + gaussian(0, 0.004) * days, 0, 1);
    if (st.building) {
      st.progress += days / st.building.days;
      if (st.progress >= 1) {
        const stage = st.building.stage;
        st.stage = stage;
        st.building = null;
        st.progress = 0;
        applyStage(S, r, stage);
        emit('region:stage', { region: r, stage });
      }
    }
  }
}

function applyStage(S, r, stageId) {
  const stage = STAGES[STAGE_INDEX[stageId]];
  const e = stage.effects || {};
  if (e.compute) S.world.regionCompute = (S.world.regionCompute || 0) + e.compute;
  if (e.control) S.world.controlPoints = (S.world.controlPoints || 0) + e.control;
  if (e.heat) S.world.regulatoryHeat = clamp(S.world.regulatoryHeat + e.heat, 0, 100);
  if (e.opinion) S.world.publicOpinion = clamp(S.world.publicOpinion + e.opinion, 0, 1);
  markDirty();
}

export function canEngage(S, id) {
  const r = REGION_MAP[id]; const st = regionState(S, id);
  if (!r || !st) return null;
  if (st.building) return { ok: false, reason: 'building' };
  const next = STAGES[STAGE_INDEX[st.stage] + 1];
  if (!next) return { ok: false, reason: 'max' };
  const cost = next.cost(r, S);
  if (st.stance < next.need) return { ok: false, reason: 'stance', next, cost };
  if (S.company.cash < cost) return { ok: false, reason: 'cash', next, cost };
  return { ok: true, next, cost };
}

export function engage(S, id) {
  const check = canEngage(S, id);
  if (!check?.ok) return check || { ok: false };
  const r = REGION_MAP[id]; const st = regionState(S, id);
  const m = computeMods(S);
  S.company.cash -= check.cost;
  st.invested += check.cost;
  st.building = { stage: check.next.id, days: Math.max(20, check.next.days / (m.infraSpeed || 1)) };
  st.progress = 0;
  emit('region:started', { region: r, stage: check.next });
  return { ok: true, stage: check.next };
}

// Diplomacy: spend influence (or cash) to move a stance directly.
export function courtRegion(S, id) {
  const r = REGION_MAP[id]; const st = regionState(S, id);
  if (!r || !st) return { ok: false };
  const cost = Math.max(2e7, S.company.valuation * 0.0015);
  const infl = 40;
  if (S.resources.influence < infl && S.company.cash < cost) return { ok: false, reason: 'cost', cost, infl };
  if (S.resources.influence >= infl) S.resources.influence -= infl;
  else S.company.cash -= cost;
  const gain = 0.06 + Math.random() * 0.05;
  st.stance = clamp(st.stance + gain, 0, 1);
  emit('region:courted', { region: r, gain });
  return { ok: true, gain };
}

// Aggregate multipliers the rest of the sim reads.
// The stage you reach decides how much of a bloc you get. The bloc itself
// decides what you get — that is the whole reason the board is a choice and not
// a checklist. A region pays its advertised bonus from `infra` upward: market
// entry is selling there, infrastructure is operating there.
const BONUS_STAGE = 2;   // STAGES[2] === 'infra'

export function regionEffects(S) {
  const out = {
    userMult: 1, revenueMult: 1, compute: 0, reliability: 0,
    populationReach: 0, gdpReach: 0,
    viral: 0, energy: 0, heatDecay: 0, opinionDrift: 0, upkeepMult: 1,
    bonuses: [],
  };
  if (!S.world.regions) return out;
  for (const r of REGIONS) {
    const st = S.world.regions[r.id];
    if (!st || st.stage === 'none') continue;
    const idx = STAGE_INDEX[st.stage];
    const stage = STAGES[idx];
    const e = stage.effects || {};
    const weight = r.pop;
    if (e.users) out.userMult += (e.users - 1 + 1) * weight * 0.55;
    if (e.revenue) out.revenueMult += (e.revenue - 1) * r.gdp * 1.1;
    if (e.compute) out.compute += e.compute;
    if (e.reliability) out.reliability = Math.max(out.reliability, e.reliability);
    out.populationReach += r.pop;
    out.gdpReach += r.gdp;

    // The bonus the region card has always advertised.
    const b = r.bonus;
    if (!b || idx < BONUS_STAGE) continue;
    out.bonuses.push({ region: r.id, label: b.label });
    switch (b.key) {
      case 'revenue': out.revenueMult += b.value; break;
      case 'users':   out.userMult   += b.value; break;
      case 'compute': out.compute    += b.value; break;
      case 'viral':   out.viral      += b.value; break;
      case 'energy':  out.energy     += b.value; break;
      case 'heat':    out.heatDecay  += b.value; break;
      case 'opinion': out.opinionDrift += b.value; break;
      case 'upkeep':  out.upkeepMult *= b.value; break;
    }
  }
  if (S.world.regionCompute) out.compute = S.world.regionCompute + out.compute;
  return out;
}

export { stanceOf };
