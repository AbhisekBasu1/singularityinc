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
  const act = actOf(S);
  return EFFECT_KEY_LIST.filter((k) => {
    if (k === 'debt' && earned.zero_entropy) return false;   // the codebase stopped fighting you
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
export function takenIn(S, key) {
  const since = S.time.day - W.DRAIN_WINDOW_DAYS;
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

function cashProblem(path, cash, S, tone = 'neutral') {
  const f = cashLimit(S, tone);
  if (-cash <= f.limit) return null;
  if (f.which === 'cap') {
    return problem(path, 'cap', `the world may take at most ${f.limit} in cash here`,
                   { limit: f.limit, got: cash });
  }
  const fix = f.which === 'runway'
    ? `${f.runway == null ? 'the runway floor binds here' : `the founder has ${f.runway} days of runway`}`
      + `; nothing the world writes may take them inside ${W.RUNWAY_FLOOR_DAYS} days. Cost them reputation, focus or users instead`
    : f.which === 'drain'
      ? `the world has already taken ${money(f.taken)} in ${W.DRAIN_WINDOW_DAYS} days. Wait, or make the cost something other than money`
      : `no one card may take more than ${Math.round(W.CASH_SHARE_MAX * 100)}% of the cash on hand`;
  return problem(path, f.which === 'share' ? 'cash_share' : f.which === 'runway' ? 'runway_floor' : 'cash_drain',
                 fix, { limit: -f.limit, got: cash });
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
  const act = actOf(S);

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
    let moved = 0;
    for (const [k, v] of Object.entries(fx)) {
      if (k === 'flags') {
        flagProblems(`${at}.effects.flags`, v, problems);
        continue;
      }
      if (k === 'affinity' && !card.char) {
        // Affinity is how somebody feels about the founder afterwards. With
        // nobody on the card there is no somebody, and it would validate,
        // count as a real movement, and then quietly do nothing.
        problems.push(problem(`${at}.effects.affinity`, 'no_character',
          'put a face on the card with `char`, or drop affinity'));
        continue;
      }
      if (!keys.has(k)) {
        problems.push(problem(`${at}.effects.${k}`, 'unknown_key',
          `the world can move: ${[...keys].join(', ')}`, { got: k }));
        continue;
      }
      if (!Number.isFinite(v)) {
        problems.push(problem(`${at}.effects.${k}`, 'type', 'a signed number', { got: typeof v }));
        continue;
      }
      if (v !== 0) moved++;
      const dir = isAdverse(k, v) ? 'take' : 'give';
      // Cash is judged once, by `cashProblem`, against whichever of its four
      // bounds is tightest — so it is not judged twice here.
      if (k === 'cash' && dir === 'take') continue;
      const cap = capFor(S, k, c.tone, dir);
      if (Math.abs(v) > cap) {
        problems.push(problem(`${at}.effects.${k}`, 'cap',
          cap > 0
            ? `${dir === 'take' ? 'the world may take' : 'the world may give'} at most ${cap} here`
              + `${c.tone !== 'cruel' && c.tone !== 'costly' ? ' — or mark the choice costly and try again' : ''}`
            : `not in play in Act ${act}`,
          { limit: cap, got: v }));
      } else if (k !== 'cash' && isAdverse(k, v)) {
        // The rolling budget: the ceiling stops one card being an outlier, this
        // stops a hundred ordinary ones adding up to the same thing.
        const b = budgetFor(S, k);
        if (Math.abs(v) > b.left) {
          problems.push(problem(`${at}.effects.${k}`, 'budget',
            b.left > 0
              ? `only ${Math.round(b.left)} left in the last ${W.DRAIN_WINDOW_DAYS} days — take less, or cost them something else`
              : `the world has spent this one${b.backOn ? `; it comes back on day ${b.backOn}` : ''}. Cost them something else`,
            { limit: Math.round(b.left), got: v, ...(b.backOn ? { when: `day ${b.backOn}` } : {}) }));
        }
      }
    }
    // A choice with a cash cost the founder cannot survive is not a choice.
    const cashP = cashProblem(`${at}.effects.cash`, Number(fx.cash) || 0, S, c.tone);
    if (cashP) problems.push(cashP);
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

export function validatePost(S, { char, text } = {}) {
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
  return problems.length ? { ok: false, problems }
                         : { ok: true, post: { char, text: String(text).trim() } };
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
  for (const [k, v] of Object.entries(fx)) {
    if (k === 'flags') { flagProblems('effects.flags', v, problems); continue; }
    if (k === 'affinity' && !active?.char) {
      problems.push(problem('effects.affinity', 'no_character',
        'nobody is on that card — drop affinity'));
      continue;
    }
    if (!keys.has(k)) { problems.push(problem(`effects.${k}`, 'unknown_key', `the world can move: ${[...keys].join(', ')}`, { got: k })); continue; }
    if (!Number.isFinite(v)) { problems.push(problem(`effects.${k}`, 'type', 'a signed number', { got: typeof v })); continue; }
    if (k === 'cash' && isAdverse('cash', v)) continue;      // judged once, below
    const dir = isAdverse(k, v) ? 'take' : 'give';
    const cap = capFor(S, k, tone, dir);
    if (Math.abs(v) > cap) {
      problems.push(problem(`effects.${k}`, 'cap',
        `${dir === 'take' ? 'take' : 'give'} at most ${cap} here`, { limit: cap, got: v }));
    }
  }
  const cashP2 = cashProblem('effects.cash', Number(fx.cash) || 0, S, tone);
  if (cashP2) problems.push(cashP2);
  if (!active) {
    problems.push(problem('', 'no_card', 'there is no card open — the founder has nothing to answer'));
  }
  return problems.length ? { ok: false, problems }
    : { ok: true, proposal: { outcome: String(outcome).trim(), tone,
        effects: Object.fromEntries(Object.entries(fx).filter(([k, v]) => k === 'flags' ? Array.isArray(v) && v.length : Number.isFinite(v) && v !== 0)) } };
}
