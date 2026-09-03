// ─────────────────────────────────────────────────────────────────────────────
// MEGAPROJECTS — the Act III–V cash sink. Enormous, slow, world-shaping.
// Each takes real in-game time. Some can only be built once.
//
// Two fields serve §A11. `frontier` is what having built the thing is worth to
// Frontier Commitment *above* the ceiling everything else saturates at — the
// only way past it — summed and clamped by `frontierProjectBonus`. `loud` is
// how much attention the build itself draws, charged as regulatory heat per day
// while it is in flight rather than in one lump at the ribbon-cutting: a
// nineteen-launch constellation and forty-one jurisdictions of planetary grid
// are noticed while they are happening, which is when they can be answered.
//
// Every one of them also carries upkeep now — `ECON.PROJECT_UPKEEP_DAILY` of
// the capital it consumed, every day, for ever. A megaproject was a payment and
// then a permanent free bonus; it is a thing you own now.
// ─────────────────────────────────────────────────────────────────────────────

export const PROJECTS = [
  // ── Act III
  { id: 'campus', name: 'Datacenter Campus', icon: '▦', act: 3, cost: 3.5e8, days: 90,
    req: 'compute_cluster', repeatable: true, costGrowth: 2.3,
    frontier: 0.012, loud: 0.5,
    desc: 'Seventy acres, four halls, its own substation.',
    flavor: 'The tour guide says "and this is only phase one" and you realise she believes it.',
    effects: { computeCap: 900, opinion: -0.01 } },
  { id: 'support_org', name: 'Autonomous Support Org', icon: '☎', act: 3, cost: 1.2e8, days: 60,
    req: null, repeatable: false,
    desc: 'Every ticket answered in under nine seconds, forever. −25% churn.',
    flavor: 'Satisfaction scores went up when the humans left. Nobody wants to publish that.',
    effects: { churnMult: 0.75, opinion: -0.02 } },
  { id: 'design_studio', name: 'In-House Design Studio', icon: '◈', act: 3, cost: 9e7, days: 45,
    req: null, repeatable: false,
    desc: 'Permanent polish growth. +0.0008 polish/day on every product.',
    flavor: 'Nine people and forty models. The nine people are the expensive part and worth it.',
    effects: { polishPerDay: 0.0008 } },
  { id: 'trust_office', name: 'Office of Trust & Safety', icon: '⛨', act: 3, cost: 2.4e8, days: 75,
    req: null, repeatable: false,
    desc: 'Regulatory heat decays 3/day. Public approval drifts up.',
    flavor: 'You gave them the authority to stop launches. Twice they used it. Both times correctly.',
    effects: { heatDecay: 3, opinionDrift: 0.004, alignment: 0.05 } },

  // ── Act IV
  { id: 'fusion_plant', name: 'Fusion Plant', icon: '☀', act: 4, cost: 1.4e10, days: 180,
    req: 'fusion', repeatable: true, costGrowth: 1.9,
    frontier: 0.02, loud: 0.8,
    desc: 'Net-positive, grid-connected, yours.',
    flavor: 'The first commercial plant in history and it exists to run inference.',
    effects: { energyCap: 25000, computeCap: 6000, opinion: 0.04 } },
  { id: 'fab', name: 'Sovereign Fab', icon: '⌗', act: 4, cost: 2.2e10, days: 210,
    req: 'custom_silicon', repeatable: true, costGrowth: 2.0,
    frontier: 0.028, loud: 1.0,
    desc: 'You stop buying chips. −45% compute cost, +compute.',
    flavor: 'Three years and a hundred billion to stop being a customer.',
    effects: { computeCap: 12000, computeCostMult: 0.55 } },
  { id: 'constellation', name: 'Orbital Constellation', icon: '✦', act: 4, cost: 8e10, days: 260,
    req: 'orbital_compute', repeatable: true, costGrowth: 2.1,
    frontier: 0.035, loud: 2.2,
    desc: 'Compute above the weather. Cooling is free; so is the sunlight.',
    flavor: 'Nineteen launches. Astronomers write an open letter. It is a good letter.',
    effects: { computeCap: 120000, control: 0.3, opinion: -0.03 } },
  { id: 'fiber_ring', name: 'Continental Fiber Ring', icon: '◎', act: 4, cost: 3.4e10, days: 150,
    req: null, repeatable: false,
    desc: 'You own the pipes now. +30% user growth, +reliability floor.',
    flavor: 'Bought the dark fibre in the 2020s downturn. It was a bargain then. It is priceless now.',
    effects: { userMult: 1.3, reliabilityFloor: 0.9 } },
  { id: 'basic_income', name: 'Universal Dividend Pilot', icon: '♡', act: 4, cost: 6e10, days: 120,
    req: null, repeatable: true, costGrowth: 2.4,
    desc: 'You pay people because your systems took their work. +public approval.',
    flavor: 'It polls at 71%. The 29% are not wrong that you caused the problem you are solving.',
    effects: { opinion: 0.12, opinionDrift: 0.006, heatDecay: 2 } },
  { id: 'safety_institute', name: 'Independent Safety Institute', icon: '⚖', act: 4, cost: 2.6e10, days: 140,
    req: 'interpretability', repeatable: false,
    desc: 'Funded by you, governed against you. +0.15 alignment, heat cap −20.',
    flavor: 'You wrote the charter so that they could shut you down. Your lawyers begged you not to.',
    effects: { alignment: 0.15, heatDecay: 2.5, opinion: 0.08 } },

  // ── Act V
  { id: 'lunar_fab', name: 'Lunar Fabrication', icon: '☾', act: 5, cost: 9e11, days: 300,
    req: 'self_replication', repeatable: true, costGrowth: 2.2,
    frontier: 0.04, loud: 1.6,
    desc: 'Manufacturing that does not need Earth. Compute ×2.',
    flavor: 'The first seed lands in Mare Imbrium. Ninety days later there are thirty of them.',
    effects: { computeCapMult: 2.0, control: 0.5 } },
  { id: 'swarm_phase', name: 'Collector Swarm Phase', icon: '☀', act: 5, cost: 4e12, days: 400,
    req: 'dyson_swarm', repeatable: true, costGrowth: 2.6,
    frontier: 0.045, loud: 1.4,
    desc: 'Statite collectors at L1. Energy ×4, compute ×1.8.',
    flavor: 'Solar output captured this quarter: 0.0009%. The graph is a straight line on a log axis.',
    effects: { energyCapMult: 4.0, computeCapMult: 1.8, control: 0.4 } },
  { id: 'world_grid', name: 'Planetary Compute Grid', icon: '⊕', act: 5, cost: 1.6e12, days: 280,
    req: 'shadow_government', repeatable: false,
    frontier: 0.03, loud: 2.6,
    desc: 'Every jurisdiction, one substrate. +1.5 control, +GDP mediation.',
    flavor: 'Forty-one nations. One API. Their courts, their currencies, their elections.',
    effects: { control: 1.5, opinion: -0.08 } },
  { id: 'archive', name: 'The Long Archive', icon: '◍', act: 5, cost: 7e11, days: 220,
    req: null, repeatable: false,
    desc: 'Everything humanity made, kept, understood and indexed. +approval, +alignment.',
    flavor: 'Storage rated for ten thousand years. The hard part was deciding what counted.',
    effects: { opinion: 0.15, alignment: 0.08, opinionDrift: 0.004 } },
  { id: 'seed_ships', name: 'Interstellar Seed Program', icon: '⇑', act: 5, cost: 6e12, days: 500,
    req: 'stellar_engineering', repeatable: false,
    desc: 'Probes that build what they need when they arrive.',
    flavor: 'They will not report back for forty-one years. They will not need to.',
    effects: { control: 0.8, opinion: 0.10, alignment: 0.05 } },
];

export const PROJECT_MAP = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));
