// ─────────────────────────────────────────────────────────────────────────────
// MODIFIERS — collapses research, traits, tools, perks and world state into a
// single flat lookup used by every other system. Recomputed when dirty.
// ─────────────────────────────────────────────────────────────────────────────
import { RESEARCH_MAP } from '../data/research.js';
import { TRAIT_MAP, TOOL_MAP, MODELS } from '../data/agents.js';
import { LEGACY_PERKS } from '../data/legacy.js';
import { projectMods } from './projects.js';
import { regionEffects } from './regions.js';
import { DIRECTIVE_MAP, directiveStrength } from '../data/directives.js';
import { doctrineMods } from './doctrines.js';
import { diffMods } from '../data/difficulty.js';

let cache = null;
let dirty = true;
export function markDirty() { dirty = true; }

const DEFAULTS = () => ({
  // multiplicative (default 1)
  codeRate: 1, insightRate: 1, repRate: 1, researchRate: 1,
  debtRate: 1, promptOutput: 1, featureCost: 1,
  churn: 1, conversion: 1, mrrMult: 1, arpu: 1, adEfficiency: 1, userMult: 1,
  reliability: 1, incidentChance: 1, incidentSeverity: 1,
  agentOutput: 1, agentUpkeep: 1, agentDebt: 1, agentXp: 1,
  buildLaneOutput: 1, growthLaneOutput: 1, researchLaneOutput: 1, opsLaneOutput: 1, moonshotLaneOutput: 1,
  opCost: 1, hostingCost: 1, computeCost: 1, energyCost: 1,
  valuationMult: 1, raiseValuation: 1, priceElastic: 1,
  repDamage: 1, competitorGrowth: 1, rivalHeat: 1, rogueChance: 1,
  focusRegen: 1, moonshotOdds: 1, infraSpeed: 1, controlRate: 1, allLanes: 1,
  computeCapMult: 1, energyCapMult: 1, launchPower: 1,
  // additive (default 0)
  '+debtDecay': 0, '+viral': 0, '+awarenessFlat': 0, '+agentCap': 0,
  '+computeCap': 0, '+energyCap': 0, '+dataRate': 0, '+alignment': 0,
  '+heatDecay': 0, '+opinionDrift': 0, '+influenceRate': 0, '+interest': 0,
  '+focusMax': 0, '+opinion': 0, '+physicalRevenue': 0,
  // flags / floors / caps
  debtCap: Infinity, reliabilityFloor: 0, churnFloor: 0, alignFloor: 0,
  heatCap: Infinity, opinionFloor: 0,
  networkChurn: 0, gdpUsers: 0, gdpRevenue: 0, researchCompound: 0,
  computeCompound: 0, hostileImmune: 0, noBurnout: 0, incidentAuto: 0,
});

function apply(mods, source) {
  if (!source) return;
  for (const [k, v] of Object.entries(source)) {
    if (k.startsWith('+')) { mods[k] = (mods[k] || 0) + v; }
    else if (k === 'debtCap' || k === 'heatCap') { mods[k] = Math.min(mods[k], v); }
    else if (k === 'reliabilityFloor' || k === 'churnFloor' || k === 'alignFloor' || k === 'opinionFloor') {
      mods[k] = Math.max(mods[k], v);
    }
    else if (typeof v === 'number' && k in mods && !k.startsWith('+')) {
      // multiplicative for known numeric keys defaulting to 1, else set flag
      const base = DEFAULTS()[k];
      if (base === 1) mods[k] *= v; else mods[k] = Math.max(mods[k] ?? 0, v);
    } else { mods[k] = v; }
  }
}

export function computeMods(S) {
  if (!dirty && cache) return cache;
  const m = DEFAULTS();

  // 1. Research
  for (const id of Object.keys(S.research.done)) {
    const node = RESEARCH_MAP[id];
    if (node?.mods) apply(m, node.mods);
  }

  // 2. Legacy perks (permanent across runs)
  for (const [id, lvl] of Object.entries(S.legacy.perks || {})) {
    const perk = LEGACY_PERKS.find((p) => p.id === id);
    if (perk?.mods && lvl > 0) {
      const scaled = {};
      for (const [k, v] of Object.entries(perk.mods)) {
        scaled[k] = k.startsWith('+') ? v * lvl : Math.pow(v, lvl);
      }
      apply(m, scaled);
    }
  }

  // 3. Founder archetype + traits
  for (const t of S.founder.traits || []) apply(m, t.mods);

  // 4. Agent global auras (architect, empathic, etc.)
  let auraMorale = 0;
  for (const a of S.agents) {
    for (const tid of a.traits || []) {
      const t = TRAIT_MAP[tid];
      if (!t?.mods) continue;
      if (t.mods.globalDebt) m.debtRate *= t.mods.globalDebt;
      if (t.mods.auraMorale) auraMorale += t.mods.auraMorale;
      if (t.mods.luck) m.luck = (m.luck || 0) + t.mods.luck;
    }
  }
  m.auraMorale = auraMorale;

  // 5. Founder skills (soft bonuses)
  const sk = S.founder.skills;
  m.codeRate *= 1 + (sk.engineering - 1) * 0.09;
  m.insightRate *= 1 + (sk.growth - 1) * 0.05 + (sk.vision - 1) * 0.05;
  m.repRate *= 1 + (sk.vision - 1) * 0.07;
  m.promptOutput *= 1 + (sk.prompting - 1) * 0.13;
  m.agentOutput *= 1 + (sk.ops - 1) * 0.055;
  m.mrrMult *= 1 + (sk.sales - 1) * 0.06;
  m.conversion *= 1 + (sk.design - 1) * 0.06;
  m.researchRate *= 1 + (sk.vision - 1) * 0.06;

  // 6. Morale / burnout drag
  if (S.founder.burnout > 0) {
    const drag = 1 - Math.min(0.55, S.founder.burnout / 100 * 0.55);
    m.codeRate *= drag; m.insightRate *= drag; m.agentOutput *= drag;
  }

  // 7. Megaprojects
  const pm = projectMods(S);
  m['+computeCap'] += pm.computeCap;
  m['+energyCap'] += pm.energyCap;
  m.computeCapMult *= pm.computeCapMult;
  m.energyCapMult *= pm.energyCapMult;
  m.churn *= pm.churnMult;
  m.userMult *= pm.userMult;
  m['+heatDecay'] += pm.heatDecay;
  m['+opinionDrift'] += pm.opinionDrift;
  m.computeCost *= pm.computeCostMult;
  m.reliabilityFloor = Math.max(m.reliabilityFloor, pm.reliabilityFloor);
  m.polishPerDay = pm.polishPerDay;

  // 7b. Standing directive, scaled by how long it has been held.
  const dir = DIRECTIVE_MAP[S.company.directive || 'none'];
  if (dir && dir.id !== 'none') {
    const k = directiveStrength(S);
    const scaled = {};
    for (const [key, v] of Object.entries(dir.mods || {})) {
      if (key.startsWith('+')) scaled[key] = v * k;
      else if (key === 'reliabilityFloor') scaled[key] = v * k;
      else if (typeof v === 'number') scaled[key] = 1 + (v - 1) * k;
      else scaled[key] = v;
    }
    apply(m, scaled);
    m.directiveStrength = k;
    m.directiveAlign = (dir.mods.alignBoost ? 0.00035 : 0) - (dir.mods.alignDrain ? 0.00045 : 0);
  } else { m.directiveStrength = 0; m.directiveAlign = 0; }

  // 7c. Doctrines — permanent, earned by how you ran the company.
  apply(m, doctrineMods(S));

  // 7d. Difficulty — applied last so it scales everything else.
  const dm = diffMods(S);
  if (dm.burn) { m.opCost *= dm.burn; m.agentUpkeep *= dm.burn; m.hostingCost *= dm.burn; }
  if (dm.incident) m.incidentChance *= dm.incident;
  if (dm.competitor) m.competitorGrowth *= dm.competitor;
  if (dm.churn) m.churn *= dm.churn;
  if (dm.eventSeverity) m.incidentSeverity *= dm.eventSeverity;
  m.researchCostMult = dm.researchCost || 1;
  m.hardFail = dm.hardFail || 0;
  m.noOffline = dm.noOffline || 0;
  m.rivalRace = dm.rivalRace || 1;

  // 7e. Scenario rules
  if (S.unlocks.quietWorld) { m.repRate *= 0.30; m.userMult *= 0.80; m.launchPower *= 0.5; m['+awarenessFlat'] *= 0.6; }
  if (S.unlocks.alignFloorScenario) { m.alignFloor = Math.max(m.alignFloor, 0.70); m.researchRate *= 0.72; m.codeRate *= 0.88; }
  if (S.unlocks.noAgents) { m.promptOutput *= 1.85; m.codeRate *= 1.35; m.focusRegen *= 1.25; }

  // 8. Regional presence
  const re = regionEffects(S);
  m.userMult *= re.userMult;
  m.mrrMult *= re.revenueMult;
  m['+computeCap'] += re.compute;
  if (re.reliability) m.reliabilityFloor = Math.max(m.reliabilityFloor, 0.85);
  m.regionReach = re.populationReach;
  m.regionGdp = re.gdpReach;
  // Per-bloc bonuses, through the channels that already exist for them.
  m['+viral'] += re.viral;
  m['+energyCap'] += re.energy;
  m['+heatDecay'] += re.heatDecay;
  m['+opinionDrift'] += re.opinionDrift;
  m.agentUpkeep *= re.upkeepMult;

  cache = m; dirty = false;
  return m;
}

// Per-agent effective stats
export function agentStats(a, S, m = computeMods(S)) {
  const model = MODELS[a.model] || MODELS.nano;
  let output = model.throughput;
  let debt = model.debt;
  let upkeep = model.upkeep;
  let xp = 1, incident = 1, insightBleed = 0, repBleed = 0, breakthrough = 0;
  let crossLane = 0.45, aggression = 1, moraleFloor = 0, indestructible = 0, safe = 0;
  let debtSensitive = 0, crowdPenalty = 0, focusRamp = 0, drift = 0, lies = 0;
  let alignDelta = 0, autonomyCreep = 0;

  for (const tid of a.traits || []) {
    const t = TRAIT_MAP[tid]; if (!t?.mods) continue;
    const md = t.mods;
    if (md.output) output *= md.output;
    if (md.debt) debt *= md.debt;
    if (md.upkeep) upkeep *= md.upkeep;
    if (md.xp) xp *= md.xp;
    if (md.incident) incident *= md.incident;
    if (md.insightBleed) insightBleed += md.insightBleed;
    if (md.repBleed) repBleed += md.repBleed;
    if (md.breakthrough) breakthrough += md.breakthrough;
    if (md.crossLane) crossLane = Math.max(crossLane, md.crossLane);
    if (md.aggression) aggression *= md.aggression;
    if (md.moraleFloor) moraleFloor = Math.max(moraleFloor, md.moraleFloor);
    if (md.indestructible) indestructible = 1;
    if (md.debtSensitive) debtSensitive = 1;
    if (md.crowdPenalty) crowdPenalty = md.crowdPenalty;
    if (md.focusRamp) focusRamp = md.focusRamp;
    if (md.drift) drift = md.drift;
    if (md.lies) lies = 1;
    if (md.alignment) alignDelta += md.alignment;
    if (md.autonomyCreep) autonomyCreep += md.autonomyCreep;
  }
  for (const tid of a.tools || []) {
    const t = TOOL_MAP[tid]; if (!t?.mods) continue;
    if (t.mods.output) output *= t.mods.output;
    if (t.mods.debt) debt *= t.mods.debt;
    if (t.mods.upkeep) upkeep *= t.mods.upkeep;
    if (t.mods.xp) xp *= t.mods.xp;
    if (t.mods.incident) incident *= t.mods.incident;
    if (t.mods.safe) safe = 1;
  }

  // level, morale, autonomy
  output *= 1 + (a.level - 1) * 0.11;
  const morale = Math.max(moraleFloor, a.morale ?? 1);
  output *= 0.55 + 0.45 * morale;
  output *= 1 + (a.autonomy ?? 0.5) * 0.55;
  debt *= 1 + (a.autonomy ?? 0.5) * 0.45;

  if (crowdPenalty && S.agents.length > 5) output *= Math.max(0.2, 1 - crowdPenalty * Math.floor(S.agents.length / 5));
  if (debtSensitive && S.resources.techDebt > 120) output *= 0.3;
  if (focusRamp && (a.laneDays ?? 0) > 30) output *= 1 + focusRamp;

  output *= m.agentOutput;
  debt *= m.agentDebt * m.debtRate;
  upkeep *= m.agentUpkeep;
  xp *= m.agentXp;

  return { output, debt, upkeep, xp, incident, insightBleed, repBleed, breakthrough,
           crossLane, aggression, morale, indestructible, safe, drift, lies,
           alignDelta, autonomyCreep, model };
}
