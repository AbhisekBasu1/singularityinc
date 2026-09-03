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
const { rand, rngState } = await import('../src/engine/rng.js');

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

// The world's own memory. Mode, the pending slot and the open waiter are
// module memory on purpose — they describe a connection — but the notebook, the
// post-dated queue and the last word describe the *story*, so they have to
// survive a reload the way the journal does. `serialisable` strips top-level
// flags only, which is why these ride inside `world` rather than beside it.
s.world.author ??= {};
s.world.author.notes = [{ day: Math.floor(s.time.day), text: 'Vance still owes an answer about the truce.' }];
s.world.author.queue = [{ id: 'q_1', at: s.time.day + 6, wrote: Math.floor(s.time.day), tries: 0,
  card: { kind: 'story', char: null, title: 'The Letter', body: 'It arrives on a Tuesday, nine days late.',
          choices: [{ label: 'Open it', sub: '', tone: 'neutral', outcome: 'You read it twice.', effects: { rep: 2 } },
                    { label: 'Leave it', sub: '', tone: 'neutral', outcome: 'It sits there.', effects: { focus: 2 } }] } }];
s.world.author.epilogue = { text: 'The keys go back in an envelope.', day: Math.floor(s.time.day), ending: 'test' };

// The founder's own memory. The line written at the threshold is posted back on
// the first morning of Act IV, roughly a thousand days after it was typed, so
// it has to survive every reload in between; the post's own bookkeeping — how
// many times a recurring correspondent has written, and the replies people owe
// you — has to survive with it, or the bank starts again at statement one.
s.founder.letterToSelf = 'do not become the thing that answers every email';
s.mail.count.m3_bank_statement = 7;
s.mail.queued = [{ id: 'm3_crane_reply', day: Math.floor(s.time.day) + 3 }];
s._mailAway = { m3_bank_statement: true };

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
ok(loaded.world.author?.notes?.[0]?.text === s.world.author.notes[0].text, 'the world\'s notebook survives the reload');
ok(loaded.world.author?.queue?.[0]?.card?.title === 'The Letter', 'so does a card it post-dated');
ok(loaded.world.author?.epilogue?.text === s.world.author.epilogue.text, 'and the last word it wrote');
ok(loaded.founder.letterToSelf === s.founder.letterToSelf, 'the line the founder wrote on day one survives');
ok(loaded.mail.count?.m3_bank_statement === 7, 'so does how many times the bank has written');
ok(loaded.mail.queued?.[0]?.id === 'm3_crane_reply', 'and the reply somebody owes you');
ok(!('_mailAway' in loaded), 'but not which letters landed while you were away');

console.log('\n── export / import ──');
const blob = Save.exportSave(loaded);
ok(blob.length > 500, `export produces a blob (${blob.length} chars)`);
ok(Save.importSave(blob), 'import accepts its own export');

// Resuming means the next roll resumes too. Restarting from `meta.seed` made a
// loaded run look right while quietly replaying the opening random sequence.
{
  Save.save(StateMod.S);
  const expected = [rand(), rand(), rand()];
  Save.load();
  const actual = [rand(), rand(), rand()];
  ok(actual.every((n, i) => n === expected[i]), 'load resumes the exact random stream');

  const portable = Save.exportSave(StateMod.S);
  const expectedPortable = [rand(), rand(), rand()];
  ok(Save.importSave(portable), 'portable save re-imports for RNG check');
  const actualPortable = [rand(), rand(), rand()];
  ok(actualPortable.every((n, i) => n === expectedPortable[i]), 'file import resumes the exact random stream');
}

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

// §A3, §A10, §A14, §F2, §A22: everything those added to the state is either
// created lazily by the system that owns it or filled from the factory. A save
// written by a build that had none of them has to load, simulate, and grow
// them — and a *fresh* game has to answer the same way, so a founder mid-run
// and a founder starting one are looking at the same world.
console.log('\n── the new world fields default ──');
{
  const Regions = await import('../src/systems/regions.js');
  const Labs = await import('../src/systems/labs.js');
  const Nem = await import('../src/systems/nemesis.js');
  const Race = await import('../src/systems/agirace.js');
  const cur = StateMod.S;
  delete cur.world.regionRivals; delete cur.world.sealed; delete cur.world.drift;
  delete cur.world.act5Days; delete cur.world.act5Due;
  delete cur.settings.autoThrottle;
  if (cur.world.race?.labs) for (const l of Object.values(cur.world.race.labs)) delete l.co;
  if (cur.market.nemesis) { delete cur.market.nemesis.season; delete cur.market.nemesis.seasons;
                            delete cur.market.nemesis.quietDays; }
  let err = null;
  try { for (let i = 0; i < 30; i++) Loop.simulate(1); } catch (e) { err = e; }
  ok(!err, 'a save with none of the new world fields simulates' + (err ? ': ' + err.message : ''));
  Regions.initRegions(cur);
  ok(!!cur.world.regionRivals, 'the region board grows its opponents');
  ok(!!Regions.rivalIn(cur, 'cn'), 'including the one East Asia has always had in its flavour text');
  ok(Regions.rivalStageIndex(cur, 'latam') === 0 || !!Regions.rivalIn(cur, 'latam'),
     'and a bloc nobody is in reads as zero rather than undefined');
  const n = Nem.nemesisState(cur);
  ok(Array.isArray(n.seasons) && Number.isFinite(n.quietDays), 'the feud grows a season record');
  ok(Nem.activeGoal(cur) === null || typeof Nem.activeGoal(cur).goal === 'string', 'and a readable goal or none');
  cur.company.act = Math.max(3, cur.company.act);
  Race.tickRace(cur, 1);
  ok(!!Labs.labCo(cur, 'obsidian'), 'a lab grows a company on the next tick');
  ok(Number.isFinite(Race.labCapabilityOf(cur, 'obsidian')), 'with a finite capability');
  ok(Number.isFinite(Race.labCapabilityOf(cur, 'aperture')), 'and so does Aperture, company or not');
  ok(cur.settings.autoThrottle === undefined || typeof cur.settings.autoThrottle === 'boolean',
     'the auto-throttle setting is a boolean or absent, never a string');
  const fresh = Game.startNewGame({ founderName: 'Fresh', companyName: 'Fresh', archetype: 'hacker',
                                    category: 'devtools', productName: 'Fresh', seed: 909 });
  ok(fresh.settings.autoThrottle === true, 'and a fresh game has it on');
  StateMod.setState(cur);
}

// §A6 / §A7 / §A23. A save written before the board, the quarter, the
// standing-order stack or HELIX existed has none of those fields, and every
// one of them has to arrive at its default rather than as `undefined` flowing
// into a `Math.max`.
console.log('\n── the board, the quarter, the stack and HELIX default ──');
{
  const Board = await import('../src/systems/board.js');
  const Helix = await import('../src/systems/helix.js');
  const Dir = await import('../src/data/directives.js');
  const cur = StateMod.S;
  delete cur.company.board; delete cur.company.quarter; delete cur.company.orders;
  delete cur.helix;
  let err = null;
  try { for (let i = 0; i < 30; i++) Loop.simulate(1); } catch (e) { err = e; }
  ok(!err, 'a save with none of them simulates' + (err ? ': ' + err.message : ''));
  ok(Board.boardState(cur) === null, 'no board until a priced round seats one');
  ok(Board.confidence(cur) === null, 'and no confidence to read');
  ok(Board.boardVeto(cur, 'st_oversight') === null, 'and no veto over a commitment');
  ok(Board.orderLocked(cur) === null, 'and the standing order is the founder\'s');
  const q = Board.quarterState(cur);
  ok(Number.isFinite(q.start) && Array.isArray(q.intentions), 'the quarter grows a plan');
  ok(Board.quarterDaysLeft(cur) >= 0 && Board.quarterDaysLeft(cur) <= 90, 'with a sane countdown');
  ok(Board.availableIntentions(cur).length > 0, 'and something to write in it');
  ok(Board.availableIntentions(cur).every((x) => x.base != null && x.line.length > 4),
     'every one of which has a number and a sentence');
  ok(Dir.maxOrders(cur) === 1, 'one standing-order slot until the node is done');
  ok(Dir.orderStrengths(cur).every((r) => Number.isFinite(r.k)), 'and a finite strength on each');
  const h = Helix.helixState(cur);
  ok(Number.isFinite(h.standing) && h.asks >= 0, 'HELIX has a standing and a count');
  ok(Helix.helixResearchMult(cur) === 1 && Helix.helixRogueMult(cur) === 1,
     'and costs nothing until there is a foundation model');

  // A priced round seats one, and it survives a round trip.
  cur.company.rounds.push({ type: 'a', name: 'Series A', amount: 2e7, valuation: 1e8,
                            day: cur.time.day, dilution: 0.2, terms: {} });
  cur.company.equity.investors = 0.2;
  Board.noteRound(cur, 'a');
  ok(!!Board.boardState(cur), 'a Series A seats a board');
  Save.save(cur);
  const back = Save.load();
  ok(!!back.company.board, 'and it survives a save');
  ok(Number.isFinite(back.company.board.confidence), 'with its confidence intact');
  ok(Number.isFinite(back.company.quarter.start), 'and the quarter with it');
  StateMod.setState(cur);
}

console.log('\n── offline catch-up ──');
const s2 = StateMod.S;
s2.meta.lastRealTime = Date.now() - 3 * 3600 * 1000;   // 3 hours ago
const u0 = totalUsers(s2), c0 = s2.company.cash;
const off = Loop.offlineCatchUp(s2);
ok(off && off.days > 0, `offline advanced ${off ? off.days.toFixed(1) : 0} days`);
// Not strict monotonicity: a product parked at its effective TAM has churn and
// no headroom, so a 22-day catch-up legitimately drifts down a fraction of a
// percent, and which side of that knife-edge this fixture lands on moves with
// the shared RNG stream — i.e. with any deck change. What offline must never do
// is *collapse* the user base, which is the failure this line was written for.
ok(totalUsers(s2) >= u0 * 0.97,
   `users did not collapse offline (${u0.toFixed(0)} -> ${totalUsers(s2).toFixed(0)})`);
ok(Number.isFinite(s2.company.cash), 'cash stayed finite offline');
ok(Number.isFinite(s2.company.valuation) && s2.company.valuation >= 0, 'valuation stayed finite');

console.log('\n── corrupt input ──');
store['singularity_inc_save_v1'] = '{not json';
ok(Save.load() === null, 'corrupt save returns null instead of throwing');
ok(Save.importSave('garbage!!') === false, 'garbage import rejected');
{
  const beforeState = StateMod.S;
  const beforeRng = rngState();
  ok(Save.importSave('{}') === false, 'unrelated JSON is rejected rather than becoming a new run');
  ok(StateMod.S === beforeState && rngState() === beforeRng, 'a rejected import leaves the live run untouched');
}

// ── The three slots ────────────────────────────────────────────────────────
// Slot 1 is the key this game has always used, so a save already in a browser
// is slot 1 with nothing to migrate. The other two are their own keys, and the
// promise that matters is isolation: writing one, and breaking one, must leave
// the others exactly as they were.
console.log('\n── save slots ──');
for (const k of Object.keys(store)) delete store[k];
Save.setSlot(1);
const mk = (name, seed) => Game.startNewGame({ founderName: name, companyName: name, archetype: 'hacker', category: 'devtools', seed });
{
  // `startNewGame` writes to whichever slot is in play, which is the behaviour
  // a founder starting a run in slot 3 wants — so each one is selected first.
  Save.setSlot(1); const one = mk('Alpha', 11); one.time.day = 40; Save.save(one);
  Save.setSlot(2); const two = mk('Beta', 22); two.time.day = 80; Save.save(two);
  Save.setSlot(3); const three = mk('Gamma', 33); three.time.day = 120; Save.save(three);

  ok(store['singularity_inc_save_v1'] !== undefined, 'slot 1 keeps the key the game has always used');
  ok(store['singularity_inc_save_v1_s2'] !== undefined && store['singularity_inc_save_v1_s3'] !== undefined,
     'slots 2 and 3 have their own keys');

  const rows = Save.slots();
  ok(rows.length === 3 && rows.every((r) => !r.empty && !r.corrupt), 'all three slots read back');
  ok(rows[0].saved.companyName === 'Alpha' && rows[1].saved.companyName === 'Beta' && rows[2].saved.companyName === 'Gamma',
     'and each one holds its own run');

  for (const n of [1, 2, 3]) {
    Save.setSlot(n);
    const back = Save.load();
    const want = ['Alpha', 'Beta', 'Gamma'][n - 1];
    ok(!!back && back.company.name === want, `slot ${n} round-trips (${want})`);
    ok(Math.floor(back.time.day) === n * 40, `and keeps its own day (${n * 40})`);
  }

  // One bad slot must never take the other two off the screen with it.
  store['singularity_inc_save_v1_s2'] = '{not json either';
  const after = Save.slots();
  ok(after[1].corrupt === true && after[1].saved === null, 'a corrupt slot reports itself rather than throwing');
  ok(after[0].saved?.companyName === 'Alpha' && after[2].saved?.companyName === 'Gamma',
     'and the other two are untouched');
  Save.setSlot(2);
  ok(Save.load() === null, 'loading the corrupt slot returns null');
  Save.setSlot(3);
  ok(Save.load()?.company.name === 'Gamma', 'and the third still loads');

  // Clearing one slot clears one slot.
  Save.clearSave(3);
  ok(!Save.hasSave(3) && Save.hasSave(1), 'abandoning a run empties only its own slot');

  // A downloaded file and a pasted string are the same payload.
  Save.setSlot(1);
  const one2 = Save.load();
  const text = Save.exportSave(one2);
  ok(Save.saveFileName(one2).endsWith('.sav'), `the file is named for the run (${Save.saveFileName(one2)})`);
  ok(Save.importSave(text), 'the file\'s own contents import');
  ok(Save.importSave(JSON.stringify(Save.serialisable(one2))), 'and so does raw JSON, for anyone who opened it');
}

console.log(fails ? `\n${fails} failure(s)` : '\nall save tests passed');
process.exit(fails ? 1 : 0);
