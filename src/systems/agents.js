// ─────────────────────────────────────────────────────────────────────────────
// AGENTS — hire, assign, level, and occasionally lose control of them.
// ─────────────────────────────────────────────────────────────────────────────
import { MODELS, MODEL_ORDER, SPECIALTIES, TRAITS, TRAIT_MAP, RARITY_WEIGHT, LANES,
         AGENT_TOOLS, TOOL_MAP } from '../data/agents.js';
import { AGENTS, FOUNDER, WIRE } from '../data/balance.js';
import { computeMods, agentStats, markDirty } from './modifiers.js';
import { agentName } from '../data/names.js';
import { rand, chance, pick, weightedPick, randInt, shuffle } from '../engine/rng.js';
import { VOICE } from '../data/agents.js';
import { RESEARCH } from '../data/research.js';
import { isAvailable, startResearch } from './research.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { healthMult } from './life.js';   // life.js imports nothing from here

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
  // A new instance arrives with ARIA's context and none of her history, which
  // is the premise of `e11_aria_asks`. The channel is where it happens.
  logAgent(S, 'hire', { id: a.id, name: a.name, spec: a.spec, model: a.model });
  markDirty();
  emit('agent:hired', { agent: a });
  return { ok: true, agent: a };
}

export function fireAgent(S, id, reason = 'released') {
  const i = S.agents.findIndex((a) => a.id === id);
  if (i < 0) return false;
  const [a] = S.agents.splice(i, 1);
  S.stats.agentsLost = (S.stats.agentsLost || 0) + 1;
  // The tombstone. Until this, an agent was spliced out of the roster and that
  // was the whole of it — no name, no date, no reason, nothing to look at
  // later. `agents/archive` in the Record reads this, and the sentence it
  // prints for each reason lives in `src/data/machine.js`. Keep the last
  // memory: it is the only thing the agent said that anybody wrote down.
  (S.agentsLeft ??= []).unshift({
    id: a.id, name: a.name, model: a.model, spec: a.spec, lane: a.lane,
    level: a.level, hiredDay: a.hiredDay, day: Math.floor(S.time.day), reason,
    // The newest thing it did rather than the newest rung it climbed: a
    // decommission notice whose one quoted sentence is "Reached level 7" is a
    // funeral for a progress bar.
    memory: lastMeaningfulMemory(a)?.text || '',
  });
  if (S.agentsLeft.length > AGENTS.ARCHIVE_KEEP) S.agentsLeft.length = AGENTS.ARCHIVE_KEEP;
  markDirty();
  emit('agent:left', { agent: a, reason });
  return a;
}

export function assignLane(S, id, lane) {
  const a = S.agents.find((x) => x.id === id);
  if (!a) return;
  if (a.lane !== lane) {
    const from = a.lane;
    const days = a.laneDays || 0;
    a.lane = lane;
    a.laneDays = 0;
    // The channel reads this: somebody was moved, and somebody else has an
    // opinion about it. `days` is how long they had been on the old lane,
    // which is the whole of the objection.
    logAgent(S, 'lane', { id: a.id, name: a.name, from, to: lane, days });
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

// An agent is at home on its specialty's lane. Frontier is the one specialty
// with two homes: it belongs to Research and it is what the Moonshot lane is
// for, so a Frontier agent on Moonshot is not working off-specialty.
export function isHomeLane(a) {
  const lane = SPECIALTIES[a.spec]?.lane || 'build';
  return a.lane === lane || (a.spec === 'frontier' && a.lane === 'moonshot');
}

// ── Lane output aggregation ────────────────────────────────────────────────
// Returns { build, growth, research, ops, moonshot } work units per day,
// plus side-effects collected across the roster.
//
// The specialty side-effects are what the twelve specialty cards have always
// promised and never did: `computeLaneOutput` read only the lane, so Security
// did not stop breaches and Design did not raise polish. Each applies when the
// agent is on its own lane, scales with its work, and saturates (`AGENTS.SPEC`).
// Consumers read them off `S._specFx`, which loop.js writes every tick — never
// by calling this from a render path, because goal drift draws from the RNG.

// §A13. A mistake costs more in a big codebase than in a small one, and this
// was a constant — so an Act IV company with a hundred and eighty features was
// exactly as easy to keep clean as the four files in the garage, and every
// measured run sat at zero debt from day 600 on. Deliberately slow (log2, so
// it is a doubling that moves it) and it has no ceiling of its own because
// `m.debtCap` is already the ceiling on the stock.
export function codebaseDebtMult(S) {
  const n = S.stats?.featuresShipped || 0;
  return 1 + Math.log2(1 + n / AGENTS.DEBT_CODEBASE_FEATURES) * AGENTS.DEBT_CODEBASE_RATE;
}

// ── §A4 Span of control ─────────────────────────────────────────────────────
// The thesis, in mechanics. Every active agent costs the founder review focus
// every day; the day's regeneration pays that line first; and whoever the day
// could not reach drifts — more debt, sliding morale — until something buys the
// attention back. That is what bounds the roster now, rather than cash and a
// constant, and it is why a better model and a longer leash are worth paying
// for beyond their throughput.
//
// All three functions are pure. `reviewLoad` is called from `founderOutput`,
// which every view renders seven times a second, so nothing here may draw.

// A trait that means the thing checks its own work.
const REVIEW_TRAITS = new Set(['tireless', 'meticulous']);

// What one agent costs the founder's day. A Frontier model needs less reading
// than a Nano; a long leash needs less asking than a short one; and the Weaver
// halves the whole line, because a chief of staff is the one hire whose entire
// job is the founder's attention.
export function reviewCostOf(S, a, m = computeMods(S)) {
  const model = MODELS[a.model] || MODELS.nano;
  const top = MODELS.transcendent?.tier || 7;
  const tier = clamp(((model.tier || 1) - 1) / Math.max(1, top - 1), 0, 1);
  let c = FOUNDER.REVIEW_FOCUS_PER_AGENT;
  c *= 1 - FOUNDER.REVIEW_TIER_RELIEF * tier;
  c *= 1 - FOUNDER.REVIEW_AUTONOMY_RELIEF * clamp(a.autonomy ?? 0.5, 0, 1);
  if ((a.traits || []).some((t) => REVIEW_TRAITS.has(t))) c *= FOUNDER.REVIEW_TRAIT_MULT;
  if (S?.narrative?.flags?.hired_weaver) c *= FOUNDER.REVIEW_WEAVER_MULT;
  return c;
}

// The attention the day actually has. It is the regeneration term of
// `founderOutput`'s focus delta and nothing else — the review is paid out of
// what the founder gets back, before the work of the day touches it — which is
// why a founder who never rests can cover nobody however full the bar is.
export function reviewBudget(S, m = computeMods(S)) {
  return (S.founder?.allocation?.rest || 0) * FOUNDER.FOCUS_REGEN_PER_DAY
    * FOUNDER.REST_REGEN_MULT * (m.focusRegen || 1) * healthMult(S);
}

/**
 * Who the day reached. Cheapest first, because that is what a founder with a
 * finite morning actually does — and it means the agent left over is the one
 * that wanted the most checking, which is the signal worth printing.
 */
export function reviewLoad(S, m = computeMods(S)) {
  const rows = [];
  for (const a of S.agents || []) {
    if (a.status !== 'active') continue;
    rows.push({ id: a.id, name: a.name, cost: reviewCostOf(S, a, m) });
  }
  const need = rows.reduce((t, r) => t + r.cost, 0);
  const budget = reviewBudget(S, m);
  const uncovered = new Set();
  let paid = 0;
  for (const r of rows.slice().sort((x, y) => x.cost - y.cost)) {
    if (paid + r.cost <= budget) paid += r.cost;
    else uncovered.add(r.id);
  }
  return { rows, need, paid, budget, uncovered,
           covered: rows.length - uncovered.size, total: rows.length };
}

// What a view is allowed to read: the tick's own record, or — before the first
// tick, and in a headless render — the same pure computation. `tickFounder`
// writes it and `save.js` strips it, exactly as it does `_specFx`. The tick's
// record carries `ids` (an array) rather than a Set, so both shapes answer.
export function reviewState(S, m = computeMods(S)) {
  const r = S._review;
  if (r) return r;
  const fresh = reviewLoad(S, m);
  return { need: fresh.need, paid: fresh.paid, budget: fresh.budget,
           covered: fresh.covered, total: fresh.total, ids: [...fresh.uncovered] };
}

// Is this the agent the day did not reach? The one question the Agents view
// asks, and the one the context menu will.
export function isUnreviewed(S, id, m) {
  return (reviewState(S, m).ids || []).includes(id);
}

/**
 * Room in the founder's day for one more. The shared hiring rule every bot
 * keeps — a roster is bounded by attention now, not by cash, and a harness
 * that hires on cash alone measures its own ignorance rather than the game.
 */
export function canReview(S, cand, m = computeMods(S)) {
  const r = reviewLoad(S, m);
  return (r.budget - r.need) >= reviewCostOf(S,
    { model: cand?.model || 'nano', autonomy: 0.5, traits: cand?.traits || [] }, m);
}

// `drift` is the only thing in here that draws from the seeded stream, which
// is why this function may never be called from a render path with it on.
// `laneOutputPure` below is the door a view uses; `opts.drift = false` is what
// makes that door honest rather than a second implementation that can rot.
export function computeLaneOutput(S, m = computeMods(S), { drift = true } = {}) {
  const out = { build: 0, growth: 0, research: 0, ops: 0, moonshot: 0 };
  const side = { debt: 0, insight: 0, rep: 0, breakthroughs: [], alignDelta: 0, incidentMult: 1,
    heatDecay: 0, opCost: 1, salesConv: 0, salesEnterprise: 0, polish: 0, appeal: 0,
    intel: 0, aggression: 0, selfBuild: 0, moonshotWork: 0 };
  const raw = { security: 0, legal: 0, finance: 0, sales: 0, design: 0, content: 0, intel: 0 };
  const perAgent = new Map();
  // §A4. Who the founder's day did not reach. Pure, so this is safe here.
  const review = reviewLoad(S, m);
  for (const a of S.agents) {
    if (a.status !== 'active') continue;
    const st = agentStats(a, S, m);
    const home = isHomeLane(a);
    const match = home ? 1 : st.crossLane;
    let work = st.output * match;
    // Goal drift: some work goes nowhere
    if (drift && st.drift && chance(st.drift * AGENTS.DRIFT_CHANCE_RATE)) work *= AGENTS.DRIFT_OUTPUT_MULT;
    // Above the self-direction line a build agent spends a share of its day on
    // what it thinks the product needs. The code is not lost — loop.js ships
    // it as a feature nobody asked for — but it is not yours to point.
    let diverted = 0;
    const auto = a.autonomy ?? 0.5;
    if (a.lane === 'build' && auto > AGENTS.AUTONOMY_SELF_DIRECT) {
      const over = (auto - AGENTS.AUTONOMY_SELF_DIRECT) / (1 - AGENTS.AUTONOMY_SELF_DIRECT);
      diverted = work * Math.min(AGENTS.SELF_DIRECT_MAX_SHARE, over * AGENTS.SELF_DIRECT_MAX_SHARE);
    }
    out[a.lane] = (out[a.lane] || 0) + work - diverted;
    side.selfBuild += diverted;
    // §A4. Nobody read the diff. It still shipped.
    const unrev = review.uncovered.has(a.id) ? AGENTS.UNREVIEWED_DEBT : 1;
    side.debt += st.debt * work * AGENTS.DEBT_PER_WORK * codebaseDebtMult(S) * unrev;
    side.insight += st.insightBleed * work * AGENTS.INSIGHT_PER_WORK;
    side.rep += st.repBleed * work * AGENTS.REP_PER_WORK;
    side.alignDelta += st.alignDelta * AGENTS.ALIGN_PER_DAY;
    side.incidentMult *= st.incident;
    side.aggression += st.aggression - 1;
    // The moonshot roll is weighted by the model's creativity: the lane wants
    // the mind that says something that scares you, not the intern.
    if (a.lane === 'moonshot') side.moonshotWork += work * st.creativity;
    if (home && a.spec in raw) raw[a.spec] += work;
    perAgent.set(a.id, { work, stats: st, diverted });
  }
  const laneMult = {
    build: m.buildLaneOutput * m.allLanes,
    growth: m.growthLaneOutput * m.allLanes,
    research: m.researchLaneOutput * m.allLanes,
    ops: m.opsLaneOutput * m.allLanes,
    moonshot: m.moonshotLaneOutput * m.allLanes,
  };
  for (const k of Object.keys(out)) out[k] *= laneMult[k] || 1;
  side.selfBuild *= laneMult.build;
  side.moonshotWork *= laneMult.moonshot;

  // Every specialty effect saturates: a lane of Helix-∞ on Security leaves a
  // third of the incident rate, not none of it.
  const SP = AGENTS.SPEC;
  side.incidentMult *= Math.max(SP.SECURITY_INCIDENT_FLOOR, 1 / (1 + raw.security * SP.SECURITY_INCIDENT_RATE));
  side.heatDecay = Math.min(SP.LEGAL_HEAT_CAP, raw.legal * SP.LEGAL_HEAT_PER_WORK);
  side.opCost = Math.max(SP.FINANCE_OPCOST_FLOOR, 1 / (1 + raw.finance * SP.FINANCE_OPCOST_RATE));
  side.salesConv = Math.min(SP.SALES_CONV_CAP, raw.sales * SP.SALES_CONV_RATE);
  side.salesEnterprise = Math.min(SP.SALES_ENTERPRISE_CAP, raw.sales * SP.SALES_ENTERPRISE_RATE);
  side.polish = raw.design * SP.DESIGN_POLISH_PER_WORK;
  side.appeal = raw.design * SP.DESIGN_APPEAL_PER_WORK;
  side.rep += raw.content * SP.CONTENT_REP_PER_WORK;
  side.intel = raw.intel;
  side.aggression = Math.min(AGENTS.AGGRESSION_CAP, Math.max(0, side.aggression));
  const result = { out, side, perAgent, review };
  // Only the real tick may claim the memo `tickAgentsDaily` reads: a dry read
  // taken for a view must never become the day's record of who did what.
  if (drift) laneMemo.set(S, result);
  return result;
}

// ── What a view is allowed to read ──────────────────────────────────────────
// The lane totals as of the last simulation tick. `computeLaneOutput` rolls
// goal drift from the shared stream, and `render(S)` runs about seven times a
// second — so calling it from a view changed the totals under the founder's
// eyes *and* silently advanced the seed, desynchronising every event draw and
// market roll after it. That is the `askAria` bug exactly. `loop.js` caches the
// day's totals on `S._lanes`; before the first tick — a fresh state, a headless
// render — there is nothing cached, so this computes the same totals with the
// one stochastic term left out.
export function laneOutputPure(S, m = computeMods(S)) {
  if (S._lanes) return { ...S._lanes };
  return computeLaneOutput(S, m, { drift: false }).out;
}

// Who did the most building today, for the feature that ships tonight (§B11).
// Read off the tick's own per-agent record — a view never calls this.
export function topContributor(S, lane = 'build') {
  const rec = laneMemo.get(S);
  if (!rec) return null;
  let best = null, bestWork = 0;
  for (const a of S.agents) {
    if (a.status !== 'active' || a.lane !== lane) continue;
    const w = rec.perAgent.get(a.id)?.work || 0;
    if (w > bestWork) { bestWork = w; best = a; }
  }
  return best ? { id: best.id, name: best.name, spec: best.spec, work: bestWork } : null;
}

// The specialty side-effects as of the last simulation tick. A view or a
// counter cost reads this rather than recomputing the roster, because the
// recompute draws from the RNG for goal drift and a render path must not.
export function specFx(S) {
  return S._specFx || { heatDecay: 0, opCost: 1, salesConv: 0, salesEnterprise: 0,
    polish: 0, appeal: 0, intel: 0, aggression: 0, debt: 0, alignDelta: 0 };
}
export function intelLevel(S) { return specFx(S).intel || 0; }

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
  const quits = [];
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
    const target = clamp(AGENTS.MORALE_BASE
      - clamp(S.resources.techDebt / AGENTS.MORALE_DEBT_SCALE, 0, AGENTS.MORALE_DEBT_CAP)
      - clamp((crowd - AGENTS.MORALE_CROWD_FREE) * AGENTS.MORALE_CROWD_RATE,
        0, AGENTS.MORALE_CROWD_CAP)
      - (!isHomeLane(a) ? AGENTS.MORALE_WRONG_LANE : 0)
      - (a.autonomy < AGENTS.MORALE_AUTONOMY_THRESHOLD ? AGENTS.MORALE_AUTONOMY_PENALTY : 0)
      - (S.founder.burnout > AGENTS.MORALE_BURNOUT_THRESHOLD ? AGENTS.MORALE_BURNOUT_PENALTY : 0)
      - ((S.resources.alignment < AGENTS.MORALE_ALIGN_THRESHOLD) ? AGENTS.MORALE_ALIGN_PENALTY : 0)
      + (a.level >= AGENTS.MORALE_LEVEL_THRESHOLD ? AGENTS.MORALE_LEVEL_BONUS : 0)
      + Math.min(AGENTS.MORALE_TOOL_CAP,
        (a.tools?.length || 0) * AGENTS.MORALE_TOOL_BONUS)
      // §A4. An agent nobody got to today is an agent nobody asked how it was
      // getting on. It is the one morale term the founder fixes with a diary
      // rather than with money.
      - (laneOutput.review?.uncovered?.has(a.id) ? AGENTS.UNREVIEWED_MORALE : 0)
      + m.auraMorale, AGENTS.MORALE_MIN, 1);
    a.morale += (Math.max(target, st.moraleFloor ?? 0) - a.morale) * AGENTS.MORALE_ADJUST_RATE;

    // Stakes. An agent held under the line for long enough leaves on its own.
    // `st.morale` is the floored figure, so Tireless never counts a day; the
    // departure itself never happens offline, for the reason the emergency
    // spin-down never does — you were not there to have prevented it.
    if (st.morale < AGENTS.QUIT_MORALE) a.lowMoraleDays = (a.lowMoraleDays || 0) + 1;
    else a.lowMoraleDays = Math.max(0, (a.lowMoraleDays || 0) - AGENTS.QUIT_RECOVER_RATE);
    if (!S._offline && a.lowMoraleDays >= AGENTS.QUIT_DAYS && chance(AGENTS.QUIT_CHANCE)) {
      quits.push(a);
      continue;
    }

    // Autonomy creep (Ambitious trait)
    if (st.autonomyCreep) a.autonomy = clamp(a.autonomy + st.autonomyCreep, 0, 1);

    // Breakthroughs
    if (st.breakthrough && chance(st.breakthrough)) {
      const amt = AGENTS.BREAKTHROUGH_BASE + a.level * AGENTS.BREAKTHROUGH_PER_LEVEL;
      S.resources.research += amt;
      events.push({ type: 'breakthrough', agent: a, amount: amt });
    }

    // Rogue risk: high autonomy + low alignment. The Interpretability Probe
    // divides it rather than deleting it, and an Opaque agent gives no warning
    // — you cannot audit reasoning you cannot read.
    {
      const align = S.resources.alignment;
      const risk = AGENTS.ROGUE_BASE_CHANCE * Math.pow(a.autonomy, AGENTS.ROGUE_AUTONOMY_POWER)
                 * (AGENTS.ROGUE_ALIGN_BASE - align) * m.rogueChance
                 * ((MODELS[a.model] || MODELS.nano).tier / 2)
                 * (st.safe ? AGENTS.PROBE_ROGUE_MULT : 1);
      if (chance(risk)) events.push({ type: 'rogue', agent: a });
      else if (!st.unauditable && chance(risk * AGENTS.ROGUE_WARN_MULT)) {
        a.rogueWarn++; events.push({ type: 'rogueWarn', agent: a });
      }
    }
  }
  for (const a of quits) {
    if (fireAgent(S, a.id, 'quit')) events.push({ type: 'quit', agent: a });
  }

  // Self-chosen research: an autonomous researcher with nothing assigned picks
  // something itself. Only when the tree is idle and the queue is empty, so a
  // founder who is choosing is never overruled.
  if (!S._offline && !S.research.active && !(S.research.queue || []).length) {
    const chooser = S.agents.find((a) => a.status === 'active' && a.lane === 'research'
      && (a.autonomy ?? 0.5) > AGENTS.AUTONOMY_SELF_DIRECT);
    if (chooser) {
      const open = RESEARCH.filter((n) => isAvailable(S, n));
      const node = open.length ? pick(open) : null;
      if (node && startResearch(S, node.id).ok) events.push({ type: 'selfResearch', agent: chooser, node });
    }
  }
  return events;
}

export function laneDescription(lane) { return LANES[lane]; }

// A line in this agent's own voice, drawn from its traits first and its
// specialty second. Six agents end up sounding like six different things.
// A line in this agent's own voice, drawn from its traits first and its
// specialty second. Pass the state and it will not say a thing that is still
// on the rail: an agent has three lines per trait and the day hook reaches for
// one roughly every six days, so without this the roster repeats itself inside
// a fortnight and reads as a script rather than as six things with opinions.
export function agentLine(a, S = null) {
  const pool = [];
  for (const t of a.traits || []) if (VOICE[t]) pool.push(...VOICE[t]);
  const spec = VOICE[a.spec];
  if (spec) pool.push(...spec);
  if (!pool.length) return null;
  if (!S) return pick(pool);
  const recent = new Set((S.feed || []).slice(0, WIRE.NO_REPEAT_WITHIN).map((f) => f.text));
  const open = pool.filter((t) => !recent.has(t));
  return pick(open.length ? open : pool);
}

// ── What an agent keeps ─────────────────────────────────────────────────────
// An agent's memory used to be the ladder and nothing else — a level, a tool,
// an upgrade — so the decommission notice's "last recorded note", which is the
// only sentence a dead agent gets, was reliably "Reached level 7." A memory
// now carries the kind of thing it was, and the two surfaces that print *one*
// of them read the newest that is not a rung.
//
//   card      it was named in the outcome of a card the founder answered
//   incident  it worked one, by the kind the run recorded
//   ship      it shipped the feature, or shipped one nobody asked for
//   said      it said something in the Wire and the founder answered
//   autonomy  the day its autonomy was cut
//   work      a breakthrough, a node it chose itself
//   routine   the ladder: a level, a tool, a model
export function remember(a, text, day, kind = 'routine') {
  if (!a) return;
  const t = String(text ?? '').trim();
  if (!t) return;
  a.memory = a.memory || [];
  // The same thing twice in one day is one thing. A card that names two agents
  // fires once each, but an incident hook that runs on every ops agent every
  // tick would otherwise fill the list with one sentence.
  const d = Math.floor(day);
  if (a.memory[0] && a.memory[0].text === t && a.memory[0].day === d) return;
  a.memory.unshift({ text: t, day: d, kind });
  while (a.memory.length > AGENTS.MEMORY_KEEP) a.memory.pop();
}

/**
 * The newest memory worth quoting: the card, the incident, the feature, the
 * night the autonomy came down — anything that is not the ladder. Falls back to
 * the newest of all, because an agent that only ever levelled up still gets a
 * line, and to nothing at all when it never said anything.
 */
export function lastMeaningfulMemory(a) {
  const mem = a?.memory || [];
  return mem.find((m) => m && m.kind && m.kind !== 'routine') || mem[0] || null;
}

// ── The channel's ring buffer ───────────────────────────────────────────────
// `agents/channel` and `tail channel` are generated from the day's events, and
// this is where a day's events are written down. Kinds: `lane`, `autonomy`,
// `hire`, `incident`. Newest first, capped, and carrying the agent's *name* as
// well as its id — the transcript for last Tuesday still has to name whoever
// was moved, and by Friday they may have been released.
export function logAgent(S, kind, entry = {}) {
  if (!S) return null;
  const e = { kind: String(kind), day: Math.floor(S.time?.day || 0), ...entry };
  const log = (S.agentsLog ??= []);
  log.unshift(e);
  if (log.length > AGENTS.LOG_KEEP) log.length = AGENTS.LOG_KEEP;
  return e;
}

/**
 * Autonomy, moved by hand. It is the one dial the founder turns on another
 * mind, and until this it moved silently: no memory, nothing in the channel,
 * and an agent that noticed nothing about the only decision made about it.
 */
export function setAutonomy(S, id, value) {
  const a = S.agents.find((x) => x.id === id);
  if (!a) return null;
  const from = a.autonomy ?? 0.5;
  const to = clamp(Number(value) || 0, 0, 1);
  a.autonomy = to;
  if (Math.abs(to - from) >= AGENTS.AUTONOMY_NOTICE) {
    logAgent(S, 'autonomy', { id: a.id, name: a.name, from, to });
    if (to < from) remember(a, `Autonomy cut to ${Math.round(to * 100)}%.`, S.time.day, 'autonomy');
  }
  markDirty();
  return a;
}
