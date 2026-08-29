// ─────────────────────────────────────────────────────────────────────────────
// BOOT — detect, register, and keep the surface honest as the run changes.
//
// Everything here is additive. If `document.modelContext` is absent this module
// paints one line into the console explaining why and returns; the game plays
// in full on its written deck, which is what a judge in an ordinary browser
// will see and what every player without an assistant gets.
// ─────────────────────────────────────────────────────────────────────────────
import * as R from './registry.js';
import * as Surface from './surface.js';
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
    tier: cap.tier, label: cap.label, reason: cap.reason,
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
  + 'Keep it fair and make it memorable.';

export const deepLinks = (prompt = HIRE_PROMPT) => makeLinks(prompt);
export { capability };

// The clock must not advance underneath a tool that is mid-write, or a card
// arrives against a state one tick older than the one it was written for.
function setBusy(busy) { setToolBusy(busy); }

export async function boot({ screen } = {}) {
  cap = capability();
  emit('webmcp:capability', cap);
  if (cap.tier === 'none') { booted = false; return cap; }

  if (screen) Surface.configureScreen(screen);
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
  Partners.mount().then(async (r) => {
    if (!r?.ok) return;
    Surface.configurePartner((await import('./tools.js')).partnerTools(Partners));
    await Surface.reconcile(LIVE, 'the rival is answering');
    emit('webmcp:partner', r);
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

// Every trigger that can change what the world is allowed to do. The daily one
// is a safety net, not the mechanism — the bus events are the mechanism.
function wire() {
  for (const off of unwire) off();
  unwire = [];
  const re = (why) => () => { if (booted) Surface.reconcile(LIVE, why); };

  unwire.push(on('act:advance', re('act')));
  unwire.push(on('nemesis:named', re('rival')));
  unwire.push(on('event:present', re('card')));
  unwire.push(on('event:resolved', re('answered')));
  unwire.push(on('event:proposal', re('proposal')));
  unwire.push(on('event:proposal_declined', re('declined')));
  unwire.push(on('event:dismissed', re('dismissed')));
  unwire.push(on('load', re('load')));
  unwire.push(on('world:unmute', re('unmute')));

  // A doctrine can take a tool out of the world's hand for the rest of the run.
  unwire.push(on('doctrine', (doc) => {
    if (!booted) return;
    const im = Surface.immunityFor(doc?.id);
    Surface.reconcile(LIVE, 'doctrine:' + doc?.id).then(() => {
      if (!im) return;
      const a = World.authorState(LIVE);
      a.stats.revokedByDoctrine = (a.stats.revokedByDoctrine || 0) + 1;
      emit('world:immunity', { doctrine: doc, ...im });
    });
  }));

  // Meeting somebody gives the world a voice it did not have. Relationships
  // change inside event effects, so watch the resolution rather than each fx.
  unwire.push(on('event:resolved', () => { if (booted) Surface.reconcile(LIVE, 'cast'); }));
  unwire.push(on('world:day', re('day')));
}

// ── The plug ────────────────────────────────────────────────────────────────

export async function mute() {
  World.mute(LIVE);
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
  else await Surface.reconcile(LIVE, 'unmute');
  return status();
}

export function isBooted() { return booted; }
export { R as registry, Surface as surface, Partners as partners };
