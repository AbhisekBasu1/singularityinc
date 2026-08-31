// ─────────────────────────────────────────────────────────────────────────────
// THE RULES OF THE WORLD
//
// Pure. No state is written here and no tool is called; every refusal the
// assistant ever sees is produced by this file, which is why every problem
// carries the rule that stopped it, the limit, what it got, and a fix it can
// act on without asking.
//
// The order matters. Structural problems (wrong shape, unknown key, a character
// nobody has met) stop the check immediately, because the rest of the rules
// cannot be evaluated against something malformed. Limit problems (a number
// over its ceiling, prose too long) are all collected, so a card that is over
// on three axes comes back with three fixes rather than three round trips.
// ─────────────────────────────────────────────────────────────────────────────
import { WORLD_AUTHOR as W, EVENTS as EV } from '../data/balance.js';
import { EFFECT_KEYS, EFFECT_KEY_LIST, isAdverse } from './effects.js';
import { CHARACTERS } from '../data/characters.js';
import { diffMods } from '../data/difficulty.js';
import { rel, hasResearch } from '../engine/state.js';
import { totalUsers } from '../systems/product.js';
import { burnPerDay, runwayDays } from '../systems/economy.js';
import { money, fmt } from '../engine/format.js';

export const TONES = ['neutral', 'good', 'risky', 'cruel', 'costly'];
export const KINDS = ['story', 'crisis', 'opportunity', 'character'];

const problem = (path, rule, fix, extra = {}) => ({ path, rule, fix, ...extra });

// ── What the world may do, right now ────────────────────────────────────────

export function actOf(S) { return Math.min(5, Math.max(1, S?.company?.act || 1)); }

export function worldHand(S) {
  const m = diffMods(S) || {};
  return Number.isFinite(m.worldHand) ? m.worldHand : 1;
}

// Tones the founder's own play has taken away.
export function allowedTones(S) {
  const earned = S?.doctrines?.earned || {};
  return TONES.filter((t) => !(t === 'cruel' && earned.beloved));
}

// Effect keys the founder's own play has taken away.
export function allowedKeys(S) {
  const earned = S?.doctrines?.earned || {};
  return EFFECT_KEY_LIST.filter((k) => {
    if (k === 'debt' && earned.zero_entropy) return false;   // the codebase stopped fighting you
    // No race yet, or one already decided: nothing for the key to move.
    if (k === 'race' && (!S?.world?.race || S.world.race.crossed)) return false;
    if (capFor(S, k, 'good') <= 0) return false;             // an act where the key does not exist yet
    return true;
  });
}

// The ceiling on one key for one tone, after act, difficulty and any held
// directive. Returns a positive magnitude. `dir` picks the table: what the
// world may take from the founder is a different number from what it may give
// them, because in the written game those are different numbers.
export function capFor(S, key, tone = 'neutral', dir = 'any') {
  const table = dir === 'take' ? W.TAKE : dir === 'give' ? W.GIVE : W.CAPS;
  const base = table[actOf(S)]?.[key];
  if (!Number.isFinite(base)) return 0;
  const toneMult = W.TONE_CAP_MULT[tone] ?? 1;
  const fortify = S?.company?.directive === 'fortify' ? W.FORTIFY_CAP_MULT : 1;
  const v = base * worldHand(S) * toneMult * fortify;
  // Ratios keep their precision; counts round to something a person would write.
  return EFFECT_KEYS[key]?.unit === 'ratio' ? Math.round(v * 1000) / 1000 : Math.round(v);
}

// A compact table for the tool description and for the refusal's `next`.
export function capSummary(S, tone = 'neutral', keys = ['cash', 'rep', 'users', 'align', 'heat']) {
  return keys.map((k) => {
    const c = capFor(S, k, tone, 'take');
    if (!c) return null;
    return `${k} ±${EFFECT_KEYS[k].unit === 'money' ? money(c) : EFFECT_KEYS[k].unit === 'ratio' ? c : fmt(c)}`;
  }).filter(Boolean).join(', ');
}

// ── Who may be voiced ───────────────────────────────────────────────────────

export function metCharacters(S) {
  const out = [];
  for (const id of Object.keys(CHARACTERS)) {
    if (W.NEVER_VOICED.includes(id)) continue;
    if (id === 'helix' && !hasResearch('own_foundation_model', S)) continue;
    const met = !!rel(id, S)?.met;
    const always = W.ALWAYS_AVAILABLE.includes(id) && totalUsers(S) > 0;
    if (met || always) out.push(id);
  }
  return out;
}

// ── Rate limits ─────────────────────────────────────────────────────────────

function recent(S, bucket) {
  return (S?.world?.author?.recent?.[bucket] || []).slice();
}

export function cardsLeft(S) {
  const since = S.time.day - W.CARD_WINDOW_DAYS;
  const used = recent(S, 'cardDays').filter((d) => d > since).length;
  return Math.max(0, W.MAX_CARDS_PER_WINDOW - used);
}
export function postsLeftToday(S) {
  const since = S.time.day - 1;
  const used = recent(S, 'postDays').filter((d) => d > since).length;
  return Math.max(0, W.MAX_POSTS_PER_DAY - used);
}
export function shocksLeft(S) {
  const since = S.time.day - W.SHOCK_WINDOW_DAYS;
  const used = recent(S, 'shockDays').filter((d) => d > since).length;
  return Math.max(0, W.MAX_SHOCKS_PER_WINDOW - used);
}

// The real-time floor exists so that running the clock at 5× does not turn the
// game into a slideshow of modals. It only applies to a live session.
function realFloorOk(S) {
  if (!S?.meta?.realtime) return true;
  const since = Date.now() - (S.narrative?.lastEventReal || 0);
  return since >= EV.MIN_REAL_SECONDS * 1000;
}

// ── The cash floor ──────────────────────────────────────────────────────────
// One number, asked three ways: what is the most the world may take right now?
// Whichever of the three bounds bites first is the answer, and the refusal says
// which one it was, so the assistant can write a smaller card rather than guess.

export function cashFloor(S) {
  const cash = Math.max(0, S.company.cash);
  const share = cash * W.CASH_SHARE_MAX;

  // Never inside the runway floor. If the founder is already there, the world's
  // hands come off the money entirely.
  const burn = Math.max(1, burnPerDay(S));
  const keep = burn * W.RUNWAY_FLOOR_DAYS;
  const aboveFloor = Math.max(0, cash - keep);

  // And a rolling budget, so a hundred small cards cannot do what one large one
  // may not.
  const taken = takenIn(S, 'cash');
  const budgetLeft = Math.max(0, cash * W.DRAIN_SHARE - taken);

  const limit = Math.min(share, aboveFloor, budgetLeft);
  const which = limit === aboveFloor ? 'runway' : limit === budgetLeft ? 'drain' : 'share';
  // A profitable company has infinite runway, and Infinity is not JSON: it
  // serialises to null, and the payload guard rejects it outright. Say the
  // thing a person would say instead.
  const days = runwayDays(S);
  return { limit: Math.floor(limit), which,
           runway: Number.isFinite(days) ? Math.round(days) : null,
           taken: Math.round(taken) };
}

// How much of one key the world has already taken inside the rolling window.
export function takenIn(S, key, window = W.DRAIN_WINDOW_DAYS) {
  const since = S.time.day - window;
  return (S?.world?.author?.recent?.taken || [])
    .filter(([d, k]) => k === key && d > since)
    .reduce((a, [, , v]) => a + Math.abs(v), 0);
}

// How much of a stock-like resource the founder is holding right now. Used to
// make the rolling budget proportional rather than absolute.
export function stockOf(S, key) {
  const p = S.products?.find((x) => x.launched) || S.products?.[0];
  switch (key) {
    case 'rep': return S.resources.reputation;
    case 'code': return S.resources.code;
    case 'insight': return S.resources.insight;
    case 'research': return S.resources.research;
    case 'influence': return S.resources.influence;
    case 'users': return totalUsers(S);
    case 'awareness': return p?.awareness || 0;
    default: return null;
  }
}

// What is left of the budget for one key, and when the oldest of it expires.
//
// Tone is deliberately not a parameter. A cruel choice may go further than a
// neutral one *on that card* — the button colour is a promise, and it pays for
// itself. It must not also widen the window, or the world simply marks
// everything cruel and the rolling budget stops meaning anything.
export function budgetFor(S, key) {
  // A run-long budget: the whole run is the window, both directions count,
  // and nothing comes back. The race is decided by under twenty-five points,
  // so a monthly allowance on it would be the world deciding the race.
  const run = W.RUN_BUDGET?.[key];
  if (run != null) {
    const used = takenIn(S, key, Infinity);
    return { left: Math.max(0, run - used), allowance: run, used, backOn: null, run: true };
  }
  const cap = capFor(S, key, 'neutral', 'take');
  let allowance = cap * W.WINDOW_MULT;
  if (W.STOCK_KEYS.includes(key)) {
    const stock = stockOf(S, key);
    if (Number.isFinite(stock)) {
      const floor = W.STOCK_FLOOR[key] ?? 0;
      allowance = Math.min(allowance, Math.max(0, (stock - floor) * W.STOCK_SHARE));
    }
  }
  const used = takenIn(S, key);
  const since = S.time.day - W.DRAIN_WINDOW_DAYS;
  const oldest = (S?.world?.author?.recent?.taken || [])
    .filter(([d, k]) => k === key && d > since).map(([d]) => d).sort((a, b) => a - b)[0];
  return { left: Math.max(0, allowance - used), allowance, used,
           backOn: oldest != null ? Math.ceil(oldest + W.DRAIN_WINDOW_DAYS) : null };
}

// The most the world may take in cash right now, all four bounds considered,
// and which of them is the binding one.
export function cashLimit(S, tone = 'neutral') {
  const f = cashFloor(S);
  const cap = capFor(S, 'cash', tone, 'take');
  return cap <= f.limit ? { limit: cap, which: 'cap' } : f;
}

function cashProblem(path, cash, S, tone = 'neutral', scale = 1) {
  const f = cashLimit(S, tone);
  const limit = Math.floor(f.limit * scale);
  if (-cash <= limit) return null;
  if (f.which === 'cap') {
    return problem(path, 'cap', `the world may take at most ${limit} in cash here`,
                   { limit, got: cash });
  }
  const fix = f.which === 'runway'
    ? `${f.runway == null ? 'the runway floor binds here' : `the founder has ${f.runway} days of runway`}`
      + `; nothing the world writes may take them inside ${W.RUNWAY_FLOOR_DAYS} days. Cost them reputation, focus or users instead`
    : f.which === 'drain'
      ? `the world has already taken ${money(f.taken)} in ${W.DRAIN_WINDOW_DAYS} days. Wait, or make the cost something other than money`
      : `no one card may take more than ${Math.round(W.CASH_SHARE_MAX * 100)}% of the cash on hand`;
  return problem(path, f.which === 'share' ? 'cash_share' : f.which === 'runway' ? 'runway_floor' : 'cash_drain',
                 fix, { limit: -limit, got: cash });
}

// ── Shared checks ───────────────────────────────────────────────────────────

const BAD_MARKUP = /[<>]/;
const TOKEN_RE = /\{([a-z]+)\}/g;
const ALLOWED_TOKENS = new Set(['company', 'product', 'founder', 'rival', 'cat', 'users', 'mrr', 'agent', 'handle']);

function checkProse(path, text, max, problems, { tokens = true } = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    problems.push(problem(path, 'required', 'write this field'));
    return;
  }
  if (text.length > max) {
    problems.push(problem(path, 'too_long', `cut ${text.length - max} characters`,
                          { limit: max, got: text.length }));
  }
  if (BAD_MARKUP.test(text)) {
    problems.push(problem(path, 'markup', 'plain prose only — use **bold** and *italic*, not tags'));
  }
  if (tokens) {
    for (const m of text.matchAll(TOKEN_RE)) {
      if (!ALLOWED_TOKENS.has(m[1])) {
        problems.push(problem(path, 'unknown_token',
          `remove {${m[1]}} — the fillable tokens are ${[...ALLOWED_TOKENS].map((t) => '{' + t + '}').join(' ')}`));
      }
    }
  }
}

// Style is advice, never a refusal: a warning rides along with a valid card and
// the assistant can take it or leave it.
// Flags are the world's own continuity markers. They are namespaced on the way
// in, but a 400-character flag or a number is still nonsense, and silently
// dropping one means the assistant plans a callback that will never fire.
function flagProblems(path, v, problems) {
  if (!Array.isArray(v)) {
    problems.push(problem(path, 'type', 'a list of short strings, like ["called_vance"]'));
    return;
  }
  if (v.length > 4) problems.push(problem(path, 'count', 'at most four markers on one choice',
    { limit: 4, got: v.length }));
  v.forEach((f, i) => {
    if (typeof f !== 'string') {
      problems.push(problem(`${path}[${i}]`, 'type', 'a short string', { got: typeof f }));
    } else if (!f.trim() || f.length > 40) {
      problems.push(problem(`${path}[${i}]`, 'too_long', 'between 1 and 40 characters',
        { limit: 40, got: f.length }));
    }
  });
}

// A narrowed ceiling, kept in the key's own units. Zero stays zero: a key
// that is not in play does not come into play by being scaled.
function scaleCap(cap, key, scale) {
  if (scale === 1 || !(cap > 0)) return cap;
  // Floored, never rounded up: a ceiling of two that became one would be a
  // reply moving half of what a card may, when the promise is a third.
  return EFFECT_KEYS[key]?.unit === 'ratio'
    ? Math.floor(cap * scale * 1000) / 1000
    : Math.floor(cap * scale);
}

// One choice's worth of effects, judged against the ceilings, the budgets and
// the cash floor. Cards, proposals and threads all come through here, so the
// shape of a refusal never depends on which door the effects arrived by.
// `scale` narrows every ceiling — a thread is small stakes. Returns how many
// keys actually moved.
function effectProblems(S, at, fx, tone, problems, { char = null, scale = 1, keys = null } = {}) {
  const allowed = keys || new Set(allowedKeys(S));
  let moved = 0;
  for (const [k, v] of Object.entries(fx)) {
    if (k === 'flags') { flagProblems(`${at}.flags`, v, problems); continue; }
    if (k === 'affinity' && !char) {
      // Affinity is how somebody feels about the founder afterwards. With
      // nobody on the card there is no somebody, and it would validate,
      // count as a real movement, and then quietly do nothing.
      problems.push(problem(`${at}.affinity`, 'no_character',
        'nobody is on this card — drop affinity, or put a face on it with `char`'));
      continue;
    }
    if (!allowed.has(k)) {
      problems.push(problem(`${at}.${k}`, 'unknown_key',
        `the world can move: ${[...allowed].join(', ')}`, { got: k }));
      continue;
    }
    if (!Number.isFinite(v)) {
      problems.push(problem(`${at}.${k}`, 'type', 'a signed number', { got: typeof v }));
      continue;
    }
    if (v !== 0) moved++;
    const dir = isAdverse(k, v) ? 'take' : 'give';
    // Cash is judged once, below, against whichever of its four bounds is
    // tightest — so it is not judged twice here.
    if (k === 'cash' && dir === 'take') continue;
    const full = capFor(S, k, tone, dir);
    const cap = scaleCap(full, k, scale);
    if (Math.abs(v) > cap) {
      const other = capFor(S, k, tone, dir === 'take' ? 'give' : 'take');
      problems.push(problem(`${at}.${k}`, 'cap',
        cap > 0
          ? `${dir === 'take' ? 'the world may take' : 'the world may give'} at most ${cap} here`
            + `${tone !== 'cruel' && tone !== 'costly' && scale === 1 ? ' — or mark the choice costly and try again' : ''}`
          : full > 0
            ? `${EFFECT_KEYS[k].label} is too coarse a thing for a reply — put it on a card`
          : other > 0
            ? `the world may ${dir === 'take' ? 'give' : 'take'} ${EFFECT_KEYS[k].label} here, never ${dir} it`
            : `not in play in Act ${actOf(S)}`,
        { limit: cap, got: v }));
    } else if (k !== 'cash' && (isAdverse(k, v) || W.RUN_BUDGET?.[k] != null)) {
      // The rolling budget: the ceiling stops one card being an outlier, this
      // stops a hundred ordinary ones adding up to the same thing.
      const b = budgetFor(S, k);
      if (Math.abs(v) > b.left) {
        problems.push(problem(`${at}.${k}`, 'budget',
          b.run
            ? (b.left > 0
                ? `only ${Math.round(b.left)} of ${b.allowance} left for the whole run — it does not come back`
                : `the world has spent its ${b.allowance} points of ${EFFECT_KEYS[k].label} for this run. The race is theirs to run from here`)
            : b.left > 0
              ? `only ${Math.round(b.left)} left in the last ${W.DRAIN_WINDOW_DAYS} days — take less, or cost them something else`
              : `the world has spent this one${b.backOn ? `; it comes back on day ${b.backOn}` : ''}. Cost them something else`,
          { limit: Math.round(b.left), got: v, ...(b.backOn ? { when: `day ${b.backOn}` } : {}) }));
      }
    }
  }
  // A choice with a cash cost the founder cannot survive is not a choice.
  const cashP = cashProblem(`${at}.cash`, Number(fx.cash) || 0, S, tone, scale);
  if (cashP) problems.push(cashP);
  return moved;
}

function styleWarnings(card) {
  const out = [];
  const all = [card.body, ...(card.choices || []).map((c) => `${c.label} ${c.sub || ''} ${c.outcome || ''}`)].join(' ');
  if (/!/.test(all)) out.push('no exclamation marks — the game never raises its voice');
  if (!/\d/.test(card.body || '')) out.push('one concrete number in the body makes a card land');
  if (/\b(as an AI|language model|ChatGPT|I cannot)\b/i.test(all)) out.push('stay in the world; you are the market, not an assistant');
  if (/\byou will\b/i.test(card.body || '')) out.push('present tense — the card is happening now');
  return out;
}

// ── The card ────────────────────────────────────────────────────────────────

export function validateCard(S, card) {
  const problems = [];

  // Structural: nothing else can be judged until the shape is right.
  if (!card || typeof card !== 'object') {
    return { ok: false, problems: [problem('', 'required', 'send an object with title, body, kind and choices')] };
  }
  if (!KINDS.includes(card.kind)) {
    return { ok: false, problems: [problem('kind', 'enum',
      `use one of ${KINDS.join(', ')} — milestones are authored, not written`, { got: card.kind })] };
  }
  if (!Array.isArray(card.choices) || card.choices.length < W.CHOICES_MIN || card.choices.length > W.CHOICES_MAX) {
    return { ok: false, problems: [problem('choices', 'count',
      `give the founder between ${W.CHOICES_MIN} and ${W.CHOICES_MAX} things they could do`,
      { limit: `${W.CHOICES_MIN}–${W.CHOICES_MAX}`, got: card.choices?.length ?? 0 })] };
  }
  if (card.char != null) {
    const cast = metCharacters(S);
    if (!cast.includes(card.char)) {
      return { ok: false, problems: [problem('char', 'unknown_character',
        cast.length ? `the founder has met: ${cast.join(', ')}` : 'the founder has not met anybody yet — leave char out',
        { got: card.char })] };
    }
  }

  // Timing: is a card legal at all right now?
  if (S.narrative?.activeEvent) {
    problems.push(problem('', 'card_open', 'the founder is already reading one — wait for them to answer it'));
  }
  if (S._offline) {
    problems.push(problem('', 'offline', 'the founder is away and the game is catching up — wait'));
  }
  const left = cardsLeft(S);
  if (left <= 0) {
    const oldest = recent(S, 'cardDays').sort((a, b) => a - b)[0] ?? S.time.day;
    problems.push(problem('', 'rate', 'post as someone, or let days pass with advance_time', {
      limit: `${W.MAX_CARDS_PER_WINDOW} per ${W.CARD_WINDOW_DAYS} days`,
      when: `day ${Math.ceil(oldest + W.CARD_WINDOW_DAYS)}`,
    }));
  }
  if (!realFloorOk(S)) {
    problems.push(problem('', 'too_soon', `wait ${EV.MIN_REAL_SECONDS}s of real time between cards`));
  }

  // Prose.
  checkProse('title', card.title, W.TITLE_MAX, problems, { tokens: false });
  checkProse('body', card.body, W.BODY_MAX, problems);

  // Choices.
  const tones = allowedTones(S);
  const keys = new Set(allowedKeys(S));
  const labels = new Set();
  card.choices.forEach((c, i) => {
    const at = `choices[${i}]`;
    if (!c || typeof c !== 'object') {
      problems.push(problem(at, 'required', 'each choice is an object with label, tone, outcome and effects'));
      return;
    }
    checkProse(`${at}.label`, c.label, W.LABEL_MAX, problems);
    if (c.sub) checkProse(`${at}.sub`, c.sub, W.SUB_MAX, problems);
    checkProse(`${at}.outcome`, c.outcome, W.OUTCOME_MAX, problems);
    if (!tones.includes(c.tone)) {
      problems.push(problem(`${at}.tone`, 'enum',
        S?.doctrines?.earned?.beloved && c.tone === 'cruel'
          ? 'the founder earned Beloved — cruel is not yours to write any more'
          : `use one of ${tones.join(', ')}`, { got: c.tone }));
    }
    const key = String(c.label || '').trim().toLowerCase();
    if (labels.has(key)) problems.push(problem(`${at}.label`, 'duplicate', 'two choices cannot say the same thing'));
    labels.add(key);

    const fx = c.effects;
    if (fx == null || typeof fx !== 'object') {
      problems.push(problem(`${at}.effects`, 'required', 'every choice moves something — give it effects'));
      return;
    }
    const moved = effectProblems(S, `${at}.effects`, fx, c.tone, problems, { char: card.char, keys });
    if (!moved && !String(c.outcome || '').trim()) {
      problems.push(problem(at, 'empty', 'a choice that changes nothing and says nothing is not a choice'));
    }
  });

  // The protected-key rule. A dilemma is two different costs; it is not the
  // same cost behind every button.
  for (const key of W.PROTECTED) {
    if (!keys.has(key)) continue;
    const everyChoiceHurts = card.choices.every((c) => isAdverse(key, Number(c?.effects?.[key]) || 0));
    if (everyChoiceHurts) {
      problems.push(problem(`choices[].effects.${key}`, 'no_way_out',
        `leave ${EFFECT_KEYS[key].label} alone on at least one choice — the founder must always have a door`,
        { limit: 'one choice must not be adverse', got: 'all of them are' }));
    }
  }

  if (problems.length) return { ok: false, problems };

  return {
    ok: true,
    warnings: styleWarnings(card),
    card: {
      kind: card.kind,
      char: card.char || null,
      title: String(card.title).trim(),
      body: String(card.body).trim(),
      choices: card.choices.map((c) => ({
        label: String(c.label).trim(),
        sub: c.sub ? String(c.sub).trim() : '',
        tone: c.tone,
        outcome: String(c.outcome).trim(),
        effects: Object.fromEntries(Object.entries(c.effects).filter(
          ([k, v]) => k === 'flags' ? Array.isArray(v) && v.length : Number.isFinite(v) && v !== 0)),
      })),
    },
  };
}

// ── The smaller acts ────────────────────────────────────────────────────────

export function validatePost(S, { char, text, ask } = {}) {
  const problems = [];
  const cast = metCharacters(S);
  if (!cast.includes(char)) {
    return { ok: false, problems: [problem('char', 'unknown_character',
      cast.length ? `the founder has met: ${cast.join(', ')}` : 'nobody has met the founder yet', { got: char })] };
  }
  checkProse('text', text, W.POST_MAX, problems);
  if (S._offline) problems.push(problem('', 'offline', 'the founder is away — wait for catch-up'));
  const left = postsLeftToday(S);
  if (left <= 0) {
    problems.push(problem('', 'rate', 'let a day pass with advance_time',
      { limit: `${W.MAX_POSTS_PER_DAY} a day`, when: `day ${Math.ceil(S.time.day + 1)}` }));
  }
  const replies = ask != null ? threadProblems(S, char, ask, problems) : null;
  return problems.length ? { ok: false, problems }
                         : { ok: true, post: { char, text: String(text).trim(),
                                               ...(replies ? { ask: replies } : {}) } };
}

// What a reply in the Wire may move: the vocabulary minus the keys that are
// infrastructure or the ending. Granted compute is permanent and the race is
// decided by a handful of points; neither belongs behind a one-click reply.
export function threadKeys(S) {
  return allowedKeys(S).filter((k) => !W.THREAD_EXCLUDE.includes(k));
}

// The rules, once more, at the moment an effect actually lands. A card, a
// proposal or a reply is judged when it is written and lands when the founder
// presses something — and between the two they may have earned an immunity,
// another card may have spent the same budget, or the money may have gone.
// Nothing written earlier gets to bypass what is true now: a key that has
// left the world's hand is dropped, and a cost is held to what is left of its
// budget or the cash floor. Returns the bounded effects and what was held.
export function boundEffects(S, effects = {}) {
  const keys = new Set(allowedKeys(S));
  const out = {};
  const held = [];
  for (const [k, v] of Object.entries(effects || {})) {
    if (k === 'flags') { if (Array.isArray(v) && v.length) out.flags = v; continue; }
    if (!Number.isFinite(v) || v === 0) continue;
    if (!keys.has(k)) { held.push(`${k}: no longer the world's to move`); continue; }
    let n = v;
    if (k === 'cash' && v < 0) {
      const limit = cashFloor(S).limit;
      if (-v > limit) { n = -limit; held.push(`cash: held to the floor (${money(limit)})`); }
    } else if (isAdverse(k, v) || W.RUN_BUDGET?.[k] != null) {
      const left = budgetFor(S, k).left;
      if (Math.abs(v) > left) {
        const mag = EFFECT_KEYS[k].unit === 'ratio' ? Math.floor(left * 1000) / 1000 : Math.floor(left);
        n = Math.sign(v) * mag;
        held.push(`${k}: held to what is left of the budget (${mag})`);
      }
    }
    if (n !== 0) out[k] = n;
  }
  return { effects: out, held };
}

// World-written threads still waiting on the founder. The Wire is a surface
// they play, not a queue they owe the world.
export function openWorldThreads(S) {
  return (S?.feed || []).filter((f) => f.thread && !f.resolved && Array.isArray(f.runtime?.opts)).length;
}

// A post that asks something: two or three one-click replies, each with a
// small consequence. Judged like a card's choices at a fraction of the
// ceilings, because the Wire is where the small stakes live — and with the
// same door rule, because a question with no harmless answer is a card in a
// smaller font.
function threadProblems(S, char, ask, problems) {
  if (!Array.isArray(ask) || ask.length < W.THREAD_ASK_MIN || ask.length > W.THREAD_ASK_MAX) {
    problems.push(problem('ask', 'count',
      `give the founder ${W.THREAD_ASK_MIN} or ${W.THREAD_ASK_MAX} replies`,
      { limit: `${W.THREAD_ASK_MIN}–${W.THREAD_ASK_MAX}`, got: Array.isArray(ask) ? ask.length : typeof ask }));
    return null;
  }
  const open = openWorldThreads(S);
  if (open >= W.MAX_OPEN_WORLD_THREADS) {
    problems.push(problem('ask', 'rate',
      'the founder has not answered the last one — post without ask, or wait',
      { limit: `${W.MAX_OPEN_WORLD_THREADS} open at once`, got: open }));
  }
  // Small stakes only: nothing permanent and nothing that reaches the ending.
  const keys = new Set(threadKeys(S));
  const labels = new Set();
  const out = [];
  ask.forEach((o, i) => {
    const at = `ask[${i}]`;
    if (!o || typeof o !== 'object') {
      problems.push(problem(at, 'required', 'each reply is an object with label, outcome and effects'));
      return;
    }
    checkProse(`${at}.label`, o.label, W.LABEL_MAX, problems);
    checkProse(`${at}.outcome`, o.outcome, W.THREAD_OUT_MAX, problems);
    const key = String(o.label || '').trim().toLowerCase();
    if (labels.has(key)) problems.push(problem(`${at}.label`, 'duplicate', 'two replies cannot say the same thing'));
    labels.add(key);
    if (o.effects == null || typeof o.effects !== 'object' || Array.isArray(o.effects)) {
      problems.push(problem(`${at}.effects`, 'required',
        'an object of named fields, e.g. { "rep": 3, "focus": -1 } — empty is fine, missing is not',
        { got: o.effects === undefined ? 'missing' : typeof o.effects }));
      return;
    }
    const fx = o.effects;
    effectProblems(S, `${at}.effects`, fx, 'neutral', problems, { char, keys, scale: W.THREAD_CAP_MULT });
    out.push({
      label: String(o.label || '').trim(),
      out: String(o.outcome || '').trim(),
      effects: Object.fromEntries(Object.entries(fx).filter(
        ([k, v]) => k === 'flags' ? Array.isArray(v) && v.length : Number.isFinite(v) && v !== 0)),
    });
  });
  for (const key of W.PROTECTED) {
    if (!keys.has(key) || !out.length) continue;
    if (out.every((o) => isAdverse(key, Number(o.effects?.[key]) || 0))) {
      problems.push(problem(`ask[].effects.${key}`, 'no_way_out',
        `leave ${EFFECT_KEYS[key].label} alone on at least one reply — the founder must always have a door`,
        { limit: 'one reply must not be adverse', got: 'all of them are' }));
    }
  }
  return out;
}

export function validateShock(S, { kind, days } = {}) {
  const problems = [];
  const KINDS_M = ['boom', 'tightening', 'crash'];
  if (!KINDS_M.includes(kind)) {
    return { ok: false, problems: [problem('kind', 'enum', `use one of ${KINDS_M.join(', ')}`, { got: kind })] };
  }
  if (actOf(S) < 3) {
    return { ok: false, problems: [problem('', 'too_early',
      'the macro environment is not in play until Act III — write a card instead',
      { limit: 'act 3', got: `act ${actOf(S)}` })] };
  }
  const d = Number(days);
  if (!Number.isFinite(d) || d < W.SHOCK_DAYS_MIN || d > W.SHOCK_DAYS_MAX) {
    problems.push(problem('days', 'range', `between ${W.SHOCK_DAYS_MIN} and ${W.SHOCK_DAYS_MAX} days`,
      { limit: `${W.SHOCK_DAYS_MIN}–${W.SHOCK_DAYS_MAX}`, got: days }));
  }
  if (S._offline) problems.push(problem('', 'offline', 'the founder is away — wait for catch-up'));
  if (shocksLeft(S) <= 0) {
    const oldest = recent(S, 'shockDays').sort((a, b) => a - b)[0] ?? S.time.day;
    problems.push(problem('', 'rate', 'the weather does not turn twice in a month',
      { limit: `${W.MAX_SHOCKS_PER_WINDOW} per ${W.SHOCK_WINDOW_DAYS} days`,
        when: `day ${Math.ceil(oldest + W.SHOCK_WINDOW_DAYS)}` }));
  }
  return problems.length ? { ok: false, problems } : { ok: true, shock: { kind, days: Math.round(d) } };
}

export function validatePressure(S, { heat, line } = {}) {
  const problems = [];
  if (actOf(S) < 3) {
    return { ok: false, problems: [problem('', 'too_early',
      'nobody is regulating a company this size yet', { limit: 'act 3', got: `act ${actOf(S)}` })] };
  }
  if (S?.doctrines?.earned?.untouchable) {
    return { ok: false, problems: [problem('', 'immunity',
      'the founder earned Untouchable — this is out of your hands for the rest of the run',
      { who: 'the founder' })] };
  }
  const h = Number(heat);
  const cap = capFor(S, 'heat', 'risky');
  if (!Number.isFinite(h) || h === 0) problems.push(problem('heat', 'required', 'a signed number of heat'));
  else if (Math.abs(h) > cap) problems.push(problem('heat', 'cap', `clamp to ±${cap}`, { limit: cap, got: h }));
  else if (h > 0) {
    // Turning it up is adverse, and adverse things are on the rolling budget
    // whether they arrive on a card or through this tool.
    const b = budgetFor(S, 'heat');
    if (h > b.left) {
      problems.push(problem('heat', 'budget',
        b.left > 0
          ? `only ${Math.round(b.left)} left in the last ${W.DRAIN_WINDOW_DAYS} days — turn it up less, or wait`
          : `the world has turned the heat as far as it may this month${b.backOn ? `; it comes back on day ${b.backOn}` : ''}`,
        { limit: Math.round(b.left), got: h, ...(b.backOn ? { when: `day ${b.backOn}` } : {}) }));
    }
  }
  checkProse('line', line, W.LINE_MAX, problems);
  if (S._offline) problems.push(problem('', 'offline', 'the founder is away — wait for catch-up'));
  return problems.length ? { ok: false, problems }
                         : { ok: true, pressure: { heat: h, line: String(line).trim() } };
}

export function validateLine(S, text, max = W.LINE_MAX) {
  const problems = [];
  checkProse('text', text, max, problems);
  return problems.length ? { ok: false, problems } : { ok: true, text: String(text).trim() };
}

// A proposal answers what the founder typed: one choice's worth of consequence,
// judged by the same ceilings, with the tone the world claims for it.
export function validateProposal(S, { outcome, effects, tone = 'neutral' } = {}) {
  const problems = [];
  const active = S.narrative?.activeEvent;
  // Assistants call tools concurrently. Two answers to one typed sentence would
  // silently overwrite each other, and an answer written after the founder has
  // already accepted one would attach itself to a card that is finished.
  if (active?.outcome) {
    return { ok: false, problems: [problem('', 'already_answered',
      'the founder has already resolved that card — wait for the next one')] };
  }
  if (active?.proposal) {
    return { ok: false, problems: [problem('', 'already_answered',
      'you have already answered this one; it is on their screen waiting for Accept')] };
  }
  checkProse('outcome', outcome, W.OUTCOME_MAX, problems);
  if (!allowedTones(S).includes(tone)) {
    problems.push(problem('tone', 'enum', `use one of ${allowedTones(S).join(', ')}`, { got: tone }));
  }
  const keys = new Set(allowedKeys(S));
  if (effects != null && (typeof effects !== 'object' || Array.isArray(effects))) {
    problems.push(problem('effects', 'type',
      'an object of named fields, e.g. { "cash": -2000, "rep": 8 }', { got: typeof effects }));
  }
  const fx = effects && typeof effects === 'object' && !Array.isArray(effects) ? effects : {};
  // The same judge a card's choice gets — ceilings, the rolling budget and
  // the cash floor. An answer typed by the founder is still the world's cost.
  effectProblems(S, 'effects', fx, tone, problems, { char: active?.char || null, keys });
  if (!active) {
    problems.push(problem('', 'no_card', 'there is no card open — the founder has nothing to answer'));
  }
  return problems.length ? { ok: false, problems }
    : { ok: true, proposal: { outcome: String(outcome).trim(), tone,
        effects: Object.fromEntries(Object.entries(fx).filter(([k, v]) => k === 'flags' ? Array.isArray(v) && v.length : Number.isFinite(v) && v !== 0)) } };
}
