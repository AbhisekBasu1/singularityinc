// ─────────────────────────────────────────────────────────────────────────────
// DIRECTIVES — one standing order at a time. The bonus ramps the longer you
// hold it, so commitment is rewarded and thrashing is not.
// ─────────────────────────────────────────────────────────────────────────────

export const RAMP_DAYS = 30;      // days to reach full effect
export const MIN_EFFECT = 0.35;   // fraction of the bonus you get on day one

export const DIRECTIVES = [
  { id: 'none', name: 'No standing order', icon: '○', color: 'var(--ink-3)',
    desc: 'Everyone uses their judgement. Nothing is amplified and nothing is starved.',
    flavour: 'A perfectly respectable way to run a company, and a slightly slower one.',
    mods: {} },

  { id: 'ship', name: 'Ship It', icon: '⌘', color: '#4dd0e1', act: 1,
    desc: '+45% code output. +30% tech debt.',
    flavour: '"We will fix it in the version that exists." — every founder who was right, once',
    mods: { codeRate: 1.45, debtRate: 1.30 } },

  { id: 'listen', name: 'Talk To Everyone', icon: '☎', color: '#00e5a0', act: 1,
    desc: '+75% Insight. −20% code output.',
    flavour: 'The fastest way to stop building the wrong thing is to stop building for a week.',
    mods: { insightRate: 1.75, codeRate: 0.80 } },

  { id: 'landgrab', name: 'Land Grab', icon: '↗', color: '#f5a623', act: 2,
    desc: '+45% user growth, −25% churn. −30% revenue.',
    flavour: 'Take the market now. Monetise it when nobody else can reach it.',
    mods: { userMult: 1.45, churn: 0.75, mrrMult: 0.70 } },

  { id: 'harvest', name: 'Harvest', icon: '⌗', color: '#34d399', act: 2,
    desc: '+45% revenue. −30% user growth.',
    flavour: 'Stop buying growth. Find out what the thing is actually worth.',
    mods: { mrrMult: 1.45, arpu: 1.15, userMult: 0.70 } },

  { id: 'paydown', name: 'Pay It Down', icon: '⚙', color: '#7c8a99', act: 1,
    desc: '+110% Operations output, +debt decay, −45% incidents. −30% build.',
    flavour: 'A whole quarter where nothing visible happens and everything gets better.',
    mods: { opsLaneOutput: 2.10, '+debtDecay': 4, incidentChance: 0.55, buildLaneOutput: 0.70 } },

  { id: 'deep', name: 'Go Deep', icon: '⌬', color: '#8b5cf6', act: 2,
    desc: '+55% research rate. −25% growth lane.',
    flavour: 'Disappear for six weeks. Come back two years ahead.',
    mods: { researchRate: 1.55, growthLaneOutput: 0.75 } },

  { id: 'fortify', name: 'Fortify', icon: '⛨', color: '#60a5fa', act: 3,
    desc: '−60% incidents, reliability floor 0.90, −35% regulatory heat growth. −20% everything else.',
    flavour: 'Nothing breaks. Nothing moves quickly either. That is the trade.',
    mods: { incidentChance: 0.40, reliabilityFloor: 0.90, '+heatDecay': 2.5, allLanes: 0.80 } },

  { id: 'war', name: 'Total War', icon: '⚔', color: '#ff4d5e', act: 3,
    desc: 'Rivals grow 55% slower. +25% growth. −40% reputation gain, +regulatory heat.',
    flavour: 'You have decided that this market has room for exactly one company.',
    mods: { competitorGrowth: 0.45, userMult: 1.25, repRate: 0.60, '+heatDecay': -1.5 } },

  { id: 'legitimacy', name: 'Earn It', icon: '♡', color: '#f472b6', act: 4,
    desc: '+public approval drift, +alignment, +50% reputation. −25% code and revenue.',
    flavour: 'Spend a year being the company you keep telling people you are.',
    mods: { '+opinionDrift': 0.008, repRate: 1.50, codeRate: 0.75, mrrMult: 0.75, alignBoost: 1 } },

  { id: 'ascend', name: 'Ascend', icon: '✦', color: '#ffffff', act: 4,
    desc: '+80% research, +30% agent output. −45% revenue, −alignment.',
    flavour: 'Everything into the frontier. Everything.',
    mods: { researchRate: 1.80, agentOutput: 1.30, mrrMult: 0.55, alignDrain: 1 } },
];

export const DIRECTIVE_MAP = Object.fromEntries(DIRECTIVES.map((d) => [d.id, d]));

export function directiveStrength(S) {
  if (!S.company.directive || S.company.directive === 'none') return 0;
  const held = Math.max(0, S.time.day - (S.company.directiveSince || 0));
  return MIN_EFFECT + (1 - MIN_EFFECT) * Math.min(1, held / RAMP_DAYS);
}
