// ─────────────────────────────────────────────────────────────────────────────
// THE LOOP — real-time accumulator → in-game days → daily simulation pass.
// ─────────────────────────────────────────────────────────────────────────────
import { TIME, CODE, WORLD, FLOWS, LONG, PRODUCT, AGENTS, ECON } from '../data/balance.js';
import { FEATURE_KINDS } from '../data/products.js';
import { weightedPick } from './rng.js';
import { S } from './state.js';
import { emit } from './bus.js';
import { computeMods, markDirty } from '../systems/modifiers.js';
import { tickFounder, founderOutput, gainXp } from '../systems/founder.js';
import { tickProduct, totalUsers, totalMrr, featureCost, shipFeature,
         gdpSaturation } from '../systems/product.js';
import { tickEconomy, computeValuation, runwayDays, expenseBreakdown,
         marketingAwareness, infraEffect } from '../systems/economy.js';
import { tickResearch } from '../systems/research.js';
import { tickMarket } from '../systems/market.js';
import { computeLaneOutput, tickAgentsDaily } from '../systems/agents.js';
import { alignmentTarget } from '../systems/alignment.js';
import { tickProjects } from '../systems/projects.js';
import { clamp } from './format.js';

const ECON_INFRA_CAP = ECON.INFRA_RELIABILITY_CAP;

let acc = 0;
let running = false;
let lastFrame = 0;
let rafId = null;
let watchdog = null;
let lastAdvance = 0;
let toolBusy = false;

// Held while an assistant's tool call is mutating the world. Transient by
// design: never written to the state object, never saved.
export function setToolBusy(v) { toolBusy = !!v; }
export function isToolBusy() { return toolBusy; }

export const hooks = {
  onDay: [],        // (S, day) => void   — runs once per whole in-game day
  onTick: [],       // (S, dtDays) => void
};

export function addDayHook(fn) { hooks.onDay.push(fn); }
export function addTickHook(fn) { hooks.onTick.push(fn); }

export function start() {
  if (running) return;
  running = true;
  if (S) S.meta.realtime = true;   // the real-time event floor only applies here
  lastFrame = performance.now();
  lastAdvance = lastFrame;
  rafId = requestAnimationFrame(frame);
  // Watchdog: browsers throttle (or stop) rAF in background tabs and low-power
  // modes. A timer keeps the simulation honest using wall-clock time, so a
  // backgrounded tab keeps playing instead of silently freezing.
  clearInterval(watchdog);
  watchdog = setInterval(() => {
    if (!running) return;
    const now = performance.now();
    if (now - lastAdvance < TIME.WATCHDOG_IDLE_MS) return; // rAF is doing its job
    safeAdvance(now);
    emit('frame', 0);
  }, TIME.WATCHDOG_INTERVAL_MS);
}
export function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  clearInterval(watchdog); watchdog = null;
}

// Shared advance step, driven by whichever clock source got here first.
function advance(now) {
  const gapReal = Math.max(0, (now - lastFrame) / 1000);
  const dtReal = Math.min(TIME.MAX_FRAME_DT_S, gapReal);
  lastFrame = now;
  lastAdvance = now;
  // `toolBusy` is held for the duration of any mutating tool call. Without it
  // the clock advances underneath a card that is being written, and the card
  // arrives against a world one tick older than the one it was written for.
  // It lives here rather than on the state object because a save taken while
  // it was true would reload into a game whose clock never starts.
  if (advanceBlocked()) return dtReal;
  const speed = TIME.SPEEDS[clamp(S.settings.speed - 1, 0, TIME.SPEEDS.length - 1)] || 1;
  if (gapReal > TIME.WAKE_GAP_S) {
    let remaining = Math.min(gapReal, TIME.MAX_WAKE_CATCHUP_S) * speed / TIME.DAY_SECONDS;
    while (remaining > 0 && !advanceBlocked()) {
      const step = Math.min(TIME.WAKE_CHUNK_DAYS, remaining);
      simulate(step);
      S.meta.playSeconds += step * TIME.DAY_SECONDS / speed;
      remaining -= step;
    }
    return dtReal;
  }
  acc += dtReal * speed;
  S.meta.playSeconds += dtReal;
  const dayStep = 1 / TIME.DAY_SECONDS;
  let guard = 0;
  while (acc >= 1 / TIME.TICK_HZ && guard++ < TIME.MAX_TICKS_PER_ADVANCE) {
    acc -= 1 / TIME.TICK_HZ;
    simulate(dayStep / TIME.TICK_HZ);
  }
  if (guard >= TIME.MAX_TICKS_PER_ADVANCE) acc = 0; // never queue unbounded work
  return dtReal;
}

function advanceBlocked() {
  // An open call holds the clock the way an open card does: it is a decision
  // in progress, and the person on the line does not age while you think.
  return !S || S.settings.paused || S.narrative.activeEvent || S.modalBlocking
    || S.tutorialHold || toolBusy || !!S.calls?.active || longHeld();
}

// ── The long game ───────────────────────────────────────────────────────────
// A month of the company for a real day. Live play is metered against the
// calendar date: once today's allowance is spent the clock holds and says so,
// once, and the founder may override it for the rest of the day.
const dayKey = () => new Date().toISOString().slice(0, 10);
export function longState(S) {
  if (!S.longGame) S.longGame = { dayKey: '', liveDays: 0, override: false };
  const L = S.longGame;
  const k = dayKey();
  if (L.dayKey !== k) { L.dayKey = k; L.liveDays = 0; L.override = false; heldSaid = false; }
  return L;
}
let heldSaid = false;
export function longHeld() {
  if (!S || S.settings?.pace !== 'long') return false;
  const L = longState(S);
  if (L.override) return false;
  const held = L.liveDays >= LONG.LIVE_DAYS_PER_DAY;
  if (held && !heldSaid) { heldSaid = true; emit('long:held', { liveDays: L.liveDays }); }
  return held;
}
export function longOverride(S) { longState(S).override = true; heldSaid = false; }
export function longAllowance(S) {
  const L = longState(S);
  return { used: L.liveDays, of: LONG.LIVE_DAYS_PER_DAY, left: Math.max(0, LONG.LIVE_DAYS_PER_DAY - L.liveDays), override: !!L.override };
}

// A throw inside a tick used to end the game: the rAF was re-armed after the
// call that threw, so the loop simply stopped, and the watchdog threw the same
// way every 250ms. The frame survives it now, and says so once per message.
let lastTickError = '';
function safeAdvance(now) {
  try { return advance(now); }
  catch (e) {
    const msg = String(e?.message || e);
    if (msg !== lastTickError) { lastTickError = msg; console.error('[tick]', e); }
    lastFrame = now; lastAdvance = now;
    return 0;
  }
}

function frame(now) {
  if (!running) return;
  try { emit('frame', safeAdvance(now)); }
  finally { if (running) rafId = requestAnimationFrame(frame); }
}

// Advance the world by `days` (fractional). Also used for offline catch-up.
export function simulate(days, opts = {}) {
  if (!S || days <= 0) return;
  if (!opts.offline && S.settings?.pace === 'long' && S.meta?.realtime) longState(S).liveDays += days;
  const m = computeMods(S);
  const prevDay = Math.floor(S.time.day);
  S.time.day += days;
  S.time.hourOfDay = (S.time.day % 1) * 24;

  // ── Continuous flows ──────────────────────────────────────────────────────
  const fo = tickFounder(S, days, m);
  const laneOutput = computeLaneOutput(S, m);
  const { out: lanes, side } = laneOutput;
  // What the specialties are doing today, for the systems and views that need
  // it without recomputing the roster (which draws from the RNG). Transient:
  // `save.js` strips it and the accessor in agents.js supplies the defaults.
  // `debt` and `alignDelta` ride along for the Today ledger and the alignment
  // "why" panel: both want what the roster did today and neither may recompute
  // the roster, because that draws.
  S._specFx = { heatDecay: side.heatDecay, opCost: side.opCost, salesConv: side.salesConv,
    salesEnterprise: side.salesEnterprise, polish: side.polish, appeal: side.appeal,
    intel: side.intel, aggression: side.aggression,
    debt: side.debt, alignDelta: side.alignDelta };
  // What each lane produced today. `researchSpendPerDay` needs the research
  // lane and is called from `expenseBreakdown`, which the Market view renders —
  // and recomputing the roster there would draw from the RNG. Transient, like
  // `_specFx`, and stripped by `save.js` for the same reason.
  S._lanes = { ...lanes };

  const codeGain = (fo.code + lanes.build * CODE.AGENT_CODE_MULT) * days;
  S.resources.code += codeGain;
  // Code an autonomous agent wrote for its own reasons. It banks separately and
  // ships below as a feature nobody asked for, once there is enough of it.
  if (side.selfBuild > 0) S.resources.skunkworks = (S.resources.skunkworks || 0) + side.selfBuild * CODE.AGENT_CODE_MULT * days;
  S.resources.insight += (fo.insight + side.insight + lanes.growth * FLOWS.GROWTH_INSIGHT_PER_WORK) * days;
  S.resources.reputation += (fo.reputation + side.rep + lanes.growth * FLOWS.GROWTH_REP_PER_WORK) * days;

  // Tech debt from agents; ops pays it down
  const debtGain = side.debt * days;
  const debtPaid = (lanes.ops * FLOWS.OPS_DEBT_PER_WORK + m['+debtDecay']) * days;
  S.resources.techDebt = clamp(S.resources.techDebt + debtGain - debtPaid, 0, m.debtCap);

  // Ops raises the reliability the system tends toward, rather than patching it directly.
  const prod = S.products.find((p) => p.id === S.activeProductId) || S.products[0];
  S._opsRelBonus = Math.min(FLOWS.OPS_RELIABILITY_CAP,
    Math.sqrt(Math.max(0, lanes.ops)) * FLOWS.OPS_RELIABILITY_SCALE);
  // §A17: the infra dial, measured against the bill it is topping up, so
  // "match your infrastructure spend" is half the effect at every scale. It
  // buys the reliability equilibrium and quiets the incident roll, and both
  // are read from here rather than recomputed — this is the only place the
  // base bill is known without calling `expenseBreakdown` twice a frame.
  {
    const e = expenseBreakdown(S, m);
    const base = e.hosting + e.serving + e.compute + e.upkeep;
    const eff = infraEffect(S, base);
    S._infraEffect = eff;
    S._infraRelBonus = eff * ECON_INFRA_CAP;
  }
  // Growth lane feeds awareness — and, since §A17, so does the marketing dial.
  if (prod) prod.awareness += (fo.awareness + lanes.growth * FLOWS.GROWTH_AWARENESS_PER_WORK
    + marketingAwareness(S, m)) * days * m.userMult;
  // Design agents raise polish and appeal a little every day, toward a ceiling:
  // the gain shrinks with the gap to the cap, so a roster of them cannot push
  // either meter past where features could. Features are not capped here.
  if (prod && (side.polish || side.appeal)) {
    const SP = AGENTS.SPEC;
    prod.polish += side.polish * days * Math.max(0, 1 - prod.polish / SP.DESIGN_POLISH_CAP);
    prod.appeal += side.appeal * days * Math.max(0, 1 - prod.appeal / SP.DESIGN_APPEAL_CAP);
  }

  // Compute & data. Self-replicating fabs compound multiplicatively over time.
  if (S.unlocks.compute) {
    if (m.computeCompound) {
      S.resources.computeGrowth = Math.min(FLOWS.COMPUTE_GROWTH_CAP,
        (S.resources.computeGrowth || 1) * Math.pow(1 + m.computeCompound, days));
    }
    S.resources.computeCap = Math.max(0,
      (m['+computeCap'] + (S.resources.computeGranted || 0))
      * m.computeCapMult * (S.resources.computeScale || 1) * (S.resources.computeGrowth || 1));
    S.resources.compute = S.resources.computeCap;
  }
  if (S.unlocks.energy) {
    S.resources.energyCap = Math.max(0,
      (m['+energyCap'] + (S.resources.energyGranted || 0))
      * m.energyCapMult * (S.resources.energyScale || 1));
  }
  S.resources.data += (m['+dataRate'] + totalUsers(S) * FLOWS.DATA_PER_USER_DAY) * days;
  if (S.unlocks.influence) S.resources.influence += (m['+influenceRate']
    + S.resources.reputation * FLOWS.INFLUENCE_PER_REP_DAY) * days;

  // Alignment drift. `m['+alignment']` is every promise of "+alignment" — the
  // interpretability node's 0.15 and the Aligned By Default perk's 0.1 a level
  // — added to the equilibrium the number settles toward, not just bumped once
  // at the start and then drifted away from.
  // The equilibrium itself lives in `systems/alignment.js`, so the World view's
  // "why" panel reads the same arithmetic the sim runs rather than a copy of it.
  const alignTarget = alignmentTarget(S, m);
  if (m.directiveAlign) S.resources.alignment = clamp(S.resources.alignment + m.directiveAlign * days, 0, 1);
  S.resources.alignment = Math.max(m.alignFloor,
    clamp(S.resources.alignment + ((alignTarget - S.resources.alignment)
      * FLOWS.ALIGN_CONVERGENCE_PER_DAY + side.alignDelta) * days, 0, 1));

  // Products
  for (const p of S.products) tickProduct(S, p, days, m);
  applyEconomicSaturation(S);

  // Economy
  tickEconomy(S, days, m);

  // Research
  const done = tickResearch(S, days, lanes.research, m);

  // Market & megaprojects
  tickMarket(S, days, m);
  tickProjects(S, days);
  if (m.polishPerDay && prod) prod.polish += m.polishPerDay * days;

  if (opts.offline) S._offline = true; else delete S._offline;

  // Auto-ship features when enough code has accumulated (build lane automation)
  if (prod && S.unlocks.autoShip !== false) {
    const cost = featureCost(S, prod);
    if (S.resources.code >= cost && (S.settings.autoShip ?? true)) {
      S.resources.code -= cost;
      shipFeature(S, prod);
      gainXp(S, FLOWS.AUTO_SHIP_XP_BASE + prod.features.length * FLOWS.AUTO_SHIP_XP_PER_FEATURE);
    }
  }
  // The skunkworks ships itself. An autonomous build agent's self-directed code
  // becomes a feature of a kind it chose, at a fit discount, whether or not
  // auto-ship is on — nobody asked, so nobody gets to hold it.
  if (prod && (S.resources.skunkworks || 0) >= featureCost(S, prod)) {
    S.resources.skunkworks -= featureCost(S, prod);
    const kinds = Object.keys(AGENTS.SELF_DIRECT_KINDS);
    const kindId = weightedPick(kinds, kinds.map((k) => AGENTS.SELF_DIRECT_KINDS[k]));
    const kind = FEATURE_KINDS.find((k) => k.id === kindId) || FEATURE_KINDS[0];
    const author = S.agents.find((a) => a.status === 'active' && a.lane === 'build'
      && (a.autonomy ?? 0.5) > AGENTS.AUTONOMY_SELF_DIRECT) || null;
    const f = shipFeature(S, prod, { kind, mult: AGENTS.SELF_DIRECT_FIT_MULT,
      // The skunkworks knows whose idea it was; §B11's default would credit
      // whoever built the most today, which is a different question.
      by: author ? { id: author.id, name: author.name } : null });
    emit('feature:selfShipped', { product: prod, feature: f, agent: author });
  }

  for (const fn of hooks.onTick) fn(S, days);

  // ── Day boundary ──────────────────────────────────────────────────────────
  const newDay = Math.floor(S.time.day);
  let guard = 0;
  while (newDay > S.time.lastDayProcessed && guard++ < TIME.MAX_DAY_BOUNDARIES) {
    S.time.lastDayProcessed++;
    onDayBoundary(S, S.time.lastDayProcessed, m);
  }

  S.company.valuation = computeValuation(S, m);
  S.stats.peakValuation = Math.max(S.stats.peakValuation, S.company.valuation);
  S.stats.peakMrr = Math.max(S.stats.peakMrr, totalMrr(S));
}

// No company can bill more than the world economy contains. Revenue asymptotes
// toward a share of global GDP rather than growing without limit.
// §B3. The slow killers had no history anywhere: alignment, heat, approval,
// debt, burnout, morale and the race are the four hundred days a player loses
// to and there was nothing on any screen that said which way any of them had
// been going. The arc is the instrument that was already here — one sample
// every ten days, 400 of them, thinned by half when it fills, so a whole run
// costs the same as a fortnight — and these ride in it.
//
// Keys are short because 400 of these are serialised into every save, and
// every one of them is optional: a save written before this reads back with
// them missing, and `arcSeries` drops the samples that have no value rather
// than plotting a zero that never happened.
function arcSample(S, day) {
  const race = S.world.race;
  let rival = null;
  if (race?.labs) {
    for (const l of Object.values(race.labs)) {
      if (l?.alive && (rival == null || l.progress > rival)) rival = l.progress;
    }
  }
  let morale = null;
  if (S.agents.length) {
    let sum = 0, n = 0;
    for (const a of S.agents) { if (a.status === 'active') { sum += a.morale || 0; n++; } }
    if (n) morale = round3(sum / n);
  }
  return {
    d: day,
    u: Math.round(totalUsers(S)),
    r: Math.round(totalMrr(S)),
    v: Math.round(S.company.valuation),
    a: S.company.act,
    c: Math.round(S.company.cash),
    dt: Math.round(S.company.debtOwed || 0),
    td: Math.round(S.resources.techDebt || 0),
    al: round3(S.resources.alignment),
    ht: Math.round(S.world.regulatoryHeat || 0),
    ap: round3(S.world.publicOpinion ?? 0.5),
    bo: Math.round(S.founder.burnout || 0),
    ...(morale != null ? { mo: morale } : {}),
    ...(race ? { rc: round1(race.you || 0), rv: rival == null ? 0 : round1(rival) } : {}),
  };
}
const round3 = (v) => Math.round((Number(v) || 0) * 1000) / 1000;
const round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;

// The curve itself is `gdpSaturation` in `systems/product.js`, so the ceiling
// the Product view prints is the ceiling that is applied (§B2).
function applyEconomicSaturation(S) {
  const g = gdpSaturation(S);
  if (g.total <= 0 || g.damped >= g.total) return;
  for (const p of S.products) if (p.launched) p.mrr *= g.k;
}

function onDayBoundary(S, day, m) {
  S.stats.daysSurvived = day;
  const agentEvents = tickAgentsDaily(S, m);
  for (const ev of agentEvents) emit('agent:' + ev.type, ev);

  // History for charts (sampled)
  if (day % 2 === 0) {
    const push = (arr, v) => { arr.push(v); if (arr.length > 400) arr.shift(); };
    push(S.company.revenueHistory, totalMrr(S));
    push(S.company.userHistory, totalUsers(S));
    push(S.company.valuationHistory, S.company.valuation);
    push(S.company.cashHistory, S.company.cash);
  }
  // The arc: a coarse record that never loses the beginning. The sparkline
  // arrays above roll off after 800 days; this one covers a whole run in 400
  // samples, so the chart on the Story view can show day 1 next to day 1400.
  if (day % 10 === 0) {
    if (!S.company.arc) S.company.arc = [];
    S.company.arc.push(arcSample(S, day));
    if (S.company.arc.length > 400) S.company.arc = S.company.arc.filter((_, i) => i % 2 === 0);
  }
  // 30-day growth rate
  const rh = S.company.revenueHistory;
  if (rh.length > 15) {
    const then = rh[rh.length - 16] || 0;
    const now = rh[rh.length - 1] || 0;
    S.company.growthRate30 = then > 0 ? (now - then) / then : (now > 0 ? 1 : 0);
  }

  // Interest / debt service
  if (S.company.debtOwed > 0) {
    const pay = S.company.debtOwed * FLOWS.DEBT_SERVICE_DAILY;
    S.company.debtOwed -= pay;
    if (S.company.debtOwed < 1) S.company.debtOwed = 0;
  }

  for (const fn of hooks.onDay) fn(S, day);
  emit('day', day);
}

// Offline progress is a welcome-back gift, not a fast-forward. It saturates:
// an hour away is worth a lot, a week away is worth barely more than a night.
export function offlineCatchUp(S) {
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - (S.meta.lastRealTime || now)) / 1000);
  S.meta.lastRealTime = now;
  if (computeMods(S).noOffline) return null;   // One Take: nothing happens while you are away
  const long = S.settings?.pace === 'long';
  if (elapsedSec < (long ? LONG.MIN_SECONDS : TIME.OFFLINE_MIN_SECONDS)) return null;
  // The long game is linear, not saturating: a real day away is a month of the
  // company, up to two. The sitting game's gift curve is unchanged.
  const hours = Math.min(elapsedSec / 3600, TIME.MAX_OFFLINE_HOURS);
  const days = long
    ? Math.min(LONG.MAX_OFFLINE_DAYS, (elapsedSec / 86400) * LONG.DAYS_PER_REAL_DAY)
    : TIME.MAX_OFFLINE_DAYS * (1 - Math.exp(-hours / TIME.OFFLINE_HALFLIFE_H));
  if (days < TIME.OFFLINE_MIN_DAYS) return null;
  const capped = elapsedSec;
  const before = {
    cash: S.company.cash, users: totalUsers(S), mrr: totalMrr(S),
    research: S.stats.researchDone, features: S.stats.featuresShipped,
    valuation: S.company.valuation, day: S.time.day,
    incidents: S.stats.incidents, feedLen: S.feed.length, feedSeq: S.feedSeq,
  };
  // Simulate in chunks for stability
  let remaining = days;
  let guard = 0;
  while (remaining > 0 && guard++ < TIME.OFFLINE_MAX_CHUNKS) {
    const step = Math.min(TIME.OFFLINE_CHUNK_DAYS, remaining);
    simulate(step, { offline: true });
    remaining -= step;
  }
  // Everything the world did while the tab was shut, so coming back is a
  // briefing rather than four numbers.
  const fresh = S.feed.filter((f) => f.id >= before.feedSeq);
  return {
    days, seconds: capped, long,
    from: Math.floor(before.day), to: Math.floor(S.time.day),
    letters: S.feed.filter((f) => f.id >= before.feedSeq && f.type === 'mail').length,
    gained: {
      cash: S.company.cash - before.cash,
      users: totalUsers(S) - before.users,
      mrr: totalMrr(S) - before.mrr,
      valuation: S.company.valuation - before.valuation,
      research: S.stats.researchDone - before.research,
      features: S.stats.featuresShipped - before.features,
      incidents: S.stats.incidents - before.incidents,
    },
    waiting: S.feed.filter((f) => f.thread && !f.resolved).length,
    headlines: fresh
      .filter((f) => ['news', 'launch', 'incident', 'research', 'ship'].includes(f.type) || f.tone === 'bad')
      .slice(0, 5)
      .map((f) => ({ type: f.type, tone: f.tone || '', day: f.day, text: f.text, author: f.author || '' })),
  };
}
