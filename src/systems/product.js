// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT — features, quality, users, revenue. The growth engine.
// ─────────────────────────────────────────────────────────────────────────────
import { CATEGORY_MAP, PRICING_MODELS, FEATURE_KINDS } from '../data/products.js';
import { PRODUCT, ECON } from '../data/balance.js';
import { computeMods } from './modifiers.js';
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
    quality: 0.06,
    polish: 0.05,
    appeal: 0.10,
    reliability: 0.62,
    price: cat.basePrice,
    pricing: 'sub',
    users: 0,
    payingUsers: 0,
    awareness: 0,
    mrr: 0,
    churnMonthly: cat.baseChurn,
    viralK: 0,
    momentum: 0,       // decaying launch/viral boost
    sentiment: 0.5,
    peakUsers: 0,
    totalRevenue: 0,
    sunset: false,
  };
  S.products.push(p);
  if (!S.activeProductId) S.activeProductId = p.id;
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
  const insightRatio = clamp(S.resources.insight / (30 + p.features.length * 14), 0, 2.2);
  // Example-driven prompting banks "fit credit" that is spent on the next ship.
  const credit = Math.min(0.6, S.founder.fitCredit || 0);
  S.founder.fitCredit = Math.max(0, (S.founder.fitCredit || 0) - credit);
  const fit = clamp(0.42 + insightRatio * 0.42 + credit + gaussian(0, 0.14), 0.05, 1.95);
  const debtPenalty = 1 - clamp(S.resources.techDebt / 420, 0, PRODUCT.DEBT_QUALITY_PENALTY);
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
  p.quality += f.q / (1 + p.quality * 0.75);
  p.appeal += f.a / (1 + p.appeal * 0.85);
  p.polish += f.p / (1 + p.polish * 0.9);
  p.reliability = clamp(p.reliability + f.r, 0.1, 0.995);
  p.devProgress = 0;
  S.stats.featuresShipped++;
  S._lastShipDay = S.time.day;
  S.stats.bestQuality = Math.max(S.stats.bestQuality, p.quality);

  // Shipping creates momentum: a short burst of attention.
  const burst = 0.35 + fit * 0.55;
  p.momentum += burst;
  S.resources.insight = Math.max(0, S.resources.insight - 6 - p.features.length * 1.2);

  emit('feature:shipped', { product: p, feature: f, fit });
  return f;
}

export function launchProduct(S, p) {
  const m = computeMods(S);
  p.launched = true;
  p.launchDay = S.time.day;
  S.stats.productsLaunched++;

  // Launch strength: quality × polish × reputation × hype × research
  const rep = 1 + soften(S.resources.reputation, 260, 2.4);
  const hype = 0.55 + S.market.hype * 0.9;
  const pf = portfolioEffects(S);
  const strength = (0.35 + p.quality) * (0.6 + p.polish * 1.4) * rep * hype * m.launchPower * pf.launchBoost;
  const roll = 0.55 + rand() * 1.05;
  const score = strength * roll;

  const cat = CATEGORY_MAP[p.category];
  const seed = Math.floor(score * 120 * (0.4 + cat.hypeSensitivity * 0.6));
  p.awareness += score * 42;
  p.users += seed;
  p.momentum += score * 1.4;
  S.resources.reputation += score * 11;

  const tier = score > 2.6 ? 'legendary' : score > 1.7 ? 'great' : score > 1.0 ? 'good' : score > 0.55 ? 'okay' : 'flop';
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

  p.momentum = Math.max(0, p.momentum * Math.pow(0.90, days));

  // ── Awareness stock (drives the seed flow that bootstraps growth)
  const repFactor = 1 + soften(S.resources.reputation, 300, 3.2);
  const hypeF = 0.6 + S.market.hype * cat.hypeSensitivity * 0.75;
  const awarenessGain = (PRODUCT.ORGANIC_BASE * repFactor * hypeF
                       + m['+awarenessFlat']
                       + p.momentum * 22) * days * m.userMult;
  p.awareness = Math.max(0, (p.awareness + awarenessGain) * Math.pow(0.985, days));

  // ── What the thing is worth, and what you actually charge.
  // Computed here rather than beside churn because price has to be able to buy
  // reach as well as cost it: above fair value you buy churn, below it you buy
  // spread. That is what makes the price an interior decision instead of a
  // number with one correct value.
  const fairPrice = cat.basePrice * (0.45 + p.quality * 0.85 + p.appeal * 0.55 + p.polish * 0.4)
                  * (m.arpu > 1 ? Math.pow(m.arpu, 0.55) : 1);
  const priceRatio = p.price / Math.max(1, fairPrice);
  p.fairPrice = fairPrice;
  const disc = clamp(fairPrice / Math.max(1, p.price), 1, PRODUCT.DISCOUNT_CAP);
  p.discountReach = disc;

  // ── Viral coefficient
  const pf = portfolioEffects(S);
  const netBonus = cat.networkBonus ? 1 + Math.log10(1 + p.users) * 0.05 * cat.networkBonus : 1;
  p.viralK = clamp((cat.baseViral * (0.35 + p.appeal * 1.25) * pm.viralMult * netBonus
                    + m['+viral']) * (0.7 + p.sentiment * 0.6)
                    * (1 - PRODUCT.DISCOUNT_VIRAL + PRODUCT.DISCOUNT_VIRAL * disc), 0, PRODUCT.VIRAL_CAP);

  // ── Competitive pressure (bounded — never a death spiral)
  const threatSum = S.market.competitors.reduce((a, c) => a + (c.status === 'active' ? c.threat : 0), 0);
  const compPressure = clamp(1 / (1 + threatSum * 0.045), 0.45, 1);

  // ── Logistic growth against a market that itself expands
  const effTam = effectiveTam(S, cat, m);
  p.tam = effTam;
  const tamLeft = clamp(1 - p.users / effTam, 0, 1);
  const cold = cat.coldStart && p.users < 3000 ? 1 / cat.coldStart : 1;
  const qualityPull = (0.25 + p.appeal * 1.35) * (0.55 + p.polish * 0.9) * (0.6 + p.quality * 0.7);
  const dailyRate = (PRODUCT.GROWTH_BASE * repFactor * hypeF * qualityPull * pm.viralMult
                    + p.viralK * PRODUCT.VIRAL_TO_GROWTH)
                    * compPressure * cold * m.userMult;
  const compounded = p.users * dailyRate * tamLeft * days;

  // ── Seed flow: how new products get their first thousand users
  const conv = clamp(0.10 * m.conversion * (0.35 + p.appeal * 1.5) * (0.5 + p.polish)
                     * (1 - PRODUCT.DISCOUNT_CONV + PRODUCT.DISCOUNT_CONV * disc), 0.01, 0.95);
  const seed = (p.awareness * conv * 0.055 + m['+awarenessFlat'] * 0.5)
             * tamLeft * cold * compPressure * days;

  let newUsers = (compounded + seed) * pf.cannibalize * siege.growthMult;
  // Established products lend awareness to newer ones.
  if (pf.awarenessBleed && p.features.length < 12) p.awareness += pf.awarenessBleed * 3 * days;
  if (m.gdpUsers) newUsers += p.users * 0.0006 * days * tamLeft;

  // ── Churn: fair-price anchored. Overcharging is punished hard.
  let churn = cat.baseChurn * pm.churnMult * m.churn;
  churn *= 1 + (1 - p.reliability) * (cat.reliabilityCritical || 1) * 1.6;
  churn *= 1 + Math.max(0, priceRatio - 1) * PRODUCT.PRICE_ELASTICITY * m.priceElastic;
  churn *= 1 - clamp(p.polish * 0.28, 0, 0.32);
  if (m.networkChurn) churn *= 1 / (1 + Math.log10(1 + p.users) * 0.10);
  churn *= pf.churnMult;
  // A rival price war is felt here and nowhere else: it is temporary, visible
  // on the Market view, and it ends.
  churn *= siege.churnMult;
  churn = Math.max(m.churnFloor, Math.min(0.85, churn));
  p.churnMonthly = churn;
  const dailyChurn = 1 - Math.pow(1 - churn, 1 / 30);
  const lost = p.users * dailyChurn * days;

  p.users = Math.min(effTam, Math.max(0, p.users + newUsers - lost));
  p.peakUsers = Math.max(p.peakUsers, p.users);
  S.stats.peakUsers = Math.max(S.stats.peakUsers, totalUsers(S));

  // ── Monetization. Nobody pays more than the thing is worth to them:
  // revenue is computed on an effective price capped by willingness to pay.
  const priceDrag = clamp(1 / (1 + Math.max(0, priceRatio - 1) * 1.6), 0.02, 1);
  let paidConv = pm.paidConv * (0.55 + p.appeal * 0.9) * (0.7 + p.quality * 0.5) * priceDrag;
  paidConv = clamp(paidConv, 0, 0.92);
  p.payingUsers = p.users * paidConv;
  const effectivePrice = Math.min(p.price, fairPrice * 2.6);
  p.arpu = effectivePrice * (pm.arpuMult || 1) * m.arpu * m.mrrMult * pf.arpuMult;
  p.mrr = p.payingUsers * p.arpu;

  // ── Sentiment
  const target = clamp(0.30 + p.quality * 0.26 + p.reliability * 0.34
    - S.resources.techDebt / 1100 - Math.max(0, priceRatio - 1) * 0.14, 0.05, 0.98);
  p.sentiment += (target - p.sentiment) * (1 - Math.pow(0.94, days));

  // ── Reliability drifts toward what your debt, quality and ops investment imply.
  // It is an equilibrium, not a leak: fix the inputs and it recovers on its own.
  const relTarget = clamp(0.66
    + p.quality * 0.14
    + p.polish * 0.06
    + (S._opsRelBonus || 0)
    - S.resources.techDebt / 420
    - Math.log10(1 + p.users) * 0.012, 0.12, 0.995);
  p.reliability += (relTarget - p.reliability) * (1 - Math.pow(0.975, days));
  p.reliabilityTarget = relTarget;
  p.reliability = clamp(p.reliability, Math.max(0.1, m.reliabilityFloor), 0.995);
}

// The addressable market grows as the technology makes new users possible.
// Past the human ceiling it does not stop — it changes what a user is. Machines,
// agents and systems become the customers, and they arrive logarithmically
// rather than linearly, so the headline number keeps moving without the curve
// going vertical. A hard clamp here froze the topbar's Users meter for the last
// 500+ days of most runs, which is exactly the stretch that is supposed to feel
// like the largest thing that has ever happened.
export const GLOBAL_USER_CEILING = 11.5e9;
export function effectiveTam(S, cat, m = computeMods(S)) {
  let t = cat.tam * (1 + S.time.day / 1500);
  if (S.research.done.platform_play) t *= 1.7;
  if (S.research.done.ecosystem_lock) t *= 1.5;
  if (S.research.done.default_infrastructure) t *= 2.4;
  if (S.research.done.attention_capture) t *= 1.9;
  if (S.research.done.robotics) t *= 1.35;
  if (m.userMult > 1) t *= Math.pow(m.userMult, 0.45);
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
  out.churnMult = Math.pow(0.92, Math.max(0, cats.size - 1));
  out.arpuMult = 1 + Math.max(0, cats.size - 1) * 0.10;
  out.launchBoost = 1 + Math.max(0, n - 1) * 0.24;
  out.cannibalize = Math.pow(0.90, overlap);
  out.awarenessBleed = Math.max(0, n - 1) * 0.12;
  if (cats.size >= 3) out.suiteName = 'Suite';
  if (cats.size >= 5) out.suiteName = 'Platform';
  if (cats.size >= 7) out.suiteName = 'Substrate';
  return out;
}

// ── Explainability ──────────────────────────────────────────────────────────
// Returns the actual multipliers currently driving growth, churn and revenue,
// so the player can see the model instead of guessing at it.
export function explainProduct(S, p, m = computeMods(S)) {
  if (!p) return null;
  const cat = CATEGORY_MAP[p.category];
  const pm = PRICING_MODELS[p.pricing] || PRICING_MODELS.sub;
  const repFactor = 1 + soften(S.resources.reputation, 300, 3.2);
  const hypeF = 0.6 + S.market.hype * cat.hypeSensitivity * 0.75;
  const threatSum = S.market.competitors.reduce((a, c) => a + (c.status === 'active' ? c.threat : 0), 0);
  const compPressure = clamp(1 / (1 + threatSum * 0.045), 0.45, 1);
  const effTam = effectiveTam(S, cat, m);
  const tamLeft = clamp(1 - p.users / effTam, 0, 1);
  const cold = cat.coldStart && p.users < 3000 ? 1 / cat.coldStart : 1;
  const qualityPull = (0.25 + p.appeal * 1.35) * (0.55 + p.polish * 0.9) * (0.6 + p.quality * 0.7);
  const dailyRate = (PRODUCT.GROWTH_BASE * repFactor * hypeF * qualityPull * pm.viralMult
                    + p.viralK * PRODUCT.VIRAL_TO_GROWTH) * compPressure * cold * m.userMult;
  const fairPrice = p.fairPrice || cat.basePrice;
  const priceRatio = p.price / Math.max(1, fairPrice);

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
        ['Reliability', 1 + (1 - p.reliability) * (cat.reliabilityCritical || 1) * 1.6,
        `${(p.reliability * 100).toFixed(1)}% uptime, trending to ${((p.reliabilityTarget ?? p.reliability) * 100).toFixed(0)}%`],
        ['Price vs value', 1 + Math.max(0, priceRatio - 1) * PRODUCT.PRICE_ELASTICITY * m.priceElastic,
          `You charge ${priceRatio.toFixed(2)}× what it is worth to them`],
        ['Polish', 1 - clamp(p.polish * 0.28, 0, 0.32), 'Craft keeps people.'],
        ['Research & projects', m.churn, 'Onboarding, network effects, lock-in.'],
      ['Portfolio', portfolioEffects(S).churnMult, `${portfolioEffects(S).distinct} distinct categories cross-sell and stick.`],
      ],
    },
    revenue: {
      total: p.mrr,
      rows: [
        ['Users', p.users, 'Everyone who shows up.', 'raw'],
        ['Paying conversion', p.users > 0 ? p.payingUsers / p.users : 0, `${pm.name} converts at this rate`, 'pct'],
        ['Effective price', Math.min(p.price, fairPrice * 2.6), `List ${money(p.price)} · fair value ${money(fairPrice)}`, 'money'],
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
  if (price > old) { p.momentum = Math.max(0, p.momentum - 0.2); p.sentiment -= 0.04; }
  return p;
}
