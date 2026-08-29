// ─────────────────────────────────────────────────────────────────────────────
// THE SURFACE — state in, tools out
//
// `desiredTools(S)` is a pure function of the world. Everything else is
// bookkeeping to make the browser's registration match it, revoking before
// minting, and the whole argument of this project is that the function is not
// a settings screen: the founder's own play writes it.
//
//   Act III arrives              → the market and the regulators join the world's hand
//   a rival becomes the nemesis  → the world can move them
//   the founder meets somebody   → the world can speak as them
//   they earn Untouchable        → regulator_pressure is revoked, permanently
//   they earn Beloved            → `cruel` leaves the tone enum
//   they earn Zero Entropy       → the world can no longer add tech debt
//   they pull the plug           → all of it, at once
//
// So the count in the browser's popover is the cast list of the run, and it
// moves because of something the player did.
// ─────────────────────────────────────────────────────────────────────────────
import * as R from './registry.js';
import * as T from './tools.js';
import { metCharacters, actOf } from '../world/validate.js';
import { nemesisOf, availableMoves } from '../systems/nemesis.js';
import { DOCTRINE_MAP } from '../data/doctrines.js';
import { emit } from '../engine/bus.js';

let screen = null;                 // injected by the UI: show_module + spotlight_panel
export function configureScreen(tools) { screen = tools; }

// The other origin's tools, wrapped. Injected rather than imported so this file
// stays a pure function of state and the partner can simply not be there.
let partner = null;
export function configurePartner(tools) { partner = tools; }

// ── What should exist right now ─────────────────────────────────────────────

export function desiredTools(S) {
  if (!S || S.world?.author?.muted) return [];
  const out = ['briefing', 'advance_time', 'wait_for_world', 'write_event',
               'example_cards', 'explain_term', 'aria_says', 'forecast'];
  if (screen) out.push('show_module', 'spotlight_panel');

  // One-shot: it exists only while there is something to answer.
  const active = S.narrative?.activeEvent;
  if (active && !active.outcome && !active.proposal) out.push('answer_in_own_words');

  for (const id of metCharacters(S)) out.push('post_as_' + id);
  // Only while they can actually afford to do something. A rival between moves
  // has an empty pool, and a required enum with nothing in it is a tool that
  // cannot be called at all.
  if (nemesisOf(S) && availableMoves(S).length) out.push('rival_move');

  // Only while the rival's own origin is actually answering. A press office is
  // public, so reading it needs nothing; putting a question to them and printing
  // the reply in their founder's voice needs the founder to have met him, because
  // that is the world speaking as somebody rather than quoting them.
  if (partner) {
    out.push('read_the_rival');
    if (metCharacters(S).includes('vance')) out.push('ask_the_rival');
  }

  const act = actOf(S);
  if (act >= 3) out.push('market_weather');
  if (act >= 3 && !S.doctrines?.earned?.untouchable) out.push('regulator_pressure');

  return out;
}

// ── Name → definition ───────────────────────────────────────────────────────

export function templateFor(name) {
  if (name.startsWith('post_as_')) return T.voiceTool(name.slice(8));
  if (screen && (name === 'show_module' || name === 'spotlight_panel')) return screen[name];
  if (partner && (name === 'read_the_rival' || name === 'ask_the_rival')) return partner[name];
  return T[name] || null;
}

// Resolve a template against the current world: the description and the schema
// are both functions of state, because both are read on every single call.
export function buildDef(name, S) {
  const t = templateFor(name);
  if (!t) return null;
  return {
    name: t.name,
    title: t.title,
    description: typeof t.description === 'function' ? t.description(S) : t.description,
    inputSchema: T.cleanSchema(typeof t.inputSchema === 'function' ? t.inputSchema(S) : t.inputSchema),
    annotations: t.annotations || {},
    execute: t.execute,
    noMutex: !!t.noMutex,
    fingerprint: typeof t.fingerprint === 'function' ? t.fingerprint(S) : null,
  };
}

// A tool whose shape has changed under the same name — a new act's ceilings, a
// new face in the cast, a move the rival can suddenly afford — has to be
// re-registered, because a description is only re-read if it is re-published.
function reshaped(S) {
  const out = [];
  for (const name of R.list()) {
    const t = templateFor(name);
    if (typeof t?.fingerprint !== 'function') continue;
    if (R.fingerprintOf(name) !== t.fingerprint(S)) out.push(name);
  }
  return out;
}

// ── Reconcile ───────────────────────────────────────────────────────────────

let running = null;

export function reconcile(S, why = 'state') {
  // Serialise: two reconciles overlapping would mint against a stale list.
  running = (running || Promise.resolve()).then(() => run(S, why), () => run(S, why));
  return running;
}

async function run(S, why) {
  if (!R.ready()) return { minted: [], revoked: [], count: 0 };
  const want = new Set(desiredTools(S));
  const have = new Set(R.list());

  const revoked = [...have].filter((n) => !want.has(n));
  const minted = [...want].filter((n) => !have.has(n));
  const changed = reshaped(S).filter((n) => want.has(n));

  // Revoke, then mint. A tool being replaced must stop existing before its
  // replacement is offered, or `registerTool` rejects on the duplicate name.
  for (const n of revoked) await R.revoke(n, why);
  for (const n of changed) await R.revoke(n, 'reshaped');

  // A registration can fail — another registration may already own the name —
  // and reporting it as minted would leave boot claiming a tool that is not
  // there. Report what actually exists afterwards.
  const failed = [];
  for (const n of [...minted, ...changed]) {
    const def = buildDef(n, S);
    if (!def) { failed.push({ name: n, error: 'no definition' }); continue; }
    const r = await R.mint(def);
    if (!r?.ok) failed.push({ name: n, error: r?.error || 'unknown' });
  }
  const actuallyMinted = minted.filter((n) => R.has(n));

  const result = { minted: actuallyMinted, revoked, reshaped: changed,
                   ...(failed.length ? { failed } : {}), count: R.count(), why };
  if (revoked.length || minted.length || changed.length) emit('webmcp:surface', result);
  return result;
}

// ── What the founder's play took away ───────────────────────────────────────
// A doctrine is earned by playing a certain way for weeks. Three of them reach
// into the world's hand, and when one lands the founder should be told what it
// cost the world, not just what it gave them.

export const IMMUNITIES = {
  untouchable: { tool: 'regulator_pressure',
    line: 'Regulators are out of the world\'s hands for the rest of this run.' },
  beloved: { tone: 'cruel',
    line: 'The world can no longer write a cruel choice at you.' },
  zero_entropy: { key: 'debt',
    line: 'The world can no longer add tech debt to your codebase.' },
};

export function immunityFor(doctrineId) {
  const im = IMMUNITIES[doctrineId];
  if (!im) return null;
  return { ...im, name: DOCTRINE_MAP[doctrineId]?.name || doctrineId };
}
