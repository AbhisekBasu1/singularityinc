// ─────────────────────────────────────────────────────────────────────────────
// BALANCE — every tuning constant lives here so pacing can be dialed in one file.
// ─────────────────────────────────────────────────────────────────────────────

export const TIME = {
  DAY_SECONDS: 7,          // real seconds per in-game day at 1x
  TICK_HZ: 20,             // simulation ticks per second
  MAX_OFFLINE_HOURS: 36,   // beyond this, no further offline credit
  MAX_OFFLINE_DAYS: 42,    // hard ceiling on in-game days granted while away
  OFFLINE_HALFLIFE_H: 4,   // hours of absence for ~63% of the maximum
  SPEEDS: [1, 2, 3, 5],
};

export const FOUNDER = {
  // One full focus bar of direct action is always worth at least this share of
  // a day of company build output. Without it the four verbs decay from 2900%
  // of a day in Act II to 8.8% in Act V — the clicker layer dies exactly as the
  // rest of the game gets big.
  DIRECT_DAY_SHARE: 0.22,
  START_FOCUS: 100,
  FOCUS_REGEN_PER_DAY: 74,      // while working normally
  REST_REGEN_MULT: 3.4,
  BURNOUT_THRESHOLD: 15,        // focus below this → burnout risk
  XP_PER_LEVEL: (lvl) => Math.floor(90 * Math.pow(1.34, lvl - 1)),
  SKILL_CAP: 20,
  MAX_HOURS: 16,
};

export const ECON = {
  START_CASH: 12000,
  PERSONAL_BURN_PER_DAY: 58,    // rent, ramen, existence
  API_COST_PER_KTOKEN: 0.0042,  // your AI habit
  CLOUD_BASE_PER_DAY: 3.5,
  CLOUD_PER_1K_USERS: 4.2,
  TAX_RATE: 0.21,
  VALUATION_ARR_MULT_BASE: 9,
  VALUATION_MULT_MIN: 3,
  VALUATION_MULT_CAP: 58,
  VALUATION_GDP_CEILING: 2.6,
};

export const PRODUCT = {
  FEATURE_CODE_BASE: 48,        // code units for the first feature
  FEATURE_CODE_GROWTH: 1.105,   // per feature already shipped
  QUALITY_PER_FEATURE: 0.055,
  DEBT_QUALITY_PENALTY: 0.40,
  BASE_CHURN: 0.055,            // monthly, at reliability 1
  ORGANIC_BASE: 1.1,            // awareness gained per day at baseline
  GROWTH_BASE: 0.0108,          // core compounding daily growth rate
  VIRAL_TO_GROWTH: 0.062,       // how much viral k adds to daily growth
  VIRAL_CAP: 0.98,
  PRICE_ELASTICITY: 2.2,        // churn penalty per unit of over-pricing
  // Undercutting buys reach, not revenue. Without these, every price penalty is
  // gated on max(0, ratio-1) — exactly neutral below fair value — so the optimum
  // was a corner: raise price to fair and never think about it again.
  DISCOUNT_CAP: 3,              // most reach a discount can ever buy
  DISCOUNT_VIRAL: 0.20,         // share of virality that responds to price
  DISCOUNT_CONV: 0.30,          // share of seed conversion that responds to price
  // Past the human ceiling, users stop being people. Each doubling of nominal
  // demand adds this share of the ceiling, so the number keeps moving without
  // the curve going vertical.
  POSTHUMAN_BASE: 0.15,
  POSTHUMAN_ROBOTIC: 0.50,      // with embodiment research, machines are users too
};

export const CODE = {
  MANUAL_PER_CLICK: 1.0,
  MANUAL_FOCUS_COST: 0.85,
  PROMPT_BASE_OUTPUT: 9,
  PROMPT_FOCUS_COST: 5.0,
  PROMPT_CASH_COST: 5.5,
  PROMPT_DEBT: 1.15,
  DEBT_VELOCITY_SCALE: 260,     // debt at which velocity halves
  AGENT_CODE_MULT: 2.4,         // agent build-lane output → code units
};

export const AGENTS = {
  BASE_HIRE_COST: 900,
  HIRE_COST_GROWTH: 1.29,
  UPKEEP_MULT: 1.0,
  MAX_ROSTER_BASE: 3,
  ROGUE_BASE_CHANCE: 0.00035,   // per day at autonomy 1.0
  XP_PER_DAY: 1.0,
  LEVEL_XP: (lvl) => Math.floor(24 * Math.pow(1.42, lvl - 1)),
};

export const RESEARCH = {
  BASE_RATE: 0.30,              // research points/day from founder alone
  COST_SCALE: 1.75,
  // Research had four unbounded terms — compute, data, the stacked multiplier
  // and the compounding bonus — and together they reached ~10^9 points/day.
  // That finished all 85 nodes by day ~1150 of a ~1400-day run, left the
  // Research screen empty for the last quarter, and banked 2.5 billion
  // unspendable points. One ceiling on the whole rate instead: a day of
  // research is worth a bounded amount of progress, so the three tier-8 nodes
  // that each unlock an ending are a choice rather than a checklist.
  MAX_RATE: 22000,              // most research points a single day can be worth
  // And you cannot stockpile insight forever: unspent points bank only up to a
  // multiple of the dearest thing still left to learn. Without this the number
  // on screen ran to 2.5 billion and stopped meaning anything.
  BANK_CAP_MULT: 2.5,
};

export const MARKET = {
  HYPE_PERIOD_DAYS: 140,
  COMPETITOR_SPAWN_DAYS: 95,
  MACRO_SHIFT_DAYS: 210,
};

export const EVENTS = {
  BASE_INTERVAL_DAYS: 7.5,
  MIN_INTERVAL_DAYS: 3.5,
  JITTER: 0.5,
  // Events also have a real-time floor, so running at 5× does not turn the
  // game into a slideshow of modals.
  MIN_REAL_SECONDS: 26,
  MIN_REAL_SECONDS_PRIORITY: 10,
};

export const WORLD = {
  // The world layer used to be write-only: fourteen systems wrote regulatory
  // heat and exactly one read it, the doom clock drove a meter and nothing
  // else, and public approval — which the World view says "lifts valuation" —
  // appeared nowhere in economy.js. These are the edges that make those
  // sentences true.
  OPINION_VALUATION: 0.30,      // full approval swing, as a share of valuation
  HEAT_VALUATION: 0.25,         // full heat, as a share of valuation
  HEAT_COMPLIANCE: 0.55,        // compliance cost per unit heat, vs hosting spend
  HEAT_RAISE_DRAG: 0.30,        // full heat, as a share of what investors offer
  DOOM_INCIDENT_RATE: 1.60,     // extra incident frequency at a full doom clock
  DOOM_INCIDENT_SEV: 0.70,      // extra incident severity at a full doom clock
  GDP_2027: 118e12,
  GDP_GROWTH: 0.028,
  REGIONS: 8,
};

// Act thresholds — the game reinvents itself at each one.
export const ACTS = [
  { id: 0, name: 'Prologue',        short: 'PRO' },
  { id: 1, name: 'The Garage',      short: 'I',   sub: 'Zero to One' },
  { id: 2, name: 'The Machine',     short: 'II',  sub: 'Product–Market Fit' },
  { id: 3, name: 'The Empire',      short: 'III', sub: 'Escape Velocity' },
  { id: 4, name: 'The Singularity', short: 'IV',  sub: 'Recursive Ascent' },
  { id: 5, name: 'Ascension',       short: 'V',   sub: 'What Comes After' },
];

// ── The race ────────────────────────────────────────────────────────────────
// The frontier labs are meant to be the antagonist of Act IV. Measured without
// a sprint term the player crossed first in 7 of 7 builds while the best rival
// stalled near 65, so "somebody is going to cross the line this year" was never
// true of anybody but you.
export const RACE = {
  SPRINT_FROM: 18,     // the field starts sprinting once you are this visible
  SPRINT_GAIN: 3.4,    // extra rate at 100, on top of the catch-up term
  // Capability is what you *could* build; progress is what you have actually
  // pushed to the frontier. Without a conversion step the player's curve is a
  // cliff — measured, raw capability went 58 to 101 in a hundred days, which no
  // multiplier on the rivals could ever cover, and the player crossed first in
  // 21 of 21 runs. Converting at a bounded rate makes the last stretch a
  // commitment you have to hold rather than a threshold you fall over.
  CONVERT_PER_DAY: 0.215,  // frontier points/day at full commitment
  PUSH_FLOOR: 0.32,        // share of that rate with nothing pointed at the frontier
  PUSH_HALFLIFE: 32,       // days for commitment to close half the gap to its target
};

// ── The world, played ───────────────────────────────────────────────────────
// When an assistant is present it authors cards into the same deck the game
// ships with. Its limits are not a guess: `tools/capsderive.mjs` executes all
// 715 authored choices against a representative state per act and reports the
// magnitude of everything each one moved. CAPS below is the deck's own 80th
// percentile — the world may write a typical card, never an outlier.
//
// Some keys are deliberately tighter than the measured p80, and each deviation
// is a game-design decision rather than a rounding:
//
//   align     measured 0.12–0.18. Alignment decides an ending and sits on a
//             0..1 scale; the deck moves it at a handful of scripted moments
//             while the world may write twice a fortnight for 1,200 days.
//   affinity  measured 7–14. Relationship level gates content and sets ARIA's
//             whole register (>4 warm, >8 peer, >12 intimate). The world may
//             nudge a relationship; it may not fast-forward one.
//   heat      measured 18 in Acts I–II from n=3 — the deck barely touches heat
//             before the regulators exist, and neither should the world.
//   research  measured 140 in Act I from n=1, which is five free nodes at a
//             tier where they cost 4–30.
//   insight   the deck never takes it before Act III, so the Act I and II
//   users     ceilings on taking them are set by proportion rather than
//             measured — the alternative is a ceiling of zero, and a world
//             that cannot cost you a user is missing an obvious card.
//
// `influence` and the two product keys (`awareness`, `sentiment`) are not
// deck-derived: the event deck never spends fx.influence, and the other two
// belong to the thread vocabulary, so their ceilings come from `threads.js`
// (awareness 40–80, sentiment 0.01–0.03) with a little headroom.
export const WORLD_AUTHOR = {
  // ── Offering a slot ───────────────────────────────────────────────────────
  // The deck asks the world first and never waits: whichever of these two
  // elapses first, the authored card is drawn as it always was.
  SLOT_TIMEOUT_DAYS: 1.5,
  SLOT_TIMEOUT_REAL_S: 45,
  // A pending `wait_for_world` resolves on this heartbeat so the turn returns
  // to the chat on its own. Must sit below the client's own tool timeout —
  // measure it on the platform before trusting this number (docs/DAY0.md).
  WAIT_HEARTBEAT_S: 60,
  PRESENCE_TIMEOUT_S: 600,      // silence this long and the world reverts to the deck

  // ── Rate limits, in in-game days ──────────────────────────────────────────
  CARD_WINDOW_DAYS: 10, MAX_CARDS_PER_WINDOW: 2,
  MAX_POSTS_PER_DAY: 3, MIN_DAYS_BETWEEN_POSTS: 0.25,
  SHOCK_WINDOW_DAYS: 30, MAX_SHOCKS_PER_WINDOW: 1,
  MAX_ARIA_LINES_PER_DAY: 6,
  MAX_ADVANCE_DAYS: 30,

  // ── Copy limits, in characters ────────────────────────────────────────────
  TITLE_MAX: 48, BODY_MAX: 900, LABEL_MAX: 72, SUB_MAX: 90, OUTCOME_MAX: 420,
  POST_MAX: 240, LINE_MAX: 240, SPOT_MAX: 240,
  CHOICES_MIN: 2, CHOICES_MAX: 4,

  // ── Per-act ceilings on a single choice's effects ─────────────────────────
  // Split by direction, because the deck is. `tools/capsderive.mjs` separates
  // what the 715 authored choices *take* from what they *give*, and they are
  // not the same shape at all: in Act I the written game takes 30 code and
  // gives 90, takes no users and gives 600. Deriving a ceiling on damage from
  // the size of the game's own rewards was the first version of this table, and
  // measured, it let the world hold every run in Act I or II for 1,800 days.
  //
  // TAKE is the p80 of what the deck takes. GIVE is the p80 of what it gives.
  // For `heat` and `debt`, taking means raising and giving means lowering.
  TAKE: {
    1: { cash: 6000,   rep: 30,  insight: 8,  code: 30,  focus: 15, users: 200,
         align: 0.05, heat: 5,  opinion: 0.04, debt: 30, research: 10,   influence: 0,
         awareness: 20,  sentiment: 0.03, affinity: 2 },
    2: { cash: 6000,   rep: 70,  insight: 15, code: 70,  focus: 16, users: 800,
         align: 0.06, heat: 8,  opinion: 0.08, debt: 30, research: 40,   influence: 0,
         awareness: 50,  sentiment: 0.04, affinity: 2 },
    3: { cash: 2.4e6,  rep: 70,  insight: 40, code: 90,  focus: 20, users: 7e4,
         align: 0.07, heat: 20, opinion: 0.10, debt: 50, research: 60,   influence: 8,
         awareness: 120, sentiment: 0.05, affinity: 3 },
    4: { cash: 8e9,    rep: 100, insight: 40, code: 120, focus: 22, users: 1.3e7,
         align: 0.08, heat: 24, opinion: 0.12, debt: 50, research: 300,  influence: 25,
         awareness: 250, sentiment: 0.05, affinity: 3 },
    5: { cash: 1.6e11, rep: 120, insight: 60, code: 90,  focus: 30, users: 5e8,
         align: 0.08, heat: 24, opinion: 0.16, debt: 50, research: 1500, influence: 50,
         awareness: 350, sentiment: 0.05, affinity: 3 },
  },
  GIVE: {
    1: { cash: 18000,  rep: 38,  insight: 22,  code: 90,  focus: 25, users: 600,
         align: 0.05, heat: 14, opinion: 0.05, debt: 18,  research: 20,   influence: 0,
         awareness: 25,  sentiment: 0.04, affinity: 2 },
    2: { cash: 100000, rep: 45,  insight: 30,  code: 120, focus: 30, users: 840,
         align: 0.06, heat: 14, opinion: 0.05, debt: 150, research: 60,   influence: 0,
         awareness: 60,  sentiment: 0.05, affinity: 2 },
    3: { cash: 1.4e8,  rep: 70,  insight: 48,  code: 240, focus: 45, users: 3.5e5,
         align: 0.07, heat: 14, opinion: 0.09, debt: 250, research: 400,  influence: 10,
         awareness: 150, sentiment: 0.06, affinity: 3 },
    4: { cash: 1e12,   rep: 140, insight: 120, code: 320, focus: 60, users: 1.3e8,
         align: 0.08, heat: 25, opinion: 0.12, debt: 50,  research: 900,  influence: 30,
         awareness: 300, sentiment: 0.06, affinity: 3 },
    5: { cash: 1.1e13, rep: 250, insight: 400, code: 320, focus: 50, users: 1.6e9,
         align: 0.08, heat: 30, opinion: 0.16, debt: 50,  research: 3000, influence: 60,
         awareness: 400, sentiment: 0.06, affinity: 3 },
  },

  // Kept as the union of the two, for anything that wants "is this key in play
  // at all this act" without caring which way it points.
  get CAPS() {
    if (!this._caps) {
      this._caps = {};
      for (const act of [1, 2, 3, 4, 5]) {
        this._caps[act] = {};
        for (const k of Object.keys(this.GIVE[act])) {
          this._caps[act][k] = Math.max(this.TAKE[act][k] || 0, this.GIVE[act][k] || 0);
        }
      }
    }
    return this._caps;
  },

  // The world can hurt you; it cannot end you — and that has to be true of a
  // hundred cards in a row, not just of one.
  //
  // Measured: with only a per-card share, an assistant spending every ceiling
  // at every slot bankrupted 9 runs out of 9 by around day 135. Two cards a
  // fortnight at a quarter of the cash each is a compounding drain no company
  // survives, and the promise was false. Three bounds now hold it up, and
  // `evals/capsfuzz.mjs` plays the worst legal world to prove it:
  //
  //   the per-card share   no one card takes a fifth of what is in the bank
  //   the runway floor     no card leaves the company inside 45 days of runway
  //                        — and once it is already inside that, the world may
  //                        not take money at all. Whatever kills a run, it is
  //                        not going to be the assistant.
  //   the rolling drain    across any 30 days the world may take a third of the
  //                        cash it found there, however many cards that is
  CASH_SHARE_MAX: 0.20,
  RUNWAY_FLOOR_DAYS: 45,
  DRAIN_WINDOW_DAYS: 30,
  DRAIN_SHARE: 0.33,

  // And the same idea for everything that is not money. A per-card ceiling says
  // no single card is an outlier; it does not stop the world being a tax.
  //
  // Measured again with only the cash bounds in place: nothing went bankrupt,
  // and nothing got anywhere either — the worst legal world held every run in
  // Act I or II for 1,800 days by taking the maximum reputation, code, focus
  // and users at every slot, for ever. The authored deck is not like that; it
  // is mixed, and its bad cards are paid for by its good ones. So the world
  // gets a budget per resource per window, worth a couple of maximal cards, and
  // spends it on the ones that should land hardest.
  //
  // A refusal here is a good refusal: it says how much has been taken and when
  // the budget comes back, which is a thing an assistant can plan around.
  WINDOW_MULT: 2.5,

  // And for anything that is a *stock* — reputation, users, code, research —
  // the budget is a share of what the founder actually has, not a flat number.
  //
  // This is the cash rule generalised, and measured, it is the one that mattered
  // most. Seventy-five reputation is fatal to a company that has sixty and
  // beneath notice for one that has three thousand; a flat allowance took the
  // same seventy-five from both, and pushed Act II from day 115 to day 925.
  // The deck can afford absolute numbers because the deck is mixed and knows
  // where in the story it is. An assistant spending every ceiling at every slot
  // is neither, so the bound it plays against is proportional.
  STOCK_SHARE: 0.22,
  STOCK_KEYS: ['rep', 'code', 'insight', 'research', 'influence', 'users', 'awareness'],
  // Below this, a stock is too small to take a share of at all — otherwise a
  // company with four reputation is bled by rounding.
  STOCK_FLOOR: { rep: 40, code: 60, insight: 25, research: 60, influence: 10,
                 users: 500, awareness: 60 },

  // Tone scales the ceiling. A card that announces its own cruelty may cut
  // deeper than one that reads as neutral — the button colour is a promise.
  TONE_CAP_MULT: { neutral: 0.6, good: 1.0, risky: 1.0, cruel: 1.2, costly: 1.2 },

  // Held directives narrow the world's hand.
  FORTIFY_CAP_MULT: 0.8,

  // No card may be uniformly adverse on any of these: at least one choice must
  // leave each of them alone or improve it. A dilemma is two different costs,
  // not the same cost four times.
  PROTECTED: ['align', 'opinion', 'rep'],

  // Market weather.
  SHOCK_DAYS_MIN: 20, SHOCK_DAYS_MAX: 90,

  // Characters the world may voice before the founder has met them, once there
  // is a product in the world for them to have an opinion about.
  ALWAYS_AVAILABLE: ['sam', 'priya'],

  // Characters the world never speaks for. ARIA is the founder's own agent and
  // has her own tool, with its own rate and its own framing; Mom is not the
  // world's to use. HELIX is not here on purpose — it becomes voiceable the day
  // it is built, and `validate.js` holds that gate.
  NEVER_VOICED: ['aria', 'mom'],

  // Chrome truncates a tool result at roughly 1,500 characters of
  // `JSON.stringify` of the whole payload — every key name and every escaped
  // newline included. Budget under it and keep the headroom.
  RESULT_BUDGET: 1400,
};
