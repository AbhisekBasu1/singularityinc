// Prestige / new-timeline round trip.
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
const Save = await import('../src/engine/save.js');
const StateMod = await import('../src/engine/state.js');
const { computeMods } = await import('../src/systems/modifiers.js');
const { LEGACY_MAP } = await import('../src/data/legacy.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI } = await import('../src/systems/founder.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { totalMrr } = await import('../src/systems/product.js');
const { money } = await import('../src/engine/format.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

function play(s, days) {
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 3; i++) if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s);
    for (let i = 0; i < 4; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
    const p = s.products[0];
    if (!p.launched && p.features.length >= 4) Game.doLaunch(s);
    if (!s.research.active) { const av = availableResearch(s).sort((a, b) => a.cost - b.cost); if (av.length) startResearch(s, av[0].id); }
    if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3) hireAgent(s, rollCandidate(s));
    if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
      const ch = s.narrative.activeEvent.choices;
      const E = /Take it\. Life-changing|Take it\. This is a good outcome|Honour it\. You said a number/;
      let i = ch.findIndex((c) => !E.test(c.label));
      resolveChoice(s, i < 0 ? 0 : i); dismissEvent(s);
    }
    Loop.simulate(1);
  }
}

console.log('── run 1 ──');
let s = Game.startNewGame({ founderName: 'A', companyName: 'One', archetype: 'hacker', category: 'devtools' });
play(s, 700);
const r1 = { act: s.company.act, val: s.company.valuation, ach: Object.keys(s.achievements).length,
  arch: [...(s.legacy.unlockedArchetypes || [])] };
console.log(`  act ${r1.act} · ${money(r1.val)} · ${r1.ach} achievements · ${r1.arch.length} archetypes unlocked`);
ok(r1.act >= 3, 'reached at least act III');
ok(r1.ach > 20, 'earned achievements');

const { gain, legacy } = Game.prestige(s);
console.log(`\n── prestige ──`);
ok(gain > 5 && gain < 400, `legacy gain is in a sane band (${gain})`);
ok(legacy.runs === 1, 'run counter incremented');
ok(!Save.hasSave(), 'run save cleared');
ok(!!Save.loadLegacy(), 'legacy persisted');
ok(Object.keys(legacy.achievements || {}).length === r1.ach, 'achievements carried into legacy');
ok((legacy.unlockedArchetypes || []).length >= r1.arch.length, 'archetype unlocks carried');

console.log('\n── spend legacy points ──');
const L = Save.loadLegacy();
L.perks = L.perks || {};
let spent = 0;
for (const id of ['seed_capital', 'muscle_memory', 'prompt_savant', 'iron_constitution']) {
  const perk = LEGACY_MAP[id];
  const lvl = L.perks[id] || 0;
  const cost = perk.cost(lvl);
  if (L.points >= cost) { L.points -= cost; L.perks[id] = lvl + 1; spent += cost; }
}
Save.saveLegacy(L);
ok(spent > 0, `spent ${spent} points on perks`);

console.log('\n── run 2 (with legacy) ──');
const s2 = Game.startNewGame({ founderName: 'B', companyName: 'Two', archetype: 'hacker', category: 'devtools' });
ok(s2.company.cash > 12000, `starting cash boosted by Seed Capital (${money(s2.company.cash)})`);
const m2 = computeMods(s2);
ok(m2.codeRate > 1.3, `code rate carries the perk (×${m2.codeRate.toFixed(2)})`);
ok(s2.legacy.runs === 1, 'run 2 knows it is the second timeline');
ok(Object.keys(s2.achievements).length === 0, 'this run starts with a clean achievement sheet');
play(s2, 350);
ok(s2.company.act >= 2, `run 2 progresses (act ${s2.company.act})`);
ok(s2.stats.featuresShipped > 5, 'run 2 ships features');

console.log('\n── legacy math sanity ──');
const { computeLegacyGain } = await import('../src/data/legacy.js');
for (const [label, mock] of [
  ['tiny run', { company: { valuation: 4e5, act: 1 }, ending: null, achievements: {}, stats: { researchDone: 2 } }],
  ['good run', { company: { valuation: 2e11, act: 4 }, ending: { id: 'steward' }, achievements: Object.fromEntries(Array.from({length:60},(_,i)=>[i,1])), stats: { researchDone: 60 } }],
  ['perfect run', { company: { valuation: 3e14, act: 5 }, ending: { id: 'question' }, achievements: Object.fromEntries(Array.from({length:110},(_,i)=>[i,1])), stats: { researchDone: 85 } }],
]) {
  const g = computeLegacyGain({ ...mock, legacy: {} });
  console.log(`  ${label.padEnd(12)} → ${g} points`);
  ok(g >= 1 && g < 200, `${label} yields a sane payout`);
}

console.log(fails ? `\n${fails} failure(s)` : '\nprestige loop verified');
process.exit(fails ? 1 : 0);
