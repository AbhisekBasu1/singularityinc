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
import { generateFeed, feedFromEvent, pushFeed, maybeThread, expireThreads, openThreadCount } from './systems/feed.js';
import { tickIncidents } from './systems/incidents.js';
import { tickNemesis, tickSieges } from './systems/nemesis.js';
import { checkActProgression, checkAchievements, tickWorld, checkEnding, triggerEnding,
         nextActHint, grantAchievement } from './systems/progression.js';
import { checkObjectives, activeObjectives } from './systems/objectives.js';
import { computeLaneOutput, agentLine, remember } from './systems/agents.js';
import { tickRace } from './systems/agirace.js';
import { tickRegions } from './systems/regions.js';
import { tickDoctrines } from './systems/doctrines.js';
import { tickAuthor } from './world/author.js';
import { ARCHETYPE_MAP } from './data/legacy.js';
import { computeLegacyGain } from './data/legacy.js';
import { CATEGORY_MAP } from './data/products.js';
import { reserveName } from './data/names.js';
import { DIFFICULTY_MAP } from './data/difficulty.js';
import { SCENARIO_MAP } from './data/scenarios.js';
import { spawnCompetitor } from './systems/market.js';
import { chance, rand, pick } from './engine/rng.js';

let wired = false;

export function startNewGame(opts) {
  const legacy = Save.loadLegacy() || undefined;
  const s = newGame({ ...opts, legacy });
  reserveName(s.company.name);
  reserveName(opts.productName);
  s.settings.difficulty = opts.difficulty || legacy?.lastDifficulty || 'standard';
  s.settings.scenario = opts.scenario || 'none';
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

export function continueGame() {
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

  Loop.addDayHook((s, day) => {
    const m = computeMods(s);
    const { side } = computeLaneOutput(s, m);
    tickWorld(s, 1, m);
    tickRace(s, 1, m);
    tickRegions(s, 1, m);
    tickDoctrines(s, 1);
    tickAuthor(s, 1);
    tickIncidents(s, 1, side.incidentMult);
    tickNemesis(s, 1);
    tickSieges(s, 1);
    checkActProgression(s);
    checkObjectives(s);
    checkAchievements(s);

    // Feed cadence: more chatter as you grow
    const chatter = 0.30 + Math.min(0.5, Math.log10(1 + totalUsers(s)) * 0.09);
    if (chance(chatter)) generateFeed(s);

    // Live threads — small, answerable, capped so the rail never becomes a queue.
    expireThreads(s);
    if (!s._offline && openThreadCount(s) < 3 && chance(0.09)) maybeThread(s);

    // Agents speak in their own voice, occasionally.
    if (s.agents.length && chance(0.16)) {
      const a = pick(s.agents);
      const line = agentLine(a);
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
    if (s.company.cash < floor && !s.ending) triggerEnding(s, 'bankrupt');
    if (s.founder.burnout > 25) s.narrative.flags._burned = true;
    const e = checkEnding(s);
    if (e && !s.ending) triggerEnding(s, e.id);
  });

  on('feature:shipped', (p) => feedFromEvent(S, 'feature', p));
  on('product:launched', (p) => feedFromEvent(S, 'launch', p));
  on('research:done', (p) => feedFromEvent(S, 'research', p));
  on('round:raised', (p) => feedFromEvent(S, 'round', p));
  on('competitor:spawned', (p) => { if (S.company.act >= 2) feedFromEvent(S, 'competitor', p); });
  on('competitor:died', (p) => feedFromEvent(S, 'competitorDead', p));

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
  on('agent:tool', ({ agent, tool }) => remember(agent, `${tool.name} installed.`, S.time.day));
  on('agent:upgraded', ({ agent, model }) => remember(agent, `Upgraded to ${model.name}.`, S.time.day));
  on('incident', () => { for (const a of S.agents) if (a.lane === 'ops') remember(a, 'Worked an incident.', S.time.day); });
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
    valuation: s.company.valuation,
    users: s.stats.peakUsers,
    act: s.company.act,
    difficulty: s.settings.difficulty,
    scenario: s.settings.scenario,
    gain,
    seconds: Math.round(s.meta.playSeconds || 0),
  }].slice(-60);

  Save.saveLegacy(legacy);
  Save.clearSave();
  emit('prestige', { gain, legacy });
  return { gain, legacy };
}

export { Loop, Save };
export const api = { totalUsers, totalMrr, nextActHint, activeObjectives };
