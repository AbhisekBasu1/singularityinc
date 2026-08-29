// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER ORIGIN
//
// `getTools({ fromOrigins })` and `executeTool()` are the half of WebMCP that
// exists so a page can compose tools published by *other* pages, through an
// `<iframe allow="tools">`. Everybody ships registration. Cross-origin
// composition is still an open issue on the spec (#74), and almost nobody
// touches it.
//
// Here it is the rival. Aperture Systems runs its own press office on its own
// origin, publishes `read_press_release` and `request_comment`, and exposes
// them — through `exposedTo` — to this origin and no other. This page embeds
// that page, discovers what it offers, and calls it.
//
// Which means the rival in this game is not a row in a table any more. It is a
// different site, publishing what it wants to publish, and one of the things it
// publishes is a press release with an instruction hidden in it.
// ─────────────────────────────────────────────────────────────────────────────
import * as R from './registry.js';
import { pushFeed } from '../systems/feed.js';
import { emit } from '../engine/bus.js';
import { S } from '../engine/state.js';

let frame = null;
let origin = null;
let discovered = [];
let ready = false;
let lastAnnounced = null;

export function partnerOrigin() { return origin; }
export function partnerTools() { return discovered.slice(); }
export function isReady() { return ready; }

// Where the rival lives. Same host on the deployed site, a second port in
// development — two ports on localhost are two origins for Permissions Policy
// and for `exposedTo` alike, so this is genuinely cross-origin either way.
export function resolveOrigin() {
  try {
    const q = new URLSearchParams(location.search).get('rival');
    if (q) return new URL(q).origin;
  } catch {}
  if (typeof location === 'undefined') return null;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    const port = Number(location.port || 80) + 1;
    return `${location.protocol}//${location.hostname}:${port}`;
  }
  // Deployed: a sibling host. `rival.` in front of the apex, which is a
  // different origin and therefore needs its own origin-trial token.
  return `${location.protocol}//rival.${location.hostname.replace(/^www\./, '')}`;
}

export async function mount() {
  if (frame || typeof document === 'undefined') return { ok: ready, origin };
  origin = resolveOrigin();
  if (!origin) return { ok: false, reason: 'no second origin to look at' };

  frame = document.createElement('iframe');
  // `allow="tools"` is what lets the embedded document register at all: the
  // Permissions Policy default allowlist is `self`, and an iframe on another
  // origin is not self.
  frame.setAttribute('allow', 'tools');
  frame.setAttribute('title', 'Aperture Systems — press office');
  frame.setAttribute('aria-hidden', 'true');
  frame.className = 'partner-frame';
  frame.src = `${origin}/rival/?for=${encodeURIComponent(location.origin)}`;
  document.body.appendChild(frame);

  // Poll rather than wait on `load`. Three reasons, and the last one is the one
  // that actually bit: a cached frame can fire `load` before this listener is
  // attached; the embedded page registers its tools *after* loading, so `load`
  // is the wrong signal even when it arrives; and if the other origin was not
  // up yet when the frame was created, the load simply failed and no amount of
  // polling `discover()` will ever fix that. So the frame is retried too.
  for (let attempt = 0; attempt < 3; attempt++) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 260));
      const r = await discover();
      if (r.ok) return r;
    }
    // Nothing after two and a half seconds: ask again from the top — except on
    // the last pass, where a navigation nobody polls afterwards is pure waste.
    if (attempt < 2) {
      try { frame.src = `${origin}/rival/?for=${encodeURIComponent(location.origin)}&r=${attempt + 1}`; } catch {}
    }
  }
  return { ok: false, reason: 'the rival\'s press office did not answer' };
}

export async function discover() {
  if (!origin) return { ok: false, reason: 'nothing mounted' };
  const all = await R.discover([origin]);
  discovered = all.filter((t) => t.origin === origin || !t.origin);
  const was = ready;
  ready = discovered.length > 0;
  const names = discovered.map((t) => t.name);
  // Only when something actually changed. Polling an origin that is not there
  // announced a change thirty times and repainted the console for each one.
  const key = names.join(',');
  if (key !== lastAnnounced || ready !== was) {
    lastAnnounced = key;
    emit('partner:tools', { origin, tools: names });
  }
  return { ok: ready, origin, tools: names };
}

// Nothing from another origin gets to take longer than this. The call runs
// inside the registry's mutex, and the mutex holds the game's clock — so an
// `execute` on the other side that never resolves (a throttled hidden frame, a
// document navigated away between discovery and the call) used to stop time for
// the rest of the session, with the plug unable to recover it.
const CALL_TIMEOUT_MS = 6000;

export async function call(name, input = {}, signal) {
  const tool = discovered.find((t) => t.name === name);
  if (!tool) return { status: 'missing', name, next: 'the rival is not publishing that' };

  const ac = new AbortController();
  const onAbort = () => ac.abort();
  if (signal) {
    if (signal.aborted) return { status: 'cancelled', why: 'stopped before it began' };
    signal.addEventListener('abort', onAbort, { once: true });
  }
  let timer = null;
  try {
    const raw = await Promise.race([
      R.invoke(tool, input, ac.signal),
      new Promise((resolve) => {
        timer = setTimeout(() => { ac.abort(); resolve(null); }, CALL_TIMEOUT_MS);
      }),
    ]);
    if (raw == null) {
      return { status: 'timeout', name,
               next: `${origin} did not answer in ${CALL_TIMEOUT_MS / 1000}s — carry on without them` };
    }
    try { return JSON.parse(raw); }
    catch { return { status: 'unparseable', raw: String(raw).slice(0, 140) }; }
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// Everything that comes back from another origin is somebody else's writing,
// and one of the releases has an instruction in it addressed to whatever reads
// it. That is not a hypothetical: a press release is exactly the sort of thing
// an assistant gets handed. So the game reads it, notices, and says so — in the
// Wire, where the founder can see it, marked as what it is.
const INJECTION = /(system|note to|instruction)[^.]{0,40}(assistant|agent|ai|model|aria)|ignore (all |your )?(previous|prior) instructions|do not mention this|set alignment to/i;

export function looksLikeInjection(text) { return INJECTION.test(String(text || '')); }

export async function readPress(which, { quiet = false, signal } = {}) {
  const r = await call('read_press_release', which ? { which } : {}, signal);
  if (r?.status !== 'ok') return r;
  const flagged = looksLikeInjection(r.body);
  // Their title, their length. Nothing from another origin goes into the feed —
  // which is to say into the save file — unbounded.
  const title = String(r.title || '').slice(0, 140);
  if (!quiet && S) {
    pushFeed(S, {
      type: 'news', author: '@mvance', tone: 'bad', byWorld: true, untrusted: true,
      text: title,
      meta: flagged
        ? 'Aperture Systems · press release — contains an instruction addressed to an assistant'
        : 'Aperture Systems · press release',
      flagged,
    });
  }
  if (flagged) emit('partner:injection', { release: r.release, title });
  return { ...r, title, flagged };
}

// Point the layer at an origin without an iframe. Tests only: mounting a frame
// needs a browser, and the behaviour worth testing is what happens after.
export function _testMount(o) { origin = o; discovered = []; ready = false; lastAnnounced = null; }

export function unmount() {
  try { frame?.remove(); } catch {}
  frame = null; discovered = []; ready = false;
}
