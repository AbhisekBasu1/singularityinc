// ─────────────────────────────────────────────────────────────────────────────
// DEV HARNESS — `?dev=1&cat=devtools&arch=hacker&days=400&view=research`.
// Fetched by main.js only when `dev` is in the address bar, so none of this
// ships to a player who did not ask for it. Everything here plants state so a
// screen can be looked at without playing to it.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from './engine/state.js';
import { emit } from './engine/bus.js';
import * as Game from './game.js';
import * as Shell from './ui/shell.js';
import * as Modal from './ui/modal.js';
import * as Tutorial from './ui/tutorial.js';
import * as WorldView from './ui/views/world.js';
import { showHelp } from './ui/manual.js';
import * as Autoplay from './systems/autoplay.js';
import { totalUsers, totalMrr } from './systems/product.js';
import { presentEvent } from './systems/narrative.js';
import { ENDINGS } from './systems/progression.js';
import { nemesisState, runMove } from './systems/nemesis.js';
import { activeCompetitors, spawnCompetitor } from './systems/market.js';
import { initRegions } from './systems/regions.js';
import { REGIONS, STAGES } from './data/regions.js';
import { EVENT_MAP } from './data/events.js';

// `enterGame` and `showEnding` belong to main.js; it hands them over rather
// than the harness importing main back.
export function devBoot(q, { enterGame, showEnding }) {
  Game.startNewGame({
    founderName: q.get('founder') || 'Alex Rivera',
    companyName: q.get('company') || 'Meridian',
    archetype: q.get('arch') || 'hacker',
    category: q.get('cat') || 'devtools',
    productName: q.get('company') || 'Meridian',
    difficulty: q.get('diff') || 'standard',
    scenario: q.get('scen') || 'none',
  });
  enterGame();
  const days = Number(q.get('days') || 0);
  if (days > 0) devSimulate(days);
  if (q.get('view')) Shell.setView(q.get('view'));
  if (q.get('wtab')) WorldView.setWorldTab(q.get('wtab'));
  if (q.get('event')) {
    const e = EVENT_MAP[q.get('event')];
    if (e) presentEvent(S, e);
  }
  if (q.get('end')) {
    const e = ENDINGS.find((x) => x.id === q.get('end'));
    if (e) { S.ending = { id: e.id, name: e.name, tone: e.tone, day: Math.floor(S.time.day) }; showEnding(e); }
  }
  if (q.has('aria')) setTimeout(() => document.querySelector('[data-act="ask-aria"]')?.click(), 60);
  if (q.get('dlg')) setTimeout(() => {
    const map = { recruit: '[data-act="recruit"]', raise: '[data-act="raise"]', tools: '[data-act="agent-tools"]',
      newprod: '[data-act="new-product"]', settings: '[data-act="settings"]' };
    document.querySelector(map[q.get('dlg')] || '')?.click();
  }, 80);
  if (q.has('help')) setTimeout(() => showHelp(), 60);
  if (q.get('tut')) setTimeout(() => Tutorial.start(q.get('tut'), { from: Number(q.get('tstep') || 0) }), 300);
  if (q.get('regions')) devRegions(Number(q.get('regions')) || 0);
  if (q.has('feud')) devFeud();
  if (q.has('career')) devCareer();
  if (q.has('brief')) setTimeout(() => emit('game:continue', { offline: {
    days: 3.4, from: Math.max(0, Math.floor(S.time.day) - 3), to: Math.floor(S.time.day),
    gained: { cash: 4.1e6, users: 128000, mrr: 92000, valuation: 8.4e8, features: 3, research: 2, incidents: 1 },
    waiting: 2,
    headlines: S.feed.slice(0, 5).map((f) => ({ type: f.type, tone: f.tone || '', day: f.day, text: f.text, author: f.author || '' })),
  } }), 400);
  if (q.has('pause')) S.settings.paused = true;
  Shell.paintMain(); Shell.paintTopbar(); Shell.paintNav(); Shell.paintFeed();
}

// A plausible career ledger, for looking at the panel.
function devCareer() {
  const runs = [
    ['bankrupt', 'Out Of Runway', 'bad', 'hacker', 'devtools', 'Northwind', 3.1e6, 214, 1, 7],
    ['acquired', 'The Responsible Outcome', 'neutral', 'hustler', 'consumer', 'Palegrove', 9.4e9, 512, 3, 34],
    ['steward', 'The Steward', 'good', 'researcher', 'agents', 'Cinderpath', 2.2e12, 1043, 5, 88],
    ['sovereign', 'The Sovereign', 'dark', 'operator', 'b2b', 'Ninefold', 41e12, 1218, 5, 126],
  ];
  S.legacy.log = runs.map(([ending, endingName, tone, archetype, category, company, valuation, day, act, gain], i) => ({
    run: i + 1, day, ending, endingName, tone, archetype, category, company,
    valuation, users: valuation / 4200, act, difficulty: i > 1 ? 'brutal' : 'standard',
    scenario: 'none', gain, seconds: 3600 * (i + 2),
  }));
  S.legacy.runs = runs.length;
  Shell.paintMain();
}

// Force a rivalry so the dossier can be seen without waiting for one to develop.
function devFeud() {
  let list = activeCompetitors(S);
  if (!list.length) { spawnCompetitor(S, { scale: 90, quality: 1.4 }); list = activeCompetitors(S); }
  const c = list.sort((a, b) => b.threat - a.threat)[0];
  c.day = S.time.day - 200;
  c.users = Math.max(c.users, totalUsers(S) * 0.7);
  c.mrr = Math.max(c.mrr, totalMrr(S) * 0.6);
  const n = nemesisState(S);
  n.id = c.id; n.since = Math.max(0, S.time.day - 180); n.grudge = 2.1; n.moves = [];
  for (let i = 0; i < 4; i++) runMove(S, c);
  S.market.priceSiege = 18;
  Shell.paintMain(); Shell.paintFeed();
}

// Plant presence so the tactical display shows a board in progress.
function devRegions(n) {
  initRegions(S);
  REGIONS.slice(0, n).forEach((r, i) => {
    const st = S.world.regions[r.id];
    st.stage = STAGES[Math.min(STAGES.length - 1, 1 + (i % 4))].id;
    st.stance = 0.55 + (i % 4) * 0.1;
  });
  Shell.paintMain();
}

// The fast-forward is the same bot the late start uses.
function devSimulate(days) {
  Autoplay.play(S, days);
  Shell.paintMain(); Shell.paintTopbar(); Shell.paintNav(); Shell.paintFeed();
}
