// ─────────────────────────────────────────────────────────────────────────────
// REGIONS — stance drift, engagement stages, and what they pay you.
// ─────────────────────────────────────────────────────────────────────────────
import { REGIONS, REGION_MAP, STAGES, STAGE_INDEX, stanceOf } from '../data/regions.js';
import { LAB_MAP } from '../data/agirace.js';
import { ECON, REGION_BOARD as BOARD } from '../data/balance.js';
import { computeMods, markDirty } from './modifiers.js';
import { clamp, soften } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { rand, chance, gaussian } from '../engine/rng.js';

export function initRegions(S) {
  // §A10. Who else is on the board. A save that predates this grows the map on
  // the next call, so an old game finds East Asia already occupied rather than
  // finding nothing there at all.
  if (!S.world.regionRivals) {
    S.world.regionRivals = {};
    for (const r of REGIONS) {
      if (r.domestic) S.world.regionRivals[r.id] = { by: 'domestic', stage: r.domestic.stage, day: 0 };
    }
  }
  if (S.world.regions && Object.keys(S.world.regions).length) return S.world.regions;
  S.world.regions = Object.fromEntries(REGIONS.map((r) => [r.id, {
    stance: r.baseStance, stage: 'none', building: null, progress: 0, invested: 0,
  }]));
  return S.world.regions;
}

export function regionState(S, id) { initRegions(S); return S.world.regions[id]; }

// ── §A10 The other side of the board ────────────────────────────────────────
// One bloc, one rival: the first of them to finish a building there holds it,
// and holding it is a competing offer the bloc can take instead of yours. At
// market entry and infrastructure that is contest — your standing target is
// lower while they are there. From partnership up a bloc has one supplier, so
// the only way in is to displace them, which costs money and standing with
// everybody watching.
export function rivalIn(S, id) { return S?.world?.regionRivals?.[id] || null; }

export function rivalStageIndex(S, id) {
  const r = rivalIn(S, id);
  return r ? (STAGE_INDEX[r.stage] || 0) : 0;
}

export function rivalName(S, id) {
  const r = rivalIn(S, id);
  if (!r) return null;
  if (r.by === 'domestic') return REGION_MAP[id]?.domestic?.name || 'a domestic champion';
  if (r.by === 'aperture') return 'Aperture Systems';
  return LAB_MAP[r.by]?.name || 'a rival';
}

// A rival finishes a building. Refused where the founder already holds the
// state, and never past the stage that side of the board is allowed.
export function takeRegion(S, by, id, maxStage = BOARD.EXCLUSIVE_FROM) {
  initRegions(S);
  if (!REGION_MAP[id]) return null;
  const mine = S.world.regions[id];
  if (mine && STAGE_INDEX[mine.stage] >= BOARD.EXCLUSIVE_FROM) return null;
  const have = rivalIn(S, id);
  if (have && have.by !== by) return null;
  const idx = Math.min(maxStage, (have ? STAGE_INDEX[have.stage] : 0) + 1);
  if (have && STAGE_INDEX[have.stage] >= idx) return null;
  S.world.regionRivals[id] = { by, stage: STAGES[idx].id, day: Math.floor(S.time.day) };
  emit('region:rival', { region: REGION_MAP[id], by, stage: STAGES[idx].id });
  return S.world.regionRivals[id];
}

export function displaceCost(S, id) {
  const have = rivalIn(S, id);
  const r = REGION_MAP[id];
  if (!have || !r) return 0;
  return STAGES[STAGE_INDEX[have.stage]].cost(r, S) * BOARD.DISPLACE_COST_MULT;
}

export function canDisplace(S, id) {
  const have = rivalIn(S, id);
  if (!have) return { ok: false, reason: 'nobody', note: 'NOBODY THERE' };
  const st = regionState(S, id);
  const cost = displaceCost(S, id);
  const who = rivalName(S, id);
  if (st.stance < BOARD.DISPLACE_STANCE) {
    return { ok: false, reason: 'stance', cost, who,
             note: `NEEDS ${Math.round(BOARD.DISPLACE_STANCE * 100)}% STANDING` };
  }
  if (S.company.cash < cost) return { ok: false, reason: 'cash', cost, who, note: 'NOT ENOUGH CASH' };
  return { ok: true, cost, who };
}

export function displaceRival(S, id) {
  const check = canDisplace(S, id);
  if (!check.ok) return check;
  S.company.cash -= check.cost;
  const gone = S.world.regionRivals[id];
  delete S.world.regionRivals[id];
  S.world.regulatoryHeat = clamp(S.world.regulatoryHeat + BOARD.DISPLACE_HEAT, 0, 100);
  S.world.publicOpinion = clamp(S.world.publicOpinion + BOARD.DISPLACE_OPINION, 0, 1);
  markDirty();
  emit('region:displaced', { region: REGION_MAP[id], was: gone, who: check.who, cost: check.cost });
  return { ok: true, who: check.who, cost: check.cost };
}

// §B7. The same terms `stanceTarget` sums, itemised, so a region card can say
// which way it is drifting and what is pulling it. Pure — it is a render path.
// `stanceTarget` below is the sum of exactly these, in this order, so the card
// and the drift cannot disagree.
export function stanceDrivers(S, r, st) {
  const W = S.world;
  const pressure = clamp((W.globalGdpShare || 0) / BOARD.GDP_DRAG_REF, 0, 1);
  const dislike = 1 + pressure * BOARD.GDP_DISLIKE_SCALE;
  const rows = [];
  const add = (label, v, note) => { if (Math.abs(v) > 0.0005) rows.push({ label, v, note }); };
  if (r.likes.includes('reputation')) add('Your reputation', soften(S.resources.reputation, 900, 0.20),
    'They read the same press everybody else does.');
  if (r.likes.includes('opinion')) add('Public approval', (W.publicOpinion - 0.5) * 0.42,
    'What the public thinks of you here is what the government can afford to say.');
  if (r.likes.includes('alignment')) add('Alignment', (S.resources.alignment - 0.5) * 0.38,
    'They want to know the thing does what it was asked.');
  if (r.likes.includes('control')) add('Your leverage', clamp((W.controlPoints || 0) * 0.06, 0, 0.22),
    'Sovereign leverage reads as seriousness here rather than as a threat.');
  if (r.dislikes.includes('heat')) add('Regulatory heat', -(W.regulatoryHeat / 100) * 0.34 * r.regBase * dislike,
    'Scrutiny elsewhere is scrutiny here, and it costs more the larger you are.');
  if (r.dislikes.includes('opinion')) add('Public approval', -(W.publicOpinion - 0.5) * 0.18 * dislike,
    'Being popular abroad is not an argument here.');
  add('Your size', -pressure * BOARD.GDP_SOVEREIGNTY_DRAG * r.regBase,
    'Every bloc keeps a little sovereignty back on principle, in proportion to how regulated it is.');
  add('Somebody else is here', -rivalStageIndex(S, r.id) * BOARD.CONTEST_STANCE,
    'A rival in the room is a competing offer, and standing is relative.');
  add('Your presence', STAGE_INDEX[st.stage] * 0.05, 'Being here already makes you the incumbent.');
  if (S.research.done.sovereign_deals) add('Sovereign Deals', 0.06, 'The research that puts a lawyer in every capital.');
  if (S.research.done.regulatory_capture) add('Regulatory Capture', 0.05, 'You are in the room where it is drafted.');
  if (S.narrative.flags.wrote_framework) add('The framework you wrote', 0.08, 'They are using your words.');
  if (S.narrative.flags.dividend) add('The dividend', 0.06, 'You gave some of it back, and they noticed.');
  if (S.narrative.flags.opened_weights) add('Open weights', 0.05, 'Anybody can check. That buys a lot here.');
  if (S.narrative.flags.fought_regulation) add('You fought the rules', -0.09, 'They remember which side you took.');
  if (S.narrative.flags.suppressed_yuki) add('What you buried', -0.05, 'It did not stay buried.');
  const target = stanceTarget(S, r, st);
  return { base: r.baseStance, rows, target, stance: st.stance, gap: target - st.stance };
}

export function stanceTarget(S, r, st) {
  const W = S.world;
  let t = r.baseStance;
  if (r.likes.includes('reputation')) t += soften(S.resources.reputation, 900, 0.20);
  if (r.likes.includes('opinion')) t += (W.publicOpinion - 0.5) * 0.42;
  if (r.likes.includes('alignment')) t += (S.resources.alignment - 0.5) * 0.38;
  if (r.likes.includes('control')) t += clamp((W.controlPoints || 0) * 0.06, 0, 0.22);
  // §A10. What a bloc dislikes, it dislikes more the larger you get: these are
  // the same terms they always were, scaled by the share of world output you
  // already mediate. And every bloc keeps a little sovereignty back on
  // principle, in proportion to how regulated it is — the reason eight of
  // eight is not a shape this board should be able to make.
  const pressure = clamp((W.globalGdpShare || 0) / BOARD.GDP_DRAG_REF, 0, 1);
  const dislike = 1 + pressure * BOARD.GDP_DISLIKE_SCALE;
  if (r.dislikes.includes('heat')) t -= (W.regulatoryHeat / 100) * 0.34 * r.regBase * dislike;
  if (r.dislikes.includes('opinion')) t -= (W.publicOpinion - 0.5) * 0.18 * dislike;
  t -= pressure * BOARD.GDP_SOVEREIGNTY_DRAG * r.regBase;
  // Somebody else is already in the room, with an offer of their own.
  t -= rivalStageIndex(S, r.id) * BOARD.CONTEST_STANCE;
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
  // `controlRate` is Parallel Institutions: every control point gained counts more.
  if (e.control) S.world.controlPoints = (S.world.controlPoints || 0) + e.control * computeMods(S).controlRate;
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
  // §A10. From partnership up, a bloc runs on one supplier. Whoever is there
  // has to go first, and that is its own decision with its own bill.
  if (STAGE_INDEX[next.id] >= BOARD.EXCLUSIVE_FROM && rivalIn(S, id)) {
    return { ok: false, reason: 'rival', next, cost, who: rivalName(S, id) };
  }
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
  const gain = 0.06 + rand() * 0.05;   // the seeded stream, so a courted region replays
  st.stance = clamp(st.stance + gain, 0, 1);
  emit('region:courted', { region: r, gain });
  return { ok: true, gain };
}

// ── §A1 Upkeep ──────────────────────────────────────────────────────────────
// A presence in a bloc was a one-off payment and then a permanent bonus. It is
// staff, datacentres, lawyers and a government relations office now: every
// dollar you have put into a region bills `ECON.REGION_UPKEEP_DAILY` a day, for
// as long as you are there. `st.invested` already tracked the total and nothing
// read it. The bloc's own `upkeep` bonus — Latin America's −18% — applies here
// too, through `regionEffects().upkeepMult`, which is what that card promises.
//
// Pure: `expenseBreakdown` calls this and the Market view renders that.
export function regionUpkeep(S) {
  const regions = S.world?.regions;
  if (!regions) return 0;
  let total = 0;
  for (const r of REGIONS) {
    const st = regions[r.id];
    if (!st || !st.invested) continue;
    total += st.invested * ECON.REGION_UPKEEP_DAILY;
  }
  return total * regionEffects(S).upkeepMult;
}

// The rows behind that number, for the ledger's tooltip.
export function regionUpkeepRows(S) {
  const regions = S.world?.regions || {};
  const mult = regionEffects(S).upkeepMult;
  return REGIONS.map((r) => {
    const st = regions[r.id];
    if (!st?.invested) return null;
    return { id: r.id, name: r.name, stage: st.stage,
             daily: st.invested * ECON.REGION_UPKEEP_DAILY * mult };
  }).filter(Boolean).sort((a, b) => b.daily - a.daily);
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
