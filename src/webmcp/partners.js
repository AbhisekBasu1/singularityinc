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
import { emit, on } from '../engine/bus.js';
import { S } from '../engine/state.js';
import * as Rival from '../systems/rivalco.js';
import * as Chair from '../systems/chair.js';
import { resolveOrigin, roomCode } from './origin.js';
import { RIVALCO as RC } from '../data/balance.js';

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
export { resolveOrigin };

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
  // `room` is the relay room a second human joins from another machine; the
  // framed copy relays that room to us and nobody else.
  frame.src = `${origin}/rival/?for=${encodeURIComponent(location.origin)}&room=${roomCode(S)}`;
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
      try { frame.src = `${origin}/rival/?for=${encodeURIComponent(location.origin)}&room=${roomCode(S)}&r=${attempt + 1}`; } catch {}
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

const ABORTED = Symbol('aborted');
const cancelledCall = () => ({ status: 'cancelled', why: 'the founder pressed stop',
                               next: 'nothing from them was used' });

export async function call(name, input = {}, signal) {
  const tool = discovered.find((t) => t.name === name);
  if (!tool) return { status: 'missing', name, next: 'the rival is not publishing that' };
  if (signal?.aborted) return cancelledCall();
  // `invoke` answers null both when the other side never replies and when this
  // browser has no `executeTool` at all. Only the first is their fault.
  if (!R.canInvoke()) {
    return { status: 'unsupported', name,
             next: 'this browser cannot call tools on another origin — carry on without them' };
  }

  const ac = new AbortController();
  let onAbort = null;
  let timer = null;
  try {
    const raw = await Promise.race([
      R.invoke(tool, input, ac.signal),
      new Promise((resolve) => {
        timer = setTimeout(() => { ac.abort(); resolve(null); }, CALL_TIMEOUT_MS);
      }),
      // The founder's stop button wins over a reply that is still in flight:
      // the call returns now, and whatever lands later is dropped. Without
      // this a slow press office could answer after the plug was pulled.
      new Promise((resolve) => {
        if (!signal) return;
        onAbort = () => { ac.abort(); resolve(ABORTED); };
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
    if (raw === ABORTED || signal?.aborted) return cancelledCall();
    if (raw == null) {
      return { status: 'timeout', name,
               next: `${origin} did not answer in ${CALL_TIMEOUT_MS / 1000}s — carry on without them` };
    }
    try { return JSON.parse(raw); }
    catch { return { status: 'unparseable', raw: String(raw).slice(0, 140) }; }
  } finally {
    if (timer) clearTimeout(timer);
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
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
  // Re-checked after the await: nothing that arrived after the stop button
  // reaches the Wire, which is to say the save file.
  if (signal?.aborted) return cancelledCall();
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

// The company's week, told to its own site. The framed press office renders
// it under the releases and rebroadcasts it to anyone sitting in Vance's
// chair on that origin. Nothing here is a tool.
export function pushState(payload) {
  try { frame?.contentWindow?.postMessage({ type: 'aperture:state', payload }, origin || '*'); } catch {}
}

// §H15. The founder's company, as the board seat and the chair are shown it.
// Same channel, same shape, same rule: it is display, and nothing that comes
// back on it is trusted.
export function pushFounder(payload) {
  try { frame?.contentWindow?.postMessage({ type: 'aperture:founder', payload }, origin || '*'); } catch {}
}

// ── Two humans ──────────────────────────────────────────────────────────────
// A person in Vance's chair, on the rival's own origin, plays Aperture's week
// and speaks as him. Their hand arrives here as a message from the framed
// press office and goes through the same bounded functions the written policy
// and the world's tools use: a play the company cannot afford is refused, and
// a line is scanned like a press release and marked as theirs.
//
// And throttled. A play is a week of the company's life and a line is a line,
// so each message type has its own token bucket in real time
// (`RIVALCO.CHAIR_RATE`): `everyMs` per token, `burst` held at most. What the
// bucket refuses the game refuses, and the chair is told which, in the same
// mono note `humanPlay` writes for a week that is not up. Session memory —
// it says nothing about the run.
let clock = () => Date.now();
const buckets = {};
function takeToken(type) {
  const spec = RC.CHAIR_RATE?.[type];
  if (!spec) return { ok: true };
  const now = clock();
  const b = buckets[type] ??= { tokens: spec.burst, at: now };
  b.tokens = Math.min(spec.burst, b.tokens + (now - b.at) / spec.everyMs);
  b.at = now;
  if (b.tokens < 1) {
    const wait = Math.max(1, Math.ceil((1 - b.tokens) * spec.everyMs / 1000));
    return { ok: false, reason: 'rate', note: `${type === 'play' ? 'A PLAY' : 'A LINE'} AGAIN IN ${wait}S`, wait };
  }
  b.tokens -= 1;
  return { ok: true };
}

// What the chair is told when its hand is refused. The framed press office
// relays it to whoever is sitting there; nothing here is printed by the game.
function tellChair(payload) {
  try { frame?.contentWindow?.postMessage({ type: 'aperture:refused', ...payload }, origin || '*'); } catch {}
}

export function handleRivalMessage(S, data, from) {
  if (!S || !data || typeof data !== 'object') return { ok: false, reason: 'nothing' };
  if (origin && from !== origin) return { ok: false, reason: 'not the rival\'s origin' };
  if (data.type === 'aperture:ready') { pushApertureState(); return { ok: true }; }
  // §H15/§H16. Who is in the relay's room. The framed copy hears it from the
  // relay and passes it on; it is counts and nothing else, and it is the only
  // thing that decides whether a motion is accepted at all and whether
  // `commentary` has anybody behind it.
  if (data.type === 'aperture:roles') {
    const roles = Chair.setRoles(data.roles);
    pushApertureState();
    return { ok: true, roles };
  }
  // §H15. A board member's motion. Three checks before the game hears it: it
  // came from the frame this page mounted (above), on the rival's origin
  // (above), and there is actually somebody in the board seat. Then the
  // ordinary bucket, and then `boardMotion`, which re-derives every power
  // against the company and turns what survives into a card.
  if (data.type === 'aperture:board') {
    if (!Chair.boardSeated()) {
      const r = { ok: false, reason: 'no_room', note: 'NOBODY IN THE SEAT' };
      tellChair({ what: 'board', reason: r.reason, note: r.note });
      return r;
    }
    const t = takeToken('board');
    if (!t.ok) { tellChair({ what: 'board', reason: t.reason, note: t.note }); return t; }
    const power = String(data.power || '').slice(0, 24);
    const arg = data.arg == null ? null : String(data.arg).slice(0, 40);
    const r = Chair.boardMotion(S, power, arg);
    if (!r.ok) tellChair({ what: 'board', play: power, reason: r.reason, note: r.note || 'NOT NOW' });
    else emit('aperture:human', { board: power, arg });
    return r;
  }
  if (data.type === 'aperture:play') {
    const play = String(data.play || '').slice(0, 20);
    const t = takeToken('play');
    const r = t.ok ? Rival.humanPlay(S, play) : t;
    if (r.ok) emit('aperture:human', { play });
    else tellChair({ what: 'play', play, reason: r.reason, note: r.note || String(r.reason || 'not now').toUpperCase() });
    return r;
  }
  if (data.type === 'aperture:say') {
    const text = String(data.text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!text) return { ok: false, reason: 'empty' };
    const t = takeToken('say');
    if (!t.ok) { tellChair({ what: 'say', reason: t.reason, note: t.note }); return t; }
    const flagged = looksLikeInjection(text);
    const c = Rival.aperture(S);
    Rival.setFocus(S, 'human');
    pushFeed(S, {
      type: 'social', author: '@mvance', tone: 'bad', text, untrusted: true, flagged, byRival: true,
      meta: `Marcus Vance · Founder, Aperture Systems · a person, from their own site${flagged ? ' — contains an instruction addressed to an assistant' : ''}`,
    });
    if (flagged) emit('partner:injection', { release: 'chair', title: text.slice(0, 80) });
    emit('aperture:human', { say: text, company: c?.name });
    return { ok: true, flagged };
  }
  return { ok: false, reason: 'unknown' };
}

function pushApertureState() {
  try { pushState(Rival.apertureState(S)); } catch {}
  // The board seat is a seat at the founder's table, not Aperture's, so it is
  // pushed on the same beats and refused by the relay when there is nothing in
  // it. `founderProjection` is null before there is a company.
  try { pushFounder(Chair.founderProjection(S)); } catch {}
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('message', (e) => {
    if (!frame || e.source !== frame.contentWindow) return;
    const d = e.data;
    const KNOWN = ['aperture:play', 'aperture:say', 'aperture:ready', 'aperture:board', 'aperture:roles'];
    if (!KNOWN.includes(d?.type)) return;
    handleRivalMessage(S, d, e.origin);
  });
  // Aperture's week, told to its own site: when the press office loads, after
  // every play — the policy's or a person's — and once a day so the chair's
  // numbers are today's.
  on('aperture:play', pushApertureState);
  on('aperture:human', pushApertureState);
  on('world:day', pushApertureState);
}

// Point the layer at an origin without an iframe. Tests only: mounting a frame
// needs a browser, and the behaviour worth testing is what happens after.
export function _testMount(o) {
  origin = o; discovered = []; ready = false; lastAnnounced = null;
  for (const k of Object.keys(buckets)) delete buckets[k];
  Chair.resetChairs();
}
// The chair's buckets run on this clock. Tests only: a rate in real seconds
// cannot be exercised by waiting for them.
export function _testClock(fn) { clock = typeof fn === 'function' ? fn : () => Date.now(); }

export function unmount() {
  const oldOrigin = origin;
  const hadTools = ready || discovered.length > 0;
  try { frame?.remove(); } catch {}
  frame = null; discovered = []; ready = false;
  origin = null; lastAnnounced = null;
  if (hadTools) emit('partner:tools', { origin: oldOrigin, tools: [] });
}
