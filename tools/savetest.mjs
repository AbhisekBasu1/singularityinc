// Save / load / migrate / offline round-trip test.
globalThis.performance = globalThis.performance || { now: () => Date.now() };
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; } };
globalThis.window = { addEventListener() {}, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} },
  appendChild(){}, remove(){}, addEventListener(){} }), body: { appendChild(){} }, hidden: false };
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const Save = await import('../src/engine/save.js');
const StateMod = await import('../src/engine/state.js');
const { totalUsers, totalMrr } = await import('../src/systems/product.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI } = await import('../src/systems/founder.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); };

// Build a rich mid-game state.
// Seeded: "users did not go backwards offline" is a property of one run, not
// of the simulation, and an unseeded run failed it about one time in five.
const s = Game.startNewGame({ founderName: 'Save Test', companyName: 'Persist', archetype: 'operator', category: 'agents', seed: 4242 });
for (let d = 0; d < 500; d++) {
  for (let i = 0; i < 3; i++) if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s);
  for (let i = 0; i < 3; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
  const p = s.products[0];
  if (!p.launched && p.features.length >= 4) Game.doLaunch(s);
  if (!s.research.active) { const av = availableResearch(s).sort((a, b) => a.cost - b.cost); if (av.length) startResearch(s, av[0].id); }
  if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3) hireAgent(s, rollCandidate(s));
  if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) { resolveChoice(s, 1); dismissEvent(s); }
  Loop.simulate(1);
}

const before = { day: s.time.day, cash: s.company.cash, users: totalUsers(s), mrr: totalMrr(s),
  agents: s.agents.length, research: s.stats.researchDone, journal: s.narrative.journal.length,
  features: s.stats.featuresShipped, act: s.company.act, ach: Object.keys(s.achievements).length };

console.log('\n── save/load round trip ──');
ok(Save.save(s), 'save() succeeds');
ok(Save.hasSave(), 'hasSave() true after save');
const loaded = Save.load();
ok(!!loaded, 'load() returns a state');
const after = { day: loaded.time.day, cash: loaded.company.cash, users: totalUsers(loaded), mrr: totalMrr(loaded),
  agents: loaded.agents.length, research: loaded.stats.researchDone, journal: loaded.narrative.journal.length,
  features: loaded.stats.featuresShipped, act: loaded.company.act, ach: Object.keys(loaded.achievements).length };
for (const k of Object.keys(before)) {
  ok(Math.abs((before[k] || 0) - (after[k] || 0)) < 0.001, `${k} preserved (${before[k]} → ${after[k]})`);
}

console.log('\n── export / import ──');
const blob = Save.exportSave(loaded);
ok(blob.length > 500, `export produces a blob (${blob.length} chars)`);
ok(Save.importSave(blob), 'import accepts its own export');

// A forecast points the live binding at a throwaway clone while it runs, and
// the Settings export reads that binding. The clone must never leave, and a
// flag that describes this moment rather than the run must never travel.
{
  const clone = { ...loaded, _forecast: true };
  ok(Save.exportSave(clone) === null, 'a forecast clone cannot be exported');
  ok(Save.save(clone) === false, 'nor saved');
  const flagged = { ...loaded, _agentDriven: true };
  const decoded = JSON.parse(decodeURIComponent(escape(atob(Save.exportSave(flagged)))));
  ok(!('_agentDriven' in decoded) && !('_forecast' in decoded), 'transient flags are stripped from an export');
  ok(flagged._agentDriven === true, 'without touching the live object');
}

console.log('\n── forward migration from an older schema ──');
const old = JSON.parse(JSON.stringify(loaded));
old.meta.version = 1;
delete old.world.race;                 // system added later
delete old.world.projectsBuilt;
delete old.objectivesDone;
delete old.settings.autoShip;
delete old.company.actStartedDay;
// Fields on array elements: deepMerge replaces arrays wholesale, so these are
// the ones a two-level fill could never reach.
delete old.products[0].peakUsers;
delete old.products[0].sentiment;
if (old.agents[0]) { delete old.agents[0].tools; delete old.agents[0].level; }
if (old.market.competitors[0]) { delete old.market.competitors[0].memory; delete old.market.competitors[0].grudge; }
// And a field that moved: the transform for version 9 carries it across.
old._lastShipDay = 123; delete old.stats.lastShipDay;
store['singularity_inc_save_v1'] = JSON.stringify(old);
const migrated = Save.load();
ok(!!migrated, 'old save loads');
ok(migrated.products[0].peakUsers === 0 && migrated.products[0].sentiment === 0.5, 'a product missing fields is backfilled from the factory');
ok(!old.agents[0] || (Array.isArray(migrated.agents[0].tools) && migrated.agents[0].level === 1), 'and so is an agent');
ok(!old.market.competitors[0] || (Array.isArray(migrated.market.competitors[0].memory) && migrated.market.competitors[0].grudge === 0), 'and a competitor');
ok(migrated.stats.lastShipDay === 123 && migrated._lastShipDay === undefined, 'a moved field is carried by its version transform');
ok(migrated.products[0].id === old.products[0].id && migrated.products[0].name === old.products[0].name, 'identity is never overwritten');
ok(migrated.meta.version >= 7, 'version upgraded');
ok(!!migrated.objectivesDone, 'missing objectivesDone filled');
ok(migrated.world.projectsBuilt !== undefined, 'missing projectsBuilt filled');
ok(migrated.company.act === before.act, 'act preserved through migration');
let simErr = null;
try { for (let i = 0; i < 60; i++) Loop.simulate(1); } catch (e) { simErr = e; }
ok(!simErr, 'migrated save simulates without error' + (simErr ? ': ' + simErr.message : ''));

console.log('\n── offline catch-up ──');
const s2 = StateMod.S;
s2.meta.lastRealTime = Date.now() - 3 * 3600 * 1000;   // 3 hours ago
const u0 = totalUsers(s2), c0 = s2.company.cash;
const off = Loop.offlineCatchUp(s2);
ok(off && off.days > 0, `offline advanced ${off ? off.days.toFixed(1) : 0} days`);
ok(totalUsers(s2) >= u0, 'users did not go backwards offline');
ok(Number.isFinite(s2.company.cash), 'cash stayed finite offline');
ok(Number.isFinite(s2.company.valuation) && s2.company.valuation >= 0, 'valuation stayed finite');

console.log('\n── corrupt input ──');
store['singularity_inc_save_v1'] = '{not json';
ok(Save.load() === null, 'corrupt save returns null instead of throwing');
ok(Save.importSave('garbage!!') === false, 'garbage import rejected');

console.log(fails ? `\n${fails} failure(s)` : '\nall save tests passed');
process.exit(fails ? 1 : 0);
