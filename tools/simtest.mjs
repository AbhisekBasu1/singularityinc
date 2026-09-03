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
const { rollCandidate, hireAgent, maxAgents, hireCost, canReview } = await import('../src/systems/agents.js');
const { actionPromptAI, actionWriteCode, actionTalkToUsers } = await import('../src/systems/founder.js');
const { money, fmt } = await import('../src/engine/format.js');
const { canEngage, engage, courtRegion } = await import('../src/systems/regions.js');
const { REGIONS } = await import('../src/data/regions.js');
const { RESEARCH } = await import('../src/data/research.js');
const { WORLD: WORLDB, ECON: ECONB } = await import('../src/data/balance.js');
const { CATEGORIES } = await import('../src/data/products.js');
const { resolveThread } = await import('../src/systems/feed.js');
const { createProduct } = await import('../src/systems/product.js');
const { computeMods, markDirty: markDirtyFn } = await import('../src/systems/modifiers.js');
const { availableRounds, raiseOffer, acceptRound, burnPerDay, runwayDays, expenseBreakdown,
        dailyRevenue, upkeepOf, canCarry } = await import('../src/systems/economy.js');
const { startProject, availableProjects } = await import('../src/systems/projects.js');
const { availableIntentions, toggleIntention, quarterDue, quarterState } = await import('../src/systems/board.js');
const { researchRatePerDay } = await import('../src/systems/research.js');
const { laneOutputPure } = await import('../src/systems/agents.js');
const { ACT_DEEDS } = await import('../src/systems/progression.js');

const args = process.argv.slice(2);
const DAYS = Number(args[0] || 900);
const CAT = args[1] || 'devtools';
const ARCH = args[2] || 'hacker';
const DIFF = process.env.DIFF || 'standard';
const VERBOSE = args.includes('-v');
const RESEARCH_MAP2 = Object.fromEntries(RESEARCH.map((n) => [n.id, n]));
const TARGET_CHAIN = (() => {
  if (!process.env.TARGET) return null;
  const out = new Set();
  const walk = (id) => { if (!id || out.has(id)) return; out.add(id);
    for (const r of RESEARCH_MAP2[id]?.reqs || []) walk(r); };
  for (const id of [...process.env.TARGET.split(','), 'recursive_self_improvement']) walk(id.trim());
  return out;
})();

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
  // research. TARGET=<node id> makes the bot build toward that node first —
  // §A12b's check that each of the three tier-8 ending nodes is individually
  // affordable in a run that aims at it, and that all three together are not.
  // The Act V gate's own node rides along, or an aimed run never reaches the
  // act its target lives in.
  if (!s.research.active) {
    const av = availableResearch(s).sort((a, b) => a.cost - b.cost);
    const want = TARGET_CHAIN ? av.filter((n) => TARGET_CHAIN.has(n.id)) : [];
    const pick = want[0] || av[0];
    if (pick) startResearch(s, pick.id);
  }
  // hire — since §A1 a wage is permanent and grows with the agent's level, so
  // the bot hires while there is runway and stops while there is not. Without
  // this the balance numbers measure the bot's ignorance, not the game.
  if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3
      && (burnPerDay(s) <= 0 || runwayDays(s) > 120)) {
    // §A4: a roster is bounded by the founder's attention, not only the wage
    // bill. Hire while the day could still read the new one's work.
    const cand = rollCandidate(s);
    if (canReview(s, cand)) hireAgent(s, cand);
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

  // engage regions when affordable *and carryable*. A bloc is a permanent line
  // in the ledger now, not a purchase.
  if (s.company.act >= 3) {
    for (const r of REGIONS) {
      const c = canEngage(s, r.id);
      if (c?.ok && s.company.cash > c.cost * 3 && canCarry(s, upkeepOf(c.cost, 'region'))) {
        engage(s, r.id); break;
      }
      if (c && c.reason === 'stance' && s.resources.influence > 60) { courtRegion(s, r.id); break; }
    }
  }

  // Megaprojects, on the same rule. The bot never built one at all, which meant
  // §A11's slots and upkeep were never in a measured run — and neither was the
  // compute that a founder who builds actually has.
  {
    // A competent founder diversifies rather than buying the eleventh copy of
    // the same datacentre at twelve thousand times the price of the first.
    const projs = availableProjects(s).filter((x) => x.available
      && (s.world.projectsBuilt?.[x.id] || 0) < 3
      && s.company.cash > x.cost * 4 && canCarry(s, upkeepOf(x.cost)));
    if (projs.length) startProject(s, projs[0].id);
  }


  // §A2. The founder says what the ninety days are for. Act IV closes on
  // keeping one of these, and a bot that never wrote anything down could never
  // close it — so the harness keeps one intention a quarter, the way a founder
  // who opens the panel does. The first available is `qi_ship`, which is the
  // company's own last quarter read back at it.
  if (!quarterDue(s) && !quarterState(s).intentions.length) {
    const av = availableIntentions(s).filter((x) => !x.chosen);
    if (av.length) toggleIntention(s, av[0].id);
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
const cashAtAct = {};
const rosterAtAct = {};
// §A2: the day each act's closing deed first became true, and — when DOORS is
// set — the day each individual door opened. The gap between a deed's day and
// the day the act actually turned is what the floors are tuned against.
const deedDay = {};
let resGen = 0; const resRates = [];
const doorDay = {};
const DOORS = {
  launch: (x) => (x.stats.productsLaunched || 0) >= 1,
  seriesA: (x) => (x.company.rounds || []).some((r) => r.type === 'a'),
  profitQ: (x) => (x.company.profitStreak || 0) >= 90,
  hearing: (x) => ['answered_dorne', 'played_the_room', 'said_i_dont_know'].some((f) => !!x.narrative?.flags?.[f]),
  treaty: (x) => Object.values(x.world?.regions || {}).some((r) => r.stage === 'partner' || r.stage === 'sovereign'),
  frontier: (x) => !!(x.research.done.own_foundation_model || x.research.done.model_frontier),
  intent: (x) => (x.stats.intentionsKept || 0) >= 1,
  season: (x) => (x.market?.nemesis?.seasons || []).some((y) => y && y.won === false),
};
let lastAct = 1;
for (let d = 0; d < DAYS; d++) {
  autoPlay();
  Loop.simulate(1);
  if (s.company.act !== lastAct) {
    // Cash at the moment an act turns is the number §A1 is tuned against: the
    // end of Act III should be a couple of years of burn, not two trillion.
    // Cash *and* what a day costs, because "two years of burn" is a ratio.
    cashAtAct[s.company.act] = [Math.round(s.company.cash), Math.round(expenseBreakdown(s).total)];
    // §A4: how many agents the founder was running when the act turned. Span of
    // control is a bound on the roster, so the roster is what measures it.
    rosterAtAct[s.company.act] = s.agents.length;
    marks.push(`  Act ${s.company.act} reached on day ${d} — val ${money(s.company.valuation)}, mrr ${money(totalMrr(s))}, users ${fmt(totalUsers(s))}, cash ${money(s.company.cash)}`);
    lastAct = s.company.act;
  }
  if (VERBOSE && d % 100 === 0) {
    const ex = expenseBreakdown(s), rv = dailyRevenue(s);
    const top = Object.entries(ex).filter(([k, v]) => k !== 'total' && v > ex.total * 0.02)
      .sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${money(v)}`).join(' ');
    console.log(`d${d} cash=${money(s.company.cash)} users=${fmt(totalUsers(s))} mrr=${money(totalMrr(s))} val=${money(s.company.valuation)} agents=${s.agents.length} res=${s.stats.researchDone} debt=${Math.round(s.resources.techDebt)} focus=${Math.round(s.founder.focus)}`);
    const mm = computeMods(s);
    const gdpRev = mm.gdpRevenue ? s.world.globalGdpShare * WORLDB.GDP_2027 / 360 * ECONB.GDP_REVENUE_TAKE : 0;
    const physRev = mm['+physicalRevenue'] ? s.resources.energyCap * ECONB.PHYSICAL_REVENUE_PER_ENERGY : 0;
    console.log(`     rev ${money(rv.total)}/d = product ${money(totalMrr(s) / 30)} + gdp ${money(gdpRev)} + phys ${money(physRev)} + int ${money(rv.interest)} · exp ${money(ex.total)}/d · margin ${((1 - ex.total / Math.max(1, rv.total)) * 100).toFixed(0)}% · [${top}]`);
    console.log(`     uplift arpu×${mm.arpu.toFixed(2)} mrr×${mm.mrrMult.toFixed(2)} | `
      + s.products.filter((p) => p.launched).map((p) => `${p.category}:${p.pricing} u${fmt(p.users)} arpu $${(p.arpu||0).toFixed(2)} fair $${(p.fairPrice||0).toFixed(0)} price $${p.price.toFixed(0)} q${(p.quality||0).toFixed(2)}`).join(' | '));
  }
  { const rr = researchRatePerDay(s, laneOutputPure(s).research); resGen += rr;
    if (d % 200 === 0) resRates.push(`d${d}:${Math.round(rr)}`); }
  for (const a of [2, 3, 4, 5]) {
    if (deedDay[a] == null && ACT_DEEDS[a] && ACT_DEEDS[a].test(s)) deedDay[a] = d;
  }
  if (process.env.DOORS) for (const [k, f] of Object.entries(DOORS)) {
    if (doorDay[k] == null) { let ok = false; try { ok = f(s); } catch (e) {} if (ok) doorDay[k] = d; }
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
console.log(`  agents ${s.agents.length} · research ${s.stats.researchDone}/${RESEARCH.length} · features ${s.stats.featuresShipped} · events ${eventsSeen} · achievements ${Object.keys(s.achievements).length}`);
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
{ // Machine-readable, for tools/balance.mjs: the scarcity numbers.
  const e = expenseBreakdown(s);
  const rw = runwayDays(s);
  console.log(`  ledger: ${Object.entries(e).filter(([k])=>k!=='total').map(([k,v])=>k+' '+money(v)).join(' · ')}`);
  console.log(`  cashmarks ${JSON.stringify(cashAtAct)} · endcash ${Math.round(s.company.cash)} · endexp ${Math.round(e.total)} · endburn ${Math.round(burnPerDay(s))} · runway ${Number.isFinite(rw) ? Math.round(rw) : 'inf'}`);
  // §A2: the day each act's goal was first met against the day the act turned.
  // `balance.mjs` turns the pair into "share of the act spent with the gate
  // already open", which is the number the deed pass is judged on.
  console.log(`  gatemarks ${JSON.stringify(s.company.actMarks || {})} · gatemet ${JSON.stringify(s.company.gateMetDay || {})} · roster ${JSON.stringify(rosterAtAct)} · endroster ${s.agents.length}`);
  // §A12b: the three tier-8 nodes each unlock an ending, and the research
  // budget is meant to afford roughly one of them.
  const T8 = ['mind_uploading', 'the_question', 'stellar_engineering'];
  console.log(`  tier8 ${T8.filter((id) => s.research.done[id]).join(',') || 'none'} · unfinished ${RESEARCH.filter((n) => !s.research.done[n.id]).length} · resgen ${Math.round(resGen)} · rates ${resRates.join(' ')}`);
  console.log(`  deeds ${JSON.stringify(deedDay)}${process.env.DOORS ? ` · doors ${JSON.stringify(doorDay)}` : ''}`); }
if (errors.length) { console.log(`  ⚠ ${errors.length} errors:`); [...new Set(errors)].slice(0,6).forEach(e=>console.log('    '+e.slice(0,180))); }

process.exit(0);
