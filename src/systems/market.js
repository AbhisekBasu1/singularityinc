// ─────────────────────────────────────────────────────────────────────────────
// MARKET — hype cycles, macro regimes, and rival companies that actually fight.
// ─────────────────────────────────────────────────────────────────────────────
import { MARKET } from '../data/balance.js';
import { CATEGORY_MAP, CATEGORIES } from '../data/products.js';
import { computeMods } from './modifiers.js';
import { companyName, personName, handleFor } from '../data/names.js';
import { rand, chance, pick, randRange, gaussian, weightedPick } from '../engine/rng.js';
import { clamp, soften } from '../engine/format.js';
import { totalUsers, totalMrr } from './product.js';
import { emit } from '../engine/bus.js';

export const MACRO = {
  boom:       { id: 'boom', name: 'Bull Market', color: '#00e5a0', icon: '▲',
                desc: 'Capital is cheap and patient. Everything is a rocketship until it is not.' },
  neutral:    { id: 'neutral', name: 'Steady', color: '#7c8a99', icon: '■',
                desc: 'Normal conditions. Fundamentals matter about as much as they ever do.' },
  tightening: { id: 'tightening', name: 'Tightening', color: '#f5a623', icon: '▼',
                desc: 'Rates up, multiples down. Investors want to see a path to profit.' },
  crash:      { id: 'crash', name: 'Crash', color: '#ff4d5e', icon: '⨯',
                desc: 'Funding has stopped. Half your competitors will not survive this.' },
};

const MACRO_CHAIN = {
  boom:       [['neutral', MARKET.BOOM_TO_NEUTRAL], ['tightening', MARKET.BOOM_TO_TIGHT],
               ['crash', MARKET.BOOM_TO_CRASH]],
  neutral:    [['boom', MARKET.NEUTRAL_TO_BOOM], ['tightening', MARKET.NEUTRAL_TO_TIGHT],
               ['neutral', MARKET.NEUTRAL_STAYS]],
  tightening: [['crash', MARKET.TIGHT_TO_CRASH], ['neutral', MARKET.TIGHT_TO_NEUTRAL],
               ['boom', MARKET.TIGHT_TO_BOOM]],
  crash:      [['tightening', MARKET.CRASH_TO_TIGHT], ['neutral', MARKET.CRASH_TO_NEUTRAL]],
};

export const RIVAL_PERSONALITIES = [
  { id: 'blitz', name: 'Blitzscaler', icon: '⚡', growth: MARKET.BLITZ_GROWTH,
    burn: MARKET.BLITZ_BURN, quality: MARKET.BLITZ_QUALITY,
    line: 'Growth at any cost. They will either win everything or vanish in eighteen months.' },
  { id: 'craft', name: 'Craftsman', icon: '◈', growth: MARKET.CRAFT_GROWTH,
    burn: MARKET.CRAFT_BURN, quality: MARKET.CRAFT_QUALITY,
    line: 'Slower, better, adored. Their users would riot for them.' },
  { id: 'copycat', name: 'Fast Follower', icon: '⧉', growth: MARKET.COPY_GROWTH,
    burn: MARKET.COPY_BURN, quality: MARKET.COPY_QUALITY,
    line: 'They ship your roadmap two weeks after you do. Sometimes before.' },
  { id: 'giant', name: 'Incumbent Division', icon: '▦', growth: MARKET.GIANT_GROWTH,
    burn: MARKET.GIANT_BURN, quality: MARKET.GIANT_QUALITY,
    line: 'Backed by a trillion-dollar parent. They can lose money forever.' },
  { id: 'zealot', name: 'Open-Source Zealot', icon: '⌘', growth: MARKET.ZEALOT_GROWTH,
    burn: MARKET.ZEALOT_BURN, quality: MARKET.ZEALOT_QUALITY,
    line: 'They gave it away for free. Somehow that is working.' },
  { id: 'shark', name: 'Predator', icon: '⚔', growth: MARKET.SHARK_GROWTH,
    burn: MARKET.SHARK_BURN, quality: MARKET.SHARK_QUALITY,
    line: 'They poach, litigate, and undercut. Nothing is beneath them.' },
];

export function spawnCompetitor(S, opts = {}) {
  const cat = opts.category || (S.products[0]?.category) || pick(CATEGORIES).id;
  const pers = opts.personality || pick(RIVAL_PERSONALITIES);
  const founder = opts.founder || personName();
  const scale = opts.scale ?? (1 + S.company.act * MARKET.START_SCALE_PER_ACT);
  const c = {
    id: 'c' + S.market.competitorSeq++,
    name: opts.name || companyName(),
    founder,
    handle: handleFor(founder),
    category: cat,
    personality: pers.id,
    users: (opts.users ?? randRange(MARKET.START_USERS_MIN, MARKET.START_USERS_MAX)) * scale,
    mrr: (opts.mrr ?? randRange(0, MARKET.START_MRR_MAX)) * scale,
    funding: (opts.funding ?? randRange(MARKET.START_FUNDING_MIN, MARKET.START_FUNDING_MAX)) * scale,
    quality: opts.quality ?? randRange(MARKET.START_QUALITY_MIN, MARKET.START_QUALITY_MAX),
    growth: randRange(MARKET.START_GROWTH_MIN, MARKET.START_GROWTH_MAX) * pers.growth,
    threat: 0,
    day: S.time.day,
    status: 'active',
    scripted: !!opts.scripted,
    grudge: 0,
    memory: [],
  };
  updateThreat(S, c);
  S.market.competitors.push(c);
  emit('competitor:spawned', { competitor: c });
  return c;
}

export function updateThreat(S, c) {
  const ours = Math.max(MARKET.THREAT_BASELINE, totalUsers(S));
  const ourMrr = Math.max(MARKET.THREAT_BASELINE, totalMrr(S));
  const uR = c.users / ours, mR = c.mrr / ourMrr;
  c.threat = clamp((Math.log10(1 + uR * MARKET.THREAT_RATIO_WEIGHT)
    + Math.log10(1 + mR * MARKET.THREAT_RATIO_WEIGHT)) * MARKET.THREAT_SCALE,
  0, MARKET.THREAT_CAP);
  return c.threat;
}

export function tickMarket(S, days, m = computeMods(S)) {
  const M = S.market;
  // Hype cycle: slow sine + noise, clamped
  M.hypePhase += days / MARKET.HYPE_PERIOD_DAYS * Math.PI * 2;
  const base = MARKET.HYPE_BASE + Math.sin(M.hypePhase) * MARKET.HYPE_AMPLITUDE;
  M.hype = clamp(M.hype * MARKET.HYPE_RETENTION
    + (base + gaussian(0, MARKET.HYPE_NOISE_SD)) * MARKET.HYPE_ADJUST_RATE, MARKET.HYPE_MIN, 1);

  // Macro regime
  M.macroDaysLeft -= days;
  if (M.macroDaysLeft <= 0) {
    const opts = MACRO_CHAIN[M.macro] || MACRO_CHAIN.neutral;
    const next = weightedPick(opts.map((o) => o[0]), opts.map((o) => o[1]));
    if (next !== M.macro) emit('macro:shift', { from: M.macro, to: next });
    M.macro = next;
    M.macroDaysLeft = MARKET.MACRO_SHIFT_DAYS
      * randRange(MARKET.MACRO_DURATION_MIN, MARKET.MACRO_DURATION_MAX);
  }

  // Competitor spawning
  const catSat = M.sectorSaturation;
  const spawnChance = days / MARKET.COMPETITOR_SPAWN_DAYS
    * (MARKET.SPAWN_HYPE_BASE + M.hype * MARKET.SPAWN_HYPE_RATE)
    * (S.company.act >= 2 ? MARKET.SPAWN_LATE_ACT_MULT : MARKET.SPAWN_EARLY_ACT_MULT)
    * (M.macro === 'crash' ? MARKET.SPAWN_CRASH_MULT
      : M.macro === 'boom' ? MARKET.SPAWN_BOOM_MULT : 1)
    * m.competitorGrowth;
  if (chance(spawnChance) && M.competitors.filter((c) => c.status === 'active').length
      < MARKET.MAX_ACTIVE_COMPETITORS) {
    spawnCompetitor(S);
  }

  // Competitor evolution — logistic against the same market you are fighting for.
  const ourUsers = totalUsers(S);
  for (const c of M.competitors) {
    if (c.status !== 'active') continue;
    const pers = RIVAL_PERSONALITIES.find((p) => p.id === c.personality) || RIVAL_PERSONALITIES[0];
    const cat = CATEGORY_MAP[c.category] || CATEGORY_MAP.devtools;
    // Their ceiling is a slice of the category, shrunk by how much of it you hold.
    const ceiling = Math.max(MARKET.CEILING_MIN,
      cat.tam * (MARKET.CEILING_QUALITY_BASE + c.quality * MARKET.CEILING_QUALITY_RATE)
      * clamp(1 - ourUsers / (cat.tam * MARKET.CEILING_PLAYER_TAM_MULT),
        MARKET.CEILING_REMAINING_MIN, 1));
    const age = Math.max(1, S.time.day - c.day);
    // Growth decays as they mature — nobody grows 8%/day for five years.
    let g = c.growth * m.competitorGrowth * (1 - c.users / ceiling)
      * (MARKET.MATURITY_DAYS / (MARKET.MATURITY_DAYS + age));
    if (M.macro === 'crash') g -= MARKET.CRASH_GROWTH_DRAG;
    if (M.macro === 'boom') g += MARKET.BOOM_GROWTH_BONUS;
    c.users = clamp(c.users * (1 + g * days), 0, ceiling);
    const rivalArpu = cat.basePrice
      * (MARKET.RIVAL_ARPU_BASE + c.quality * MARKET.RIVAL_ARPU_QUALITY);
    c.mrr = c.users * MARKET.RIVAL_PAID_CONVERSION * rivalArpu
      * (MARKET.RIVAL_REVENUE_BASE + c.quality * MARKET.RIVAL_REVENUE_QUALITY);
    c.funding -= c.users * MARKET.FUNDING_BURN_PER_USER * pers.burn * days;
    c.funding += c.mrr / 30 * days * MARKET.FUNDING_REINVEST_SHARE;
    c.quality = clamp(c.quality + MARKET.QUALITY_GAIN_PER_DAY * pers.quality * days
      * (MARKET.MATURITY_DAYS / (MARKET.MATURITY_DAYS + age)), 0, MARKET.QUALITY_CAP);
    if (c.funding < 0 && c.mrr < MARKET.FAILURE_MRR_CEILING) {
      c.status = 'dead';
      S.stats.competitorsCrushed++;
      emit('competitor:died', { competitor: c });
    }
    updateThreat(S, c);
  }
  M.sectorSaturation = clamp(M.competitors.filter((c) => c.status === 'active')
    .reduce((a, c) => a + c.threat, 0) / MARKET.SATURATION_THREAT_SCALE, 0, 1);

  // Keep the ledger from growing forever on very long runs.
  if (M.competitors.length > MARKET.LEDGER_MAX) {
    const keep = M.competitors.filter((c) => c.status === 'active' || c.status === 'acquired');
    const dead = M.competitors.filter((c) => c.status === 'dead').slice(-MARKET.LEDGER_DEAD_KEEP);
    M.competitors = [...keep, ...dead];
  }
}

export function activeCompetitors(S) { return S.market.competitors.filter((c) => c.status === 'active'); }
export function topRival(S) {
  const a = activeCompetitors(S);
  return a.length ? a.reduce((x, y) => (y.threat > x.threat ? y : x)) : null;
}

export function acquireCompetitor(S, id) {
  const c = S.market.competitors.find((x) => x.id === id);
  if (!c || c.status !== 'active') return { ok: false };
  const price = acquisitionPrice(S, c);
  if (S.company.cash < price) return { ok: false, reason: 'cash', price };
  S.company.cash -= price;
  c.status = 'acquired';
  S.stats.acquisitions++;
  S.company.subsidiaries.push({ name: c.name, day: S.time.day, price, users: c.users, mrr: c.mrr });
  // Absorb their users and revenue into your lead product
  const p = S.products.find((x) => x.id === S.activeProductId) || S.products[0];
  if (p) {
    p.users += c.users * MARKET.ACQUIRE_USER_SHARE;
    p.awareness += c.users * MARKET.ACQUIRE_AWARENESS_PER_USER;
  }
  emit('competitor:acquired', { competitor: c, price });
  return { ok: true, price };
}

export function acquisitionPrice(S, c) {
  const arr = c.mrr * 12;
  const price = arr * MARKET.ACQUIRE_ARR_MULT
    * (MARKET.ACQUIRE_HYPE_BASE + S.market.hype * MARKET.ACQUIRE_HYPE_RATE)
    + c.users * MARKET.ACQUIRE_USER_VALUE
    + Math.max(0, c.funding) * MARKET.ACQUIRE_FUNDING_SHARE;
  // Desperate companies are cheap; thriving ones demand a premium.
  const desperation = c.funding < 0 ? MARKET.ACQUIRE_DISTRESSED_MULT
    : 1 + clamp(c.threat / MARKET.THREAT_CAP, 0, 1) * MARKET.ACQUIRE_THREAT_PREMIUM;
  return Math.max(MARKET.ACQUIRE_PRICE_MIN, price * desperation);
}
