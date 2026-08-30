// ─────────────────────────────────────────────────────────────────────────────
// INCIDENTS — the world hitting back. Small, frequent, mechanically real.
// ─────────────────────────────────────────────────────────────────────────────
import { WORLD, INCIDENTS as BALANCE } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { totalUsers } from './product.js';
import { rand, chance, pick, randRange } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { pushFeed } from './feed.js';

const INCIDENTS = [
  { id: 'regression', name: 'Silent Regression', min: 0, sev: BALANCE.REGRESSION_SEVERITY,
    text: 'A change from six days ago has been quietly corrupting a fraction of writes.',
    apply: (S, sev) => { const p = active(S); if (p) {
      p.reliability -= BALANCE.REGRESSION_RELIABILITY * sev;
      p.sentiment -= BALANCE.REGRESSION_SENTIMENT * sev;
    } S.resources.techDebt += BALANCE.REGRESSION_DEBT * sev; } },
  { id: 'hallucination', name: 'Hallucinated Dependency', min: 0,
    sev: BALANCE.HALLUCINATION_SEVERITY,
    text: 'An agent imported a package that does not exist. It has existed in the codebase for four days.',
    apply: (S, sev) => {
      S.resources.code = Math.max(0, S.resources.code - BALANCE.HALLUCINATION_CODE * sev);
      S.resources.techDebt += BALANCE.HALLUCINATION_DEBT * sev;
    } },
  { id: 'cost_spike', name: 'Compute Bill Spike', min: 0, sev: BALANCE.COST_SPIKE_SEVERITY,
    text: 'A retry loop ran unbounded overnight. The invoice is a work of art.',
    apply: (S, sev) => { S.company.cash -= Math.max(BALANCE.COST_SPIKE_MIN,
      S.company.cash * BALANCE.COST_SPIKE_SHARE * sev); } },
  { id: 'churn_wave', name: 'Churn Wave', min: BALANCE.CHURN_WAVE_USERS,
    sev: BALANCE.CHURN_WAVE_SEVERITY,
    text: 'A competitor ran a migration campaign. It worked.',
    apply: (S, sev) => { const p = active(S);
      if (p) p.users *= 1 - BALANCE.CHURN_WAVE_SHARE * sev; } },
  { id: 'breach', name: 'Security Incident', min: BALANCE.BREACH_USERS,
    sev: BALANCE.BREACH_SEVERITY,
    text: 'An exposed key. Nine hours of access. You do not yet know what was taken.',
    apply: (S, sev) => { const p = active(S); if (p) {
      p.users *= 1 - BALANCE.BREACH_USER_SHARE * sev;
      p.sentiment -= BALANCE.BREACH_SENTIMENT * sev;
    }
      S.resources.reputation *= 1 - BALANCE.BREACH_REP_SHARE * sev;
      S.world.regulatoryHeat += BALANCE.BREACH_HEAT * sev; } },
  { id: 'dependency', name: 'Upstream Outage', min: 0, sev: BALANCE.DEPENDENCY_SEVERITY,
    text: 'A provider you depend on went down. Your uptime is their uptime and you knew that.',
    apply: (S, sev) => { const p = active(S); if (p) {
      p.reliability -= BALANCE.DEPENDENCY_RELIABILITY * sev;
      p.sentiment -= BALANCE.DEPENDENCY_SENTIMENT * sev;
    } } },
  { id: 'agent_loop', name: 'Agent Loop', min: 0, sev: BALANCE.AGENT_LOOP_SEVERITY,
    text: 'Two agents assigned each other the same task and negotiated for eleven hours.',
    apply: (S, sev) => {
      S.resources.code = Math.max(0, S.resources.code - BALANCE.AGENT_LOOP_CODE * sev);
      S.company.cash -= BALANCE.AGENT_LOOP_CASH * sev;
    } },
  { id: 'bad_press', name: 'A Bad Piece', min: BALANCE.BAD_PRESS_USERS,
    sev: BALANCE.BAD_PRESS_SEVERITY,
    text: 'A journalist found something true and unflattering. It is accurate, which is the problem.',
    apply: (S, sev) => {
      S.resources.reputation *= 1 - BALANCE.BAD_PRESS_REP_SHARE * sev;
      S.world.publicOpinion -= BALANCE.BAD_PRESS_OPINION * sev;
    } },
  { id: 'poach', name: 'Model Deprecation', min: 0, sev: BALANCE.DEPRECATION_SEVERITY,
    text: 'A provider deprecated a model you depend on with 30 days notice.',
    apply: (S, sev) => { S.resources.techDebt += BALANCE.DEPRECATION_DEBT * sev; } },
  { id: 'lawsuit', name: 'Legal Action', min: BALANCE.LAWSUIT_USERS,
    sev: BALANCE.LAWSUIT_SEVERITY,
    text: 'A patent entity you have never heard of has heard a great deal about you.',
    apply: (S, sev) => {
      S.company.cash -= Math.max(BALANCE.LAWSUIT_MIN,
        S.company.cash * BALANCE.LAWSUIT_CASH_SHARE * sev);
      S.world.regulatoryHeat += BALANCE.LAWSUIT_HEAT * sev;
    } },
  { id: 'sabotage', name: 'Sabotage', min: BALANCE.SABOTAGE_USERS,
    sev: BALANCE.SABOTAGE_SEVERITY,
    text: 'Someone got inside. Not a script kiddie. Someone funded.',
    apply: (S, sev) => { if (S.agents.length > 1) {
      const a = pick(S.agents); a.morale *= BALANCE.SABOTAGE_MORALE_MULT;
    }
      S.resources.techDebt += BALANCE.SABOTAGE_DEBT * sev;
      S.company.cash -= BALANCE.SABOTAGE_CASH * sev; } },
];

function active(S) { return S.products.find((p) => p.id === S.activeProductId) || S.products.find((p) => p.launched); }

export function tickIncidents(S, days, sideIncidentMult = 1) {
  const m = computeMods(S);
  const p = active(S);
  if (!p || !p.launched) return null;
  const users = totalUsers(S);

  // Base rate scales with debt, reliability gap, scale.
  let rate = (BALANCE.BASE_RATE
    + S.resources.techDebt / BALANCE.DEBT_SCALE
    + Math.pow(Math.max(0, BALANCE.RELIABILITY_TARGET - p.reliability),
      BALANCE.RELIABILITY_POWER) * BALANCE.RELIABILITY_RATE
    + Math.log10(1 + users) * BALANCE.USER_RATE) * m.incidentChance * sideIncidentMult;
  // The doom clock is misalignment, scrutiny and distrust combined. The World
  // view says high values make catastrophes far more likely; this is the line
  // that makes that sentence true rather than decorative.
  const doom = (S.world.doomClock || 0) / 100;
  rate *= 1 + doom * WORLD.DOOM_INCIDENT_RATE;
  rate *= days;

  // Minimum spacing so incidents stay events, not weather.
  const since = S.time.day - (S.world.lastIncidentDay ?? -99);
  if (since < BALANCE.SPACING_DAYS) return null;
  if (!chance(rate * clamp((since - BALANCE.SPACING_DAYS) / BALANCE.SPACING_RAMP_DAYS,
    BALANCE.SPACING_MIN_MULT, BALANCE.SPACING_MAX_MULT))) return null;
  S.world.lastIncidentDay = S.time.day;

  const pool = INCIDENTS.filter((i) => users >= i.min);
  if (!pool.length) return null;
  const inc = pick(pool);
  let sev = inc.sev * randRange(BALANCE.SEVERITY_MIN, BALANCE.SEVERITY_MAX)
    * m.incidentSeverity * (1 + doom * WORLD.DOOM_INCIDENT_SEV);

  // Auto-resolution from self-healing systems
  if (m.incidentAuto && chance(m.incidentAuto)) {
    pushFeed(S, { type: 'log', author: 'ops', tone: 'neutral',
      text: `**${inc.name}** detected and auto-remediated. No action required.` });
    return null;
  }

  inc.apply(S, sev);
  S.stats.incidents++;
  pushFeed(S, { type: 'incident', author: 'INCIDENT', tone: 'bad',
    text: `**${inc.name}** — ${inc.text}`, meta: `severity ${(sev * 100).toFixed(0)}%` });
  emit('incident', { incident: inc, severity: sev });
  return inc;
}
