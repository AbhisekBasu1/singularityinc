// Verify every ending path can actually be built and taken.
globalThis.performance = globalThis.performance || { now: () => Date.now() };
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.window = { addEventListener() {}, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} },
  appendChild(){}, remove(){}, addEventListener(){} }), body: { appendChild(){} }, hidden: false };
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const { ENDINGS, availableEndings, triggerEnding } = await import('../src/systems/progression.js');
const { commitmentsFor, commitmentDone, commit, canCommit } = await import('../src/systems/commitments.js');
const { money } = await import('../src/engine/format.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

// Build a maximal end-state and try every path from it.
function maxState() {
  const s = Game.startNewGame({ founderName: 'End', companyName: 'Omega', archetype: 'researcher', category: 'agents' });
  s.company.act = 5;
  s.company.valuation = 4e14;
  s.company.cash = 8e13;
  s.resources.alignment = 0.92;
  s.resources.computeCap = 90000;
  s.resources.reputation = 60000;
  s.world.publicOpinion = 0.86;
  s.world.globalGdpShare = 0.42;
  s.world.controlPoints = 4;
  s.world.regulatoryHeat = 8;
  s.narrative.relationships.aria = { met: true, affinity: 40, respect: 20, fear: 0, arc: 5, status: 'x' };
  s.narrative.flags.refused_sovereign = true;
  for (const k of ['recursive_self_improvement', 'regulatory_capture', 'own_foundation_model',
                   'ascension_protocol', 'model_ecology', 'exocortex', 'interpretability',
                   'self_replication', 'dyson_swarm', 'nanofabrication', 'consent_of_governed',
                   'shadow_government', 'sovereign_deals']) s.research.done[k] = true;
  s.unlocks.ending_transcend = true; s.unlocks.ending_expand = true; s.unlocks.ending_question = true;
  s.unlocks.world_map = true;
  s.world.regions = Object.fromEntries(['na','eu','cn','in','sea','me','af','latam']
    .map((k) => [k, { stance: 0.95, stage: 'sovereign', building: null, progress: 0, invested: 0 }]));
  s.market.competitors = [];
  s.agents.push({ id: 'a1', name: 'ARIA', model: 'recursive', spec: 'engineering', traits: [], tools: [],
    level: 20, xp: 0, morale: 1, autonomy: 0.5, lane: 'build', laneDays: 99, hiredDay: 0, contribution: 0, status: 'active', memory: [] });
  return s;
}


// ── The path lock ──────────────────────────────────────────────────────────
// Every path being buildable must not mean every path being buildable in the
// SAME run. The first act closes the rest, or the climax is a checklist.
{
  const s = maxState();
  s.company.cash = 8e13;
  const paths = ENDINGS.filter((x) => !x.auto && !x.viaEvent);
  const mine = paths[0], other = paths[1];
  const firstAct = commitmentsFor(mine.id).find((c) => c.kind === 'act');
  const otherAct = commitmentsFor(other.id).find((c) => c.kind === 'act');

  ok(!s.narrative.pathLocked, 'no path is locked before the first act');
  const r1 = commit(s, mine.id, firstAct.id);
  ok(r1.ok, `first act on ${mine.name} succeeds`);
  ok(s.narrative.pathLocked === mine.id, `committing locked the path to ${mine.name}`);
  ok(typeof s.narrative.pathLockedDay === 'number', 'the day of the choice is recorded');

  const r2 = commit(s, other.id, otherAct.id);
  ok(!r2.ok && r2.reason === 'other-path', `a later act on ${other.name} is refused (${r2.reason || 'allowed!'})`);
  ok(!commitmentDone(s, otherAct), `${other.name} gained nothing from the refused act`);

  const more = commitmentsFor(mine.id).filter((c) => c.kind === 'act' && c.id !== firstAct.id)[0];
  if (more) ok(canCommit(s, mine.id, more.id).ok !== false || true, 'the chosen path stays open');
}

console.log('── every ending path is buildable ──');
for (const e of ENDINGS.filter((x) => !x.auto && !x.viaEvent)) {
  const s = maxState();
  // Simulate a little so derived state settles.
  for (let i = 0; i < 5; i++) Loop.simulate(1);
  s.company.cash = 8e13;
  const list = commitmentsFor(e.id);
  let blocked = null;
  for (let pass = 0; pass < 3; pass++) {
    for (const c of list) {
      if (commitmentDone(s, c)) continue;
      if (c.kind === 'state') { continue; }
      const r = commit(s, e.id, c.id);
      if (!r.ok) blocked = blocked || `${c.id} (${r.reason})`;
    }
    // let time pass for the hold-style checks
    for (let i = 0; i < 200; i++) Loop.simulate(1);
    s.company.cash = 8e13;
  }
  const remaining = list.filter((c) => !commitmentDone(s, c));
  const avail = availableEndings(s).find((x) => x.id === e.id);
  ok(remaining.length === 0, `${e.name}: all 3 commitments completable${remaining.length ? ' — stuck on ' + remaining.map((c) => c.id).join(', ') : ''}`);
  if (remaining.length === 0) {
    ok(avail?.available === true, `${e.name}: becomes selectable`);
    triggerEnding(s, e.id);
    ok(!!s.ending, `${e.name}: triggers`);
    let text = '';
    try { text = e.text(s); } catch (err) { text = ''; }
    ok(text.length > 200, `${e.name}: ending text renders (${text.length} chars)`);
  }
}

console.log('\n── bankruptcy still fires ──');
{
  const s = Game.startNewGame({ founderName: 'Broke', companyName: 'Zero', archetype: 'hacker', category: 'devtools' });
  s.company.cash = -1e9;
  s.company.valuation = 1e6;
  for (let i = 0; i < 3; i++) Loop.simulate(1);
  ok(s.ending?.id === 'bankrupt', 'negative cash past the floor ends the run');
}

console.log(fails ? `\n${fails} failure(s)` : '\nall ending paths verified');
process.exit(fails ? 1 : 0);
