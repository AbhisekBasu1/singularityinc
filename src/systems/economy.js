// ─────────────────────────────────────────────────────────────────────────────
// ECONOMY — burn, revenue, valuation, fundraising, runway.
// ─────────────────────────────────────────────────────────────────────────────
import { ECON, WORLD } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { totalMrr, totalUsers, totalArr } from './product.js';
import { agentUpkeepTotal } from './agents.js';
import { clamp, soften } from '../engine/format.js';
import { rand, gaussian, chance } from '../engine/rng.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';

export function expenseBreakdown(S, m = computeMods(S)) {
  const users = totalUsers(S);
  const personal = ECON.PERSONAL_BURN_PER_DAY * (1 + S.company.act * 0.12);
  const hosting = (ECON.CLOUD_BASE_PER_DAY + (users / 1000) * ECON.CLOUD_PER_1K_USERS)
                * m.hostingCost * m.opCost;
  const agents = agentUpkeepTotal(S, m) * m.opCost;
  const compute = (S.resources.computeCap > 0 ? Math.pow(S.resources.computeCap, 0.86) * 0.16 : 0) * m.computeCost * m.opCost;
  const energy = (S.resources.energyCap > 0 ? Math.pow(S.resources.energyCap, 0.9) * 0.02 : 0) * m.energyCost;
  const marketing = S.company.marketingBudget || 0;
  const infra = (S.company.infraSpend || 0);
  const interest = (S.company.debtOwed || 0) * 0.00035;
  // Attention from the state is expensive: filings, counsel, audits, and the
  // people whose whole job is answering them.
  const compliance = (S.world.regulatoryHeat || 0) / 100 * WORLD.HEAT_COMPLIANCE
                   * (hosting + agents + compute) * m.opCost;
  return { personal, hosting, agents, compute, energy, marketing, infra, interest, compliance,
           total: personal + hosting + agents + compute + energy + marketing + infra + interest + compliance };
}

export function dailyRevenue(S, m = computeMods(S)) {
  let rev = totalMrr(S) / 30;
  if (m['+physicalRevenue']) rev += S.resources.energyCap * 0.4;
  if (m.gdpRevenue) rev += S.world.globalGdpShare * 1.18e14 / 360 * 0.05;
  const interest = Math.max(0, S.company.cash) * (m['+interest'] || 0) / 360;
  return { revenue: rev, interest, total: rev + interest };
}

export function burnPerDay(S, m = computeMods(S)) {
  const e = expenseBreakdown(S, m);
  const r = dailyRevenue(S, m);
  return e.total - r.total;
}

export function runwayDays(S) {
  const b = burnPerDay(S);
  if (b <= 0) return Infinity;
  return S.company.cash / b;
}

export function computeValuation(S, m = computeMods(S)) {
  const arr = totalArr(S);
  const users = totalUsers(S);
  const growth = S.company.growthRate30 ?? 0;   // fractional monthly growth
  let mult = ECON.VALUATION_ARR_MULT_BASE;
  mult *= 1 + clamp(growth, -0.5, 2.5) * 1.6;              // growth premium
  mult *= 0.7 + S.market.hype * 0.9;                       // market mood
  mult *= { boom: 1.45, neutral: 1.0, tightening: 0.75, crash: 0.45 }[S.market.macro] || 1;
  mult *= m.valuationMult;
  mult *= 1 + soften(S.resources.reputation, 900, 0.6);
  mult *= 1 + Object.keys(S.research.done).length * 0.011;
  // Standing. The World view states that approval lifts valuation and heat
  // suppresses it; until this line existed, neither was true of any number.
  const standing = 1
    + ((S.world.publicOpinion ?? 0.5) - 0.5) * 2 * WORLD.OPINION_VALUATION
    - ((S.world.regulatoryHeat || 0) / 100) * WORLD.HEAT_VALUATION;
  mult *= clamp(standing, 0.55, 1.45);
  // Multiples do not stack forever; the market has an upper bound on optimism.
  mult = ECON.VALUATION_MULT_MIN + (ECON.VALUATION_MULT_CAP - ECON.VALUATION_MULT_MIN)
       * (1 - Math.exp(-(mult - ECON.VALUATION_MULT_MIN) / 34));

  let v = arr * mult;
  // Pre-revenue companies are valued on users + story + team
  const story = users * 14 * (0.5 + S.market.hype)
              + S.resources.reputation * 900
              + S.agents.length * 60000 * (S.company.act >= 2 ? 1 : 0.35);
  v = Math.max(v, story);
  // Strategic assets — sub-linear so late-game compounding cannot run away.
  v += Math.pow(Math.max(0, S.resources.computeCap || 0), 0.78) * 9000;
  v += (S.world.globalGdpShare || 0) * 1.18e14 * 1.4;
  // Nothing can be worth an unbounded multiple of the economy it lives in.
  const gdp = 1.18e14 * Math.pow(1.028, S.time.day / 360);
  const ceiling = gdp * ECON.VALUATION_GDP_CEILING;
  v = v / (1 + v / ceiling) * (1 + 0.35);
  return Math.max(0, v);
}

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
  { id: 'preseed', name: 'Pre-Seed', minVal: 0, target: 0.10, sizeFrac: 0.14,
    desc: 'Angels and a friend who did well in crypto.' },
  { id: 'seed', name: 'Seed', minVal: 1.5e6, target: 0.16, sizeFrac: 0.18,
    desc: 'A real fund. A real term sheet. A real board observer.' },
  { id: 'a', name: 'Series A', minVal: 12e6, target: 0.20, sizeFrac: 0.20,
    desc: 'The round that decides whether you are a company or a project.' },
  { id: 'b', name: 'Series B', minVal: 70e6, target: 0.17, sizeFrac: 0.17,
    desc: 'Growth capital. They want a plan, not a dream.' },
  { id: 'c', name: 'Series C', minVal: 400e6, target: 0.13, sizeFrac: 0.13,
    desc: 'Crossover funds. Someone mentions "the public markets."' },
  { id: 'd', name: 'Series D+', minVal: 2e9, target: 0.09, sizeFrac: 0.09,
    desc: 'Sovereign wealth. The money has no face.' },
  { id: 'mega', name: 'Strategic Round', minVal: 25e9, target: 0.05, sizeFrac: 0.05,
    desc: 'Nations, not funds. The terms include things that are not money.' },
];

export function availableRounds(S) {
  const v = computeValuation(S);
  const done = new Set(S.company.rounds.map((r) => r.type));
  return ROUND_TYPES.filter((t) => v >= t.minVal && !done.has(t.id));
}

export function raiseOffer(S, roundType, m = computeMods(S)) {
  const v = computeValuation(S) * m.raiseValuation;
  const hypeAdj = 0.75 + S.market.hype * 0.6;
  const macroAdj = { boom: 1.3, neutral: 1, tightening: 0.72, crash: 0.42 }[S.market.macro] || 1;
  const repAdj = 1 + soften(S.resources.reputation, 700, 0.5);
  // Investors read the news too. A company under investigation raises worse.
  const heatAdj = 1 - ((S.world.regulatoryHeat || 0) / 100) * WORLD.HEAT_RAISE_DRAG;
  const pre = v * hypeAdj * macroAdj * repAdj * clamp(heatAdj, 0.55, 1) * (0.85 + rand() * 0.35);
  const amount = pre * roundType.sizeFrac / (1 - roundType.sizeFrac);
  const post = pre + amount;
  const dilution = amount / post;
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
  emit('round:raised', { offer, terms });
  return offer;
}

// Going negative is a spiral, not a cliff: the company starts cannibalising
// itself, and there is a window in which you can still pull out.
export function bankruptcyFloor(S) {
  return -Math.max(50000, (S.company.valuation || 0) * 0.0025);
}

export function tickEmergency(S, days) {
  if (S.company.cash >= 0) { S.company.emergencyDays = 0; return null; }
  S.company.emergencyDays = (S.company.emergencyDays || 0) + days;
  const acts = [];
  // Discretionary spend stops immediately.
  if (S.company.marketingBudget) { S.company.marketingBudget = 0; acts.push('marketing halted'); }
  if (S.company.infraSpend) { S.company.infraSpend = 0; acts.push('infra spend frozen'); }
  // Reputation bleeds — vendors talk.
  S.resources.reputation = Math.max(0, S.resources.reputation - 2.2 * days);
  // After a week, agents start being spun down automatically — but never while
  // you are away. Offline catch-up runs hundreds of these rolls in a second,
  // and coming back to an empty roster you had no chance to prevent is a
  // punishment for closing a tab, not for running out of money.
  if (!S._offline && S.company.emergencyDays > 7 && S.agents.length > 0 && chance(0.11 * days)) {
    const a = S.agents[S.agents.length - 1];
    acts.push(`${a.name} spun down`);
    S.agents.pop();
    markDirty();
  }
  // Halt any in-flight megaproject. Same rule: not while you are gone.
  if (!S._offline && S.world.projectQueue?.length && S.company.emergencyDays > 14) {
    S.world.projectQueue.pop();
    acts.push('a megaproject was abandoned');
  }
  return { days: S.company.emergencyDays, acts };
}

export function founderNetWorth(S) {
  return computeValuation(S) * S.company.equity.founder;
}
