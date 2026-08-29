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
      progress: 4 + rand() * 7, momentum: 1, alive: true, funded: true, safety: l.safety,
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
    if (S.research.done[k]) p += (RESEARCH_MAP[k]?.tier || 1) * 0.95;
  }
  p += Math.min(26, Math.log10(1 + (S.resources.computeCap || 0)) * 4.4);
  p += Math.min(5, Math.log10(1 + (S.resources.data || 0)) * 1.1);
  p += Math.min(8, S.agents.filter((a) => ['inhouse', 'recursive', 'transcendent'].includes(a.model)).length * 1.6);
  if (S.research.done.recursive_self_improvement) p *= 1.20;
  if (S.research.done.ascension_protocol) p *= 1.18;
  return Math.max(0, p);
}

// How much of the company is actually pointed at the frontier. Every term is
// something the player does on purpose and can watch themselves doing — a
// standing order, who is on which lane, where the founder's own hours go, what
// got built, and whether safety is being treated as a speed limit.
export function pushTarget(S) {
  let t = 0;
  const str = directiveStrength(S);
  if (S.company.directive === 'ascend') t += 0.42 * str;
  else if (S.company.directive === 'deep') t += 0.17 * str;
  if (S.agents.length) {
    const onFrontier = S.agents.filter((a) => a.lane === 'research' || a.lane === 'moonshot').length;
    t += Math.min(0.22, (onFrontier / S.agents.length) * 0.30);
  }
  t += Math.min(0.12, (S.founder.allocation?.learn || 0) * 0.40);
  const built = S.world.projectsBuilt || {};
  for (const k of FRONTIER_PROJECTS) if (built[k]) t += 0.045;
  t = Math.min(t, 0.88);
  // Safety is a speed limit. You are permitted to decline to observe it.
  t += (1 - clamp(S.resources.alignment ?? 0.5, 0, 1)) * 0.14;
  if (S.narrative.flags.moratorium) t *= 0.25;      // you agreed to stop
  if (S.narrative.flags.frozen_weights) t *= 0.15;  // you stopped, on purpose
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
    const behind = clamp((mine - st.progress) / 45, -0.5, 0.8);
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
    let rate = l.base * (1 + raceDays / 2600) * (1 + behind * 0.60) * sprint
             * (0.7 + S.market.hype * 0.6) * m.competitorGrowth * (m.rivalRace || 1);
    if (S.research.done.standards_body) rate *= 0.78;
    if (S.narrative.flags.moratorium) rate *= 0.45;
    if (S.narrative.flags.opened_weights) rate *= 1.35;
    if (S.narrative.flags.published_traces) rate *= 1.12;
    rate *= 1 + gaussian(0, l.volatility) * 0.35;
    // Once somebody crosses, the race is decided; nobody else "arrives".
    const ceiling = r.crossed ? 99 : 100;
    st.progress = clamp(st.progress + Math.max(0, rate) * days, 0, ceiling);

    // A lab can stall out or be shut down.
    if (st.progress > 20 && chance(0.00025 * days * (1 - l.safety))) {
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
