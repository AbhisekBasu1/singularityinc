// ─────────────────────────────────────────────────────────────────────────────
// THE SURFACE — stable registrations, live authority
//
// The desktop browser accepts at most ten distinct registration snapshots for
// one document. A card opening, a sentence being typed, and the rival arriving
// used to revoke and re-mint descriptors; one ordinary run could exhaust that
// budget and make *every* tool disappear. Registration is therefore a stable
// capability index. The executors still validate against the live world at the
// instant a call lands, so an early market shock, an unearned character voice,
// a stale submission id, or a power removed by doctrine is refused by the same
// rules as before.
//
// Mute remains the one intentional teardown. Nothing during ordinary play
// changes the registered names or descriptors.
// ─────────────────────────────────────────────────────────────────────────────
import * as R from './registry.js';
import * as T from './tools.js';
import { everWatching } from '../systems/chair.js';
import { DOCTRINE_MAP } from '../data/doctrines.js';
import { emit } from '../engine/bus.js';

let screen = null;                 // injected by the UI: show_module + spotlight_panel
export function configureScreen(tools) { screen = tools; }

// The other origin's tools, wrapped. Injected rather than imported so this file
// stays a pure function of state and the partner can simply not be there.
let partner = null;
export function configurePartner(tools) { partner = tools; }

// Limits enforced by the desktop browser's WebMCP bridge. Keep them here, next
// to the surface they constrain, and exercise both in the headless regression.
export const MAX_PUBLISHED_TOOLS = 100;
export const MAX_DESCRIPTOR_BYTES = 65_536;
export const MAX_REGISTRATION_CHANGES = 10;

// The published hand. Every name here is minted once, at boot, and never
// re-minted: the descriptor snapshot budget is ten for the life of a document,
// and a tool that appears when it becomes available spends one of them.
// Authority is enforced inside `execute` instead.
//
// Five names were added on top of the original seventeen, and two more things
// that could have been names are parameters on tools that already existed —
// because a surface is read in one gulp by something that then has to choose,
// and two tools that overlap cost more than one tool with a second argument:
//
//   · the walkthrough rides on `explain_term`, which was already "the game's
//     own manual"; the chapters and the glossary are the same shelf.
//   · post-dating rides on `write_event` as `in_days`. A separate
//     `schedule_event` would have been the same 500-word description with one
//     number changed, and `evals/select.mjs` gates on exactly that kind of
//     near-duplicate.
//   · `forget` rides on `remember` as an index, for the same reason: one
//     notebook, one door.
const STABLE_TOOLS = [
  'briefing', 'activity_log', 'inspect_module', 'read_journal', 'inspect_person',
  'advance_time', 'advance_until', 'wait_for_world',
  'write_event', 'aria_says', 'forecast', 'answer_in_own_words', 'take_the_call',
  'ring_the_founder', 'rival_move', 'market_weather', 'regulator_pressure',
  'post_as_character', 'remember', 'write_epilogue',
  'example_cards', 'explain_term', 'next_objective',
];

// ── What should exist right now ─────────────────────────────────────────────

export function desiredTools(S) {
  if (!S || S.world?.author?.muted) return [];
  const out = STABLE_TOOLS.slice();
  if (partner) out.push('read_the_rival', 'ask_the_rival');
  if (screen) out.push('show_module', 'spotlight_panel');
  // §H16. The one name on this surface that is not minted at boot. A tool for
  // talking to people watching cannot honestly exist before anybody is
  // watching — and it must not flap, because a registration snapshot is one of
  // ten for the life of the document. So it latches: the first spectator the
  // relay reports publishes it, and it stays for the session. `execute`
  // re-checks whether the room is still occupied, which is the same
  // stable-registration/live-authority rule everything else here follows.
  if (everWatching()) out.push('commentary');
  return out;
}

// ── Name → definition ───────────────────────────────────────────────────────

export function templateFor(name) {
  if (name === 'post_as_character') return T.post_as_character;
  if (screen && (name === 'show_module' || name === 'spotlight_panel')) return screen[name];
  if (partner && (name === 'read_the_rival' || name === 'ask_the_rival')) return partner[name];
  if (name === 'commentary') return T.commentary;
  return T[name] || null;
}

// Resolve once, at publication. Anything that changes during play belongs in a
// tool result or a structured refusal, never in a new registration snapshot.
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
    ...(t.exposedTo ? { exposedTo: t.exposedTo } : {}),
  };
}

// The host measures the whole serialised descriptor list, not each schema in
// isolation. Exposed for the regression and checked before any registration so
// an accidental oversized addition fails locally instead of disabling WebMCP.
export function descriptorSnapshot(S) {
  return desiredTools(S).map((name) => {
    const d = buildDef(name, S);
    return d && { name: d.name, title: d.title, description: d.description,
                  inputSchema: d.inputSchema, annotations: d.annotations };
  }).filter(Boolean);
}

export function descriptorBytes(S) {
  return new TextEncoder().encode(JSON.stringify(descriptorSnapshot(S))).byteLength;
}

// ── Reconcile ───────────────────────────────────────────────────────────────

let running = null;
const external = new Set();
export function keepExternal(name) { external.add(name); return name; }
export function externalTools() { return [...external]; }

export function reconcile(S, why = 'state') {
  // Serialise: two reconciles overlapping would mint against a stale list.
  running = (running || Promise.resolve()).then(() => run(S, why), () => run(S, why));
  return running;
}

async function run(S, why) {
  if (!R.ready()) return { minted: [], revoked: [], count: 0 };
  const snapshot = descriptorSnapshot(S);
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
  if (snapshot.length > MAX_PUBLISHED_TOOLS || bytes > MAX_DESCRIPTOR_BYTES) {
    return { minted: [], revoked: [], count: R.count(), why,
      failed: [{ name: 'surface', error: snapshot.length > MAX_PUBLISHED_TOOLS
        ? `${snapshot.length} tools exceeds ${MAX_PUBLISHED_TOOLS}`
        : `${bytes} descriptor bytes exceeds ${MAX_DESCRIPTOR_BYTES}` }] };
  }
  const want = new Set(desiredTools(S));
  const have = new Set(R.list());

  // A name minted outside this list is not a stray. `founder_public` is
  // published to the rival's origin and deliberately absent from this page's
  // own hand, so a reconcile that treated `have` minus `want` as garbage would
  // revoke it on the next state change. The plug still takes it: `muteAll`
  // aborts every registration, external or not.
  const revoked = [...have].filter((n) => !want.has(n) && !external.has(n));
  const minted = [...want].filter((n) => !have.has(n));

  // Start every abort/register in one turn. Browsers coalesce the resulting
  // toolchange events into one descriptor snapshot; awaiting each name here
  // would expose every intermediate list as another change.
  await Promise.all(revoked.map((n) => R.revoke(n, why)));

  // A registration can fail — another registration may already own the name —
  // and reporting it as minted would leave boot claiming a tool that is not
  // there. Report what actually exists afterwards.
  const failed = [];
  const defs = [];
  for (const n of minted) {
    const def = buildDef(n, S);
    if (!def) { failed.push({ name: n, error: 'no definition' }); continue; }
    defs.push([n, def]);
  }
  const results = await Promise.all(defs.map(([, def]) => R.mint(def)));
  results.forEach((r, i) => {
    if (!r?.ok) failed.push({ name: defs[i][0], error: r?.error || 'unknown' });
  });
  const actuallyMinted = minted.filter((n) => R.has(n));

  const result = { minted: actuallyMinted, revoked, reshaped: [],
                   ...(failed.length ? { failed } : {}), count: R.count(), why };
  if (revoked.length || minted.length) emit('webmcp:surface', result);
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
