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

// One seed per run in this file, all derived from one number, so `SEED1=…`
// re-rolls the whole suite at once when somebody wants to know whether an
// assertion holds on more than the seed it was written against. See the note
// above run 1 for why any of this is seeded at all.
const SEED1 = Number(process.env.SEED1 || 20260902);
const seedFor = (n) => (SEED1 + n * 7919) >>> 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const eq = (m, a, b) => ok(a === b, `${m} (${a} === ${b})`);

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
// Seeded, and it has to be. `newGame` draws a fresh seed when none is given, and
// this run's first assertion is that seven hundred days is enough to reach Act
// III — which the simple bot below manages on roughly two seeds in three. An
// unseeded gate that fails a third of the time is a gate people learn to ignore,
// so every run in this file names its seed and the whole file is deterministic.
let s = Game.startNewGame({ founderName: 'A', companyName: 'One', archetype: 'hacker', category: 'devtools', seed: seedFor(1) });
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
const s2 = Game.startNewGame({ founderName: 'B', companyName: 'Two', archetype: 'hacker', category: 'devtools', seed: seedFor(3) });
ok(s2.company.cash > 12000, `starting cash boosted by Seed Capital (${money(s2.company.cash)})`);
const m2 = computeMods(s2);
ok(m2.codeRate > 1.3, `code rate carries the perk (×${m2.codeRate.toFixed(2)})`);
ok(s2.legacy.runs === 1, 'run 2 knows it is the second timeline');
ok(Object.keys(s2.achievements).length === 0, 'this run starts with a clean achievement sheet');
play(s2, 350);
ok(s2.company.act >= 2, `run 2 progresses (act ${s2.company.act})`);
ok(s2.stats.featuresShipped > 5, 'run 2 ships features');

console.log('\n── the shape perks ──');
// Three perks that change what a run *is* rather than how fast it starts.
{
  const { spawnAperture, aperture } = await import('../src/systems/rivalco.js');
  const { keptEvents, keepCard } = await import('../src/systems/keep.js');
  const { NGPLUS, RIVALCO } = await import('../src/data/balance.js');
  const L2 = Save.loadLegacy();
  L2.perks = { ...(L2.perks || {}), old_enemies: 1, standing_offer: 1, own_hand: 1 };
  L2.kept = [{ id: 'seed1', act: 5, run: 1, day: 900, kind: 'story',
               title: 'A card you wrote', body: 'It happened once and you kept it.',
               choices: [{ label: 'Again', sub: '', tone: 'neutral', outcome: 'Again.', effects: { rep: 4 } },
                         { label: 'Differently', sub: '', tone: 'neutral', outcome: 'Not again.', effects: { insight: 4 } }] }];
  Save.saveLegacy(L2);
  const s3 = Game.startNewGame({ founderName: 'C', companyName: 'Three', archetype: 'hacker', category: 'devtools', seed: seedFor(4) });
  ok(!!aperture(s3), 'Old Enemies puts Aperture on the board from day one');
  ok(!!s3.narrative.flags.crane_standing, 'The Standing Offer sets the flag the bridge reads');
  const seeded = keptEvents(s3).find((e) => e.title === 'A card you wrote');
  ok(!!seeded && seeded.act.includes(1), 'Your Own Hand deals the newest kept card in Act I');
  ok(s3.legacy.kept[0].act === 5, 'and leaves the stored card in the act it was written for');
  // And with the perk gone, the card goes back to waiting for its own act.
  const L3 = Save.loadLegacy(); L3.perks.own_hand = 0; Save.saveLegacy(L3);
  const s4 = Game.startNewGame({ founderName: 'D', companyName: 'Four', archetype: 'hacker', category: 'devtools', seed: seedFor(5) });
  const unseeded = keptEvents(s4).find((e) => e.title === 'A card you wrote');
  ok(!!unseeded && !unseeded.act.includes(1), 'without it, the card waits for act 5 again');
}

console.log('\n── new game plus ──');
{
  const { aperture } = await import('../src/systems/rivalco.js');
  const { NGPLUS, RIVALCO } = await import('../src/data/balance.js');
  const L4 = Save.loadLegacy();
  L4.perks = {};
  L4.dossier = [{ run: 1, ending: 'refusal', endingName: 'The Refusal', company: 'One', style: 'good',
                  betrayed: [], loved: [], flags: [], doctrines: [], mom: 0, calls: 0, act: 5, day: 1400 }];
  Save.saveLegacy(L4);
  const s5 = Game.startNewGame({ founderName: 'E', companyName: 'Five', archetype: 'hacker',
                                 category: 'devtools', ngRival: true, ngInvert: true, seed: seedFor(6) });
  const c = aperture(s5);
  ok(!!c, 'a harder rival is on the board from day one');
  ok(Math.round(c.funding) === Math.round(RIVALCO.START_FUNDING * NGPLUS.RIVAL_FUNDING),
     `and opens with x${NGPLUS.RIVAL_FUNDING} the money (${money(c.funding)})`);
  eq('the inverted timeline reads the last ending', s5.settings.invertFrom, 'refusal');
  ok(computeMods(s5).rivalRace < 1, `and this world's labs run slower (x${computeMods(s5).rivalRace.toFixed(2)})`);
  const L5 = Save.loadLegacy();
  L5.dossier = [{ ...L4.dossier[0], ending: 'sovereign', endingName: 'The Sovereign' }];
  Save.saveLegacy(L5);
  const s6 = Game.startNewGame({ founderName: 'F', companyName: 'Six', archetype: 'hacker',
                                 category: 'devtools', ngInvert: true, seed: seedFor(7) });
  ok((s6.narrative.relationships.dorne?.affinity || 0) < 0, 'a sovereign timeline opens Dorne hostile');
  const L6 = Save.loadLegacy(); L6.dossier = []; Save.saveLegacy(L6);
}

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
