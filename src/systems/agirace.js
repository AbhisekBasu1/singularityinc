// ─────────────────────────────────────────────────────────────────────────────
// THE RACE — simulation of rival frontier labs closing on AGI.
// ─────────────────────────────────────────────────────────────────────────────
import { LABS, LAB_MAP, RACE_BEATS } from '../data/agirace.js';
import { RACE, SECOND } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { RESEARCH_MAP } from '../data/research.js';
import { orderStrengths } from '../data/directives.js';
import { rand, chance, gaussian, pick } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { pushFeed } from './feed.js';
import { apertureCapability } from './rivalco.js';
import { tickLabs, labCapability, labEdge } from './labs.js';
import { lastWorld } from './keep.js';
import { frontierComputeMult } from './compute.js';
import { frontierProjectBonus } from './projects.js';

const INTELLIGENCE_KEYS = ['rag', 'agent_memory', 'model_deep', 'swarm_orchestration', 'finetuning',
  'model_frontier', 'interpretability', 'synthetic_data', 'distillation', 'own_foundation_model',
  'constitutional_ai', 'recursive_self_improvement', 'model_ecology', 'ascension_protocol'];

export function initRace(S) {
  if (S.world.race) return S.world.race;
  // §F8. A world that remembers. With the New Game+ world toggle set, the lab
  // that crossed the line last time — or led it, if nobody did — opens this
  // race already ahead, by more if it actually won. Without the toggle
  // `lastWorld` answers null and this is the race it has always been.
  const past = lastWorld(S);
  const ahead = past?.raceLab || null;
  const headStart = ahead ? (past.raceCrossed ? RACE.MEMORY_CROSSED : RACE.MEMORY_LED) : 0;
  S.world.race = {
    started: S.time.day,
    remembers: ahead || null,
    labs: Object.fromEntries(LABS.map((l) => [l.id, {
      progress: RACE.START_PROGRESS_BASE + rand() * RACE.START_PROGRESS_RANGE
        + (l.id === ahead ? headStart : 0),
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
// Which standing orders point the company at the frontier, and by how much.
// §A23a made the order a stack of up to three; this read only slot zero, so a
// founder who put Ascend in the second slot was pointing the whole company at
// the frontier and the race could not see it. `orderStrengths` is the same
// list `computeMods` applies and the Desk prints, already scaled by each
// slot's own ramp and by the shared budget — with one order in slot zero it
// returns exactly what `directiveStrength` did, which is why nothing that
// predates the stack moves.
const ORDER_PUSH = { ascend: 'ASCEND_DIRECTIVE_PUSH', deep: 'DEEP_DIRECTIVE_PUSH' };

export function pushTarget(S) {
  let t = 0;
  for (const o of orderStrengths(S)) {
    const key = ORDER_PUSH[o.id];
    if (key) t += RACE[key] * o.k;
  }
  if (S.agents.length) {
    const onFrontier = S.agents.filter((a) => a.lane === 'research' || a.lane === 'moonshot').length;
    t += Math.min(RACE.AGENT_PUSH_CAP, (onFrontier / S.agents.length) * RACE.AGENT_PUSH_RATE);
  }
  t += Math.min(RACE.FOUNDER_PUSH_CAP,
    (S.founder.allocation?.learn || 0) * RACE.FOUNDER_PUSH_RATE);
  // §A9. The compute the founder actually pointed at the frontier, rather than
  // at research or at serving the product. It steers everything intentional
  // above; it is bounded by `COMPUTE_SPLIT.FRONTIER_MIN/MAX` and is 1.0 at the
  // default split, so a save that has never touched the slider is unchanged.
  t *= frontierComputeMult(S);
  t = Math.min(t, RACE.INTENTIONAL_PUSH_CAP);
  // §A11. And the one thing that reaches *past* that ceiling: something built.
  // A standing order, a roster and the founder's own hours saturate; a fusion
  // plant does not. Bounded by `RACE.PROJECT_PUSH_CAP`, so no number of orbital
  // rings decides the race on its own.
  t += frontierProjectBonus(S);
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

// ── §A3 What a lab holds, and how fast that makes it ────────────────────────
// One scale for everybody. A lab's capability is its roster, its finished
// frontier nodes and the money standing in for the compute it can buy, on the
// same 0..100 the founder's own capability uses — `labCapability` in
// `systems/labs.js` for the three institutions, and Aperture's own company
// through `apertureCapability`, because Aperture is a company the founder can
// actually go and look at.
export function labCapabilityOf(S, id) {
  return id === 'aperture' ? apertureCapability(S) : labCapability(S, id);
}

// The rate multiplier that capability buys. A lab with nothing runs at
// DRIVE_FLOOR — a name, a building and last year's model; a lab that has built
// everything runs at DRIVE_FLOOR + DRIVE_GAIN. This is the whole of the
// un-rubber-banding: nothing in it reads the founder's progress.
export function labDrive(cap) {
  return RACE.DRIVE_FLOOR + RACE.DRIVE_GAIN * clamp((cap || 0) / 100, 0, 1);
}

export function raceStandings(S) {
  const r = S.world.race;
  if (!r) return [];
  const rows = LABS.filter((l) => r.labs[l.id]?.alive)
    .map((l) => ({ ...l, ...r.labs[l.id], you: false,
                   capability: Math.round(labCapabilityOf(S, l.id) * 10) / 10 }));
  rows.push({ id: 'you', name: S.company.name, tag: 'you', color: '#00e5a0', icon: '★',
    progress: playerProgress(S), you: true, capability: Math.round(Math.min(100, playerCapability(S)) * 10) / 10,
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

  // The labs spend their week before the race reads them, so a hire or a
  // finished node is in the rate the same day it lands.
  tickLabs(S, days);

  // Who is in front, for the one term that is allowed to read anybody else.
  const front = Math.max(mine, ...LABS.filter((l) => r.labs[l.id]?.alive).map((l) => r.labs[l.id].progress));

  for (const l of LABS) {
    const st = r.labs[l.id];
    if (!st?.alive) continue;
    // The whole field speeds up as the science matures.
    const raceDays = S.time.day - (r.started || 0);
    // §A3. What this lab has built — its people, its finished nodes, the
    // compute its money buys — and nothing about the founder. `sprint` and the
    // catch-up term used to live here and both were functions of the player's
    // own progress, which is why every measured race was decided by 0–24
    // points however the run was played.
    // `edge` is how good this lab's programme turned out to be in this
    // timeline, drawn once when it stands up. It is the reason the three of
    // them are not the same three every run.
    const drive = labDrive(labCapabilityOf(S, l.id)) * (l.id === 'aperture' ? 1 : labEdge(S, l.id));
    // The one thing anybody in the fiction would recognise as a rubber band,
    // and the only one left: published work spreads, so a lab a long way
    // behind the leader is reading the leader's papers. Bounded at
    // DIFFUSION_MAX, one-directional, and printed on the race panel in those
    // words rather than hidden in a multiplier.
    const diffusion = 1 + RACE.DIFFUSION_MAX
      * clamp((front - st.progress) / RACE.DIFFUSION_DISTANCE, 0, 1);
    let rate = l.base * (1 + raceDays / RACE.MATURITY_DAYS) * drive * diffusion
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

// ── §A24 The world after somebody else crossed ──────────────────────────────
// A run that loses the race and refuses to fold keeps going — and the world it
// keeps going in has a system in it that is better than yours at everything.
// Two numbers know about that: the share of world output flowing through your
// company, which stops compounding the way it did because somebody else is
// mediating the same activity, and the public's view of you, which finds a
// lower ceiling because second is a different story from first.
//
// It is a reprice, not a punishment. `SHARE_GROWTH` caps what the model may
// reach rather than cutting what you hold, and approval has a floor. One line
// in `tickWorld` reads this, and with no crossing it returns the identity.
export function secondLab(S) {
  const who = S?.narrative?.flags?._rival_agi;
  if (!who) return null;
  return { who, share: SECOND.SHARE_GROWTH, approval: SECOND.APPROVAL, floor: SECOND.APPROVAL_FLOOR };
}

// Applied once a tick, after the model has produced both numbers. Returns
// what it changed, for the World view's why-panel and for the tests.
export function repriceForSecond(S) {
  const s = secondLab(S);
  if (!s) return null;
  const W = S.world;
  const share = W.globalGdpShare;
  W.globalGdpShare = share * s.share;
  const before = W.publicOpinion;
  W.publicOpinion = Math.max(s.floor, Math.min(before, before * s.approval + (1 - s.approval) * s.floor));
  return { who: s.who, share: W.globalGdpShare - share, approval: W.publicOpinion - before };
}

// The one hand outside this file that may move a rival lab: a world card,
// through the bounded `race` effect. Positive is the leading living rival
// gaining ground; negative is a setback for them. It never touches the
// founder's own progress, never a race already decided, and never carries a
// lab over the line — `WORLD_LAB_CEILING` is as far as the world reaches, and
// the last point is the lab's own.
export function nudgeRivalFrontier(S, n) {
  const r = S.world?.race;
  if (!r || r.crossed || !Number.isFinite(n) || n === 0) return null;
  const leader = LABS.filter((l) => r.labs[l.id]?.alive)
    .sort((a, b) => r.labs[b.id].progress - r.labs[a.id].progress)[0];
  if (!leader) return null;
  const st = r.labs[leader.id];
  const before = st.progress;
  st.progress = n > 0
    ? Math.max(before, Math.min(before + n, RACE.WORLD_LAB_CEILING))
    : Math.max(0, before + n);
  return { lab: leader, before, progress: st.progress };
}
export function playerRank(S) {
  const rows = raceStandings(S);
  return rows.findIndex((x) => x.you) + 1;
}
