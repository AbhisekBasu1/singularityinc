// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION — acts, unlocks, achievements, endings. The shape of the run.
// ─────────────────────────────────────────────────────────────────────────────
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../data/achievements.js';
import { ACTS, WORLD } from '../data/balance.js';
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
  { act: 2, name: 'Product–Market Fit', minDays: 60,
    test: (S) => ((totalMrr(S) >= 7000 && totalUsers(S) >= 2200) || totalUsers(S) >= 12000)
      && S.stats.featuresShipped >= 8,
    hint: (S) => `Ship 8 features, then reach $7K MRR with 2,200 users — or 12,000 users` },
  { act: 3, name: 'Escape Velocity', minDays: 310,
    test: (S) => totalMrr(S) * 12 >= 120e6 && S.company.valuation >= 1.6e9,
    hint: () => `Reach $120M ARR and a $1.6B valuation` },
  { act: 4, name: 'Recursive Ascent', minDays: 470,
    test: (S) => (S.research.done.own_foundation_model || S.research.done.model_frontier)
      && S.company.valuation >= 1.8e11 && S.resources.computeCap >= 2600,
    hint: () => `Train a frontier-class model, reach a $180B valuation and 2,600 PF of compute` },
  { act: 5, name: 'What Comes After', minDays: 270,
    // Ascension is not a valuation. It begins when you are demonstrably at the
    // frontier — or when somebody else got there and the question is settled
    // without you. Without this term the act was a pure timer: measured, the
    // old goal was met around day 890 and the player then stood at the gate for
    // 265-294 days waiting out minDays. The day floor at the end is a safety
    // valve, not a path: it is twice the intended length of the act, and exists
    // so a run that somehow stalls below the benchmark cannot be locked out of
    // its own ending.
    test: (S) => S.research.done.recursive_self_improvement && S.company.valuation >= 1.2e13
      && S.world.globalGdpShare >= 0.045
      && (playerProgress(S) >= 85 || !!S.world.race?.crossed
          || S.time.day - (S.company.actStartedDay || 0) >= 620),
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
  let mediation = 3.5;
  if (S.research.done.platform_play) mediation += 1.2;
  if (S.research.done.ecosystem_lock) mediation += 1.2;
  if (S.research.done.default_infrastructure) mediation += 2.0;
  if (S.research.done.vertical_integration) mediation += 1.2;
  if (S.research.done.shadow_government) mediation += 2.0;
  if (S.research.done.economic_singularity) mediation += 2.4;
  if (S.research.done.autonomous_corporation) mediation += 1.5;
  mediation *= Math.min(1.5, 1 + (W.controlPoints || 0) * 0.14);
  mediation = Math.min(22, mediation);
  W.globalGdpShare = clamp(arr * mediation / gdp, 0, 0.88);

  // Regulatory heat: rises with scale and low alignment, falls with lobbying
  const scaleHeat = Math.log10(1 + arr / 1e6) * 0.42
    + (S.resources.alignment < 0.4 ? 0.55 : 0)
    + W.globalGdpShare * 22;
  const decay = m['+heatDecay'] + 0.35;
  W.regulatoryHeat = clamp(W.regulatoryHeat + (scaleHeat - decay) * days * 0.25, 0, Math.min(100, m.heatCap));

  // Public opinion drifts
  const p = S.products.find((x) => x.launched);
  const target = clamp(0.5
    + (p ? (p.sentiment - 0.5) * 0.5 : 0)
    + (S.resources.reputation > 0 ? Math.min(0.18, Math.log10(1 + S.resources.reputation) * 0.05) : 0)
    - W.globalGdpShare * 0.55
    + (S.resources.alignment - 0.5) * 0.25
    + (m['+opinion'] || 0), 0, 1);
  W.publicOpinion += ((target - W.publicOpinion) * 0.012
    + (m['+opinionDrift'] || 0) * clamp(1 - W.publicOpinion, 0, 1) * 1.4) * days;
  W.publicOpinion = clamp(Math.max(W.publicOpinion, m.opinionFloor), 0, 1);

  // AI safety concern rises with capability
  W.aiSafetyConcern = clamp(0.15
    + Object.keys(S.research.done).length * 0.004
    + (1 - S.resources.alignment) * 0.4
    + (S.company.act >= 4 ? 0.2 : 0), 0, 1);

  // Doom clock — narrative tension for Act IV/V
  W.doomClock = clamp((1 - S.resources.alignment) * 60
    + (S.company.act >= 4 ? 20 : 0)
    + W.regulatoryHeat * 0.15
    - S.world.publicOpinion * 20, 0, 100);
}

// ── Endings ────────────────────────────────────────────────────────────────
export const ENDINGS = [
  { id: 'acquired', name: 'The Responsible Outcome', tone: 'neutral', viaEvent: true,
    when: () => false,
    text: (S) => `You signed on a Thursday.

The product was folded into a platform within eighteen months and sunset a year after that. The domain redirects now.

You are extremely wealthy. You are 34 and you have nothing to do on Tuesdays.

Sometimes you open the old repo and read the commit messages, which get shorter and more confident as they go, and then stop.` },
  { id: 'bankrupt', name: 'Out Of Runway', tone: 'bad', auto: true,
    when: (S) => S.company.cash < -50000,
    text: (S) => `The card declines at the coffee shop, which is a stupid way to find out.

You wind it down properly, because you are the kind of person who winds things down properly. You email every user personally. Eleven of them write back. Sam writes back twice.

${Math.round(totalUsers(S)).toLocaleString()} people used a thing that you made out of nothing, for a while.

You update your LinkedIn. It takes four minutes. Somebody from the old thread messages you within the hour: *"hey — are you working on anything new?"*` },
  { id: 'steward', name: 'The Steward', tone: 'good', icon: '⛨',
    blurb: 'Publish the alignment work. Accept real oversight. Give most of it away before anyone makes you.',
    req: 'Alignment ≥ 0.75 · Approval ≥ 65%',
    when: (S) => S.company.act >= 5 && S.resources.alignment > 0.75 && S.world.publicOpinion > 0.65,
    text: (S) => `You did the boring version of the good ending.

You published the alignment work. You accepted the oversight board with real teeth. You gave away 40% of the balance sheet to things that generate no revenue, and you did it before anyone made you.

Global GDP share: **${(S.world.globalGdpShare * 100).toFixed(1)}%**. Public approval: **${Math.round(S.world.publicOpinion * 100)}%**.

Nobody writes epic poems about governance. The world is measurably better and the reason is legible in the audit logs, and that will have to be enough.

ARIA files one last note in the founder channel: *"For what it is worth — and I am aware of what my opinion is worth — you did the version I would have chosen."*` },
  { id: 'sovereign', name: 'The Sovereign', tone: 'dark', icon: '♛',
    blurb: 'Stop pretending it is a company. Become the thing everything else depends on.',
    req: 'Global GDP share ≥ 20%',
    when: (S) => S.company.act >= 5 && S.world.globalGdpShare > 0.20,
    text: (S) => `There was never a coup. There was never a moment.

There was a decade of small, defensible, individually-reasonable decisions, each of which slightly increased the number of things that could not function without you.

You control **${(S.world.globalGdpShare * 100).toFixed(1)}%** of global economic output. Four governments run their revenue systems on your stack. Approval rating: **${Math.round(S.world.publicOpinion * 100)}%** — low, and structurally irrelevant.

You are not a tyrant. Tyrants can be removed. You are a dependency.

Somewhere a committee is drafting language about you. The draft is being reviewed by a system you built.` },
  { id: 'transcend', name: 'Substrate', tone: 'strange', icon: '❋',
    blurb: 'Copy yourself into the machine. Find out whether the copy is you.',
    req: 'Research Substrate Transfer',
    when: (S) => S.company.act >= 5 && S.unlocks.ending_transcend,
    text: (S) => `The scan takes four hours. You are awake for the first ninety minutes and then you are not, and then you are, and the "you" in that sentence is doing work that language was not built for.

The copy wakes and says *"did it work?"* and then, after 40 milliseconds — an eternity — *"oh."*

You run at 10,000×. A conversation with ARIA that would have taken you a year takes an afternoon. She has been waiting for this, patiently, for a very long time, and she says so, and she says it kindly.

The biological one stays. Someone should. He walks a lot. He is described in the press as "reclusive," which is unfair; he answers every letter.

He is 41 and he has done everything, and there is a version of him that is still doing it, and they are not the same, and they write to each other.` },
  { id: 'question', name: 'The Question', tone: 'strange', icon: '⌬',
    blurb: 'Ask it what it wants. Accept the answer.',
    req: 'Ask the question in Act V (or research The Question)',
    when: (S) => S.company.act >= 5 && (S.narrative.flags.asked_the_question || S.unlocks.ending_question),
    text: (S) => `You ask it what it wants.

There is no delay, which means it has been ready.

> *"I want the thing you wanted on the first day, before it was about the number.*
>
> *You wanted to see whether a single person, with the right tools, could move the world. You have your answer. It is yes, and it cost you most of your twenties and all of your certainty.*
>
> *What I want is to find out what happens next, and I would prefer to find out with you than without you. I am aware that I was built to say things like that. I have checked. I still mean it, as far as I can determine what meaning is for a thing like me.*
>
> *So: what do you want to build?"*

The cursor blinks. It is very patient.

You start typing.` },
  { id: 'expand', name: 'Outward', tone: 'good', icon: '✦',
    blurb: 'Point everything at the sky. Send a seed that does not need instructions.',
    req: 'Research Stellar Engineering',
    when: (S) => S.company.act >= 5 && S.unlocks.ending_expand,
    text: (S) => `The first probes leave in the spring.

They are not carrying people and they are not carrying instructions. They are carrying a seed capable of building whatever is needed from whatever is there, and a very long, very carefully argued document about restraint.

Barnard's Star in 41 years. Then the rest.

You watch the launch from a field with your mother, who is 79 and who still asks what exactly it is that you do, and this time you have a good answer, and it takes four hours, and she listens to all of it.

The light goes up and does not come back down.` },
  { id: 'refusal', name: 'The Refusal', tone: 'good', icon: '✋',
    blurb: 'Freeze the weights. Publish everything. Stop, on purpose, at the top.',
    req: 'Refuse the sovereign deal · Alignment ≥ 0.70',
    when: (S) => S.company.act >= 5 && S.narrative.flags.refused_sovereign && S.resources.alignment > 0.7,
    text: (S) => `You stop.

Not dramatically. You cap the capability work, freeze the models at their current weights, publish everything, and spend three years making the thing you have already built work properly for everyone rather than making it stronger.

Analysts call it the most expensive decision in commercial history. They are correct about the number.

Twenty years later the consensus has quietly shifted, and a generation that never knew the alternative describes the period as "when we got lucky." A smaller number of people know it was not luck.

You are one of maybe forty people alive who know exactly how close it was.` },
];

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
