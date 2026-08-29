// ─────────────────────────────────────────────────────────────────────────────
// THE LOOP — real-time accumulator → in-game days → daily simulation pass.
// ─────────────────────────────────────────────────────────────────────────────
import { TIME, CODE, WORLD } from '../data/balance.js';
import { S } from './state.js';
import { emit } from './bus.js';
import { computeMods, markDirty } from '../systems/modifiers.js';
import { tickFounder, founderOutput, gainXp } from '../systems/founder.js';
import { tickProduct, totalUsers, totalMrr, featureCost, shipFeature } from '../systems/product.js';
import { tickEconomy, computeValuation, runwayDays } from '../systems/economy.js';
import { tickResearch } from '../systems/research.js';
import { tickMarket } from '../systems/market.js';
import { computeLaneOutput, tickAgentsDaily } from '../systems/agents.js';
import { tickProjects } from '../systems/projects.js';
import { clamp } from './format.js';

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
    if (now - lastAdvance < 400) return;      // rAF is doing its job
    advance(now);
    emit('frame', 0);
  }, 250);
}
export function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  clearInterval(watchdog); watchdog = null;
}

// Shared advance step, driven by whichever clock source got here first.
function advance(now) {
  const dtReal = Math.min(1.0, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  lastAdvance = now;
  // `toolBusy` is held for the duration of any mutating tool call. Without it
  // the clock advances underneath a card that is being written, and the card
  // arrives against a world one tick older than the one it was written for.
  // It lives here rather than on the state object because a save taken while
  // it was true would reload into a game whose clock never starts.
  if (!S || S.settings.paused || S.narrative.activeEvent || S.modalBlocking
      || S.tutorialHold || toolBusy) return dtReal;
  const speed = TIME.SPEEDS[clamp(S.settings.speed - 1, 0, TIME.SPEEDS.length - 1)] || 1;
  acc += dtReal * speed;
  S.meta.playSeconds += dtReal;
  const dayStep = 1 / TIME.DAY_SECONDS;
  let guard = 0;
  while (acc >= 1 / TIME.TICK_HZ && guard++ < 600) {
    acc -= 1 / TIME.TICK_HZ;
    simulate(dayStep / TIME.TICK_HZ);
  }
  if (guard >= 600) acc = 0;   // never let a long stall queue up unbounded work
  return dtReal;
}

function frame(now) {
  if (!running) return;
  const dtReal = advance(now);
  emit('frame', dtReal);
  rafId = requestAnimationFrame(frame);
}

// Advance the world by `days` (fractional). Also used for offline catch-up.
export function simulate(days, opts = {}) {
  if (!S || days <= 0) return;
  const m = computeMods(S);
  const prevDay = Math.floor(S.time.day);
  S.time.day += days;
  S.time.hourOfDay = (S.time.day % 1) * 24;

  // ── Continuous flows ──────────────────────────────────────────────────────
  const fo = tickFounder(S, days, m);
  const { out: lanes, side } = computeLaneOutput(S, m);

  const codeGain = (fo.code + lanes.build * CODE.AGENT_CODE_MULT) * days;
  S.resources.code += codeGain;
  S.resources.insight += (fo.insight + side.insight + lanes.growth * 0.10) * days;
  S.resources.reputation += (fo.reputation + side.rep + lanes.growth * 0.055) * days;

  // Tech debt from agents; ops pays it down
  const debtGain = side.debt * days;
  const debtPaid = (lanes.ops * 0.62 + m['+debtDecay']) * days;
  S.resources.techDebt = clamp(S.resources.techDebt + debtGain - debtPaid, 0, m.debtCap);

  // Ops raises the reliability the system tends toward, rather than patching it directly.
  const prod = S.products.find((p) => p.id === S.activeProductId) || S.products[0];
  S._opsRelBonus = Math.min(0.30, Math.sqrt(Math.max(0, lanes.ops)) * 0.030);
  // Growth lane feeds awareness
  if (prod) prod.awareness += (fo.awareness + lanes.growth * 1.9) * days * m.userMult;

  // Compute & data. Self-replicating fabs compound multiplicatively over time.
  if (S.unlocks.compute) {
    if (m.computeCompound) {
      S.resources.computeGrowth = Math.min(4e5,
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
  S.resources.data += (m['+dataRate'] + totalUsers(S) * 0.00008) * days;
  if (S.unlocks.influence) S.resources.influence += (m['+influenceRate'] + S.resources.reputation * 0.0015) * days;

  // Alignment drift
  const alignTarget = clamp(0.5 + (S.research.done.constitutional_ai ? 0.25 : 0)
    + (S.research.done.interpretability ? 0.15 : 0) - avgAutonomy(S) * 0.35, 0, 1);
  if (m.directiveAlign) S.resources.alignment = clamp(S.resources.alignment + m.directiveAlign * days, 0, 1);
  S.resources.alignment = Math.max(m.alignFloor,
    clamp(S.resources.alignment + ((alignTarget - S.resources.alignment) * 0.02 + side.alignDelta) * days, 0, 1));

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
      gainXp(S, 4 + prod.features.length * 0.5);
    }
  }

  for (const fn of hooks.onTick) fn(S, days);

  // ── Day boundary ──────────────────────────────────────────────────────────
  const newDay = Math.floor(S.time.day);
  let guard = 0;
  while (newDay > S.time.lastDayProcessed && guard++ < 3000) {
    S.time.lastDayProcessed++;
    onDayBoundary(S, S.time.lastDayProcessed, m);
  }

  S.company.valuation = computeValuation(S, m);
  S.stats.peakValuation = Math.max(S.stats.peakValuation, S.company.valuation);
  S.stats.peakMrr = Math.max(S.stats.peakMrr, totalMrr(S));
}

// No company can bill more than the world economy contains. Revenue asymptotes
// toward a share of global GDP rather than growing without limit.
function applyEconomicSaturation(S) {
  const gdp = WORLD.GDP_2027 * Math.pow(1 + WORLD.GDP_GROWTH, S.time.day / 360);
  const capMonthly = gdp * 0.034 / 12;
  let total = 0;
  for (const p of S.products) if (p.launched) total += p.mrr;
  if (total <= 0) return;
  const damped = total / (1 + total / capMonthly);
  if (damped >= total) return;
  const k = damped / total;
  for (const p of S.products) if (p.launched) p.mrr *= k;
}

function avgAutonomy(S) {
  if (!S.agents.length) return 0;
  return S.agents.reduce((a, x) => a + (x.autonomy || 0), 0) / S.agents.length;
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
    S.company.arc.push({
      d: day,
      u: Math.round(totalUsers(S)),
      r: Math.round(totalMrr(S)),
      v: Math.round(S.company.valuation),
      a: S.company.act,
    });
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
    const pay = S.company.debtOwed * 0.0012;
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
  if (elapsedSec < 45) return null;
  if (computeMods(S).noOffline) return null;   // One Take: nothing happens while you are away
  const hours = Math.min(elapsedSec / 3600, TIME.MAX_OFFLINE_HOURS);
  const days = TIME.MAX_OFFLINE_DAYS * (1 - Math.exp(-hours / TIME.OFFLINE_HALFLIFE_H));
  if (days < 0.5) return null;
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
  while (remaining > 0 && guard++ < 4000) {
    const step = Math.min(0.25, remaining);
    simulate(step, { offline: true });
    remaining -= step;
  }
  // Everything the world did while the tab was shut, so coming back is a
  // briefing rather than four numbers.
  const fresh = S.feed.filter((f) => f.id >= before.feedSeq);
  return {
    days, seconds: capped,
    from: Math.floor(before.day), to: Math.floor(S.time.day),
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
