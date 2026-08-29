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
  boom:       [['neutral', 0.55], ['tightening', 0.32], ['crash', 0.13]],
  neutral:    [['boom', 0.35], ['tightening', 0.45], ['neutral', 0.2]],
  tightening: [['crash', 0.34], ['neutral', 0.5], ['boom', 0.16]],
  crash:      [['tightening', 0.6], ['neutral', 0.4]],
};

export const RIVAL_PERSONALITIES = [
  { id: 'blitz', name: 'Blitzscaler', icon: '⚡', growth: 1.9, burn: 2.4, quality: 0.7,
    line: 'Growth at any cost. They will either win everything or vanish in eighteen months.' },
  { id: 'craft', name: 'Craftsman', icon: '◈', growth: 0.7, burn: 0.7, quality: 1.7,
    line: 'Slower, better, adored. Their users would riot for them.' },
  { id: 'copycat', name: 'Fast Follower', icon: '⧉', growth: 1.2, burn: 1.0, quality: 0.9,
    line: 'They ship your roadmap two weeks after you do. Sometimes before.' },
  { id: 'giant', name: 'Incumbent Division', icon: '▦', growth: 0.9, burn: 0.3, quality: 1.1,
    line: 'Backed by a trillion-dollar parent. They can lose money forever.' },
  { id: 'zealot', name: 'Open-Source Zealot', icon: '⌘', growth: 1.4, burn: 0.2, quality: 1.2,
    line: 'They gave it away for free. Somehow that is working.' },
  { id: 'shark', name: 'Predator', icon: '⚔', growth: 1.3, burn: 1.5, quality: 0.95,
    line: 'They poach, litigate, and undercut. Nothing is beneath them.' },
];

export function spawnCompetitor(S, opts = {}) {
  const cat = opts.category || (S.products[0]?.category) || pick(CATEGORIES).id;
  const pers = opts.personality || pick(RIVAL_PERSONALITIES);
  const founder = opts.founder || personName();
  const scale = opts.scale ?? (1 + S.company.act * 0.6);
  const c = {
    id: 'c' + S.market.competitorSeq++,
    name: opts.name || companyName(),
    founder,
    handle: handleFor(founder),
    category: cat,
    personality: pers.id,
    users: (opts.users ?? randRange(80, 900)) * scale,
    mrr: (opts.mrr ?? randRange(0, 4000)) * scale,
    funding: (opts.funding ?? randRange(150e3, 4e6)) * scale,
    quality: opts.quality ?? randRange(0.3, 1.1),
    growth: randRange(0.02, 0.10) * pers.growth,
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
  const ours = Math.max(200, totalUsers(S));
  const ourMrr = Math.max(200, totalMrr(S));
  const uR = c.users / ours, mR = c.mrr / ourMrr;
  c.threat = clamp((Math.log10(1 + uR * 3) + Math.log10(1 + mR * 3)) * 1.35, 0, 6);
  return c.threat;
}

export function tickMarket(S, days, m = computeMods(S)) {
  const M = S.market;
  // Hype cycle: slow sine + noise, clamped
  M.hypePhase += days / MARKET.HYPE_PERIOD_DAYS * Math.PI * 2;
  const base = 0.5 + Math.sin(M.hypePhase) * 0.30;
  M.hype = clamp(M.hype * 0.985 + (base + gaussian(0, 0.03)) * 0.015, 0.05, 1);

  // Macro regime
  M.macroDaysLeft -= days;
  if (M.macroDaysLeft <= 0) {
    const opts = MACRO_CHAIN[M.macro] || MACRO_CHAIN.neutral;
    const next = weightedPick(opts.map((o) => o[0]), opts.map((o) => o[1]));
    if (next !== M.macro) emit('macro:shift', { from: M.macro, to: next });
    M.macro = next;
    M.macroDaysLeft = MARKET.MACRO_SHIFT_DAYS * randRange(0.6, 1.5);
  }

  // Competitor spawning
  const catSat = M.sectorSaturation;
  const spawnChance = days / MARKET.COMPETITOR_SPAWN_DAYS
    * (0.5 + M.hype * 1.4)
    * (S.company.act >= 2 ? 1.6 : 0.8)
    * (M.macro === 'crash' ? 0.25 : M.macro === 'boom' ? 1.7 : 1)
    * m.competitorGrowth;
  if (chance(spawnChance) && M.competitors.filter((c) => c.status === 'active').length < 9) {
    spawnCompetitor(S);
  }

  // Competitor evolution — logistic against the same market you are fighting for.
  const ourUsers = totalUsers(S);
  for (const c of M.competitors) {
    if (c.status !== 'active') continue;
    const pers = RIVAL_PERSONALITIES.find((p) => p.id === c.personality) || RIVAL_PERSONALITIES[0];
    const cat = CATEGORY_MAP[c.category] || CATEGORY_MAP.devtools;
    // Their ceiling is a slice of the category, shrunk by how much of it you hold.
    const ceiling = Math.max(5000, cat.tam * (0.30 + c.quality * 0.10)
      * clamp(1 - ourUsers / (cat.tam * 1.2), 0.06, 1));
    const age = Math.max(1, S.time.day - c.day);
    // Growth decays as they mature — nobody grows 8%/day for five years.
    let g = c.growth * m.competitorGrowth * (1 - c.users / ceiling) * (140 / (140 + age));
    if (M.macro === 'crash') g -= 0.012;
    if (M.macro === 'boom') g += 0.006;
    c.users = clamp(c.users * (1 + g * days), 0, ceiling);
    const rivalArpu = cat.basePrice * (0.35 + c.quality * 0.35);
    c.mrr = c.users * 0.22 * rivalArpu * (0.7 + c.quality * 0.3);
    c.funding -= c.users * 0.0007 * pers.burn * days;
    c.funding += c.mrr / 30 * days * 0.25;
    c.quality = clamp(c.quality + 0.0009 * pers.quality * days * (140 / (140 + age)), 0, 3.2);
    if (c.funding < 0 && c.mrr < 25000) {
      c.status = 'dead';
      S.stats.competitorsCrushed++;
      emit('competitor:died', { competitor: c });
    }
    updateThreat(S, c);
  }
  M.sectorSaturation = clamp(M.competitors.filter((c) => c.status === 'active')
    .reduce((a, c) => a + c.threat, 0) / 16, 0, 1);

  // Keep the ledger from growing forever on very long runs.
  if (M.competitors.length > 40) {
    const keep = M.competitors.filter((c) => c.status === 'active' || c.status === 'acquired');
    const dead = M.competitors.filter((c) => c.status === 'dead').slice(-12);
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
  if (p) { p.users += c.users * 0.72; p.awareness += c.users * 0.02; }
  emit('competitor:acquired', { competitor: c, price });
  return { ok: true, price };
}

export function acquisitionPrice(S, c) {
  const arr = c.mrr * 12;
  const price = arr * 8 * (0.8 + S.market.hype * 0.6) + c.users * 16 + Math.max(0, c.funding) * 0.5;
  // Desperate companies are cheap; thriving ones demand a premium.
  const desperation = c.funding < 0 ? 0.45 : 1 + clamp(c.threat / 6, 0, 1) * 0.6;
  return Math.max(40000, price * desperation);
}
