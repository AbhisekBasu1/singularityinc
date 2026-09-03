// ─────────────────────────────────────────────────────────────────────────────
// BOOT — detect, register, and keep the surface honest as the run changes.
//
// Everything here is additive. If `document.modelContext` is absent this module
// paints one line into the console explaining why and returns; the game plays
// in full on its written deck, which is what a judge in an ordinary browser
// will see and what every player without an assistant gets.
// ─────────────────────────────────────────────────────────────────────────────
import * as R from './registry.js';
import { REMEDY } from '../data/platform.js';
import * as Surface from './surface.js';
import { partnerTools, founderPublicTool } from './tools.js';
import { capability, deepLinks as makeLinks } from './detect.js';
import * as World from '../world/author.js';
import * as Partners from './partners.js';
import { on, emit } from '../engine/bus.js';
import { S as LIVE } from '../engine/state.js';
import { setToolBusy } from '../engine/loop.js';

let cap = { tier: 'none' };
let booted = false;
let unwire = [];

export function status() {
  const s = LIVE;
  return {
    tier: cap.tier, label: cap.label,
    // detect.js is portable and names no vendor; the game does, in one place.
    reason: cap.tier === 'none' && cap.secure ? REMEDY : cap.reason,
    count: R.count(), tools: R.list(),
    partner: Partners.isReady()
      ? { origin: Partners.partnerOrigin(), tools: Partners.partnerTools().map((t) => t.name) }
      : null,
    muted: !!s?.world?.author?.muted,
    mode: World.authorMode(),
    waiting: World.isWaiting(),
    pending: World.pendingSlot(),
    calls: R.calls(),
  };
}

// What the deep link types into a new thread. Short on purpose: the rules ride
// in the tool descriptions, which are re-read on every call, rather than in a
// query string that is read once.
export const HIRE_PROMPT =
  'You are the world of SINGULARITY, INC. — the market, the rivals, the press, the people. '
  + 'Call briefing, then wait_for_world, and play the world against the founder while they play. '
  + 'Meaningful play across every module arrives through that wait; use activity_log after a reconnect '
  + 'and inspect_module when a beat needs more context. '
  + 'Keep it fair and make it memorable. Re-call wait_for_world after every result, including while '
  + 'the founder Accepts a proposed consequence; keep the live loop open until they ask you to stop.';

export const deepLinks = (prompt = HIRE_PROMPT) => makeLinks(prompt);
export { capability };

// The clock must not advance underneath a tool that is mid-write, or a card
// arrives against a state one tick older than the one it was written for.
function setBusy(busy) { setToolBusy(busy); }

export async function boot({ screen } = {}) {
  cap = capability();
  emit('webmcp:capability', cap);
  if (cap.tier === 'none') {
    booted = false;
    // No site tools, but the rival's origin is still worth framing: the press
    // office is the channel a second human's chair speaks through, and it
    // renders Aperture's week whether or not anything can call a tool.
    Partners.mount().catch(() => {});
    return cap;
  }

  if (screen) Surface.configureScreen(screen);
  // Publish the bridge names in the initial batch. Discovery may finish later;
  // the wrappers read the partner's live state when called and return a clean
  // `unreachable` refusal until then. Adding them after discovery used to be
  // one more registration snapshot in an already long-running document.
  Surface.configurePartner(partnerTools(Partners));
  R.setEmitter(emit);          // the registry has no opinion about our bus
  R.init(cap.mc, { setBusy });
  booted = true;

  wire();
  await Surface.reconcile(LIVE, 'boot');

  try {
    cap.mc.addEventListener?.('toolchange', () => emit('webmcp:tools', { action: 'toolchange', count: R.count() }));
  } catch {}

  // The other origin. Best effort and entirely optional: if the rival's press
  // office is not there, the game does not notice and nothing here waits on it.
  Partners.mount().then((r) => {
    if (!r?.ok) return;
    emit('webmcp:partner', r);
    // §H12. And one tool pointing the other way. `exposedTo` publishes it to
    // the rival's origin and to nobody else — the founder's own assistant
    // never sees it in its list, which is what makes the information
    // asymmetric rather than merely themed. It is minted here rather than in
    // `desiredTools` for exactly that reason: that list is this page's hand.
    mintFounderPublic(r.origin);
  }).catch(() => {});
  if (typeof window !== 'undefined') {
    // `pagehide` also fires on the way into the back-forward cache, where the
    // document is kept alive and can be restored by the Back button. Revoking
    // and never reconciling would bring the game back with an empty tool list.
    window.addEventListener('pagehide', () => { R.revokeAll('the page went away'); });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && booted) Surface.reconcile(LIVE, 'restored from the back-forward cache');
    });
  }
  return cap;
}

// Authority changes continuously, but registration does not. Every executor
// validates live state, so routine game events must never touch the surface:
// the browser disables WebMCP after ten distinct descriptor snapshots.
function wire() {
  for (const off of unwire) off();
  unwire = [];
  const re = (why) => () => { if (booted) Surface.reconcile(LIVE, why); };

  // A new save may replace a muted run with an unmuted one. Unmute is the only
  // other intentional transition from an empty surface back to the fixed set.
  unwire.push(on('load', re('load')));
  unwire.push(on('world:unmute', re('unmute')));

  // A doctrine still takes authority away, but the stable capability remains
  // visible and explains the earned immunity if called.
  unwire.push(on('doctrine', (doc) => {
    if (!booted) return;
    const im = Surface.immunityFor(doc?.id);
    if (!im) return;
    const a = World.authorState(LIVE);
    a.stats.revokedByDoctrine = (a.stats.revokedByDoctrine || 0) + 1;
    emit('world:immunity', { doctrine: doc, ...im });
  }));
}

// ── The plug ────────────────────────────────────────────────────────────────

export async function mute() {
  World.mute(LIVE);
  // The framed origin owns two registrations of its own. Removing the frame is
  // the only way the plug can truthfully mean every origin, not just this one.
  Partners.unmount();
  // Queue behind anything already reconciling. `desiredTools` is empty once
  // muted, so this revokes the whole surface in order rather than racing a
  // mint that was computed a moment before the plug came out.
  await Surface.reconcile(LIVE, 'muted');
  await R.muteAll('the founder pulled the plug');
  return status();
}

export async function unmute() {
  World.unmute(LIVE);
  if (!booted) await boot();
  else {
    await Surface.reconcile(LIVE, 'unmute');
    Partners.mount().then((r) => { if (r?.ok) emit('webmcp:partner', r); }).catch(() => {});
  }
  return status();
}

// One extra registration, once, when the second origin answers. Failures are
// not fatal and are not reported to the player: a browser without `exposedTo`
// support simply does not publish it, and the rival's page falls back to what
// the relay carries.
let mintedPublic = false;
async function mintFounderPublic(origin) {
  if (mintedPublic || !origin || !R.ready()) return null;
  mintedPublic = true;
  const t = founderPublicTool(origin);
  Surface.keepExternal(t.name);
  const r = await R.mint({
    name: t.name, title: t.title,
    description: typeof t.description === 'function' ? t.description(LIVE) : t.description,
    inputSchema: typeof t.inputSchema === 'function' ? t.inputSchema(LIVE) : t.inputSchema,
    annotations: t.annotations, execute: t.execute, exposedTo: t.exposedTo,
  });
  emit('webmcp:exposed', { name: t.name, to: origin, ok: !!r?.ok });
  return r;
}
export function _testExposeFounderPublic(origin) { mintedPublic = false; return mintFounderPublic(origin); }

export function isBooted() { return booted; }
export { R as registry, Surface as surface, Partners as partners };
