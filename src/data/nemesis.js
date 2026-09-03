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
//   line     what they post — {you} {them} {founder} {product} {agent} are
//            filled in; a function receives (S, c, ctx) with what the move did
//   sub      the small grey line under it
//   effect   (S, c, m, sys) => [label, value] pairs, applied immediately. `m`
//            is the modifier table (repDamage scales what a move costs you);
//            `sys` is what a move may reach into the game with, the way a card
//            reaches through `fx` — this file never imports a system.
// ─────────────────────────────────────────────────────────────────────────────

import { clamp } from '../engine/format.js';
import { pick } from '../engine/rng.js';
import { MARKET } from './balance.js';

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
    effect: (S, c, m) => {
      const share = 0.035 * (m?.repDamage ?? 1);   // Crisis Comms, Untouchable
      const lost = Math.round(S.resources.reputation * share);
      S.resources.reputation = Math.max(0, S.resources.reputation * (1 - share));
      return [['reputation', -lost]];
    },
  },
  {
    id: 'poach', name: 'Came for your people', weight: 0.8, min: 1.0,
    only: ['shark', 'blitz', 'giant'],
    need: (S) => (S.agents?.length || 0) >= 2,
    line: (S, c, ctx) => ctx?.poached ? pick([
      '{agent} starts with us on monday. we did not have to ask twice.',
      'welcome {agent}. {you} built something good and then stopped looking after the people who built it.',
      '{agent} came from {you} this week. ask it why.',
    ]) : pick([
      'we are hiring. specifically, we are hiring from {you}. ask me how.',
      'made {agent} an offer this week. it said no. it took a while to say no.',
      '{them} is paying above market for anyone who has shipped against us.',
    ]),
    sub: 'A name, an offer, and a few days before they answer it.',
    effect: (S, c, m, sys) => sys.poach(S, c),
  },
  {
    // §H13. A named target and a few days to answer it. The move opens the
    // approach; `systems/nemesis.js` resolves it, and until it does the
    // counter list has something in it that is actually about this week.
    id: 'sabotage', name: 'Went after the product', weight: 0.5, min: 1.6,
    only: ['shark', 'giant'],
    need: (S) => !!(S.products || []).some((p) => p.launched),
    line: (S, c, ctx) => pick([
      'somebody is going to find out how {product} handles load this month. not us, obviously.',
      'interesting week ahead for {product}. that is all I am going to say about it.',
      'we have been reading the {product} status page with real interest lately.',
    ]),
    sub: 'They have named a target. There are a few days to answer it.',
    effect: (S, c, m, sys) => sys.sabotage(S, c),
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
    effect: (S, c, m) => {
      S.market.priceSiege = Math.max(S.market.priceSiege || 0, 20);
      const share = 0.02 * (m?.repDamage ?? 1);
      S.resources.reputation = Math.max(0, S.resources.reputation * (1 - share));
      return [['fair price', -1], ['reputation', -Math.round(share * 100)]];
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
    // Growth compounds here and nowhere else, and a feud can raise many times
    // in a run — a chair pressing it every week could — so it stops at the
    // ceiling the market gives any rival.
    effect: (S, c) => {
      c.funding += c.mrr * 26 + 4e6;
      c.growth = Math.min((c.growth || 0) * 1.16, MARKET.RIVAL_GROWTH_CAP);
      return [['their runway', 1]];
    },
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

// ─────────────────────────────────────────────────────────────────────────────
// §A14 THE SEASON — what they are trying to do, for the next few months.
//
// A rival that draws from a pool with no objective is weather with a founder's
// name on it. Each season they pick a goal, say something in the Wire that
// gives it away without naming it, weight their moves toward it, and at the end
// of the season somebody has won that argument. Intelligence agents on
// Operations read the goal outright; without them the founder has the
// telegraph and whatever they can infer from what the rival keeps doing.
//
//   pick(S, c)          → { key, label } or null when the goal has no target
//   telegraph(S,c,t)    → the line they post when the season opens
//   favours             → move ids this goal weights up
//   judge(S, c, t, se)  → did they get it? (`se` is the season record)
//   won / lost          → the line the season closes on
//
// This file never imports a system: `t` is handed in by `systems/nemesis.js`.
// ─────────────────────────────────────────────────────────────────────────────
export const GOALS = [
  {
    id: 'category', name: 'Your best line', weight: 1.2,
    sub: 'They want the category you are known for.',
    pick: (S) => { const p = (S.products || []).filter((x) => x.launched)
                     .sort((a, b) => (b.mrr || 0) - (a.mrr || 0))[0];
                   return p ? { key: p.id, label: p.category } : null; },
    telegraph: (S, c, t) => `we have decided to be the best ${t.label} company in the world. that is the whole plan. that is the whole post.`,
    favours: ['mirror', 'undercut', 'benchmark', 'open_source'],
    // Their share of the category is the honest test: did the product you are
    // known for lose ground while they were pointed at it?
    judge: (S, c, t, se) => c.users > (se.mark || 0) * 1.25,
    won: (S, c, t) => `A quarter of pointing everything at ${t.label} has worked for them: they finish it larger than they started, and the comparison articles have stopped putting you first.`,
    lost: (S, c, t) => `They spent a season on ${t.label} and came out of it where they went in. Somebody there has started using the phrase "next year".`,
  },
  {
    id: 'people', name: 'A name on your roster', weight: 1.0,
    sub: 'They want a specific person, and they have said so in every way but the name.',
    pick: (S) => { const a = (S.agents || []).filter((x) => x.status === 'active')
                     .sort((x, y) => (y.level || 0) - (x.level || 0))[0];
                   return a ? { key: a.id, label: a.name } : null; },
    telegraph: () => 'hiring update: we are done building teams from scratch. we are going to hire the four people who already did it somewhere else. two of them have replied.',
    favours: ['poach', 'raise', 'fud'],
    judge: (S, c, t) => !(S.agents || []).some((a) => a.id === t.key && a.status === 'active'),
    won: (S, c, t) => `${t.label} took the offer. The season was about one person and they got them, and everybody left knows which desk is empty.`,
    lost: (S, c, t) => `${t.label} stayed. They ran a whole season at one person and that person is still here, which is a fact the rest of the roster has noticed.`,
  },
  {
    id: 'bloc', name: 'A market you are in', weight: 1.0,
    sub: 'They want a bloc, and they are willing to be patient about it.',
    pick: (S) => { const held = Object.entries(S.world?.regions || {})
                     .filter(([, v]) => v.stage !== 'none').map(([k]) => k);
                   return held.length ? { key: held[held.length - 1], label: held[held.length - 1] } : null; },
    telegraph: () => 'the next billion users are not where the last billion were. we have opened an office. we are not saying where yet.',
    favours: ['channel', 'undercut', 'raise'],
    judge: (S, c, t) => !!S.world?.regionRivals?.[t.key],
    won: (S, c, t, se) => `They are in ${se.regionName || 'the bloc'} now, with a building and a ministry liaison. It took them a season and they did not once say your name.`,
    lost: (S, c, t, se) => `Whatever they were trying to arrange in ${se.regionName || 'that bloc'} did not arrange itself. Their regional lead is back at head office with a new title.`,
  },
  {
    id: 'story', name: 'The story about you', weight: 0.9,
    sub: 'They do not want your customers. They want to be the ones who are believed.',
    pick: () => ({ key: 'story', label: 'the story' }),
    telegraph: () => 'we are going to stop talking about the competition and start publishing everything. numbers, failures, the lot. let people decide who is honest.',
    favours: ['fud', 'benchmark', 'respect', 'open_source'],
    judge: (S, c, t, se) => (S.resources.reputation || 0) < (se.mark || 0) * 0.95,
    won: () => 'The season ends with two profiles in the same week, and neither of them is about you. That was the objective and they hit it.',
    lost: () => 'They spent a season trying to be the honest one and it did not take. The pieces that ran were about the pieces, which is the worst outcome available to a press strategy.',
  },
];

export const GOAL_MAP = Object.fromEntries(GOALS.map((g) => [g.id, g]));

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

// ── §H13 What is on the table right now ─────────────────────────────────────
// A pending approach: a name they have gone after, or a product they have
// named, with a few days on it. `systems/nemesis.js` opens and resolves it;
// this is a pure read of the state so the two counters below can be data like
// every other counter. `when` is what keeps them off the Market view entirely
// when there is nothing on the table — a permanently greyed row that is
// *usually* meaningless teaches the founder to stop reading the list.
const onTable = (S, kind) => {
  const p = S?.market?.nemesis?.pending;
  if (!p || p.countered) return null;
  if (kind && p.kind !== kind) return null;
  return (S.time?.day ?? 0) <= p.counterUntil ? p : null;
};

// The line a founder reads when the approach is visible at all. Named by lane
// and never by person: what Intelligence buys is "they are in your infra team
// this week", not a name badge.
export const APPROACH = {
  poach: [
    'Somebody at {them} has been in the {lane} team\'s inboxes since Tuesday. The message is the same message and the number in it is not.',
    'Two of your {lane} people have had the same recruiter call this week. It is a good offer and it is meant to be found out about.',
    'A {them} recruiter has worked out who on {lane} is unhappy, which means somebody told them.',
  ],
  sabotage: [
    'Traffic against {product} from four addresses that do not resolve to anything. Not enough to hurt. Enough to map.',
    'Somebody is walking {product} end to end, slowly, at three in the morning, and being careful about it.',
    'A vulnerability report about {product} arrives from a researcher who does not exist and knows the codebase.',
  ],
};
export const APPROACH_META = 'Intelligence · a few days before it lands';

export const COUNTERS = [
  {
    id: 'counter_offer', name: 'Match what they offered',
    desc: 'Pay to keep the person they are in the middle of hiring away from you.',
    costLabel: 'cash — a quarter of what they already draw',
    when: (S) => !!onTable(S, 'poach'),
    cost: (S) => ({ cash: onTable(S, 'poach')?.keepCost || 0 }),
    need: (S) => !!onTable(S, 'poach'),
    do: (S, c) => {
      const p = onTable(S, 'poach');
      if (!p) return 'The offer was withdrawn before you could answer it.';
      p.countered = true;
      return `You do not pretend it is about anything but money, which ${p.name} appreciates more than a speech would have. ${c.name} will find out what you paid within a fortnight, and the number is now the number.`;
    },
    grudge: 0.12,
  },
  {
    id: 'harden', name: 'Harden the target',
    desc: 'Two weeks of the roster on the thing they have decided to break.',
    costLabel: 'code · focus',
    when: (S) => !!onTable(S, 'sabotage'),
    cost: (S) => ({ code: onTable(S, 'sabotage')?.code || 0, focus: onTable(S, 'sabotage')?.focus || 0 }),
    need: (S) => !!onTable(S, 'sabotage'),
    do: (S) => {
      const p = onTable(S, 'sabotage');
      if (!p) return 'Whatever they were looking at, they have stopped looking at it.';
      p.countered = true;
      return `Rate limits, a rotation, and a fortnight of somebody reading their own logs properly for the first time. When it comes — and it comes — most of it lands on a wall you built on a Wednesday.`;
    },
    grudge: 0.06,
  },
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
