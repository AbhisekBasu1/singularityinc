// ─────────────────────────────────────────────────────────────────────────────
// THE RACE — simulation of rival frontier labs closing on AGI.
// ─────────────────────────────────────────────────────────────────────────────
import { LABS, LAB_MAP, RACE_BEATS } from '../data/agirace.js';
import { RACE } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { RESEARCH_MAP } from '../data/research.js';
import { directiveStrength } from '../data/directives.js';
import { rand, chance, gaussian, pick } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { pushFeed } from './feed.js';

// Megaprojects that are, in substance, frontier capacity.
const FRONTIER_PROJECTS = ['campus', 'fusion_plant', 'fab', 'constellation', 'world_grid', 'lunar_fab'];

const INTELLIGENCE_KEYS = ['rag', 'agent_memory', 'model_deep', 'swarm_orchestration', 'finetuning',
  'model_frontier', 'interpretability', 'synthetic_data', 'distillation', 'own_foundation_model',
  'constitutional_ai', 'recursive_self_improvement', 'model_ecology', 'ascension_protocol'];

export function initRace(S) {
  if (S.world.race) return S.world.race;
  S.world.race = {
    started: S.time.day,
    labs: Object.fromEntries(LABS.map((l) => [l.id, {
      progress: RACE.START_PROGRESS_BASE + rand() * RACE.START_PROGRESS_RANGE,
      momentum: 1, alive: true, funded: true, safety: l.safety,
    }])),
    beats: {},
    crossed: null,
    you: Math.min(100, playerCapability(S)),  // what you have actually converted
    push: 0,       // how much of the company is pointed at the frontier
  };
  return S.world.race;
}

// What you *could* do: nodes, compute, data, frontier-grade agents. This is the
// ceiling your progress approaches, not the progress itself — see tickRace.
export function playerCapability(S) {
  let p = 0;
  for (const k of INTELLIGENCE_KEYS) {
    if (S.research.done[k]) p += (RESEARCH_MAP[k]?.tier || 1) * RACE.NODE_TIER_VALUE;
  }
  p += Math.min(RACE.COMPUTE_CAPABILITY_CAP,
    Math.log10(1 + (S.resources.computeCap || 0)) * RACE.COMPUTE_CAPABILITY_RATE);
  p += Math.min(RACE.DATA_CAPABILITY_CAP,
    Math.log10(1 + (S.resources.data || 0)) * RACE.DATA_CAPABILITY_RATE);
  p += Math.min(RACE.AGENT_CAPABILITY_CAP,
    S.agents.filter((a) => ['inhouse', 'recursive', 'transcendent'].includes(a.model)).length
      * RACE.AGENT_CAPABILITY_RATE);
  if (S.research.done.recursive_self_improvement) p *= RACE.RECURSIVE_CAPABILITY_MULT;
  if (S.research.done.ascension_protocol) p *= RACE.ASCENSION_CAPABILITY_MULT;
  return Math.max(0, p);
}

// How much of the company is actually pointed at the frontier. Every term is
// something the player does on purpose and can watch themselves doing — a
// standing order, who is on which lane, where the founder's own hours go, what
// got built, and whether safety is being treated as a speed limit.
export function pushTarget(S) {
  let t = 0;
  const str = directiveStrength(S);
  if (S.company.directive === 'ascend') t += RACE.ASCEND_DIRECTIVE_PUSH * str;
  else if (S.company.directive === 'deep') t += RACE.DEEP_DIRECTIVE_PUSH * str;
  if (S.agents.length) {
    const onFrontier = S.agents.filter((a) => a.lane === 'research' || a.lane === 'moonshot').length;
    t += Math.min(RACE.AGENT_PUSH_CAP, (onFrontier / S.agents.length) * RACE.AGENT_PUSH_RATE);
  }
  t += Math.min(RACE.FOUNDER_PUSH_CAP,
    (S.founder.allocation?.learn || 0) * RACE.FOUNDER_PUSH_RATE);
  const built = S.world.projectsBuilt || {};
  for (const k of FRONTIER_PROJECTS) if (built[k]) t += RACE.PROJECT_PUSH;
  t = Math.min(t, RACE.INTENTIONAL_PUSH_CAP);
  // Safety is a speed limit. You are permitted to decline to observe it.
  t += (1 - clamp(S.resources.alignment ?? 0.5, 0, 1)) * RACE.MISALIGN_PUSH_RATE;
  if (S.narrative.flags.moratorium) t *= RACE.MORATORIUM_PUSH_MULT; // you agreed to stop
  if (S.narrative.flags.frozen_weights) t *= RACE.FROZEN_PUSH_MULT; // you stopped, on purpose
  return clamp(t, 0, 1);
}

export function pushLevel(S) { return clamp(S.world.race?.push ?? 0, 0, 1); }

// Your own position in the race: what you have converted, not what you hold.
export function playerProgress(S) {
  const r = S.world.race;
  // A save that predates the field reads as what it holds until the next tick
  // converts it, rather than flashing zero.
  if (!r || r.you == null) return clamp(playerCapability(S), 0, 100);
  return clamp(r.you, 0, 100);
}

export function raceStandings(S) {
  const r = S.world.race;
  if (!r) return [];
  const rows = LABS.filter((l) => r.labs[l.id]?.alive)
    .map((l) => ({ ...l, ...r.labs[l.id], you: false }));
  rows.push({ id: 'you', name: S.company.name, tag: 'you', color: '#00e5a0', icon: '★',
    progress: playerProgress(S), you: true,
    safety: S.resources.alignment, line: 'One person, and everything they built.' });
  return rows.sort((a, b) => b.progress - a.progress);
}

export function tickRace(S, days, m = computeMods(S)) {
  if (S.company.act < 3) return;
  const r = initRace(S);

  // Commitment moves toward its target with inertia — you do not point a whole
  // company at the frontier on a Tuesday, and you do not turn it away in a day
  // either. An older save that predates this field starts wherever it deserves.
  const target = pushTarget(S);
  if (r.push == null) r.push = target;
  r.push += (target - r.push) * (1 - Math.pow(0.5, days / RACE.PUSH_HALFLIFE));

  // Capability is the ceiling; commitment is the speed you approach it at.
  // Progress never falls: losing an agent does not un-learn the frontier.
  const ceilingYou = Math.min(100, playerCapability(S));
  if (r.you == null) r.you = ceilingYou;
  const rate = RACE.CONVERT_PER_DAY * (RACE.PUSH_FLOOR + (1 - RACE.PUSH_FLOOR) * r.push);
  r.you += Math.max(0, Math.min(ceilingYou - r.you, rate * days));
  const mine = r.you;

  for (const l of LABS) {
    const st = r.labs[l.id];
    if (!st?.alive) continue;
    // Rivals accelerate when behind (they can see your papers) and when hype is high.
    const behind = clamp((mine - st.progress) / RACE.CATCHUP_DISTANCE,
      RACE.CATCHUP_MIN, RACE.CATCHUP_MAX);
    // The whole field speeds up as the science matures.
    const raceDays = S.time.day - (r.started || 0);
    // And once you are visibly close, the field sprints. Measured before this
    // term existed, the player crossed first in 7 of 7 builds at 100% while the
    // best rival stalled around 65 — which made two written endings and the
    // whole "somebody is going to cross this year" arc unreachable. The leader
    // reads your papers; being far ahead is supposed to be frightening, not
    // safe.
    const sprint = 1 + Math.max(0, mine - RACE.SPRINT_FROM) / (100 - RACE.SPRINT_FROM)
                     * RACE.SPRINT_GAIN;
    let rate = l.base * (1 + raceDays / RACE.MATURITY_DAYS)
             * (1 + behind * RACE.CATCHUP_RATE) * sprint
             * (RACE.HYPE_BASE + S.market.hype * RACE.HYPE_RATE)
             * m.competitorGrowth * (m.rivalRace || 1);
    if (S.research.done.standards_body) rate *= RACE.STANDARDS_MULT;
    if (S.narrative.flags.moratorium) rate *= RACE.MORATORIUM_RIVAL_MULT;
    if (S.narrative.flags.opened_weights) rate *= RACE.OPEN_WEIGHTS_MULT;
    if (S.narrative.flags.published_traces) rate *= RACE.TRACE_PUBLISH_MULT;
    rate *= 1 + gaussian(0, l.volatility) * RACE.VOLATILITY_SCALE;
    // Once somebody crosses, the race is decided; nobody else "arrives".
    const ceiling = r.crossed ? RACE.POST_CROSS_CEILING : 100;
    st.progress = clamp(st.progress + Math.max(0, rate) * days, 0, ceiling);

    // A lab can stall out or be shut down.
    if (st.progress > RACE.LAB_FAILURE_PROGRESS
        && chance(RACE.LAB_FAILURE_CHANCE * days * (1 - l.safety))) {
      st.alive = false;
      pushFeed(S, { type: 'news', author: '', tone: 'good',
        text: `**${l.name}** halts frontier work after an internal incident.` });
      emit('race:lab_down', { lab: l });
    }
  }

  // Narrative beats when the leader crosses a threshold.
  const leader = raceStandings(S)[0];
  for (const b of RACE_BEATS) {
    if (r.beats[b.id]) continue;
    if ((leader?.progress || 0) >= b.at) {
      r.beats[b.id] = Math.floor(S.time.day);
      pushFeed(S, { type: 'news', author: '', tone: leader.you ? 'good' : 'bad',
        text: `${b.text} Leader: **${leader.name}** (${Math.round(leader.progress)}%).` });
      emit('race:beat', { beat: b, leader });
    }
  }

  // Somebody crosses the line.
  if (!r.crossed) {
    const crosser = raceStandings(S).find((x) => x.progress >= 100);
    if (crosser) {
      // Record how close it was. A race the player wins by 40 points is a
      // victory lap; one they win by 3 is the thing the act was about.
      const rows = raceStandings(S);
      const runnerUp = rows.find((x) => x.id !== crosser.id);
      r.crossed = { id: crosser.id, name: crosser.name, day: Math.floor(S.time.day), you: !!crosser.you,
                    margin: runnerUp ? Math.round(crosser.progress - runnerUp.progress) : 100,
                    runnerUp: runnerUp?.name || null };
      emit('race:crossed', r.crossed);
      if (!crosser.you) {
        S.narrative.flags._rival_agi = crosser.id;
        pushFeed(S, { type: 'news', author: '', tone: 'bad',
          text: `**${crosser.name}** announces a system that passes every benchmark that exists. Markets halt.` });
      } else {
        pushFeed(S, { type: 'news', author: '', tone: 'good',
          text: `**${S.company.name}** crosses the threshold. There is no second place.` });
      }
    }
  }
}

export function raceLeader(S) { return raceStandings(S)[0]; }
export function playerRank(S) {
  const rows = raceStandings(S);
  return rows.findIndex((x) => x.you) + 1;
}
