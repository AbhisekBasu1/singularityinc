// ─────────────────────────────────────────────────────────────────────────────
// FEED — generates the live world chatter that reacts to your state.
// ─────────────────────────────────────────────────────────────────────────────
import { SOCIAL, HN_TITLES, HEADLINES, AGENT_LOGS, OUTLETS, RANDOM_HANDLES, CITIES } from '../data/feedlines.js';
import { CATEGORY_MAP } from '../data/products.js';
import { CHARACTERS } from '../data/characters.js';
import { totalUsers, totalMrr } from './product.js';
import { topRival } from './market.js';
import { nemesisOf } from './nemesis.js';
import { fmt, money, pct } from '../engine/format.js';
import { pick, rand, chance, randInt, hash01 } from '../engine/rng.js';
import { emit } from '../engine/bus.js';
import { THREADS, THREAD_MAP } from '../data/threads.js';
import { clamp } from '../engine/format.js';
import { markDirty } from './modifiers.js';
import { FOUNDER_POSTS, NULLPTR_REPLIES, NULLPTR_AFTER } from '../data/nullptr.js';
import { VOICES, CARD_POSTS, PRIYA_HEADLINES, VANCE_MOVES, SAM_OUTAGE } from '../data/handles.js';
import { TRAIT_MAP } from '../data/agents.js';
import { TRAIT_REACT } from '../data/channel.js';
import { WIRE } from '../data/balance.js';

export function feedTier(S) {
  const u = totalUsers(S), m = totalMrr(S);
  if (S.company.act >= 5 || S.world.globalGdpShare > 0.02) return 'dominant';
  if (S.company.act >= 4 || m > 3e6) return 'dominant';
  if (m > 120000 || u > 400000) return 'big';
  if (m > 3000 || u > 6000) return 'growing';
  return 'early';
}

// A fact the crowd repeats has to agree with itself. `{n}` used to be a fresh
// draw on every post, so two headlines a day apart priced the same outage
// twice. It is a stable function of the act now — seeded from the company and
// `actStartedDay`, through `hash01`, which draws nothing from the stream — and
// the counts that *should* differ from one log line to the next are `{k}`.
function stableInAct(S, key, lo, hi) {
  const seed = `${S.company?.name || ''}:${S.company?.act || 1}:${S.company?.actStartedDay ?? 0}:${key}`;
  return lo + Math.floor(hash01(seed) * (hi - lo + 1));
}
// Countries whose GDP sits under a valuation: roughly ten under a billion,
// sixty-five under ten, a hundred and twenty under a hundred, and nearly all
// of them under a trillion. A curve rather than a table, and never re-rolled.
function nationsBelow(v) {
  if (!(v > 0)) return 0;
  return Math.max(0, Math.min(193, Math.round(10 + 55 * Math.log10(v / 1e9))));
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
    '{n}': String(stableInAct(S, 'n', 2, 90)),
    '{k}': String(randInt(2, 90)),
    '{pct}': String(stableInAct(S, 'pct', 2, 9)),
    '{weeks}': String(Math.max(1, Math.round((S.time?.day || 0) / 7))),
    '{nations}': String(nationsBelow(S.company?.valuation)),
    '{feature}': p?.features?.length ? pick(p.features).name : 'core loop',
    '{agent}': S.agents.length ? pick(S.agents).name : 'ARIA',
    // The four the recurring handles are the reason for. `{uptime}` and
    // `{churn}` are the real numbers — the churn whisperer is right within a
    // point because `{guess}` is the real figure with a stable offset on it,
    // not because a line says so. `{wrongval}` is the not-a-VC being wrong in
    // a direction the act decides, so a run gets both halves of the joke.
    '{uptime}': pct(p?.reliability ?? 0, 1),
    '{churn}': pct(churnOf(p), 1),
    '{guess}': pct(Math.max(0.001, churnOf(p) + (stableInAct(S, 'guess', 0, 1) ? 1 : -1)
      * stableInAct(S, 'guessby', 1, 9) / 1000), 1),
    '{wrongval}': money(S.company.valuation * (((S.company?.act || 1) % 2) ? 2.6 : 0.38)),
  };
}

// Monthly churn as a fraction. A product with nobody on it has no churn to be
// right about, and the handle that guesses it is gated on having users.
const churnOf = (p) => (p && Number.isFinite(p.churnMonthly) ? p.churnMonthly : 0.03);

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
    // An authored gate on the run, the way a card has one. A throw is a no.
    if (t.when) { try { if (!t.when(S)) return false; } catch { return false; } }
    return true;
  });
}

// `id` opens one named thread rather than drawing from the pool, and refuses
// if that thread is not legal right now — §A15's incident post-mortem asks by
// name, because a thread about this morning's outage is not a thread the day
// may or may not feel like offering. Without an id this is what it always was.
export function maybeThread(S, id = null) {
  const pool = eligibleThreads(S);
  if (!pool.length) return null;
  const t = id ? pool.find((x) => x.id === id) : pick(pool);
  if (!t) return null;
  const tok = tokens(S);
  return pushFeed(S, {
    type: t.kind, author: t.kind === 'log' ? tok['{agent}'] : t.kind === 'news' ? '' : pick(RANDOM_HANDLES),
    // A thread whose text names what just happened has to be written at the
    // moment it opens rather than authored as a constant.
    text: fill(typeof t.text === 'function' ? t.text(S) : t.text, tok), tone: t.tone || 'neutral',
    thread: t.id, resolved: false, expires: S.time.day + WIRE.THREAD_LIFE_DAYS,
    points: t.kind === 'hn' ? randInt(20, 400) : undefined,
    comments: t.kind === 'hn' ? randInt(5, 120) : undefined,
  });
}

// The world's threads carry their options on the item itself (`runtime`),
// because they are written at play time rather than authored in `threads.js`.
// This file knows nothing about what the world may do to the company; whoever
// writes such a thread registers the hand that spends its options, the way
// `narrative.js` takes a hydrate function rather than importing the world.
let worldThreadResolver = null;    // (S, item, opt) => [key, value][]
export function registerThreadResolver(fn) { worldThreadResolver = fn || null; }

// Authored threads that are not in `threads.js`: a letter that asks something
// registers here, and answers through the same `THREAD_FX` path the Wire's own
// threads use. `(id) => { opts } | null`.
const threadSources = [];
export function registerThreadSource(fn) { if (typeof fn === 'function') threadSources.push(fn); }
function authoredThread(id) {
  if (THREAD_MAP[id]) return THREAD_MAP[id];
  for (const fn of threadSources) { try { const t = fn(id); if (t) return t; } catch {} }
  return null;
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
  // Broader authority, granted in a reply. An agent that asks for it asks in
  // the post, and the roster is what the grant lands on — autonomy is a
  // company-wide posture here, not a per-agent setting, and it drags on
  // alignment the same way the roster panel's slider does.
  autonomy: (S, v) => { for (const a of S.agents || []) a.autonomy = clamp((a.autonomy ?? 0.5) + v, 0, 1); },
  // A reply that the story remembers. The value is the flag's name; a thread
  // that sets one gates itself on it, so it is asked once.
  flag: (S, v) => { if (typeof v === 'string' && v) S.narrative.flags[v] = true; },
};

export function resolveThread(S, feedId, optIndex) {
  const item = S.feed.find((f) => f.id === Number(feedId));
  if (!item || item.resolved) return null;
  const opt = threadOptions(S, item)[optIndex];
  if (!opt) return null;
  let applied = [];
  if (item.runtime?.opts) {
    if (!worldThreadResolver) return null;
    applied = worldThreadResolver(S, item, opt) || [];
  } else {
    for (const [k, v] of Object.entries(opt.fx || {})) {
      if (THREAD_FX[k]) { THREAD_FX[k](S, v); applied.push([k, v]); }
    }
  }
  item.resolved = true;
  item.outcome = opt.out;
  item.chosen = opt.label;
  item.effects = applied;
  S.stats.threadsResolved = (S.stats.threadsResolved || 0) + 1;
  markDirty();
  // The state goes with it: a letter's answer may owe a reply, and the post
  // queues it from this event rather than reaching for the module singleton.
  emit('thread:resolved', { S, item, opt, applied });
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

// ── Triage ──────────────────────────────────────────────────────────────────
// A thread expires. Until now nothing said so, and a decision with an invisible
// deadline is one the founder loses by accident rather than by choosing not to
// answer. `daysLeft` is what the rail prints; `null` means the item carries no
// expiry at all, which is a thread from an older save rather than an immortal
// one.
export function daysLeft(S, f) {
  if (!f || f.expires === undefined || f.expires === null) return null;
  const n = Math.ceil(f.expires - (S?.time?.day || 0));
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

// Later. Once per thread, a week further out, and the row drops below whatever
// is still asking — the point is to get it out of the way, not to make it
// immortal, so a second press is refused by name.
export function snoozeThread(S, feedId) {
  const item = (S.feed || []).find((f) => f.id === Number(feedId));
  if (!item || !item.thread || item.resolved) return { ok: false, reason: 'gone' };
  if (item.snoozed) return { ok: false, reason: 'already' };
  item.snoozed = Math.floor(S.time.day);
  if (item.expires !== undefined && item.expires !== null) item.expires += WIRE.SNOOZE_DAYS;
  markDirty();
  return { ok: true, days: WIRE.SNOOZE_DAYS, item };
}

// What the rail shows, in the order it shows it. Needs-you first — a snoozed
// thread below the ones still asking, which is the whole of what Later buys —
// then everything else, newest first. One place, because the console's rail and
// the workstation's window are the same element.
export function triageFeed(S, cap = 55) {
  const open = [];
  const later = [];
  const rest = [];
  for (const f of S.feed || []) {
    if (f.thread && !f.resolved) (f.snoozed ? later : open).push(f);
    else rest.push(f);
  }
  const asking = [...open, ...later];
  return [...asking, ...rest.slice(0, Math.max(0, cap - asking.length))];
}

export function openThreadCount(S) {
  return S.feed.filter((f) => f.thread && !f.resolved).length;
}

// Open letters, which is what `tickMail` caps. A letter that asks nothing is
// never counted: reading is not a decision.
export function openMailCount(S) {
  return (S.feed || []).filter((f) => f.type === 'mail' && f.thread && !f.resolved).length;
}

export function threadOptions(S, item) {
  if (Array.isArray(item?.runtime?.opts)) return item.runtime.opts;
  const t = authoredThread(item?.thread);
  return t ? t.opts : [];
}

// The same sentence from two handles in one week reads as a script, not a
// crowd. Pick again when a line is still on the rail; give up after a few
// tries rather than loop on a short list.
function fresh(S, list, t) {
  const recent = new Set((S.feed || []).slice(0, WIRE.NO_REPEAT_WITHIN).map((f) => f.text));
  let text = '';
  for (let i = 0; i < 6; i++) {
    text = fill(pick(list), t);
    if (!recent.has(text)) return text;
  }
  // Six draws is not six tries: a crisis pool drawn hard for a fortnight will
  // miss all six and print a line that is already three items up the rail. Walk
  // the rest of the list from where the last draw landed, which is guaranteed
  // to terminate and finds the free line when there is one.
  const at = list.indexOf(list.find((x) => fill(x, t) === text));
  for (let k = 1; k <= list.length; k++) {
    const cand = fill(list[(Math.max(0, at) + k) % list.length], t);
    if (!recent.has(cand)) return cand;
  }
  return text;
}

// The same, for the agents' log lines, which carry a lane beside the text.
const logText = (line, t) => fill(line.text, t).replace(/^[^→]*→\s*/, '');
function freshLog(S, t) {
  const recent = (S.feed || []).slice(0, 25).map((f) => f.text);
  let line = AGENT_LOGS[0];
  for (let i = 0; i < 6; i++) {
    line = pick(AGENT_LOGS);
    if (!recent.includes(logText(line, t))) return line;
  }
  return line;
}

// ── The recurring people ────────────────────────────────────────────────────
// `feedlines.js` is a crowd: a line and a handle, drawn apart, so nobody in it
// is ever anybody twice. `handles.js` is six people, each of whom is one thing
// — uptime, valuation, churn, the farm, page four of the forum, the other
// outlet — and the handle rides with the lines rather than being drawn beside
// them. A regular has to be rare enough to still be themselves, so each of the
// six is capped at `VOICE_PER_FORTNIGHT`, counted off the rail rather than off
// a counter in the save: the feed is a 160-item window and a fortnight of it
// is well inside that, so the quota costs nothing and cannot drift.
function saidLately(S, handle) {
  const since = (S.time?.day || 0) - WIRE.VOICE_WINDOW_DAYS;
  let n = 0;
  for (const f of S.feed || []) {
    if (f.day < since) break;              // the feed is newest-first
    if (f.author === handle) n++;
  }
  return n;
}

export function eligibleVoices(S) {
  return VOICES.filter((v) => {
    try { if (v.when && !v.when(S)) return false; } catch { return false; }
    return saidLately(S, v.handle) < WIRE.VOICE_PER_FORTNIGHT;
  });
}

/** One of the six, saying one of their own lines. Null when none is due. */
export function voicePost(S, tone = 'neutral') {
  const pool = eligibleVoices(S);
  if (!pool.length) return null;
  const v = pick(pool);
  const t = tokens(S);
  return pushFeed(S, { type: 'social', author: v.handle, tone,
    text: fresh(S, v.lines, t), voice: v.handle });
}

export function generateFeed(S) {
  const launched = S.products.some((p) => p.launched);
  if (!launched) {
    // Before launch the world barely knows you exist. Keep it sparse and quiet.
    if (!chance(0.35)) return null;
    const t = tokens(S);
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fresh(S, PRELAUNCH, t), tone: 'neutral' });
  }
  const tier = feedTier(S);
  const t = tokens(S);
  const roll = rand();
  const p = S.products.find((x) => x.launched);
  const sentiment = p?.sentiment ?? 0.5;

  // Crisis chatter when things are bad
  if (p && (p.reliability < 0.7 || sentiment < 0.35) && chance(0.4)) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fresh(S, SOCIAL.crisis, t), tone: 'bad' });
  }
  // Critical chatter when huge
  if ((tier === 'dominant') && chance(0.28)) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fresh(S, SOCIAL.critical, t), tone: 'bad' });
  }
  // Rival chatter
  if (topRival(S) && chance(0.14)) {
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fresh(S, SOCIAL.rival, t), tone: 'neutral' });
  }

  if (roll < 0.42) {
    // A third of the time the person saying it is somebody you know.
    if (chance(WIRE.VOICE_CHANCE)) { const v = voicePost(S, 'neutral'); if (v) return v; }
    return pushFeed(S, { type: 'social', author: pick(RANDOM_HANDLES),
      text: fresh(S, SOCIAL[tier] || SOCIAL.early, t), tone: 'good' });
  }
  if (roll < 0.60 && S.agents.length) {
    // Authored by an agent whose lane matches the line — a Legal agent does
    // not find 340ms regressions — and by anyone when that lane is empty.
    const line = freshLog(S, t);
    const inLane = line.lane ? S.agents.filter((a) => a.lane === line.lane) : [];
    const who = pick(inLane.length ? inLane : S.agents);
    return pushFeed(S, { type: 'log', author: who?.name || t['{agent}'],
      text: logText(line, t), tone: 'neutral' });
  }
  if (roll < 0.78) {
    // The crisis titles were unreachable: this indexed by tier alone, and
    // `crisis` is not a tier. When the product is failing, most of the front
    // page is about that.
    const crisisNow = !!p && (p.reliability < 0.7 || sentiment < 0.35);
    const titles = crisisNow && chance(0.6) ? HN_TITLES.crisis : (HN_TITLES[tier] || HN_TITLES.early);
    return pushFeed(S, { type: 'hn', author: pick(RANDOM_HANDLES).slice(1),
      text: fresh(S, titles, t), points: randInt(8, tier === 'early' ? 90 : 1400),
      comments: randInt(2, tier === 'early' ? 40 : 900), tone: titles === HN_TITLES.crisis ? 'bad' : 'neutral' });
  }
  const headSet = S.company.act >= 5 ? (HEADLINES.singularity) : (HEADLINES[tier] || HEADLINES.early);
  return pushFeed(S, { type: 'news', author: '', text: fresh(S, headSet, t), tone: 'neutral' });
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
    // A card was answered, and the outside heard about it a day later without
    // ever learning what it was called. Milestones, crises and faces only:
    // the ordinary cards are the ordinary week and nobody posts about those.
    case 'card': return cardPost(S, payload);
    default: return null;
  }
}

// ── The world answers a card ────────────────────────────────────────────────
// Nothing here may crowd a decision. The rail is the only place a thread can be
// seen, and a thread at the top of it is somebody waiting: a post that pushes
// one down is the game talking over its own player, so this stands aside while
// the newest item is unanswered.
function crowdsAThread(S) {
  const top = (S.feed || [])[0];
  return !!(top && top.thread && !top.resolved);
}

export function cardPost(S, { ev, choice, tone } = {}) {
  if (!ev || crowdsAThread(S)) return null;
  const kind = CARD_POSTS[ev.kind] ? ev.kind : (ev.char ? 'character' : null);
  if (!kind) return null;
  const byTone = CARD_POSTS[kind];
  const pool = byTone[tone || choice?.tone || 'neutral'] || byTone.neutral;
  if (!pool?.length) return null;
  const t = tokens(S);
  const v = chance(WIRE.CARD_POST_VOICE) ? pick(eligibleVoices(S)) : null;
  return pushFeed(S, {
    type: 'social', author: v ? v.handle : pick(RANDOM_HANDLES),
    text: fresh(S, pool, t), tone: tone === 'cruel' ? 'bad' : 'neutral',
    ...(v ? { voice: v.handle } : {}),
  });
}

// ── A trait reacts ──────────────────────────────────────────────────────────
// Four traits, four triggers: the empathic one after a cruel outcome, the
// ruthless one after a rival moves, the paranoid one after an outage, the
// sycophant after a milestone. It is public and under the agent's own name, so
// it is rationed hard — one every two days across all four, or a roster of six
// comments on everything that happens.
const TRAIT_TRIGGER = { cruel: 'empathic', rival: 'ruthless', outage: 'paranoid', milestone: 'sycophant' };

export function traitReaction(S, trigger) {
  const traitId = TRAIT_TRIGGER[trigger];
  const pool = TRAIT_REACT[traitId];
  if (!traitId || !pool?.length) return null;
  const w = wireState(S);
  const day = S.time?.day || 0;
  if (w.traitAt != null && day - w.traitAt < WIRE.TRAIT_EVERY_DAYS) return null;
  const who = (S.agents || []).filter((a) => (a.traits || []).includes(traitId));
  if (!who.length) return null;
  const a = pick(who);
  w.traitAt = day;
  // Indexed by the day rather than drawn: this runs off a card resolving, and
  // the same trait reacting to the same kind of thing twice running is what
  // makes a roster read as a script.
  const text = freshText(S, pool, Math.floor(hash01(`${a.id}:${Math.floor(day)}`) * pool.length));
  return pushFeed(S, { type: 'log', author: a.name, tone: trigger === 'milestone' ? 'good' : 'neutral',
    text, meta: TRAIT_MAP[traitId]?.name ? TRAIT_MAP[traitId].name.toLowerCase() : undefined });
}

// ── The cast, without an assistant ──────────────────────────────────────────
// Priya's outlet runs a headline the day her card lands, Vance posts after a
// move, and Sam answers an outage the way the first user does. Every one of
// them is skipped when the world layer is speaking for that person — the caller
// passes `false` and this does nothing, because two authors with one cast is
// how a run ends up with Vance contradicting Vance.
export function castPost(S, who, payload = {}) {
  const t = tokens(S);
  if (who === 'priya') {
    const pool = PRIYA_HEADLINES[payload.tone === 'cruel' || payload.tone === 'costly' ? 'bad'
      : payload.tone === 'good' ? 'good' : 'neutral'];
    return pushFeed(S, { type: 'news', author: '', tone: 'neutral', char: 'priya',
      text: fresh(S, pool, t), meta: CHARACTERS.priya?.role });
  }
  if (who === 'vance') {
    const pool = VANCE_MOVES[payload.move] || VANCE_MOVES.respect;
    return pushFeed(S, { type: 'social', author: CHARACTERS.vance?.handle || '@mvance', tone: 'bad',
      char: 'vance', text: fresh(S, pool, t), meta: CHARACTERS.vance?.role });
  }
  if (who === 'sam') {
    return pushFeed(S, { type: 'social', author: CHARACTERS.sam?.handle || '@sam', tone: 'neutral',
      char: 'sam', text: fresh(S, SAM_OUTAGE, t),
      meta: payload.about ? `↳ ${payload.about}` : CHARACTERS.sam?.role });
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE POST, AND THE REPLY
//
// Five cards tell the founder that an account called `nullptr` answers every
// post they make, ninety seconds later, at any hour, and is never wrong. Until
// now a founder could press R four hundred times and never see it happen: the
// key moved a reputation number and nothing appeared in the Wire at all. So R
// writes a post now, under the founder's own handle, and the answer lands on
// the following tick.
//
// Three things this has to keep doing.
//
//  - **The gates are re-checked at landing.** A reply is queued when the key
//    is pressed and posted a tick later, and a card can resolve in between:
//    arc 4 is the account shut down and arc 5 its last comment, and a fresh
//    line from a dead account would be the deck contradicting itself. The
//    queue is small and is trimmed from the front — a reply to the post before
//    last is not the joke.
//  - **The pending queue is state, not a timer.** It lives on `S.wire`, which
//    is saved, so a post made and a tab closed still gets its answer. Nothing
//    here holds a `setTimeout`.
//  - **The world's own voice is untouched.** `post_as_nullptr` and `aria_says`
//    write through their own paths in `src/world/author.js` and are marked
//    `via`; nothing in this block runs for them.
// ─────────────────────────────────────────────────────────────────────────────

/** Lazily created, saved with the run: pending replies, and ARIA's last day. */
export function wireState(S) {
  const w = (S.wire ??= {});
  w.pending ??= [];
  return w;
}

/**
 * A line from a pool of plain strings, starting at `i` and stepping past
 * anything already on the rail. Pure — no draw, and it always terminates — so
 * a caller on a render path or in a day hook can use it without moving the
 * shared stream.
 */
export function freshText(S, list, i = 0) {
  if (!list?.length) return '';
  const recent = new Set((S?.feed || []).slice(0, WIRE.NO_REPEAT_WITHIN).map((f) => f.text));
  for (let k = 0; k < list.length; k++) {
    const t = list[(i + k) % list.length];
    if (!recent.has(t)) return t;
  }
  return list[i % list.length];
}

// The same rule for a pool of `{ text, topic }` entries: the entry survives the
// pick, so the topic of a post can key the answer to it.
function freshEntry(S, list, t) {
  if (!list?.length) return null;
  const recent = new Set((S?.feed || []).slice(0, WIRE.NO_REPEAT_WITHIN).map((f) => f.text));
  let e = list[0];
  for (let i = 0; i < 6; i++) {
    e = pick(list);
    if (!recent.has(t ? fill(e.text, t) : e.text)) return e;
  }
  return e;
}

const nullptrOver = (S) => ((S?.narrative?.relationships?.nullptr?.arc ?? 0) >= WIRE.NULLPTR_ARC_MAX)
  || !!S?.narrative?.flags?.nullptr_shut;

/**
 * The founder posts. Called from the bus on `action:post`, so this is the one
 * place in the pair that may draw: a person pressed a key.
 */
export function founderPost(S, { viral = false } = {}) {
  if (!S) return null;
  const act = Math.max(1, Math.min(5, Math.floor(S.company?.act || 1)));
  // Most posts are about the work. A few are about something that happened
  // away from the desk, and those are the ones that carry the reveal.
  const off = chance(WIRE.OFF_POST_CHANCE);
  const pool = (off ? FOUNDER_POSTS.off : FOUNDER_POSTS[act]) || FOUNDER_POSTS[1];
  const t = tokens(S);
  const entry = freshEntry(S, pool, t);
  if (!entry) return null;
  const item = pushFeed(S, {
    type: 'social', author: S.founder?.handle || '@founder',
    text: fill(entry.text, t), tone: viral ? 'good' : 'neutral', mine: true,
  });
  queueReply(S, item, entry);
  return item;
}

function queueReply(S, item, entry) {
  if (nullptrOver(S)) return null;
  const w = wireState(S);
  w.pending.push({
    at: S.time.day + WIRE.NULLPTR_DELAY_DAYS,
    who: item.author, topic: entry.topic || 'any',
    ...(entry.unseen ? { unseen: entry.unseen } : {}),
  });
  if (w.pending.length > WIRE.PENDING_MAX) w.pending.splice(0, w.pending.length - WIRE.PENDING_MAX);
  return w.pending[w.pending.length - 1];
}

function nullptrSays(S, p, text) {
  return pushFeed(S, {
    type: 'social', author: CHARACTERS.nullptr?.handle || 'nullptr',
    text, tone: 'neutral', meta: `↳ ${p.who} · 90s`, nullptr: true,
  });
}

function landReply(S, p) {
  if (nullptrOver(S)) return null;
  const fl = (S.narrative ??= {}).flags ??= {};
  // Once she has said whose account it is, the comments carry on — the founder
  // never asked them to stop, and the choice that does stop them sets
  // `nullptr_shut` instead. What changes is the reader, and the pool.
  const after = !!fl.aria_confessed;
  // Once in a run, after that, one of them answers a post nothing on this
  // machine could have read. The flag is left for a card to find.
  if (after && p.unseen && !fl.nullptr_after_aria) {
    fl.nullptr_after_aria = true;
    return nullptrSays(S, p, p.unseen);
  }
  const pool = after ? NULLPTR_AFTER : NULLPTR_REPLIES;
  const keyed = pool.filter((r) => r.topic === p.topic);
  const e = freshEntry(S, keyed.length ? keyed : pool.filter((r) => r.topic === 'any'))
    || freshEntry(S, pool);
  return e ? nullptrSays(S, p, e.text) : null;
}

/** Land whatever is due. Called from a tick hook, so it is cheap when empty. */
export function tickWire(S) {
  const w = S?.wire;
  if (!w?.pending?.length) return null;
  const now = S.time.day;
  const keep = [];
  let landed = null;
  for (const p of w.pending) {
    if (now < p.at) { keep.push(p); continue; }
    landed = landReply(S, p) || landed;
  }
  w.pending = keep;
  return landed;
}
