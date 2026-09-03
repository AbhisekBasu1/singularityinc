// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY VOCABULARIES — the eight companies this deck can be about.
//
// The first real decision a player makes is what to build, and until now the
// deck forgot it about ninety seconds later. Every card named the same
// technical part: nullptr's first comment was about a caching layer whether you
// were shipping a CLI or moving somebody's payroll, the outage took down "the
// API", and Sam's list of eleven things was a list about nothing in particular.
//
// So: one small table per category, and `cw(S, key)` reads the active product's
// own row. A card interpolates it instead of naming a caching layer, and the
// fintech founder's ARIA writes about the ledger while the marketplace founder's
// writes about the matching engine — same card, same effects, same beat.
//
// A dozen keys and nullptr's, and what each is for:
//
//   layer      the technical part. The thing an outsider would name if they
//              wanted you to know they had actually looked.
//   thing      what the founder calls the product in ordinary speech.
//   unit       the unit of work, bare and singular, so a card can write
//              "every ${unit}". Consonant-initial on purpose: prose says
//              "a ${unit}" in several places and no card should have to
//              reason about an article.
//   units      the plural, written down rather than derived — "matches" is not
//              "match" + "s" and the day one of these is irregular is the day
//              somebody ships "matchs".
//   customer   who buys it, singular and concrete. Never "user".
//   customers  the plural.
//   bug        the failure this category has that the other seven do not.
//   metric     the number the customer actually watches.
//   regulator  who circles, with the article attached — the sentence usually
//              wants "…writes to you", not "the a state attorney general".
//   venue      where a launch lands.
//   night      what wakes you at 2am.
//   copy       what a competitor takes first.
//   npnote     the one thing `nullptr` says first. It is the only key written
//              in somebody's voice rather than the game's: lowercase, exact,
//              a claim about a failure mode that has not happened yet, no
//              explanation offered. It carries the whole conceit of that
//              account — that a stranger has read a system they cannot see —
//              so it has to be technically true of *this* category and of no
//              other, and it has to end before it explains itself.
//
// House rule: everything here is a fragment, never a sentence. It is dropped
// mid-line into prose somebody else wrote, so nothing may carry a capital or a
// full stop, and nothing may be so long that the sentence around it breaks its
// back. Read one out loud inside `e_hn_launch` before adding it.
// ─────────────────────────────────────────────────────────────────────────────
import { activeProduct } from '../engine/state.js';

export const CAT_WORDS = {
  devtools: {
    layer: 'caching layer',
    thing: 'the CLI',
    unit: 'build', units: 'builds',
    customer: 'developer', customers: 'developers',
    bug: 'a flag that silently does the opposite of what its name says',
    metric: 'cold-start time',
    regulator: 'a standards body nobody has heard of',
    venue: 'the orange site',
    night: 'the artefact cache',
    copy: 'your config format',
    npnote: 'the cache key does not include the lockfile hash. it will not matter until somebody bumps a transitive dep',
  },
  b2b: {
    layer: 'reporting pipeline',
    thing: 'the dashboard',
    unit: 'report', units: 'reports',
    customer: 'operations lead', customers: 'operations leads',
    bug: 'a number that is right all month and wrong on the first',
    metric: 'how long the month-end close takes',
    regulator: 'a data-protection authority in a country with two of your customers in it',
    venue: 'a procurement newsletter nobody admits to reading',
    night: 'the nightly export',
    copy: 'your pricing page, tier for tier',
    npnote: 'your month-end close reads the same table it writes. it will not matter until two of them overlap',
  },
  consumer: {
    layer: 'feed ranker',
    thing: 'the app',
    unit: 'session', units: 'sessions',
    customer: 'stranger', customers: 'strangers',
    bug: 'a ranker that shows the same three things to everybody for six hours',
    metric: 'how fast the first screen paints',
    regulator: 'a child-safety commissioner',
    venue: 'a fifteen-second video somebody else made',
    night: 'the push queue',
    copy: 'your onboarding, screen for screen',
    npnote: 'the ranker ties on recency and breaks the tie by insertion order. everybody is about to see the same three things',
  },
  agents: {
    layer: 'agent runtime',
    thing: 'the agent',
    unit: 'task run', units: 'task runs',
    customer: 'team lead', customers: 'team leads',
    bug: 'a run that reports success and did nothing at all',
    metric: 'how often a run finishes without a person in it',
    regulator: 'an agency with a three-word name and no precedent to work from',
    venue: 'a demo video that runs unedited for four minutes',
    night: 'a run that will not stop',
    copy: 'your tool schema',
    npnote: 'the runtime counts a tool timeout as a tool success. it will not matter until a tool is slow',
  },
  marketplace: {
    layer: 'matching engine',
    thing: 'the market',
    unit: 'match', units: 'matches',
    customer: 'seller', customers: 'sellers',
    bug: 'a match that is perfect and forty miles away',
    metric: 'time to first match',
    regulator: 'a state attorney general',
    venue: 'a local forum with four moderators and a grudge',
    night: 'the payouts job',
    copy: 'your fee structure',
    npnote: 'the matcher scores distance after it scores price. that is the wrong order and it will cost you the first hundred',
  },
  fintech: {
    layer: 'ledger',
    thing: 'the rails',
    unit: 'transfer', units: 'transfers',
    customer: 'bookkeeper', customers: 'bookkeepers',
    bug: 'a rounding error that only exists at month end',
    metric: 'how long the money takes to land',
    regulator: 'the banking regulator',
    venue: 'a compliance conference in a hotel basement',
    night: 'the reconciliation job',
    copy: 'your risk rules',
    npnote: 'settlement is idempotent and the ledger write is not. it will not matter until a retry lands on a Friday',
  },
  infra: {
    layer: 'API gateway',
    thing: 'the API',
    unit: 'request', units: 'requests',
    customer: 'platform engineer', customers: 'platform engineers',
    bug: 'a retry storm that turns one slow call into forty thousand',
    metric: 'p99 latency',
    regulator: 'a critical-infrastructure directorate',
    venue: 'a status page and a changelog',
    night: 'a region',
    copy: 'your API surface, endpoint for endpoint',
    npnote: 'the backoff is unjittered and the write path it retries into is not idempotent. it will not matter until you have real load',
  },
  media: {
    layer: 'render pipeline',
    thing: 'the generator',
    unit: 'render', units: 'renders',
    customer: 'creator', customers: 'creators',
    bug: 'a render with six fingers on it that nobody catches until it is public',
    metric: 'time to first frame',
    regulator: 'a copyright office',
    venue: 'a screenshot somebody posted without crediting you',
    night: 'the render farm',
    copy: 'your prompt presets',
    npnote: 'you cache the seed and not the model version. two renders will differ and nobody will be able to say why',
  },
};

// The category a card should speak in. Before a product exists — the opening
// beats, a probe state in a harness, a save from before categories — this is
// `devtools`, because that row is the one every other row was written against.
export function catOf(S) {
  let p = null;
  try { p = activeProduct(S) || S?.products?.[0] || null; } catch { p = S?.products?.[0] || null; }
  const id = p?.category;
  return id && CAT_WORDS[id] ? id : 'devtools';
}

// One word from the active product's row. A missing key falls back to devtools
// rather than printing `undefined` into a card, which is the failure mode
// `tools/copylint.mjs` and `tools/uitest.mjs` both go looking for.
export function cw(S, key) {
  const row = CAT_WORDS[catOf(S)] || CAT_WORDS.devtools;
  return row[key] ?? CAT_WORDS.devtools[key] ?? '';
}

// The category's own name, for the handful of lines that want to say it.
export function catIs(S, ...ids) { return ids.includes(catOf(S)); }
