// ─────────────────────────────────────────────────────────────────────────────
// INCIDENTS — the world hitting back. Small, frequent, mechanically real.
// ─────────────────────────────────────────────────────────────────────────────
import { WORLD } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { totalUsers } from './product.js';
import { rand, chance, pick, randRange } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { pushFeed } from './feed.js';

const INCIDENTS = [
  { id: 'regression', name: 'Silent Regression', min: 0, sev: 0.4,
    text: 'A change from six days ago has been quietly corrupting a fraction of writes.',
    apply: (S, sev) => { const p = active(S); if (p) { p.reliability -= 0.05 * sev; p.sentiment -= 0.05 * sev; } S.resources.techDebt += 12 * sev; } },
  { id: 'hallucination', name: 'Hallucinated Dependency', min: 0, sev: 0.3,
    text: 'An agent imported a package that does not exist. It has existed in the codebase for four days.',
    apply: (S, sev) => { S.resources.code = Math.max(0, S.resources.code - 25 * sev); S.resources.techDebt += 18 * sev; } },
  { id: 'cost_spike', name: 'Compute Bill Spike', min: 0, sev: 0.5,
    text: 'A retry loop ran unbounded overnight. The invoice is a work of art.',
    apply: (S, sev) => { S.company.cash -= Math.max(400, S.company.cash * 0.04 * sev); } },
  { id: 'churn_wave', name: 'Churn Wave', min: 2000, sev: 0.6,
    text: 'A competitor ran a migration campaign. It worked.',
    apply: (S, sev) => { const p = active(S); if (p) p.users *= 1 - 0.055 * sev; } },
  { id: 'breach', name: 'Security Incident', min: 5000, sev: 1.0,
    text: 'An exposed key. Nine hours of access. You do not yet know what was taken.',
    apply: (S, sev) => { const p = active(S); if (p) { p.users *= 1 - 0.09 * sev; p.sentiment -= 0.18 * sev; }
      S.resources.reputation *= 1 - 0.22 * sev; S.world.regulatoryHeat += 12 * sev; } },
  { id: 'dependency', name: 'Upstream Outage', min: 0, sev: 0.5,
    text: 'A provider you depend on went down. Your uptime is their uptime and you knew that.',
    apply: (S, sev) => { const p = active(S); if (p) { p.reliability -= 0.04 * sev; p.sentiment -= 0.06 * sev; } } },
  { id: 'agent_loop', name: 'Agent Loop', min: 0, sev: 0.45,
    text: 'Two agents assigned each other the same task and negotiated for eleven hours.',
    apply: (S, sev) => { S.resources.code = Math.max(0, S.resources.code - 30 * sev); S.company.cash -= 300 * sev; } },
  { id: 'bad_press', name: 'A Bad Piece', min: 1000, sev: 0.7,
    text: 'A journalist found something true and unflattering. It is accurate, which is the problem.',
    apply: (S, sev) => { S.resources.reputation *= 1 - 0.18 * sev; S.world.publicOpinion -= 0.04 * sev; } },
  { id: 'poach', name: 'Model Deprecation', min: 0, sev: 0.4,
    text: 'A provider deprecated a model you depend on with 30 days notice.',
    apply: (S, sev) => { S.resources.techDebt += 30 * sev; } },
  { id: 'lawsuit', name: 'Legal Action', min: 50000, sev: 0.9,
    text: 'A patent entity you have never heard of has heard a great deal about you.',
    apply: (S, sev) => { S.company.cash -= Math.max(20000, S.company.cash * 0.06 * sev); S.world.regulatoryHeat += 6 * sev; } },
  { id: 'sabotage', name: 'Sabotage', min: 200000, sev: 1.2,
    text: 'Someone got inside. Not a script kiddie. Someone funded.',
    apply: (S, sev) => { if (S.agents.length > 1) { const a = pick(S.agents); a.morale *= 0.5; }
      S.resources.techDebt += 60 * sev; S.company.cash -= 50000 * sev; } },
];

function active(S) { return S.products.find((p) => p.id === S.activeProductId) || S.products.find((p) => p.launched); }

export function tickIncidents(S, days, sideIncidentMult = 1) {
  const m = computeMods(S);
  const p = active(S);
  if (!p || !p.launched) return null;
  const users = totalUsers(S);

  // Base rate scales with debt, reliability gap, scale.
  let rate = (0.004
    + S.resources.techDebt / 5200
    + Math.pow(Math.max(0, 0.92 - p.reliability), 1.6) * 0.09
    + Math.log10(1 + users) * 0.0009) * m.incidentChance * sideIncidentMult;
  // The doom clock is misalignment, scrutiny and distrust combined. The World
  // view says high values make catastrophes far more likely; this is the line
  // that makes that sentence true rather than decorative.
  const doom = (S.world.doomClock || 0) / 100;
  rate *= 1 + doom * WORLD.DOOM_INCIDENT_RATE;
  rate *= days;

  // Minimum spacing so incidents stay events, not weather.
  const since = S.time.day - (S.world.lastIncidentDay ?? -99);
  if (since < 7) return null;
  if (!chance(rate * clamp((since - 7) / 10, 0.25, 1.6))) return null;
  S.world.lastIncidentDay = S.time.day;

  const pool = INCIDENTS.filter((i) => users >= i.min);
  if (!pool.length) return null;
  const inc = pick(pool);
  let sev = inc.sev * randRange(0.6, 1.4) * m.incidentSeverity * (1 + doom * WORLD.DOOM_INCIDENT_SEV);

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
