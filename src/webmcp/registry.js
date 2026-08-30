// ─────────────────────────────────────────────────────────────────────────────
// THE REGISTRY
//
// Every sharp edge the platform has, handled once, here:
//
//   · `registerTool` REJECTS if a tool of that name already exists. So a
//     replacement revokes before it mints — never the other way round.
//   · There is no `unregisterTool`. Teardown is aborting the signal you passed
//     in at registration.
//   · Aborting also rejects the original `registerTool` promise, which means an
//     unhandled rejection ten minutes later, at the worst possible moment,
//     unless the handler is attached before anything else.
//   · A rejected `execute` has its reason discarded — the assistant sees a bare
//     UnknownError. Nothing here ever rejects.
//   · The result is `JSON.stringify`d by the browser and a throw in there is
//     silent. Everything goes through `pack`, which proves serialisability.
//   · Assistants call tools concurrently, and these mutate a shared world. One
//     promise-chain mutex serialises them.
//
// Nothing in this file knows what the game is.
// ─────────────────────────────────────────────────────────────────────────────
import { pack } from './pack.js';
import { cancelled, crashed, badInput, refused } from './results.js';

// The host's event bus, if it has one. Injected rather than imported so that
// this file — and detect, results and pack alongside it — can be copied into
// another project without bringing a game with them.
let emit = () => {};
export function setEmitter(fn) { emit = typeof fn === 'function' ? fn : (() => {}); }

let mc = null;                       // the live ModelContext
let root = new AbortController();    // MUTE aborts this; every call derives from it
// Bumped whenever the whole surface is torn down. A call that queued behind
// another one, and was still waiting when the user tore it all down, has to
// see that it belongs to a world that no longer exists — the root signal alone
// cannot tell it, because unmuting installs a fresh, unaborted controller.
let generation = 0;
const tools = new Map();             // name → { def, ac, token, fingerprint }
let seq = 0;
let mutex = Promise.resolve();
const log = [];                      // the last 40 calls, for the panel
const LOG_MAX = 40;
let busyDepth = 0;
let onBusy = null;                   // (busy: boolean) => void

export function init(context, { setBusy } = {}) {
  mc = context;
  onBusy = setBusy || null;
  if (root.signal.aborted) root = new AbortController();
  return !!mc;
}
export function ready() { return !!mc; }

// The host hears about the surface through its own bus — the one channel, so
// a UI cannot half-subscribe and miss the other half.
function changed(action, name, extra) {
  emit('webmcp:tools', { action, name, count: tools.size, ...extra });
}
export const has = (n) => tools.has(n);
export const list = () => [...tools.keys()];
export const count = () => tools.size;
export const fingerprintOf = (n) => tools.get(n)?.fingerprint;
export const calls = () => log.slice();

// ── Mint and revoke ─────────────────────────────────────────────────────────

export async function mint(def) {
  if (!mc || !def?.name) return { ok: false, error: 'no-context' };
  if (tools.has(def.name)) await revoke(def.name, 'superseded');

  const ac = new AbortController();
  const token = ++seq;
  const tool = {
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: def.inputSchema || { type: 'object', properties: {} },
    annotations: def.annotations || {},
    execute: wrap(def, token),
  };

  let p;
  try { p = mc.registerTool(tool, { signal: ac.signal }); }
  catch (e) { return { ok: false, error: String(e?.name || e) }; }

  // Attach the handler before anything else. `ac.abort()` rejects this same
  // promise, so a revoke ten minutes from now is an unhandled rejection in the
  // middle of a take unless something is already listening.
  let settled = null;
  // Normalised once: a bare thenable with only `then` is a valid return here,
  // and `.catch` on it is a TypeError.
  const registration = p && typeof p.then === 'function' ? Promise.resolve(p) : null;
  if (registration) {
    registration.then(() => { settled ??= { ok: true }; },
                      (e) => { settled ??= { ok: false, error: String(e?.name || e) }; });
  } else {
    settled = { ok: true };
  }

  // And do not simply `await` it. Implementations disagree about whether the
  // promise resolves on success or stays pending until the signal aborts, and
  // awaiting the second kind hangs forever. Give it a turn of the event loop:
  // a duplicate name rejects immediately, which is the case worth catching.
  // (An implementation that returns nothing at all was handled just above —
  // and then dereferenced here, which turned the one case this branch exists
  // for into a TypeError that took the whole boot with it.)
  await Promise.race([registration ? registration.catch(() => {}) : Promise.resolve(), tick()]);
  if (settled && settled.ok === false && settled.error !== 'AbortError') {
    return { ok: false, error: settled.error };
  }

  tools.set(def.name, { def, ac, token, fingerprint: def.fingerprint ?? null });
  changed('mint', def.name);
  return { ok: true };
}

export async function revoke(name, why = 'revoked') {
  const t = tools.get(name);
  if (!t) return false;
  tools.delete(name);
  try { t.ac.abort(); } catch {}
  changed('revoke', name, { why });
  return true;
}

export async function revokeAll(why = 'revoked') {
  for (const n of [...tools.keys()]) await revoke(n, why);
}

// The plug. One abort takes every registration with it, because every call's
// signal is derived from the root.
export async function muteAll(why = 'muted') {
  generation++;
  try { root.abort(); } catch {}
  await revokeAll(why);
  root = new AbortController();     // ready to be used again the moment they unmute
}

// ── Discovery and consumption — the half of the API nobody uses ─────────────

export async function discover(fromOrigins) {
  if (!mc?.getTools) return [];
  try { return await mc.getTools(fromOrigins ? { fromOrigins } : {}); }
  catch { return []; }
}

export function canInvoke() { return typeof mc?.executeTool === 'function'; }
export async function invoke(tool, input = {}, signal) {
  if (!mc?.executeTool) return null;
  try { return await mc.executeTool(tool, input, signal ? { signal } : {}); }
  catch (e) { return JSON.stringify(crashed(e)); }
}

// ── The executor: abort → parse → try → resolve, never reject ───────────────

function wrap(def, token) {
  return async (input = {}, opts = {}) => {
    const started = now();
    const finish = (result) => {
      const packed = safePack(result);
      record(def.name, input, packed, now() - started);
      return packed;
    };

    const signal = opts?.signal;
    if (signal?.aborted) return finish(cancelled('the user stopped you before it began'));
    if (root.signal.aborted) return finish(cancelled('the world is muted'));

    // A tool re-minted under the same name races calls already in flight. The
    // stale handle resolves with something actionable; it never throws.
    if (tools.get(def.name)?.token !== token) {
      return finish(refused([{ rule: 'stale', fix: 'call it again — this tool was replaced while you held it' }]));
    }

    const parsed = parseInput(def.inputSchema, input);
    if (!parsed.ok) return finish(badInput(parsed.problems));

    // Re-checked *inside* the mutex, immediately before anything is touched.
    // Everything above ran when the call arrived; by the time it reaches the
    // front of the queue the tool may have been revoked, replaced, or the plug
    // pulled and put back — and none of those are visible from a signal that
    // was swapped for a fresh one in between.
    const bornIn = generation;
    const run = async () => {
      if (generation !== bornIn) {
        return cancelled('the user revoked everything while this was waiting its turn');
      }
      if (tools.get(def.name)?.token !== token) {
        return refused([{ rule: 'stale', fix: 'call it again — this tool was replaced while you waited' }]);
      }
      if (signal?.aborted) return cancelled('the user stopped you while this was waiting its turn');
      const merged = mergeSignals(signal, root.signal);
      // Completion is logged below, but onboarding needs the arrival edge: a
      // long-poll may not complete for a minute even though the assistant is
      // already here. Emit only after validation and every stale/abort check.
      emit('webmcp:call:start', { name: def.name, at: Date.now() });
      return def.execute(parsed.value, { signal: merged });
    };

    try {
      const result = def.noMutex ? await run() : await withMutex(run);
      return finish(result);
    } catch (e) {
      return finish(crashed(e));
    }
  };
}

function safePack(result) {
  try { return pack(result); }
  catch (e) { return { status: 'error', message: 'result could not be serialised: ' + String(e.message).slice(0, 100),
                       next: 'this is a bug in the page, not in your call' }; }
}

// ── Mutex ───────────────────────────────────────────────────────────────────
// Assistants invoke tools concurrently and these mutate one shared world.

export function withMutex(fn) {
  const run = async () => {
    busyDepth++;
    if (busyDepth === 1) onBusy?.(true);
    try { return await fn(); }
    finally {
      busyDepth--;
      if (busyDepth === 0) onBusy?.(false);
    }
  };
  const next = mutex.then(run, run);
  mutex = next.then(() => {}, () => {});
  return next;
}

// ── Signals ─────────────────────────────────────────────────────────────────

function mergeSignals(a, b) {
  const live = [a, b].filter(Boolean);
  if (!live.length) return new AbortController().signal;
  if (live.length === 1) return live[0];
  if (typeof AbortSignal !== 'undefined' && AbortSignal.any) {
    try { return AbortSignal.any(live); } catch {}
  }
  const ac = new AbortController();
  for (const s of live) {
    if (s.aborted) { ac.abort(); break; }
    s.addEventListener('abort', () => ac.abort(), { once: true });
  }
  return ac.signal;
}

// ── Input parsing ───────────────────────────────────────────────────────────
// Not a JSON Schema implementation — the subset the tools here actually use,
// so a wrong shape comes back as a fixable list rather than a stack trace.
// (Native schema validation is spec issue #92; until it lands this is userland.)

export function parseInput(schema, input) {
  const problems = [];
  const out = {};
  const props = schema?.properties || {};
  const required = schema?.required || [];
  const src = input && typeof input === 'object' ? input : {};

  for (const key of required) {
    if (src[key] === undefined || src[key] === null || src[key] === '') {
      problems.push({ path: key, rule: 'required', fix: describe(props[key]) });
    }
  }

  for (const [key, val] of Object.entries(src)) {
    const spec = props[key];
    if (!spec) {
      const known = Object.keys(props);
      problems.push({ path: key, rule: 'unknown_field',
        fix: known.length ? `this tool takes: ${known.join(', ')}` : 'this tool takes no arguments' });
      continue;
    }
    const p = coerce(key, val, spec);
    if (p.problems.length) problems.push(...p.problems);
    else out[key] = p.value;
  }

  for (const [key, spec] of Object.entries(props)) {
    if (out[key] === undefined && spec.default !== undefined) out[key] = spec.default;
  }
  return problems.length ? { ok: false, problems } : { ok: true, value: out };
}

function coerce(path, val, spec) {
  const problems = [];
  const t = spec.type;
  if (t === 'number' || t === 'integer') {
    const n = typeof val === 'string' ? Number(val) : val;
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      problems.push({ path, rule: 'type', fix: 'a number', got: typeof val });
    } else {
      const v = t === 'integer' ? Math.round(n) : n;
      // Out of range is refused with the bound, not silently clamped: a
      // clamped value changes what the call means without telling the caller,
      // and the caller never learns where the ceiling is.
      if ((spec.minimum !== undefined && v < spec.minimum) || (spec.maximum !== undefined && v > spec.maximum)) {
        const lo = spec.minimum, hi = spec.maximum;
        const range = lo !== undefined && hi !== undefined ? `between ${lo} and ${hi}`
                    : lo !== undefined ? `at least ${lo}` : `at most ${hi}`;
        problems.push({ path, rule: 'range', fix: range, got: String(v),
                        limit: hi !== undefined && v > hi ? hi : lo });
      } else {
        return { value: v, problems };
      }
    }
  } else if (t === 'string') {
    if (typeof val !== 'string') {
      problems.push({ path, rule: 'type', fix: 'a string', got: typeof val });
    } else if (spec.enum && !spec.enum.includes(val)) {
      problems.push({ path, rule: 'enum', fix: `one of: ${spec.enum.slice(0, 12).join(', ')}`, got: val.slice(0, 30) });
    } else if (spec.maxLength && [...val].length > spec.maxLength) {
      // Cutting text to fit shows the user half a sentence, and hides the
      // ceiling from the caller for ever. Refuse with the number instead —
      // counted in code points, as JSON Schema's maxLength is, not UTF-16 units.
      problems.push({ path, rule: 'too_long', fix: `at most ${spec.maxLength} characters`,
                      got: `${[...val].length} characters`, limit: spec.maxLength });
    } else {
      return { value: val, problems };
    }
  } else if (t === 'boolean') {
    // "false" is a string, and a string is truthy. Coercing it to `true` is the
    // kind of silent wrong answer that is very hard to see from the other side.
    if (typeof val === 'boolean') return { value: val, problems };
    if (val === 'true' || val === 'false') return { value: val === 'true', problems };
    problems.push({ path, rule: 'type', fix: 'true or false', got: typeof val });
  } else if (t === 'array') {
    if (!Array.isArray(val)) problems.push({ path, rule: 'type', fix: 'a list', got: typeof val });
    else return { value: val, problems };
  } else if (t === 'object') {
    // A string that looks like an object is not one. Left to pass, it becomes
    // `{}` downstream and the call succeeds having done nothing at all.
    if (val && typeof val === 'object' && !Array.isArray(val)) return { value: val, problems };
    problems.push({ path, rule: 'type',
      fix: 'an object of named fields, not text — e.g. { "cash": -2000, "rep": 8 }',
      got: Array.isArray(val) ? 'a list' : typeof val });
  } else if (t === undefined) {
    return { value: val, problems };
  }
  return { value: undefined, problems };
}

function describe(spec) {
  if (!spec) return 'this field is required';
  if (spec.enum) return `one of: ${spec.enum.slice(0, 12).join(', ')}`;
  return spec.description ? String(spec.description).slice(0, 90) : `a ${spec.type || 'value'}`;
}

// ── The call log ────────────────────────────────────────────────────────────

function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

// One turn of the macrotask queue — long enough for a synchronous rejection to
// land, short enough that minting a dozen tools is imperceptible.
function tick() { return new Promise((r) => setTimeout(r, 0)); }

function record(name, args, result, ms) {
  let bytes = 0;
  try { bytes = JSON.stringify(result).length; } catch { bytes = -1; }
  const entry = {
    n: ++logSeq, name, status: result?.status || 'ok', bytes, ms: Math.round(ms),
    at: Date.now(),
    args: summariseArgs(args),
    note: result?.rule || result?.why || result?.what || '',
  };
  log.unshift(entry);
  if (log.length > LOG_MAX) log.pop();
  emit('webmcp:call', entry);
  return entry;
}
let logSeq = 0;

function summariseArgs(args) {
  if (!args || typeof args !== 'object') return '';
  const parts = [];
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null) continue;
    const s = typeof v === 'string' ? v : Array.isArray(v) ? `[${v.length}]` : typeof v === 'object' ? '{…}' : String(v);
    parts.push(`${k}: ${String(s).slice(0, 42)}`);
    if (parts.length >= 4) break;
  }
  return parts.join(' · ');
}
