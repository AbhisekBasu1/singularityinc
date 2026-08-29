// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE — one plain, serializable object. Systems mutate it; UI reads it.
// ─────────────────────────────────────────────────────────────────────────────
import { FOUNDER, ECON, TIME } from '../data/balance.js';
import { reseed } from './rng.js';

export const SAVE_VERSION = 8;

export let S = null;              // the live state (module singleton)
export function setState(next) { S = next; return S; }

export function emptySkills() {
  return { engineering: 1, design: 1, growth: 1, sales: 1, ops: 1, prompting: 1, vision: 1 };
}

export function newGame(opts = {}) {
  const seed = opts.seed ?? ((Math.random() * 0xffffffff) >>> 0);
  reseed(seed);
  const legacy = opts.legacy ?? { points: 0, spent: 0, perks: {}, runs: 0, bestValuation: 0,
                                  bestAct: 0, unlockedArchetypes: ['hacker'], endings: {}, totalDays: 0,
                                  log: [] };

  const s = {
    meta: {
      version: SAVE_VERSION,
      seed,
      createdAt: Date.now(),
      lastSaved: Date.now(),
      lastRealTime: Date.now(),
      playSeconds: 0,
      firstRun: legacy.runs === 0,
      // Walkthrough progress: which chapters are finished, and whether the
      // player has turned the whole thing off.
      tutorial: { done: {}, seen: {}, off: false },
    },
    settings: {
      speed: 1,
      difficulty: 'standard',
      scenario: 'none',
      paused: false,
      sound: true,
      particles: true,
      autosave: true,
      reducedMotion: false,
      highContrast: false,
      volume: 0.55,
      ambient: true,
      confirmBigMoves: true,
      feedDensity: 'normal',
      autoShip: false,
    },
    time: {
      day: 0,             // fractional days since founding
      lastDayProcessed: -1,
      hourOfDay: 8,
    },
    founder: {
      name: opts.founderName || 'Alex Rivera',
      handle: opts.handle || '@alexbuilds',
      archetype: opts.archetype || 'hacker',
      pronoun: opts.pronoun || 'they',
      focus: FOUNDER.START_FOCUS,
      focusMax: FOUNDER.START_FOCUS,
      skills: emptySkills(),
      skillPoints: 0,
      level: 1,
      xp: 0,
      traits: [],
      burnout: 0,
      approach: 'describe',
      fitCredit: 0,
      streak: 0,
      // Time allocation: fractions of the working day. Must sum to <= 1.
      allocation: { build: 0.44, users: 0.18, growth: 0.11, learn: 0.09, rest: 0.18 },
      moodLog: [],
    },
    company: {
      name: opts.companyName || 'Untitled',
      tagline: opts.tagline || '',
      logoSeed: (Math.random() * 1e9) | 0,
      cash: ECON.START_CASH,
      act: 1,
      stage: 'idea',            // idea → building → launched → traction → scaling → dominant → transcendent
      founded: 0,
      actStartedDay: 0,
      directive: 'none',
      directiveSince: 0,
      equity: { founder: 1.0, investors: 0, employees: 0, public: 0 },
      valuation: 0,
      raisedTotal: 0,
      rounds: [],
      // Rolling ledgers
      revenueToday: 0, expensesToday: 0,
      revenueHistory: [], valuationHistory: [], userHistory: [], cashHistory: [],
      arc: [],               // coarse whole-run record for the trajectory chart
      debtOwed: 0,
      publiclyTraded: false,
      sharePrice: 0,
      subsidiaries: [],
    },
    resources: {
      // Event and project grants live outside the modifier recompute: the cap
      // is rebuilt from scratch every tick, so anything written straight onto
      // it would be erased on the next frame.
      computeGranted: 0, computeScale: 1,
      energyGranted: 0, energyScale: 1,
      code: 0,
      insight: 0,
      reputation: 0,
      techDebt: 0,
      research: 0,
      compute: 0,          // available TFLOP-days/day
      computeCap: 0,
      data: 0,
      influence: 0,
      energy: 0,
      energyCap: 0,
      alignment: 0.5,      // 0 = misaligned, 1 = fully aligned
      singularity: 0,      // 0..100 progress toward the Event
    },
    products: [],
    activeProductId: null,
    agents: [],
    agentIdSeq: 1,
    tasks: [],             // in-flight agent tasks
    taskIdSeq: 1,
    research: { done: {}, active: null, progress: 0, queue: [], unlocked: {} },
    market: {
      hype: 0.5,              // 0..1 sector hype cycle
      hypePhase: 0,
      macro: 'neutral',       // boom | neutral | tightening | crash
      macroDaysLeft: 180,
      sectorSaturation: 0,
      competitors: [],
      competitorSeq: 1,
      trends: [],
      // The feud: who it is with, how hot it is, and what they last did.
      nemesis: { id: null, grudge: 0, moves: [], since: 0, lowDays: 0, cooldown: 0 },
      priceSiege: 0,          // days left of rival price pressure
      channelLock: 0,         // days left of a locked distribution channel
    },
    world: {
      publicOpinion: 0.5,
      regulatoryHeat: 0,
      aiSafetyConcern: 0.2,
      globalGdpShare: 0,
      regions: {},
      governments: {},
      factions: {},
      treaties: [],
      controlled: {},
      controlPoints: 0,
      projectQueue: [],
      projectsBuilt: {},
      doomClock: 0,           // narrative tension meter for Act IV/V
      // When an assistant is present it authors into the same deck the game
      // ships with. This is its ledger: what it has done, and how recently, so
      // the rate limits survive a reload. Mode and the pending slot are
      // deliberately absent — a save always reopens on the authored deck.
      author: {
        muted: false,
        stats: { cards: 0, posts: 0, moves: 0, shocks: 0, pressure: 0, lines: 0, refused: 0,
                 ownWords: 0, slotsOffered: 0, slotsFilled: 0, slotsTimedOut: 0,
                 muted: 0, revokedByDoctrine: 0 },
        recent: { cardDays: [], postDays: [], shockDays: [], lineDays: [], taken: [] },
        seq: 1,
      },
    },
    narrative: {
      flags: {},
      chains: {},
      seen: {},
      relationships: {},
      activeEvent: null,
      queue: [],
      nextEventDay: 2.5,
      cooldowns: {},
      journal: [],
      choicesMade: 0,
    },
    feed: [],
    feedSeq: 1,
    notifications: [],
    achievements: {},
    objectivesDone: {},
    doctrines: { earned: {}, streak: {} },
    achievementProgress: {},
    stats: {
      totalCash: 0, totalRevenue: 0, totalUsers: 0, peakUsers: 0, peakMrr: 0,
      featuresShipped: 0, productsLaunched: 0, promptsWritten: 0, linesManual: 0,
      agentsHired: 0, agentsLost: 0, incidents: 0, acquisitions: 0,
      researchDone: 0, eventsResolved: 0, daysSurvived: 0, viralHits: 0,
      competitorsCrushed: 0, roundsRaised: 0, peakValuation: 0, clicks: 0,
      bestQuality: 0, allNighters: 0, rivalsBeaten: 0, threadsResolved: 0,
    },
    legacy,
    unlocks: {},           // feature-gate flags set by progression
    ui: {},                // transient view state (focused region, open tabs)
    log: [],               // structured game log
    ending: null,
  };
  return s;
}

// ── Convenience accessors ───────────────────────────────────────────────────
export function activeProduct(s = S) {
  if (!s) return null;
  return s.products.find((p) => p.id === s.activeProductId) || s.products[0] || null;
}
export function hasResearch(id, s = S) { return !!s?.research.done[id]; }
export function flag(name, s = S) { return !!s?.narrative.flags[name]; }
export function setFlag(name, v = true, s = S) { s.narrative.flags[name] = v; }
export function unlocked(name, s = S) { return !!s?.unlocks[name]; }
export function unlock(name, s = S) {
  if (s.unlocks[name]) return false;
  s.unlocks[name] = true;
  return true;
}
export function rel(charId, s = S) {
  if (!s.narrative.relationships[charId]) {
    s.narrative.relationships[charId] = { met: false, affinity: 0, respect: 0, fear: 0, arc: 0, status: 'unknown' };
  }
  return s.narrative.relationships[charId];
}
