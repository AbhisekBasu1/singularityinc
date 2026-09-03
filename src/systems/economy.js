// ─────────────────────────────────────────────────────────────────────────────
// ECONOMY — burn, revenue, valuation, fundraising, runway.
// ─────────────────────────────────────────────────────────────────────────────
import { ECON, WORLD } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { totalMrr, totalUsers, totalArr, servingCostPerDay, grossMargin } from './product.js';
import { agentUpkeepTotal, specFx } from './agents.js';
import { projectUpkeep, mothballProject } from './projects.js';
import { regionUpkeep } from './regions.js';
import { researchRatePerDay } from './research.js';
import { doctrineBlocks } from './doctrines.js';
import { RESEARCH_MAP } from '../data/research.js';
import { clamp, soften } from '../engine/format.js';
import { rand, gaussian, chance } from '../engine/rng.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';
import { fireAgent } from './agents.js';

// What a discount stack is allowed to be worth. Molecular Manufacturing alone
// is ×0.05, and with Neural Compression, a Finance lane and two doctrines under
// it the whole operating bill went to a rounding error — which is how the last
// act stopped having an economy. See `ECON.OPCOST_FLOOR`.
export function operatingMultiplier(S, m = computeMods(S)) {
  return Math.max(ECON.OPCOST_FLOOR, m.opCost * specFx(S).opCost);
}

// The labs' own bill — §A1. A day of research is a day of somebody's cluster
// and somebody's salary, and the deeper the node the dearer the day. Research
// throughput saturates at `RESEARCH.MAX_RATE`, so this line is bounded by
// construction: it is 5-15% of revenue through Acts II-III and a rounding error
// by Act V, which is what R&D as a share of revenue does at that size.
export function researchSpendPerDay(S, m = computeMods(S)) {
  if (!S.research?.active && !(S.research?.queue || []).length) return 0;
  const lane = S._lanes?.research || 0;
  const rate = researchRatePerDay(S, lane, m);
  const node = RESEARCH_MAP[S.research.active];
  const tier = node?.tier || 1;
  return rate * ECON.RESEARCH_SPEND_PER_POINT * (1 + tier * ECON.RESEARCH_SPEND_TIER);
}

// §A17. Both dials are scale-relative — a fixed dollar slider is a decision for
// one act and a rounding error for the next four — so what they buy is measured
// against the bill they are topping up rather than against a constant.
export function infraEffect(S, base = 0) {
  const spend = S.company.infraSpend || 0;
  if (spend <= 0) return 0;
  const ref = Math.max(1, base) * ECON.INFRA_HALF_SHARE;
  return spend / (spend + ref);       // spend == the infra bill → half of the maximum
}
export function marketingAwareness(S, m = computeMods(S)) {
  const spend = S.company.marketingBudget || 0;
  if (spend <= 0) return 0;
  // Square-root returns: the second million buys less than the first.
  return ECON.MARKETING_AWARENESS * (m.adEfficiency || 1)
       * Math.sqrt(spend / ECON.MARKETING_REF_SPEND);
}
// The top of each slider, so neither is a decision for one act only.
export function marketingMax(S, m = computeMods(S)) {
  return Math.max(ECON.MARKETING_MIN_MAX, dailyRevenue(S, m).total * ECON.MARKETING_MAX_SHARE);
}
export function infraMax(S, m = computeMods(S)) {
  return Math.max(ECON.INFRA_MIN_MAX, dailyRevenue(S, m).total * ECON.INFRA_MAX_SHARE);
}

// What a capital commitment adds to the daily bill for ever, and whether the
// company can carry it. The megaproject cards print the first; the bots use
// both, because a bot that starts a build it cannot run is measuring its own
// ignorance rather than the game.
export function upkeepOf(capex, kind = 'project') {
  return capex * (kind === 'region' ? ECON.REGION_UPKEEP_DAILY : ECON.PROJECT_UPKEEP_DAILY);
}
export function canCarry(S, dailyAdd, headroom = ECON.UPKEEP_HEADROOM) {
  if (!(dailyAdd > 0)) return true;
  const net = dailyRevenue(S).total - expenseBreakdown(S).total;
  return net > dailyAdd * headroom;
}

export function expenseBreakdown(S, m = computeMods(S)) {
  const users = totalUsers(S);
  const personal = ECON.PERSONAL_BURN_PER_DAY * (1 + S.company.act * ECON.ACT_PERSONAL_BURN_RATE);
  // Finance agents on Operations trim the operating bill; the founder's own
  // burn and the interest on borrowed money are not theirs to trim.
  const opCost = operatingMultiplier(S, m);
  const hosting = (ECON.CLOUD_BASE_PER_DAY + (users / 1000) * ECON.CLOUD_PER_1K_USERS)
                * m.hostingCost * opCost;
  // §A5: the inference bill. Per category, per user, above the allowance the
  // flat hosting line already covers — and the reason a free consumer app needs
  // capital and price is a decision with a margin behind it.
  //
  // Outside `opCost`, like upkeep and for the same reason: this is cost of
  // goods sold, not overhead. It answers to `m.hostingCost` (Neural
  // Compression) and to the serving share of the compute split, which are the
  // two things that actually make an inference cheaper. Inside the whole
  // efficiency stack it was cut five- to sevenfold by Act IV — measured, from
  // $4.08 per user-month to $0.78 — and the gross margin the Product view
  // prints stopped meaning anything.
  const serving = servingCostPerDay(S, m);
  const agents = agentUpkeepTotal(S, m) * opCost;
  const compute = (S.resources.computeCap > 0
    ? Math.pow(S.resources.computeCap, ECON.COMPUTE_COST_POWER) * ECON.COMPUTE_COST_SCALE : 0)
    * m.computeCost * opCost;
  const energy = (S.resources.energyCap > 0
    ? Math.pow(S.resources.energyCap, ECON.ENERGY_COST_POWER) * ECON.ENERGY_COST_SCALE : 0)
    * m.energyCost;
  // §A1/§A11: what you have built and where you stand. Both were one-off
  // payments followed by a permanent free bonus; both are things the company
  // owns and has to keep running now.
  //
  // Deliberately outside `opCost`. That multiplier is operating *efficiency* —
  // Neural Compression, a Finance lane, Molecular Manufacturing — and what it
  // buys is a cheaper marginal bill: hosting, serving, compute, the compliance
  // that rides on them. A fusion plant costs what a fusion plant costs. With
  // upkeep inside it, a run holding Molecular Manufacturing paid 15% of the
  // capital charge on a trillion dollars of infrastructure, which is the same
  // "scarcity that evaporates in the last act" this whole pass exists to fix.
  const upkeep = projectUpkeep(S) + regionUpkeep(S);
  const research = researchSpendPerDay(S, m);
  // §A17. Two dials the founder sets; the emergency spiral turns both off.
  const marketing = S.company.marketingBudget || 0;
  const infra = (S.company.infraSpend || 0);
  const interest = (S.company.debtOwed || 0) * ECON.DEBT_INTEREST_DAILY;
  // Attention from the state is expensive: filings, counsel, audits, and the
  // people whose whole job is answering them.
  const compliance = (S.world.regulatoryHeat || 0) / 100 * WORLD.HEAT_COMPLIANCE
                   * (hosting + serving + agents + compute) * opCost;
  return { personal, hosting, serving, agents, compute, energy, upkeep, research,
           marketing, infra, interest, compliance,
           total: personal + hosting + serving + agents + compute + energy + upkeep
                + research + marketing + infra + interest + compliance };
}

export function dailyRevenue(S, m = computeMods(S)) {
  let rev = totalMrr(S) / 30;
  if (m['+physicalRevenue']) rev += S.resources.energyCap * ECON.PHYSICAL_REVENUE_PER_ENERGY;
  if (m.gdpRevenue) rev += S.world.globalGdpShare * WORLD.GDP_2027 / 360 * ECON.GDP_REVENUE_TAKE;
  // "Idle cash earns 14%/yr" is true of a treasury and false of a balance sheet
  // the size of a currency. The interest-bearing base saturates: past
  // `INTEREST_CASH_SATURATION` the money is not idle, it is deployed — into the
  // projects and blocs that now carry upkeep. Without the ceiling this was a
  // money printer with a five-year doubling time on top of a 90%-margin
  // business, and measured it was paying $2.8B a day by Act V, which is more
  // than the company earned from its customers.
  const idle = Math.max(0, S.company.cash);
  const base = idle / (1 + idle / ECON.INTEREST_CASH_SATURATION);
  const interest = base * (m['+interest'] || 0) / 360;
  return { revenue: rev, interest, total: rev + interest };
}

export function burnPerDay(S, m = computeMods(S)) {
  const e = expenseBreakdown(S, m);
  const r = dailyRevenue(S, m);
  return e.total - r.total;
}

// Pushing a term sheet for better terms. The odds are printed on the button
// and rolled on the seeded stream — `dialogs.js` used to flip `Math.random`.
export function negotiateOdds(S) {
  return clamp(ECON.NEGOTIATE_BASE + (S.founder.skills.sales || 0) * ECON.NEGOTIATE_PER_SALES, 0, 0.95);
}

export function runwayDays(S) {
  const b = burnPerDay(S);
  if (b <= 0) return Infinity;
  return S.company.cash / b;
}

// ── The valuation, decomposed — §B1 ─────────────────────────────────────────
// Nine multiplicative terms, a saturation curve, a story floor, two strategic
// assets and a ceiling — and until this existed the number was announced and
// never explained. `computeValuation` reduces over exactly these values in
// exactly this order, so the "why" panel cannot drift from the sim: there is
// one arithmetic here and the panel reads it rather than repeating it.
//
// Pure. It is called from `render(S)` on the Market view.
export function valuationTerms(S, m = computeMods(S)) {
  const growth = S.company.growthRate30 ?? 0;   // fractional monthly growth
  const gm = grossMargin(S, m);
  return {
    arr: totalArr(S),
    users: totalUsers(S),
    growthRate: growth,
    margin: gm,
    base: ECON.VALUATION_ARR_MULT_BASE,
    growth: 1 + clamp(growth, ECON.GROWTH_MULT_FLOOR, ECON.GROWTH_MULT_CAP)
      * ECON.GROWTH_MULT_RATE,                                       // growth premium
    hype: ECON.HYPE_MULT_BASE + S.market.hype * ECON.HYPE_MULT_RATE,  // market mood
    macro: { boom: ECON.MACRO_BOOM_MULT, neutral: 1.0,
      tightening: ECON.MACRO_TIGHT_MULT, crash: ECON.MACRO_CRASH_MULT }[S.market.macro] || 1,
    mods: m.valuationMult,
    reputation: 1 + soften(S.resources.reputation, ECON.REP_MULT_SCALE, ECON.REP_MULT_CAP),
    research: 1 + Object.keys(S.research.done).length * ECON.RESEARCH_MULT_PER_NODE,
    // §A5: what the revenue costs to earn. A company serving its users at a 40%
    // margin is not worth what one at 90% is, and until serving cost existed
    // there was no margin to read. Pre-revenue companies are valued on the
    // story floor below and skip this entirely.
    marginMult: gm == null ? null
      : clamp(1 + (gm - ECON.MARGIN_REF) * ECON.MARGIN_VALUATION_RATE,
        ECON.MARGIN_MULT_MIN, ECON.MARGIN_MULT_MAX),
    // Standing. The World view states that approval lifts valuation and heat
    // suppresses it; until this line existed, neither was true of any number.
    standing: clamp(1
      + ((S.world.publicOpinion ?? 0.5) - 0.5) * 2 * WORLD.OPINION_VALUATION
      - ((S.world.regulatoryHeat || 0) / 100) * WORLD.HEAT_VALUATION,
    ECON.STANDING_MULT_MIN, ECON.STANDING_MULT_MAX),
    // Pre-revenue companies are valued on users + story + team.
    story: totalUsers(S) * ECON.STORY_USER_VALUE * (ECON.STORY_HYPE_BASE + S.market.hype)
      + S.resources.reputation * ECON.STORY_REP_VALUE
      + S.agents.length * ECON.STORY_AGENT_VALUE
        * (S.company.act >= 2 ? 1 : ECON.STORY_EARLY_AGENT_SHARE),
    // Strategic assets — sub-linear so late-game compounding cannot run away.
    computeAsset: Math.pow(Math.max(0, S.resources.computeCap || 0), ECON.COMPUTE_ASSET_POWER)
      * ECON.COMPUTE_ASSET_VALUE,
    gdpAsset: (S.world.globalGdpShare || 0) * WORLD.GDP_2027 * ECON.GDP_ASSET_MULT,
    // Nothing can be worth an unbounded multiple of the economy it lives in.
    // The same curve `loop.js` saturates revenue against — one constant, not
    // three copies of it that drift the first time somebody retunes the world.
    ceiling: WORLD.GDP_2027 * Math.pow(1 + WORLD.GDP_GROWTH, S.time.day / 360)
      * ECON.VALUATION_GDP_CEILING,
  };
}

// Multiples do not stack forever; the market has an upper bound on optimism.
function saturateMult(mult) {
  return ECON.VALUATION_MULT_MIN + (ECON.VALUATION_MULT_CAP - ECON.VALUATION_MULT_MIN)
       * (1 - Math.exp(-(mult - ECON.VALUATION_MULT_MIN) / ECON.MULT_SATURATION_SCALE));
}

export function computeValuation(S, m = computeMods(S), t = valuationTerms(S, m)) {
  let mult = t.base;
  mult *= t.growth;
  mult *= t.hype;
  mult *= t.macro;
  mult *= t.mods;
  mult *= t.reputation;
  mult *= t.research;
  if (t.marginMult != null) mult *= t.marginMult;
  mult *= t.standing;
  mult = saturateMult(mult);

  let v = t.arr * mult;
  v = Math.max(v, t.story);
  v += t.computeAsset;
  v += t.gdpAsset;
  v = v / (1 + v / t.ceiling) * (1 + ECON.VALUATION_SATURATION_HEADROOM);
  return Math.max(0, v);
}

// The rows the Market view prints, in `explainProduct`'s shape: a label, a
// value, a note that goes in the tooltip, and a kind that decides how the
// number is drawn. `mult` rows are multiplicative; the rest say so.
export function explainValuation(S, m = computeMods(S)) {
  const t = valuationTerms(S, m);
  let raw = t.base;
  for (const k of ['growth', 'hype', 'macro', 'mods', 'reputation', 'research']) raw *= t[k];
  if (t.marginMult != null) raw *= t.marginMult;
  raw *= t.standing;
  const mult = saturateMult(raw);
  const v = computeValuation(S, m, t);
  const preCeiling = Math.max(t.arr * mult, t.story) + t.computeAsset + t.gdpAsset;
  const nodes = Object.keys(S.research.done).length;
  const rows = [
    ['Revenue multiple', t.base, 'What a dollar of annual run-rate is worth before anything about you.', 'raw'],
    ['Growth premium', t.growth, `30-day growth of ${(t.growthRate * 100).toFixed(1)}%/mo. Investors buy the derivative.`],
    ['Market mood', t.hype, `Sector hype at ${(S.market.hype * 100).toFixed(0)}%.`],
    ['Macro', t.macro, `The market is <b>${esc0(S.market.macro || 'neutral')}</b>. Nothing you did.`],
    ['Research & projects', t.mods, 'Every multiplier the tree, the doctrines and the megaprojects put on the multiple.'],
    ['Reputation', t.reputation, `Social capital, softened: ${Math.round(S.resources.reputation)} points.`],
    ['Depth of research', t.research, `${nodes} node${nodes === 1 ? '' : 's'} completed.`],
    ...(t.marginMult == null ? []
      : [['Gross margin', t.marginMult, `You serve at ${(t.margin * 100).toFixed(0)}%. The reference is ${(ECON.MARGIN_REF * 100).toFixed(0)}%: below it the multiple is cut, above it lifted.`]]),
    ['Standing', t.standing, `Approval ${Math.round((S.world.publicOpinion ?? 0.5) * 100)}% lifts it; heat ${Math.round(S.world.regulatoryHeat || 0)} suppresses it.`],
    // Not a cap: a remap. The stacked multiple is bent onto a curve that starts
    // at ×3 and saturates at ×58, so a modest stack comes out *higher* and a
    // towering one comes out barely higher than the one below it. Printing it
    // as "what the ceiling takes off" was a lie in Act II, where it gives.
    ['Market\u2019s own curve', mult / Math.max(1e-9, raw),
      `Your terms stack to <b>${raw.toFixed(1)}×</b>. The market maps that onto a curve from ${ECON.VALUATION_MULT_MIN}× to ${ECON.VALUATION_MULT_CAP}×, which is generous at the bottom and nearly flat at the top — this is what the curve does to your number.`],
    ['Applied multiple', mult, `× ${moneyish(t.arr)} of annual run-rate.`, 'raw'],
  ];
  const floors = [
    ['On the run-rate', t.arr * mult, 'Revenue times the multiple above.', 'money'],
    ['Story floor', t.story, 'Users, reputation and the team — what a pre-revenue company is worth. The valuation is never less than this.', 'money'],
    ['Compute held', t.computeAsset, 'Dedicated capacity is an asset, valued sub-linearly so late compounding cannot run away.', 'money'],
    ['GDP mediated', t.gdpAsset, 'Economic activity flowing through systems you own.', 'money'],
    ['World-economy curve', v / Math.max(1, preCeiling),
      `Nothing is worth an unbounded multiple of the economy it lives in, so the whole figure is bent toward <b>${moneyish(t.ceiling)}</b> — today's ceiling — with a fixed ${(ECON.VALUATION_SATURATION_HEADROOM * 100).toFixed(0)}% of headroom on top. Far below the ceiling that headroom is all you see; close to it, the curve is all you see.`],
  ];
  return { total: v, mult, raw, rows, floors, terms: t };
}
function moneyish(n) { return '$' + Math.round(n).toLocaleString(); }
function esc0(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }


export function tickEconomy(S, days, m = computeMods(S)) {
  const e = expenseBreakdown(S, m);
  const r = dailyRevenue(S, m);
  const net = (r.total - e.total) * days;
  S.company.cash += net;
  S.company.revenueToday = r.total;
  S.company.expensesToday = e.total;
  S.stats.totalRevenue += r.total * days;
  if (net > 0) S.stats.totalCash += net;
  for (const p of S.products) if (p.launched) p.totalRevenue += (p.mrr / 30) * days;
  return { e, r, net };
}

// ── Fundraising ─────────────────────────────────────────────────────────────
export const ROUND_TYPES = [
  { id: 'preseed', name: 'Pre-Seed', minVal: ECON.ROUND_PRESEED_MIN,
    target: ECON.ROUND_PRESEED_TARGET, sizeFrac: ECON.ROUND_PRESEED_SIZE,
    desc: 'Angels and a friend who did well in crypto.' },
  { id: 'seed', name: 'Seed', minVal: ECON.ROUND_SEED_MIN,
    target: ECON.ROUND_SEED_TARGET, sizeFrac: ECON.ROUND_SEED_SIZE,
    desc: 'A real fund. A real term sheet. A real board observer.' },
  { id: 'a', name: 'Series A', minVal: ECON.ROUND_A_MIN,
    target: ECON.ROUND_A_TARGET, sizeFrac: ECON.ROUND_A_SIZE,
    desc: 'The round that decides whether you are a company or a project.' },
  { id: 'b', name: 'Series B', minVal: ECON.ROUND_B_MIN,
    target: ECON.ROUND_B_TARGET, sizeFrac: ECON.ROUND_B_SIZE,
    desc: 'Growth capital. They want a plan, not a dream.' },
  { id: 'c', name: 'Series C', minVal: ECON.ROUND_C_MIN,
    target: ECON.ROUND_C_TARGET, sizeFrac: ECON.ROUND_C_SIZE,
    desc: 'Crossover funds. Someone mentions "the public markets."' },
  { id: 'd', name: 'Series D+', minVal: ECON.ROUND_D_MIN,
    target: ECON.ROUND_D_TARGET, sizeFrac: ECON.ROUND_D_SIZE,
    desc: 'Sovereign wealth. The money has no face.' },
  { id: 'mega', name: 'Strategic Round', minVal: ECON.ROUND_MEGA_MIN,
    target: ECON.ROUND_MEGA_TARGET, sizeFrac: ECON.ROUND_MEGA_SIZE,
    desc: 'Nations, not funds. The terms include things that are not money.' },
];

// §A20: a doctrine that closes a door. Frugal Empire is every dollar in the
// company coming from somebody who chose to pay for it, so while it is held
// there is no term sheet to look at — and the panel says so, and offers to give
// the doctrine up, rather than letting a founder raise and then wonder why the
// bonus quietly vanished four months later.
export function roundBlocked(S) { return doctrineBlocks(S, 'raise'); }

// §H15. A board member sitting in the relay's board seat may refuse the next
// round. It is a different refusal from a doctrine's — there is nothing to
// give up, only a quarter to wait — so it has its own door rather than
// pretending to be a doctrine the founder could forfeit.
export function roundRefusedByBoard(S) {
  const until = S?.company?.boardRefusedUntil ?? -1;
  const day = S?.time?.day ?? 0;
  return until > day ? { until, days: Math.max(1, Math.ceil(until - day)) } : null;
}

export function availableRounds(S) {
  if (roundBlocked(S) || roundRefusedByBoard(S)) return [];
  const v = computeValuation(S);
  const done = new Set(S.company.rounds.map((r) => r.type));
  return ROUND_TYPES.filter((t) => v >= t.minVal && !done.has(t.id));
}

export function raiseOffer(S, roundType, m = computeMods(S)) {
  const v = computeValuation(S) * m.raiseValuation;
  const hypeAdj = ECON.RAISE_HYPE_BASE + S.market.hype * ECON.RAISE_HYPE_RATE;
  const macroAdj = { boom: ECON.RAISE_BOOM_MULT, neutral: 1,
    tightening: ECON.RAISE_TIGHT_MULT, crash: ECON.RAISE_CRASH_MULT }[S.market.macro] || 1;
  const repAdj = 1 + soften(S.resources.reputation, ECON.RAISE_REP_SCALE, ECON.RAISE_REP_CAP);
  // Investors read the news too. A company under investigation raises worse.
  const heatAdj = 1 - ((S.world.regulatoryHeat || 0) / 100) * WORLD.HEAT_RAISE_DRAG;
  const pre = v * hypeAdj * macroAdj * repAdj * clamp(heatAdj, ECON.RAISE_HEAT_MIN, 1)
    * (ECON.RAISE_ROLL_FLOOR + rand() * ECON.RAISE_ROLL_RANGE);
  const amount = pre * roundType.sizeFrac / (1 - roundType.sizeFrac);
  const post = pre + amount;
  // Whenever there is a company to price, `amount / post` *is* `sizeFrac` —
  // the algebra above cancels to it. At a valuation of nothing it is 0/0, and
  // a `NaN` dilution would be written straight onto the cap table by
  // `acceptRound`. `availableRounds` gates on `minVal` and so a played run
  // never reaches this, but a tool, a forecast or a test may price a round on
  // a company worth zero, so the continuous answer is stated rather than
  // divided for.
  const dilution = post > 0 ? amount / post : roundType.sizeFrac;
  return { pre, post, amount, dilution, type: roundType };
}

export function acceptRound(S, offer, terms = {}) {
  const dilution = offer.dilution * (terms.dilutionMult ?? 1);
  S.company.cash += offer.amount;
  S.company.raisedTotal += offer.amount;
  S.company.equity.founder *= (1 - dilution);
  S.company.equity.investors += dilution;
  S.company.rounds.push({
    type: offer.type.id, name: offer.type.name, amount: offer.amount,
    valuation: offer.post, day: S.time.day, dilution, terms,
  });
  S.stats.roundsRaised++;
  S.stats.lastRaiseDay = Math.floor(S.time.day);   // the phone reacts to a round for a few weeks
  emit('round:raised', { offer, terms });
  return offer;
}

// Going negative is a spiral, not a cliff: the company starts cannibalising
// itself, and there is a window in which you can still pull out.
export function bankruptcyFloor(S) {
  return -Math.max(ECON.BANKRUPTCY_CASH_FLOOR,
    (S.company.valuation || 0) * ECON.BANKRUPTCY_VALUATION_SHARE);
}

export function tickEmergency(S, days) {
  if (S.company.cash >= 0) { S.company.emergencyDays = 0; return null; }
  S.company.emergencyDays = (S.company.emergencyDays || 0) + days;
  const acts = [];
  // Discretionary spend stops immediately.
  if (S.company.marketingBudget) { S.company.marketingBudget = 0; acts.push('marketing halted'); }
  if (S.company.infraSpend) { S.company.infraSpend = 0; acts.push('infra spend frozen'); }
  // Reputation bleeds — vendors talk.
  S.resources.reputation = Math.max(0, S.resources.reputation - ECON.EMERGENCY_REP_LOSS * days);
  // After a week, agents start being spun down automatically — but never while
  // you are away. Offline catch-up runs hundreds of these rolls in a second,
  // and coming back to an empty roster you had no chance to prevent is a
  // punishment for closing a tab, not for running out of money.
  if (!S._offline && S.company.emergencyDays > ECON.EMERGENCY_AGENT_DAY
      && S.agents.length > 0 && chance(ECON.EMERGENCY_AGENT_CHANCE * days)) {
    const a = S.agents[S.agents.length - 1];
    acts.push(`${a.name} spun down`);
    // Through `fireAgent`, not a bare pop: it is the only thing that writes the
    // tombstone, and half the ways to lose an agent used to leave the archive
    // with nothing in it. Already inside the `!S._offline` guard, so a closed
    // tab does not fill the archive while nobody is looking.
    fireAgent(S, a.id, 'spun_down');
  }
  // Halt any in-flight megaproject. Same rule: not while you are gone.
  if (!S._offline && S.world.projectQueue?.length
      && S.company.emergencyDays > ECON.EMERGENCY_PROJECT_DAY) {
    S.world.projectQueue.pop();
    acts.push('a megaproject was abandoned');
  }
  // §A1 made the spiral survivable rather than a cliff. Once upkeep is a real
  // line, a company that cannot pay it has to be able to *stop* paying it —
  // otherwise going negative in Act IV is a death sentence written three
  // hundred days earlier, and the emergency is not a window you can climb out
  // of. Mothballing sheds the dearest thing you own: its upkeep goes and so
  // does everything it was giving you.
  if (!S._offline && S.company.emergencyDays > ECON.EMERGENCY_MOTHBALL_DAY
      && chance(ECON.EMERGENCY_MOTHBALL_CHANCE * days)) {
    const shed = mothballProject(S);
    if (shed) acts.push(`${shed.name} was mothballed`);
  }
  return { days: S.company.emergencyDays, acts };
}

export function founderNetWorth(S) {
  return computeValuation(S) * S.company.equity.founder;
}
