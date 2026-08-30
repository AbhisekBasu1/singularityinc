// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION — acts, unlocks, achievements, endings. The shape of the run.
// ─────────────────────────────────────────────────────────────────────────────
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../data/achievements.js';
import { ACTS, ACT_GATES as GATES, WORLD } from '../data/balance.js';
import { ENDINGS } from '../data/endings.js';
import { totalUsers, totalMrr } from './product.js';
import { computeMods, markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { clamp } from '../engine/format.js';
import { endingReady, endingProgress } from '../data/commitments.js';
import { playerProgress } from './agirace.js';

// Each act needs both a numeric threshold and time on the clock: the world
// does not reorganise itself in a fortnight, however good your quarter was.
//
// Which of the two binds is deliberate. Measured, the economic curves are very
// nearly vertical by Act III — raising the Act III bar from $75M ARR to $280M
// moved the transition by 36 days — so a threshold cannot pace anything. It
// would only wall off a player having a bad run while a good one sails past.
// So minDays sets the pace and the threshold is the competence check: the floor
// says how long an act's content takes to play, the goal says you actually got
// there. The floors below are what produce the documented act medians, and the
// megaprojects an act contains (90-260 days each) are why they are as long as
// they are — at the old floors you could not finish two of them in Act III.
export const ACT_GATES = [
  null,
  null, // act 1 is the start
  { act: 2, name: 'Product–Market Fit', minDays: GATES.ACT2_MIN_DAYS,
    test: (S) => ((totalMrr(S) >= GATES.ACT2_MRR && totalUsers(S) >= GATES.ACT2_USERS_WITH_MRR)
      || totalUsers(S) >= GATES.ACT2_USERS_ALONE) && S.stats.featuresShipped >= GATES.ACT2_FEATURES,
    hint: (S) => `Ship 8 features, then reach $7K MRR with 2,200 users — or 12,000 users` },
  { act: 3, name: 'Escape Velocity', minDays: GATES.ACT3_MIN_DAYS,
    test: (S) => totalMrr(S) * 12 >= GATES.ACT3_ARR && S.company.valuation >= GATES.ACT3_VALUATION,
    hint: () => `Reach $120M ARR and a $1.6B valuation` },
  { act: 4, name: 'Recursive Ascent', minDays: GATES.ACT4_MIN_DAYS,
    test: (S) => (S.research.done.own_foundation_model || S.research.done.model_frontier)
      && S.company.valuation >= GATES.ACT4_VALUATION && S.resources.computeCap >= GATES.ACT4_COMPUTE,
    hint: () => `Train a frontier-class model, reach a $180B valuation and 2,600 PF of compute` },
  { act: 5, name: 'What Comes After', minDays: GATES.ACT5_MIN_DAYS,
    // Ascension is not a valuation. It begins when you are demonstrably at the
    // frontier — or when somebody else got there and the question is settled
    // without you. Without this term the act was a pure timer: measured, the
    // old goal was met around day 890 and the player then stood at the gate for
    // 265-294 days waiting out minDays. The day floor at the end is a safety
    // valve, not a path: it is twice the intended length of the act, and exists
    // so a run that somehow stalls below the benchmark cannot be locked out of
    // its own ending.
    test: (S) => S.research.done.recursive_self_improvement && S.company.valuation >= GATES.ACT5_VALUATION
      && S.world.globalGdpShare >= GATES.ACT5_GDP_SHARE
      && (playerProgress(S) >= GATES.ACT5_FRONTIER || !!S.world.race?.crossed
          || S.time.day - (S.company.actStartedDay || 0) >= GATES.ACT5_STALL_DAYS),
    hint: () => `Achieve recursive self-improvement, a $12T valuation, 4.5% of global GDP `
      + `and 85% on the frontier benchmark` },
];

export function nextActHint(S) {
  const g = ACT_GATES[S.company.act + 1];
  if (!g) return null;
  const wait = actTimeRemaining(S);
  return { name: g.name, hint: g.hint(S), act: g.act, wait,
           ready: g.test(S), waitText: wait > 0 ? `${Math.ceil(wait)} more days in this act` : null };
}

export function actTimeRemaining(S) {
  const next = ACT_GATES[S.company.act + 1];
  if (!next?.minDays) return 0;
  const since = S.time.day - (S.company.actStartedDay || 0);
  return Math.max(0, next.minDays - since);
}

export function checkActProgression(S) {
  const next = ACT_GATES[S.company.act + 1];
  if (!next) return false;
  if (!next.test(S)) return false;
  if (actTimeRemaining(S) > 0) return false;
  S.company.actStartedDay = S.time.day;
  S.company.act = next.act;
  S.company.actMarks = S.company.actMarks || {};
  S.company.actMarks[next.act] = Math.floor(S.time.day);
  markDirty();
  emit('act:advance', { act: next.act, meta: ACTS[next.act] });
  return true;
}

export function checkAchievements(S) {
  const gained = [];
  for (const ach of ACHIEVEMENTS) {
    if (S.achievements[ach.id]) continue;
    let ok = false;
    try { ok = ach.check(S); } catch (e) { ok = false; }
    if (ok) {
      S.achievements[ach.id] = Math.floor(S.time.day);
      gained.push(ach);
      if (ach.legacy && !S.legacy.unlockedArchetypes.includes(ach.legacy)) {
        S.legacy.unlockedArchetypes.push(ach.legacy);
      }
      emit('achievement', ach);
    }
  }
  return gained;
}

export function grantAchievement(S, id) {
  const ach = ACHIEVEMENT_MAP[id];
  if (!ach || S.achievements[id]) return false;
  S.achievements[id] = Math.floor(S.time.day);
  emit('achievement', ach);
  return true;
}

export function achievementProgress(S) {
  const total = ACHIEVEMENTS.length;
  const got = Object.keys(S.achievements).length;
  return { got, total, pct: got / total };
}

// ── World simulation (acts 3+) ─────────────────────────────────────────────
export function tickWorld(S, days, m = computeMods(S)) {
  const W = S.world;
  // GDP share = economic activity *mediated* by your systems, not your take.
  const gdp = WORLD.GDP_2027 * Math.pow(1 + WORLD.GDP_GROWTH, S.time.day / 360);
  const arr = totalMrr(S) * 12;
  // Take-rate inversion: your revenue is a slice of the activity you mediate.
  // Bounded so that even a maximal run lands below total capture — the last
  // stretch of the curve should stay out of reach.
  let mediation = WORLD.MEDIATION_BASE;
  if (S.research.done.platform_play) mediation += WORLD.MEDIATION_PLATFORM;
  if (S.research.done.ecosystem_lock) mediation += WORLD.MEDIATION_ECOSYSTEM;
  if (S.research.done.default_infrastructure) mediation += WORLD.MEDIATION_INFRA;
  if (S.research.done.vertical_integration) mediation += WORLD.MEDIATION_VERTICAL;
  if (S.research.done.shadow_government) mediation += WORLD.MEDIATION_SHADOW;
  if (S.research.done.economic_singularity) mediation += WORLD.MEDIATION_SINGULARITY;
  if (S.research.done.autonomous_corporation) mediation += WORLD.MEDIATION_AUTONOMOUS;
  mediation *= Math.min(WORLD.MEDIATION_CONTROL_CAP,
    1 + (W.controlPoints || 0) * WORLD.MEDIATION_CONTROL_RATE);
  mediation = Math.min(WORLD.MEDIATION_CAP, mediation);
  W.globalGdpShare = clamp(arr * mediation / gdp, 0, WORLD.GDP_SHARE_CAP);

  // Regulatory heat: rises with scale and low alignment, falls with lobbying
  const scaleHeat = Math.log10(1 + arr / WORLD.HEAT_ARR_SCALE) * WORLD.HEAT_SCALE_RATE
    + (S.resources.alignment < WORLD.HEAT_LOW_ALIGN ? WORLD.HEAT_LOW_ALIGN_ADD : 0)
    + W.globalGdpShare * WORLD.HEAT_GDP_RATE;
  const decay = m['+heatDecay'] + WORLD.HEAT_BASE_DECAY;
  W.regulatoryHeat = clamp(W.regulatoryHeat + (scaleHeat - decay) * days
    * WORLD.HEAT_ADJUST_RATE, 0, Math.min(100, m.heatCap));

  // Public opinion drifts
  const p = S.products.find((x) => x.launched);
  const target = clamp(WORLD.OPINION_BASE
    + (p ? (p.sentiment - WORLD.OPINION_BASE) * WORLD.OPINION_SENTIMENT_RATE : 0)
    + (S.resources.reputation > 0 ? Math.min(WORLD.OPINION_REP_CAP,
      Math.log10(1 + S.resources.reputation) * WORLD.OPINION_REP_RATE) : 0)
    - W.globalGdpShare * WORLD.OPINION_GDP_DRAG
    + (S.resources.alignment - WORLD.OPINION_BASE) * WORLD.OPINION_ALIGN_RATE
    + (m['+opinion'] || 0), 0, 1);
  W.publicOpinion += ((target - W.publicOpinion) * WORLD.OPINION_CONVERGENCE
    + (m['+opinionDrift'] || 0) * clamp(1 - W.publicOpinion, 0, 1)
      * WORLD.OPINION_DRIFT_GAIN) * days;
  W.publicOpinion = clamp(Math.max(W.publicOpinion, m.opinionFloor), 0, 1);

  // AI safety concern rises with capability
  W.aiSafetyConcern = clamp(WORLD.SAFETY_BASE
    + Object.keys(S.research.done).length * WORLD.SAFETY_PER_RESEARCH
    + (1 - S.resources.alignment) * WORLD.SAFETY_MISALIGN_RATE
    + (S.company.act >= 4 ? WORLD.SAFETY_LATE_ACT_ADD : 0), 0, 1);

  // Doom clock — narrative tension for Act IV/V
  W.doomClock = clamp((1 - S.resources.alignment) * WORLD.DOOM_MISALIGN_RATE
    + (S.company.act >= 4 ? WORLD.DOOM_LATE_ACT_ADD : 0)
    + W.regulatoryHeat * WORLD.DOOM_HEAT_RATE
    - S.world.publicOpinion * WORLD.DOOM_OPINION_RELIEF, 0, 100);
}

// ── Endings ────────────────────────────────────────────────────────────────
export { ENDINGS };

// Only `auto` endings fire on their own. Everything else is a choice the
// player makes from the Ascension panel once Act V is reached.
export function checkEnding(S) {
  if (S.ending) return null;
  for (const e of ENDINGS) {
    if (!e.auto) continue;
    try { if (e.when(S)) return e; } catch (err) { /* skip */ }
  }
  return null;
}

export function availableEndings(S) {
  return ENDINGS.filter((e) => !e.auto && !e.viaEvent).map((e) => {
    let ok = false;
    try { ok = e.when(S); } catch (err) { ok = false; }
    const prog = endingProgress(S, e.id);
    // Doing the three things IS the qualification. The narrative gate only
    // governs whether you may begin building this path at all.
    return { ...e, gateMet: ok, progress: prog, available: endingReady(S, e.id) };
  });
}

export function triggerEnding(S, id, value) {
  const e = ENDINGS.find((x) => x.id === id);
  if (!e) return null;
  S.ending = { id: e.id, name: e.name, tone: e.tone, day: Math.floor(S.time.day), value: value ?? S.company.valuation };
  S.legacy.endings[e.id] = (S.legacy.endings[e.id] || 0) + 1;
  emit('ending', { ending: e, state: S });
  return e;
}
