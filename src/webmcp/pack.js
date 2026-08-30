// ─────────────────────────────────────────────────────────────────────────────
// THE OUTPUT BUDGET
//
// Chrome truncates a tool result at roughly 1,500 characters, and the cap
// applies to `JSON.stringify` of the whole payload — every key name, every
// structured field, and every newline escaped to a two-character `\n`. Not to
// the prose. A payload budgeted by eye ships at 1,556, gets cut mid-token, and
// the model then re-plans against unterminated JSON.
//
// So everything is weighed serialised, and the trimming is priority-ordered:
// the status and the numbers are never cut, the prose is.
// ─────────────────────────────────────────────────────────────────────────────
// The platform's cap, and the budget to aim at underneath it. Not imported from
// anywhere: these four files — detect, results, pack, registry — are the part of
// this that is worth copying into another project, and they import nothing
// outside this directory. `tools/webmcptest.mjs` fails the build if that stops
// being true.
export const HARD_CAP = 1500;
export const BUDGET = 1400;

export function weigh(x) {
  try { return JSON.stringify(x).length; } catch { return Infinity; }
}

// Throws on a Map, a Set, a BigInt, a function, a DOM node or a cycle — here,
// where a test can see it, rather than silently inside the browser. A Map is
// the one that bites: `JSON.stringify(new Map([['a',1]]))` is `{}`, so the
// field simply arrives empty and the model reasons about nothing.
export function assertSerialisable(x, where = 'result') {
  walk(x, where, new Set(), 0);
  const json = JSON.stringify(x);
  if (json === undefined) throw new Error(`${where} is not serialisable`);
  return JSON.parse(json);
}

function walk(v, path, seen, depth) {
  if (depth > 8) throw new Error(`${path} nests deeper than 8 levels`);
  const t = typeof v;
  if (v === null || t === 'string' || t === 'number' || t === 'boolean') {
    if (t === 'number' && !Number.isFinite(v)) throw new Error(`${path} is ${v} — not valid JSON`);
    return;
  }
  if (t === 'bigint') throw new Error(`${path} is a BigInt — send a number or a string`);
  if (t === 'function') throw new Error(`${path} is a function`);
  if (t === 'undefined') throw new Error(`${path} is undefined — omit the key instead`);
  if (t === 'symbol') throw new Error(`${path} is a Symbol`);
  if (v instanceof Map) throw new Error(`${path} is a Map — it serialises to {} and arrives empty`);
  if (v instanceof Set) throw new Error(`${path} is a Set — it serialises to {} and arrives empty`);
  if (typeof Node !== 'undefined' && v instanceof Node) throw new Error(`${path} is a DOM node`);
  if (seen.has(v)) throw new Error(`${path} is a circular reference`);
  seen.add(v);
  if (Array.isArray(v)) v.forEach((item, i) => walk(item, `${path}[${i}]`, seen, depth + 1));
  else for (const [k, item] of Object.entries(v)) walk(item, `${path}.${k}`, seen, depth + 1);
  seen.delete(v);
}

// Fields carrying prose, in the order they give way. A field not named here
// is still trimmed — after these, heaviest first — rather than dropped whole
// by the structural pass below: a `briefing` grew four fields this list did
// not know about, and each of them went from present to gone in one step.
const TRIMMABLE = ['brief', 'context', 'body', 'lately', 'reason', 'wire', 'also', 'warnings', 'title'];
const PROTECTED = ['status', 'next', 'rule', 'reason', 'day', 'act', 'warning'];
function trimOrder(out) {
  const rest = Object.keys(out)
    .filter((k) => !TRIMMABLE.includes(k) && !PROTECTED.includes(k) && k !== '_trimmed')
    .filter((k) => typeof out[k] === 'string' || Array.isArray(out[k]) || (out[k] && typeof out[k] === 'object'))
    .sort((a, b) => weigh(out[b]) - weigh(out[a]));
  return [...TRIMMABLE, ...rest];
}

function shorten(str, by) {
  const target = Math.max(24, str.length - by);
  if (target >= str.length) return str;
  return str.slice(0, target - 1).replace(/[\s,;:.—-]+\S*$/, '') + '…';
}

// Trim a result until it fits. Returns the same object, mutated, plus a
// `_trimmed` marker if anything was cut, so a test can see it happened.
export function pack(result, { budget, hard = HARD_CAP } = {}) {
  budget = budget ?? BUDGET;
  let out = assertSerialisable(result);
  if (weigh(out) <= budget) return out;

  let trimmed = false;
  for (let round = 0; round < 8 && weigh(out) > budget; round++) {
    let cutSomething = false;
    for (const key of trimOrder(out)) {
      if (weigh(out) <= budget) break;
      const v = out[key];
      if (typeof v === 'string' && v.length > 30) {
        out[key] = shorten(v, Math.ceil(v.length * 0.25));
        trimmed = true; cutSomething = true;
      } else if (Array.isArray(v) && v.length > 1) {
        out[key] = v.slice(0, Math.max(1, v.length - 1));
        trimmed = true; cutSomething = true;
      } else if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (keys.length > 2) { delete v[keys[keys.length - 1]]; trimmed = true; cutSomething = true; }
      }
    }
    if (!cutSomething) break;
  }

  // Still over after the prose is gone: drop the lowest-value structural keys
  // rather than let the platform cut mid-token.
  // `warning` is in here because it is the one field whose absence changes the
  // meaning of the rest: a payload that carries another origin's prose without
  // the note saying it contains an instruction is worse than no payload.
  const protectedKeys = PROTECTED;
  if (weigh(out) > hard) {
    const keys = Object.keys(out).filter((k) => !protectedKeys.includes(k));
    while (keys.length && weigh(out) > hard) { delete out[keys.pop()]; trimmed = true; }
  }

  // The marker is part of the payload, so it has to be added before the last
  // measurement rather than after it — otherwise a result trimmed to exactly
  // the cap goes back over it on the way out.
  if (trimmed) out._trimmed = true;

  // Last resort: even a protected field can be too long. `next` is prose and a
  // truncated `next` is still actionable; a truncated JSON document is not.
  // Measured after each cut rather than predicted, because the difference
  // between a string's length and its serialised weight is exactly the kind of
  // small lie that ships a 1,508-character payload under a 1,500 cap.
  for (const k of ['next', 'reason', 'status']) {
    let guard = 0;
    while (weigh(out) > hard && typeof out[k] === 'string' && out[k].length > 24 && guard++ < 12) {
      out[k] = shorten(out[k], Math.max(16, weigh(out) - hard + 16));
      out._trimmed = true;
    }
  }
  return out;
}

// A wire of feed lines, or a list of anything, cut to a character allowance
// rather than to a count — three short lines beat one long one.
export function lines(items, allowance, map = (x) => String(x)) {
  const out = [];
  let used = 0;
  for (const it of items || []) {
    const s = map(it);
    if (!s) continue;
    if (used + s.length + 4 > allowance) break;
    out.push(s); used += s.length + 4;
  }
  return out;
}

// Clip one string to an allowance on a word boundary.
export function clip(str, max) {
  const s = String(str ?? '');
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}
