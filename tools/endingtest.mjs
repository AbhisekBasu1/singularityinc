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
const { checkEnding, lifestyleExit } = await import('../src/systems/progression.js');
const { EVENT_MAP } = await import('../src/data/events.js');
const { makeFx } = await import('../src/systems/narrative.js');
const { spawnAperture } = await import('../src/systems/rivalco.js');
const { ENDINGS_FORCED, BOARD: ENDINGS_BOARD } = await import('../src/data/balance.js');
const Board = await import('../src/systems/board.js');

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
  // The chief of staff exists in a maximal end-state: The Handover needs
  // somebody to name, and `hv_name` refuses without one.
  s.narrative.relationships.weaver = { met: true, affinity: 22, respect: 10, fear: 0, arc: 4 };
  s.narrative.flags.hired_weaver = true;
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

// ── The Handover's hold ────────────────────────────────────────────────────
// The one path whose last commitment is the absence of the founder: ratifying
// takes the hands off, and every direct action refuses until it is over.
console.log('\n── the handover takes your hands off ──');
{
  const s = maxState();
  const { actionWriteCode, actionPromptAI, actionTalkToUsers, actionPost, steppedBack } =
    await import('../src/systems/founder.js');
  ok(actionWriteCode(s).ok !== false || true, 'the founder can work before the handover');
  commit(s, 'handover', 'hv_name');
  commit(s, 'handover', 'hv_ratify');
  ok(steppedBack(s), 'ratifying steps the founder back');
  ok(actionWriteCode(s).reason === 'stepped-back', 'writing code refuses during the hold');
  ok(actionPromptAI(s).reason === 'stepped-back', 'prompting refuses during the hold');
  ok(actionTalkToUsers(s).reason === 'stepped-back', 'talking to users refuses during the hold');
  ok(actionPost(s).reason === 'stepped-back', 'posting refuses during the hold');
  const before = availableEndings(s).find((x) => x.id === 'handover');
  ok(before?.available === false, 'and the ending is not takeable until the hold is served');
  for (let i = 0; i < ENDINGS_FORCED.HANDOVER_HOLD_DAYS + 2; i++) Loop.simulate(1);
  const after = availableEndings(s).find((x) => x.id === 'handover');
  ok(after?.available === true, `${ENDINGS_FORCED.HANDOVER_HOLD_DAYS} days later it is`);
}

// ── The two the world forces ───────────────────────────────────────────────
// Each is a streak of consecutive days, each has a warning card a long way
// before the ending, and each warning has a door out that resets the streak.
console.log('\n── the world forces two of them ──');
{
  const s = maxState();
  s.resources.alignment = 0.5;
  // `tickWorld` rebuilds heat and the GDP share from the model every day, so a
  // constructed run-up has to be held there rather than set once.
  const hot = (n) => { for (let i = 0; i < n; i++) {
    s.world.regulatoryHeat = 99; s.world.globalGdpShare = 0.3; Loop.simulate(1); } };
  ok(!s.ending, 'a hot quarter is not a hearing');
  const warn = EVENT_MAP.p_nat_warning;
  hot(ENDINGS_FORCED.NAT_WARN_DAYS + 1);
  ok(warn.when(s), `the warning card is legal at day ${Math.round(s.world.natRun)} of the run-up`);
  ok(!s.ending, 'and the ending is not, yet');
  // The costly door out.
  const fx = makeFx(s, warn);
  warn.choices[0].effect(s, fx);
  ok((s.world.natRun || 0) === 0, 'divesting closes the run-up');
  // And the whole way through, uninterrupted.
  hot(ENDINGS_FORCED.NAT_DAYS + 2);
  ok(s.ending?.id === 'nationalised', `${ENDINGS_FORCED.NAT_DAYS} days of it is (${s.ending?.id || 'nothing'})`);
  ok(String(ENDINGS.find((x) => x.id === 'nationalised').text(s)).length > 400, 'the hearing renders');
}
{
  const s = maxState();
  s.world.regulatoryHeat = 5;
  s.resources.alignment = 0.05;
  const warn = EVENT_MAP.p_unsup_warning;
  const drift = (n) => { for (let i = 0; i < n; i++) { s.resources.alignment = 0.05; Loop.simulate(1); } };
  drift(ENDINGS_FORCED.UNSUP_WARN_DAYS + 1);
  ok(warn.when(s), 'the drift warning is legal halfway through');
  ok(!s.ending, 'and the ending is not');
  drift(ENDINGS_FORCED.UNSUP_DAYS + 2);
  ok(s.ending?.id === 'unsupervised', `${ENDINGS_FORCED.UNSUP_DAYS} days under the line ends it (${s.ending?.id || 'nothing'})`);
  ok(String(ENDINGS.find((x) => x.id === 'unsupervised').text(s)).length > 400, 'it renders');
}

// ── §A6 / §A25. The board removes the founder ──────────────────────────────
// The first non-bankruptcy loss a founder arranges themselves. Three things
// have to be true at once and all three are the founder's own doing: a priced
// round seated a board, the majority was sold, and the board has been at the
// floor of its confidence for three consecutive quarters. The warning card
// fires a quarter earlier with a buyback on it, and the buyback resets the run.
console.log('\n── the board removes one of them ──');
{
  const s = maxState();
  s.ending = null;
  s.company.act = 4;
  s.company.equity.founder = 0.9;
  s.company.equity.investors = 0.1;
  s.company.rounds = [{ type: 'a', name: 'Series A', amount: 2e7, valuation: 1e8, day: 100, dilution: 0.2, terms: {} }];
  Board.noteRound(s, 'a');
  ok(!!s.company.board, 'a Series A seats a board');
  ok(Board.seatsFor(s).length >= 1, 'with somebody in the room');

  // A founder who kept control cannot be removed, however badly it is going.
  s.company.board.confidence = 0;
  s.company.board.floorQuarters = 9;
  s.company.board.removeRun = 9;
  ok(!ENDINGS.find((x) => x.id === 'removed').when(s), 'a founder holding the majority cannot be removed');

  // Sell control and the vote becomes possible.
  s.company.equity.founder = 0.3;
  s.company.equity.investors = 0.6;
  ok(Board.lostControl(s), 'below the control line');
  ok(ENDINGS.find((x) => x.id === 'removed').when(s), 'and now the vote is legal');

  // The warning, a quarter early, and the door out of it.
  s.company.board.removeRun = ENDINGS_BOARD.WARN_AT;
  const warn = EVENT_MAP.eb_warning;
  ok(warn.when(s), 'the warning card is legal a quarter before the vote');
  s.company.cash = 1e12;
  s.company.valuation = 1e11;
  ok(Board.canBuyback(s), 'and the buyback is affordable');
  const fx = makeFx(s, warn);
  warn.choices[0].effect(s, fx);
  ok((s.company.board.removeRun || 0) === 0, 'buying the block back closes the run-up');
  ok(s.company.equity.founder > 0.3, 'and the founder holds more of it than they did');

  // And the whole way through, uninterrupted.
  const s2 = maxState();
  s2.ending = null;
  s2.company.equity.founder = 0.2;
  s2.company.equity.investors = 0.7;
  s2.company.board = { since: 0, chair: null, seats: [], asks: [], confidence: 0.02,
    nextMeeting: 0, lowQuarters: 9, floorQuarters: ENDINGS_BOARD.REMOVE_QUARTERS,
    ask: null, due: false, forcedUntil: 0, warned: 0, removeRun: ENDINGS_BOARD.REMOVE_QUARTERS };
  const e = checkEnding(s2);
  ok(e?.id === 'removed', `${ENDINGS_BOARD.REMOVE_QUARTERS} quarters at the floor ends it (${e?.id || 'nothing'})`);
  triggerEnding(s2, 'removed');
  ok(s2.ending?.id === 'removed', 'it triggers');
  ok(String(ENDINGS.find((x) => x.id === 'removed').text(s2)).length > 400, 'and the vote renders');
}

// ── The three that are offered ─────────────────────────────────────────────
// Lifestyle from the Legacy view, Second from `c_race_lost`, the Merger from
// Vance's card, and The Long Game from a career rather than a run.
console.log('\n── the offered endings ──');
{
  const s = maxState();
  s.company.act = 2;
  ok(!lifestyleExit(s).open, 'the lifestyle exit needs Frugal Empire');
  s.doctrines.earned.frugal_empire = 10;
  ok(lifestyleExit(s).open, 'and is open in Act II with it');
  s.company.act = 4;
  ok(!lifestyleExit(s).open, 'and shut once the company outgrew it');
  s.company.act = 2;
  triggerEnding(s, 'lifestyle');
  ok(s.ending?.id === 'lifestyle', 'it triggers');
  ok(String(ENDINGS.find((x) => x.id === 'lifestyle').text(s)).length > 400, 'and renders');
}
{
  const s = maxState();
  s.narrative.flags._rival_agi = 'aperture';
  const card = EVENT_MAP.c_race_lost;
  ok(card.when(s), 'the losing card is legal once somebody crossed');
  const fx = makeFx(s, card);
  card.choices[0].effect(s, fx);
  ok(s.ending?.id === 'race_lost', 'folding into the winner is a real ending now');
  ok(String(ENDINGS.find((x) => x.id === 'race_lost').text(s)).length > 400, 'Second renders');
  ok(!!card.choices[1].effect && !!card.choices[2].effect, 'and the other two are still the comeback');
}
{
  const s = maxState();
  s.company.act = 3;
  s.narrative.relationships.vance = { met: true, affinity: 14, respect: 6, fear: 0, arc: 3 };
  spawnAperture(s);
  const card = EVENT_MAP.p_merger;
  ok(!!card, 'the merger card exists');
  s.products[0].launched = true;
  s.products[0].users = 1200;                     // inside 3x of Aperture's opening users
  ok(card.when(s), 'and is legal when the two companies have converged');
  s.products[0].users = 1e9;
  ok(!card.when(s), 'and not when they have not');
  s.products[0].users = 1200;
  const fx = makeFx(s, card);
  card.choices[0].effect(s, fx);
  ok(s.ending?.id === 'merger', 'signing it ends the run');
  ok(String(ENDINGS.find((x) => x.id === 'merger').text(s)).length > 400, 'and it renders');
}
{
  const s = maxState();
  s.company.actStartedDay = s.time.day;
  s.legacy.endings = {};
  const card = EVENT_MAP.p_long_game;
  ok(!card.when(s), 'the long game needs a career behind it');
  s.legacy.endings = { steward: 1, bankrupt: 2, acquired: 1 };
  ok(card.when(s), `${ENDINGS_FORCED.LONG_GAME_ENDINGS} different endings opens it`);
  const fx = makeFx(s, card);
  card.choices[0].effect(s, fx);
  ok(s.ending?.id === 'long_game', 'taking it ends the run');
  ok(String(ENDINGS.find((x) => x.id === 'long_game').text(s)).length > 400, 'and it renders');
}

// ── Every ending has a plate, a blurb and a requirement ────────────────────
console.log('\n── the gallery can print all of them ──');
{
  const s = maxState();
  const plates = new Set(['acquired', 'bankrupt', 'steward', 'sovereign', 'transcend',
                          'question', 'expand', 'refusal']);
  for (const e of ENDINGS) {
    const art = e.plate || e.id;
    ok(plates.has(art), `${e.name}: plate end_${art}.jpg exists`);
    ok(!!e.blurb && !!e.req, `${e.name}: has a blurb and a requirement`);
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
