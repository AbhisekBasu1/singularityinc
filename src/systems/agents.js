// ─────────────────────────────────────────────────────────────────────────────
// AGENTS — hire, assign, level, and occasionally lose control of them.
// ─────────────────────────────────────────────────────────────────────────────
import { MODELS, MODEL_ORDER, SPECIALTIES, TRAITS, TRAIT_MAP, RARITY_WEIGHT, LANES,
         AGENT_TOOLS, TOOL_MAP } from '../data/agents.js';
import { AGENTS } from '../data/balance.js';
import { computeMods, agentStats, markDirty } from './modifiers.js';
import { agentName } from '../data/names.js';
import { rand, chance, pick, weightedPick, randInt, shuffle } from '../engine/rng.js';
import { VOICE } from '../data/agents.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';

const laneMemo = new WeakMap();

export function maxAgents(S) {
  if (S.unlocks.noAgents) return 0;   // Lone Wolf: the company is one person, permanently
  const m = computeMods(S);
  return AGENTS.MAX_ROSTER_BASE + m['+agentCap'];
}

export function hireCost(S) {
  return Math.floor(AGENTS.BASE_HIRE_COST * Math.pow(AGENTS.HIRE_COST_GROWTH, S.agents.length));
}

export function availableModels(S) {
  return MODEL_ORDER.filter((id) => {
    const mo = MODELS[id];
    return !mo.req || S.research.done[mo.req] || S.unlocks[mo.req];
  });
}

export function availableSpecialties(S) {
  return Object.values(SPECIALTIES).filter((sp) => !sp.req || S.research.done[sp.req] || S.unlocks['spec_' + sp.id]);
}

function rollTraits(S, count) {
  const pool = shuffle(TRAITS);
  const out = [];
  for (const t of pool) {
    if (out.length >= count) break;
    const w = RARITY_WEIGHT[t.rarity] || AGENTS.TRAIT_FALLBACK_WEIGHT;
    if (rand() * AGENTS.TRAIT_ROLL_MAX < w) out.push(t.id);
  }
  while (out.length < count) {
    const t = weightedPick(TRAITS, (x) => RARITY_WEIGHT[x.rarity] || AGENTS.TRAIT_FALLBACK_WEIGHT);
    if (t && !out.includes(t.id)) out.push(t.id);
    else break;
  }
  return out;
}

// Generate a candidate without hiring (for the recruiting screen)
export function rollCandidate(S, forceModel) {
  const models = availableModels(S);
  const model = forceModel || models[models.length - 1];
  const specs = availableSpecialties(S);
  const spec = pick(specs).id;
  const traitCount = weightedPick([1, 2, 3], AGENTS.TRAIT_COUNT_WEIGHTS);
  const traits = rollTraits(S, traitCount);
  const used = S.agents.map((a) => a.name);
  return {
    name: agentName(used),
    model, spec, traits,
    cost: hireCost(S),
    id: null,
  };
}

export function hireAgent(S, cand) {
  if (S.agents.length >= maxAgents(S)) return { ok: false, reason: 'roster' };
  const cost = cand.cost ?? hireCost(S);
  if (S.company.cash < cost) return { ok: false, reason: 'cash' };
  S.company.cash -= cost;
  const a = {
    id: 'a' + S.agentIdSeq++,
    name: cand.name,
    model: cand.model,
    spec: cand.spec,
    traits: cand.traits || [],
    tools: [],
    level: 1,
    xp: 0,
    morale: 1.0,
    autonomy: 0.5,
    lane: SPECIALTIES[cand.spec]?.lane || 'build',
    laneDays: 0,
    hiredDay: S.time.day,
    contribution: 0,
    status: 'active',
    memory: [],
    rogueWarn: 0,
  };
  S.agents.push(a);
  S.stats.agentsHired++;
  markDirty();
  emit('agent:hired', { agent: a });
  return { ok: true, agent: a };
}

export function fireAgent(S, id, reason = 'released') {
  const i = S.agents.findIndex((a) => a.id === id);
  if (i < 0) return false;
  const [a] = S.agents.splice(i, 1);
  S.stats.agentsLost = (S.stats.agentsLost || 0) + 1;
  markDirty();
  emit('agent:left', { agent: a, reason });
  return a;
}

export function assignLane(S, id, lane) {
  const a = S.agents.find((x) => x.id === id);
  if (!a) return;
  if (a.lane !== lane) {
    a.lane = lane;
    a.laneDays = 0;
    emit('agent:lane', { agent: a, lane });
  }
  markDirty();
}

export function upgradeModel(S, id, modelId) {
  const a = S.agents.find((x) => x.id === id);
  if (!a) return { ok: false };
  const from = MODELS[a.model], to = MODELS[modelId];
  if (!to || to.tier <= from.tier) return { ok: false, reason: 'tier' };
  const cost = Math.floor(AGENTS.UPGRADE_BASE_COST
    * Math.pow(AGENTS.UPGRADE_COST_GROWTH, to.tier - 1));
  if (S.company.cash < cost) return { ok: false, reason: 'cash', cost };
  S.company.cash -= cost;
  a.model = modelId;
  markDirty();
  emit('agent:upgraded', { agent: a, model: to });
  return { ok: true, cost };
}

export function buyTool(S, id, toolId) {
  const a = S.agents.find((x) => x.id === id);
  const tool = TOOL_MAP[toolId];
  if (!a || !tool) return { ok: false };
  if (a.tools.includes(toolId)) return { ok: false, reason: 'owned' };
  if (tool.req && !S.research.done[tool.req]) return { ok: false, reason: 'locked' };
  if (S.company.cash < tool.cost) return { ok: false, reason: 'cash' };
  S.company.cash -= tool.cost;
  a.tools.push(toolId);
  markDirty();
  emit('agent:tool', { agent: a, tool });
  return { ok: true };
}

export function toolsFor(S, a) {
  return AGENT_TOOLS.filter((t) => !t.req || S.research.done[t.req]);
}

// ── Lane output aggregation ────────────────────────────────────────────────
// Returns { build, growth, research, ops, moonshot } work units per day,
// plus side-effects collected across the roster.
export function computeLaneOutput(S, m = computeMods(S)) {
  const out = { build: 0, growth: 0, research: 0, ops: 0, moonshot: 0 };
  const side = { debt: 0, insight: 0, rep: 0, breakthroughs: [], alignDelta: 0, incidentMult: 1 };
  const perAgent = new Map();
  for (const a of S.agents) {
    if (a.status !== 'active') continue;
    const st = agentStats(a, S, m);
    const specLane = SPECIALTIES[a.spec]?.lane || 'build';
    const match = a.lane === specLane ? 1 : st.crossLane;
    let work = st.output * match;
    // Goal drift: some work goes nowhere
    if (st.drift && chance(st.drift * AGENTS.DRIFT_CHANCE_RATE)) work *= AGENTS.DRIFT_OUTPUT_MULT;
    out[a.lane] = (out[a.lane] || 0) + work;
    side.debt += st.debt * work * AGENTS.DEBT_PER_WORK;
    side.insight += st.insightBleed * work * AGENTS.INSIGHT_PER_WORK;
    side.rep += st.repBleed * work * AGENTS.REP_PER_WORK;
    side.alignDelta += st.alignDelta * AGENTS.ALIGN_PER_DAY;
    side.incidentMult *= st.incident;
    perAgent.set(a.id, { work, stats: st });
  }
  const laneMult = {
    build: m.buildLaneOutput * m.allLanes,
    growth: m.growthLaneOutput * m.allLanes,
    research: m.researchLaneOutput * m.allLanes,
    ops: m.opsLaneOutput * m.allLanes,
    moonshot: m.moonshotLaneOutput * m.allLanes,
  };
  for (const k of Object.keys(out)) out[k] *= laneMult[k] || 1;
  const result = { out, side, perAgent };
  laneMemo.set(S, result);
  return result;
}

export function agentUpkeepTotal(S, m = computeMods(S)) {
  let total = 0;
  for (const a of S.agents) {
    if (a.status !== 'active') continue;
    total += agentStats(a, S, m).upkeep;
  }
  return total;
}

// ── Daily agent maintenance ────────────────────────────────────────────────
export function tickAgentsDaily(S, m = computeMods(S), laneOutput = laneMemo.get(S) || computeLaneOutput(S, m)) {
  const events = [];
  const crowd = S.agents.length;
  for (const a of S.agents) {
    // Strip scratch fields persisted by saves from builds before lane output
    // became an ephemeral return value.
    delete a._work;
    delete a._stats;
    if (a.status !== 'active') continue;
    const work = laneOutput.perAgent.get(a.id)?.work || 0;
    const st = laneOutput.perAgent.get(a.id)?.stats || agentStats(a, S, m);
    a.laneDays = (a.laneDays || 0) + 1;
    a.contribution = (a.contribution || 0) + work;

    // XP & leveling
    a.xp += AGENTS.XP_PER_DAY * st.xp * (AGENTS.XP_WORK_BASE + work / AGENTS.XP_WORK_SCALE);
    const need = AGENTS.LEVEL_XP(a.level);
    if (a.xp >= need) { a.xp -= need; a.level++; events.push({ type: 'level', agent: a }); }

    // Morale: a real management surface, not decoration.
    const specLane = SPECIALTIES[a.spec]?.lane;
    const target = clamp(AGENTS.MORALE_BASE
      - clamp(S.resources.techDebt / AGENTS.MORALE_DEBT_SCALE, 0, AGENTS.MORALE_DEBT_CAP)
      - clamp((crowd - AGENTS.MORALE_CROWD_FREE) * AGENTS.MORALE_CROWD_RATE,
        0, AGENTS.MORALE_CROWD_CAP)
      - (a.lane !== specLane ? AGENTS.MORALE_WRONG_LANE : 0)
      - (a.autonomy < AGENTS.MORALE_AUTONOMY_THRESHOLD ? AGENTS.MORALE_AUTONOMY_PENALTY : 0)
      - (S.founder.burnout > AGENTS.MORALE_BURNOUT_THRESHOLD ? AGENTS.MORALE_BURNOUT_PENALTY : 0)
      - ((S.resources.alignment < AGENTS.MORALE_ALIGN_THRESHOLD) ? AGENTS.MORALE_ALIGN_PENALTY : 0)
      + (a.level >= AGENTS.MORALE_LEVEL_THRESHOLD ? AGENTS.MORALE_LEVEL_BONUS : 0)
      + Math.min(AGENTS.MORALE_TOOL_CAP,
        (a.tools?.length || 0) * AGENTS.MORALE_TOOL_BONUS)
      + m.auraMorale, AGENTS.MORALE_MIN, 1);
    a.morale += (Math.max(target, st.moraleFloor ?? 0) - a.morale) * AGENTS.MORALE_ADJUST_RATE;

    // Autonomy creep (Ambitious trait)
    if (st.autonomyCreep) a.autonomy = clamp(a.autonomy + st.autonomyCreep, 0, 1);

    // Breakthroughs
    if (st.breakthrough && chance(st.breakthrough)) {
      const amt = AGENTS.BREAKTHROUGH_BASE + a.level * AGENTS.BREAKTHROUGH_PER_LEVEL;
      S.resources.research += amt;
      events.push({ type: 'breakthrough', agent: a, amount: amt });
    }

    // Rogue risk: high autonomy + low alignment
    if (!st.safe) {
      const align = S.resources.alignment;
      const risk = AGENTS.ROGUE_BASE_CHANCE * Math.pow(a.autonomy, AGENTS.ROGUE_AUTONOMY_POWER)
                 * (AGENTS.ROGUE_ALIGN_BASE - align) * m.rogueChance
                 * ((MODELS[a.model] || MODELS.nano).tier / 2);
      if (chance(risk)) events.push({ type: 'rogue', agent: a });
      else if (chance(risk * AGENTS.ROGUE_WARN_MULT)) {
        a.rogueWarn++; events.push({ type: 'rogueWarn', agent: a });
      }
    }
  }
  return events;
}

export function laneDescription(lane) { return LANES[lane]; }

// A line in this agent's own voice, drawn from its traits first and its
// specialty second. Six agents end up sounding like six different things.
export function agentLine(a) {
  const pool = [];
  for (const t of a.traits || []) if (VOICE[t]) pool.push(...VOICE[t]);
  const spec = VOICE[a.spec];
  if (spec) pool.push(...spec);
  if (!pool.length) return null;
  return pick(pool);
}

export function remember(a, text, day) {
  a.memory = a.memory || [];
  a.memory.unshift({ text, day: Math.floor(day) });
  if (a.memory.length > 6) a.memory.pop();
}
