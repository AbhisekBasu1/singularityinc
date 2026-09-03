// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE — one plain, serializable object. Systems mutate it; UI reads it.
// ─────────────────────────────────────────────────────────────────────────────
import { FOUNDER, ECON, TIME } from '../data/balance.js';
import { reseed } from './rng.js';

export const SAVE_VERSION = 11;

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
                                  log: [], kept: [], dossier: [] };

  const s = {
    meta: {
      version: SAVE_VERSION,
      seed,
      // `save.js` refreshes this immediately before serialising. Keeping the
      // stream position with the rest of the run means a file imported on a
      // second machine continues the same future, not just the same screen.
      rngState: seed,
      createdAt: Date.now(),
      lastSaved: Date.now(),
      lastRealTime: Date.now(),
      playSeconds: 0,
      firstRun: legacy.runs === 0,
      // Walkthrough progress: which chapters are finished, and whether the
      // player has turned the whole thing off.
      tutorial: { done: {}, seen: {}, off: false },
      // The threshold asks this only where site tools are real. The handoff is
      // part of onboarding, so remember whether this run invited an assistant
      // and whether that one-time handoff has been resolved.
      assistantChoice: 'none',       // 'play' | 'mute' | 'none'
      assistantHandoffDone: true,
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
      // §A22. A card, a ring or a thread that opens at 3× or 5× drops the clock
      // to 1× while it is on the table and hands the speed back afterwards.
      // Read in `ui/transport.js`; the founder's own hand always overrides it.
      autoThrottle: true,
      feedDensity: 'normal',
      autoShip: false,
      lateStart: null,          // 'act3' when the machine played the opening; legacy pays less
      pace: 'sitting',          // 'sitting' | 'long' — see LONG in balance.js
      // §B6. Off by default, and deliberately: a card is a decision about
      // people and the numbers under it are a second, smaller game. A founder
      // who wants them can have them, and the chips say `~` when the outcome
      // is a coin the preview only saw one side of.
      showNumbers: false,
      // New Game+, chosen at the threshold from the third run on. `ngWorld` is
      // stored and not yet read — the world-memory pass is what consumes it —
      // and `invertFrom` is the last run's ending id, resolved once at start
      // so `modifiers.js` never has to read the dossier on a paint.
      ngWorld: false, ngRival: false, ngInvert: false, invertFrom: null,
      // The workstation's own switches. Absent in a console-only save, and
      // `save.js` fills them, so neither housing needs a migration.
      os: { dock: 'auto', wallpaper: 'act', widgets: true, banners: true, sounds: true },
    },
    time: {
      day: 0,             // fractional days since founding
      lastDayProcessed: -1,
      hourOfDay: 0,       // hours since the day boundary; the loop rewrites it every tick
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
      // The person: sleep, health, and one tie per person met. See systems/life.js.
      life: { sleep: 0.82, health: 0.9, ties: {} },
      // One line, written at the threshold, to whoever is running this in three
      // years. It comes back through the post on the first day of Act IV.
      // Empty means the page was left blank, which gets its own letter.
      letterToSelf: typeof opts.letterToSelf === 'string' ? opts.letterToSelf.slice(0, 240) : '',
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
      // §A23a. The standing-order stack. Slot zero is `directive` above and
      // always has been; these are the extra slots `autonomous_corporation`
      // opens, each with its own `since` so each ramps on its own clock.
      orders: [],
      // §A6. Null until a priced round seats one. A founder who never raises,
      // or who only ever took a seed, never has a board — which is the Frugal
      // Empire world, and the bootstrapper's.
      board: null,
      // §A7. The quarter, which every run has whether or not there is a board
      // to keep it. `snap` is the reading the intentions are judged against.
      quarter: { start: 0, n: 1, intentions: [], snap: null, due: false },
      equity: { founder: 1.0, investors: 0, employees: 0, public: 0 },
      valuation: 0,
      raisedTotal: 0,
      rounds: [],
      // Rolling ledgers
      revenueToday: 0, expensesToday: 0,
      revenueHistory: [], valuationHistory: [], userHistory: [], cashHistory: [],
      arc: [],               // coarse whole-run record for the trajectory chart
      // §B4. Two readings a day apart and the week behind them, written once a
      // day by `tickLedger`. The Today panel and the seven-day chips on the
      // stat strip are differences of these — a save from before this reads
      // back with `today` missing and the day hook builds it on the next day.
      today: { day: 0, prev: null, cur: null, week: [] },
      debtOwed: 0,
      publiclyTraded: false,
      // Written by nothing yet: the IPO card flips `publiclyTraded` and the
      // public markets that would move a price are §A8. Kept because the
      // ending and the epilogue both read the company as a public one.
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
      skunkworks: 0,       // code an autonomous agent wrote for its own reasons; ships itself
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
    agentsLeft: [],
    // The channel's ring buffer: lane changes, autonomy moves, hires and the
    // incidents the roster worked, newest first and capped at AGENTS.LOG_KEEP.
    // `agents/channel` in the Record and `tail channel` are generated from it.
    agentsLog: [],
    research: { done: {}, doneDay: {}, active: null, progress: 0, queue: [], unlocked: {} },
    market: {
      hype: 0.5,              // 0..1 sector hype cycle
      hypePhase: 0,
      macro: 'neutral',       // boom | neutral | tightening | crash
      macroDaysLeft: 180,
      sectorSaturation: 0,
      competitors: [],
      competitorSeq: 1,
      // The feud: who it is with, how hot it is, and what they last did.
      // §A14: `season` is what they are trying to do this quarter, `seasons` the
      // finished ones, and `quietDays` is what ends a feud now — silence rather
      // than a threat ratio, which used to retire the antagonist exactly when
      // the founder got large. `nemesisState` fills all three on an older save.
      nemesis: { id: null, grudge: 0, moves: [], since: 0, lowDays: 0, cooldown: 0,
                 season: null, seasons: [], quietDays: 0 },
      priceSiege: 0,          // days left of rival price pressure
      channelLock: 0,         // days left of a locked distribution channel
    },
    world: {
      publicOpinion: 0.5,
      regulatoryHeat: 0,
      aiSafetyConcern: 0.2,
      globalGdpShare: 0,
      regions: {},
      controlled: {},
      controlPoints: 0,
      projectQueue: [],
      projectsBuilt: {},
      doomClock: 0,           // narrative tension meter for Act IV/V
      // §A10: one holder per bloc — `initRegions` seeds East Asia's domestic
      // champion. §F2: the gates the world has closed for good, the days spent
      // in Act V against `ACT5_WINDOW`, and the drift rates behind
      // "closes in ~N days". All four are grown by the system that owns them,
      // so an older save finds them on its next tick.
      regionRivals: null,
      sealed: {}, act5Days: 0, act5Due: false, drift: null,
      // When an assistant is present it authors into the same deck the game
      // ships with. This is its ledger: what it has done, and how recently, so
      // the rate limits survive a reload. Decisions the assistant has not yet
      // observed survive too. Mode and the pending slot are deliberately
      // absent — a save always reopens on the authored deck.
      author: {
        muted: false,
        stats: { cards: 0, posts: 0, moves: 0, shocks: 0, pressure: 0, lines: 0, refused: 0,
                 ownWords: 0, slotsOffered: 0, slotsFilled: 0, slotsTimedOut: 0,
                 muted: 0, revokedByDoctrine: 0 },
        recent: { cardDays: [], postDays: [], shockDays: [], lineDays: [], taken: [] },
        inbox: [],
        // A compact, persisted account of what the founder and company did.
        // Important beats also enter `inbox`; routine clicks are coalesced in
        // `routinePending` so a live assistant sees the work without being
        // interrupted once per click.
        activity: [],
        routinePending: null,
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
    // The phone. A call open when the tab closes is still open when it
    // reopens, the way a card is; the log is what the Contacts app reads.
    calls: { active: null, log: [], seq: 1, lastRing: -99 },
    // §A23b. HELIX, once there is one. `standing` drifts toward a target read
    // off alignment, the grant ratio and the arc; `asks` and `granted` are
    // rebuilt from the journal every day, so a save from before this existed
    // arrives with its whole history intact.
    helix: { standing: 0.5, asks: 0, granted: 0, lastAsk: null, since: null },
    // The inbox: which letters have landed, which have been opened. The
    // letters themselves are Wire items. The founder's own journal is here too.
    // `count` is how many times a recurring correspondent has written, which
    // is what its body is handed; `queued` is the replies somebody owes you.
    mail: { delivered: {}, read: {}, count: {}, queued: [] },
    notes: [],
    // The long game's ledger: how much of today's month has been played live.
    longGame: { dayKey: '', liveDays: 0, override: false },
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
      // Two ledgers for rivals that are gone: `crushed` is what you did to them
      // (a card, an acquisition's aftermath, a rival dying under Total War);
      // `outlasted` is what the market's weather did while you were still
      // standing. Pacifism and epilogues read the first; "outlast" the second.
      competitorsCrushed: 0, competitorsOutlasted: 0, roundsRaised: 0, peakValuation: 0, clicks: 0,
      bestQuality: 0, allNighters: 0, rivalsBeaten: 0, threadsResolved: 0,
      peakDebt: 0,           // the most tech debt ever held; `debt_zero` reads it
      lastShipDay: -99,      // read by the Relentless doctrine; was an undeclared `S._lastShipDay`
      intentionsKept: 0,     // §A2: quarterly intentions kept, over the whole run
      lastIntentionKeptDay: -99,  // and the day of the last one, for the Act IV deed
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
