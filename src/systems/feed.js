// ─────────────────────────────────────────────────────────────────────────────
// FEED — generates the live world chatter that reacts to your state.
// ─────────────────────────────────────────────────────────────────────────────
import { SOCIAL, HN_TITLES, HEADLINES, AGENT_LOGS, OUTLETS, RANDOM_HANDLES, CITIES } from '../data/feedlines.js';
import { CATEGORY_MAP } from '../data/products.js';
import { CHARACTERS } from '../data/characters.js';
import { totalUsers, totalMrr } from './product.js';
import { topRival } from './market.js';
import { nemesisOf } from './nemesis.js';
import { fmt, money } from '../engine/format.js';
import { pick, rand, chance, randInt } from '../engine/rng.js';
import { emit } from '../engine/bus.js';
import { THREADS, THREAD_MAP } from '../data/threads.js';
import { clamp } from '../engine/format.js';
import { markDirty } from './modifiers.js';

export function feedTier(S) {
  const u = totalUsers(S), m = totalMrr(S);
  if (S.company.act >= 5 || S.world.globalGdpShare > 0.02) return 'dominant';
  if (S.company.act >= 4 || m > 3e6) return 'dominant';
  if (m > 120000 || u > 400000) return 'big';
  if (m > 3000 || u > 6000) return 'growing';
  return 'early';
}

function tokens(S) {
  const p = S.products.find((x) => x.id === S.activeProductId) || S.products[0];
  // The world talks about whoever the story is actually about.
  const rival = nemesisOf(S) || topRival(S);
  const cat = p ? CATEGORY_MAP[p.category] : null;
  return {
    '{company}': S.company.name,
    '{product}': p?.name || S.company.name,
    '{founder}': S.founder.name,
    '{handle}': S.founder.handle,
    '{users}': fmt(totalUsers(S)),
    '{mrr}': money(totalMrr(S)),
    '{val}': money(S.company.valuation),
    '{rival}': rival?.name || 'an incumbent',   // templates use it as a singular subject
    '{cat}': cat?.name?.toLowerCase() || 'software',
    '{tagline}': S.company.tagline || (cat?.tagline ?? 'built by one person'),
    '{outlet}': pick(OUTLETS),
    '{city}': pick(CITIES),
    '{n}': String(randInt(2, 90)),
    '{feature}': p?.features?.length ? pick(p.features).name : 'core loop',
    '{agent}': S.agents.length ? pick(S.agents).name : 'ARIA',
  };
}

function fill(str, t) {
  return str.replace(/\{[a-z]+\}/g, (k) => t[k] ?? k);
}

// The token vocabulary, exposed so the world-author layer can fill the same
// placeholders in agent-written prose that the authored feed lines use.
export function fillTokens(S, str) { return fill(String(str ?? ''), tokens(S)); }
export function tokenNames() { return Object.keys(tokens({ company: {}, founder: {}, products: [], resources: {}, market: { competitors: [] }, agents: [] })); }

export function pushFeed(S, item) {
  item.id = S.feedSeq++;
  item.day = Math.floor(S.time.day);
  item.t = Date.now();
  S.feed.unshift(item);
  if (S.feed.length > 160) S.feed.pop();
  emit('feed', item);
  return item;
}

const PRELAUNCH = [
  'anyone know what {founder} is building? the commits are wild',
  'saw a demo of {product}. not public yet. it is going to be a problem for {rival}.',
  '{founder} has been heads-down for weeks. something is coming.',
  'the {cat} space is stale. somebody is going to blow it open this year.',
  'Ask HN: is anyone building a serious {cat} tool solo? asking for reasons',
];

// ── Live threads ────────────────────────────────────────────────────────────
// One-click micro-decisions embedded in the feed. Small stakes, no modal.
export function eligibleThreads(S) {
  const u = totalUsers(S);
  const p = S.products.find((x) => x.launched);
  const openIds = new Set(S.feed.filter((f) => f.thread && !f.resolved).map((f) => f.thread));
  return THREADS.filter((t) => {
    if (openIds.has(t.id)) return false;
    if ((t.min || 0) > u) return false;
    if (t.act && S.company.act < t.act) return false;
    if (t.needsAgent && S.agents.length === 0) return false;
    if (t.whenLowRel && (!p || p.reliability > 0.86)) return false;
    return true;
  });
}

export function maybeThread(S) {
  const pool = eligibleThreads(S);
  if (!pool.length) return null;
  const t = pick(pool);
  const tok = tokens(S);
  return pushFeed(S, {
    type: t.kind, author: t.kind === 'log' ? tok['{agent}'] : t.kind === 'news' ? '' : pick(RANDOM_HANDLES),
    text: fill(t.text, tok), tone: t.tone || 'neutral',
    thread: t.id, resolved: false, expires: S.time.day + 45,
    points: t.kind === 'hn' ? randInt(20, 400) : undefined,
    comments: t.kind === 'hn' ? randInt(5, 120) : undefined,
  });
}

export const THREAD_FX = {
  rep: (S, v) => { S.resources.reputation = Math.max(0, S.resources.reputation + v); },
  cash: (S, v) => { S.company.cash += v; },
  code: (S, v) => { S.resources.code = Math.max(0, S.resources.code + v); },
  insight: (S, v) => { S.resources.insight = Math.max(0, S.resources.insight + v); },
  research: (S, v) => { S.resources.research = Math.max(0, S.resources.research + v); },
  debt: (S, v) => { S.resources.techDebt = Math.max(0, S.resources.techDebt + v); },
  focus: (S, v) => { S.founder.focus = clamp(S.founder.focus + v, 0, S.founder.focusMax); },
  align: (S, v) => { S.resources.alignment = clamp(S.resources.alignment + v, 0, 1); },
  heat: (S, v) => { S.world.regulatoryHeat = clamp(S.world.regulatoryHeat + v, 0, 100); },
  opinion: (S, v) => { S.world.publicOpinion = clamp(S.world.publicOpinion + v, 0, 1); },
  awareness: (S, v) => { const p = S.products.find((x) => x.launched); if (p) p.awareness += v; },
  sentiment: (S, v) => { const p = S.products.find((x) => x.launched); if (p) p.sentiment = clamp(p.sentiment + v, 0, 1); },
};

export function resolveThread(S, feedId, optIndex) {
  const item = S.feed.find((f) => f.id === Number(feedId));
  if (!item || item.resolved) return null;
  const t = THREAD_MAP[item.thread];
  if (!t) return null;
  const opt = t.opts[optIndex];
  if (!opt) return null;
  const applied = [];
  for (const [k, v] of Object.entries(opt.fx || {})) {
    if (THREAD_FX[k]) { THREAD_FX[k](S, v); applied.push([k, v]); }
  }
  item.resolved = true;
  item.outcome = opt.out;
  item.chosen = opt.label;
  item.effects = applied;
  S.stats.threadsResolved = (S.stats.threadsResolved || 0) + 1;
  markDirty();
  emit('thread:resolved', { item, opt, applied });
  return { opt, applied };
}

export function expireThreads(S) {
  for (const f of S.feed) {
    if (f.thread && !f.resolved && f.expires !== undefined && S.time.day > f.expires) {
      f.resolved = true;
      f.expired = true;
    }
  }
}

export function openThreadCount(S) {
  return S.feed.filter((f) => f.thread && !f.resolved).length;
}

export function threadOptions(S, item) {
  const t = THREAD_MAP[item.thread];
  return t ? t.opts : [];
}

export function generateFeed(S) {
  const launched = S.products.some((p) => p.launched);
  if (!launched) {
    // Before launch the world barely knows you exist. Keep it sparse and quiet.
    if (!chance(0.35)) return null;
    const t = tokens(S);
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fill(pick(PRELAUNCH), t), tone: 'neutral' });
  }
  const tier = feedTier(S);
  const t = tokens(S);
  const roll = rand();
  const p = S.products.find((x) => x.launched);
  const sentiment = p?.sentiment ?? 0.5;

  // Crisis chatter when things are bad
  if (p && (p.reliability < 0.7 || sentiment < 0.35) && chance(0.4)) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fill(pick(SOCIAL.crisis), t), tone: 'bad' });
  }
  // Critical chatter when huge
  if ((tier === 'dominant') && chance(0.28)) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fill(pick(SOCIAL.critical), t), tone: 'bad' });
  }
  // Rival chatter
  if (topRival(S) && chance(0.14)) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fill(pick(SOCIAL.rival), t), tone: 'neutral' });
  }

  if (roll < 0.42) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fill(pick(SOCIAL[tier] || SOCIAL.early), t), tone: 'good' });
  }
  if (roll < 0.60 && S.agents.length) {
    return pushFeed(S, { type: 'log', author: t['{agent}'],
      text: fill(pick(AGENT_LOGS), t).replace(/^[^→]*→\s*/, ''), tone: 'neutral' });
  }
  if (roll < 0.78) {
    const titles = HN_TITLES[tier] || HN_TITLES.early;
    return pushFeed(S, { type: 'hn', author: pick(RANDOM_HANDLES).slice(1),
      text: fill(pick(titles), t), points: randInt(8, tier === 'early' ? 90 : 1400),
      comments: randInt(2, tier === 'early' ? 40 : 900), tone: 'neutral' });
  }
  const headSet = S.company.act >= 5 ? (HEADLINES.singularity) : (HEADLINES[tier] || HEADLINES.early);
  return pushFeed(S, { type: 'news', author: '', text: fill(pick(headSet), t), tone: 'neutral' });
}

export function feedFromEvent(S, kind, payload) {
  const t = tokens(S);
  switch (kind) {
    case 'feature': return pushFeed(S, { type: 'ship', author: S.company.name,
      text: `Shipped **${payload.feature.name}**`, tone: payload.fit > 0.9 ? 'good' : 'neutral',
      meta: `fit ${(payload.fit * 100).toFixed(0)}%` });
    case 'launch': {
      const tierText = { legendary: 'It is everywhere.', great: 'It landed.', good: 'It landed.',
        okay: 'Modest reception.', flop: 'Almost nobody noticed.' }[payload.tier];
      return pushFeed(S, { type: 'launch', author: S.company.name,
        text: `**${payload.product.name}** is live. ${tierText}`,
        tone: payload.tier === 'flop' ? 'bad' : payload.tier === 'okay' ? 'neutral' : 'good',
        meta: `+${fmt(payload.seed)} users` });
    }
    case 'research': return pushFeed(S, { type: 'research', author: 'R&D',
      text: `**${payload.node.name}** complete`, tone: 'good', meta: payload.node.flavor });
    case 'round': return pushFeed(S, { type: 'news', author: '',
      text: `${pick(OUTLETS)}: ${S.company.name} raises ${money(payload.offer.amount)} at a ${money(payload.offer.post)} valuation`,
      tone: 'good' });
    case 'competitor': return pushFeed(S, { type: 'news', author: '',
      text: `${pick(OUTLETS)}: ${payload.competitor.name} enters the ${t['{cat}']} market`, tone: 'bad' });
    case 'competitorDead': return pushFeed(S, { type: 'news', author: '',
      text: `${pick(OUTLETS)}: ${payload.competitor.name} shuts down`, tone: 'good' });
    case 'agent': return pushFeed(S, { type: 'log', author: payload.agent.name,
      text: payload.text, tone: payload.tone || 'neutral' });
    default: return null;
  }
}
