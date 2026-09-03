// ─────────────────────────────────────────────────────────────────────────────
// GAME — orchestration. Wires the systems to the loop and to each other.
// ─────────────────────────────────────────────────────────────────────────────
import { S, setState, newGame, activeProduct } from './engine/state.js';
import { emit, on } from './engine/bus.js';
import { reseed } from './engine/rng.js';
import * as Loop from './engine/loop.js';
import * as Save from './engine/save.js';
import { markDirty, computeMods } from './systems/modifiers.js';
import { tickEmergency, bankruptcyFloor } from './systems/economy.js';
import { createProduct, launchProduct, shipFeature, featureCost, totalUsers, totalMrr } from './systems/product.js';
import { tickNarrative, scheduleNext, presentEvent } from './systems/narrative.js';
import { generateFeed, feedFromEvent, pushFeed, maybeThread, expireThreads, openThreadCount,
  eligibleThreads, founderPost, tickWire, traitReaction, castPost } from './systems/feed.js';
import { ariaWire } from './systems/aria.js';
import { tickIncidents } from './systems/incidents.js';
import { tickLedger } from './systems/ledger.js';
import { tickNemesis, tickSieges, nemesisOf } from './systems/nemesis.js';
import { tickMoonshot } from './systems/moonshot.js';
import { LEAVING, UNASKED } from './data/agents.js';
import { checkActProgression, checkAchievements, tickWorld, checkEnding, triggerEnding,
         nextActHint, grantAchievement } from './systems/progression.js';
import { checkObjectives, activeObjectives } from './systems/objectives.js';
import { computeLaneOutput, agentLine, remember, logAgent } from './systems/agents.js';
import { tickRace } from './systems/agirace.js';
import { tickRegions } from './systems/regions.js';
import { tickDoctrines } from './systems/doctrines.js';
import { tickBoard, noteRound } from './systems/board.js';
import { tickHelix } from './systems/helix.js';
import { tickAuthor } from './world/author.js';
import * as World from './world/author.js';
import { incidentVerb } from './data/signals.js';
import { ARCHETYPE_MAP } from './data/legacy.js';
import { computeLegacyGain } from './data/legacy.js';
import { CATEGORY_MAP } from './data/products.js';
import { reserveName } from './data/names.js';
import { DIFFICULTY_MAP } from './data/difficulty.js';
import { SCENARIO_MAP } from './data/scenarios.js';
import { spawnCompetitor } from './systems/market.js';
import { touch } from './systems/life.js';
import { tickMail } from './systems/mail.js';
import { tickRings } from './systems/calls.js';
import { tickRivalCo, spawnAperture } from './systems/rivalco.js';
import { buildDossier } from './systems/keep.js';
import { chronicle, toText } from './systems/chronicle.js';
import { LIFE, KEEP, CHRONICLE, NGPLUS, WIRE } from './data/balance.js';
import { chance, rand, pick } from './engine/rng.js';

let wired = false;

export function startNewGame(opts) {
  const legacy = Save.loadLegacy() || undefined;
  const s = newGame({ ...opts, legacy });
  reserveName(s.company.name);
  reserveName(opts.productName);
  s.settings.difficulty = opts.difficulty || legacy?.lastDifficulty || 'standard';
  s.settings.scenario = opts.scenario || 'none';
  s.settings.pace = opts.pace === 'long' ? 'long' : 'sitting';
  // New Game+. Offered at the threshold from the third run on, and read before
  // `applyLegacyStart` because two of the three change the opening state.
  s.settings.ngWorld = !!opts.ngWorld;      // consumed by the world-memory work (F8)
  s.settings.ngRival = !!opts.ngRival;
  s.settings.ngInvert = !!opts.ngInvert;
  s.meta.assistantChoice = opts.assistant === 'play' || opts.assistant === 'mute'
    ? opts.assistant : 'none';
  s.meta.assistantHandoffDone = s.meta.assistantChoice !== 'play';
  // Chosen at the threshold in a browser with site tools: start on the written
  // world. Same flag the plug sets, so the surface publishes nothing and the
  // World console offers it back.
  if (opts.assistant === 'mute') s.world.author.muted = true;
  applyDifficulty(s);
  applyArchetype(s, opts.archetype || 'hacker');
  applyLegacyStart(s);
  setState(s);
  markDirty();

  // First product
  const p = createProduct(s, { name: opts.productName || s.company.name, category: opts.category || 'devtools' });
  s.activeProductId = p.id;
  s.company.tagline = opts.tagline || CATEGORY_MAP[p.category].tagline;

  const sc = SCENARIO_MAP[s.settings.scenario || 'none'];
  if (sc?.apply) sc.apply(s, { spawnCompetitor });

  // On a first run the walkthrough must open before anything else does. The
  // clock otherwise starts here, the first story card qualifies about three
  // seconds later, and chapter one loses the race to it — the player meets the
  // interface through a modal they have not been taught to read yet.
  // Tutorial.end() clears this; so does startWalkthrough() deciding not to run.
  if (s.meta.firstRun) s.tutorialHold = true;

  scheduleNext(s);
  wire();
  Save.save(s);
  emit('game:start', s);
  return s;
}

export function continueGame(slot = null) {
  if (slot != null) Save.setSlot(slot);
  const s = Save.load();
  if (!s) return null;
  wire();
  const offline = Loop.offlineCatchUp(s);
  emit('game:continue', { state: s, offline });
  return s;
}

function applyDifficulty(s) {
  const d = DIFFICULTY_MAP[s.settings.difficulty || 'standard'] || DIFFICULTY_MAP.standard;
  if (d.mods.startCash) s.company.cash = Math.round(s.company.cash * d.mods.startCash);
}

function applyArchetype(s, id) {
  const a = ARCHETYPE_MAP[id] || ARCHETYPE_MAP.hacker;
  s.founder.archetype = a.id;
  for (const [k, v] of Object.entries(a.skills || {})) s.founder.skills[k] = v;
  s.founder.traits = [{ id: a.id, name: a.name, mods: a.mods }];
  s.company.cash += a.startCash || 0;
  if (a.id === 'researcher') s.resources.research += 40;
  if (a.id === 'designer') s.unlocks.autoPolish = true;
}

function applyLegacyStart(s) {
  const L = s.legacy;
  const lvl = (id) => L.perks?.[id] || 0;
  s.company.cash += lvl('seed_capital') * 15000;
  s.resources.reputation += lvl('reputation_precedes') * 40;
  s.resources.research += lvl('foreknowledge') * 25;
  s.market.hype = Math.min(1, s.market.hype + lvl('market_timing') * 0.12);
  s.resources.alignment = Math.min(1, s.resources.alignment + lvl('aligned_by_default') * 0.1);

  // ── The shape perks ───────────────────────────────────────────────────────
  // A nemesis from the first morning. `spawnAperture` is idempotent, so the
  // card that introduces Vance in Act I still plays and still meets him — it
  // simply finds a company that has been building for as long as yours.
  if (lvl('old_enemies')) spawnAperture(s);
  // Crane already backed you once. `calls2.js` reads this flag on the bridge.
  if (lvl('standing_offer')) s.narrative.flags.crane_standing = true;
  // "Your Own Hand" needs nothing here: `keptEvents` reads the perk and opens
  // the newest kept card's act range, which keeps the stored card untouched.

  // ── New Game+ ─────────────────────────────────────────────────────────────
  // The inverted timeline reads the *last* run's ending out of the dossier and
  // flips one thing about this world. Everything it can flip is small and is a
  // constant in `NGPLUS`; the flag is stored so `modifiers.js` can read it
  // every frame without touching the dossier.
  if (s.settings.ngInvert) {
    const last = (L.dossier || [])[(L.dossier || []).length - 1];
    s.settings.invertFrom = last?.ending || null;
    if (s.settings.invertFrom === 'sovereign') {
      const d = (s.narrative.relationships.dorne ??= { met: false, affinity: 0, respect: 0, fear: 0, arc: 0 });
      d.affinity = NGPLUS.INVERT_SOVEREIGN_DORNE;
    }
  }
  if (s.settings.ngRival) spawnAperture(s);
  // §F8. A world that remembers. `initRace` seeds the lab that crossed last
  // time and `spawnAperture` reads how large a company you learned to run;
  // this is the third thing, and the only one that is a person. Dorne keeps a
  // file. The heat this company finished on last time is where her opinion of
  // the next one starts — which is not a punishment, it is the reason the
  // Senator already knows the name on day one.
  if (s.settings.ngWorld) {
    const last = (L.dossier || [])[(L.dossier || []).length - 1];
    if (last && Number.isFinite(last.dorneHeat)) {
      const d = (s.narrative.relationships.dorne ??= { met: false, affinity: 0, respect: 0, fear: 0, arc: 0 });
      d.affinity -= Math.round(last.dorneHeat * NGPLUS.MEMORY_DORNE_AFFINITY);
      d.fear += Math.round(last.dorneHeat * NGPLUS.MEMORY_DORNE_FEAR);
    }
  }
}

// ── Wiring: day hooks, event bridges ───────────────────────────────────────
function wire() {
  if (wired) return;
  wired = true;

  // Narrative is checked several times a day rather than once, so milestone and
  // act-transition cards land when they happen instead of up to a day later.
  Loop.addTickHook((s, days) => {
    if (s._offline) return;              // story beats wait for you to come back
    s._narrAcc = (s._narrAcc || 0) + days;
    if (s._narrAcc < 0.2) return;
    s._narrAcc = 0;
    tickNarrative(s);
  });

  // nullptr answers a post on the tick after it. The queue is on `S.wire` and
  // is saved, so a post made and a tab closed still gets its reply.
  Loop.addTickHook((s) => tickWire(s));

  Loop.addDayHook((s, day) => {
    const m = computeMods(s);
    const { side } = computeLaneOutput(s, m);
    tickWorld(s, 1, m);
    tickRace(s, 1, m);
    tickRegions(s, 1, m);
    tickDoctrines(s, 1);
    // §A6/§A7: the board's quarter and the founder's. §A23b: HELIX's standing.
    // Both are pure of the deck — they set a flag and the cards read it.
    tickBoard(s, 1);
    tickHelix(s, 1);
    tickAuthor(s, 1);
    tickIncidents(s, 1, side.incidentMult);
    tickMoonshot(s, 1, side.moonshotWork, m);
    tickNemesis(s, 1);
    tickRivalCo(s, 1);
    tickSieges(s, 1);
    checkActProgression(s);
    checkObjectives(s);
    checkAchievements(s);

    // Feed cadence: more chatter as you grow
    const chatter = 0.30 + Math.min(0.5, Math.log10(1 + totalUsers(s)) * 0.09);
    if (chance(chatter)) generateFeed(s);
    // The post. One letter a day at most, and only while you are here to read
    // it — unless this is the long game, where coming back to a full inbox is
    // the point.
    if (!s._offline || s.settings.pace === 'long') tickMail(s);
    // The phone rings. Never offline — a call holds the clock — and never while
    // an assistant is playing the world, which has its own way of calling.
    if (!s._offline) tickRings(s);
    // ARIA in the Wire, sparingly: the day after a hard choice, a Sunday
    // nobody rang anybody, and three days the run passes. One a week at most.
    ariaWire(s);

    // §B4. Two readings a day apart, so "what happened today" is a difference
    // and not an estimate. Last in the hook: everything above has already
    // moved, so the snapshot is the day as it closed.
    tickLedger(s, day);

    // Live threads — small, answerable, capped so the rail never becomes a
    // queue, and each asked once a run. The roll is scaled by how much of the
    // pool is still unasked, so a thin act asks slowly rather than spending
    // its last few questions in a week and falling silent for a season.
    expireThreads(s);
    if (!s._offline && openThreadCount(s) < WIRE.MAX_OPEN_THREADS) {
      const pool = eligibleThreads(s);
      const scale = Math.max(WIRE.THREAD_THIN_FLOOR, Math.min(1, pool.length / WIRE.THREAD_THIN_POOL));
      if (pool.length && chance(WIRE.THREAD_CHANCE * scale)) maybeThread(s, null, pool);
    }

    // Agents speak in their own voice, occasionally.
    if (s.agents.length && chance(0.16)) {
      const a = pick(s.agents);
      const line = agentLine(a, s);
      if (line) {
        a.lastLine = line;
        a.lastLineDay = Math.floor(s.time.day);
        pushFeed(s, { type: 'log', author: a.name, tone: 'neutral', text: line });
      }
    }

    // Bankruptcy / ending checks
    const em = tickEmergency(s, 1);
    if (em) {
      s.narrative.flags._went_broke = true;
      s.legacy.maxEmergency = Math.max(s.legacy.maxEmergency || 0, em.days);
      if (em.acts.length) pushFeed(s, { type: 'incident', author: 'EMERGENCY', tone: 'bad',
        text: `Cash is negative. ${em.acts.join('. ')}.`,
        meta: `day ${Math.floor(em.days)} in the red` });
    }
    const floor = computeMods(s).hardFail ? 0 : bankruptcyFloor(s);
    // Days underwater, counted where the cash is already checked. The autopsy
    // in the bankrupt ending reads it, and so does the profitability
    // achievement; both want the run's own number rather than a guess.
    if (s.company.cash < 0) s.stats.daysInRed = (s.stats.daysInRed || 0) + 1;
    else s.stats.daysProfitable = (s.stats.daysProfitable || 0) + (s.company.revenueToday > s.company.expensesToday ? 1 : 0);
    if (s.company.cash < floor && !s.ending) triggerEnding(s, 'bankrupt');
    if (s.founder.burnout > 25) s.narrative.flags._burned = true;
    // The most debt ever held. `debt_zero` promises "after having 100+", and
    // it used to check features shipped instead.
    if (s.resources.techDebt > (s.stats.peakDebt || 0)) s.stats.peakDebt = s.resources.techDebt;
    const e = checkEnding(s);
    if (e && !s.ending) triggerEnding(s, e.id);
  });
  // A crash that came and went with no round raised in between and the
  // company still solvent is what "survive a market crash without raising"
  // means; the flag is what `crash_survivor` reads. A run that *begins* in a
  // crash never sees the entry shift, and starts with zero rounds anyway.
  on('macro:shift', ({ from, to }) => {
    if (to === 'crash') S.narrative.flags._crash_rounds = S.stats.roundsRaised;
    if (from === 'crash' && S.company.cash > 0
        && S.stats.roundsRaised === (S.narrative.flags._crash_rounds ?? 0)) {
      S.narrative.flags._crash_survived = true;
    }
  });

  // The R key writes something. It used to move a reputation number and put
  // nothing in the Wire at all, which is why five cards could describe an
  // account that answers every post without a player ever seeing one.
  on('action:post', (p) => founderPost(S, p));

  on('feature:shipped', (p) => feedFromEvent(S, 'feature', p));
  on('product:launched', (p) => feedFromEvent(S, 'launch', p));
  on('research:done', (p) => feedFromEvent(S, 'research', p));
  on('round:raised', (p) => feedFromEvent(S, 'round', p));
  // §A6. A priced round seats a board — and re-seats it on every one after.
  on('round:raised', ({ offer }) => noteRound(S, offer?.type?.id));
  on('competitor:spawned', (p) => { if (S.company.act >= 2) feedFromEvent(S, 'competitor', p); });
  on('competitor:died', (p) => feedFromEvent(S, 'competitorDead', p));

  // Contact. Anyone with a face on a card the founder answered, anyone they
  // called, anyone whose post they replied to: the tie warms.
  on('event:resolved', ({ event }) => { if (event?.char) touch(S, event.char); });
  on('call:end', ({ call }) => { if (call?.char) touch(S, call.char); });
  on('thread:resolved', ({ item }) => { if (item?.runtime?.char) touch(S, item.runtime.char, LIFE.WARMTH_ON_REPLY); });
  // And when the world speaks as somebody. Two authors, one cast: a line from
  // Vance in the Wire is contact, exactly as a written card with his face on
  // it is, and until this was here a world that kept a run inhabited for a
  // hundred days left every tie in it stone cold.
  on('world:post', ({ char }) => { if (char) touch(S, char, LIFE.WARMTH_ON_REPLY); });

  on('agent:rogue', ({ agent }) => {
    S.narrative.flags._rogue_pending = true;
    S.narrative.flags._rogue_agent_id = agent.id;
    S.narrative.flags._rogue_agent_name = agent.name;
  });
  on('agent:breakthrough', ({ agent, amount }) => {
    pushFeed(S, { type: 'log', author: agent.name, tone: 'good',
      text: `Breakthrough. +${Math.round(amount)} research. *"I was not looking for this."*` });
  });
  on('agent:level', ({ agent }) => {
    remember(agent, `Reached level ${agent.level}.`, S.time.day);
    if (agent.level % 5 === 0) pushFeed(S, { type: 'log', author: agent.name, tone: 'good',
      text: `Reached level ${agent.level}.` });
  });
  on('agent:breakthrough', ({ agent, amount }) => remember(agent, `Breakthrough: +${Math.round(amount)} research.`, S.time.day));
  // Departures the founder did not order, and work the founder did not ask
  // for. The sentences are LEAVING and UNASKED in data/agents.js; the archive's
  // own line for each reason is DEPARTURES in machine.js.
  const said = (line, map) => String(line).replace(/\{(\w+)\}/g, (_, k) => map[k] ?? `{${k}}`);
  on('agent:left', ({ agent, reason }) => {
    const pool = LEAVING[reason];
    if (!pool) return;
    pushFeed(S, { type: 'log', author: 'The Ledger', tone: 'bad',
      text: said(pick(pool), { agent: agent.name, rival: nemesisOf(S)?.name || 'a rival' }),
      meta: reason === 'poached' ? 'poached' : 'resigned' });
  });
  on('agent:selfResearch', ({ agent, node }) => {
    remember(agent, `Chose ${node.name} itself.`, S.time.day);
    pushFeed(S, { type: 'log', author: agent.name, tone: 'neutral',
      text: said(pick(UNASKED.research), { agent: agent.name, node: node.name }) });
  });
  on('feature:selfShipped', ({ feature, agent }) => {
    if (agent) remember(agent, `Shipped ${feature.name} unasked.`, S.time.day);
    pushFeed(S, { type: 'ship', author: agent?.name || 'build', tone: 'neutral',
      text: said(pick(UNASKED.feature), { agent: agent?.name || 'An agent', feature: feature.name }),
      meta: 'nobody asked' });
  });
  on('agent:tool', ({ agent, tool }) => remember(agent, `${tool.name} installed.`, S.time.day, 'routine'));
  on('agent:upgraded', ({ agent, model }) => remember(agent, `Upgraded to ${model.name}.`, S.time.day, 'routine'));

  // ── What an agent remembers ───────────────────────────────────────────────
  // Until this, an agent's memory was the ladder: a level, a tool, a model.
  // The archive quoted the newest one, so the last thing on record about a
  // decommissioned instance was reliably a number going up. These are the
  // things that actually happened to it. `remember` keys each by kind and
  // `lastMeaningfulMemory` skips the rungs.
  // Whoever is on ops works it. A company with nobody on ops still has an
  // outage, and it is still worked — by whoever is there, which is the same
  // fallback the channel uses when it needs somebody to say freeze.
  on('incident', ({ incident }) => {
    const ops = S.agents.filter((a) => a.lane === 'ops');
    const worked = ops.length ? ops : S.agents;
    const verb = incidentVerb(S);
    for (const a of worked) remember(a, `Worked ${incident?.name || 'an incident'}. It ${verb}.`, S.time.day, 'incident');
    // And the channel's own note of it, so the room can be told to stop.
    if (worked.length) logAgent(S, 'incident', { name: incident?.name || '', what: incident?.id || '' });
  });
  // The best thing it ever shipped, rather than every thing it ever shipped:
  // a feature whose fit is at least as good as anything already on the product.
  // An Act III company ships hundreds and the list is eight deep, so a flat
  // threshold either never fires or fires until it has eaten the memory.
  on('feature:shipped', ({ feature, fit }) => {
    const p = S.products.find((x) => (x.features || []).includes(feature)) || S.products[0];
    const best = Math.max(0, ...((p?.features || []).filter((f) => f !== feature).map((f) => f.fit || 0)));
    if (!(fit >= best) || (p?.features || []).length < 3) return;
    for (const a of S.agents) if (a.lane === 'build') remember(a, `Shipped ${feature.name}. Best fit the product has had.`, S.time.day, 'ship');
  });
  // Named in the outcome of a card the founder answered. The deck writes
  // agents into its prose by name, and until now the agent never knew.
  on('event:resolved', ({ event, choice, outcome }) => {
    const text = String(outcome || '');
    if (!text) return;
    for (const a of S.agents) {
      if (!a.name || !text.includes(a.name)) continue;
      remember(a, `Named in ${event?.title || 'a decision'}. You chose to ${String(choice?.label || 'decide')
        .replace(/^["']|["']$/g, '').replace(/[.]$/, '')}.`, S.time.day, 'card');
    }
  });
  // It asked the founder something in the Wire and the founder answered. That
  // is the only two-way exchange an agent ever has, and it is worth a line.
  on('thread:resolved', ({ item, opt }) => {
    if (item?.type !== 'log' || !item.author) return;
    const a = S.agents.find((x) => x.name === item.author);
    if (a) remember(a, `Asked you which shape. You said: ${opt?.label || 'nothing'}.`, S.time.day, 'said');
  });

  // ── The Wire answers what happened ────────────────────────────────────────
  // Three separate voices, all of them additive and all of them silent when an
  // assistant is playing the world: the deck's own cast speaking twice, from
  // two authors, is how a run ends up with Vance contradicting Vance.
  on('event:resolved', ({ event, choice }) => {
    const tone = choice?.tone || 'neutral';
    if (tone === 'cruel') traitReaction(S, 'cruel');
    else if (event?.kind === 'milestone') traitReaction(S, 'milestone');
    if (chance(WIRE.CARD_POST_CHANCE)) feedFromEvent(S, 'card', { ev: event, choice, tone });
    // Priya's outlet runs a piece the day her card lands.
    if (event?.char === 'priya' && !World.isPresent(S)) castPost(S, 'priya', { tone });
  });
  on('nemesis:move', ({ move }) => {
    traitReaction(S, 'rival');
    if (!World.isPresent(S) && chance(WIRE.CAST_MOVE_CHANCE)) castPost(S, 'vance', { move: move?.id });
  });
  on('incident', ({ incident }) => {
    traitReaction(S, 'outage');
    if (!World.isPresent(S) && S.narrative.relationships?.sam?.met && chance(WIRE.CAST_OUTAGE_CHANCE)) {
      castPost(S, 'sam', { about: incident?.name });
    }
  });
  on('achieve', (id) => grantAchievement(S, id));
  on('run:end', ({ ending, value }) => { triggerEnding(S, ending, value); });

  Save.startAutosave();
}

// ── Player actions that need orchestration ────────────────────────────────
export function doLaunch(S_) {
  const s = S_ || S;
  const p = activeProduct(s);
  if (!p || p.launched) return null;
  if (p.features.length < 1) return { ok: false, reason: 'features' };
  const res = launchProduct(s, p);
  s.company.stage = 'launched';
  return { ok: true, ...res };
}

export function doShipFeature(s = S) {
  const p = activeProduct(s);
  if (!p) return { ok: false };
  const cost = featureCost(s, p);
  if (s.resources.code < cost) return { ok: false, reason: 'code', cost };
  s.resources.code -= cost;
  const f = shipFeature(s, p);
  return { ok: true, feature: f };
}

export function prestige(s = S) {
  const d = DIFFICULTY_MAP[s.settings.difficulty || 'standard'] || DIFFICULTY_MAP.standard;
  const sc2 = SCENARIO_MAP[s.settings.scenario || 'none'] || SCENARIO_MAP.none;
  const gain = Math.max(1, Math.round(computeLegacyGain(s) * (d.legacyMult ?? 1) * (sc2.legacyMult ?? 1)));
  const legacy = { ...s.legacy };
  legacy.points = (legacy.points || 0) + gain;
  legacy.runs = (legacy.runs || 0) + 1;
  legacy.bestValuation = Math.max(legacy.bestValuation || 0, s.company.valuation);
  legacy.bestAct = Math.max(legacy.bestAct || 0, s.company.act);
  legacy.totalDays = (legacy.totalDays || 0) + Math.floor(s.time.day);
  legacy.lastDifficulty = s.settings.difficulty;
  legacy.scenariosCleared = legacy.scenariosCleared || {};
  if (s.ending && s.ending.id !== 'bankrupt' && s.settings.scenario && s.settings.scenario !== 'none') {
    legacy.scenariosCleared[s.settings.scenario] = true;
  }
  if (s.ending && s.ending.id !== 'bankrupt') legacy.finishedOnce = true;
  legacy.difficultiesCleared = legacy.difficultiesCleared || {};
  if (s.ending && s.ending.id !== 'bankrupt') legacy.difficultiesCleared[s.settings.difficulty] = true;
  legacy.achievements = { ...(legacy.achievements || {}), ...s.achievements };

  // The career ledger: one line per finished run, so a player can see the shape
  // of everything they have done rather than just the sum of it.
  legacy.log = [...(legacy.log || []), {
    run: legacy.runs,
    day: Math.floor(s.time.day),
    ending: s.ending?.id || 'abandoned',
    endingName: s.ending?.name || 'Abandoned',
    tone: s.ending?.tone || 'neutral',
    archetype: s.founder.archetype,
    category: s.products[0]?.category || null,
    company: s.company.name,
    // An acquisition's row carries the deal, which is what the run was worth.
    valuation: s.ending?.id === 'acquired' && Number.isFinite(s.ending.value) ? s.ending.value : s.company.valuation,
    users: s.stats.peakUsers,
    act: s.company.act,
    difficulty: s.settings.difficulty,
    scenario: s.settings.scenario,
    gain,
    seconds: Math.round(s.meta.playSeconds || 0),
  }].slice(-60);

  // The world remembers. One entry per finished timeline, read by the next
  // one's briefing and by the cards that know there was a last time.
  legacy.dossier = [...(legacy.dossier || []), buildDossier(s)].slice(-KEEP.DOSSIER_KEEP);
  legacy.kept = Array.isArray(legacy.kept) ? legacy.kept : [];
  // The book of this timeline, finished, on the shelf — a lost run included.
  try {
    legacy.chronicles = [...(legacy.chronicles || []), {
      run: legacy.runs, company: s.company.name, ending: s.ending?.id || 'abandoned',
      endingName: s.ending?.name || 'Abandoned', tone: s.ending?.tone || 'neutral', day: Math.floor(s.time.day),
      text: toText(chronicle(s)),
      // The trajectory rides with the book, so an old timeline on the shelf has
      // a picture as well as a text. Sampled down: the arc is one point a week
      // and the shelf holds six of these inside one localStorage record.
      arc: (s.company.arc || []).filter((_, i, a) => i % Math.max(1, Math.ceil(a.length / 120)) === 0),
      // The world's last word rides on the row as well as inside the book, so
      // the shelf can say which timelines had somebody else at the table
      // without opening every one of them.
      ...(s.world?.author?.epilogue?.text ? { epilogue: s.world.author.epilogue.text } : {}),
    }].slice(-CHRONICLE.SHELF);
  } catch (e) { console.error('[chronicle]', e); }

  Save.saveLegacy(legacy);
  Save.clearSave();
  emit('prestige', { gain, legacy });
  return { gain, legacy };
}

export { Loop, Save };
export const api = { totalUsers, totalMrr, nextActHint, activeObjectives };
