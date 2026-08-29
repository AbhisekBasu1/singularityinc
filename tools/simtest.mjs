// Headless simulation harness — runs the game without a DOM to catch sim bugs.
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = {
  _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
globalThis.window = { addEventListener() {}, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} }, appendChild(){}, remove(){}, addEventListener(){} }),
  body: { appendChild(){} }, hidden: false };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { newGame, setState } = await import('../src/engine/state.js');
const { S } = await import('../src/engine/state.js');
const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const { totalUsers, totalMrr } = await import('../src/systems/product.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI, actionWriteCode, actionTalkToUsers } = await import('../src/systems/founder.js');
const { money, fmt } = await import('../src/engine/format.js');
const { canEngage, engage, courtRegion } = await import('../src/systems/regions.js');
const { REGIONS } = await import('../src/data/regions.js');
const { CATEGORIES } = await import('../src/data/products.js');
const { resolveThread } = await import('../src/systems/feed.js');
const { createProduct } = await import('../src/systems/product.js');
const { computeMods, markDirty: markDirtyFn } = await import('../src/systems/modifiers.js');
const { availableRounds, raiseOffer, acceptRound } = await import('../src/systems/economy.js');

const args = process.argv.slice(2);
const DAYS = Number(args[0] || 900);
const CAT = args[1] || 'devtools';
const ARCH = args[2] || 'hacker';
const DIFF = process.env.DIFF || 'standard';
const VERBOSE = args.includes('-v');

const st = Game.startNewGame({ founderName: 'Test Founder', companyName: 'Testco', archetype: ARCH, category: CAT, productName: 'Testco', difficulty: DIFF, scenario: process.env.SCEN || 'none' });
const s = st;

let eventsSeen = 0, errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); };

function autoPlay() {
  // Simple bot: manual actions, ship features, hire agents, research, launch, raise.
  const p = s.products[0];
  // spend focus
  for (let i = 0; i < 3; i++) {
    if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s);
    else if (s.founder.focus > 5) actionWriteCode(s);
  }
  if (s.resources.insight < 20 && s.founder.focus > 20) actionTalkToUsers(s);
  for (let i = 0; i < 4; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
  if (!p.launched && p.features.length >= 4) Game.doLaunch(s);
  // research
  if (!s.research.active) {
    const av = availableResearch(s).sort((a, b) => a.cost - b.cost);
    if (av.length) startResearch(s, av[0].id);
  }
  // hire
  if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3) {
    hireAgent(s, rollCandidate(s));
  }
  // upgrade autonomy modestly
  s.agents.forEach((a) => { if (a.autonomy < 0.6) a.autonomy = 0.6; });
  // raise if low on cash
  if (s.unlocks.fundraising && s.company.cash < 20000) {
    const r = availableRounds(s);
    if (r.length) acceptRound(s, raiseOffer(s, r[0]));
  }
  // diversify into new categories when rich
  if (s.company.act >= 3 && s.products.length < 4) {
    const cost = 25000 * Math.pow(2.4, s.products.length - 1);
    if (s.company.cash > cost * 8) {
      const used = new Set(s.products.map(x => x.category));
      const next = CATEGORIES.find(c => !used.has(c.id));
      if (next) { s.company.cash -= cost; const np = createProduct(s, { name: 'Line ' + s.products.length, category: next.id }); }
    }
  }
  for (const pp of s.products) {
    if (!pp.launched && pp.features.length >= 4) { const prev = s.activeProductId; s.activeProductId = pp.id; Game.doLaunch(s); s.activeProductId = prev; }
  }

  // pick a sensible standing order and hold it
  if (!s.company.directive || s.company.directive === 'none' || (s.time.day - s.company.directiveSince) > 90) {
    const want = s.resources.techDebt > 180 ? 'paydown'
      : s.company.act >= 4 ? 'ascend'
      : s.company.act >= 2 ? (s.company.act >= 3 ? 'deep' : 'landgrab')
      : 'ship';
    if (s.company.directive !== want) { s.company.directive = want; s.company.directiveSince = s.time.day; markDirtyFn(); }
  }

  // engage regions when affordable
  if (s.company.act >= 3) {
    for (const r of REGIONS) {
      const c = canEngage(s, r.id);
      if (c?.ok && s.company.cash > c.cost * 3) { engage(s, r.id); break; }
      if (c && c.reason === 'stance' && s.resources.influence > 60) { courtRegion(s, r.id); break; }
    }
  }

  // answer any open live threads
  for (const f of s.feed) {
    if (f.thread && !f.resolved) { resolveThread(s, f.id, Math.floor(Math.random() * 3)); break; }
  }

  // resolve events — avoid run-ending choices unless ENDGAME mode
  if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
    const ev = s.narrative.activeEvent;
    let pickIdx = 0;
    const RUN_ENDERS = /Take it\. Life-changing|Take it\. This is a good outcome|Honour it\. You said a number/;
    const idxs = ev.choices.map((_, i) => i).filter((i) => !RUN_ENDERS.test(ev.choices[i].label));
    pickIdx = idxs[Math.floor(Math.random() * idxs.length)] ?? 0;
    resolveChoice(s, pickIdx);
    dismissEvent(s);
    eventsSeen++;
  }
}

const marks = [];
let lastAct = 1;
for (let d = 0; d < DAYS; d++) {
  autoPlay();
  Loop.simulate(1);
  if (s.company.act !== lastAct) {
    marks.push(`  Act ${s.company.act} reached on day ${d} — val ${money(s.company.valuation)}, mrr ${money(totalMrr(s))}, users ${fmt(totalUsers(s))}`);
    lastAct = s.company.act;
  }
  if (VERBOSE && d % 100 === 0) {
    console.log(`d${d} cash=${money(s.company.cash)} users=${fmt(totalUsers(s))} mrr=${money(totalMrr(s))} val=${money(s.company.valuation)} agents=${s.agents.length} res=${s.stats.researchDone} debt=${Math.round(s.resources.techDebt)} focus=${Math.round(s.founder.focus)}`);
  }
  if (s.ending) { marks.push(`  ENDING: ${s.ending.name} on day ${d}`); break; }
  // A real player takes an ending shortly after reaching Act V; stop there so
  // the reported final state reflects a played run, not an idled one.
  if (!process.env.NOSTOP && s.company.act >= 5 && (s.company.actMarks?.[5] ?? 1e9) + 300 < d) break;
}

console.error = origError;
console.log(`\n═══ ${CAT} / ${ARCH} — ${DAYS} days ═══`);
marks.forEach((m) => console.log(m));
console.log(`  final: act ${s.company.act} · cash ${money(s.company.cash)} · users ${fmt(totalUsers(s))} · mrr ${money(totalMrr(s))} · val ${money(s.company.valuation)}`);
console.log(`  agents ${s.agents.length} · research ${s.stats.researchDone}/85 · features ${s.stats.featuresShipped} · events ${eventsSeen} · achievements ${Object.keys(s.achievements).length}`);
{ const p0 = s.products.find(x=>x.launched);
  if (p0) console.log(`  product: rel ${(p0.reliability*100).toFixed(0)}%→${((p0.reliabilityTarget??0)*100).toFixed(0)}% · churn ${(p0.churnMonthly*100).toFixed(1)}%/mo · price $${p0.price.toFixed(0)} (fair $${(p0.fairPrice||0).toFixed(0)}) · q ${(p0.quality*100).toFixed(0)} a ${(p0.appeal*100).toFixed(0)} p ${(p0.polish*100).toFixed(0)}`); }
console.log(`  debt ${Math.round(s.resources.techDebt)} · align ${s.resources.alignment.toFixed(2)} · heat ${Math.round(s.world.regulatoryHeat)} · opinion ${(s.world.publicOpinion*100).toFixed(0)}% · gdp ${(s.world.globalGdpShare*100).toFixed(3)}%`);
console.log(`  equity ${(s.company.equity.founder*100).toFixed(1)}% · rounds ${s.company.rounds.length} · incidents ${s.stats.incidents} · rivals ${s.market.competitors.filter(c=>c.status==='active').length}`);
if (s.world.race) {
  const { raceStandings } = await import('../src/systems/agirace.js');
  const rows = raceStandings(s);
  console.log('  race: ' + rows.map(r => `${r.you ? '★' : ''}${r.name.split(' ')[0]} ${Math.round(r.progress)}%`).join(' · '));
  if (s.world.race.crossed) {
    const c = s.world.race.crossed;
    console.log(`  CROSSED: ${c.name} on day ${c.day}${c.margin != null ? ` — by ${c.margin} points over ${c.runnerUp}` : ''}`);
  }
}
console.log(`  projects: ${Object.entries(s.world.projectsBuilt||{}).map(([k,v])=>k+'×'+v).join(', ')||'none'}`);
{ const de = Object.keys(s.doctrines?.earned || {});
  console.log(`  doctrines: ${de.length ? de.join(', ') : 'none'}`); }
{ const rs = s.world.regions || {};
  const active = Object.entries(rs).filter(([,v]) => v.stage !== 'none');
  console.log(`  regions: ${active.length ? active.map(([k,v])=>k+':'+v.stage).join(' · ') : 'none'}`); }
{ const N = await import('../src/systems/nemesis.js');
  const n = N.nemesisState(s), c = N.nemesisOf(s);
  console.log(`  feud: ${c ? `${c.name} (${c.founder}) · grudge ${n.grudge.toFixed(2)} ${N.grudgeBand(n.grudge).name}` : 'nobody'}`);
  if (n.moves.length) console.log(`  moves: ${n.moves.slice(0,5).map(m=>'d'+m.day+' '+m.name).join(' · ')}`); }
if (errors.length) { console.log(`  ⚠ ${errors.length} errors:`); [...new Set(errors)].slice(0,6).forEach(e=>console.log('    '+e.slice(0,180))); }

process.exit(0);
