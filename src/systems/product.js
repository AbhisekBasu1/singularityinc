// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT — features, quality, users, revenue. The growth engine.
// ─────────────────────────────────────────────────────────────────────────────
import { CATEGORY_MAP, PRICING_MODELS, FEATURE_KINDS } from '../data/products.js';
import { PRODUCT, ECON } from '../data/balance.js';
import { computeMods, markDirty } from './modifiers.js';
import { weightedPick, pick, rand, chance, gaussian } from '../engine/rng.js';
import { clamp, soften } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { siegeMods } from './nemesis.js';

let productSeq = 1;

export function createProduct(S, { name, category }) {
  const cat = CATEGORY_MAP[category] || CATEGORY_MAP.devtools;
  const p = {
    id: 'p' + productSeq++,
    name,
    category: cat.id,
    createdDay: S.time.day,
    launched: false,
    launchDay: null,
    features: [],
    devProgress: 0,
    quality: PRODUCT.START_QUALITY,
    polish: PRODUCT.START_POLISH,
    appeal: PRODUCT.START_APPEAL,
    reliability: PRODUCT.START_RELIABILITY,
    price: cat.basePrice,
    pricing: 'sub',
    users: 0,
    payingUsers: 0,
    awareness: 0,
    mrr: 0,
    churnMonthly: cat.baseChurn,
    viralK: 0,
    momentum: 0,       // decaying launch/viral boost
    sentiment: PRODUCT.START_SENTIMENT,
    peakUsers: 0,
    totalRevenue: 0,
    sunset: false,
  };
  S.products.push(p);
  if (!S.activeProductId) S.activeProductId = p.id;
  emit('product:created', { product: p });
  return p;
}

export function featureCost(S, p) {
  const m = computeMods(S);
  const n = p.features.length;
  return PRODUCT.FEATURE_CODE_BASE * Math.pow(PRODUCT.FEATURE_CODE_GROWTH, n) * m.featureCost;
}

function nameFeature(kind, p) {
  const cat = CATEGORY_MAP[p.category];
  const used = new Set(p.features.map((f) => f.name));
  // Prefer a name this product has not shipped before; version it only if we must.
  const fresh = kind.names.filter((n) => !used.has(n.replace('%C%', cat.name.split(' ')[0])));
  let raw = fresh.length ? pick(fresh) : pick(kind.names);
  let name = raw.replace('%C%', cat.name.split(' ')[0]);
  if (used.has(name)) {
    let v = 2;
    while (used.has(`${name} v${v}`)) v++;
    name = `${name} v${v}`;
  }
  return name;
}

export function shipFeature(S, p, opts = {}) {
  const m = computeMods(S);
  const kind = opts.kind || weightedPick(FEATURE_KINDS, (k) => k.weight);
  const cat = CATEGORY_MAP[p.category];

  // Insight raises the odds you built the right thing.
  const insightRatio = clamp(S.resources.insight
    / (PRODUCT.INSIGHT_BASE_COST + p.features.length * PRODUCT.INSIGHT_COST_PER_FEATURE),
  0, PRODUCT.INSIGHT_RATIO_CAP);
  // Example-driven prompting banks "fit credit" that is spent on the next ship.
  const credit = Math.min(PRODUCT.FIT_CREDIT_CAP, S.founder.fitCredit || 0);
  S.founder.fitCredit = Math.max(0, (S.founder.fitCredit || 0) - credit);
  const fit = clamp(PRODUCT.FIT_BASE + insightRatio * PRODUCT.FIT_INSIGHT_RATE + credit
    + gaussian(0, PRODUCT.FIT_NOISE_SD), PRODUCT.FIT_MIN, PRODUCT.FIT_MAX);
  const debtPenalty = 1 - clamp(S.resources.techDebt / PRODUCT.DEBT_PENALTY_SCALE,
    0, PRODUCT.DEBT_QUALITY_PENALTY);
  const mult = fit * debtPenalty * (opts.mult || 1);

  const f = {
    id: 'f' + (p.features.length + 1),
    name: opts.name || nameFeature(kind, p),
    kind: kind.id,
    day: S.time.day,
    fit,
    q: kind.q * mult * cat.qualityWeight,
    a: kind.a * mult,
    p: kind.p * mult,
    r: kind.r * mult,
  };
  // Diminishing returns keep the meters meaningful across 150+ features.
  p.features.push(f);
  p.quality += f.q / (1 + p.quality * PRODUCT.QUALITY_DIMINISH);
  p.appeal += f.a / (1 + p.appeal * PRODUCT.APPEAL_DIMINISH);
  p.polish += f.p / (1 + p.polish * PRODUCT.POLISH_DIMINISH);
  p.reliability = clamp(p.reliability + f.r, PRODUCT.RELIABILITY_MIN, PRODUCT.RELIABILITY_MAX);
  p.devProgress = 0;
  S.stats.featuresShipped++;
  S.stats.lastShipDay = S.time.day;
  S.stats.bestQuality = Math.max(S.stats.bestQuality, p.quality);

  // Shipping creates momentum: a short burst of attention.
  const burst = PRODUCT.SHIP_MOMENTUM_BASE + fit * PRODUCT.SHIP_MOMENTUM_FIT;
  p.momentum += burst;
  S.resources.insight = Math.max(0, S.resources.insight - PRODUCT.SHIP_INSIGHT_BASE
    - p.features.length * PRODUCT.SHIP_INSIGHT_PER_FEATURE);

  emit('feature:shipped', { product: p, feature: f, fit });
  return f;
}

export function launchProduct(S, p) {
  const m = computeMods(S);
  p.launched = true;
  p.launchDay = S.time.day;
  S.stats.productsLaunched++;

  // Launch strength: quality × polish × reputation × hype × research
  const rep = 1 + soften(S.resources.reputation, PRODUCT.LAUNCH_REP_SCALE, PRODUCT.LAUNCH_REP_CAP);
  const hype = PRODUCT.LAUNCH_HYPE_BASE + S.market.hype * PRODUCT.LAUNCH_HYPE_RATE;
  const pf = portfolioEffects(S);
  const strength = (PRODUCT.LAUNCH_QUALITY_BASE + p.quality)
    * (PRODUCT.LAUNCH_POLISH_BASE + p.polish * PRODUCT.LAUNCH_POLISH_RATE)
    * rep * hype * m.launchPower * pf.launchBoost;
  const roll = PRODUCT.LAUNCH_ROLL_FLOOR + rand() * PRODUCT.LAUNCH_ROLL_RANGE;
  const score = strength * roll;

  const cat = CATEGORY_MAP[p.category];
  const seed = Math.floor(score * PRODUCT.LAUNCH_SEED_SCALE
    * (PRODUCT.LAUNCH_CATEGORY_BASE + cat.hypeSensitivity * PRODUCT.LAUNCH_CATEGORY_RATE));
  p.awareness += score * PRODUCT.LAUNCH_AWARENESS_SCALE;
  p.users += seed;
  p.momentum += score * PRODUCT.LAUNCH_MOMENTUM_SCALE;
  S.resources.reputation += score * PRODUCT.LAUNCH_REP_GAIN;

  const tier = score > PRODUCT.LAUNCH_LEGENDARY_SCORE ? 'legendary'
    : score > PRODUCT.LAUNCH_GREAT_SCORE ? 'great'
    : score > PRODUCT.LAUNCH_GOOD_SCORE ? 'good'
    : score > PRODUCT.LAUNCH_OKAY_SCORE ? 'okay' : 'flop';
  if (tier === 'legendary' || tier === 'great') S.stats.viralHits++;

  emit('product:launched', { product: p, score, tier, seed });
  return { score, tier, seed };
}

// ── Daily simulation ────────────────────────────────────────────────────────
// Growth is modelled as a logistic compounding rate plus an awareness-driven
// seed flow, so a product can start from zero and still go exponential.
export function tickProduct(S, p, days, m = computeMods(S)) {
  if (!p.launched || p.sunset) return;
  const cat = CATEGORY_MAP[p.category];
  const pm = PRICING_MODELS[p.pricing] || PRICING_MODELS.sub;
  const siege = siegeMods(S);

  p.momentum = Math.max(0, p.momentum * Math.pow(PRODUCT.MOMENTUM_RETENTION_DAILY, days));

  let drivers = productDrivers(S, p, m, cat, pm);

  // ── Awareness stock (drives the seed flow that bootstraps growth)
  const awarenessGain = (PRODUCT.ORGANIC_BASE * drivers.repFactor * drivers.hypeF
                       + m['+awarenessFlat']
                       + p.momentum * PRODUCT.MOMENTUM_AWARENESS) * days * m.userMult;
  p.awareness = Math.max(0, (p.awareness + awarenessGain)
    * Math.pow(PRODUCT.AWARENESS_RETENTION_DAILY, days));

  // ── What the thing is worth, and what you actually charge.
  // Computed here rather than beside churn because price has to be able to buy
  // reach as well as cost it: above fair value you buy churn, below it you buy
  // spread. That is what makes the price an interior decision instead of a
  // number with one correct value.
  const { fairPrice, priceRatio } = drivers;
  p.fairPrice = fairPrice;
  const disc = clamp(fairPrice / Math.max(1, p.price), 1, PRODUCT.DISCOUNT_CAP);
  p.discountReach = disc;

  // ── Viral coefficient
  const pf = portfolioEffects(S);
  const netBonus = cat.networkBonus ? 1 + Math.log10(1 + p.users)
    * PRODUCT.NETWORK_VIRAL_RATE * cat.networkBonus : 1;
  p.viralK = clamp((cat.baseViral
                    * (PRODUCT.VIRAL_APPEAL_BASE + p.appeal * PRODUCT.VIRAL_APPEAL_RATE)
                    * pm.viralMult * netBonus + m['+viral'])
                    * (PRODUCT.VIRAL_SENTIMENT_BASE + p.sentiment * PRODUCT.VIRAL_SENTIMENT_RATE)
                    * (1 - PRODUCT.DISCOUNT_VIRAL + PRODUCT.DISCOUNT_VIRAL * disc), 0, PRODUCT.VIRAL_CAP);

  drivers = productDrivers(S, p, m, cat, pm);
  const { compPressure, effTam, tamLeft, cold, dailyRate } = drivers;
  p.tam = effTam;
  const compounded = p.users * dailyRate * tamLeft * days;

  // ── Seed flow: how new products get their first thousand users
  const conv = clamp(PRODUCT.SEED_CONVERSION_BASE * m.conversion
                     * (PRODUCT.SEED_APPEAL_BASE + p.appeal * PRODUCT.SEED_APPEAL_RATE)
                     * (PRODUCT.SEED_POLISH_BASE + p.polish)
                     * (1 - PRODUCT.DISCOUNT_CONV + PRODUCT.DISCOUNT_CONV * disc),
  PRODUCT.SEED_CONVERSION_MIN, PRODUCT.SEED_CONVERSION_MAX);
  const seed = (p.awareness * conv * PRODUCT.SEED_AWARENESS_RATE
    + m['+awarenessFlat'] * PRODUCT.SEED_FLAT_AWARENESS_RATE)
             * tamLeft * cold * compPressure * days;

  let newUsers = (compounded + seed) * pf.cannibalize * siege.growthMult;
  // Established products lend awareness to newer ones.
  if (pf.awarenessBleed && p.features.length < PRODUCT.PORTFOLIO_AWARENESS_FEATURES) {
    p.awareness += pf.awarenessBleed * PRODUCT.PORTFOLIO_AWARENESS_RATE * days;
  }
  if (m.gdpUsers) newUsers += p.users * PRODUCT.GDP_USER_GROWTH_RATE * days * tamLeft;

  // ── Churn: fair-price anchored. Overcharging is punished hard.
  let churn = cat.baseChurn * pm.churnMult * m.churn;
  churn *= 1 + (1 - p.reliability) * (cat.reliabilityCritical || 1) * PRODUCT.RELIABILITY_CHURN_RATE;
  churn *= 1 + Math.max(0, priceRatio - 1) * PRODUCT.PRICE_ELASTICITY * m.priceElastic;
  churn *= 1 - clamp(p.polish * PRODUCT.POLISH_CHURN_RATE, 0, PRODUCT.POLISH_CHURN_CAP);
  if (m.networkChurn) churn *= 1 / (1 + Math.log10(1 + p.users) * PRODUCT.NETWORK_CHURN_RATE);
  churn *= pf.churnMult;
  // A rival price war is felt here and nowhere else: it is temporary, visible
  // on the Market view, and it ends.
  churn *= siege.churnMult;
  churn = Math.max(m.churnFloor, Math.min(PRODUCT.CHURN_CAP, churn));
  p.churnMonthly = churn;
  const dailyChurn = 1 - Math.pow(1 - churn, 1 / 30);
  const lost = p.users * dailyChurn * days;

  p.users = Math.min(effTam, Math.max(0, p.users + newUsers - lost));
  p.peakUsers = Math.max(p.peakUsers, p.users);
  S.stats.peakUsers = Math.max(S.stats.peakUsers, totalUsers(S));

  // ── Monetization. Nobody pays more than the thing is worth to them:
  // revenue is computed on an effective price capped by willingness to pay.
  const priceDrag = clamp(1 / (1 + Math.max(0, priceRatio - 1) * PRODUCT.PRICE_DRAG_RATE),
    PRODUCT.PRICE_DRAG_MIN, 1);
  let paidConv = pm.paidConv * (PRODUCT.PAID_APPEAL_BASE + p.appeal * PRODUCT.PAID_APPEAL_RATE)
    * (PRODUCT.PAID_QUALITY_BASE + p.quality * PRODUCT.PAID_QUALITY_RATE) * priceDrag;
  paidConv = clamp(paidConv, 0, PRODUCT.PAID_CONVERSION_CAP);
  p.payingUsers = p.users * paidConv;
  const effectivePrice = Math.min(p.price, fairPrice * PRODUCT.EFFECTIVE_PRICE_CAP);
  p.arpu = effectivePrice * (pm.arpuMult || 1) * m.arpu * m.mrrMult * pf.arpuMult;
  p.mrr = p.payingUsers * p.arpu;

  // ── Sentiment
  const target = clamp(PRODUCT.SENTIMENT_BASE + p.quality * PRODUCT.SENTIMENT_QUALITY_RATE
    + p.reliability * PRODUCT.SENTIMENT_RELIABILITY_RATE
    - S.resources.techDebt / PRODUCT.SENTIMENT_DEBT_SCALE
    - Math.max(0, priceRatio - 1) * PRODUCT.SENTIMENT_PRICE_RATE,
  PRODUCT.SENTIMENT_MIN, PRODUCT.SENTIMENT_MAX);
  p.sentiment += (target - p.sentiment)
    * (1 - Math.pow(PRODUCT.SENTIMENT_RETENTION_DAILY, days));

  // ── Reliability drifts toward what your debt, quality and ops investment imply.
  // It is an equilibrium, not a leak: fix the inputs and it recovers on its own.
  const relTarget = clamp(PRODUCT.RELIABILITY_TARGET_BASE
    + p.quality * PRODUCT.RELIABILITY_QUALITY_RATE
    + p.polish * PRODUCT.RELIABILITY_POLISH_RATE
    + (S._opsRelBonus || 0)
    - S.resources.techDebt / PRODUCT.RELIABILITY_DEBT_SCALE
    - Math.log10(1 + p.users) * PRODUCT.RELIABILITY_SCALE_RATE,
  PRODUCT.RELIABILITY_TARGET_MIN, PRODUCT.RELIABILITY_MAX);
  p.reliability += (relTarget - p.reliability)
    * (1 - Math.pow(PRODUCT.RELIABILITY_RETENTION_DAILY, days));
  p.reliabilityTarget = relTarget;
  p.reliability = clamp(p.reliability,
    Math.max(PRODUCT.RELIABILITY_MIN, m.reliabilityFloor), PRODUCT.RELIABILITY_MAX);
}

function productDrivers(S, p, m, cat = CATEGORY_MAP[p.category],
                        pm = PRICING_MODELS[p.pricing] || PRICING_MODELS.sub) {
  const repFactor = 1 + soften(S.resources.reputation, PRODUCT.REP_GROWTH_SCALE, PRODUCT.REP_GROWTH_CAP);
  const hypeF = PRODUCT.HYPE_GROWTH_BASE
    + S.market.hype * cat.hypeSensitivity * PRODUCT.HYPE_GROWTH_RATE;
  const threatSum = S.market.competitors.reduce((a, c) => a
    + (c.status === 'active' ? c.threat : 0), 0);
  const compPressure = clamp(1 / (1 + threatSum * PRODUCT.COMPETITION_THREAT_RATE),
    PRODUCT.COMPETITION_FLOOR, 1);
  const effTam = effectiveTam(S, cat, m);
  const tamLeft = clamp(1 - p.users / effTam, 0, 1);
  const cold = cat.coldStart && p.users < PRODUCT.COLD_START_USERS ? 1 / cat.coldStart : 1;
  const qualityPull = (PRODUCT.PULL_APPEAL_BASE + p.appeal * PRODUCT.PULL_APPEAL_RATE)
    * (PRODUCT.PULL_POLISH_BASE + p.polish * PRODUCT.PULL_POLISH_RATE)
    * (PRODUCT.PULL_QUALITY_BASE + p.quality * PRODUCT.PULL_QUALITY_RATE);
  const dailyRate = (PRODUCT.GROWTH_BASE * repFactor * hypeF * qualityPull * pm.viralMult
                    + p.viralK * PRODUCT.VIRAL_TO_GROWTH)
                    * compPressure * cold * m.userMult;
  const fairPrice = cat.basePrice * (PRODUCT.FAIR_QUALITY_BASE
    + p.quality * PRODUCT.FAIR_QUALITY_RATE + p.appeal * PRODUCT.FAIR_APPEAL_RATE
    + p.polish * PRODUCT.FAIR_POLISH_RATE)
    * (m.arpu > 1 ? Math.pow(m.arpu, PRODUCT.FAIR_ARPU_POWER) : 1);
  const priceRatio = p.price / Math.max(1, fairPrice);
  return { repFactor, hypeF, threatSum, compPressure, effTam, tamLeft, cold,
    qualityPull, dailyRate, fairPrice, priceRatio };
}

// The addressable market grows as the technology makes new users possible.
// Past the human ceiling it does not stop — it changes what a user is. Machines,
// agents and systems become the customers, and they arrive logarithmically
// rather than linearly, so the headline number keeps moving without the curve
// going vertical. A hard clamp here froze the topbar's Users meter for the last
// 500+ days of most runs, which is exactly the stretch that is supposed to feel
// like the largest thing that has ever happened.
export const GLOBAL_USER_CEILING = PRODUCT.GLOBAL_USER_CEILING;
export function effectiveTam(S, cat, m = computeMods(S)) {
  let t = cat.tam * (1 + S.time.day / PRODUCT.TAM_GROWTH_DAYS);
  if (S.research.done.platform_play) t *= PRODUCT.TAM_PLATFORM_MULT;
  if (S.research.done.ecosystem_lock) t *= PRODUCT.TAM_ECOSYSTEM_MULT;
  if (S.research.done.default_infrastructure) t *= PRODUCT.TAM_INFRA_MULT;
  if (S.research.done.attention_capture) t *= PRODUCT.TAM_ATTENTION_MULT;
  if (S.research.done.robotics) t *= PRODUCT.TAM_ROBOTICS_MULT;
  if (m.userMult > 1) t *= Math.pow(m.userMult, PRODUCT.TAM_USER_MULT_POWER);
  if (t <= GLOBAL_USER_CEILING) return t;
  // Every doubling of nominal demand past the ceiling adds a fraction of it.
  const reach = S.research.done.robotics ? PRODUCT.POSTHUMAN_ROBOTIC : PRODUCT.POSTHUMAN_BASE;
  return GLOBAL_USER_CEILING * (1 + Math.log2(t / GLOBAL_USER_CEILING) * reach);
}

// ── Portfolio ───────────────────────────────────────────────────────────────
// A second product is not just more of the first. Distinct categories cross-sell
// and stick; duplicates cannibalise. Existing distribution makes launches land.
export function portfolioEffects(S) {
  const launched = S.products.filter((p) => p.launched && !p.sunset);
  const n = launched.length;
  const out = { count: n, distinct: 0, churnMult: 1, arpuMult: 1, launchBoost: 1,
    cannibalize: 1, awarenessBleed: 0, suiteName: null };
  if (n === 0) return out;
  const cats = new Set(launched.map((p) => p.category));
  out.distinct = cats.size;
  const overlap = n - cats.size;
  out.churnMult = Math.pow(PRODUCT.PORTFOLIO_CHURN_MULT, Math.max(0, cats.size - 1));
  out.arpuMult = 1 + Math.max(0, cats.size - 1) * PRODUCT.PORTFOLIO_ARPU_RATE;
  out.launchBoost = 1 + Math.max(0, n - 1) * PRODUCT.PORTFOLIO_LAUNCH_RATE;
  out.cannibalize = Math.pow(PRODUCT.PORTFOLIO_CANNIBAL_MULT, overlap);
  out.awarenessBleed = Math.max(0, n - 1) * PRODUCT.PORTFOLIO_AWARENESS_BLEED;
  if (cats.size >= PRODUCT.PORTFOLIO_SUITE_CATEGORIES) out.suiteName = 'Suite';
  if (cats.size >= PRODUCT.PORTFOLIO_PLATFORM_CATEGORIES) out.suiteName = 'Platform';
  if (cats.size >= PRODUCT.PORTFOLIO_SUBSTRATE_CATEGORIES) out.suiteName = 'Substrate';
  return out;
}

// ── Explainability ──────────────────────────────────────────────────────────
// Returns the actual multipliers currently driving growth, churn and revenue,
// so the player can see the model instead of guessing at it.
export function explainProduct(S, p, m = computeMods(S)) {
  if (!p) return null;
  const cat = CATEGORY_MAP[p.category];
  const pm = PRICING_MODELS[p.pricing] || PRICING_MODELS.sub;
  const { repFactor, hypeF, compPressure, effTam, tamLeft, cold, qualityPull,
    dailyRate, fairPrice, priceRatio } = productDrivers(S, p, m, cat, pm);

  return {
    growth: {
      total: dailyRate * tamLeft,
      rows: [
        ['Base rate', PRODUCT.GROWTH_BASE, 'The floor every product gets.', 'raw'],
        ['Reputation', repFactor, 'Social capital compounds into distribution.'],
        ['Market hype', hypeF, `Sector heat × this category's sensitivity.`],
        ['Quality pull', qualityPull, 'Appeal × polish × quality.'],
        ['Pricing model', pm.viralMult, `${pm.name} shapes how freely it spreads.`],
        ['Virality (k)', 1 + p.viralK * PRODUCT.VIRAL_TO_GROWTH / Math.max(1e-6, PRODUCT.GROWTH_BASE), `k = ${p.viralK.toFixed(2)}`],
        ['Competition', compPressure, `${S.market.competitors.filter((c) => c.status === 'active').length} active rivals`],
        ['Market left', tamLeft, `${fmtPct(1 - tamLeft)} of the addressable market already yours`, 'frac'],
        ...(cold < 1 ? [['Cold start', cold, 'Marketplaces are hard before liquidity.']] : []),
      ],
    },
    churn: {
      total: p.churnMonthly,
      rows: [
        ['Category baseline', cat.baseChurn, `${cat.name} churns at this rate by nature.`, 'raw'],
        ['Pricing model', pm.churnMult, pm.name],
        ['Reliability', 1 + (1 - p.reliability) * (cat.reliabilityCritical || 1)
          * PRODUCT.RELIABILITY_CHURN_RATE,
        `${(p.reliability * 100).toFixed(1)}% uptime, trending to ${((p.reliabilityTarget ?? p.reliability) * 100).toFixed(0)}%`],
        ['Price vs value', 1 + Math.max(0, priceRatio - 1) * PRODUCT.PRICE_ELASTICITY * m.priceElastic,
          `You charge ${priceRatio.toFixed(2)}× what it is worth to them`],
        ['Polish', 1 - clamp(p.polish * PRODUCT.POLISH_CHURN_RATE,
          0, PRODUCT.POLISH_CHURN_CAP), 'Craft keeps people.'],
        ['Research & projects', m.churn, 'Onboarding, network effects, lock-in.'],
      ['Portfolio', portfolioEffects(S).churnMult, `${portfolioEffects(S).distinct} distinct categories cross-sell and stick.`],
      ],
    },
    revenue: {
      total: p.mrr,
      rows: [
        ['Users', p.users, 'Everyone who shows up.', 'raw'],
        ['Paying conversion', p.users > 0 ? p.payingUsers / p.users : 0, `${pm.name} converts at this rate`, 'pct'],
        ['Effective price', Math.min(p.price, fairPrice * PRODUCT.EFFECTIVE_PRICE_CAP),
          `List ${money(p.price)} · fair value ${money(fairPrice)}`, 'money'],
        ['Model multiplier', pm.arpuMult || 1, pm.name],
        ['Research uplift', m.arpu * m.mrrMult, 'Enterprise motion, platform, annual plans.'],
        ['Portfolio', portfolioEffects(S).arpuMult, 'Customers who buy two things pay more for both.'],
      ],
    },
    fairPrice, priceRatio, effTam, tamLeft,
  };
}
function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }
function money(n) { return '$' + Math.round(n).toLocaleString(); }

export function totalUsers(S) { return S.products.reduce((a, p) => a + (p.launched ? p.users : 0), 0); }
export function totalMrr(S) { return S.products.reduce((a, p) => a + (p.launched ? p.mrr : 0), 0); }
export function totalArr(S) { return totalMrr(S) * 12; }

export function pricingAllowed(S, p, pm) {
  if (pm.req && !(S.unlocks[pm.req] || S.research.done[pm.req])) return false;
  if (pm.cats && !pm.cats.includes(p.category)) return false;
  return true;
}

export function setPrice(S, p, price) {
  const old = p.price;
  p.price = Math.max(0, price);
  if (price > old) {
    p.momentum = Math.max(0, p.momentum - PRODUCT.PRICE_RAISE_MOMENTUM_LOSS);
    p.sentiment -= PRODUCT.PRICE_RAISE_SENTIMENT_LOSS;
  }
  markDirty();
  emit('product:price', { product: p, from: old, to: p.price });
  return p;
}

export function setPricing(S, p, pricing) {
  if (!p || !PRICING_MODELS[pricing] || p.pricing === pricing) return false;
  p.pricing = pricing;
  markDirty();
  emit('product:pricing', { product: p, pricing });
  return true;
}
