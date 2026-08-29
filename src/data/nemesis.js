// ─────────────────────────────────────────────────────────────────────────────
// THE NEMESIS — the rival who stops being a row in a table.
//
// Once a competitor is big enough and has lasted long enough, they become a
// person: they watch what you ship, they answer it, and the answers escalate
// as the grudge does. Every move here is a real mechanical effect plus a line
// in their founder's voice, so the antagonist is legible in the Wire rather
// than hidden in a number.
//
// A move is data:
//   id       stable key
//   name     what it is called in the dossier
//   weight   base likelihood, before grudge and personality weighting
//   min      minimum grudge before they will do this
//   only     restrict to these personalities
//   need(S)  extra precondition
//   line     what they post — {you} {them} {founder} {product} are filled in
//   sub      the small grey line under it
//   effect   (S, c) => [label, value] pairs, applied immediately
// ─────────────────────────────────────────────────────────────────────────────

import { clamp } from '../engine/format.js';
import { pick } from '../engine/rng.js';

export const MOVES = [
  {
    id: 'mirror', name: 'Shipped your feature', weight: 1.0, min: 0,
    only: ['copycat', 'blitz', 'giant', 'shark'],
    need: (S) => (S.products[0]?.features?.length || 0) >= 3,
    line: () => pick([
      'shipped the thing everyone has been asking {you} for. took a weekend.',
      'we heard you. {them} ships what {you} has been promising since spring.',
      'new in {them} today: the feature {you} demoed. ours is free.',
    ]),
    sub: 'A straight copy, out before yours matured.',
    effect: (S) => {
      const p = S.products[0];
      if (p) { p.appeal = clamp(p.appeal - 0.035, 0, 5); p.awareness = Math.max(0, (p.awareness || 0) * 0.94); }
      return [['appeal', -0.035], ['awareness', -6]];
    },
  },
  {
    id: 'undercut', name: 'Undercut your price', weight: 0.9, min: 0.5,
    only: ['blitz', 'giant', 'zealot', 'shark'],
    need: (S) => (S.products[0]?.price || 0) > 5,
    line: () => pick([
      '{them} is now half the price of {you}. same benchmarks. we published ours.',
      'we do not think software should cost what {you} charges for it.',
      'pricing update: {them} is free under 10 seats. {you} is not.',
    ]),
    sub: 'Price pressure. Churn rises until you answer it.',
    effect: (S) => {
      S.market.priceSiege = Math.max(S.market.priceSiege || 0, 26);
      return [['churn pressure', 1]];
    },
  },
  {
    id: 'benchmark', name: 'Published a benchmark', weight: 0.85, min: 0.3,
    line: () => pick([
      'we benchmarked {them} against {you}. we win on eight of nine. methodology in the repo.',
      'numbers, not vibes: {them} is 3.1x faster than {you} on the workload people actually run.',
      'published the comparison {you} would not. draw your own conclusions.',
    ]),
    sub: 'Selective, defensible, and effective.',
    effect: (S) => {
      S.resources.reputation = Math.max(0, S.resources.reputation * 0.965);
      return [['reputation', -Math.round(S.resources.reputation * 0.035)]];
    },
  },
  {
    id: 'poach', name: 'Came for your people', weight: 0.8, min: 1.0,
    only: ['shark', 'blitz', 'giant'],
    need: (S) => (S.agents?.length || 0) >= 2,
    line: () => pick([
      'we are hiring. specifically, we are hiring from {you}. ask me how.',
      'two of the best engineers I have met this year came from {you} this month.',
      '{them} is paying above market for anyone who has shipped against us.',
    ]),
    sub: 'Morale takes the hit even when nobody leaves.',
    effect: (S) => {
      let hit = 0;
      for (const a of S.agents || []) { a.morale = clamp((a.morale ?? 1) - 0.08, 0.1, 1); hit++; }
      return [['morale', -8 * Math.min(1, hit)]];
    },
  },
  {
    id: 'fud', name: 'Briefed a journalist', weight: 0.7, min: 1.4,
    only: ['shark', 'giant'],
    line: () => pick([
      'happy to talk to anyone writing about how {you} handles data. off the record, obviously.',
      'somebody should look at what {you} actually runs in production. just saying.',
      'I have been asked a lot about {you} this week. I have been very fair about it.',
    ]),
    sub: 'Nothing actionable. All of it sticks.',
    effect: (S) => {
      S.world.regulatoryHeat = clamp((S.world.regulatoryHeat || 0) + 3.5, 0, 100);
      S.world.publicOpinion = clamp((S.world.publicOpinion || 0.5) - 0.012, 0, 1);
      return [['reg. heat', 3.5], ['approval', -1.2]];
    },
  },
  {
    id: 'channel', name: 'Locked a channel', weight: 0.6, min: 1.8,
    only: ['giant', 'blitz'],
    line: () => pick([
      'signed an exclusive with the biggest reseller in the category. good luck.',
      '{them} is now the default in three distributions {you} used to own.',
      'distribution beats product. we bought the distribution.',
    ]),
    sub: 'Organic growth is throttled while it holds.',
    effect: (S) => {
      S.market.channelLock = Math.max(S.market.channelLock || 0, 34);
      return [['growth', -1]];
    },
  },
  {
    id: 'open_source', name: 'Gave it away', weight: 0.75, min: 0.8,
    only: ['zealot', 'craft'],
    line: () => pick([
      'open sourced the whole thing today. Apache 2. no strings, no {you}.',
      'we published the weights. {you} publishes a pricing page.',
      'the community version does 80% of what {you} charges for. it is on GitHub.',
    ]),
    sub: 'Hard to compete with free, and they know it.',
    effect: (S) => {
      S.market.priceSiege = Math.max(S.market.priceSiege || 0, 20);
      S.resources.reputation = Math.max(0, S.resources.reputation * 0.98);
      return [['fair price', -1], ['reputation', -2]];
    },
  },
  {
    id: 'raise', name: 'Raised against you', weight: 0.65, min: 0.4,
    line: () => pick([
      'raised. the deck was mostly about {you}. investors like a villain.',
      'new round closed. we told them exactly who we are taking the market from.',
      'funded. we are going to spend all of it on the {cat} category.',
    ]),
    sub: 'War chest. They can afford to lose money at you for years.',
    effect: (S, c) => { c.funding += c.mrr * 26 + 4e6; c.growth *= 1.16; return [['their runway', 1]]; },
  },
  {
    id: 'respect', name: 'Said something true', weight: 0.4, min: 0,
    line: () => pick([
      'credit where it is due: what {you} shipped this week is genuinely good.',
      'I do not like losing to {you} but the work is real.',
      'we studied the {you} architecture for a month. it is better than ours.',
    ]),
    sub: 'Rivalry is not always hostility.',
    effect: (S) => { S.resources.reputation += 14; return [['reputation', 14]]; },
  },
];

export const MOVE_MAP = Object.fromEntries(MOVES.map((m) => [m.id, m]));

// What the dossier says about the state of the feud.
export const GRUDGE_BANDS = [
  { at: 0.0, name: 'Aware of you', note: 'They know the name. Nothing personal yet.' },
  { at: 0.8, name: 'Competing', note: 'You are on their roadmap slides.' },
  { at: 1.6, name: 'Personal', note: 'They are optimising against you specifically.' },
  { at: 2.6, name: 'At war', note: 'Every move they make is aimed at your throat.' },
];

export function grudgeBand(v) {
  let out = GRUDGE_BANDS[0];
  for (const b of GRUDGE_BANDS) if (v >= b.at) out = b;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTERS — what you can do back.
//
// A rivalry where only one side acts is weather with a name. Each counter costs
// something real, answers a specific kind of move, and changes the grudge. None
// of them are strictly good: hitting back makes them hit harder.
//
//   need(S, c)  precondition
//   cost(S, c)  { cash, code, reputation, focus } — checked and spent
//   do(S, c)    apply it; return the line the player reads
// ─────────────────────────────────────────────────────────────────────────────

export const COUNTERS = [
  {
    id: 'answer_benchmark', name: 'Publish your own numbers',
    desc: 'Reproduce their benchmark honestly, including where you lose.',
    costLabel: '400 code · 6 focus',
    cost: () => ({ code: 400, focus: 6 }),
    need: (S) => (S.resources.code || 0) >= 400,
    do: (S, c) => {
      S.resources.reputation += 90;
      S.world.publicOpinion = clamp((S.world.publicOpinion || 0.5) + 0.02, 0, 1);
      return `You reproduce their suite, publish the harness, and mark the two cases where ${c.name} genuinely wins. Nobody expected the second part. It is the part that gets quoted.`;
    },
  },
  {
    id: 'break_siege', name: 'Match the price, briefly',
    desc: 'Eat the margin until their war chest blinks. Ends a price war.',
    costLabel: 'cash — scales with their funding',
    cost: (S, c) => ({ cash: Math.max(2e6, Math.min((c?.funding || 0) * 0.35, S.company.cash * 0.55)) }),
    need: (S) => (S.market.priceSiege || 0) > 0,
    do: (S, c) => {
      S.market.priceSiege = 0;
      c.funding *= 0.62;
      c.growth *= 0.9;
      return `You hold the line for six weeks. Their burn is worse than yours and both boards now know it. ${c.name} quietly restores its pricing page on a Thursday.`;
    },
  },
  {
    id: 'break_channel', name: 'Buy the channel back',
    desc: 'Outbid them on the distribution they locked up.',
    costLabel: 'cash — a lot of it',
    cost: (S) => ({ cash: Math.max(5e6, S.company.cash * 0.09) }),
    need: (S) => (S.market.channelLock || 0) > 0,
    do: (S, c) => {
      S.market.channelLock = 0;
      return `Exclusives have a price and it turns out this one was payable. The reseller is apologetic in a way that costs them nothing and you both understand the arrangement perfectly.`;
    },
  },
  {
    id: 'poach_back', name: 'Hire their best people',
    desc: 'Take the four engineers who built the thing that beat you.',
    costLabel: 'cash · +grudge',
    cost: (S) => ({ cash: Math.max(3e6, S.company.cash * 0.06) }),
    need: (S, c) => (c?.users || 0) > 0,
    do: (S, c) => {
      c.quality = Math.max(0.1, c.quality * 0.88);
      c.growth *= 0.93;
      for (const a of S.agents || []) a.morale = clamp((a.morale ?? 1) + 0.05, 0, 1);
      return `Four offers, three accepted, one of them the person who wrote the benchmark. ${c.name} will remember this specifically and for a long time.`;
    },
    grudge: 0.45,
  },
  {
    id: 'detente', name: 'Call them',
    desc: 'No deal, no press. Just a conversation between two people who are tired.',
    costLabel: 'costs nothing you can measure',
    cost: () => ({}),
    need: (S, c) => (S.market.nemesis?.grudge || 0) >= 1.4,
    do: (S, c) => {
      // The grudge move itself is applied by the counter wrapper (`grudge`
      // below) — doing it here as well would count it twice.
      S.market.priceSiege = 0;
      S.resources.reputation += 20;
      return `It lasts forty minutes and neither of you mentions the benchmark. Near the end ${c.founder} says "I do not actually want to do this for another five years" and you say "no" and that is the whole agreement.`;
    },
    grudge: -1.1,
  },
];

export const COUNTER_MAP = Object.fromEntries(COUNTERS.map((c) => [c.id, c]));
