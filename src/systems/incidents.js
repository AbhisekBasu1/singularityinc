// ─────────────────────────────────────────────────────────────────────────────
// INCIDENTS — the world hitting back. Small, frequent, mechanically real.
// ─────────────────────────────────────────────────────────────────────────────
import { WORLD, INCIDENTS as BALANCE, ECON } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { totalUsers } from './product.js';
import { rand, chance, pick, randRange } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';
import { pushFeed, maybeThread } from './feed.js';

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
    apply: (S, sev, m) => { const p = active(S); if (p) {
      p.users *= 1 - BALANCE.BREACH_USER_SHARE * sev;
      p.sentiment -= BALANCE.BREACH_SENTIMENT * sev;
    }
      S.resources.reputation *= 1 - BALANCE.BREACH_REP_SHARE * sev * m.repDamage;
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
    apply: (S, sev, m) => {
      S.resources.reputation *= 1 - BALANCE.BAD_PRESS_REP_SHARE * sev * m.repDamage;
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

// The four things that cause an outage, in the words a founder would use about
// them. Short, because this rides on the end of a feed line.
const CAUSE_WORD = { debt: 'tech debt', uptime: 'reliability', scale: 'scale',
                     doom: 'the doom clock', base: 'bad luck' };

// ── §B7 Why this keeps happening ───────────────────────────────────────────
// The rate is four terms added together and one multiplier on top, and an
// incident landed with no hint of which of them put it there. The founder who
// has been outaged three times in a fortnight needs to know whether to put an
// agent on Operations, raise the infra dial, or fix the alignment number —
// and those are three different answers.
//
// Pure, and the same arithmetic `tickIncidents` runs: it takes its rate from
// here rather than keeping a second copy.
export function incidentCauses(S, m = computeMods(S), sideIncidentMult = 1) {
  const p = active(S);
  const users = totalUsers(S);
  const debt = S.resources.techDebt / BALANCE.DEBT_SCALE;
  const uptime = p ? Math.pow(Math.max(0, BALANCE.RELIABILITY_TARGET - p.reliability),
    BALANCE.RELIABILITY_POWER) * BALANCE.RELIABILITY_RATE : 0;
  const scale = Math.log10(1 + users) * BALANCE.USER_RATE;
  const base = BALANCE.BASE_RATE;
  const infra = 1 - ECON.INFRA_INCIDENT_CUT * (S._infraEffect || 0);
  const doom = (S.world.doomClock || 0) / 100;
  const sum = (base + debt + uptime + scale) * m.incidentChance * sideIncidentMult * infra;
  const rate = sum * (1 + doom * WORLD.DOOM_INCIDENT_RATE);
  // The doom clock is a multiplier, so what it is "worth" is the part of the
  // rate that would not be there without it.
  const parts = [
    ['debt', debt, 'tech debt'],
    ['uptime', uptime, 'reliability'],
    ['scale', scale, 'scale'],
    ['doom', rate - sum, 'the doom clock'],
    ['base', base, 'ordinary bad luck'],
  ];
  const top = parts.slice().sort((a, b) => b[1] - a[1])[0];
  return { rate, base, debt, uptime, scale, doom: rate - sum, infra,
           top: top[0], topLabel: top[2], share: rate > 0 ? top[1] / rate : 0 };
}

export function tickIncidents(S, days, sideIncidentMult = 1) {
  const m = computeMods(S);
  const p = active(S);
  if (!p || !p.launched) return null;
  const users = totalUsers(S);

  // Base rate scales with debt, reliability gap, scale — and the doom clock on
  // top. `incidentCauses` is that arithmetic, in one place, so the line the
  // Wire prints names the term that actually caused this.
  const cause = incidentCauses(S, m, sideIncidentMult);
  let rate = cause.rate * days;

  // Minimum spacing so incidents stay events, not weather.
  const since = S.time.day - (S.world.lastIncidentDay ?? -99);
  if (since < BALANCE.SPACING_DAYS) return null;
  if (!chance(rate * clamp((since - BALANCE.SPACING_DAYS) / BALANCE.SPACING_RAMP_DAYS,
    BALANCE.SPACING_MIN_MULT, BALANCE.SPACING_MAX_MULT))) return null;
  S.world.lastIncidentDay = S.time.day;

  // Private Security's promise: someone funded does not get inside.
  const pool = INCIDENTS.filter((i) => users >= i.min && !(m.hostileImmune && i.id === 'sabotage'));
  if (!pool.length) return null;
  const inc = pick(pool);
  const doom = (S.world.doomClock || 0) / 100;
  let sev = inc.sev * randRange(BALANCE.SEVERITY_MIN, BALANCE.SEVERITY_MAX)
    * m.incidentSeverity * (1 + doom * WORLD.DOOM_INCIDENT_SEV);

  // Auto-resolution from self-healing systems
  if (m.incidentAuto && chance(m.incidentAuto)) {
    pushFeed(S, { type: 'log', author: 'ops', tone: 'neutral',
      text: `**${inc.name}** detected and auto-remediated. No action required.` });
    return null;
  }

  // `m` rides along for the two incidents that cost reputation: Crisis Comms
  // and Untouchable scale that loss through `repDamage`, and nowhere else.
  inc.apply(S, sev, m);
  S.stats.incidents++;
  S.stats.lastIncidentDay = Math.floor(S.time.day);
  S.stats.lastIncident = inc.name;
  S.stats.lastIncidentKind = inc.id;   // the phone and the post frame it by kind (`incidentVerb`), never by title
  // §B7/§B11. What was driving the rate when this landed, and who was carrying
  // the pager. Both are on the state so the Wire line, the Record and anything
  // written later read one answer rather than each deriving its own.
  S.stats.lastIncidentCause = cause.top;
  const onOps = S.agents.find((a) => a.status === 'active' && a.lane === 'ops') || null;
  S.stats.lastIncidentOps = onOps ? onOps.name : null;
  // §A15. The thread's own gate reads this, so it has to be the severity the
  // incident actually landed at rather than the incident's authored `sev`.
  S.world.lastIncidentSeverity = sev;
  pushFeed(S, { type: 'incident', author: 'INCIDENT', tone: 'bad',
    text: `**${inc.name}** — ${inc.text}`,
    meta: `severity ${(sev * 100).toFixed(0)}% · ${CAUSE_WORD[cause.top] || 'bad luck'}`
      + ` · ${onOps ? `${onOps.name} on ops` : 'nobody on ops'}` });
  emit('incident', { incident: inc, severity: sev });
  // §A15. An incident above the line asks what you are going to say about it.
  // By name, not by draw: a thread about this morning's outage is not
  // something the day may or may not feel like offering. `eligibleThreads`
  // refuses one that is already open, and there is exactly one id, so the cap
  // of one incident thread at a time is the id itself. Never offline — a
  // question the founder is not there to answer is a question that expires.
  if (!S._offline && sev >= BALANCE.THREAD_SEVERITY) maybeThread(S, 't_incident_ask');
  return inc;
}
