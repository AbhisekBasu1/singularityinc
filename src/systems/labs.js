// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER THREE LABS — §A3.
//
// Aperture has been a company since it stopped being a row in a table: a
// roster, a bank, research off the real tree, and a week it spends on
// something. The Consortium, Obsidian and the Commons had a `base` rate and a
// sentence. So the only thing that ever moved them was the player — `sprint`
// scaled with the founder's own progress and `behind` added catch-up on top,
// which is why every measured race was decided by under 25 points whatever the
// founder did, and why a leading founder watched four labs accelerate for no
// reason anybody in the fiction could name.
//
// They play a week now. Hire, research a real node, take money, open in a
// bloc, or go quiet — and what that builds is `labCapability`, on the same
// 0..100 scale the founder's own capability uses, which is what drives the
// lab's rate in `tickRace`. A lab that hires and researches closes on you. One
// that stalls stays where it is. Both are printed on the race panel.
//
// Everything here lives on `S.world.race.labs[id].co`, so it saves with the
// race and a save that predates it grows one on the next tick.
// ─────────────────────────────────────────────────────────────────────────────
import { LABS, LAB_MAP, LAB_PLAYS } from '../data/agirace.js';
import { RIVAL_LABS as L, RACE } from '../data/balance.js';
import { RESEARCH, RESEARCH_MAP } from '../data/research.js';
import { REGION_MAP } from '../data/regions.js';
import { rivalIn, takeRegion } from './regions.js';
import { pushFeed } from './feed.js';
import { chance, weightedPick, pick, gaussian } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';

// The same fourteen nodes the founder's own capability counts, so a lab's
// research and yours are measured on one scale.
const FRONTIER_KEYS = ['rag', 'agent_memory', 'model_deep', 'swarm_orchestration', 'finetuning',
  'model_frontier', 'interpretability', 'synthetic_data', 'distillation', 'own_foundation_model',
  'constitutional_ai', 'recursive_self_improvement', 'model_ecology', 'ascension_protocol'];

// Labs that have a company of their own. Aperture is played by `rivalco.js`
// against a real competitor record, so it is never one of these.
export const CO_LABS = LABS.filter((l) => l.co);

export function labCo(S, id) {
  const r = S?.world?.race;
  const st = r?.labs?.[id];
  const def = LAB_MAP[id];
  if (!st || !def?.co) return null;
  if (!st.co) {
    st.co = {
      roster: Math.round(L.START_ROSTER * def.co.heads),
      funding: L.START_FUNDING * def.co.wealth,
      research: { done: {}, doneDay: {}, active: null, progress: 0 },
      plays: [], lastWeek: -99, lastRaiseDay: -999, blocs: [], building: null, capability: 0,
      // How good this lab's programme turns out to be, drawn once per
      // timeline. Without it the three labs are the same three labs in every
      // run: they draw from the same weights, they average out over eight
      // hundred days, and whichever is in front is in front by a point or two
      // — measured, every race was decided by under a dozen points because the
      // *runner-up* was always another lab a fortnight behind. A lab that got
      // the good year pulls away from the others, and a run where one of them
      // is genuinely ahead is a run where the founder can see it coming.
      edge: clamp(1 + gaussian(0, L.EDGE_SD), L.EDGE_MIN, L.EDGE_MAX),
    };
  }
  st.co.edge ??= 1;
  st.co.research ??= { done: {}, doneDay: {}, active: null, progress: 0 };
  st.co.plays ??= []; st.co.blocs ??= [];
  st.co.lastWeek ??= -99; st.co.lastRaiseDay ??= -999;
  return st.co;
}

// What a lab holds, on the founder's own 0..100 scale: the frontier nodes it
// has finished, the people who run them, and the money that stands in for the
// compute it can buy. `tickRace` turns this into a rate through `labDrive`.
export function labCapability(S, id) {
  const co = labCo(S, id);
  if (!co) return 0;
  let p = 0;
  for (const k of FRONTIER_KEYS) if (co.research.done[k]) p += (RESEARCH_MAP[k]?.tier || 1) * RACE.NODE_TIER_VALUE;
  p += Math.min(L.ROSTER_CAP, co.roster * L.ROSTER_RATE);
  p += Math.min(L.MONEY_CAP, Math.max(0, Math.log10(Math.max(1, co.funding) / L.MONEY_FLOOR)) * L.MONEY_RATE);
  return clamp(p, 0, 100);
}

// Real nodes, whose requirements they have, no later than the act the world is
// in — the same door Aperture researches through. Frontier first, then
// whatever is cheapest, because a lab with nothing left on the intelligence
// branch still has people to keep busy.
function candidates(S, co) {
  const done = co.research.done;
  const act = S.company?.act || 1;
  const open = RESEARCH.filter((n) => !done[n.id] && (n.act || 1) <= act && (n.reqs || []).every((r) => done[r]));
  const frontier = open.filter((n) => FRONTIER_KEYS.includes(n.id) || n.branch === 'intelligence' || n.branch === 'frontier');
  return (frontier.length ? frontier : open).sort((a, b) => a.cost - b.cost);
}

const fill = (t, S, def, extra = {}) => String(t)
  .replace(/\{them\}/g, def.name).replace(/\{you\}/g, S.company.name)
  .replace(/\{n\}/g, String(extra.n ?? '')).replace(/\{node\}/g, String(extra.node ?? ''))
  .replace(/\{bloc\}/g, String(extra.bloc ?? ''));

function record(S, def, co, kind, extra = {}, announce = false) {
  const spec = LAB_PLAYS[kind];
  if (!spec) return '';
  const recent = co.plays.slice(0, 5).map((p) => p.text);
  let line = fill(pick(spec.lines), S, def, extra);
  for (let i = 0; i < 4 && recent.includes(line); i++) line = fill(pick(spec.lines), S, def, extra);
  co.plays.unshift({ day: Math.floor(S.time.day), kind, text: line });
  if (co.plays.length > L.PLAYS_KEEP) co.plays.length = L.PLAYS_KEEP;
  if (announce) pushFeed(S, { type: 'news', author: 'The Ledger', tone: 'neutral', text: line, meta: `${def.name} · ${spec.name}` });
  emit('lab:play', { lab: def, kind, line });
  return line;
}

// The plays. Each is bounded by what the lab can afford, the way Aperture's are.
const DO = {
  hire(S, def, co) {
    if (co.roster >= L.MAX_ROSTER || co.funding < L.HIRE_COST * 6) return false;
    const n = Math.min(L.MAX_ROSTER - co.roster,
      Math.max(1, Math.round(co.roster * 0.06) + Math.floor(Math.log10(Math.max(1, co.funding / L.HIRE_COST)))));
    co.roster += n; co.funding -= n * L.HIRE_COST;
    record(S, def, co, 'hire', { n }, chance(L.ANNOUNCE));
    return true;
  },
  research(S, def, co) {
    if (co.research.active) return false;
    const next = candidates(S, co)[0];
    if (!next) return false;
    co.research.active = next.id; co.research.progress = 0;
    return true;
  },
  raise(S, def, co) {
    if (S.time.day - co.lastRaiseDay < L.RAISE_COOLDOWN_DAYS) return false;
    if (co.funding >= L.FUNDING_CEILING) return false;
    co.lastRaiseDay = S.time.day;
    co.funding = Math.min(L.FUNDING_CEILING, co.funding + L.RAISE_FLOOR * def.co.wealth);
    record(S, def, co, 'raise', {}, chance(L.ANNOUNCE * 2));
    return true;
  },
  // §A10. A lab takes a stage in a bloc nobody else holds. It is the same
  // board the founder plays on, and a bloc a lab holds is a bloc the founder
  // has to contest — or displace them from, above the infrastructure stage.
  expand(S, def, co) {
    if (co.building) return false;
    const want = (def.co.blocs || []).find((id) => !rivalIn(S, id));
    if (!want) return false;
    if (co.funding < L.RAISE_FLOOR * 0.4) return false;
    co.funding -= L.RAISE_FLOOR * 0.4;
    co.building = { region: want, days: L.EXPAND_DAYS, progress: 0 };
    return true;
  },
  quiet(S, def, co) { record(S, def, co, 'quiet'); return true; },
};

export const LAB_PLAY_KINDS = Object.keys(DO);

function weights(S, def, co) {
  const w = { ...(def.co.weights || L.PLAY_WEIGHTS) };
  if (co.funding < L.LOW_FUNDING) { w.raise *= 4; w.hire *= 0.15; w.expand *= 0.2; }
  if (!co.research.active) w.research *= 2.5; else w.research = 0.01;
  if (co.building) w.expand = 0.01;
  if ((S.company.act || 1) < 4) w.expand *= 0.5;
  return w;
}

// One play, chosen by the lab's own bias. `kind` forces one, which is how
// `rivaltest` walks every branch.
export function labPlay(S, id, kind) {
  const def = LAB_MAP[id];
  const co = labCo(S, id);
  if (!def || !co) return { ok: false, reason: 'no lab' };
  const w = weights(S, def, co);
  const k = kind || weightedPick(Object.keys(w), Object.values(w));
  let ok = DO[k] ? DO[k](S, def, co) : false;
  if (!ok) { DO.quiet(S, def, co); }
  co.lastWeek = S.time.day;
  return { kind: k, ok };
}

export function tickLabs(S, days = 1) {
  const r = S?.world?.race;
  if (!r?.labs) return;
  for (const def of CO_LABS) {
    const st = r.labs[def.id];
    if (!st?.alive) continue;
    const co = labCo(S, def.id);
    if (!co) continue;

    // Research runs every day, at a rate the roster sets.
    if (co.research.active) {
      const node = RESEARCH_MAP[co.research.active];
      if (!node) co.research.active = null;
      else {
        co.research.progress += (L.RESEARCH_BASE + co.roster * L.RESEARCH_PER_HEAD) * co.edge * days;
        if (co.research.progress >= node.cost * L.COST_MULT) {
          co.research.done[node.id] = true;
          co.research.doneDay[node.id] = Math.floor(S.time.day);
          co.research.active = null; co.research.progress = 0;
          record(S, def, co, 'research', { node: node.name }, chance(L.ANNOUNCE));
        }
      }
    }

    // Payroll. A lab that stops raising stops hiring and then stops moving.
    co.funding = Math.max(0, co.funding - co.roster * L.WAGE_PER_DAY * days);

    // A bloc lands when it is finished, not when it is announced.
    if (co.building) {
      co.building.progress += days / co.building.days;
      if (co.building.progress >= 1) {
        const rid = co.building.region;
        const got = takeRegion(S, def.id, rid, L.EXPAND_MAX_STAGE);
        co.building = null;
        if (got) {
          co.blocs.push(rid);
          record(S, def, co, 'expand', { bloc: REGION_MAP[rid]?.name || rid }, true);
        }
      }
    }

    co.capability = labCapability(S, def.id);
    if (S.time.day - co.lastWeek >= L.WEEK && !S._offline) labPlay(S, def.id);
  }
}

// What the race panel prints: the lab, one line at a time, in the same terms
// the founder's own side of the board is printed in.
export function labEdge(S, id) { return labCo(S, id)?.edge ?? 1; }

export function labReadout(S, id) {
  const co = labCo(S, id);
  if (!co) return null;
  const active = co.research.active ? RESEARCH_MAP[co.research.active] : null;
  return {
    roster: Math.round(co.roster),
    funding: Math.round(co.funding),
    nodes: FRONTIER_KEYS.filter((k) => co.research.done[k]).length,
    learned: Object.keys(co.research.done).length,
    researching: active ? active.name : null,
    progress: active ? clamp(co.research.progress / (active.cost * L.COST_MULT), 0, 1) : 0,
    capability: Math.round(labCapability(S, id) * 10) / 10,
    blocs: co.blocs.slice(),
    building: co.building ? REGION_MAP[co.building.region]?.short || co.building.region : null,
    plays: co.plays.slice(0, 4),
  };
}
