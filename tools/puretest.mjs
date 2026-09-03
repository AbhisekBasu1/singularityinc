// ─────────────────────────────────────────────────────────────────────────────
// PURE — does looking at the game change the game?
//
// "A render path must never draw from the shared RNG stream" is the rule with
// the worst failure mode in this codebase, because breaking it is invisible:
// `askAria` picked a sentence with `pick()` and every repaint — about seven a
// second — silently advanced the seeded stream, desynchronising every event
// draw and market roll after it. It came back: `computeLaneOutput` rolls goal
// drift for any agent with the Goal-Drifting trait, and three views called it
// straight out of `render(S)`.
//
// So: put drifting agents on the roster, render every view twice, and assert
// that the stream did not move and that the two strings are identical. The
// control at the end proves the check can still see the bug it was written
// for — a purity test that has gone blind reports the same thing as a clean
// codebase.
//
//   node tools/puretest.mjs
// ─────────────────────────────────────────────────────────────────────────────
const stub = () => {};
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { getItem: () => null, setItem: stub, removeItem: stub };
globalThis.window = { addEventListener: stub, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener: stub, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add: stub, remove: stub, toggle: stub },
    appendChild: stub, remove: stub, addEventListener: stub }), body: { appendChild: stub }, hidden: false };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = stub;
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { newGame, setState } = await import('../src/engine/state.js');
const { rngState } = await import('../src/engine/rng.js');
const { TRAITS } = await import('../src/data/agents.js');
const { agentStats } = await import('../src/systems/modifiers.js');
const { computeLaneOutput, laneOutputPure } = await import('../src/systems/agents.js');
const Loop = await import('../src/engine/loop.js');

const VIEWS = ['desk', 'product', 'agents', 'research', 'market', 'world', 'story', 'legacy'];
const mods = {};
for (const v of VIEWS) mods[v] = await import(`../src/ui/views/${v}.js`);

const S = newGame({ founderName: 'Alex Rivera', companyName: 'Meridian', archetype: 'hacker', seed: 4242 });
setState(S);
S.company.act = 4;
S.products.push({ id: 'p1', name: 'Meridian', category: 'devtools', launched: true, launchDay: 10,
  features: [{ name: 'X', kind: 'core', day: 1, fit: 1, q: 0, a: 0, p: 0, r: 0 }],
  quality: 0.6, polish: 0.5, appeal: 0.6, reliability: 0.9, reliabilityTarget: 0.92,
  price: 30, pricing: 'sub', users: 500000, payingUsers: 120000, awareness: 5000, mrr: 3000000,
  churnMonthly: 0.03, viralK: 0.2, momentum: 0, sentiment: 0.7, peakUsers: 500000,
  totalRevenue: 0, fairPrice: 30, discountReach: 1 });
S.activeProductId = 'p1';

// The trait that rolls. Found by its modifier rather than by name, so renaming
// it does not quietly turn this whole file into a no-op.
const drifter = TRAITS.find((t) => t.mods && 'drift' in t.mods);
if (!drifter) { console.log('  ✗ no drift trait — this check cannot see its own bug'); process.exit(1); }
for (let i = 0; i < 3; i++) {
  S.agents.push({ id: 'a' + i, name: 'Agent ' + i, model: 'deep', spec: 'engineering',
    traits: [drifter.id], tools: [], level: 5, xp: 0, morale: 0.9, autonomy: 0.8,
    lane: i === 2 ? 'ops' : 'build', laneDays: 30, hiredDay: 1, contribution: 0,
    status: 'active', memory: [] });
}

let pass = 0, fail = 0;
const ok = (label, good, note = '') => {
  if (good) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${note ? ' — ' + note : ''}`); }
};

function sweep(when) {
  console.log(`\n── every view, ${when} ──`);
  for (const v of VIEWS) {
    const before = rngState();
    let a, b;
    try { a = mods[v].render(S); b = mods[v].render(S); }
    catch (e) { ok(`${v} renders`, false, String(e.message)); continue; }
    ok(`${v}: the stream did not move`, rngState() === before, `${before} → ${rngState()}`);
    ok(`${v}: two renders are identical`, a === b, 'the second differs from the first');
  }
}

console.log(`\ndrifting agents on the roster · drift = ${agentStats(S.agents[0], S).drift}`);
sweep('before the first tick');
Loop.simulate(1);
sweep('with a tick’s cache in place');

// The control. If `computeLaneOutput` has stopped drawing, the sweep above is
// testing nothing and would say so in exactly the same words.
console.log('\n── the check can still see the bug ──');
{
  const at = rngState();
  for (let i = 0; i < 7; i++) computeLaneOutput(S);
  ok('computeLaneOutput still draws (the bug is reachable)', rngState() !== at);
  const at2 = rngState();
  for (let i = 0; i < 7; i++) laneOutputPure(S);
  ok('laneOutputPure draws nothing at all', rngState() === at2);
}

console.log(`\n═══ pure: ${pass}/${pass + fail} checks passed ═══`);
process.exit(fail ? 1 : 0);
